import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server-auth'
import { createChatMessageServer } from '@/lib/supabase/database-server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

/**
 * POST /api/chat
 * 
 * Proxies chat requests to FastAPI backend and saves messages to database
 * 
 * Expected request body:
 * {
 *   message: string
 *   sessionId: string
 *   conversationId?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to send messages.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { message, sessionId, conversationId } = body

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required. Please upload a PDF first.' },
        { status: 400 }
      )
    }

    // Forward request to FastAPI backend with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 1 minute timeout

    let response
    try {
      response = await fetch(`${BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: message,
          session_id: sessionId,
          conversation_id: body.conversationId,
        }),
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
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

    if (!response.ok) {
      const error = await response.json()
      return NextResponse.json(
        { error: error.detail || 'Failed to process message' },
        { status: response.status }
      )
    }

    const data = await response.json()
    
    // Save user message to database
    if (conversationId) {
      await createChatMessageServer(
        request,
        conversationId,
        user.id,
        'user',
        message
      ).catch(err => console.error('Error saving user message:', err))
    }

    // Save assistant response to database
    if (conversationId) {
      await createChatMessageServer(
        request,
        conversationId,
        user.id,
        'assistant',
        data.content,
        data.sources || null
      ).catch(err => console.error('Error saving assistant message:', err))
    }
    
    // Format timestamp for display
    const timestamp = new Date(data.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })

    return NextResponse.json({
      ...data,
      timestamp,
    })
  } catch (error: any) {
    console.error('Chat API error:', error)
    
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('ECONNRESET')) {
      return NextResponse.json(
        { error: 'Backend server is not running. Please start the FastAPI server.' },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to process message' },
      { status: 500 }
    )
  }
}
