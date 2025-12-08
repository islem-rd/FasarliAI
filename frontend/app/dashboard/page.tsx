'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageSquare, FileText, BarChart3, Clock, Trash2, Calendar, TrendingUp, Activity, Download, Sun, Moon, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useTheme } from 'next-themes'

interface Conversation {
  id: string
  name: string
  created_at: string
  message_count?: number
  storage_path?: string
}

interface PDFDocument {
  session_id: string
  pdf_name: string
  created_at: string
  message_count?: number
  storage_path?: string
  attachment_count?: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [documents, setDocuments] = useState<PDFDocument[]>([])
  const [stats, setStats] = useState({
    totalConversations: 0,
    totalDocuments: 0,
    totalMessages: 0,
    thisWeekMessages: 0
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [weeklyData, setWeeklyData] = useState<{day: string, messages: number}[]>([])
  const [documentEngagement, setDocumentEngagement] = useState<{name: string, messages: number}[]>([])
  const maxDocumentEngagement = documentEngagement.reduce((max, doc) => Math.max(max, doc.messages), 0) || 1

  useEffect(() => {
    if (!loading && !user) {
      router.push('/signin')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchDashboardData()
    }
  }, [user])

  useEffect(() => {
    // Initialize theme
    const isDark = document.documentElement.classList.contains('dark')
    setIsDarkMode(isDark)
  }, [])

  const toggleTheme = () => {
    const newTheme = !isDarkMode
    setIsDarkMode(newTheme)
    if (newTheme) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch conversations
      const convResponse = await fetch('/api/conversations/list')
      
      if (convResponse.ok) {
        const convData = await convResponse.json()
        setConversations(convData.conversations || [])
        
        // Calculate stats
        const totalConv = convData.conversations?.length || 0
        const uniqueDocs = new Set(convData.conversations?.map((c: Conversation) => c.name)).size
        
        setStats({
          totalConversations: totalConv,
          totalDocuments: uniqueDocs,
          totalMessages: convData.conversations?.reduce((sum: number, c: Conversation) => sum + (c.message_count || 0), 0) || 0,
          thisWeekMessages: calculateWeekMessages(convData.conversations || [])
        })
        
        // Calculate weekly activity data
        const weekData = calculateWeeklyActivity(convData.conversations || [])
        setWeeklyData(weekData)
        
        // Calculate document engagement (top used documents)
        const docEngagement = calculateDocumentEngagement(convData.conversations || [])
        setDocumentEngagement(docEngagement)
        
        // Extract unique documents (group by PDF name, keep most recent conversation)
        const docsMap = new Map<string, PDFDocument>()
        convData.conversations?.forEach((conv: Conversation) => {
          const docName = conv.name || 'Untitled PDF'
          const existing = docsMap.get(docName)
          const attachmentCount = (existing?.attachment_count || 0) + 1
          
          if (!existing || new Date(conv.created_at) > new Date(existing.created_at)) {
            docsMap.set(docName, {
              session_id: conv.id,
              pdf_name: docName,
              created_at: conv.created_at,
              message_count: conv.message_count || 0,
              storage_path: conv.storage_path,
              attachment_count: attachmentCount
            })
          } else {
            docsMap.set(docName, {
              ...existing,
              attachment_count: attachmentCount
            })
          }
        })
        setDocuments(Array.from(docsMap.values()))
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setIsLoading(false)
    }
  }

  const calculateWeekMessages = (conversations: Conversation[]) => {
    const oneWeekAgo = new Date()
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
    
    return conversations.filter(c => new Date(c.created_at) >= oneWeekAgo)
      .reduce((sum, c) => sum + (c.message_count || 0), 0)
  }

  const calculateWeeklyActivity = (conversations: Conversation[]) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const today = new Date()
    const weekData = []
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dayName = days[date.getDay()]
      const messages = conversations.filter(c => {
        const convDate = new Date(c.created_at)
        return convDate.toDateString() === date.toDateString()
      }).reduce((sum, c) => sum + (c.message_count || 0), 0)
      
      weekData.push({ day: dayName, messages })
    }
    
    return weekData
  }

