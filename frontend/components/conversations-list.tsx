'use client'

import { useEffect, useState } from 'react'
import { FileText, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'
import { useSession } from '@/contexts/session-context'
import { getConversations, getPDFByConversation, getChatMessages } from '@/lib/supabase/database'
import { Conversation } from '@/lib/supabase/database'
import { toast } from 'sonner'

interface ConversationsListProps {
  onSelectConversation?: (conversationId: string) => void
}

export function ConversationsList({ onSelectConversation }: ConversationsListProps) {
  const { user } = useAuth()
  const { conversationId, setConversationId, setSessionId, setPdfName, setMessages, setPdfLoading } = useSession()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id) {
      loadConversations()
    }
  }, [user])

  useEffect(() => {
    // Listen for new conversation events
    const handleConversationCreated = () => {
      loadConversations()
    }
    window.addEventListener('conversation-created', handleConversationCreated)
    return () => window.removeEventListener('conversation-created', handleConversationCreated)
  }, [])

  const loadConversations = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      const { data, error } = await getConversations(user.id)
      if (error) {
        console.error('Error loading conversations:', error)
      }
      setConversations(data || [])
    } catch (error) {
      console.error('Error loading conversations:', error)
      
    } finally {
      setLoading(false)
    }
  }

  const handleSelectConversation = async (conv: Conversation) => {
    try {
      console.log('[ConversationsList] Loading conversation:', conv.id)
      setConversationId(conv.id)
      
      // STEP 1: Load messages FIRST (including system messages)
      const { data: messages, error: messagesError } = await getChatMessages(conv.id)
      
      if (messagesError) {
        console.error('[ConversationsList] Error loading messages:', messagesError)
        toast.error('Failed to load messages')
      }
      
      if (messages && messages.length > 0) {
        console.log('[ConversationsList] Loaded', messages.length, 'messages')
        const formattedMessages = messages.map(msg => ({
          id: msg.id,
          author: msg.author === 'user' ? 'You' : msg.author === 'assistant' ? 'FasarliAI' : msg.author === 'system' ? 'System' : msg.author,
          avatar: msg.author === 'user' ? 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/avatar-user.jpg' : msg.author === 'assistant' ? '⚡' : '',
          timestamp: new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          content: msg.content,
          sources: msg.sources,
        }))
        setMessages(formattedMessages)
      } else {
        // No messages yet, clear messages
        console.log('[ConversationsList] No messages found')
        setMessages([])
      }
      
      // STEP 2: THEN load PDF and reload from storage
      // Get PDF for this conversation (if exists)
      const { data: pdf, error: pdfError } = await getPDFByConversation(conv.id)
      
      if (pdfError) {
        console.error('[ConversationsList] Error loading PDF:', pdfError)
      }
      
      if (pdf) {
        console.log('[ConversationsList] Found PDF:', pdf.filename)
        setPdfName(pdf.filename)
        
        // Always reload PDF from storage to ensure vector store is available for quiz/flashcards
        if (pdf.storage_path) {
          console.log('[ConversationsList] Reloading PDF from storage:', pdf.storage_path)
          // Set loading state to disable chat input
          setPdfLoading(true)
          
          try {
            const reloadResponse = await fetch('/api/conversations/reload-pdf', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ conversationId: conv.id }),
            })
            
            if (reloadResponse.ok) {
              const { session_id } = await reloadResponse.json()
              console.log('[ConversationsList] PDF reloaded, session_id:', session_id)
              setSessionId(session_id)
              toast.success('Conversation loaded successfully')
            } else {
              const errorData = await reloadResponse.json()
              console.error('[ConversationsList] Failed to reload PDF:', errorData)
              toast.error('Failed to reload PDF')
              // Fall back to existing session_id if reload fails
              setSessionId(pdf.vector_store_session_id || null)
            }
          } catch (error) {
            console.error('[ConversationsList] Error reloading PDF:', error)
            toast.error('Error reloading PDF')
            // Fall back to existing session_id if reload fails
            setSessionId(pdf.vector_store_session_id || null)
          } finally {
            // Always clear loading state
            setPdfLoading(false)
          }
        } else {
          // No storage path, use existing session_id if available
          console.log('[ConversationsList] No storage path, using existing session_id')
          setSessionId(pdf.vector_store_session_id || null)
          setPdfLoading(false)
          toast.success('Conversation loaded')
        }
      } else {
        // No PDF for this conversation yet
        console.log('[ConversationsList] No PDF found for this conversation')
        setSessionId(null)
        setPdfName(null)
        setPdfLoading(false)
        toast.info('Conversation loaded (no PDF attached)')
      }
      
      if (onSelectConversation) {
        onSelectConversation(conv.id)
      }
    } catch (error) {
      console.error('Error loading conversation:', error)
      setPdfLoading(false)
    }
  }

  const handleCreateNewConversation = async () => {
    if (!user?.id) return

    const title = `New Conversation ${new Date().toLocaleDateString()}`
    
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create conversation')
      }

      const { conversation } = await response.json()
      
      // Clear current session and select new conversation
      setConversationId(conversation.id)
      setSessionId(null)
      setPdfName(null)
      setMessages([])
      
      toast.success('New conversation created')
      loadConversations()
      
      // Trigger event to notify other components
      window.dispatchEvent(new Event('conversation-created'))
    } catch (error) {
      console.error('Error creating conversation:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create conversation')
    }
  }

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this conversation? This will also delete the PDF from storage.')) {
      return
    }

    try {
      const response = await fetch(`/api/conversations/delete?conversationId=${convId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete conversation')
      }

      toast.success('Conversation and PDF deleted')
      loadConversations()
      
      // Clear session if deleted conversation was active
      if (conversationId === convId) {
        setConversationId(null)
        setSessionId(null)
        setPdfName(null)
        setMessages([])
      }
    } catch (error) {
      console.error('Error deleting conversation:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete conversation')
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        Loading conversations...
      </div>
    )
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Conversations</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleCreateNewConversation}
              title="New Conversation"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-muted-foreground text-sm">
            <p className="mb-2">No conversations yet.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateNewConversation}
              className="mt-2"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Conversation
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleCreateNewConversation}
            title="New Conversation"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto scrollbar-conversations pr-1">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            onClick={() => handleSelectConversation(conv)}
            className={`p-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${
              conversationId === conv.id ? 'bg-muted' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <FileText className="w-4 h-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{conv.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(conv.updated_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={(e: any) => handleDeleteConversation(conv.id, e)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

