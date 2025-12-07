import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server-auth'
import { createConversationServer, createPDFServer, createChatMessageServer, updateConversationServer } from '@/lib/supabase/database-server'
import { uploadPDFToStorage } from '@/lib/supabase/storage'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

/**
 * POST /api/upload
 * 
 * Handles PDF file uploads and forwards to FastAPI backend
 * Also creates a conversation and saves PDF metadata to database
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to upload files.' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const conversationId = formData.get('conversationId') as string | null
    const sessionId = formData.get('session_id') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    if (!file.name.endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      )
    }

    // Check file size (limit to 50MB)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      )
    }

    // Forward file to FastAPI backend with timeout
    const uploadFormData = new FormData()
    uploadFormData.append('file', file)
    
    // Include session_id if provided (for merging multiple PDFs)
    if (sessionId) {
      uploadFormData.append('session_id', sessionId)
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minute timeout

    try {
      const response = await fetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body: uploadFormData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
        return NextResponse.json(
          { error: error.detail || 'Failed to upload PDF' },
          { status: response.status }
        )
      }

      const data = await response.json()
      
      // Upload PDF to Supabase Storage
      let storagePath: string | null = null
      try {
        // We'll upload after conversation is created
      } catch (storageError) {
        console.error('Error preparing storage upload:', storageError)
        // Continue even if storage fails
      }
      
      // Use existing conversation if provided, otherwise create a new one
      let conversation
      try {
        if (conversationId) {
          // Use existing conversation
          const { getConversationServer } = await import('@/lib/supabase/database-server')
          const { data: existingConv, error: fetchError } = await getConversationServer(request, conversationId)
          if (fetchError || !existingConv) {
            console.error('Error fetching existing conversation:', fetchError)
            // Fall back to creating a new conversation
            const conversationTitle = file.name.replace('.pdf', '')
            const { data: newConv, error: convError } = await createConversationServer(
              request,
              user.id,
              conversationTitle
            )
            if (convError) {
              console.error('Error creating conversation (fallback):', convError)
              throw new Error(`Failed to create conversation: ${convError.message || JSON.stringify(convError)}`)
            }
            if (!newConv) {
              throw new Error('Conversation was not created (fallback)')
            }
            conversation = newConv
          } else {
            conversation = existingConv
          }
        } else {
          // Create new conversation
          const conversationTitle = file.name.replace('.pdf', '')
          const { data: newConv, error: convError } = await createConversationServer(
            request,
            user.id,
            conversationTitle
          )
          if (convError) {
            console.error('Error creating conversation:', convError)
            throw new Error(`Failed to create conversation: ${convError.message || JSON.stringify(convError)}`)
          }
          if (!newConv) {
            throw new Error('Conversation was not created')
          }
          conversation = newConv
        }
      } catch (dbError: any) {
        console.error('Database error in upload route:', dbError)
        // Return backend response even if database operations fail
        return NextResponse.json({
          ...data,
          conversation_id: null,
          warning: dbError.message || 'PDF uploaded but failed to save to database',
        }, { status: 200 })
      }

      // Upload PDF to Supabase Storage
      if (conversation) {
        const { path: uploadedPath, error: storageError } = await uploadPDFToStorage(
          request,
          user.id,
          conversation.id,
          file
        )
        
        if (storageError) {
          console.error('Error uploading PDF to storage:', storageError)
        } else {
          storagePath = uploadedPath
        }
      }

      // Save PDF metadata to database
      if (conversation) {
        const { error: pdfError } = await createPDFServer(
          request,
          conversation.id,
          user.id,
          file.name,
          file.size,
          data.chunks_count || null,
          data.session_id || null,
          storagePath
        )

        if (pdfError) {
          console.error('Error saving PDF:', pdfError)
        }

        // Save system message to database
        const systemMessage = `PDF "${file.name}" uploaded and processed successfully. You can now ask questions about the document.`
        await createChatMessageServer(
          request,
          conversation.id,
          user.id,
          'system',
          systemMessage
        ).catch((err: any) => console.error('Error saving system message:', err))
      }

      return NextResponse.json({
        ...data,
        conversation_id: conversation?.id || null,
      })
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Upload timeout. The file may be too large or the backend is not responding.' },
          { status: 504 }
        )
      }
      
      if (fetchError.code === 'ECONNREFUSED' || fetchError.code === 'ECONNRESET') {
        return NextResponse.json(
          { error: 'Cannot connect to backend server. Please make sure the FastAPI server is running on port 8000.' },
          { status: 503 }
        )
      }
      
      throw fetchError
    }
  } catch (error: any) {
    console.error('Upload API error:', error)
    console.error('Error stack:', error.stack)
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
    })
    
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('ECONNRESET')) {
      return NextResponse.json(
        { error: 'Backend server is not running. Please start the FastAPI server.' },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { 
        error: error.message || 'Failed to upload file',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

