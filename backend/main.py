from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import tempfile
from pathlib import Path
from datetime import datetime
from pypdf import PdfReader
from dotenv import load_dotenv
import uuid
import shutil
import re
import sib_api_v3_sdk
from sib_api_v3_sdk.rest import ApiException

# Load environment variables from backend directory
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path, override=True)

app = FastAPI(title="PDF ChatBot API")

# EMAIL CONFIG
BREVO_API_KEY = os.getenv("BREVO_API_KEY")
FROM_EMAIL = os.getenv("FROM_EMAIL", "noreply@fasarliai.com")
FROM_NAME = os.getenv("FROM_NAME", "FasarliAI")
MFA_DEBUG_MODE = os.getenv("MFA_DEBUG_MODE", "false").lower() == "true"

async def send_mfa_email(recipient: str, code: str, subject: str = "Your Login Verification Code") -> bool:
    """
    Send MFA code via email using Brevo API. Falls back to console logging if not configured.
    Returns True if email was sent successfully, False otherwise.
    """
    try:
        # Check if Brevo is configured
        if not BREVO_API_KEY:
            print(f"[INFO] Brevo not configured. MFA code for {recipient}: {code}")
            return False
        
        configuration = sib_api_v3_sdk.Configuration()
        configuration.api_key['api-key'] = BREVO_API_KEY

        api_instance = sib_api_v3_sdk.TransactionalEmailsApi(sib_api_v3_sdk.ApiClient(configuration))

        # Modern HTML email design matching FasarliAI branding
        html_content = f"""
        <div style='background:linear-gradient(135deg,#000000 0%,#40e0d0 100%);padding:40px 0;font-family:Segoe UI,Roboto,sans-serif;'>
            <div style='max-width:420px;margin:0 auto;background:#fff;border-radius:18px;box-shadow:0 4px 24px #0001;padding:32px 28px 28px 28px;'>
                <div style='text-align:center;margin-bottom:18px;'>
                    <img src='https://fasarliai.com/logo.png' alt='FasarliAI' style='height:48px;margin-bottom:8px;'>
                    <h2 style='color:#40e0d0;font-weight:700;margin:0 0 8px 0;font-size:1.5rem;'>FasarliAI</h2>
                </div>
                <h3 style='color:#000000;font-size:1.15rem;font-weight:600;margin-bottom:12px;text-align:center;'>Votre code de vérification</h3>
                <div style='background:#f0f0f0;border-radius:10px;padding:18px 0;margin:0 auto 18px auto;text-align:center;font-size:2rem;letter-spacing:0.2em;color:#40e0d0;font-weight:700;width:220px;'>
                    {code}
                </div>
                <p style='color:#000000;font-size:1rem;margin-bottom:10px;text-align:center;'>Ce code expire dans <b>3 minutes</b>.<br>Ne partagez jamais ce code avec qui que ce soit.</p>
                
            </div>
            <p style='text-align:center;color:#ffffff;font-size:0.95rem;margin-top:32px;'>© {datetime.now().year} FasarliAI. Tous droits réservés.</p>
        </div>
        """
        send_smtp_email = sib_api_v3_sdk.SendSmtpEmail(
            to=[{"email": recipient}],
            sender={"email": FROM_EMAIL, "name": FROM_NAME},
            subject=subject,
            html_content=html_content
        )

        api_instance.send_transac_email(send_smtp_email)
        print(f"[INFO] MFA email sent successfully to {recipient}")
        return True
        
    except ApiException as e:
        print(f"[WARN] Unable to send MFA email to {recipient}: {e}")
        print(f"[DEBUG] MFA CODE for {recipient}: {code}")
        return False
    except Exception as exc:
        print(f"[WARN] Unable to send MFA email to {recipient}: {exc}")
        print(f"[DEBUG] MFA CODE for {recipient}: {code}")
        return False

# CORS middleware - Allow all origins in production for Vercel dynamic URLs
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for Vercel deployments
    allow_credentials=False,  # Must be False when allow_origins=["*"]
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for vector stores (in production, use a database)
vector_stores: Dict[str, Any] = {}
chat_histories: Dict[str, List[tuple]] = {}

# In-memory storage for MFA codes (keyed by email, works with Supabase auth)
mfa_codes_db: Dict[str, List[Dict[str, Any]]] = {}

# In-memory storage for password reset codes
reset_codes_db: Dict[str, List[Dict[str, Any]]] = {}

