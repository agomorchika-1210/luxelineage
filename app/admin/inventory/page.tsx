"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Plus, Edit, Trash2, Loader2, Minus, Package, Upload, X, Image as ImageIcon, FileSpreadsheet, Download } from "lucide-react"
import { useState, useEffect } from "react"
import { productsApi } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import productCategoriesData from "@/lib/product-categories.json"
import { sizeCategories, getSizesForCategory, type SizeStandard } from "@/lib/size-standards"
import { allColors, colorFamilies, type Color } from "@/lib/color-palette"
import { BulkImportDialog } from "@/components/bulk-import-dialog"
import * as XLSX from "xlsx"

interface Product {
  id: string
  name: string
  sku: string
  brand: string
  category: string
  price: number
  stockQuantity: number
  description?: string
  image?: string
  sizes?: string[]
  colors?: string[]
}

export default function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [products, setProducts] = useState<Product[]>([])
  const [totalProducts, setTotalProducts] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(25)
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [stockAdjustProduct, setStockAdjustProduct] = useState<Product | null>(null)
  const [stockAdjustQuantity, setStockAdjustQuantity] = useState("")
  const [stockAdjustAction, setStockAdjustAction] = useState<"increase" | "decrease">("increase")
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    brand: "",
    category: "",
    cost: "",
    price: "",
    stockQuantity: "",
    lowStockThreshold: "",
    description: "",
    image: "",
    sizes: [] as string[],
    colors: [] as string[],
  })
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [savingProduct, setSavingProduct] = useState(false)
  const [selectedSizeCategory, setSelectedSizeCategory] = useState<string>("Clothing")
  const [isCustomBrand, setIsCustomBrand] = useState(false)
  const [customBrand, setCustomBrand] = useState("")
  const [isCustomCategory, setIsCustomCategory] = useState(false)
  const [customCategory, setCustomCategory] = useState("")
  const [adjustingStock, setAdjustingStock] = useState<string | null>(null) // Track which product is being adjusted
  const [adjustingStockDialog, setAdjustingStockDialog] = useState(false) // Track dialog stock adjustment
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery.trim()), 250)
    return () => clearTimeout(t)
  }, [searchQuery])

  useEffect(() => {
    // Reset to first page whenever the query changes
    setPage(1)
  }, [debouncedQuery])

  useEffect(() => {
    loadProducts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, page])

  const loadProducts = async () => {
    try {
      setLoading(true)
      const data = await productsApi.list({
        q: debouncedQuery || undefined,
        page,
        pageSize,
      })
      setProducts(data.items)
      setTotalProducts(data.total)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load products",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getStockStatus = (stock: number, threshold?: number) => {
    if (stock === 0) return "Out of Stock"
    const lowThreshold = threshold || 10
    if (stock <= lowThreshold) return "Low Stock"
    return "In Stock"
  }

  // Detect size category based on product category
  const detectSizeCategory = (category: string): string => {
    const lowerCategory = category.toLowerCase()
    if (lowerCategory.includes('shoe') || lowerCategory.includes('footwear')) {
      return 'Shoes'
    }
    if (lowerCategory.includes('shirt') && (lowerCategory.includes('men') || lowerCategory.includes("men's"))) {
      return "Men's Shirts"
    }
    if (lowerCategory.includes('pant') || lowerCategory.includes('trouser') || lowerCategory.includes('jean')) {
      return 'Pants Waist'
    }
    return 'Clothing' // Default
  }

  const handleOpenDialog = (product?: Product) => {
    if (product) {
      setEditingProduct(product)
      // Handle sizes and colors - they might be arrays or JSON strings
      const sizes = Array.isArray(product.sizes) 
        ? product.sizes 
        : (typeof product.sizes === 'string' ? JSON.parse(product.sizes || '[]') : [])
      const colors = Array.isArray(product.colors)
        ? product.colors
        : (typeof product.colors === 'string' ? JSON.parse(product.colors || '[]') : [])
      
      // Detect size category based on product category
      const detectedCategory = detectSizeCategory(product.category || "")
      setSelectedSizeCategory(detectedCategory)
      
      // Handle images - they might be arrays or JSON strings
      const images = Array.isArray((product as any).images)
        ? (product as any).images
        : (typeof (product as any).images === 'string' ? JSON.parse((product as any).images || '[]') : [])
      
      // Combine main image with additional images
      const allImages = product.image ? [product.image, ...images] : images
      
      setFormData({
        name: product.name,
        sku: product.sku,
        brand: product.brand || "",
        category: product.category || "",
        cost: (product as any).cost?.toString() || "0",
        price: product.price.toString(),
        stockQuantity: product.stockQuantity.toString(),
        lowStockThreshold: ((product as any).lowStockThreshold || 10).toString(),
        description: product.description || "",
        image: product.image || "",
        sizes: sizes,
        colors: colors,
      })
      setIsCustomBrand(false)
      setCustomBrand(product.brand || "")
      setIsCustomCategory(false)
      setCustomCategory(product.category || "")
      setExistingImages(allImages)
      setImagePreviews([])
      setImageFiles([])
    } else {
      setEditingProduct(null)
      setSelectedSizeCategory("Clothing") // Reset to default
      setFormData({
        name: "",
        sku: "",
        brand: "",
        category: "",
        cost: "",
        price: "",
        stockQuantity: "",
        lowStockThreshold: "10",
        description: "",
        image: "",
        sizes: [],
        colors: [],
      })
      setIsCustomBrand(false)
      setCustomBrand("")
      setIsCustomCategory(false)
      setCustomCategory("")
      setExistingImages([])
      setImagePreviews([])
      setImageFiles([])
    }
    setIsDialogOpen(true)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const validFiles: File[] = []
    const invalidFiles: string[] = []

    files.forEach((file) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        invalidFiles.push(`${file.name}: Invalid file type`)
        return
      }
      
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        invalidFiles.push(`${file.name}: File too large (max 5MB)`)
        return
      }

      validFiles.push(file)
    })

    if (invalidFiles.length > 0) {
      toast({
        title: "Some files were rejected",
        description: invalidFiles.join(', '),
        variant: "destructive",
      })
    }

    if (validFiles.length > 0) {
      const newFiles = [...imageFiles, ...validFiles]
      setImageFiles(newFiles)
      
      // Create previews for new files
      const previewPromises = validFiles.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            resolve(reader.result as string)
          }
          reader.readAsDataURL(file)
        })
      })
      
      Promise.all(previewPromises).then((newPreviews) => {
        setImagePreviews((prev) => [...prev, ...newPreviews])
      })
    }

    // Reset input
    e.target.value = ''
  }

  const handleRemoveImage = (index: number, isExisting: boolean) => {
    if (isExisting) {
      const newExisting = existingImages.filter((_, i) => i !== index)
      setExistingImages(newExisting)
      // Update main image if we removed the first one
      if (index === 0 && newExisting.length > 0) {
        setFormData({ ...formData, image: newExisting[0] })
      } else if (newExisting.length === 0) {
        setFormData({ ...formData, image: "" })
      }
    } else {
      const newFiles = imageFiles.filter((_, i) => i !== index)
      const newPreviews = imagePreviews.filter((_, i) => i !== index)
      setImageFiles(newFiles)
      setImagePreviews(newPreviews)
    }
  }

  const handleSaveProduct = async () => {
    // Prevent double submission
    if (savingProduct || uploadingImage) {
      console.log('Already saving or uploading, ignoring request')
      return
    }

    try {
      setSavingProduct(true)
      
      if (!formData.name || !formData.sku || !formData.price || !formData.stockQuantity) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        })
        setSavingProduct(false)
        return
      }

      // Validate cost and price
      const cost = parseFloat(formData.cost || "0")
      const price = parseFloat(formData.price)
      if (cost < 0 || price < 0) {
        toast({
          title: "Validation Error",
          description: "Cost and price must be positive numbers",
          variant: "destructive",
        })
        setSavingProduct(false)
        return
      }
      if (cost > price) {
        toast({
          title: "Warning",
          description: "Cost is higher than selling price. This will result in a loss.",
          variant: "destructive",
        })
        // Continue anyway, just warn the user
      }

      // Upload all new images
      const uploadedImageUrls: string[] = []
      
      if (imageFiles.length > 0) {
        setUploadingImage(true)
        try {
          for (const imageFile of imageFiles) {
            const form = new FormData()
            form.append("image", imageFile)
            form.append("folder", "products")

            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 30000)
            try {
              const res = await fetch("/api/images/upload", {
                method: "POST",
                body: form,
                signal: controller.signal,
              })

              if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error(err.error || `Upload failed (HTTP ${res.status})`)
              }

              const json = await res.json()
              if (!json?.url) {
                throw new Error("Upload failed - missing URL in response")
              }
              uploadedImageUrls.push(json.url)
            } finally {
              clearTimeout(timeoutId)
            }
          }

          toast({
            title: "Images uploaded",
            description: `${uploadedImageUrls.length} image(s) uploaded successfully`,
          })
        } catch (error: any) {
          toast({
            title: "Upload failed",
            description: error.message || "Failed to upload images. Please try again.",
            variant: "destructive",
          })
          setUploadingImage(false)
          setSavingProduct(false)
          return
        } finally {
          setUploadingImage(false)
        }
      }

      // Combine existing images with newly uploaded ones
      const allImages = [...existingImages, ...uploadedImageUrls]
      // First image is the main image, rest are additional images
      const mainImage = allImages.length > 0 ? allImages[0] : formData.image
      const additionalImages = allImages.length > 1 ? allImages.slice(1) : []

      const productData = {
        ...formData,
        image: mainImage,
        images: additionalImages.length > 0 ? additionalImages : [],
        cost: parseFloat(formData.cost || "0"),
        price: parseFloat(formData.price),
        stockQuantity: parseInt(formData.stockQuantity),
        lowStockThreshold: parseInt(formData.lowStockThreshold || "10"),
        // Send as arrays - API will stringify them
        sizes: formData.sizes.length > 0 ? formData.sizes : [],
        colors: formData.colors.length > 0 ? formData.colors : [],
      }

      console.log('Saving product:', { editing: !!editingProduct, productData })

      if (editingProduct) {
        await productsApi.update(editingProduct.id, productData)
        toast({
          title: "Success",
          description: "Product updated successfully",
        })
      } else {
        await productsApi.create(productData)
        toast({
          title: "Success",
          description: "Product created successfully",
        })
      }
      setIsDialogOpen(false)
      await loadProducts()
    } catch (error: any) {
      console.error('Product save error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to save product",
        variant: "destructive",
      })
    } finally {
      // Ensure all loading states are reset
      setUploadingImage(false)
      setSavingProduct(false)
    }
  }

  // Get all categories from the JSON data
  const getAllCategories = () => {
    const categories: string[] = []
    productCategoriesData.categories.forEach((cat: any) => {
      categories.push(cat.name)
      cat.subcategories.forEach((sub: any) => {
        categories.push(`${cat.name} - ${sub.name}`)
      })
    })
    return categories
  }

  const handleDeleteProduct = async () => {
    if (!deletingProduct) return
    
    try {
      await productsApi.delete(deletingProduct.id)
      toast({
        title: "Success",
        description: "Product deleted successfully",
      })
      setIsDeleteDialogOpen(false)
      setDeletingProduct(null)
      loadProducts()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete product",
        variant: "destructive",
      })
    }
  }

  const handleOpenDeleteDialog = (product: Product) => {
    setDeletingProduct(product)
    setIsDeleteDialogOpen(true)
  }

  const handleOpenStockDialog = (product: Product, action: "increase" | "decrease") => {
    setStockAdjustProduct(product)
    setStockAdjustAction(action)
    setStockAdjustQuantity("")
    setIsStockDialogOpen(true)
  }

  const handleAdjustStock = async () => {
    if (!stockAdjustProduct || !stockAdjustQuantity || adjustingStockDialog) return
    
    const quantity = parseInt(stockAdjustQuantity)
    if (isNaN(quantity) || quantity <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid quantity",
        variant: "destructive",
      })
      return
    }

    try {
      setAdjustingStockDialog(true)
      // Optimistic UI update with rollback
      const prev = products
      setProducts((current) =>
        current.map((p) => {
          if (p.id !== stockAdjustProduct.id) return p
          const nextStock =
            stockAdjustAction === "increase"
              ? p.stockQuantity + quantity
              : Math.max(0, p.stockQuantity - quantity)
          return { ...p, stockQuantity: nextStock }
        }),
      )

      const updated = await productsApi.updateStock(stockAdjustProduct.id, stockAdjustAction, quantity)
      if (updated?.id) {
        setProducts((current) => current.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)))
      }
      toast({
        title: "Success",
        description: `Stock ${stockAdjustAction}d by ${quantity}`,
      })
      setIsStockDialogOpen(false)
      setStockAdjustProduct(null)
    } catch (error: any) {
      // Rollback optimistic update
      await loadProducts()
      toast({
        title: "Error",
        description: error.message || "Failed to adjust stock",
        variant: "destructive",
      })
    } finally {
      setAdjustingStockDialog(false)
    }
  }

  const handleQuickStockAdjust = async (product: Product, action: "increase" | "decrease", quantity: number = 1) => {
    // Prevent double-clicks while adjusting
    if (adjustingStock === product.id) return
    
    try {
      setAdjustingStock(product.id)
      // Optimistic UI update with rollback
      const prevStock = product.stockQuantity
      setProducts((current) =>
        current.map((p) => {
          if (p.id !== product.id) return p
          const nextStock = action === "increase" ? p.stockQuantity + quantity : Math.max(0, p.stockQuantity - quantity)
          return { ...p, stockQuantity: nextStock }
        }),
      )

      const updated = await productsApi.updateStock(product.id, action, quantity)
      if (updated?.id) {
        setProducts((current) => current.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)))
      }
      toast({
        title: "Success",
        description: `Stock ${action}d by ${quantity}`,
      })
    } catch (error: any) {
      await loadProducts()
      toast({
        title: "Error",
        description: error.message || "Failed to adjust stock",
        variant: "destructive",
      })
    } finally {
      setAdjustingStock(null)
    }
  }

  const handleExportProducts = () => {
    try {
      // Export should include the whole catalog (not just current page).
      // We'll fetch the full list via the legacy endpoint which returns an array.
      // Note: for huge catalogs this should become a server-generated export.
      void (async () => {
        const all = await productsApi.getAll()
        const exportData = (all as any[]).map(product => ({
        'Product Name': product.name,
        'SKU': product.sku,
        'Brand': product.brand || '',
        'Category': product.category || '',
        'Price': product.price,
        'Cost': (product as any).cost || 0,
        'Stock': product.stockQuantity,
        'Description': product.description || '',
        'Image URL': product.image || '',
        'Sizes': product.sizes && Array.isArray(product.sizes) ? product.sizes.join(', ') : '',
        'Colors': product.colors && Array.isArray(product.colors) ? product.colors.join(', ') : '',
      }))

      // Create workbook and worksheet
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Products')

      // Generate filename with timestamp
      const filename = `products-export-${new Date().toISOString().split('T')[0]}.xlsx`

      // Download file
      XLSX.writeFile(wb, filename)

      toast({
        title: "Export successful",
        description: `Exported ${exportData.length} products to ${filename}`,
      })
      })()
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.message || "Failed to export products",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-wide">Inventory Management</h1>
          <p className="text-sm text-muted-foreground mt-1">{totalProducts} total products</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportProducts} disabled={products.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={() => setIsBulkImportOpen(true)}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Bulk Import
          </Button>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, SKU, or brand..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">SKU</th>
                  <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                    PRODUCT
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">BRAND</th>
                  <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                    CATEGORY
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">STOCK</th>
                  <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">PRICE</th>
                  <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                    STATUS
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      No products found
                    </td>
                  </tr>
                ) : (
                  products.map((item) => (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="py-3 px-4 text-sm font-mono">{item.sku}</td>
                      <td className="py-3 px-4 text-sm font-light">{item.name}</td>
                      <td className="py-3 px-4 text-sm font-light">{item.brand}</td>
                      <td className="py-3 px-4 text-sm font-light">{item.category}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleQuickStockAdjust(item, "decrease")}
                            disabled={item.stockQuantity === 0 || adjustingStock === item.id}
                          >
                            {adjustingStock === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Minus className="h-3 w-3" />
                            )}
                          </Button>
                          <span 
                            className="text-sm font-medium min-w-[40px] text-center cursor-pointer hover:text-primary"
                            onClick={() => handleOpenStockDialog(item, "increase")}
                            title="Click to adjust stock"
                          >
                            {item.stockQuantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleQuickStockAdjust(item, "increase")}
                            disabled={adjustingStock === item.id}
                          >
                            {adjustingStock === item.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Plus className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm font-light">${item.price}</td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            getStockStatus(item.stockQuantity, (item as any).lowStockThreshold) === "In Stock"
                              ? "default"
                              : getStockStatus(item.stockQuantity, (item as any).lowStockThreshold) === "Low Stock"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {getStockStatus(item.stockQuantity, (item as any).lowStockThreshold)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenStockDialog(item, "increase")}
                            title="Adjust Stock"
                          >
                            <Package className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleOpenDialog(item)}
                            title="Edit Product"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleOpenDeleteDialog(item)}
                            title="Delete Product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Page {page} of {Math.max(1, Math.ceil(totalProducts / pageSize))}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(totalProducts / pageSize)}
          >
            Next
          </Button>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[50vw] w-[50vw] max-h-[90vh] overflow-y-auto md:max-w-[90vw] md:w-[90vw] sm:max-w-[95vw] sm:w-[95vw]">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
            <DialogDescription>
              {editingProduct ? "Update product information" : "Create a new product"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Tailored Wool Blazer"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="WB-001"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Select
                  value={isCustomBrand ? "custom" : (formData.brand || "")}
                  onValueChange={(value) => {
                    if (value === "custom") {
                      setIsCustomBrand(true)
                      setCustomBrand(formData.brand || customBrand)
                      setFormData({ ...formData, brand: customBrand || formData.brand || "" })
                      return
                    }
                    setIsCustomBrand(false)
                    setCustomBrand("")
                    setFormData({ ...formData, brand: value })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {productCategoriesData.commonBrands.map((brand: string) => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom...</SelectItem>
                  </SelectContent>
                </Select>
                {isCustomBrand && (
                  <Input
                    placeholder="Enter custom brand"
                    value={formData.brand}
                    onChange={(e) => {
                      setCustomBrand(e.target.value)
                      setFormData({ ...formData, brand: e.target.value })
                    }}
                    className="mt-2"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={isCustomCategory ? "custom" : (formData.category || "")}
                  onValueChange={(value) => {
                    if (value === "custom") {
                      setIsCustomCategory(true)
                      const current = formData.category || customCategory || ""
                      setCustomCategory(current)
                      const detectedSizeCategory = detectSizeCategory(current)
                      setSelectedSizeCategory(detectedSizeCategory)
                      setFormData({ ...formData, category: current })
                      return
                    }
                    setIsCustomCategory(false)
                    setCustomCategory("")
                    const detectedSizeCategory = detectSizeCategory(value)
                    setSelectedSizeCategory(detectedSizeCategory)
                    setFormData({ ...formData, category: value })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAllCategories().map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom...</SelectItem>
                  </SelectContent>
                </Select>
                {isCustomCategory && (
                  <Input
                    placeholder="Enter custom category"
                    value={formData.category}
                    onChange={(e) => {
                      const detectedSizeCategory = detectSizeCategory(e.target.value)
                      setSelectedSizeCategory(detectedSizeCategory)
                      setCustomCategory(e.target.value)
                      setFormData({ ...formData, category: e.target.value })
                    }}
                    className="mt-2"
                  />
                )}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cost">Cost Price *</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  placeholder="450.00"
                />
                <p className="text-xs text-muted-foreground">What you paid for it</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Selling Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="899.00"
                />
                <p className="text-xs text-muted-foreground">What you sell it for</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stockQuantity">Stock Quantity *</Label>
                <Input
                  id="stockQuantity"
                  type="number"
                  value={formData.stockQuantity}
                  onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                  placeholder="45"
                />
                {formData.cost && formData.price && parseFloat(formData.price) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Profit: ${(parseFloat(formData.price) - parseFloat(formData.cost || "0")).toFixed(2)} 
                    ({((parseFloat(formData.price) - parseFloat(formData.cost || "0")) / parseFloat(formData.price) * 100).toFixed(1)}%)
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lowStockThreshold">Low Stock Threshold</Label>
                <Input
                  id="lowStockThreshold"
                  type="number"
                  value={formData.lowStockThreshold}
                  onChange={(e) => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                  placeholder="10"
                />
                <p className="text-xs text-muted-foreground">
                  Alert when stock falls below this number
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Product Images</Label>
              <p className="text-xs text-muted-foreground mb-2">
                First image will be used as the main product image. You can upload multiple images.
              </p>
              
              {/* Existing Images Gallery */}
              {existingImages.length > 0 && (
                <div className="space-y-2 mb-4">
                  <Label className="text-sm">Current Images ({existingImages.length})</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {existingImages.map((image, index) => (
                      <div key={`existing-${index}`} className="relative group">
                        <div className="relative aspect-square border rounded-lg overflow-hidden bg-muted">
                          <img
                            src={image}
                            alt={`Product image ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {index === 0 && (
                            <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded">
                              Main
                            </div>
                          )}
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveImage(index, true)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Image Previews */}
              {imagePreviews.length > 0 && (
                <div className="space-y-2 mb-4">
                  <Label className="text-sm">New Images ({imagePreviews.length})</Label>
                  <div className="grid grid-cols-4 gap-2">
                    {imagePreviews.map((preview, index) => (
                      <div key={`preview-${index}`} className="relative group">
                        <div className="relative aspect-square border rounded-lg overflow-hidden bg-muted">
                          <img
                            src={preview}
                            alt={`New image ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleRemoveImage(index, false)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Area */}
              <div className="border-2 border-dashed rounded-lg p-6">
                <div className="flex flex-col items-center justify-center space-y-4">
                  <ImageIcon className="h-12 w-12 text-muted-foreground" />
                  <div className="text-center">
                    <Label
                      htmlFor="image-upload"
                      className="cursor-pointer"
                    >
                      <Button type="button" variant="outline" asChild>
                        <span>
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Images
                        </span>
                      </Button>
                    </Label>
                    <input
                      id="image-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      PNG, JPG, WEBP up to 5MB each. You can select multiple files.
                    </p>
                  </div>
                </div>
              </div>

              {/* Fallback: Image URL input */}
              {existingImages.length === 0 && imagePreviews.length === 0 && (
                <div className="space-y-2 mt-2">
                  <Label htmlFor="image-url">Or enter image URL</Label>
                  <Input
                    id="image-url"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="size-category">Size Category</Label>
                  <Label htmlFor="sizes">Selected: {formData.sizes.length} sizes</Label>
                </div>
                <Select
                  value={selectedSizeCategory}
                  onValueChange={(value) => {
                    setSelectedSizeCategory(value)
                    // Clear selected sizes when category changes
                    setFormData({ ...formData, sizes: [] })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select size category" />
                  </SelectTrigger>
                  <SelectContent>
                    {sizeCategories.map((category) => (
                      <SelectItem key={category.name} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="space-y-2 mt-2 max-h-48 overflow-y-auto border rounded-md p-2">
                  <Label className="text-xs text-muted-foreground">Select Sizes (EU / UK / US)</Label>
                  {getSizesForCategory(selectedSizeCategory).map((size) => {
                    const isSelected = formData.sizes.includes(size.display)
                    return (
                      <div key={size.display} className="flex items-center space-x-2">
                        <Checkbox
                          id={`size-${size.display}`}
                          checked={isSelected}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                sizes: [...formData.sizes, size.display]
                              })
                            } else {
                              setFormData({
                                ...formData,
                                sizes: formData.sizes.filter(s => s !== size.display)
                              })
                            }
                          }}
                        />
                        <label
                          htmlFor={`size-${size.display}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {size.display}
                        </label>
                      </div>
                    )
                  })}
                </div>
                {formData.sizes.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.sizes.map((size) => (
                      <Badge key={size} variant="secondary" className="text-xs">
                        {size}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              sizes: formData.sizes.filter(s => s !== size)
                            })
                          }}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="colors">Colors ({formData.colors.length} selected)</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                  <div className="space-y-2">
                    {colorFamilies.map((family) => (
                      <div key={family.name} className="space-y-1">
                        <Label className="text-xs font-semibold text-muted-foreground">
                          {family.name}
                        </Label>
                        <div className="grid grid-cols-2 gap-1">
                          {family.colors.map((color) => {
                            const isSelected = formData.colors.includes(color.name)
                            return (
                              <div key={color.name} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`color-${color.name}`}
                                  checked={isSelected}
                                  onCheckedChange={(checked) => {
                                    if (checked) {
                                      setFormData({
                                        ...formData,
                                        colors: [...formData.colors, color.name]
                                      })
                                    } else {
                                      setFormData({
                                        ...formData,
                                        colors: formData.colors.filter(c => c !== color.name)
                                      })
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={`color-${color.name}`}
                                  className="text-sm font-normal cursor-pointer flex items-center gap-1"
                                >
                                  {color.hex && (
                                    <span
                                      className="w-4 h-4 rounded border"
                                      style={{ backgroundColor: color.hex }}
                                    />
                                  )}
                                  {color.name}
                                </label>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {formData.colors.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {formData.colors.map((color) => {
                      const colorObj = allColors.find(c => c.name === color)
                      return (
                        <Badge key={color} variant="secondary" className="text-xs flex items-center gap-1">
                          {colorObj?.hex && (
                            <span
                              className="w-3 h-3 rounded border"
                              style={{ backgroundColor: colorObj.hex }}
                            />
                          )}
                          {color}
                          <button
                            type="button"
                            onClick={() => {
                              setFormData({
                                ...formData,
                                colors: formData.colors.filter(c => c !== color)
                              })
                            }}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product description..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveProduct} disabled={uploadingImage || savingProduct}>
              {uploadingImage ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading Image...
                </>
              ) : savingProduct ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving Product...
                </>
              ) : (
                editingProduct ? "Update Product" : "Create Product"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingProduct?.name}"? This action cannot be undone.
              {deletingProduct && deletingProduct.stockQuantity > 0 && (
                <span className="block mt-2 text-amber-600 dark:text-amber-400">
                  Warning: This product still has {deletingProduct.stockQuantity} items in stock.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingProduct(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adjust Stock</DialogTitle>
            <DialogDescription>
              {stockAdjustProduct && (
                <>
                  Adjust stock for "{stockAdjustProduct.name}"
                  <br />
                  Current stock: <strong>{stockAdjustProduct.stockQuantity}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Button
                variant={stockAdjustAction === "increase" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setStockAdjustAction("increase")}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Stock
              </Button>
              <Button
                variant={stockAdjustAction === "decrease" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setStockAdjustAction("decrease")}
              >
                <Minus className="h-4 w-4 mr-2" />
                Remove Stock
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stockAdjustQuantity">Quantity</Label>
              <Input
                id="stockAdjustQuantity"
                type="number"
                min="1"
                value={stockAdjustQuantity}
                onChange={(e) => setStockAdjustQuantity(e.target.value)}
                placeholder="Enter quantity"
              />
            </div>
            {stockAdjustAction === "decrease" && stockAdjustProduct && stockAdjustQuantity && (
              <p className="text-sm text-muted-foreground">
                New stock will be: <strong>{Math.max(0, stockAdjustProduct.stockQuantity - parseInt(stockAdjustQuantity || "0"))}</strong>
              </p>
            )}
            {stockAdjustAction === "increase" && stockAdjustProduct && stockAdjustQuantity && (
              <p className="text-sm text-muted-foreground">
                New stock will be: <strong>{stockAdjustProduct.stockQuantity + parseInt(stockAdjustQuantity || "0")}</strong>
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStockDialogOpen(false)} disabled={adjustingStockDialog}>
              Cancel
            </Button>
            <Button onClick={handleAdjustStock} disabled={!stockAdjustQuantity || adjustingStockDialog}>
              {adjustingStockDialog ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adjusting...
                </>
              ) : (
                `${stockAdjustAction === "increase" ? "Add" : "Remove"} Stock`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={isBulkImportOpen}
        onOpenChange={setIsBulkImportOpen}
        onImportComplete={() => {
          loadProducts()
          setIsBulkImportOpen(false)
        }}
      />
    </div>
  )
}

