-- Create storage bucket for generated images
-- This must be run in Supabase Dashboard SQL Editor with service_role key

-- Create the bucket (requires admin privileges)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-images',
  'generated-images',
  true,
  10485760, -- 10MB limit (images are usually smaller)
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload their own generated images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read generated images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own generated images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own generated images" ON storage.objects;

-- Create policy to allow authenticated users to upload their own generated images
CREATE POLICY "Users can upload their own generated images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'generated-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy to allow anyone to read generated images (public bucket)
CREATE POLICY "Anyone can read generated images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'generated-images');

-- Create policy to allow users to update their own generated images
CREATE POLICY "Users can update their own generated images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'generated-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'generated-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create policy to allow users to delete their own generated images
CREATE POLICY "Users can delete their own generated images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'generated-images' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

