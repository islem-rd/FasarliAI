import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'

// Server-side database functions for API routes
export async function createConversationServer(request: NextRequest, userId: string, title: string) {
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
  
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId, title })
    .select()
    .single()

  return { data, error }
}

export async function createPDFServer(
  request: NextRequest,
  conversationId: string,
  userId: string,
  filename: string,
  fileSize: number | null,
  chunksCount: number | null,
  vectorStoreSessionId: string | null,
  storagePath: string | null = null
) {
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
  
  const { data, error } = await supabase
    .from('pdfs')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      filename,
      file_size: fileSize,
      chunks_count: chunksCount,
      vector_store_session_id: vectorStoreSessionId,
      storage_path: storagePath,
    })
    .select()
    .single()

  return { data, error }
}

export async function updatePDFServer(
  request: NextRequest,
  pdfId: string,
  updates: {
    vector_store_session_id?: string | null
    storage_path?: string | null
  }
) {
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
  
  const { data, error } = await supabase
    .from('pdfs')
    .update(updates)
    .eq('id', pdfId)
    .select()
    .single()

  return { data, error }
}

export async function createChatMessageServer(
  request: NextRequest,
  conversationId: string,
  userId: string,
  author: string,
  content: string,
  sources: any = null
) {
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
  
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      author,
      content,
      sources,
    })
    .select()
    .single()

  return { data, error }
}

export async function getConversationServer(request: NextRequest, conversationId: string) {
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
  
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single()

  return { data, error }
}

export async function updateConversationServer(
  request: NextRequest,
  conversationId: string,
  title: string
) {
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
  
  const { data, error } = await supabase
    .from('conversations')
    .update({ title })
    .eq('id', conversationId)
    .select()
    .single()

  return { data, error }
}

export async function getPDFByConversationServer(request: NextRequest, conversationId: string) {
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
  
  const { data, error } = await supabase
    .from('pdfs')
    .select('*')
    .eq('conversation_id', conversationId)
    .single()

  return { data, error }
}

export async function updateUserServer(
  request: NextRequest,
  userId: string,
  updates: { username?: string; avatar_url?: string }
) {
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
  
  // Only update fields that are provided
  const updateData: any = {}
  if (updates.username !== undefined) {
    updateData.username = updates.username
  }
  if (updates.avatar_url !== undefined) {
    updateData.avatar_url = updates.avatar_url
  }
  
  // First, try to select only existing columns to avoid errors
  // If avatar_url doesn't exist, we'll get an error and handle it
  let selectColumns = 'id, email, created_at, updated_at'
  
  // Try to include username and avatar_url if they might exist
  // We'll catch the error if they don't
  try {
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('username, avatar_url')
      .eq('id', userId)
      .limit(1)
      .single()
    
    // If no error, the columns exist
    if (!testError) {
      selectColumns = 'id, email, username, avatar_url, created_at, updated_at'
    }
  } catch (e) {
    // Columns might not exist, use minimal select
    console.log('Some columns may not exist, using minimal select')
  }
  
  // Perform the update
  const { data, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select(selectColumns)
    .single()

  if (error) {
    console.error('Update error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    })
    
    // If error is about column not existing, try without that column
    if (error.message?.includes('column') && (error.message?.includes('does not exist') || error.message?.includes('not found'))) {
      // Try with minimal columns
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select('id, email, created_at, updated_at')
        .single()
      
      if (fallbackError) {
        return { data: null, error: fallbackError }
      }
      
      // Return with null for missing columns
      return { 
        data: { 
          ...fallbackData, 
          username: updates.username !== undefined ? updates.username : null,
          avatar_url: updates.avatar_url !== undefined ? updates.avatar_url : null
        }, 
        error: null 
      }
    }
  }

  return { data, error }
}

export async function getUserServer(request: NextRequest, userId: string) {
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
  
  // Explicitly select columns to avoid schema cache issues
  const { data, error } = await supabase
    .from('users')
    .select('id, email, username, avatar_url, created_at, updated_at')
    .eq('id', userId)
    .single()

  return { data, error }
}