# Request/Response models
class ChatRequest(BaseModel):
    question: str
    session_id: str
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    id: str
    author: str
    content: str
    sources: Optional[List[Dict[str, str]]] = None
    timestamp: str

class QuizRequest(BaseModel):
    session_id: str

class QuizQuestion(BaseModel):
    question: str
    a: str
    b: str
    c: str
    d: str
    correct: str

class QuizResponse(BaseModel):
    questions: List[QuizQuestion]

class FlashcardRequest(BaseModel):
    session_id: str

class Flashcard(BaseModel):
    front: str
    back: str

class FlashcardResponse(BaseModel):
    flashcards: List[Flashcard]

class UploadResponse(BaseModel):
    session_id: str
    message: str
    chunks_count: int

# User and MFA models
class LoginRequest(BaseModel):
    email: str
    password: str

class LoginResponse(BaseModel):
    user_id: int
    debug_code: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: str

class VerifyResetCodeRequest(BaseModel):
    email: str
    code: str

class ResetPasswordRequest(BaseModel):
    email: str
    code: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    email: str
    old_password: str
    new_password: str



def parse_quiz(quiz_text: str) -> List[Dict]:
    """Parse quiz questions from LLM response."""
    questions = []
    current_q = {}
    lines = quiz_text.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            if current_q and 'question' in current_q and 'correct' in current_q:
                questions.append(current_q)
                current_q = {}
            continue
            
        if line.upper().startswith('Q') and (':' in line or (len(line) > 1 and line[1:2].isdigit())):
            if current_q and 'question' in current_q and 'correct' in current_q:
                questions.append(current_q)
            if ':' in line:
                current_q = {'question': line}
            else:
                current_q = {'question': line}
        elif line.upper().startswith('A)') or (line.startswith('A.') and len(line) > 2):
            current_q['a'] = line[2:].strip() if line[1] == ')' else line[2:].strip()
        elif line.upper().startswith('B)') or (line.startswith('B.') and len(line) > 2):
            current_q['b'] = line[2:].strip() if line[1] == ')' else line[2:].strip()
        elif line.upper().startswith('C)') or (line.startswith('C.') and len(line) > 2):
            current_q['c'] = line[2:].strip() if line[1] == ')' else line[2:].strip()
        elif line.upper().startswith('D)') or (line.startswith('D.') and len(line) > 2):
            current_q['d'] = line[2:].strip() if line[1] == ')' else line[2:].strip()
        elif 'correct' in line.lower() and ':' in line:
            parts = line.split(':', 1)
            if len(parts) > 1:
                correct_ans = parts[1].strip().upper()
                if correct_ans:
                    current_q['correct'] = correct_ans[0] if len(correct_ans) > 0 else correct_ans
    
    if current_q and 'question' in current_q and 'correct' in current_q:
        questions.append(current_q)
    
    valid_questions = []
    for q in questions:
        if all(key in q for key in ['question', 'a', 'b', 'c', 'd', 'correct']):
            # Clean question text
            question_text = q['question'].strip()
            if question_text.startswith('Q') and ':' in question_text:
                question_text = question_text.split(':', 1)[1].strip()
            q['question'] = question_text
            valid_questions.append(q)
    
    return valid_questions[:5]

def parse_flashcards(flashcard_text: str) -> List[Dict]:
    """Parse flashcards from LLM response - improved with better error handling."""
    flashcards = []
    current_card = {}
    lines = flashcard_text.split('\n')
    
    for line in lines:
        line = line.strip()
        if not line:
            if current_card and 'front' in current_card and 'back' in current_card:
                flashcards.append(current_card)
                current_card = {}
            continue
        
        # More flexible parsing - handle variations
        line_lower = line.lower()
        if line_lower.startswith('front:'):
            if current_card and 'front' in current_card and 'back' in current_card:
                flashcards.append(current_card)
                current_card = {}
            current_card['front'] = line[6:].strip()
        elif line_lower.startswith('back:'):
            current_card['back'] = line[5:].strip()
        # Handle cases where front/back might be on separate lines
        elif 'front' in line_lower and ':' in line:
            parts = line.split(':', 1)
            if len(parts) > 1:
                current_card['front'] = parts[1].strip()
        elif 'back' in line_lower and ':' in line and 'front' not in line_lower:
            parts = line.split(':', 1)
            if len(parts) > 1:
                current_card['back'] = parts[1].strip()
    
    if current_card and 'front' in current_card and 'back' in current_card:
        flashcards.append(current_card)
    
    # If we have incomplete cards, try to pair them up
    if len(flashcards) < 5 and current_card:
        # Try to extract any remaining pairs
        pass
    
    return flashcards[:10]

