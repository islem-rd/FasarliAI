/**
 * Setup script for avatars bucket and policies
 * 
 * Usage:
 *   cd frontend && node scripts/setup-avatars.js
 * 
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL in .env.local
 *   - SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing required environment variables:')
  console.error('   - NEXT_PUBLIC_SUPABASE_URL')
  console.error('   - SUPABASE_SERVICE_ROLE_KEY')
  console.error('\nAdd these to your frontend/.env.local file')
  process.exit(1)
}

async function setupAvatars() {
  console.log('🚀 Setting up avatars bucket and policies...\n')

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message)
      return
    }

    const avatarsBucket = buckets?.find(b => b.id === 'avatars')

    if (avatarsBucket) {
      console.log('✅ Bucket "avatars" already exists')
    } else {
      console.log('📦 Bucket "avatars" not found')
      console.log('⚠️  Bucket creation requires SQL execution.')
      console.log('   Please run migration 005_create_avatars_bucket.sql in Supabase SQL Editor\n')
    }

    console.log('\n📋 Next steps:')
    console.log('   1. Go to Supabase Dashboard → SQL Editor')
    console.log('   2. Run migration: backend/supabase/migrations/005_create_avatars_bucket.sql')
    console.log('   3. Verify bucket exists in Storage → Buckets')
    console.log('   4. Verify policies exist in Storage → Policies → avatars\n')

    console.log('✅ Setup instructions displayed. Run the SQL migration to complete setup.')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

setupAvatars()

