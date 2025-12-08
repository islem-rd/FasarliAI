import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'
import { cookies } from 'next/headers'

// Helper to create a Supabase client for storage operations
function getSupabaseStorageClient(request?: NextRequest) {
  if (request) {
    // For API routes
    return createServerClient(
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
  } else {
    // For server components
    const cookieStore = cookies()
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // Cookies are handled by middleware
          },
        },
      }
    )
  }
}

/**
 * Upload PDF file to Supabase Storage
 */
export async function uploadPDFToStorage(
  request: NextRequest,
  userId: string,
  conversationId: string,
  file: File
): Promise<{ path: string | null; error: any }> {
  try {
    const supabase = getSupabaseStorageClient(request)
    
    // Create a unique file path: userId/conversationId/filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${conversationId}.${fileExt}`
    const filePath = `${userId}/${fileName}`
    
    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = Buffer.from(arrayBuffer)
    
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('pdfs')
      .upload(filePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true, // Overwrite if exists
      })
    
    if (error) {
      console.error('Error uploading PDF to storage:', error)
      return { path: null, error }
    }
    
    return { path: filePath, error: null }
  } catch (error: any) {
    console.error('Error in uploadPDFToStorage:', error)
    return { path: null, error }
  }
}

/**
 * Download PDF file from Supabase Storage
 */
export async function downloadPDFFromStorage(
  request: NextRequest,
  storagePath: string
): Promise<{ data: Buffer | null; error: any }> {
  try {
    const supabase = getSupabaseStorageClient(request)
    
    const { data, error } = await supabase.storage
      .from('pdfs')
      .download(storagePath)
    
    if (error) {
      console.error('Error downloading PDF from storage:', error)
      return { data: null, error }
    }
    
    // Convert Blob to Buffer
    const arrayBuffer = await data.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    return { data: buffer, error: null }
  } catch (error: any) {
    console.error('Error in downloadPDFFromStorage:', error)
    return { data: null, error }
  }
}

/**
 * Delete PDF file from Supabase Storage
 */
export async function deletePDFFromStorage(
  request: NextRequest,
  storagePath: string
): Promise<{ success: boolean; error: any }> {
  try {
    const supabase = getSupabaseStorageClient(request)
    
    const { error } = await supabase.storage
      .from('pdfs')
      .remove([storagePath])
    
    if (error) {
      console.error('Error deleting PDF from storage:', error)
      return { success: false, error }
    }
    
    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error in deletePDFFromStorage:', error)
    return { success: false, error }
  }
}

