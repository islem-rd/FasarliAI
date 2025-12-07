# FasarliAI

FasarliAI turns dense PDFs into an interactive study space: upload a document, chat with a Groq-powered assistant, spin up quizzes and flashcards, and follow usage insights from a clean dashboard.

## Tools & Frameworks
- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Radix UI, Sonner toasts, Lucide icons  
- **Backend:** FastAPI, Uvicorn, LangChain + Groq LLMs, HuggingFace embeddings, FAISS vector search  
- **Data & Auth:** Supabase (Postgres, Storage, Auth) with row-level security  
- **Dev tooling:** Node.js, npm, Python 3.11+, ESLint/TypeScript, Vercel Analytics

## Launch in Minutes
1. **Install dependencies**
```bash
npm install
   cd backend && python -m venv venv && venv\Scripts\activate  # use `source venv/bin/activate` on mac/linux
pip install -r requirements.txt
   ```
2. **Environment variables**
   - `.env.local`
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
     ```
   - `backend/.env`
     ```
     GROQ_API_KEY=your_groq_key
     SUPABASE_URL=your_supabase_url
     SUPABASE_SERVICE_ROLE_KEY=service_role_key
     ```
3. **Supabase prep**  
   Create a project, run the SQL in `supabase/migrations`, and make a private `pdfs` bucket (50 MB limit, PDF mime type).
4. **Run it**
```bash
   # backend
   cd backend && venv\Scripts\activate && uvicorn main:app --reload --port 8000

   # frontend
npm run dev
   ```
   Open `http://localhost:3000`.

## Feature Snapshot
- Multi-PDF upload with Supabase Storage, automatic reloads, and quick downloads.
- Retrieval-Augmented chat with persistent history, source pointers, and graceful fallbacks.
- One-click quiz and flashcard generation pulled from the active PDF session.
- Dashboard cards for activity, document library management, and conversation shortcuts.
- Theme persistence, MFA-ready auth, polished gradients/video backgrounds, and tidy scroll areas.

Deploy the FastAPI service wherever you like, point `NEXT_PUBLIC_BACKEND_URL` to it, and Supabase handles auth plus storage. Contributions welcome!

