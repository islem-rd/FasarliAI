'use client'

import { ConversationsList } from './conversations-list'

export function ChatHistory() {
  return (
    <div className="w-80 bg-card border-r border-border overflow-hidden flex flex-col">
      <ConversationsList />
    </div>
  )
}
