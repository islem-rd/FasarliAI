import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/setup-avatars
 * 
 * Admin endpoint to automatically create the avatars bucket and policies
 * Requires SUPABASE_SERVICE_ROLE_KEY in environment variables
 * 
 * Call this endpoint once during initial setup:
 * curl -X POST http://localhost:3000/api/setup-avatars
 */
export async function POST(request: NextRequest) {
  try {
    // Check if service role key is available
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json(
        { 
          error: 'SUPABASE_SERVICE_ROLE_KEY not configured. Add it to .env.local',
          errorCode: 'MISSING_SERVICE_KEY',
          instructions: 'Add SUPABASE_SERVICE_ROLE_KEY to your .env.local file'
        },
        { status: 500 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_SUPABASE_URL not configured' },
        { status: 500 }
      )
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const results: any = {
      bucket: null,
      policies: [],
      errors: []
    }

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets()
    
    if (listError) {
      return NextResponse.json(
        { error: 'Failed to list buckets: ' + listError.message },
        { status: 500 }
      )
    }

    const avatarsBucket = buckets?.find(b => b.id === 'avatars')

    if (!avatarsBucket) {
      // Create bucket using direct SQL query via REST API
      // Note: This requires the service_role key and may need to be done via SQL Editor
      // We'll provide the SQL and try to execute it via RPC if available
      
      // Try using SQL function if available
      const { error: sqlError } = await supabaseAdmin
        .from('storage.buckets')
        .insert({
          id: 'avatars',
          name: 'avatars',
          public: true,
          file_size_limit: 5242880,
          allowed_mime_types: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
        })

      if (sqlError) {
        // If direct insert fails, return SQL to execute manually
        return NextResponse.json(
          { 
            success: false,
            error: 'Could not create bucket automatically. Please run the SQL below in Supabase SQL Editor.',
            errorCode: 'BUCKET_CREATION_FAILED',
            sql: `
-- Run this in Supabase SQL Editor:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Then run the policies from migration 005_create_avatars_bucket.sql
            `.trim()
          },
          { status: 500 }
        )
      }

      results.bucket = { message: 'Bucket created successfully', id: 'avatars' }
    } else {
      results.bucket = { message: 'Bucket already exists', id: avatarsBucket.id }
    }

    // Create policies using SQL
    const policies = [
      {
        name: 'Users can upload their own avatars',
        sql: `CREATE POLICY IF NOT EXISTS "Users can upload their own avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);`
      },
      {
        name: 'Anyone can read avatars',
        sql: `CREATE POLICY IF NOT EXISTS "Anyone can read avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');`
      },
      {
        name: 'Users can update their own avatars',
        sql: `CREATE POLICY IF NOT EXISTS "Users can update their own avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);`
      },
      {
        name: 'Users can delete their own avatars',
        sql: `CREATE POLICY IF NOT EXISTS "Users can delete their own avatars"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);`
      }
    ]

    // Policies need to be created via SQL Editor, not via JS client
    // Return success with instructions
    return NextResponse.json({
      success: true,
      message: results.bucket.message,
      bucket: results.bucket,
      note: 'Policies need to be created via SQL. Run migration 005_create_avatars_bucket.sql in Supabase SQL Editor to create all policies.',
      policiesSQL: policies.map(p => p.sql).join('\n\n')
    })

  } catch (error: any) {
    console.error('Error in setup-avatars route:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + error.message },
      { status: 500 }
    )
  }
}
