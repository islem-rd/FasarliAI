import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server-auth'

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to generate images.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { prompt, session_id } = body

    if (!prompt || !session_id) {
      return NextResponse.json(
        { error: 'Prompt and session_id are required' },
        { status: 400 }
      )
    }

    // Forward request to FastAPI backend
    let response
    try {
      response = await fetch(`${BACKEND_URL}/api/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          session_id,
        }),
        signal: AbortSignal.timeout(120000), // 2 minute timeout
      })
    } catch (fetchError: any) {
      console.error('Error connecting to backend:', fetchError)
      if (fetchError.name === 'TimeoutError' || fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Image generation timed out. Please try again.' },
          { status: 504 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to connect to backend. Make sure the backend is running.' },
        { status: 503 }
      )
    }

    let data
    try {
      data = await response.json()
    } catch (jsonError) {
      const text = await response.text()
      console.error('Error parsing response:', text)
      return NextResponse.json(
        { error: `Backend returned invalid response: ${text.substring(0, 200)}` },
        { status: response.status || 500 }
      )
    }

    if (!response.ok) {
      const errorMessage = data.detail || data.error || 'Failed to generate image'
      console.error('Backend error:', errorMessage)
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      )
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error in generate-image route:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + (error.message || String(error)) },
      { status: 500 }
    )
  }
}