  const calculateDocumentEngagement = (conversations: Conversation[]) => {
    const usage: Record<string, number> = {}

    conversations.forEach(conv => {
      const name = conv.name || 'Untitled'
      usage[name] = (usage[name] || 0) + (conv.message_count || 0)
    })

    return Object.entries(usage)
      .map(([name, messages]) => ({ name, messages }))
      .sort((a, b) => b.messages - a.messages)
      .slice(0, 5)
  }

  const deleteConversation = async (conversationId: string) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return
    
    try {
      const response = await fetch(`/api/conversations/delete?conversationId=${conversationId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Conversation deleted successfully')
        fetchDashboardData()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete conversation')
      }
    } catch (error) {
      console.error('Error deleting conversation:', error)
      toast.error('Error deleting conversation')
    }
  }

  const downloadPDF = async (conversationId: string, pdfName: string) => {
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

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Video - Bottom layer */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover"
        style={{ zIndex: 0, pointerEvents: 'none' }}
      >
        <source src="/videos/ai-background.mp4" type="video/mp4" />
      </video>

      {/* Overlay - Above video */}
      <div 
        className="fixed inset-0 bg-teal-950/80 dark:bg-teal-950/90" 
        style={{ zIndex: 1, pointerEvents: 'none' }} 
      />

      {/* Content - Top layer */}
      <div className="relative min-h-screen" style={{ zIndex: 2 }}>
        {/* Header */}
        <div className="border-b border-white/20 bg-white/5 backdrop-blur-xl shadow-lg">
          <div className="max-w-7xl mx-auto px-8 py-6">
            <div className="flex items-center justify-between">
              {/* Left: FasarliAI Title */}
              <div className="flex items-center gap-4">
                <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 via-cyan-500 to-teal-600 animate-pulse">
                  FasarliAI
                </h1>
                <div className="h-10 w-px bg-white/30"></div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Dashboard</h2>
                  <p className="text-sm text-teal-200">Analytics & Management</p>
                </div>
              </div>
              
              {/* Right: Theme Toggle & Back Button */}
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={toggleTheme}
                  className="text-white hover:bg-white/20"
                  title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
                >
                  {isDarkMode ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                </Button>
                <Button 
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push('/')}
                  className="text-white hover:bg-white/20 w-10 h-10"
                  title="Back to Chat"
                >
                  <ArrowLeft className="w-6 h-6" />
                </Button>
              </div>
            </div>
          </div>
        </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="bg-white/90 dark:bg-teal-900/90 backdrop-blur-md border-white/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Conversations</CardTitle>
              <MessageSquare className="w-4 h-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-teal-600">{stats.totalConversations}</div>
              <p className="text-xs text-muted-foreground mt-1">All time</p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 dark:bg-teal-900/90 backdrop-blur-md border-white/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Days</CardTitle>
              <FileText className="w-4 h-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.totalDocuments}</div>
              <p className="text-xs text-muted-foreground mt-1">PDFs uploaded</p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 dark:bg-teal-900/90 backdrop-blur-md border-white/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Messages</CardTitle>
              <Activity className="w-4 h-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.totalMessages}</div>
              <p className="text-xs text-muted-foreground mt-1">All conversations</p>
            </CardContent>
          </Card>

          <Card className="bg-white/90 dark:bg-teal-900/90 backdrop-blur-md border-white/20">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
              <TrendingUp className="w-4 h-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.thisWeekMessages}</div>
              <p className="text-xs text-muted-foreground mt-1">Messages sent</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Activity Chart */}
          <Card className="bg-white/90 dark:bg-teal-900/90 backdrop-blur-md border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-6 h-6 text-teal-600" />
                Weekly Activity
              </CardTitle>
              <CardDescription>Messages sent over the last 7 days</CardDescription>
            </CardHeader>
            <CardContent>
              {weeklyData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No activity data available</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#8884d8" opacity={0.1} />
                    <XAxis 
                      dataKey="day" 
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                      }}
                      labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                      cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
                    />
                    <Bar 
                      dataKey="messages" 
                      fill="url(#colorGradient)"
                      radius={[8, 8, 0, 0]}
                      animationDuration={1000}
                    />
                    <defs>
                      <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                        <stop offset="100%" stopColor="#059669" stopOpacity={0.8} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* PDF Focus Board */}
          <Card className="bg-white/90 dark:bg-teal-900/90 backdrop-blur-md border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-6 h-6 text-emerald-600" />
                PDF Focus Board
              </CardTitle>
              <CardDescription>Spotlight on your most discussed PDFs</CardDescription>
            </CardHeader>
            <CardContent>
              {documentEngagement.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No PDF sessions tracked yet</p>
              ) : (
                <div className="space-y-4">
                  {documentEngagement.map((doc, index) => {
                    const progress = Math.max(
                      8,
                      Math.min(100, Math.round((doc.messages / maxDocumentEngagement) * 100))
                    )
                    return (
                      <div
                        key={`${doc.name}-${index}`}
                        className="p-4 rounded-2xl border border-white/10 bg-gradient-to-r from-emerald-500/10 via-green-500/5 to-transparent backdrop-blur-sm"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white flex items-center justify-center font-semibold shadow-lg shadow-emerald-500/30">
                              {index + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{doc.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {doc.messages} insights logged
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] uppercase tracking-widest rounded-full px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300">
                            Active PDF
                          </span>
                        </div>
                        <div className="mt-4 h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-green-500 to-teal-500 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conversations List */}
          <Card className="bg-white/90 dark:bg-teal-900/90 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-teal-600" />
                Recent Conversations
              </CardTitle>
              <CardDescription>Your chat history and interactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-teal-500 scrollbar-track-transparent hover:scrollbar-thumb-teal-600 scrollbar-thumb-rounded-full">
                {conversations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No conversations found
                  </div>
                ) : (
                  conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{conv.name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(conv.created_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {conv.message_count || 0} messages
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteConversation(conv.id)}
                        className="text-red-600 hover:text-red-700 ml-4"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Documents Library */}
          <Card className="bg-white/90 dark:bg-teal-900/90 backdrop-blur-md border-white/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-700" />
                Document Library
              </CardTitle>
              <CardDescription>Manage your uploaded PDFs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No documents found
                  </div>
                ) : (
                  documents.map((doc) => {
                    const attachmentCount = doc.attachment_count ?? 1
                    return (
                      <div
                        key={doc.session_id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0 bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700 text-white font-semibold shadow-lg shadow-emerald-500/30">
                            <span className="text-lg">{attachmentCount}</span>
                            <span className="text-[9px] uppercase tracking-tight opacity-80">files</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{doc.pdf_name}</h3>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(doc.created_at).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageSquare className="w-3 h-3" />
                                {doc.message_count || 0} chats
                              </span>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => downloadPDF(doc.session_id, doc.pdf_name)}
                          className="text-green-600 hover:text-green-700"
                          title="Download PDF"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activity Timeline */}
        <Card className="bg-white/90 dark:bg-teal-900/90 backdrop-blur-md border-white/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-teal-600" />
              Activity Overview
            </CardTitle>
            <CardDescription>Your usage patterns and statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/20 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-medium">Most Active Time</p>
                    <p className="text-sm text-muted-foreground">Based on your chat history</p>
                  </div>
                </div>
                <span className="text-sm font-medium">Afternoon</span>
              </div>
              
              <div className="flex items-center justify-between py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Average Messages per Session</p>
                    <p className="text-sm text-muted-foreground">Your typical conversation length</p>
                  </div>
                </div>
                <span className="text-sm font-medium">
                  {stats.totalConversations > 0 ? Math.round(stats.totalMessages / stats.totalConversations) : 0}
                </span>
              </div>
              
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Growth This Week</p>
                    <p className="text-sm text-muted-foreground">Compared to last week</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-green-600">
                  +{stats.thisWeekMessages} messages
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  )
}
