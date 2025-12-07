import { createClient } from './client'

export interface User {
  id: string
  email: string
  username: string | null
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
  const { data, error } = await supabase
    .from('users')
    .insert({ id: userId, email, username: username || null })
    .select()
    .single()

  if (error && error.code !== '23505') { // Ignore duplicate key error
    throw error
  }

  return { data, error }
}

export async function updateUser(userId: string, updates: { username?: string }) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()

  return { data, error }
}

// Alias for backward compatibility
export const createUserProfile = createUser

export async function getUser(userId: string) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

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

