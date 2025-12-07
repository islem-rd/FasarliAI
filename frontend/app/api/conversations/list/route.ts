import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
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

    // Fetch conversations with their PDFs
    const { data: conversations, error: convError } = await supabase
      .from('conversations')
      .select(`
        id, 
        title, 
        created_at, 
        updated_at,
        pdfs (
          filename,
          storage_path
        )
      `)
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    if (convError) {
      console.error('Error fetching conversations:', convError)
      return NextResponse.json(
        { error: 'Failed to fetch conversations' },
        { status: 500 }
      )
    }

    // Get message count for each conversation and format the data
    const conversationsWithCount = await Promise.all(
      (conversations || []).map(async (conv: any) => {
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)

        // Get the first PDF's filename as the name
        const pdfName = conv.pdfs && conv.pdfs.length > 0 ? conv.pdfs[0].filename : conv.title
        const storagePath = conv.pdfs && conv.pdfs.length > 0 ? conv.pdfs[0].storage_path : null

        return {
          id: conv.id,
          name: pdfName,
          title: conv.title,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
          storage_path: storagePath,
          message_count: count || 0
        }
      })
    )

    return NextResponse.json({
      conversations: conversationsWithCount
    })

  } catch (error) {
    console.error('Error in conversations list route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
