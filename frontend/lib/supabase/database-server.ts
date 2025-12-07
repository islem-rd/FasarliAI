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

