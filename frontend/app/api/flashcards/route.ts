import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

/**
 * POST /api/flashcards
 * Generate flashcards from uploaded PDF
 * 
 * Expected request body:
 * {
 *   sessionId: string
 * }
 * 
 * Expected response:
 * {
 *   flashcards: Array<{
 *     front: string
 *     back: string
 *   }>
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required. Please upload a PDF first.' },
        { status: 400 }
      )
    }

    // Forward request to FastAPI backend with timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 120000) // 2 minute timeout

    let response
    try {
      response = await fetch(`${BACKEND_URL}/api/flashcards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
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
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      return NextResponse.json(
        { error: error.detail || 'Failed to generate flashcards' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Flashcards API error:', error)
    
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('ECONNRESET')) {
      return NextResponse.json(
        { error: 'Backend server is not running. Please start the FastAPI server.' },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to generate flashcards' },
      { status: 500 }
    )
  }
}
