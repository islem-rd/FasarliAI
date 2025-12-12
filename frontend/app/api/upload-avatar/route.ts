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
    
    if (bucketError) {
      console.error('Error checking buckets:', bucketError)
    } else {
      const avatarsBucket = buckets?.find(b => b.id === 'avatars')
      if (!avatarsBucket) {
        // Try to create bucket automatically using service role key
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (serviceRoleKey) {
          try {
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
            
            // Try to create bucket via SQL RPC
            const { error: createError } = await supabaseAdmin.rpc('exec_sql', {
              sql: `
                INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
                VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
                ON CONFLICT (id) DO NOTHING;
              `
            })
            
            if (createError) {
              console.log('Could not create bucket automatically:', createError.message)
            } else {
              // Bucket created, now create policies
              await supabaseAdmin.rpc('exec_sql', {
                sql: `
                  CREATE POLICY IF NOT EXISTS "Users can upload their own avatars"
                  ON storage.objects FOR INSERT TO authenticated
                  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
                  
                  CREATE POLICY IF NOT EXISTS "Anyone can read avatars"
                  ON storage.objects FOR SELECT TO public
                  USING (bucket_id = 'avatars');
                  
                  CREATE POLICY IF NOT EXISTS "Users can update their own avatars"
                  ON storage.objects FOR UPDATE TO authenticated
                  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
                  WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
                  
                  CREATE POLICY IF NOT EXISTS "Users can delete their own avatars"
                  ON storage.objects FOR DELETE TO authenticated
                  USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
                `
              })
            }
          } catch (autoCreateError) {
            console.log('Auto-creation failed, will return error to user')
          }
        }
        
        // Check again if bucket was created
        const { data: bucketsAfter, error: checkError } = await supabase.storage.listBuckets()
        const avatarsBucketAfter = bucketsAfter?.find(b => b.id === 'avatars')
        
        if (!avatarsBucketAfter) {
          return NextResponse.json(
            { 
              error: 'Storage bucket "avatars" not found. Please run migration 005_create_avatars_bucket.sql in Supabase SQL Editor, or call /api/setup-avatars endpoint.',
              errorCode: 'BUCKET_NOT_FOUND',
              setupEndpoint: '/api/setup-avatars'
            },
            { status: 500 }
          )
        }
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
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

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

