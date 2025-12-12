'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useAuth } from '@/contexts/auth-context'
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

const signInSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

type SignInFormValues = z.infer<typeof signInSchema>

export default function SignInPage() {
  const router = useRouter()
  const { signIn, verifyPassword, user, loading } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setIsDarkMode(isDark)
  }, [])

  useEffect(() => {
    if (!loading && user && !isVerifying) {
      router.push('/')
    }
  }, [user, loading, isVerifying, router])

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

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const onSubmit = async (values: SignInFormValues) => {
    setIsLoading(true)
    setIsVerifying(true)
    try {
      // First verify password with Supabase (without creating session)
      const { valid, error } = await verifyPassword(values.email, values.password)
      
      if (!valid || error) {
        setIsLoading(false)
        setIsVerifying(false)
        toast.error(error?.message || 'Invalid email or password')
        return
      }

      // Store credentials temporarily BEFORE sending MFA
      sessionStorage.setItem('pending_auth', JSON.stringify({
        email: values.email,
        password: values.password,
      }))

      // Send MFA code in background (non-blocking)
      fetch(`${BACKEND_URL}/api/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
        }),
      }).then(response => {
        if (response.ok) {
          console.log('MFA code sent successfully')
        } else {
          console.error('Failed to send MFA code')
        }
      }).catch(err => {
        console.error('Error sending MFA code:', err)
      })

      // Redirect immediately to MFA page (don't wait for email)
      toast.success('Redirecting to verification...')
      router.push(`/verify-mfa?email=${encodeURIComponent(values.email)}`)
      setIsVerifying(false)

    } catch (error) {
      setIsLoading(false)
      setIsVerifying(false)
      toast.error('An unexpected error occurred')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
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
          <h1 className="text-3xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground">
            Enter your credentials to sign in
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

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      disabled={isLoading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full gradient-button animate-button-pop" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </Form>

        <div className="space-y-3">
          <div className="text-center text-sm">
            <Link
              href="/forgot-password"
              className="text-teal-600 dark:text-teal-400 hover:underline font-medium"
            >
              Forgot password?
            </Link>
          </div>
          
          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don't have an account? </span>
            <Link
              href="/signup"
              className="text-teal-600 dark:text-teal-400 hover:underline font-medium"
            >
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

