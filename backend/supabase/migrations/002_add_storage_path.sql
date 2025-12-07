-- Add storage_path column to pdfs table
ALTER TABLE pdfs ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Create storage bucket for PDFs if it doesn't exist
-- Note: This needs to be run in Supabase Dashboard or via Supabase CLI
-- INSERT INTO storage.buckets (id, name, public) VALUES ('pdfs', 'pdfs', false)
-- ON CONFLICT (id) DO NOTHING;

-- Create policy to allow users to upload their own PDFs
-- CREATE POLICY "Users can upload their own PDFs"
-- ON storage.objects FOR INSERT
-- WITH CHECK (
--   bucket_id = 'pdfs' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );

-- Create policy to allow users to read their own PDFs
-- CREATE POLICY "Users can read their own PDFs"
-- ON storage.objects FOR SELECT
-- USING (
--   bucket_id = 'pdfs' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );

-- Create policy to allow users to delete their own PDFs
-- CREATE POLICY "Users can delete their own PDFs"
-- ON storage.objects FOR DELETE
-- USING (
--   bucket_id = 'pdfs' AND
--   auth.uid()::text = (storage.foldername(name))[1]
-- );

