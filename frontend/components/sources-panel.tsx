import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Source {
  title: string
  snippet?: string
  url?: string
}

interface SourcesPanelProps {
  sources: Source[]
}

export function SourcesPanel({ sources }: SourcesPanelProps) {
  if (!sources || sources.length === 0) {
    return null
  }

  return (
    <div className="bg-card border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold">📚 Sources</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {sources.map((source, idx) => (
          <div key={idx} className="border border-border rounded p-3 text-sm space-y-2">
            <p className="font-medium text-foreground">{source.title}</p>
            {source.snippet && (
              <p className="text-muted-foreground text-xs line-clamp-2">{source.snippet}</p>
            )}
            {source.url && source.url !== '#' && (
              <a 
                href={source.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                Visit source <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
