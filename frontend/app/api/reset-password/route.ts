import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    const { email, code, new_password } = await request.json()

    // Verify code with backend first
    const backendResponse = await fetch(`${BACKEND_URL}/api/users/verify-reset-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code }),
    })

    if (!backendResponse.ok) {
      const error = await backendResponse.json()
      return NextResponse.json(
        { error: error.detail || 'Invalid reset code' },
        { status: 400 }
      )
    }

    // Create Supabase client with service role key for admin operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    if (!supabaseServiceKey) {
      console.error('SUPABASE_SERVICE_ROLE_KEY not configured')
      return NextResponse.json(
        { error: 'Server configuration error - please add SUPABASE_SERVICE_ROLE_KEY to .env.local' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Get user by email
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (listError) {
      console.error('List users error:', listError)
      return NextResponse.json(
        { error: 'Failed to find user' },
        { status: 500 }
      )
    }

    const user = users?.find(u => u.email === email)
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found in Supabase' },
        { status: 404 }
      )
    }

    // Update password using admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { password: new_password }
    )

    if (updateError) {
      console.error('Update password error:', updateError)
      return NextResponse.json(
        { error: updateError.message || 'Failed to update password in Supabase' },
        { status: 500 }
      )
    }

    // Mark code as used in backend
    await fetch(`${BACKEND_URL}/api/users/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code, new_password }),
    })

    return NextResponse.json({ 
      success: true,
      message: 'Password updated successfully in Supabase'
    })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
