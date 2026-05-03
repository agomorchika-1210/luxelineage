import { supabase } from './supabase'

const BUCKET_NAME = 'product-images'

/**
 * Upload image to Supabase Storage
 * @param file - File object or Buffer to upload
 * @param folder - Optional folder path (e.g., 'products', 'thumbnails')
 * @param fileName - Optional custom filename (if not provided, generates one)
 * @returns Public URL of the uploaded image
 */
export async function uploadImageToSupabase(
  file: File | Buffer,
  folder: string = 'products',
  fileName?: string
): Promise<string> {
  try {
    // Generate unique filename if not provided
    let finalFileName: string
    if (fileName) {
      finalFileName = `${folder}/${fileName}`
    } else {
      const fileExt = file instanceof File 
        ? file.name.split('.').pop() || 'webp'
        : 'webp'
      finalFileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
    }
    
    // Convert File to ArrayBuffer if needed (Supabase accepts File, Blob, or ArrayBuffer)
    const uploadData = file instanceof File 
      ? file 
      : new Blob([new Uint8Array(file)], { type: 'image/webp' })
    
    // Upload file
    console.log('Uploading to Supabase Storage:', { bucket: BUCKET_NAME, fileName: finalFileName, size: uploadData.size })
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(finalFileName, uploadData, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Supabase Storage upload error:', error)
      // Provide more helpful error messages
      if (error.message?.includes('Bucket not found') || error.message?.includes('does not exist')) {
        throw new Error(`Storage bucket '${BUCKET_NAME}' not found. Please create it in Supabase Dashboard > Storage.`)
      }
      if (error.message?.includes('new row violates row-level security')) {
        throw new Error(`Storage bucket '${BUCKET_NAME}' has RLS enabled. Please configure bucket policies in Supabase Dashboard.`)
      }
      throw new Error(`Failed to upload image: ${error.message}`)
    }
    
    console.log('Upload successful, data:', data)

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(finalFileName)

    return publicUrl
  } catch (error: any) {
    console.error('Image upload error:', error)
    throw new Error(error.message || 'Failed to upload image')
  }
}

/**
 * Delete image from Supabase Storage
 * @param imageUrl - Full URL or path of the image to delete
 */
export async function deleteImageFromSupabase(imageUrl: string): Promise<void> {
  try {
    // Extract path from URL
    const url = new URL(imageUrl)
    const pathParts = url.pathname.split('/')
    const bucketIndex = pathParts.findIndex(part => part === BUCKET_NAME)
    
    if (bucketIndex === -1) {
      throw new Error('Invalid image URL')
    }
    
    const filePath = pathParts.slice(bucketIndex + 1).join('/')
    
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath])

    if (error) {
      console.error('Delete error:', error)
      throw new Error(`Failed to delete image: ${error.message}`)
    }
  } catch (error: any) {
    console.error('Image delete error:', error)
    throw new Error(error.message || 'Failed to delete image')
  }
}

/**
 * Check if Supabase Storage bucket exists and is accessible
 */
export async function checkStorageBucket(): Promise<boolean> {
  try {
    const { data, error } = await supabase.storage.listBuckets()
    
    if (error) {
      console.error('Storage check error:', error)
      return false
    }
    
    return data.some(bucket => bucket.name === BUCKET_NAME)
  } catch (error) {
    console.error('Storage check error:', error)
    return false
  }
}

