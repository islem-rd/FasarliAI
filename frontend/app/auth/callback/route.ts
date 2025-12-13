import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/'

  if (code) {
    // Create a response object that we'll use to set cookies
    const redirectUrl = new URL(next, requestUrl.origin)
    let response = NextResponse.redirect(redirectUrl)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response.cookies.set(name, value, {
                ...options,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
              })
            })
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Return the response with cookies set
      return response
    } else {
      console.error('OAuth callback error:', error)
      // If there's an error, redirect to signin with error message
      const errorUrl = new URL('/signin', requestUrl.origin)
      errorUrl.searchParams.set('error', error.message || 'oauth_error')
      return NextResponse.redirect(errorUrl)
    }
  }

  // If there's no code, redirect to signin
  const errorUrl = new URL('/signin', requestUrl.origin)
  errorUrl.searchParams.set('error', 'oauth_error')
  return NextResponse.redirect(errorUrl)
}

