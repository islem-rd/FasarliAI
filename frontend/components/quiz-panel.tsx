'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useSession } from '@/contexts/session-context'

interface QuizQuestion {
  question: string
  a: string
  b: string
  c: string
  d: string
  correct: string
}

export function QuizPanel() {
  const { sessionId } = useSession()
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [score, setScore] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateQuiz = async () => {
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
      const response = await fetch('/api/quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate quiz')
      }

      const data = await response.json()
      setQuestions(data.questions || [])
      setCurrentQuestionIndex(0)
      setSelectedAnswer(null)
      setShowAnswer(false)
      setScore(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate quiz')
    } finally {
      setIsLoading(false)
    }
  }

  // Don't auto-generate on mount to prevent unwanted regeneration

  const handleAnswerSelect = (answer: string) => {
    if (showAnswer) return
    setSelectedAnswer(answer)
  }

  const handleSubmitAnswer = () => {
    if (!selectedAnswer) return

    const currentQuestion = questions[currentQuestionIndex]
    const isCorrect = selectedAnswer.toUpperCase() === currentQuestion.correct.toUpperCase()
    
    if (isCorrect) {
      setScore(score + 1)
    }

    setShowAnswer(true)
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setSelectedAnswer(null)
      setShowAnswer(false)
    }
  }

  const currentQuestion = questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === questions.length - 1
  const progress = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0

  return (
    <div className="w-96 bg-card border-r border-border p-6 space-y-6 overflow-y-auto scrollbar-thin scrollbar-thumb-teal-500 scrollbar-track-teal-100/20 hover:scrollbar-thumb-teal-600 dark:scrollbar-thumb-teal-600 dark:hover:scrollbar-thumb-teal-500 scrollbar-thumb-rounded-full transition-colors">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">QUIZ</h2>
        {questions.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {currentQuestionIndex + 1}/{questions.length}
          </span>
        )}
      </div>

      {!sessionId ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground mb-4">
            Upload a PDF to generate quiz questions
          </p>
        </div>
      ) : isLoading ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">Generating quiz questions...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-sm text-red-500 mb-4">{error}</p>
          <Button onClick={generateQuiz} variant="outline" size="sm">
            Retry
          </Button>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-8">
          <Button 
            onClick={generateQuiz} 
            className="gradient-button animate-button-pop"
          >
            Generate Quiz
          </Button>
        </div>
      ) : currentQuestion ? (
        <>
          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-teal-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Question */}
          <div className="space-y-3 bg-gradient-to-r from-teal-50/50 to-cyan-50/50 dark:from-teal-900/20 dark:to-cyan-900/20 p-4 rounded-lg border border-teal-200/30 dark:border-teal-700/30">
            <h3 className="text-xs font-bold uppercase tracking-wide text-teal-600 dark:text-teal-400">Question:</h3>
            <p className="text-base leading-relaxed font-bold text-foreground">{currentQuestion.question}</p>
          </div>

          {/* Answers */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-teal-600 dark:text-teal-400">Choose your answer:</h3>
            <div className="space-y-2">
              {['a', 'b', 'c', 'd'].map((option) => {
                const answerText = currentQuestion[option as keyof QuizQuestion] as string
                const isSelected = selectedAnswer === option
                const isCorrect = option.toUpperCase() === currentQuestion.correct.toUpperCase()
                const showResult = showAnswer && (isSelected || isCorrect)

                return (
                  <Button
                    key={option}
                    variant="outline"
                    className={`w-full justify-start border-2 transition-colors whitespace-normal text-left h-auto py-3 px-4 ${
                      showResult
                        ? isCorrect
                          ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20'
                          : isSelected
                          ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20'
                          : ''
                        : isSelected
                        ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/20'
                        : ''
                    }`}
                    onClick={() => handleAnswerSelect(option)}
                    disabled={showAnswer}
                  >
                    <div className="flex items-start gap-2 w-full">
                      <span className="font-bold flex-shrink-0">{option.toUpperCase()})</span>
                      <span className="flex-1 break-words font-semibold">{answerText}</span>
                    </div>
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 flex gap-3">
            {!showAnswer ? (
              <Button
                onClick={handleSubmitAnswer}
                disabled={!selectedAnswer}
                className="flex-1 gradient-button animate-button-pop"
              >
                Submit Answer
              </Button>
            ) : (
              <>
                {!isLastQuestion ? (
                  <Button
                    onClick={handleNext}
                    className="flex-1 gradient-button animate-button-pop"
                  >
                    Next Question
                  </Button>
                ) : (
                  <div className="w-full space-y-2">
                    <div className="text-center p-4 bg-muted rounded-lg">
                      <p className="text-lg font-bold">Final Score</p>
                      <p className="text-2xl font-bold text-teal-600">
                        {score}/{questions.length}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {Math.round((score / questions.length) * 100)}%
                      </p>
                    </div>
                    <Button
                      onClick={generateQuiz}
                      variant="outline"
                      className="w-full border-teal-600 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors"
                    >
                      Generate New Quiz
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      ) : null}

      <div className="text-center">
        <p className="text-xs text-muted-foreground">Enjoy your experience...</p>
      </div>
    </div>
  )
}
