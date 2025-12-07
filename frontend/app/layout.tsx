import type { Metadata } from 'next'
import Script from 'next/script'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { SessionProvider } from '@/contexts/session-context'
import { AuthProvider } from '@/contexts/auth-context'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'FasarliAI - Learn Smarter',
  description: 'AI-powered learning platform with quizzes, flashcards, and intelligent chat',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon.png',
        type: 'image/png',
      },
      {
        url: '/icon.png',
        rel: 'shortcut icon',
      },
    ],
    apple: '/icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <Script id="theme-initializer" strategy="beforeInteractive">
          {`
            try {
              const storedTheme = localStorage.getItem('theme');
              if (storedTheme === 'dark') {
                document.documentElement.classList.add('dark');
              } else if (storedTheme === 'light') {
                document.documentElement.classList.remove('dark');
              }
            } catch (error) {
              console.warn('Failed to apply saved theme', error);
            }
          `}
        </Script>
        <AuthProvider>
          <SessionProvider>
            {children}
          </SessionProvider>
        </AuthProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
