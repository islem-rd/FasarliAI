'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { Sun, Moon } from 'lucide-react'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

const mfaSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits').regex(/^\d+$/, 'Code must contain only numbers'),
})

type MFAFormValues = z.infer<typeof mfaSchema>

function VerifyMFAContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const { signIn } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(180) // 3 minutes in seconds
  const [isDarkMode, setIsDarkMode] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

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
    if (!email) {
      toast.error('Invalid verification session')
      router.push('/signin')
      return
    }

    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          toast.error('Verification code expired')
          router.push('/signin')
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [email, router])

  const form = useForm<MFAFormValues>({
    resolver: zodResolver(mfaSchema),
    defaultValues: {
      code: '',
    },
  })

  const onSubmit = async (values: MFAFormValues) => {
    if (!email) {
      toast.error('Invalid session')
      return
    }

    setIsLoading(true)
    try {
      // Verify MFA code with backend
      const response = await fetch(`${BACKEND_URL}/api/users/verify-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          code: values.code,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.detail || 'Invalid verification code')
        return
      }

      // MFA verified, now authenticate with Supabase
      const pendingAuth = sessionStorage.getItem('pending_auth')
      if (pendingAuth) {
        const { email: authEmail, password } = JSON.parse(pendingAuth)
        const { error } = await signIn(authEmail, password)
        
        sessionStorage.removeItem('pending_auth')
        
        if (error) {
          toast.error('Authentication failed')
          router.push('/signin')
          return
        }
      }

      toast.success('Verification successful!')
      // Instant navigation without await
      router.push('/')
    } catch (error) {
      toast.error('An error occurred during verification')
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      {/* Background Video */}
      <video
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

      <div className="relative z-10 w-full max-w-md space-y-8 rounded-lg border border-teal-500/20 bg-white/95 dark:bg-teal-950/95 backdrop-blur-md p-8 shadow-2xl">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Verify Your Identity</h1>
          <p className="text-muted-foreground">
            Enter the 6-digit code sent to your email
          </p>
          <div className="text-sm font-medium text-teal-600 dark:text-teal-400">
            Time remaining: {formatTime(timeLeft)}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification Code</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="000000"
                      maxLength={6}
                      className="text-center text-2xl tracking-widest"
                      disabled={isLoading}
                      {...field}
                      onChange={(e: any) => {
                        const value = e.target.value.replace(/\D/g, '')
                        field.onChange(value)
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full gradient-button animate-button-pop" disabled={isLoading || timeLeft === 0}>
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </Button>
          </form>
        </Form>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Didn't receive a code? </span>
          <button
            onClick={() => router.push('/signin')}
            className="text-teal-600 dark:text-teal-400 hover:underline font-medium"
          >
            Back to sign in
          </button>
        </div>
      </div>
    </div>
  )
}

export default function VerifyMFAPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}>
      <VerifyMFAContent />
    </Suspense>
  )
}
