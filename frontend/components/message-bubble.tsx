interface MessageBubbleProps {
  author: string
  avatar: string
  timestamp: string
  content: string
}

// Format content to preserve formatting
function formatContent(content: string) {
  // Split by lines to preserve line breaks
  const lines = content.split('\n')
  
  return lines.map((line, idx) => {
    let processedLine = line
    
    // Process bold text **text** and remove the asterisks
    processedLine = processedLine.replace(/\*\*(.+?)\*\*/g, (match, text) => {
      return `<strong class="font-bold text-foreground">${text}</strong>`
    })
    
    // Detect bullet points (-, *, •) - check before processing
    const bulletMatch = line.match(/^[\s]*([-*•])\s+(.+)/)
    if (bulletMatch) {
      const bulletContent = bulletMatch[2].replace(/\*\*(.+?)\*\*/g, (match, text) => {
        return `<strong class="font-bold text-foreground">${text}</strong>`
      })
      return (
        <div key={idx} className="flex gap-2 mb-1">
          <span className="text-teal-600 font-bold">•</span>
          <span className="flex-1" dangerouslySetInnerHTML={{ __html: bulletContent }} />
        </div>
      )
    }
    
    // Detect numbered lists
    const numberedMatch = line.match(/^[\s]*(\d+)[\.)]\s+(.+)/)
    if (numberedMatch) {
      const numberedContent = numberedMatch[2].replace(/\*\*(.+?)\*\*/g, (match, text) => {
        return `<strong class="font-bold text-foreground">${text}</strong>`
      })
      return (
        <div key={idx} className="flex gap-2 mb-1 ml-2">
          <span className="text-teal-600 font-semibold min-w-[1.5rem]">{numberedMatch[1]}.</span>
          <span className="flex-1" dangerouslySetInnerHTML={{ __html: numberedContent }} />
        </div>
      )
    }
    
    // Empty lines create spacing
    if (line.trim() === '') {
      return <div key={idx} className="h-2" />
    }
    
    // Regular lines with bold formatting
    if (processedLine.includes('<strong')) {
      return <div key={idx} className="mb-1" dangerouslySetInnerHTML={{ __html: processedLine }} />
    }
    
    // Plain text lines
    return <div key={idx} className="mb-1">{line}</div>
  })
}

export function MessageBubble({ author, avatar, timestamp, content }: MessageBubbleProps) {
  const isUser = author === 'You'
  const isLoading = content === '⚡'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center text-white flex-shrink-0">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
            <circle cx="9" cy="13" r="1.5"/>
            <circle cx="15" cy="13" r="1.5"/>
            <path d="M12 17.5c-1.1 0-2-.9-2-2h4c0 1.1-.9 2-2 2z"/>
          </svg>
        </div>
      )}
      <div className={`max-w-2xl ${isUser ? 'flex flex-col items-end' : ''}`}>
        <div className={`flex items-center gap-2 mb-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          {isUser ? (
            <>
              <span className="text-xs text-muted-foreground">{timestamp}</span>
              <span className="text-sm font-semibold">{author}</span>
              <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              </div>
            </>
          ) : (
            <>
              <span className="text-sm font-semibold">{author}</span>
              <span className="text-xs text-muted-foreground">{timestamp}</span>
            </>
          )}
        </div>
        <div className={`rounded-lg px-4 py-3 ${isUser ? 'bg-teal-100 dark:bg-teal-900/40 text-gray-900 dark:text-white' : 'text-foreground'}`}>
          {isLoading ? (
            <div className="flex items-center gap-2 py-1">
              <div className="relative w-5 h-5">
                <div className="absolute inset-0 rounded-full border-2 border-teal-200 dark:border-teal-800"></div>
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-teal-500 dark:border-t-teal-400 animate-spin"></div>
                <div className="absolute inset-1 rounded-full bg-gradient-to-tr from-teal-500/20 to-cyan-500/20 animate-pulse"></div>
              </div>
              <span className="text-xs font-medium text-teal-600 dark:text-teal-400 animate-pulse">Génération...</span>
            </div>
          ) : (
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {formatContent(content)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
