-- Add image_url column to chat_messages table for storing generated images
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add index for faster queries on image_url (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_chat_messages_image_url ON chat_messages(image_url) WHERE image_url IS NOT NULL;