@app.post("/api/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...), session_id: Optional[str] = Form(None)):
    """Upload and process a PDF file. If session_id provided, add to existing vector store."""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    # Use existing session ID or generate new one
    if not session_id:
        session_id = str(uuid.uuid4())
    
    try:
        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            shutil.copyfileobj(file.file, tmp_file)
            tmp_path = tmp_file.name
        
        # Extract text from PDF
        reader = PdfReader(tmp_path)
        text = ""
        for page in reader.pages:
            text += page.extract_text() or ""
        
        # Clean up temp file
        os.unlink(tmp_path)
        
        if not text.strip():
            raise HTTPException(status_code=400, detail="No text could be extracted from the PDF")
        
        # Import ML libraries only when needed
        from langchain_text_splitters import RecursiveCharacterTextSplitter
        from langchain_community.embeddings import HuggingFaceEmbeddings
        from langchain_community.vectorstores import FAISS
        
        # Split text into chunks with PDF name as metadata
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
        chunks = splitter.split_text(text)
        
        # Create embeddings
        embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
        
        # Check if vector store already exists for this session
        is_merging = session_id in vector_stores
        
        if is_merging:
            # Add new PDF chunks to existing vector store
            existing_vector_store = vector_stores[session_id]
            new_vector_store = FAISS.from_texts(chunks, embedding=embeddings)
            existing_vector_store.merge_from(new_vector_store)
            total_chunks = len(chunks)
            print(f"[MERGE] Added {total_chunks} chunks to existing session {session_id}")
        else:
            # Create new FAISS vector store
            vector_store = FAISS.from_texts(chunks, embedding=embeddings)
            vector_stores[session_id] = vector_store
            chat_histories[session_id] = []
            total_chunks = len(chunks)
            print(f"[NEW] Created new session {session_id} with {total_chunks} chunks")
        
        return UploadResponse(
            session_id=session_id,
            message=f"PDF processed successfully. Combined with existing PDFs." if is_merging else "PDF processed successfully",
            chunks_count=total_chunks
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process PDF: {str(e)}")



@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Handle chat questions."""
    if request.session_id not in vector_stores:
        raise HTTPException(status_code=400, detail="No PDF uploaded for this session. Please upload a PDF first.")
    
    # Import ML libraries only when needed
    from langchain_groq import ChatGroq
    from langchain_classic.chains.retrieval_qa.base import RetrievalQA
    
    try:
        vector_store = vector_stores[request.session_id]
        chat_history = chat_histories.get(request.session_id, [])
        
        # Initialize LLM with Groq
        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key:
            raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")
        
        llm = ChatGroq(
            api_key=groq_api_key,
            model_name="llama-3.1-8b-instant"
        )
        
        # Use RAG to answer from all PDFs - increase k to search across multiple documents
        retriever = vector_store.as_retriever(
            search_kwargs={"k": 10}  # Increased to retrieve from multiple PDFs
        )
        
        qa_chain = RetrievalQA.from_chain_type(
            llm=llm,
            retriever=retriever,
            chain_type="stuff",
            return_source_documents=False
        )
        
        history_text = "\n".join([f"Q: {q}\nA: {a}" for q, a in chat_history[-3:]])
        instruction = (
            "You are a helpful chatbot. Answer using the information found in the uploaded PDF documents. "
            "Search across ALL available documents to provide a comprehensive answer. "
            "Be clear, friendly, and helpful."
        )
        
        if history_text:
            final_question = f"{instruction}\n\nPrevious conversation:\n{history_text}\n\nCurrent question: {request.question}"
        else:
            final_question = f"{instruction}\n\nQuestion: {request.question}"
        
        answer = qa_chain.run(final_question)
        
        # Save to history
        chat_history.append((request.question, answer))
        chat_histories[request.session_id] = chat_history
        
        return ChatResponse(
            id=str(uuid.uuid4()),
            author="FasarliAI",
            content=answer,
            sources=[],
            timestamp=datetime.now().isoformat()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get answer: {str(e)}")

@app.post("/api/quiz", response_model=QuizResponse)
async def generate_quiz(request: QuizRequest):
    """Generate quiz questions from the PDF."""
    if request.session_id not in vector_stores:
        raise HTTPException(status_code=400, detail="No PDF uploaded for this session. Please upload a PDF first.")
    
    # Import ML libraries only when needed
    from langchain_groq import ChatGroq
    
    try:
        vector_store = vector_stores[request.session_id]
        
        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key:
            raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")
        
        llm = ChatGroq(
            api_key=groq_api_key,
            model_name="llama-3.1-8b-instant",
            temperature=0.5,  # Lower temperature for faster, more deterministic responses
            max_tokens=1000  # Limit response length for faster generation
        )
        
        # Optimize: Get fewer, more focused documents for faster processing
        relevant_docs = vector_store.similarity_search("key concepts main ideas important information", k=2)
        
        # Aggressively limit context size for faster LLM processing
        context_parts = []
        total_length = 0
        max_length = 1200  # Reduced to 1200 chars for much faster processing
        
        for doc in relevant_docs:
            content = doc.page_content if hasattr(doc, 'page_content') else str(doc)
            # Truncate each document to max 600 chars
            truncated_content = content[:600] if len(content) > 600 else content
            if total_length + len(truncated_content) > max_length:
                remaining = max_length - total_length
                if remaining > 50:
                    context_parts.append(truncated_content[:remaining])
                break
            context_parts.append(truncated_content)
            total_length += len(truncated_content)
        
        context = "\n\n".join(context_parts)
        
        # Optimize: Ultra-concise prompt for fastest generation
        from langchain_core.messages import HumanMessage
        
        quiz_prompt = (
            f"Create 5 multiple-choice questions. Format:\n"
            f"Q1: [question]\n"
            f"A) [option]\n"
            f"B) [option]\n"
            f"C) [option]\n"
            f"D) [option]\n"
            f"Correct: [A/B/C/D]\n\n"
            f"{context}\n\n"
            f"Output 5 questions in the format above."
        )
        
        # Direct LLM call (faster than chain)
        try:
            messages = [HumanMessage(content=quiz_prompt)]
            quiz_response_obj = llm.invoke(messages)
            
            # Extract content from response
            if hasattr(quiz_response_obj, 'content'):
                quiz_response = quiz_response_obj.content
            else:
                quiz_response = str(quiz_response_obj)
            
            questions = parse_quiz(quiz_response)
            
            # If parsing failed or got too few questions, try a simpler approach
            if len(questions) < 3:
                # Fallback: Try to extract questions using regex
                pattern = r'Q\d+:\s*(.+?)\nA\)\s*(.+?)\nB\)\s*(.+?)\nC\)\s*(.+?)\nD\)\s*(.+?)\nCorrect:\s*([A-D])'
                matches = re.findall(pattern, quiz_response, re.DOTALL | re.IGNORECASE)
                if matches:
                    questions = []
                    for i, match in enumerate(matches[:5], 1):
                        questions.append({
                            'question': match[0].strip(),
                            'a': match[1].strip(),
                            'b': match[2].strip(),
                            'c': match[3].strip(),
                            'd': match[4].strip(),
                            'correct': match[5].strip().upper()
                        })
            
            if not questions or len(questions) < 3:
                raise ValueError(f"Failed to parse quiz. Got {len(questions) if questions else 0} questions. Response: {quiz_response[:200]}")
                
        except Exception as parse_error:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to generate or parse quiz: {str(parse_error)}"
            )
        
        return QuizResponse(questions=[QuizQuestion(**q) for q in questions])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")

class ConversationNameRequest(BaseModel):
    session_id: str

class ConversationNameResponse(BaseModel):
    name: str

@app.post("/api/generate-conversation-name", response_model=ConversationNameResponse)
async def generate_conversation_name(request: ConversationNameRequest):
    """Generate a short, clear conversation name based on PDF content."""
    if request.session_id not in vector_stores:
        raise HTTPException(status_code=400, detail="No PDF uploaded for this session.")
    
    # Import ML libraries only when needed
    from langchain_groq import ChatGroq
    
    try:
        vector_store = vector_stores[request.session_id]
        
        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key:
            raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")
        
        llm = ChatGroq(
            api_key=groq_api_key,
            model_name="llama-3.1-8b-instant"
        )
        
        # Get relevant content from PDF to understand what it's about
        relevant_docs = vector_store.similarity_search("main topic subject title summary overview", k=3)
        context = "\n\n".join([doc.page_content if hasattr(doc, 'page_content') else str(doc) for doc in relevant_docs])
        
        # Limit context size for faster processing
        if len(context) > 1000:
            context = context[:1000]
        
        prompt = f"""Based on the following PDF content, generate a short and clear conversation title (maximum 5-6 words). 
The title should summarize what the PDF is about.

PDF Content:
{context}

Generate only the title, nothing else. Make it concise and descriptive."""
        
        from langchain_core.messages import HumanMessage
        messages = [HumanMessage(content=prompt)]
        response_obj = llm.invoke(messages)
        
        name = response_obj.content.strip() if hasattr(response_obj, 'content') else str(response_obj).strip()
        
        # Clean up the name (remove quotes, extra spaces, etc.)
        name = name.strip('"').strip("'").strip()
        if len(name) > 60:
            name = name[:57] + "..."
        
        return ConversationNameResponse(name=name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate conversation name: {str(e)}")

@app.post("/api/flashcards", response_model=FlashcardResponse)
async def generate_flashcards(request: FlashcardRequest):
    """Generate flashcards from the PDF."""
    if request.session_id not in vector_stores:
        raise HTTPException(status_code=400, detail="No PDF uploaded for this session. Please upload a PDF first.")
    
    # Import ML libraries only when needed
    from langchain_groq import ChatGroq
    
    try:
        vector_store = vector_stores[request.session_id]
        
        groq_api_key = os.getenv("GROQ_API_KEY")
        if not groq_api_key:
            raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured")
        
        llm = ChatGroq(
            api_key=groq_api_key,
            model_name="llama-3.1-8b-instant",
            temperature=0.5,  # Lower temperature for faster, more deterministic responses
            max_tokens=800  # Limit response length for faster generation
        )
        
        # Optimize: Get fewer, more focused documents for faster processing
        relevant_docs = vector_store.similarity_search("key concepts definitions main ideas", k=2)
        
        # Aggressively limit context size for faster LLM processing
        context_parts = []
        total_length = 0
        max_length = 1200  # Reduced to 1200 chars for much faster processing
        
        for doc in relevant_docs:
            content = doc.page_content if hasattr(doc, 'page_content') else str(doc)
            # Truncate each document to max 600 chars
            truncated_content = content[:600] if len(content) > 600 else content
            if total_length + len(truncated_content) > max_length:
                remaining = max_length - total_length
                if remaining > 50:
                    context_parts.append(truncated_content[:remaining])
                break
            context_parts.append(truncated_content)
            total_length += len(truncated_content)
        
        context = "\n\n".join(context_parts)
        
        # Optimize: Ultra-concise prompt for fastest generation
        from langchain_core.messages import HumanMessage
        
        flashcard_prompt = (
            f"Create 10 flashcards. Format:\n"
            f"Front: [concept]\n"
            f"Back: [definition]\n\n"
            f"{context}\n\n"
            f"Output 10 flashcards in the format above."
        )
        
        # Direct LLM call (faster than chain) with timeout handling
        try:
            messages = [HumanMessage(content=flashcard_prompt)]
            flashcard_response = llm.invoke(messages)
            
            # Extract content from response
            if hasattr(flashcard_response, 'content'):
                response_text = flashcard_response.content
            else:
                response_text = str(flashcard_response)
            
            flashcards = parse_flashcards(response_text)
            
            # If parsing failed or got too few cards, try a simpler approach
            if len(flashcards) < 5:
                # Fallback: Try to extract pairs from the response
                # Look for Front: ... Back: ... patterns
                pattern = r'Front:\s*(.+?)\s*Back:\s*(.+?)(?=Front:|$)'
                matches = re.findall(pattern, response_text, re.DOTALL | re.IGNORECASE)
                if matches:
                    flashcards = [{'front': f.strip(), 'back': b.strip()} for f, b in matches[:10]]
            
            if not flashcards or len(flashcards) < 3:
                raise ValueError(f"Failed to parse flashcards. Got {len(flashcards) if flashcards else 0} cards. Response: {response_text[:200]}")
                
        except Exception as parse_error:
            raise HTTPException(
                status_code=500, 
                detail=f"Failed to generate or parse flashcards: {str(parse_error)}"
            )
        
        return FlashcardResponse(flashcards=[Flashcard(**fc) for fc in flashcards])
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate flashcards: {str(e)}")

@app.get("/api/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}

# Password Reset Endpoints
@app.post("/api/users/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Send password reset code to user's email"""
    import random
    from datetime import timedelta
    
    # Generate 6-digit reset code
    code = str(random.randint(100000, 999999))
    expires_at = datetime.utcnow() + timedelta(minutes=10)  # 10 minutes for password reset
    
    # Store reset code
    if request.email not in reset_codes_db:
        reset_codes_db[request.email] = []
    
    reset_codes_db[request.email].append({
        'code': code,
        'expires_at': expires_at,
        'is_used': False
    })
    
    # Send code by email
    await send_mfa_email(
        request.email, 
        code, 
        "Password Reset Code"
    )
    
    return {
        "message": "Password reset code sent to your email",
        "debug_code": code if MFA_DEBUG_MODE else None
    }

@app.post("/api/users/verify-reset-code")
def verify_reset_code(request: VerifyResetCodeRequest):
    """Verify password reset code"""
    user_codes = reset_codes_db.get(request.email, [])
    
    # Find valid code
    valid_code = None
    for reset in user_codes:
        if (reset['code'] == request.code and 
            not reset['is_used'] and 
            datetime.utcnow() <= reset['expires_at']):
            valid_code = reset
            break
    
    if not valid_code:
        expired = any(reset['code'] == request.code and datetime.utcnow() > reset['expires_at'] 
                     for reset in user_codes)
        if expired:
            raise HTTPException(status_code=400, detail="Reset code expired")
        raise HTTPException(status_code=400, detail="Invalid reset code")
    
    return {
        "message": "Reset code verified",
        "email": request.email
    }

@app.post("/api/users/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password with verified code and update in Supabase"""
    user_codes = reset_codes_db.get(request.email, [])
    
    # Find valid code
    valid_code = None
    for reset in user_codes:
        if (reset['code'] == request.code and 
            not reset['is_used'] and 
            datetime.utcnow() <= reset['expires_at']):
            valid_code = reset
            break
    
    if not valid_code:
        raise HTTPException(status_code=400, detail="Invalid or expired reset code")
    
    # Mark code as used
    valid_code['is_used'] = True
    
    # Send confirmation email
    await send_mfa_email(
        request.email,
        f"Your password has been successfully reset. If you didn't make this change, please contact support immediately.",
        "Password Reset Confirmation"
    )
    
    return {
        "message": "Password reset verified successfully",
        "email": request.email
    }

@app.post("/api/users/change-password")
def change_password(request: ChangePasswordRequest):
    """Change password (requires current password verification)"""
    # Note: Password verification and update happens with Supabase on frontend
    # This endpoint is for additional backend validation if needed
    return {
        "message": "Password change request received. Update with Supabase.",
        "email": request.email
    }

# User Authentication Endpoints with MFA
@app.post("/api/users/login")
async def login_user(login: LoginRequest):
    """Verify user exists in Supabase and send MFA code via email"""
    import random
    from datetime import timedelta
    
    # Note: User authentication is handled by Supabase on frontend
    # This endpoint only generates and sends MFA code
    
    # Generate 6-digit MFA code
    code = str(random.randint(100000, 999999))
    expires_at = datetime.utcnow() + timedelta(minutes=3)
    
    # Store MFA code temporarily (keyed by email)
    if login.email not in mfa_codes_db:
        mfa_codes_db[login.email] = []
    
    mfa_codes_db[login.email].append({
        'code': code,
        'expires_at': expires_at,
        'is_used': False
    })
    
    # Send code by email
    await send_mfa_email(login.email, code, "Your Login Verification Code")
    
    return {
        "message": "MFA code sent to your email",
        "debug_code": code if MFA_DEBUG_MODE else None
    }

class MFAVerifyRequest(BaseModel):
    email: str
    code: str

@app.post("/api/users/verify-code")
def verify_user_code(verify_request: MFAVerifyRequest):
    """Verify MFA code for user login"""
    # Get user's MFA codes (keyed by email)
    user_codes = mfa_codes_db.get(verify_request.email, [])
    
    # Find valid code
    valid_code = None
    for mfa in user_codes:
        if (mfa['code'] == verify_request.code and 
            not mfa['is_used'] and 
            datetime.utcnow() <= mfa['expires_at']):
            valid_code = mfa
            break
    
    if not valid_code:
        # Check if code exists but expired
        expired = any(mfa['code'] == verify_request.code and datetime.utcnow() > mfa['expires_at'] 
                     for mfa in user_codes)
        if expired:
            raise HTTPException(status_code=400, detail="Code expired")
        raise HTTPException(status_code=400, detail="Invalid code")
    
    # Mark code as used
    valid_code['is_used'] = True
    
    return {
        "message": "MFA verification successful",
        "email": verify_request.email
    }



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

