import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server-auth'
import { createConversationServer } from '@/lib/supabase/database-server'

/**
 * POST /api/conversations
 * 
 * Creates a new conversation for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to create conversations.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title } = body

    if (!title || title.trim() === '') {
      return NextResponse.json(
        { error: 'Conversation title is required' },
        { status: 400 }
      )
    }

    const { data: conversation, error } = await createConversationServer(
      request,
      user.id,
      title.trim()
    )

    if (error) {
      console.error('Error creating conversation:', error)
      return NextResponse.json(
        { 
          error: 'Failed to create conversation',
          details: error.message || JSON.stringify(error)
        },
        { status: 500 }
      )
    }

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation was not created' },
        { status: 500 }
      )
    }

    return NextResponse.json({ conversation })
  } catch (error: any) {
    console.error('Conversation API error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create conversation' },
      { status: 500 }
    )
  }
}

