import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server-auth'
import { updateUserServer } from '@/lib/supabase/database-server'
import * as z from 'zod'

const updateUsernameSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username must be less than 30 characters'),
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to update username.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Validate input
    const validationResult = updateUsernameSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }

    const { username } = validationResult.data

    // Update username using server function
    const { data: updatedUser, error: updateError } = await updateUserServer(request, user.id, {
      username,
    })

    if (updateError) {
      console.error('Error updating username:', updateError)
      
      // If column doesn't exist, return a helpful error
      if (updateError.message?.includes('column') && (updateError.message?.includes('does not exist') || updateError.message?.includes('not found'))) {
        return NextResponse.json(
          { 
            error: 'Database column missing. Please run migration 004_ensure_user_columns.sql in Supabase.',
            errorCode: 'COLUMN_NOT_FOUND'
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { error: updateError.message || 'Failed to update username' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
    })
  } catch (error: any) {
    console.error('Error in update-username route:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + error.message },
      { status: 500 }
    )
  }
}

