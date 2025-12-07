import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server-auth'
import { downloadPDFFromStorage } from '@/lib/supabase/storage'
import { getPDFByConversationServer, updatePDFServer } from '@/lib/supabase/database-server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

/**
 * POST /api/conversations/reload-pdf
 * 
 * Reloads a PDF from Supabase Storage and processes it in the backend
 * to recreate the vector store for quiz/flashcards functionality
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conversationId } = await request.json()

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 })
    }

    // Get PDF metadata from database
    const { data: pdf, error: pdfError } = await getPDFByConversationServer(request, conversationId)

    if (pdfError || !pdf) {
      return NextResponse.json({ error: 'PDF not found' }, { status: 404 })
    }

    if (!pdf.storage_path) {
      return NextResponse.json({ error: 'PDF not stored in Supabase Storage' }, { status: 404 })
    }

    // Download PDF from Supabase Storage
    const { data: pdfBuffer, error: downloadError } = await downloadPDFFromStorage(
      request,
      pdf.storage_path
    )

    if (downloadError || !pdfBuffer) {
      console.error('Error downloading PDF from storage:', downloadError)
      return NextResponse.json({ error: 'Failed to download PDF from storage' }, { status: 500 })
    }

    // Create a File-like object from the buffer
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' })
    const formData = new FormData()
    formData.append('file', blob, pdf.filename)

    // Forward to FastAPI backend for processing
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minute timeout

    try {
      const response = await fetch(`${BACKEND_URL}/api/upload`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
        return NextResponse.json(
          { error: error.detail || 'Failed to process PDF' },
          { status: response.status }
        )
      }

      const data = await response.json()

      // Update PDF with new session ID
      if (pdf.id && data.session_id) {
        await updatePDFServer(request, pdf.id, {
          vector_store_session_id: data.session_id,
        })
      }

      return NextResponse.json({
        session_id: data.session_id,
        chunks_count: data.chunks_count,
        message: 'PDF reloaded and processed successfully',
      })
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Request timeout. Please try again.' },
          { status: 504 }
        )
      }
      
      if (fetchError.code === 'ECONNREFUSED' || fetchError.code === 'ECONNRESET') {
        return NextResponse.json(
          { error: 'Cannot connect to backend server. Please make sure the FastAPI server is running.' },
          { status: 503 }
        )
      }
      
      throw fetchError
    }
  } catch (error: any) {
    console.error('Reload PDF API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to reload PDF' },
      { status: 500 }
    )
  }
}

