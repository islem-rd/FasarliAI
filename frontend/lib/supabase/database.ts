import { createClient } from './client'

export interface User {
  id: string
  email: string
  username: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface PDF {
  id: string
  conversation_id: string
  user_id: string
  filename: string
  file_size: number | null
  chunks_count: number | null
  vector_store_session_id: string | null
  created_at: string
}

export interface ChatMessage {
  id: string
  conversation_id: string
  user_id: string
  author: string
  content: string
  sources: any | null
  created_at: string
}

export async function createUser(userId: string, email: string, username?: string) {
  const supabase = createClient()
  
  // First, ensure the user record exists with all required columns
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, email, username, avatar_url')
    .eq('id', userId)
    .single()
  
  if (existingUser) {
    // User exists, just return it
    return { data: existingUser, error: null }
  }
  
  // Create new user with all columns
  const { data, error } = await supabase
    .from('users')
    .insert({ 
      id: userId, 
      email, 
      username: username || null,
      avatar_url: null
    })
    .select()
    .single()

  if (error && error.code !== '23505') { // Ignore duplicate key error
    throw error
  }

  return { data, error }
}

export async function updateUser(userId: string, updates: { username?: string; avatar_url?: string }) {
  const supabase = createClient()
  
  // Only update fields that are provided
  const updateData: any = {}
  if (updates.username !== undefined) {
    updateData.username = updates.username
  }
  if (updates.avatar_url !== undefined) {
    updateData.avatar_url = updates.avatar_url
  }
  
  const { data, error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)
    .select('id, email, username, avatar_url, created_at, updated_at')
    .single()

  if (error) {
    console.error('Error updating user:', error)
    // If column doesn't exist, return a helpful error
    if (error.message?.includes('column') && (error.message?.includes('does not exist') || error.message?.includes('not found'))) {
      return { 
        data: null, 
        error: { 
          message: 'Database column missing. Please run migration 004_ensure_user_columns.sql in Supabase.',
          code: 'COLUMN_NOT_FOUND'
        } 
      }
    }
  }

  return { data, error }
}

// Alias for backward compatibility
export const createUserProfile = createUser

export async function getUser(userId: string) {
  const supabase = createClient()
  
  // Explicitly select columns to avoid schema cache issues
  const { data, error } = await supabase
    .from('users')
    .select('id, email, username, avatar_url, created_at, updated_at')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching user:', error)
    // If column doesn't exist, try with minimal columns
    if (error.message?.includes('column') && (error.message?.includes('does not exist') || error.message?.includes('not found'))) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('users')
        .select('id, email, created_at, updated_at')
        .eq('id', userId)
        .single()
      
      if (fallbackData) {
        // Return with null for missing columns
        return { 
          data: { 
            ...fallbackData, 
            username: null, 
            avatar_url: null 
          }, 
          error: null 
        }
      }
      return { data: null, error: fallbackError }
    }
  }

  return { data, error }
}

export async function createConversation(userId: string, title: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: userId, title })
    .select()
    .single()

  return { data, error }
}

export async function createPDF(
  conversationId: string,
  userId: string,
  filename: string,
  fileSize: number | null,
  chunksCount: number | null,
  vectorStoreSessionId: string | null
) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('pdfs')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      filename,
      file_size: fileSize,
      chunks_count: chunksCount,
      vector_store_session_id: vectorStoreSessionId,
    })
    .select()
    .single()

  return { data, error }
}

export async function createChatMessage(
  conversationId: string,
  userId: string,
  author: string,
  content: string,
  sources: any = null
) {
  const supabase = createClient()
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

export async function getConversations(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  return { data, error }
}

export async function getConversation(conversationId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', conversationId)
    .single()

  return { data, error }
}

export async function getPDFByConversation(conversationId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('pdfs')
    .select('*')
    .eq('conversation_id', conversationId)
    .maybeSingle()

  return { data, error }
}

export async function getChatMessages(conversationId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  return { data, error }
}

export async function updateConversation(conversationId: string, title: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('conversations')
    .update({ title })
    .eq('id', conversationId)
    .select()
    .single()

  return { data, error }
}

export async function deleteConversation(conversationId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)

  return { error }
}

