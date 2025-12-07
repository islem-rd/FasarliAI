# Supabase Database Setup

This directory contains the database migration files for the FasarliAI application.

## Database Schema

The application uses the following tables:

1. **users** - Extends Supabase auth.users with additional user information (automatically created on signup)
2. **conversations** - Stores conversation metadata (one per PDF upload)
3. **pdfs** - Stores PDF file metadata and references
4. **chat_messages** - Stores chat history for each conversation

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from Settings → API

### 2. Run the Migration

You have two options to run the migration:

#### Option A: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `001_initial_schema.sql`
5. Click **Run** to execute the migration

#### Option B: Using Supabase CLI

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### 3. Verify the Setup

After running the migration, verify that:

1. All tables are created (check in **Table Editor**)
2. Row Level Security (RLS) is enabled on all tables
3. Policies are created (check in **Authentication** → **Policies**)

### 4. Environment Variables

Make sure your `.env.local` file contains:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Structure

### users
- Automatically created when a user signs up (via database trigger)
- Links to `auth.users` table
- Stores user email and timestamps

### conversations
- Created when a PDF is uploaded
- Each conversation represents one PDF document session
- Contains title and timestamps

### pdfs
- Stores metadata about uploaded PDFs
- Links to conversations
- Stores filename, size, chunks count, and vector store session ID

### chat_messages
- Stores all chat messages (user and assistant)
- Links to conversations
- Includes message content, author, sources, and timestamps

## Security

All tables have Row Level Security (RLS) enabled with policies that ensure:
- Users can only access their own data
- Users can only create data for themselves
- Users can only update/delete their own data

## Troubleshooting

### Migration Fails
- Check that you have the correct permissions in Supabase
- Ensure the UUID extension is available
- Check the SQL Editor for specific error messages

### RLS Policies Not Working
- Verify RLS is enabled on all tables
- Check that policies are correctly created
- Ensure users are authenticated when making requests

### User Not Created in users Table
- Check the trigger `on_auth_user_created` exists
- Verify the function `handle_new_user()` is created
- Check Supabase logs for errors
- Ensure the `users` table exists and has the correct structure

