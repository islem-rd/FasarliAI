import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server-auth'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to delete your account.' },
        { status: 401 }
      )
    }

    // Create Supabase client with authentication
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

    // Create admin client with service role key for deletion
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: 'Server configuration error. Please contact support.' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Delete user data from custom tables first (to avoid foreign key constraints)
    try {
      // Delete chat messages
      await supabaseAdmin
        .from('chat_messages')
        .delete()
        .eq('user_id', user.id)

      // Delete PDFs
      await supabaseAdmin
        .from('pdfs')
        .delete()
        .eq('user_id', user.id)

      // Delete conversations
      await supabaseAdmin
        .from('conversations')
        .delete()
        .eq('user_id', user.id)

      // Delete user record from users table
      await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', user.id)

      // Delete avatar from storage if exists
      try {
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('avatar_url')
          .eq('id', user.id)
          .single()

        if (userData?.avatar_url) {
          const avatarPath = userData.avatar_url.split('/').slice(-2).join('/') // Extract userId/avatar.ext
          await supabaseAdmin.storage
            .from('avatars')
            .remove([avatarPath])
        }
      } catch (storageError) {
        console.error('Error deleting avatar:', storageError)
        // Continue with account deletion even if avatar deletion fails
      }
    } catch (dbError: any) {
      console.error('Error deleting user data:', dbError)
      // Continue with auth user deletion
    }

    // Delete the auth user (this will cascade delete related data)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteError) {
      console.error('Error deleting auth user:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete account: ' + deleteError.message },
        { status: 500 }
      )
    }

    // Sign out the user
    await supabase.auth.signOut()

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully'
    })
  } catch (error: any) {
    console.error('Error in delete-account route:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + error.message },
      { status: 500 }
    )
  }
}

