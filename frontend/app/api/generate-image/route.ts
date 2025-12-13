import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/supabase/server-auth'
import { createServerClient } from '@supabase/ssr'
import { createChatMessageServer } from '@/lib/supabase/database-server'

const BACKEND_URL = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please sign in to generate images.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { prompt, session_id, conversation_id } = body

    if (!prompt || !session_id) {
      return NextResponse.json(
        { error: 'Prompt and session_id are required' },
        { status: 400 }
      )
    }

    // Forward request to FastAPI backend
    let response
    try {
      response = await fetch(`${BACKEND_URL}/api/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          session_id,
        }),
        signal: AbortSignal.timeout(120000), // 2 minute timeout
      })
    } catch (fetchError: any) {
      console.error('Error connecting to backend:', fetchError)
      if (fetchError.name === 'TimeoutError' || fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Image generation timed out. Please try again.' },
          { status: 504 }
        )
      }
      return NextResponse.json(
        { error: 'Failed to connect to backend. Make sure the backend is running.' },
        { status: 503 }
      )
    }

    let data
    try {
      data = await response.json()
    } catch (jsonError) {
      const text = await response.text()
      console.error('Error parsing response:', text)
      return NextResponse.json(
        { error: `Backend returned invalid response: ${text.substring(0, 200)}` },
        { status: response.status || 500 }
      )
    }

    if (!response.ok) {
      const errorMessage = data.detail || data.error || 'Failed to generate image'
      console.error('Backend error:', errorMessage)
      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      )
    }

    // Backend returns image as base64 data URL
    const imageDataUrl = data.image_url
    
    // Convert base64 data URL to blob and upload to Supabase Storage
    let storedImageUrl = imageDataUrl // Fallback to base64 if upload fails
    
    if (imageDataUrl && imageDataUrl.startsWith('data:image')) {
      try {
        // Extract base64 data from data URL
        const base64Data = imageDataUrl.split(',')[1]
        const imageBuffer = Buffer.from(base64Data, 'base64')
        
        // Create Supabase client
        const supabase = createServerClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            cookies: {
              getAll() {
                return request.cookies.getAll()
              },
              setAll() {
                // Cookies are handled by middleware
              },
            },
          }
        )
        
        // Generate unique filename
        const timestamp = Date.now()
        const fileName = `${user.id}/${timestamp}-generated.png`
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('generated-images')
          .upload(fileName, imageBuffer, {
            contentType: 'image/png',
            upsert: true,
          })
        
        if (!uploadError && uploadData) {
          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('generated-images')
            .getPublicUrl(fileName)
          
          storedImageUrl = publicUrl
          
          // Save message to database with image URL if conversation_id provided
          if (conversation_id) {
            try {
              await createChatMessageServer(
                request,
                conversation_id,
                user.id,
                'assistant',
                `🎨 Image generated for: "${prompt}"`,
                null,
                storedImageUrl
              )
            } catch (msgError) {
              console.error('Error saving message:', msgError)
              // Don't fail the request if message saving fails
            }
          }
        } else {
          console.error('Error uploading image to storage:', uploadError)
          // Continue with base64 URL if upload fails
        }
      } catch (storageError) {
        console.error('Error processing image for storage:', storageError)
        // Continue with base64 URL if processing fails
      }
    }

    return NextResponse.json({
      ...data,
      image_url: storedImageUrl,
    })
  } catch (error: any) {
    console.error('Error in generate-image route:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred: ' + (error.message || String(error)) },
      { status: 500 }
    )
  }
}

