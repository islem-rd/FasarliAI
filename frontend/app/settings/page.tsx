'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { getUser, updateUser } from '@/lib/supabase/database'
import { Sun, Moon, ArrowLeft, Upload, User as UserIcon, Lock, Camera } from 'lucide-react'

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

const usernameSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username must be less than 30 characters'),
})

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>
type UsernameFormValues = z.infer<typeof usernameSchema>

export default function SettingsPage() {
  const router = useRouter()
  const { user, signOut } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [userData, setUserData] = useState<any>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setIsDarkMode(isDark)
  }, [])

  useEffect(() => {
    if (user) {
      fetchUserData()
    }
  }, [user])

  const fetchUserData = async () => {
    if (!user) return
    try {
      const { data, error } = await getUser(user.id)
      if (error) {
        console.error('Error fetching user data:', error)
        return
      }
      if (data) {
        setUserData(data)
        setAvatarUrl(data.avatar_url)
      }
    } catch (error) {
      console.error('Error fetching user data:', error)
    }
  }

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

  const passwordForm = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const usernameForm = useForm<UsernameFormValues>({
    resolver: zodResolver(usernameSchema),
    defaultValues: {
      username: userData?.username || '',
    },
  })

  useEffect(() => {
    if (userData) {
      usernameForm.reset({
        username: userData.username || '',
      })
    }
  }, [userData])

  if (!user) {
    router.push('/signin')
    return null
  }

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Only JPEG, PNG, and WebP are allowed.')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit')
      return
    }

    setIsUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload-avatar', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to upload avatar')
        return
      }

      setAvatarUrl(data.avatar_url)
      setUserData({ ...userData, avatar_url: data.avatar_url })
      toast.success('Avatar updated successfully!')
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsUploadingAvatar(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const onPasswordSubmit = async (values: ChangePasswordFormValues) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email!,
          old_password: values.currentPassword,
          new_password: values.newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        toast.error(data.error || 'Failed to update password')
        return
      }

      toast.success('Password updated successfully!')
      passwordForm.reset()
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const onUsernameSubmit = async (values: UsernameFormValues) => {
    if (!user) return
    
    setIsLoading(true)
    try {
      const { data, error } = await updateUser(user.id, {
        username: values.username,
      })

      if (error) {
        toast.error(error.message || 'Failed to update username')
        return
      }

      setUserData(data)
      toast.success('Username updated successfully!')
    } catch (error: any) {
      toast.error(error.message || 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black dark:from-black dark:via-gray-900 dark:to-black">
      {/* Header */}
      <div className="bg-gradient-to-r from-black via-gray-900 to-black border-b border-gray-800 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/')}
                className="text-white hover:bg-white/10"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#40e0d0] via-cyan-400 to-[#40e0d0]">
                  Settings
                </h1>
                <p className="text-sm text-gray-400 mt-1">Manage your account settings</p>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              size="icon"
              onClick={toggleTheme}
              className="text-white hover:bg-white/10"
              title={isDarkMode ? 'Light Mode' : 'Dark Mode'}
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-8 py-8 space-y-8">
        {/* Profile Picture Section */}
        <Card className="bg-gray-900/50 border-gray-800 dark:bg-gray-900/50 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-[#40e0d0]" />
              Profile Picture
            </CardTitle>
            <CardDescription className="text-gray-400">
              Upload a profile picture to personalize your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <div className="relative">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-2 border-[#40e0d0]"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#40e0d0] to-cyan-500 flex items-center justify-center text-white text-2xl font-bold border-2 border-[#40e0d0]">
                    {(userData?.username || user?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#40e0d0] text-black flex items-center justify-center hover:bg-cyan-400 transition-colors disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-400 mb-2">
                  JPG, PNG or WebP. Max size 5MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="bg-[#40e0d0] text-black hover:bg-cyan-400"
                >
                  {isUploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Username Section */}
        <Card className="bg-gray-900/50 border-gray-800 dark:bg-gray-900/50 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-[#40e0d0]" />
              Username
            </CardTitle>
            <CardDescription className="text-gray-400">
              Change your display username
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...usernameForm}>
              <form onSubmit={usernameForm.handleSubmit(onUsernameSubmit)} className="space-y-4">
                <FormField
                  control={usernameForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Username</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your username"
                          disabled={isLoading}
                          className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-[#40e0d0] text-black hover:bg-cyan-400"
                >
                  {isLoading ? 'Updating...' : 'Update Username'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card className="bg-gray-900/50 border-gray-800 dark:bg-gray-900/50 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Account Information</CardTitle>
            <CardDescription className="text-gray-400">
              Your account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-300 mb-1">Email</p>
              <p className="text-sm text-gray-400">{user.email}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-300 mb-1">User ID</p>
              <p className="text-sm text-gray-400 font-mono">{user.id}</p>
            </div>
          </CardContent>
        </Card>

        {/* Change Password Section */}
        <Card className="bg-gray-900/50 border-gray-800 dark:bg-gray-900/50 dark:border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#40e0d0]" />
              Change Password
            </CardTitle>
            <CardDescription className="text-gray-400">
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Current Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          disabled={isLoading}
                          className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          disabled={isLoading}
                          className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Confirm New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          disabled={isLoading}
                          className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="bg-[#40e0d0] text-black hover:bg-cyan-400"
                >
                  {isLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="bg-gray-900/50 border-red-900/50 dark:bg-gray-900/50 dark:border-red-900/50">
          <CardHeader>
            <CardTitle className="text-red-400">Danger Zone</CardTitle>
            <CardDescription className="text-gray-400">
              Irreversible account actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              variant="destructive" 
              onClick={() => signOut()}
              className="bg-red-600 hover:bg-red-700"
            >
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
