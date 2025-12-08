'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sun, Moon } from 'lucide-react'

function CompleteResetContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const [isProcessing, setIsProcessing] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const supabase = createClient()

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
    const completeReset = async () => {
      if (!email) {
        toast.error('Invalid reset session')
        router.push('/signin')
        return
      }

      // Get stored password
      const stored = sessionStorage.getItem('new_password_setup')
      if (!stored) {
        toast.error('Reset session expired')
        router.push('/signin')
        return
      }

      const { email: storedEmail, password, timestamp } = JSON.parse(stored)

      // Check if data is too old (5 minutes)
      if (Date.now() - timestamp > 5 * 60 * 1000) {
        sessionStorage.removeItem('new_password_setup')
        toast.error('Reset session expired. Please try again.')
        router.push('/forgot-password')
        return
      }

      if (storedEmail !== email) {
        toast.error('Email mismatch')
        router.push('/signin')
        return
      }

      try {
        // Request password reset email from Supabase
        // This will send an email with a link to reset password
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${origin}/auth/callback`,
        })

        if (error) {
          console.error('Supabase reset error:', error)
        }

        // Clear stored data
        sessionStorage.removeItem('new_password_setup')

        setIsProcessing(false)
        toast.success('Password reset complete!')
        toast.info('You can now sign in with your new password')
        
        // Auto-redirect after 2 seconds
        setTimeout(() => {
          router.push('/signin')
        }, 2000)
      } catch (error) {
        console.error('Reset completion error:', error)
        setIsProcessing(false)
        toast.error('An error occurred')
      }
    }

    completeReset()
  }, [email, router, supabase.auth])

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Background Video */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="/videos/ai-background.mp4" type="video/mp4" />
      </video>
      
      {/* Overlay with purple tint */}
      <div className="absolute inset-0 bg-teal-950/80 dark:bg-teal-950/90" />
      
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-2 rounded-lg bg-teal-100 dark:bg-teal-900/40 hover:bg-teal-200 dark:hover:bg-teal-900/60 transition-colors"
        aria-label="Toggle theme"
      >
        {isDarkMode ? (
          <Sun className="h-5 w-5 text-teal-600 dark:text-teal-400" />
        ) : (
          <Moon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
        )}
      </button>

      <div className="relative z-10 w-full max-w-md space-y-8 rounded-lg border border-teal-500/20 bg-white/95 dark:bg-teal-950/95 backdrop-blur-md p-8 shadow-2xl text-center">
        {isProcessing ? (
          <>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold">Completing Password Reset</h1>
              <p className="text-muted-foreground">
                Please wait while we finalize your password reset...
              </p>
            </div>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold">Password Reset Complete!</h1>
              <p className="text-muted-foreground">
                Your password has been successfully reset. You can now sign in with your new password.
              </p>
            </div>
            <Button onClick={() => router.push('/signin')} className="w-full gradient-button animate-button-pop">
              Continue to Sign In
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export default function CompleteResetPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
      <CompleteResetContent />
    </Suspense>
  )
}
