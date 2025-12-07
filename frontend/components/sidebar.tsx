'use client'

import { Menu, MessageSquare, ClipboardList, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/auth-context'

type ViewMode = 'chat' | 'quiz' | 'flashcards'

interface SidebarProps {
  viewMode: ViewMode
  onViewChange: (mode: ViewMode) => void
  isOpen: boolean
  onToggleSidebar: () => void
}

export function Sidebar({ viewMode, onViewChange, isOpen, onToggleSidebar }: SidebarProps) {
  const { signOut } = useAuth()

  return (
    <div className="w-16 bg-teal-800 flex flex-col items-center py-4 gap-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleSidebar}
        className="text-white hover:bg-white/20"
      >
        <Menu className="w-6 h-6" />
      </Button>

      <nav className="flex flex-col gap-4 flex-1">
        <Button
          variant={viewMode === 'chat' ? 'default' : 'ghost'}
          size="icon"
          onClick={() => onViewChange('chat')}
          className={viewMode === 'chat' ? 'bg-white text-teal-600 hover:bg-white' : 'text-white hover:bg-white/20'}
          title="Chat"
        >
          <MessageSquare className="w-6 h-6" />
        </Button>

        <Button
          variant={viewMode === 'quiz' ? 'default' : 'ghost'}
          size="icon"
          onClick={() => onViewChange('quiz')}
          className={viewMode === 'quiz' ? 'bg-white text-teal-600 hover:bg-white' : 'text-white hover:bg-white/20'}
          title="Quiz"
        >
          <ClipboardList className="w-6 h-6" />
        </Button>

        <Button
          variant={viewMode === 'flashcards' ? 'default' : 'ghost'}
          size="icon"
          onClick={() => onViewChange('flashcards')}
          className={viewMode === 'flashcards' ? 'bg-white text-teal-600 hover:bg-white' : 'text-white hover:bg-white/20'}
          title="Flashcards"
        >
          <CreditCard className="w-6 h-6" />
        </Button>
      </nav>
    </div>
  )
}
