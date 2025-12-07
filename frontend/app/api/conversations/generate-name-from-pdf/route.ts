import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server-auth'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId, conversationId } = await request.json()

    if (!sessionId || !conversationId) {
      return NextResponse.json({ error: 'Session ID and conversation ID are required' }, { status: 400 })
    }

    // Call backend to generate name
    const response = await fetch(`${BACKEND_URL}/api/generate-conversation-name`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_id: sessionId }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }))
      return NextResponse.json(
        { error: error.detail || 'Failed to generate conversation name' },
        { status: response.status }
      )
    }

    const { name } = await response.json()
    return NextResponse.json({ name })
  } catch (error: any) {
    console.error('Generate conversation name API error:', error)
    return NextResponse.json({ error: error.message || 'Failed to generate conversation name' }, { status: 500 })
  }
}

