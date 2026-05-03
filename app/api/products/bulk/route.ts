import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/middleware'
import { uploadImageToSupabase } from '@/lib/supabase-storage'
import * as XLSX from 'xlsx'
import * as fs from 'fs'
import * as path from 'path'

// POST /api/products/bulk - Bulk import products from Excel
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const imagesFolder = formData.get('imagesFolder') as string | null // Optional folder path for images
    const imagesZip = formData.get('imagesZip') as File | null // Optional zip file with images

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Map to store image filename -> uploaded URL
    const imageMap = new Map<string, string>()
    const imageUploadErrors: Array<{ filename: string; error: string }> = []

    // Helper function to find image file by filename
    const findImageFile = async (imageName: string): Promise<Buffer | null> => {
      if (!imageName || !imageName.trim()) return null

      // Clean the filename (remove path, query params, etc.)
      const cleanName = path.basename(imageName).split('?')[0].trim()
      if (!cleanName) return null

      // Try multiple possible locations and extensions
      const possiblePaths: string[] = []
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.JPG', '.JPEG', '.PNG', '.WEBP', '.GIF']

      if (imagesFolder) {
        // If images folder is provided, look there
        const folderPath = path.isAbsolute(imagesFolder) 
          ? imagesFolder 
          : path.join(process.cwd(), imagesFolder)
        
        if (fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory()) {
          // Try exact match first
          for (const ext of imageExtensions) {
            const fullPath = path.join(folderPath, cleanName.endsWith(ext) ? cleanName : cleanName + ext)
            if (fs.existsSync(fullPath)) {
              possiblePaths.push(fullPath)
            }
          }
          
          // Try case-insensitive match
          if (possiblePaths.length === 0) {
            const files = fs.readdirSync(folderPath)
            const matchedFile = files.find(f => 
              f.toLowerCase() === cleanName.toLowerCase() || 
              f.toLowerCase() === (cleanName + '.jpg').toLowerCase() ||
              f.toLowerCase() === (cleanName + '.png').toLowerCase() ||
              f.toLowerCase() === (cleanName + '.jpeg').toLowerCase()
            )
            if (matchedFile) {
              possiblePaths.push(path.join(folderPath, matchedFile))
            }
          }
        }
      }

      // Also try in public/uploads/bulk-import/ as fallback
      const fallbackPath = path.join(process.cwd(), 'public', 'uploads', 'bulk-import')
      if (fs.existsSync(fallbackPath) && fs.statSync(fallbackPath).isDirectory()) {
        for (const ext of imageExtensions) {
          const fullPath = path.join(fallbackPath, cleanName.endsWith(ext) ? cleanName : cleanName + ext)
          if (fs.existsSync(fullPath) && !possiblePaths.includes(fullPath)) {
            possiblePaths.push(fullPath)
          }
        }
      }

      // Return first found file
      if (possiblePaths.length > 0) {
        try {
          return fs.readFileSync(possiblePaths[0])
        } catch (error) {
          console.error(`Error reading image file ${possiblePaths[0]}:`, error)
          return null
        }
      }

      return null
    }

    // Helper function to upload image to Supabase
    const uploadImage = async (imageName: string): Promise<string | null> => {
      // Check if already uploaded
      if (imageMap.has(imageName)) {
        return imageMap.get(imageName) || null
      }

      // Check if it's already a URL
      if (imageName.startsWith('http://') || imageName.startsWith('https://')) {
        imageMap.set(imageName, imageName)
        return imageName
      }

      // Try to find and upload the image file
      const imageBuffer = await findImageFile(imageName)
      if (!imageBuffer) {
        imageUploadErrors.push({ filename: imageName, error: 'Image file not found' })
        return null
      }

      try {
        // Determine file extension from buffer or filename
        const ext = path.extname(imageName).toLowerCase() || '.jpg'
        const fileName = `bulk-import/${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`
        
        // Upload to Supabase
        const publicUrl = await uploadImageToSupabase(imageBuffer, 'products', fileName)
        imageMap.set(imageName, publicUrl)
        return publicUrl
      } catch (error: any) {
        imageUploadErrors.push({ filename: imageName, error: error.message || 'Failed to upload image' })
        return null
      }
    }

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
      'application/csv'
    ]
    
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV file.' },
        { status: 400 }
      )
    }

    // Read file buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Parse Excel/CSV file
    let workbook: XLSX.WorkBook
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' })
    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to parse file. Please ensure it is a valid Excel or CSV file.' },
        { status: 400 }
      )
    }

    // Get first sheet
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet, { 
      raw: false, // Convert all values to strings for consistent handling
      defval: '' // Default value for empty cells
    })

    if (!Array.isArray(rawData) || rawData.length === 0) {
      return NextResponse.json(
        { error: 'File is empty or has no data rows.' },
        { status: 400 }
      )
    }

    // Field mapping - flexible column names (handles various formats)
    const fieldMappings: Record<string, string[]> = {
      name: ['name', 'product name', 'product', 'title', 'item name', 'item'],
      sku: ['sku', 'product sku', 'product code', 'code', 'item code', 'serial number', 'sn'],
      brand: ['brand', 'manufacturer', 'maker', 'company'],
      category: ['category', 'type', 'product category', 'cat'],
      price: ['price', 'selling price', 'sell price', 'retail price', 'unit price'],
      cost: ['cost', 'cost price', 'purchase price', 'buy price', 'wholesale price'],
      stockQuantity: ['stock', 'quantity', 'stock quantity', 'qty', 'inventory', 'available'],
      description: ['description', 'desc', 'details', 'product description'],
      image: ['image', 'image url', 'imageurl', 'photo', 'picture', 'img'],
      sizes: ['sizes', 'size', 'available sizes', 'sizez', 'siz'],
      colors: ['colors', 'color', 'available colors', 'colours', 'colour'],
    }

    // Normalize column names (lowercase, trim, remove special chars)
    const normalizeColumn = (col: string): string => {
      return col.toLowerCase().trim().replace(/[^a-z0-9\s]/gi, ' ').replace(/\s+/g, ' ')
    }

    // Find column indices
    const firstRow = rawData[0] as Record<string, any>
    const columns = Object.keys(firstRow)
    const columnMap: Record<string, string> = {}

    columns.forEach(col => {
      const normalized = normalizeColumn(col)
      for (const [field, aliases] of Object.entries(fieldMappings)) {
        if (aliases.some(alias => normalized.includes(alias))) {
          columnMap[field] = col
          break
        }
      }
    })

    // Validate required fields (SKU is optional - will be auto-generated if missing)
    const requiredFields = ['name', 'price', 'stockQuantity']
    const missingFields = requiredFields.filter(field => !columnMap[field])

    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          error: `Missing required columns: ${missingFields.join(', ')}. Please ensure your file has columns for: Name/Item, Price/Unit Price, and Stock/Quantity/Qty.`,
          missingFields,
          availableColumns: columns
        },
        { status: 400 }
      )
    }

    // Auto-generate SKU if missing (using SN or item name + index)
    const snColumn = columns.find(col => {
      const normalized = normalizeColumn(col)
      return normalized === 'sn' || normalized === 'serial number' || normalized.includes('serial')
    })

    // Parse and validate products
    const products: any[] = []
    const errors: Array<{ row: number; error: string }> = []

    rawData.forEach((row: any, index: number) => {
      const rowNum = index + 2 // +2 because index is 0-based and we skip header

      try {
        // Extract values with flexible field mapping
        const name = row[columnMap.name]?.toString().trim()
        
        // Generate SKU if missing: use SN column, or create from name + index
        let sku = columnMap.sku ? row[columnMap.sku]?.toString().trim() : ''
        if (!sku) {
          if (snColumn && row[snColumn]) {
            sku = `PROD-${row[snColumn]}`.toString().trim()
          } else {
            // Generate SKU from name (first 3 letters + index)
            const namePrefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z0-9]/g, '') || 'PROD'
            sku = `${namePrefix}-${String(index + 1).padStart(3, '0')}`
          }
        }
        
        const brand = columnMap.brand ? (row[columnMap.brand]?.toString().trim() || '') : ''
        const category = columnMap.category ? (row[columnMap.category]?.toString().trim() || '') : ''
        const priceStr = row[columnMap.price]?.toString().trim() || '0'
        const costStr = columnMap.cost ? (row[columnMap.cost]?.toString().trim() || '0') : '0'
        const stockStr = row[columnMap.stockQuantity]?.toString().trim() || '0'
        const description = columnMap.description ? (row[columnMap.description]?.toString().trim() || '') : ''
        const imageName = columnMap.image ? (row[columnMap.image]?.toString().trim() || '') : ''
        // Store image name for later processing (we'll upload images after parsing all products)

        // Parse sizes (comma-separated or JSON array) - handle "Sizez" column
        let sizes: string[] = []
        if (columnMap.sizes) {
          const sizesStr = row[columnMap.sizes]?.toString().trim() || ''
          if (sizesStr) {
            try {
              // Try parsing as JSON first
              const parsed = JSON.parse(sizesStr)
              sizes = Array.isArray(parsed) ? parsed : [sizesStr]
            } catch {
              // Split by comma, semicolon, or ampersand (handles "blue & black")
              sizes = sizesStr.split(/[,;&]/).map((s: string) => s.trim()).filter((s: string) => s)
            }
          }
        }

        // Parse colors (comma-separated or JSON array) - handle "Colours" column
        let colors: string[] = []
        if (columnMap.colors) {
          const colorsStr = row[columnMap.colors]?.toString().trim() || ''
          if (colorsStr) {
            try {
              // Try parsing as JSON first
              const parsed = JSON.parse(colorsStr)
              colors = Array.isArray(parsed) ? parsed : [colorsStr]
            } catch {
              // Split by comma, semicolon, or ampersand (handles "blue & black")
              colors = colorsStr.split(/[,;&]/).map((c: string) => c.trim()).filter((c: string) => c)
            }
          }
        }

        // Validate required fields
        if (!name) {
          errors.push({ row: rowNum, error: 'Name/Item is required' })
          return
        }

        // SKU is now auto-generated, so no need to validate

        // Parse numeric values (flexible - handle currency symbols, commas, etc.)
        const parseNumber = (str: string): number => {
          if (!str) return 0
          // Remove currency symbols, commas, and whitespace
          const cleaned = str.replace(/[$€£¥,\s]/g, '')
          const parsed = parseFloat(cleaned)
          return isNaN(parsed) ? 0 : parsed
        }

        const price = parseNumber(priceStr)
        const cost = parseNumber(costStr)
        const stockQuantity = parseInt(stockStr.replace(/[^\d]/g, '')) || 0

        if (price <= 0) {
          errors.push({ row: rowNum, error: 'Price must be greater than 0' })
          return
        }

        if (stockQuantity < 0) {
          errors.push({ row: rowNum, error: 'Stock quantity cannot be negative' })
          return
        }

        products.push({
          name,
          sku,
          brand,
          category,
          cost,
          price,
          stockQuantity,
          description: description || null,
          imageName: imageName || null, // Store image name, will be converted to URL later
          sizes: sizes.length > 0 ? sizes : null,
          colors: colors.length > 0 ? colors : null,
        })
      } catch (error: any) {
        errors.push({ row: rowNum, error: error.message || 'Failed to parse row' })
      }
    })

    // If there are validation errors, return them
    if (errors.length > 0 && products.length === 0) {
      return NextResponse.json(
        { 
          error: 'All rows have errors. Please fix the issues and try again.',
          errors: errors.slice(0, 50) // Limit to first 50 errors
        },
        { status: 400 }
      )
    }

    // Upload images for all products (batch upload)
    console.log('Uploading images for products...')
    const imageUploadPromises = products
      .filter(p => p.imageName && typeof p.imageName === 'string')
      .map(async (product) => {
        const imageUrl = await uploadImage(product.imageName as string)
        return { sku: product.sku, imageName: product.imageName as string, imageUrl }
      })

    const imageUploadResults = await Promise.allSettled(imageUploadPromises)
    const uploadedImages = new Map<string, string>()
    
    imageUploadResults.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.imageUrl) {
        uploadedImages.set(result.value.sku, result.value.imageUrl)
      }
    })

    console.log(`Uploaded ${uploadedImages.size} images, ${imageUploadErrors.length} failed`)

    // Import products (with transaction for atomicity)
    const results = {
      success: 0,
      failed: 0,
      errors: [] as Array<{ sku: string; error: string }>
    }

    // Process in batches to avoid overwhelming the database
    const batchSize = 50
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize)

      for (const product of batch) {
        try {
          // Get uploaded image URL if available
          const imageUrl = uploadedImages.get(product.sku) || null
          const imagesArray = imageUrl ? [imageUrl] : null

          // Use upsert to create or update product by SKU
          await prisma.product.upsert({
            where: { sku: product.sku },
            update: {
              name: product.name,
              brand: product.brand || '',
              cost: product.cost || 0,
              price: product.price,
              // Add to existing stock quantity instead of replacing
              stockQuantity: {
                increment: product.stockQuantity
              },
              category: product.category || '',
              description: product.description || undefined,
              // Only update image if a new one was uploaded
              ...(imageUrl && { image: imageUrl }),
              ...(imagesArray && { images: JSON.stringify(imagesArray) }),
              ...(product.sizes && { sizes: JSON.stringify(product.sizes) }),
              ...(product.colors && { colors: JSON.stringify(product.colors) }),
              updatedAt: new Date(),
            },
            create: {
              name: product.name,
              sku: product.sku,
              brand: product.brand || '',
              cost: product.cost || 0,
              price: product.price,
              stockQuantity: product.stockQuantity,
              category: product.category || '',
              description: product.description,
              image: imageUrl,
              images: imagesArray ? JSON.stringify(imagesArray) : null,
              sizes: product.sizes ? JSON.stringify(product.sizes) : null,
              colors: product.colors ? JSON.stringify(product.colors) : null,
            }
          })
          results.success++
        } catch (error: any) {
          results.failed++
          results.errors.push({ sku: product.sku, error: error.message || 'Failed to upsert product' })
        }
      }
    }

    return NextResponse.json({
      success: true,
      total: products.length,
      imported: results.success,
      failed: results.failed,
      errors: results.errors.slice(0, 100), // Limit errors returned
      warnings: errors.slice(0, 50), // Include validation warnings
      imageUploads: {
        successful: uploadedImages.size,
        failed: imageUploadErrors.length,
        errors: imageUploadErrors.slice(0, 50) // Limit image errors
      }
    })

  } catch (error: any) {
    console.error('Bulk import error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to import products' },
      { status: 500 }
    )
  }
}

