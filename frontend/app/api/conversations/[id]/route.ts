import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    // Get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const conversationId = id

    // Fetch conversation with PDFs
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        title,
        created_at,
        updated_at,
        pdfs (
          id,
          filename,
          storage_path,
          vector_store_session_id
        )
      `)
      .eq('id', conversationId)
      .eq('user_id', user.id)
      .single()

    if (convError || !conversation) {
      console.error('Error fetching conversation:', convError)
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Fetch messages for this conversation
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('id, author, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
    }

    // Format the response
    const pdfName = conversation.pdfs && conversation.pdfs.length > 0 
      ? conversation.pdfs[0].filename 
      : conversation.title

    const sessionId = conversation.pdfs && conversation.pdfs.length > 0
      ? conversation.pdfs[0].vector_store_session_id || conversation.pdfs[0].id
      : conversationId

    const storagePath = conversation.pdfs && conversation.pdfs.length > 0
      ? conversation.pdfs[0].storage_path
      : null

    return NextResponse.json({
      id: conversation.id,
      name: pdfName,
      title: conversation.title,
      session_id: sessionId,
      storage_path: storagePath,
      created_at: conversation.created_at,
      messages: (messages || []).map(msg => ({
        role: msg.author,
        content: msg.content,
        timestamp: msg.created_at
      }))
    })

  } catch (error) {
    console.error('Error in conversation detail route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
