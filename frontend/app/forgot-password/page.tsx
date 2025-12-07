'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
import { Sun, Moon } from 'lucide-react'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
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

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  })

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${BACKEND_URL}/api/users/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: values.email,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.detail || 'Failed to send reset code')
        return
      }

      toast.success('Reset code sent to your email!')
      router.push(`/reset-password?email=${encodeURIComponent(values.email)}`)
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

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

      <div className="relative z-10 w-full max-w-md space-y-8 rounded-lg border border-teal-500/20 bg-white/95 dark:bg-teal-950/95 backdrop-blur-md p-8 shadow-2xl">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Forgot Password</h1>
          <p className="text-muted-foreground">
            Enter your email and we'll send you a reset code
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="name@example.com"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full gradient-button animate-button-pop" disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Reset Code'}
            </Button>
          </form>
        </Form>

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Remember your password? </span>
          <Link
            href="/signin"
            className="text-teal-600 dark:text-teal-400 hover:underline font-medium"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
