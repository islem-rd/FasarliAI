import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'

export async function getAuthenticatedUser(request?: NextRequest) {
  try {
    let supabase
    
    if (request) {
      // Use request cookies for API routes
      supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              // In API routes, we can't set cookies in the response this way
              // The middleware will handle cookie updates
            },
          },
        }
      )
    } else {
      // Fallback to server client for server components
      const { createClient } = await import('./server')
      supabase = await createClient()
    }
    
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      console.error('Auth error:', error)
      return null
    }
    
    return user
  } catch (error) {
    console.error('Error getting authenticated user:', error)
    return null
  }
}

