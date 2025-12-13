import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') || '/'

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              request.cookies.set(name, value)
            )
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Redirect to home page or the next parameter
      const origin = request.headers.get('origin') || request.headers.get('x-forwarded-host') || request.nextUrl.origin
      const protocol = request.headers.get('x-forwarded-proto') || (origin.startsWith('https') ? 'https' : 'https')
      const baseUrl = origin.startsWith('http') ? origin : `${protocol}://${origin}`
      
      return NextResponse.redirect(new URL(next, baseUrl))
    }
  }

  // If there's an error or no code, redirect to signin
  return NextResponse.redirect(new URL('/signin?error=oauth_error', request.url))
}

