# Image Optimization

This system automatically optimizes images before uploading them to Supabase Storage to reduce storage costs and improve loading performance.

## Features

- **Automatic Resizing**: Images are resized to a maximum of 1920x1920 pixels while maintaining aspect ratio
- **Format Conversion**: Images are converted to WebP format for better compression (typically 25-35% smaller than JPEG)
- **Quality Optimization**: Images are compressed to 85% quality, providing excellent visual quality with significant file size reduction
- **Smart Compression**: Only resizes images that exceed the maximum dimensions
- **Automatic Fallback**: If optimization fails, the original image is used

## How It Works

1. **Client Upload**: When a user selects an image in the inventory management interface
2. **API Processing**: The image is sent to `/api/images/upload` endpoint
3. **Server-Side Optimization**: 
   - Image is processed using Sharp (high-performance image processing library)
   - Resized if needed (max 1920x1920px)
   - Converted to WebP format
   - Compressed to 85% quality
4. **Storage Upload**: Optimized image is uploaded to Supabase Storage
5. **URL Return**: Public URL is returned to the client

## Configuration

The optimization settings can be adjusted in `lib/image-optimization.ts`:

```typescript
const DEFAULT_OPTIONS = {
  maxWidth: 1920,      // Maximum width in pixels
  maxHeight: 1920,     // Maximum height in pixels
  quality: 85,         // Compression quality (0-100)
  format: 'webp',      // Output format
  fit: 'inside',       // How to fit the image
}
```

## Benefits

- **Reduced Storage Costs**: Smaller file sizes mean lower storage costs
- **Faster Loading**: Optimized images load faster for end users
- **Better Performance**: Reduced bandwidth usage
- **Automatic Processing**: No manual optimization needed

## File Size Reduction

Typical compression results:
- **JPEG images**: 30-50% size reduction
- **PNG images**: 60-80% size reduction
- **Large images**: Additional savings from resizing

## Usage

The optimization is automatically applied when uploading images through:
- Product image upload in inventory management
- Any image upload that uses the `/api/images/upload` endpoint

## Technical Details

- **Library**: Sharp (v0.34.5+)
- **Processing**: Server-side (Next.js API route)
- **Format**: WebP with fallback support
- **Max Upload Size**: 10MB (before optimization)
- **Supported Formats**: JPEG, PNG, WebP, GIF

## Monitoring

The API endpoint logs compression statistics:
```
Image optimized: 2048.50KB → 512.30KB (75.0% reduction)
```

This helps track the effectiveness of the optimization.

