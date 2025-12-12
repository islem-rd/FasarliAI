-- Add avatar_url column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create storage bucket for avatars if it doesn't exist
-- Note: This needs to be run in Supabase Dashboard or via Supabase CLI
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
-- ON CONFLICT (id) DO NOTHING;

-- Create policy to allow users to upload their own avatars
-- CREATE POLICY "Users can upload their own avatars"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'avatars' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );

-- Create policy to allow users to read all avatars (public bucket)
-- CREATE POLICY "Anyone can read avatars"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'avatars');

-- Create policy to allow users to update their own avatars
-- CREATE POLICY "Users can update their own avatars"
-- ON storage.objects FOR UPDATE
-- USING (
--   bucket_id = 'avatars' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );

-- Create policy to allow users to delete their own avatars
-- CREATE POLICY "Users can delete their own avatars"
-- ON storage.objects FOR DELETE
-- USING (
--   bucket_id = 'avatars' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );

