'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'

interface Message {
  id: string
  author: string
  avatar?: string
  timestamp: string
  content: string
  sources?: Array<{ title: string; description: string; url?: string }>
}

interface SessionContextType {
  sessionId: string | null
  setSessionId: (id: string | null) => void
  pdfName: string | null
  setPdfName: (name: string | null) => void
  conversationId: string | null
  setConversationId: (id: string | null) => void
  messages: Message[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  pdfLoading: boolean
  setPdfLoading: (loading: boolean) => void
  clearSession: () => void
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [pdfName, setPdfName] = useState<string | null>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [pdfLoading, setPdfLoading] = useState<boolean>(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (conversationId) {
      localStorage.setItem('last_conversation_id', conversationId)
    } else {
      localStorage.removeItem('last_conversation_id')
    }
  }, [conversationId])

  const clearSession = () => {
    setSessionId(null)
    setPdfName(null)
    setConversationId(null)
    setMessages([])
    setPdfLoading(false)
  }

  return (
    <SessionContext.Provider value={{ 
      sessionId, 
      setSessionId, 
      pdfName, 
      setPdfName, 
      conversationId,
      setConversationId,
      messages,
      setMessages,
      pdfLoading,
      setPdfLoading,
      clearSession 
    }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}

