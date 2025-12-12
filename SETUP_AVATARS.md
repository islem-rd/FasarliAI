# Setup Instructions for Avatar Upload

## Problem Resolution

If you're getting errors like:
- "Could not find the 'username' column of 'users' in the schema cache"
- "Failed to upload avatar: Bucket not found"

## Quick Setup (Automatic)

### Option 1: Run Migrations (Recommended)

Simply run the SQL migrations in Supabase SQL Editor:

1. **Migration 004**: `backend/supabase/migrations/004_ensure_user_columns.sql`
2. **Migration 005**: `backend/supabase/migrations/005_create_avatars_bucket.sql`

### Option 2: Use Setup Script

```bash
cd frontend
node scripts/setup-avatars.js
```

This will check if the bucket exists and provide instructions.

### Option 3: Use API Endpoint

Call the setup endpoint (requires `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`):

```bash
curl -X POST http://localhost:3000/api/setup-avatars
```

## Manual Setup

If automatic setup doesn't work, follow these steps:

## Step 1: Run Database Migrations

Execute the following migrations in your Supabase SQL Editor (in order):

1. **004_ensure_user_columns.sql** - Ensures username and avatar_url columns exist
2. **005_create_avatars_bucket.sql** - Creates the avatars storage bucket and policies

### How to run migrations:

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of each migration file
5. Click **Run** to execute

**Important**: Migration 005 requires admin privileges. If you get permission errors:
- Use the Supabase Dashboard to create the bucket manually (see Step 2)
- Or use Supabase CLI with service_role key

## Step 2: Create Storage Bucket (Alternative Method)

If migration 005 doesn't work, create the bucket manually:

1. Go to **Storage** in your Supabase Dashboard
2. Click **New bucket**
3. Set the following:
   - **Name**: `avatars`
   - **Public bucket**: ✅ (checked)
   - **File size limit**: 5242880 (5MB)
   - **Allowed MIME types**: `image/jpeg,image/jpg,image/png,image/webp`
4. Click **Create bucket**

## Step 3: Set Storage Policies

After creating the bucket, set up the policies in **Storage** → **Policies** → **avatars**:

### Policy 1: Upload (INSERT)
- **Policy name**: "Users can upload their own avatars"
- **Allowed operation**: INSERT
- **Target roles**: authenticated
- **Policy definition**:
```sql
bucket_id = 'avatars' AND
auth.uid()::text = (storage.foldername(name))[1]
```

### Policy 2: Read (SELECT)
- **Policy name**: "Anyone can read avatars"
- **Allowed operation**: SELECT
- **Target roles**: public
- **Policy definition**:
```sql
bucket_id = 'avatars'
```

### Policy 3: Update (UPDATE)
- **Policy name**: "Users can update their own avatars"
- **Allowed operation**: UPDATE
- **Target roles**: authenticated
- **Policy definition**:
```sql
bucket_id = 'avatars' AND
auth.uid()::text = (storage.foldername(name))[1]
```

### Policy 4: Delete (DELETE)
- **Policy name**: "Users can delete their own avatars"
- **Allowed operation**: DELETE
- **Target roles**: authenticated
- **Policy definition**:
```sql
bucket_id = 'avatars' AND
auth.uid()::text = (storage.foldername(name))[1]
```

## Step 4: Verify Setup

After completing the above steps:

1. Check that the `users` table has `username` and `avatar_url` columns
2. Verify the `avatars` bucket exists in Storage
3. Test uploading an avatar in the Settings page

## Troubleshooting

### "Column not found" error
- Run migration 004_ensure_user_columns.sql
- Refresh your Supabase connection/cache

### "Bucket not found" error
- Create the `avatars` bucket manually in Storage
- Ensure it's set to public
- Check that policies are set correctly

### Upload fails with permission error
- Verify RLS (Row Level Security) is enabled on storage.objects
- Check that the policies are correctly applied
- Ensure the user is authenticated

