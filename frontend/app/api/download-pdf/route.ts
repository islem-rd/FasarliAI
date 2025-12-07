import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const conversationId = searchParams.get('conversationId')
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get conversation with PDF info
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        title,
        pdfs (
          filename,
          storage_path
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

    // Check if PDF exists
    const pdf = (conversation as any).pdfs?.[0]
    if (!pdf || !pdf.storage_path) {
      return NextResponse.json(
        { error: 'No PDF file associated with this conversation' },
        { status: 404 }
      )
    }

    // Download the PDF from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('pdfs')
      .download(pdf.storage_path)

    if (downloadError || !fileData) {
      console.error('Error downloading PDF:', downloadError)
      return NextResponse.json(
        { error: 'Failed to download PDF' },
        { status: 500 }
      )
    }

    // Convert blob to buffer
    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Return the PDF file
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${pdf.filename || 'document.pdf'}"`,
      },
    })

  } catch (error) {
    console.error('Error in download PDF route:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
