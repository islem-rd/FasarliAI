'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useSession } from '@/contexts/session-context'

interface Flashcard {
  front: string
  back: string
}

const colorOptions = [
  { bg: 'bg-teal-100 dark:bg-teal-900/20', border: 'border-teal-400', text: 'text-teal-600 dark:text-teal-400' },
  { bg: 'bg-blue-100 dark:bg-blue-900/20', border: 'border-blue-400', text: 'text-blue-600 dark:text-blue-400' },
  { bg: 'bg-cyan-100 dark:bg-cyan-900/20', border: 'border-cyan-400', text: 'text-cyan-600 dark:text-cyan-400' },
  { bg: 'bg-green-100 dark:bg-green-900/20', border: 'border-green-400', text: 'text-green-600 dark:text-green-400' },
  { bg: 'bg-indigo-100 dark:bg-indigo-900/20', border: 'border-indigo-400', text: 'text-indigo-600 dark:text-indigo-400' },
]

export function FlashcardPanel() {
  const { sessionId } = useSession()
  const [flashcards, setFlashcards] = useState<Flashcard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [colorIndex, setColorIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateFlashcards = async () => {
    if (!sessionId) {
      setError('Please upload a PDF first')
      return
    }

    // Prevent duplicate requests
    if (isLoading) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Add timeout controller for long requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 second timeout

      const response = await fetch('/api/flashcards', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error occurred' }))
        throw new Error(errorData.error || errorData.detail || 'Failed to generate flashcards')
      }

      const data = await response.json()
      
      if (!data.flashcards || data.flashcards.length === 0) {
        throw new Error('No flashcards were generated. Please try again.')
      }

      setFlashcards(data.flashcards || [])
      setCurrentIndex(0)
      setFlipped(false)
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          setError('Request timed out. Please try again.')
        } else {
          setError(err.message || 'Failed to generate flashcards')
        }
      } else {
        setError('Failed to generate flashcards. Please try again.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Don't auto-generate on mount to prevent unwanted regeneration

  const toggleFlip = () => {
    setFlipped(!flipped)
  }

  const nextCard = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setFlipped(false)
    }
  }

  const prevCard = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setFlipped(false)
    }
  }

  const changeColor = () => {
    setColorIndex((prev) => (prev + 1) % colorOptions.length)
  }

  const currentCard = flashcards[currentIndex]
  const colors = colorOptions[colorIndex]

  return (
    <div className="w-80 bg-card border-r border-border p-6 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-teal-500 scrollbar-track-teal-100/20 hover:scrollbar-thumb-teal-600 dark:scrollbar-thumb-teal-600 dark:hover:scrollbar-thumb-teal-500 scrollbar-thumb-rounded-full transition-colors">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">FlashCards</h2>
        {flashcards.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {currentIndex + 1}/{flashcards.length}
          </span>
        )}
      </div>

      {!sessionId ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground mb-4">
            Upload a PDF to generate flashcards
          </p>
        </div>
      ) : isLoading ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">Generating flashcards...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <Button onClick={generateFlashcards} variant="outline" size="sm">
            Retry
          </Button>
        </div>
      ) : flashcards.length === 0 ? (
        <div className="text-center py-8">
          <Button 
            onClick={generateFlashcards} 
            className="gradient-button animate-button-pop"
          >
            Generate Flashcards
          </Button>
        </div>
      ) : currentCard ? (
        <>
          {/* Flashcard */}
          <div
            className="relative h-64 cursor-pointer perspective-1000"
            onClick={toggleFlip}
            onContextMenu={(e) => {
              e.preventDefault()
              changeColor()
            }}
          >
            <div
              className="relative w-full h-full transition-transform duration-500"
              style={{
                transformStyle: 'preserve-3d',
                transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {/* Front of card */}
              <div
                className={`absolute w-full h-full p-6 rounded-lg border-2 flex items-center justify-center ${colors.bg} ${colors.border}`}
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                }}
              >
                <p className={`text-center text-lg font-bold leading-relaxed ${colors.text}`}>
                  {currentCard.front}
                </p>
              </div>

              {/* Back of card */}
              <div
                className={`absolute w-full h-full p-6 rounded-lg border-2 flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700`}
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }}
              >
                <p className={`text-center text-lg font-bold leading-relaxed text-emerald-700 dark:text-emerald-300`}>
                  {currentCard.back}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={prevCard}
              disabled={currentIndex === 0}
              className="flex-1"
            >
              ← Previous
            </Button>
            <Button
              variant="outline"
              onClick={nextCard}
              disabled={currentIndex === flashcards.length - 1}
              className="flex-1"
            >
              Next →
            </Button>
          </div>

          {/* Generate New */}
          <Button
            onClick={generateFlashcards}
            variant="outline"
            className="w-full border-teal-600 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
          >
            Generate New Flashcards
          </Button>
        </>
      ) : null}

      <div className="text-center">
        <p className="text-xs text-muted-foreground">Enjoy your experience...</p>
      </div>
    </div>
  )
}
