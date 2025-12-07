'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useSession } from '@/contexts/session-context'
import { Sidebar } from '@/components/sidebar'
import { ChatArea } from '@/components/chat-area'
import { QuizPanel } from '@/components/quiz-panel'
import { ChatHistory } from '@/components/chat-history'
import { FlashcardPanel } from '@/components/flashcard-panel'

type ViewMode = 'chat' | 'quiz' | 'flashcards'

export default function Home() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { setConversationId, setPdfLoading } = useSession()
  const [viewMode, setViewMode] = useState<ViewMode>('chat')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [loadFromDashboard, setLoadFromDashboard] = useState<string | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signin')
    }
  }, [user, loading, router])

  // Check if we need to load a conversation from dashboard
  useEffect(() => {
    const conversationToLoad = sessionStorage.getItem('load_conversation')
    if (conversationToLoad) {
      setLoadFromDashboard(conversationToLoad)
      sessionStorage.removeItem('load_conversation')
      return
    }

    const savedConversation = localStorage.getItem('last_conversation_id')
    if (savedConversation) {
      setLoadFromDashboard(savedConversation)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-teal-50 via-cyan-50 to-teal-100 dark:from-teal-950 dark:via-cyan-950 dark:to-teal-900">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-teal-100 dark:from-teal-950 dark:via-cyan-950 dark:to-teal-900">
      {sidebarOpen && (
        <Sidebar 
          viewMode={viewMode} 
          onViewChange={setViewMode}
          isOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Dynamic Content based on View Mode */}
        <div className="flex flex-1 overflow-hidden">
          {/* Side Panel (Quiz, Flashcards, or Chat History) */}
          {viewMode === 'quiz' && sidebarOpen && <QuizPanel />}
          {viewMode === 'flashcards' && sidebarOpen && <FlashcardPanel />}
          {viewMode === 'chat' && sidebarOpen && <ChatHistory />}

          {/* Main Chat Area - Pass sidebar toggle handler */}
          <ChatArea 
            viewMode={viewMode}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            loadConversationId={loadFromDashboard}
          />
        </div>
      </div>
    </div>
  )
}
