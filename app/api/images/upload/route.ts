import { NextRequest, NextResponse } from 'next/server'
import { optimizeImage } from '@/lib/image-optimization'
import { uploadImageToSupabase } from '@/lib/supabase-storage'
import { requireAuth } from '@/lib/middleware'

/**
 * POST /api/images/upload
 * Upload and optimize an image
 * 
 * Accepts multipart/form-data with 'image' field
 * Returns the public URL of the uploaded optimized image
 */
export async function POST(request: NextRequest) {
  console.log('========== IMAGE UPLOAD API CALLED ==========')
  console.log('Request URL:', request.url)
  console.log('Request method:', request.method)
  
  try {
    console.log('Image upload API - starting processing')
    
    // Check authentication
    const auth = await requireAuth(request)
    if (!auth) {
      console.error('Unauthorized image upload attempt')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('Auth verified, processing form data...')
    const formData = await request.formData()
    const file = formData.get('image') as File

    if (!file) {
      console.error('No file provided in form data')
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      )
    }

    console.log('File received:', { name: file.name, type: file.type, size: file.size })

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      console.error('Invalid file type:', file.type)
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size (max 10MB before optimization)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      console.error('File too large:', file.size)
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 10MB.' },
        { status: 400 }
      )
    }

    console.log('Converting file to buffer...')
    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log('Optimizing image with sharp...')
    let optimizedBuffer: Buffer
    try {
      // Optimize image
      optimizedBuffer = await optimizeImage(buffer, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 85,
        format: 'webp',
      })
      console.log('Image optimization complete, size:', optimizedBuffer.length)
    } catch (optimizeError: any) {
      console.error('Sharp optimization failed:', optimizeError.message)
      console.log('Falling back to original image without optimization')
      // Fall back to original buffer if sharp fails
      optimizedBuffer = buffer
    }

    console.log('Uploading to Supabase Storage...')
    // Upload optimized buffer directly to Supabase Storage
    const folder = (formData.get('folder') as string) || 'products'
    const requestedFileName = (formData.get('fileName') as string) || ''

    const baseName = requestedFileName.trim()
      ? requestedFileName.trim().replace(/\.[^/.]+$/, '.webp')
      : file.name.replace(/\.[^/.]+$/, '.webp')

    // Avoid collisions since storage upload uses upsert: false
    const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${baseName}`

    const publicUrl = await uploadImageToSupabase(optimizedBuffer, folder, uniqueFileName)

    console.log('Upload successful, URL:', publicUrl)

    return NextResponse.json({
      url: publicUrl,
      originalSize: file.size,
      optimizedSize: optimizedBuffer.length,
      compressionRatio: ((1 - optimizedBuffer.length / file.size) * 100).toFixed(1),
    })
  } catch (error: any) {
    console.error('Image upload error:', error)
    console.error('Error stack:', error.stack)
    return NextResponse.json(
      { error: error.message || 'Failed to upload image' },
      { status: 500 }
    )
  }
}

