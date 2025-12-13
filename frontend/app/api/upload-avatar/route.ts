import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server-auth'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { updateUserServer } from '@/lib/supabase/database-server'

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to upload avatar.' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 5MB limit' },
        { status: 400 }
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

    // Create a unique file path: userId/avatar.ext
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `avatar.${fileExt}`
    const filePath = `${user.id}/${fileName}`

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)

    // Check if bucket exists by trying to list it
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    
    let avatarsBucket = buckets?.find(b => b.id === 'avatars')
    
    // If bucket doesn't exist, try to create it automatically
    if (!avatarsBucket) {
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      
      if (serviceRoleKey && supabaseUrl) {
        try {
          // Create admin client with service role key
          const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          })
          
          // Try to create bucket using Supabase Storage API
          // Note: Supabase doesn't expose bucket creation via JS client, so we'll use REST API
          // Extract project reference from URL for Management API
          const urlMatch = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/)
          const projectRef = urlMatch?.[1]
          
          if (projectRef) {
            // Try using Storage Management API endpoint
            // This requires the project to have the Management API enabled
            try {
              const mgmtResponse = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/storage/buckets`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${serviceRoleKey}`,
                  'apikey': serviceRoleKey
                },
                body: JSON.stringify({
                  id: 'avatars',
                  name: 'avatars',
                  public: true,
                  file_size_limit: 5242880,
                  allowed_mime_types: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
                })
              })
              
              if (mgmtResponse.ok || mgmtResponse.status === 409) {
                // Verify bucket was created
                const { data: newBuckets } = await supabaseAdmin.storage.listBuckets()
                avatarsBucket = newBuckets?.find(b => b.id === 'avatars')
              }
            } catch (mgmtError) {
              // Management API might not be available, try alternative method
              console.log('Management API not available, will provide manual instructions')
            }
          }
          
          // If still not created, try one more time with direct PostgREST
          if (!avatarsBucket) {
            // Last attempt: verify bucket wasn't created in the meantime
            const { data: newBuckets } = await supabaseAdmin.storage.listBuckets()
            avatarsBucket = newBuckets?.find(b => b.id === 'avatars')
          }
        } catch (createError: any) {
          console.error('Error attempting to create bucket automatically:', createError)
        }
      }
      
      // If bucket still doesn't exist, return helpful error with setup instructions
      if (!avatarsBucket) {
        return NextResponse.json(
          { 
            error: 'Storage bucket "avatars" not found. Please create it in Supabase Dashboard.',
            errorCode: 'BUCKET_NOT_FOUND',
            instructions: [
              'Go to Supabase Dashboard → Storage → New bucket',
              'Name: "avatars"',
              'Public: true',
              'File size limit: 5242880 (5MB)',
              'Allowed MIME types: image/jpeg, image/jpg, image/png, image/webp',
              '',
              'Or run the SQL migration:',
              'Go to Supabase Dashboard → SQL Editor → Run: backend/supabase/migrations/005_create_avatars_bucket.sql'
            ].join('\n'),
            quickFix: 'Create bucket in Supabase Dashboard: Storage → New bucket → Name: "avatars", Public: true'
          },
          { status: 500 }
        )
      }
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        upsert: true, // Overwrite if exists
      })

    if (uploadError) {
      console.error('Error uploading avatar to storage:', uploadError)
      
      // Check if it's a bucket not found error
      if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('not found')) {
        return NextResponse.json(
          { 
            error: 'Storage bucket "avatars" not found. Please create it in Supabase Dashboard: Storage → New bucket → Name: "avatars", Public: true',
            errorCode: 'BUCKET_NOT_FOUND'
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to upload avatar: ' + uploadError.message },
        { status: 500 }
      )
    }

    // Get public URL
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)
    const publicUrl = data.publicUrl

    // Update user record with avatar URL using server function
    const { data: updatedUser, error: updateError } = await updateUserServer(request, user.id, {
      avatar_url: publicUrl,
    })

    if (updateError) {
      console.error('Error updating user avatar_url:', updateError)
      console.error('Error details:', JSON.stringify(updateError, null, 2))
      
      // Check if it's a column not found error
      if (updateError.message?.includes('column') && (updateError.message?.includes('does not exist') || updateError.message?.includes('not found'))) {
        // Try to delete the uploaded file
        await supabase.storage.from('avatars').remove([filePath])
        return NextResponse.json(
          { 
            error: 'Database column "avatar_url" not found. Please run migration 004_ensure_user_columns.sql in Supabase SQL Editor.',
            errorCode: 'COLUMN_NOT_FOUND',
            details: updateError.message
          },
          { status: 500 }
        )
      }
      
      // Check if it's a permission error
      if (updateError.message?.includes('permission') || updateError.message?.includes('policy')) {
        // Try to delete the uploaded file
        await supabase.storage.from('avatars').remove([filePath])
        return NextResponse.json(
          { 
            error: 'Permission denied. Please check Row Level Security policies on the users table.',
            errorCode: 'PERMISSION_DENIED',
            details: updateError.message
          },
          { status: 500 }
        )
      }
      
      // Try to delete the uploaded file
      await supabase.storage.from('avatars').remove([filePath])
      return NextResponse.json(
        { 
          error: 'Failed to update user profile: ' + (updateError.message || 'Unknown error'),
          errorCode: 'UPDATE_FAILED',
          details: updateError.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      avatar_url: publicUrl,
      user: updatedUser,
    })
  } catch (error: any) {
    console.error('Error in upload-avatar route:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + error.message },
      { status: 500 }
    )
  }
}

