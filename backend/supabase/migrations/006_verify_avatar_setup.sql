-- Verification and fix script for avatar setup
-- Run this if you're getting "Failed to update user profile" errors

-- Ensure username column exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'username'
    ) THEN
        ALTER TABLE users ADD COLUMN username TEXT;
        RAISE NOTICE 'Added username column';
    ELSE
        RAISE NOTICE 'username column already exists';
    END IF;
END $$;

-- Ensure avatar_url column exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE users ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Added avatar_url column';
    ELSE
        RAISE NOTICE 'avatar_url column already exists';
    END IF;
END $$;

-- Verify RLS policy allows updates
-- Check if the update policy exists and allows all columns
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'users' 
        AND policyname = 'Users can update their own profile'
    ) THEN
        -- Create the policy if it doesn't exist
        CREATE POLICY "Users can update their own profile"
        ON users FOR UPDATE
        USING (auth.uid() = id);
        RAISE NOTICE 'Created update policy';
    ELSE
        RAISE NOTICE 'Update policy already exists';
    END IF;
END $$;

-- Verify bucket exists (this will fail if bucket doesn't exist, which is expected)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM storage.buckets 
        WHERE id = 'avatars'
    ) THEN
        RAISE NOTICE 'avatars bucket exists';
    ELSE
        RAISE WARNING 'avatars bucket does not exist. Run migration 005_create_avatars_bucket.sql';
    END IF;
END $$;

