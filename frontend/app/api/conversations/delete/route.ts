import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server-auth'
import { getPDFByConversationServer } from '@/lib/supabase/database-server'
import { deletePDFFromStorage } from '@/lib/supabase/storage'
import { createServerClient } from '@supabase/ssr'

/**
 * DELETE /api/conversations/delete
 * 
 * Deletes a conversation and its associated PDF from storage
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversationId')

    if (!conversationId) {
      return NextResponse.json({ error: 'Conversation ID is required' }, { status: 400 })
    }

    // Get PDF metadata before deleting conversation (to get storage_path)
    const { data: pdf, error: pdfError } = await getPDFByConversationServer(request, conversationId)
    
    // Delete PDF from storage if it exists
    if (pdf && pdf.storage_path) {
      const { success, error: storageError } = await deletePDFFromStorage(request, pdf.storage_path)
      if (!success) {
        console.error('Error deleting PDF from storage:', storageError)
        // Continue with conversation deletion even if storage deletion fails
      }
    }

    // Delete conversation from database (this will cascade delete PDFs and messages due to foreign keys)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll() {
            // Cookies are handled by middleware
          },
        },
      }
    )

    const { error: deleteError } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', user.id) // Ensure user can only delete their own conversations

    if (deleteError) {
      console.error('Error deleting conversation:', deleteError)
      return NextResponse.json({ error: 'Failed to delete conversation' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete conversation API error:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete conversation' }, { status: 500 })
  }
}

