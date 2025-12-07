import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server-auth'
import { updateConversationServer } from '@/lib/supabase/database-server'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { conversationId, title } = await request.json()

    if (!conversationId || !title) {
      return NextResponse.json({ error: 'Conversation ID and title are required' }, { status: 400 })
    }

    const { data, error } = await updateConversationServer(request, conversationId, title)

    if (error) {
      console.error('Error renaming conversation:', error)
      return NextResponse.json({ error: 'Failed to rename conversation' }, { status: 500 })
    }

    return NextResponse.json({ success: true, conversation: data })
  } catch (error: any) {
    console.error('Rename conversation API error:', error)
    return NextResponse.json({ error: error.message || 'Failed to rename conversation' }, { status: 500 })
  }
}

