'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Paperclip, Sun, Moon, Settings, Menu, Upload, FileText, LogOut, User, BarChart3, Download, StopCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageBubble } from './message-bubble'
import { useSession } from '@/contexts/session-context'
import { useAuth } from '@/contexts/auth-context'
import { getUser } from '@/lib/supabase/database'
import { toast } from 'sonner'

interface ChatAreaProps {
  viewMode: 'chat' | 'quiz' | 'flashcards'
  sidebarOpen?: boolean
  onToggleSidebar?: () => void
  loadConversationId?: string | null
}

interface Message {
  id: string
  author: string
  avatar?: string
  timestamp: string
  content: string
}

export function ChatArea({ viewMode, sidebarOpen, onToggleSidebar, loadConversationId }: ChatAreaProps) {
  const router = useRouter()
  const { sessionId, setSessionId, pdfName, setPdfName, conversationId, setConversationId, messages, setMessages, pdfLoading, setPdfLoading } = useSession()
  const { user, signOut } = useAuth()
  const [inputValue, setInputValue] = useState('')
  const [showSettingsMenu, setShowSettingsMenu] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string>('')
  const [username, setUsername] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize theme from system/localStorage
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setIsDarkMode(isDark)
    
    // Force video to play
    if (videoRef.current) {
      videoRef.current.play().catch(err => console.log('Video autoplay failed:', err))
    }
  }, [])

  const toggleTheme = () => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    if (newMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement
      // Don't close if clicking on the sign out button
      const button = target.closest('button')
      if (button && button.textContent?.includes('Sign Out')) {
        return
      }
      
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false)
      }
    }

    if (showSettingsMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showSettingsMenu])

  useEffect(() => {
    async function fetchUserData() {
      if (user?.id) {
        try {
          const { data } = await getUser(user.id)
          if (data) {
            setUsername(data.username)
            console.log('Username loaded:', data.username)
          } else {
            console.log('No user data found')
          }
        } catch (error) {
          console.error('Error fetching user data:', error)
        }
      }
    }
    fetchUserData()
  }, [user])

  // Load conversation from dashboard
  useEffect(() => {
    if (loadConversationId && user) {
      let isSubscribed = true
      
      const loadConversation = async () => {
        try {
          setPdfLoading(true)
          
          // Load conversation details
          const response = await fetch(`/api/conversations/${loadConversationId}`)

          if (!isSubscribed) return
          
          if (response.ok) {
            const data = await response.json()
            setConversationId(loadConversationId)
            setPdfName(data.name || 'Document')
            
            // Load messages
            if (data.messages && Array.isArray(data.messages)) {
              setMessages(data.messages.map((msg: any, idx: number) => ({
                id: `${idx}`,
                author: msg.role === 'user' ? 'You' : 'FasarliAI',
                timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                content: msg.content,
              })))
            }
            
            // Reload PDF in backend to recreate vector store
            if (data.storage_path) {
              const reloadResponse = await fetch('/api/conversations/reload-pdf', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ conversationId: loadConversationId }),
              })

              if (!isSubscribed) return
              
              if (reloadResponse.ok) {
                const reloadData = await reloadResponse.json()
                setSessionId(reloadData.session_id)
                toast.success('Conversation and PDF loaded')
              } else {
                toast.error('PDF loaded but chat may not work')
              }
            } else {
              toast.success('Conversation loaded (no PDF)')
            }
          } else {
            if (isSubscribed) {
              toast.error('Failed to load conversation')
            }
          }
        } catch (error) {
          console.error('Error loading conversation:', error)
          if (isSubscribed) {
            toast.error('Failed to load conversation')
          }
        } finally {
          if (isSubscribed) {
            setPdfLoading(false)
          }
        }
      }
      
      loadConversation()
      
      return () => {
        isSubscribed = false
      }
    }
  }, [loadConversationId, user])

  const handleUploadPDF = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    // Validate all files are PDFs
    const invalidFiles = Array.from(files).filter(f => !f.name.endsWith('.pdf'))
    if (invalidFiles.length > 0) {
      setUploadStatus('Error: All files must be PDFs')
      return
    }

    setIsLoading(true)
    const fileCount = files.length
    setUploadStatus(`Uploading ${fileCount} PDF${fileCount > 1 ? 's' : ''}...`)

    try {
      let currentSessionId = sessionId
      let totalChunks = 0
      const fileNames: string[] = []
      let lastUploadData: any = null
      let finalConversationId: string | null = null

      // Upload files one by one, merging into same session
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        fileNames.push(file.name)
        setUploadStatus(`Uploading ${file.name} (${i + 1}/${fileCount})...`)

        const formData = new FormData()
        formData.append('file', file)
        
        // Include conversationId if one exists
        if (conversationId) {
          formData.append('conversationId', conversationId)
        }

        // Include existing session_id for merging (except first file)
        if (currentSessionId) {
          formData.append('session_id', currentSessionId)
        }

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to upload PDF')
        }

        const data = await response.json()
        lastUploadData = data
        
        // Store session ID from first upload
        if (!currentSessionId) {
          currentSessionId = data.session_id
          setSessionId(data.session_id)
        }
        
        if (data.conversation_id) {
          finalConversationId = data.conversation_id
          if (!conversationId) {
            setConversationId(data.conversation_id)
          }
        }
        
        totalChunks += data.chunks_count
      }

      setPdfName(fileNames.length > 1 ? `${fileNames.length} PDFs` : fileNames[0])
      setUploadStatus(`${fileCount} PDF${fileCount > 1 ? 's' : ''} uploaded successfully!`)
      
      // Clear upload status after 5 seconds
      setTimeout(() => {
        setUploadStatus('')
      }, 5000)
      
      // Reload messages from database to get the system message
      if (finalConversationId) {
        try {
          const { getChatMessages } = await import('@/lib/supabase/database')
          const { data: dbMessages } = await getChatMessages(finalConversationId)
          if (dbMessages && dbMessages.length > 0) {
            const formattedMessages = dbMessages.map(msg => ({
              id: msg.id,
              author: msg.author === 'user' ? 'You' : msg.author === 'assistant' ? 'FasarliAI' : msg.author === 'system' ? 'System' : msg.author,
              avatar: msg.author === 'user' ? 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/avatar-user.jpg' : msg.author === 'assistant' ? '⚡' : '',
              timestamp: new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
              content: msg.content,
              sources: msg.sources,
            }))
            setMessages(formattedMessages)
          }
        } catch (error) {
          console.error('Error loading messages:', error)
        }
        
        // Generate conversation name based on PDF content
        if (lastUploadData?.session_id && finalConversationId) {
          setTimeout(async () => {
            try {
              const nameResponse = await fetch('/api/conversations/generate-name-from-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  sessionId: lastUploadData.session_id,
                  conversationId: finalConversationId 
                }),
              })

              if (nameResponse.ok) {
                const { name } = await nameResponse.json()
                
                // Update conversation title
                await fetch('/api/conversations/rename', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    conversationId: finalConversationId,
                    title: name,
                  }),
                })

                // Refresh conversations list
                window.dispatchEvent(new Event('conversation-created'))
              }
            } catch (error) {
              console.error('Error generating conversation name:', error)
            }
          }, 2000) // Wait 2 seconds for PDF processing to complete
        }
      }
      
      // Trigger a page refresh to reload conversations list
      window.dispatchEvent(new Event('conversation-created'))
    } catch (error) {
      setUploadStatus(`Error: ${error instanceof Error ? error.message : 'Failed to upload PDF'}`)
    } finally {
      setIsLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const downloadCurrentPDF = async () => {
    if (!conversationId || !pdfName) {
      toast.error('No PDF loaded')
      return
    }

    try {
      const response = await fetch(`/api/download-pdf?conversationId=${conversationId}`)
      
      if (!response.ok) {
        throw new Error('Failed to download PDF')
      }

      // Create blob from response
      const blob = await response.blob()
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${pdfName}.pdf`
      document.body.appendChild(a)
      a.click()
      
      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      toast.success('PDF downloaded successfully')
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast.error('Failed to download PDF')
    }
  }

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsGenerating(false)
      setIsLoading(false)
      
      // Keep the partial message but mark it as stopped
      // The message will remain visible with the content generated so far
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return
    
    // If no conversation exists, create one
    let currentConversationId = conversationId
    if (!currentConversationId && user?.id) {
      try {
        const title = `Chat ${new Date().toLocaleDateString()}`
        const response = await fetch('/api/conversations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title }),
        })

        if (response.ok) {
          const { conversation } = await response.json()
          currentConversationId = conversation.id
          setConversationId(conversation.id)
          window.dispatchEvent(new Event('conversation-created'))
        }
      } catch (error) {
        console.error('Error creating conversation:', error)
        toast.error('Failed to create conversation')
      }
    }

    // If no session ID, we can still create a conversation but can't chat without PDF
    if (!sessionId) {
      setUploadStatus('Please upload a PDF first to start chatting')
      return
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      author: 'You',
      avatar: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/avatar-user.jpg',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      content: inputValue,
    }

    setMessages((prev: Message[]) => [...prev, userMessage])
    const questionText = inputValue
    setInputValue('')
    setIsLoading(true)
    setIsGenerating(true)
    
    // Add loading message immediately
    const loadingMessageId = 'loading-' + Date.now()
    const loadingMessage: Message = {
      id: loadingMessageId,
      author: 'FasarliAI',
      avatar: '⚡',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      content: '⚡',  // Loading indicator
    }
    setMessages((prev: Message[]) => [...prev, loadingMessage])
    
    // Create new abort controller
    abortControllerRef.current = new AbortController()

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: questionText,
          sessionId: sessionId,
          conversationId: currentConversationId,
        }),
        signal: abortControllerRef.current?.signal,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to get response')
      }

      const data = await response.json()
      
      // Remove loading message and replace with actual response
      const botMessageId = data.id || Date.now().toString()
      const fullContent = data.content
      
      // Replace loading message with real message
      setMessages((prev: Message[]) => 
        prev.filter(msg => msg.id !== loadingMessageId).concat({
          id: botMessageId,
          author: data.author || 'FasarliAI',
          avatar: '⚡',
          timestamp: data.timestamp,
          content: '',  // Start with empty content for typing effect
        })
      )

      // Animate typing effect character by character
      let currentIndex = 0
      let isAborted = false

      const typeCharacter = () => {
        if (isAborted) {
          setIsLoading(false)
          setIsGenerating(false)
          return
        }
        
        if (currentIndex < fullContent.length) {
          const currentContent = fullContent.substring(0, currentIndex + 1)
          setMessages((prev: Message[]) => prev.map((msg: Message) => 
            msg.id === botMessageId 
              ? { ...msg, content: currentContent }
              : msg
          ))
          currentIndex++
          // 30ms delay per character for smooth typing effect
          setTimeout(typeCharacter, 30)
        } else {
          // Typing complete
          setIsLoading(false)
          setIsGenerating(false)
          abortControllerRef.current = null
        }
      }

      // Check if aborted during typing
      const originalAbort = abortControllerRef.current
      if (originalAbort) {
        const checkAbort = () => {
          if (!abortControllerRef.current || abortControllerRef.current !== originalAbort) {
            isAborted = true
          }
        }
        const abortCheckInterval = setInterval(checkAbort, 100)
        setTimeout(() => clearInterval(abortCheckInterval), 60000) // Clean up after 1 min max
      }

      // Start typing effect
      typeCharacter()
    } catch (error) {
      // Don't show error if user aborted
      if (error instanceof Error && error.name === 'AbortError') {
        setIsLoading(false)
        setIsGenerating(false)
        return
      }
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        author: 'System',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        content: `Error: ${error instanceof Error ? error.message : 'Failed to get response'}`,
      }
      setMessages((prev: Message[]) => [...prev, errorMessage])
      setIsLoading(false)
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col relative border-l border-border overflow-hidden">
      {/* Background Video - Behind everything */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ zIndex: 0 }}
      >
        <source src="/videos/ai-background.mp4" type="video/mp4" />
      </video>
      
      {/* Overlay - Behind content but above video */}
      <div className="absolute inset-0 bg-white/85 dark:bg-gray-950/85 pointer-events-none" style={{ zIndex: 1 }} />
      
      {/* All content above overlay */}
      <div className="relative flex flex-col h-full" style={{ zIndex: 2 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {!sidebarOpen && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onToggleSidebar}
              className="text-foreground"
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
          <span className="text-2xl font-bold text-teal-600 dark:text-teal-400 animate-pulse">
            FasarliAI
          </span>
        </div>
        <div className="flex items-center gap-3 relative">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-foreground"
            onClick={toggleTheme}
            title={isDarkMode ? 'Mode clair' : 'Mode sombre'}
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>
          <div className="w-8 h-8 rounded-full bg-emerald-700" />
          
          <div ref={settingsRef} className="relative">
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-foreground"
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            >
              <Settings className="w-5 h-5" />
            </Button>
            
            {showSettingsMenu && (
              <div className="fixed right-4 top-16 w-64 bg-card border border-border rounded-lg shadow-2xl" style={{ zIndex: 9999 }}>
                <div className="py-2">
                  <div className="px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-700 flex items-center justify-center text-white font-semibold">
                        {(username || user?.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-semibold text-foreground">{username || user?.email?.split('@')[0] || 'User'}</div>
                        <div className="text-xs text-muted-foreground truncate">{user?.email || ''}</div>
                      </div>
                    </div>
                  </div>
                  <button 
                    type="button"
                    className="w-full flex items-center justify-start px-4 py-2.5 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors cursor-pointer border-b border-border"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowSettingsMenu(false)
                      router.push('/dashboard')
                    }}
                  >
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Dashboard
                  </button>
                  <button 
                    type="button"
                    className="w-full flex items-center justify-start px-4 py-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors cursor-pointer"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      console.log('Sign out button clicked')
                      signOut()
                    }}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {messages.length === 0 && !sessionId ? (
          <div className="flex flex-col items-center justify-center h-full space-y-6">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-20 h-20 mx-auto bg-teal-600 rounded-full flex items-center justify-center">
                <FileText className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-semibold">Upload a PDF to Get Started</h3>
              <p className="text-muted-foreground">
                Upload your PDF document and start asking questions, generating quizzes, and creating flashcards!
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="gradient-button animate-button-pop"
                size="lg"
              >
                <Upload className="w-5 h-5 mr-2" />
                Upload PDF Document
              </Button>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <MessageBubble 
                key={msg.id}
                author={msg.author}
                avatar={msg.avatar || ''}
                timestamp={msg.timestamp}
                content={msg.content}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Upload Status */}
      {uploadStatus && (
        <div className={`px-6 py-2 text-sm ${
          uploadStatus.includes('Error') 
            ? 'text-red-500 bg-red-50 dark:bg-red-900/20' 
            : 'text-green-600 bg-green-50 dark:bg-green-900/20'
        }`}>
          {uploadStatus}
        </div>
      )}

      {/* Input Area */}
      <div className="px-6 py-4 border-t border-border bg-card space-y-2">
        <div className="flex gap-3">
          <Input
            placeholder={
              pdfLoading 
                ? "Loading PDF..." 
                : sessionId 
                  ? "Message FasarliAI..." 
                  : "Upload a PDF first to start chatting..."
            }
            value={inputValue}
            onChange={(e: any) => setInputValue(e.target.value)}
            onKeyDown={(e: any) => e.key === 'Enter' && !isLoading && !pdfLoading && handleSendMessage()}
            className="flex-1 bg-background border-border"
            disabled={!sessionId || isLoading || pdfLoading}
          />
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleUploadPDF}
            accept=".pdf"
            multiple
            className="hidden"
          />
          {sessionId && pdfName && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={downloadCurrentPDF}
              disabled={isLoading}
              title="Download PDF"
              className="text-green-600 hover:text-green-700"
            >
              <Download className="w-5 h-5" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            title="Upload PDF"
          >
            <Upload className="w-5 h-5" />
          </Button>
          {isGenerating ? (
            <Button 
              onClick={stopGeneration}
              className="bg-red-600 text-white hover:bg-red-700"
              size="icon"
              title="Stop generation"
            >
              <StopCircle className="w-5 h-5" />
            </Button>
          ) : (
            <Button 
              onClick={handleSendMessage}
              disabled={!sessionId || isLoading || pdfLoading || !inputValue.trim()}
              className="gradient-button animate-button-pop disabled:opacity-50 group relative overflow-hidden hover:scale-105 hover:shadow-2xl hover:shadow-teal-500/50 active:scale-95 transition-all duration-300"
              size="icon"
            >
              <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700"></span>
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          {pdfLoading
            ? "Loading PDF from storage..."
            : sessionId 
              ? "FasarliAI can make mistakes. Check the answers."
              : "Upload a PDF file to start asking questions about it."}
        </p>
      </div>
      </div>
    </div>
  )
}
