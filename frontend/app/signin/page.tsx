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

// Google Icon SVG Component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
)

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

        {/* Google Sign In Button */}
        <Button
          type="button"
          disabled
          className="w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <GoogleIcon />
          <span className="ml-2">Continue with Google</span>
        </Button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-teal-950 px-2 text-muted-foreground">Or continue with</span>
          </div>
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

