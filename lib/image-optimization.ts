import sharp from 'sharp'

/**
 * Image optimization configuration
 */
export interface ImageOptimizationOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'webp' | 'jpeg' | 'png'
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside'
}

const DEFAULT_OPTIONS: Required<ImageOptimizationOptions> = {
  maxWidth: 1920, // Max width for product images
  maxHeight: 1920, // Max height for product images
  quality: 85, // Good balance between quality and file size
  format: 'webp', // WebP provides better compression
  fit: 'inside', // Maintain aspect ratio, fit inside dimensions
}

/**
 * Optimize an image buffer
 * @param imageBuffer - Image file buffer
 * @param options - Optimization options
 * @returns Optimized image buffer
 */
export async function optimizeImage(
  imageBuffer: Buffer,
  options: ImageOptimizationOptions = {}
): Promise<Buffer> {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  try {
    let pipeline = sharp(imageBuffer)

    // Get image metadata
    const metadata = await pipeline.metadata()
    
    // Only resize if image is larger than max dimensions
    const needsResize = 
      (metadata.width && metadata.width > opts.maxWidth) ||
      (metadata.height && metadata.height > opts.maxHeight)

    if (needsResize) {
      pipeline = pipeline.resize(opts.maxWidth, opts.maxHeight, {
        fit: opts.fit,
        withoutEnlargement: true, // Don't enlarge smaller images
      })
    }

    // Convert and compress based on format
    switch (opts.format) {
      case 'webp':
        pipeline = pipeline.webp({ 
          quality: opts.quality,
          effort: 4, // Balance between compression time and file size (0-6)
        })
        break
      case 'jpeg':
        pipeline = pipeline.jpeg({ 
          quality: opts.quality,
          mozjpeg: true, // Use mozjpeg for better compression
          progressive: true, // Progressive JPEG for better perceived performance
        })
        break
      case 'png':
        pipeline = pipeline.png({ 
          quality: opts.quality,
          compressionLevel: 9, // Max compression (0-9)
        })
        break
    }

    const optimizedBuffer = await pipeline.toBuffer()
    
    // Log compression stats
    const originalSize = imageBuffer.length
    const optimizedSize = optimizedBuffer.length
    const compressionRatio = ((1 - optimizedSize / originalSize) * 100).toFixed(1)
    
    console.log(`Image optimized: ${(originalSize / 1024).toFixed(2)}KB → ${(optimizedSize / 1024).toFixed(2)}KB (${compressionRatio}% reduction)`)

    return optimizedBuffer
  } catch (error) {
    console.error('Image optimization error:', error)
    // Return original buffer if optimization fails
    return imageBuffer
  }
}

/**
 * Optimize image for thumbnail (smaller size)
 */
export async function optimizeThumbnail(
  imageBuffer: Buffer,
  size: number = 400
): Promise<Buffer> {
  return optimizeImage(imageBuffer, {
    maxWidth: size,
    maxHeight: size,
    quality: 80,
    format: 'webp',
  })
}

/**
 * Get optimized image file name
 */
export function getOptimizedFileName(originalName: string, format: string = 'webp'): string {
  const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '')
  return `${nameWithoutExt}.${format}`
}

