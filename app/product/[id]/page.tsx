"use client"

import { StoreHeader } from "@/components/store-header"
import { StoreFooter } from "@/components/store-footer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useState, use, useEffect } from "react"
import { ShoppingBag, Heart, Truck, Shield, Loader2, AlertCircle } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useToast } from "@/hooks/use-toast"
import { productsApi } from "@/lib/api-client"
import { notFound } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Product {
  id: string
  name: string
  sku: string
  brand: string
  price: number
  category: string
  stockQuantity: number
  description?: string
  image?: string
  images?: string[]
  sizes?: string[]
  colors?: string[]
  features?: string[]
}

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const { addItem } = useCart()
  const { toast } = useToast()

  // Fetch product from API
  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await productsApi.getById(resolvedParams.id)
        
        // Parse JSON fields
        const parsedProduct: Product = {
          ...data,
          images: data.images ? (Array.isArray(data.images) ? data.images : JSON.parse(data.images)) : [],
          sizes: data.sizes ? (Array.isArray(data.sizes) ? data.sizes : JSON.parse(data.sizes)) : [],
          colors: data.colors ? (Array.isArray(data.colors) ? data.colors : JSON.parse(data.colors)) : [],
          features: data.features ? (Array.isArray(data.features) ? data.features : JSON.parse(data.features)) : [],
        }
        
        setProduct(parsedProduct)
      } catch (err: any) {
        console.error("Failed to load product:", err)
        setError(err.message || "Failed to load product")
      } finally {
        setLoading(false)
      }
    }
    loadProduct()
  }, [resolvedParams.id])

  const [selectedSize, setSelectedSize] = useState<string>("")
  const [selectedColor, setSelectedColor] = useState<string>("")
  const [mainImage, setMainImage] = useState<string>("")

  // Initialize selected size/color and main image when product loads
  useEffect(() => {
    if (product) {
      if (product.sizes && product.sizes.length > 0) {
        setSelectedSize(product.sizes[0])
      }
      if (product.colors && product.colors.length > 0) {
        setSelectedColor(product.colors[0])
      }
      // Combine main image with additional images and set main image
      const allImages = product.image 
        ? [product.image, ...(product.images || [])] 
        : (product.images || [])
      if (allImages.length > 0) {
        setMainImage(allImages[0])
      }
    }
  }, [product])

  // Combine main image with additional images for display
  const allProductImages = product 
    ? (product.image ? [product.image, ...(product.images || [])] : (product.images || []))
    : []

  const isOutOfStock = product ? product.stockQuantity === 0 : false
  const isLowStock = product ? product.stockQuantity > 0 && product.stockQuantity < 10 : false

  const handleAddToCart = async () => {
    if (!product) return
    
    // Check stock before adding to cart
    if (isOutOfStock) {
      toast({
        title: "Out of Stock",
        description: "This product is currently out of stock.",
        variant: "destructive",
      })
      return
    }

    if (product.stockQuantity < 1) {
      toast({
        title: "Insufficient Stock",
        description: "Not enough stock available.",
        variant: "destructive",
      })
      return
    }

    // Verify current stock (in case it changed)
    try {
      const currentProduct = await productsApi.getById(product.id)
      if (currentProduct.stockQuantity < 1) {
        toast({
          title: "Out of Stock",
          description: "This product is no longer available.",
          variant: "destructive",
        })
        // Refresh product data
        setProduct({
          ...product,
          stockQuantity: currentProduct.stockQuantity
        })
        return
      }
    } catch (error) {
      // If verification fails, still allow adding (will be validated at checkout)
      console.warn("Could not verify stock, will validate at checkout")
    }

    addItem({
      id: product.id, // Use string ID from database
      productId: product.id, // Store database ID separately
      name: product.name,
      brand: product.brand,
      price: product.price,
      image: product.image || (product.images && product.images.length > 0 ? product.images[0] : "/placeholder.svg"),
      size: selectedSize || "",
      color: selectedColor || "",
      quantity: 1,
      stockQuantity: product.stockQuantity, // Store current stock for reference
    })

    toast({
      title: "Added to cart",
      description: `${product.name}${selectedSize ? ` (${selectedSize})` : ""}${selectedColor ? ` - ${selectedColor}` : ""}`,
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <StoreHeader />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
        <StoreFooter />
      </div>
    )
  }

  // Show error page for API errors
  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <StoreHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-light mb-2">Unable to Load Product</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={() => window.location.reload()}>Try Again</Button>
              <Button variant="outline" onClick={() => window.history.back()}>Go Back</Button>
            </div>
          </div>
        </main>
        <StoreFooter />
      </div>
    )
  }

  if (!product) {
    notFound()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <StoreHeader />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Product Images */}
            <div>
              <div className="aspect-[4/5] bg-muted rounded mb-4 overflow-hidden">
                <img src={mainImage || "/placeholder.svg"} alt={product.name} className="w-full h-full object-cover" />
              </div>
              {allProductImages.length > 1 && (
                <div className="grid grid-cols-3 gap-4">
                  {allProductImages.map((image, idx) => (
                    <button
                      key={idx}
                      onClick={() => setMainImage(image)}
                      className={`aspect-[4/5] bg-muted rounded overflow-hidden border-2 transition-colors ${
                        mainImage === image ? "border-primary" : "border-transparent hover:border-primary/50"
                      }`}
                    >
                      <img
                        src={image || "/placeholder.svg"}
                        alt={`View ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div>
              <p className="text-sm text-muted-foreground mb-2 tracking-wide">{product.brand.toUpperCase()}</p>
              <h1 className="font-serif text-4xl font-light tracking-wide mb-4">{product.name}</h1>
              <div className="flex items-center gap-4 mb-6">
                <p className="text-3xl font-light">${product.price.toFixed(2)}</p>
                {isOutOfStock && (
                  <Badge variant="destructive">OUT OF STOCK</Badge>
                )}
                {isLowStock && !isOutOfStock && (
                  <Badge variant="secondary">Only {product.stockQuantity} left</Badge>
                )}
              </div>

              {product.description && (
                <p className="text-muted-foreground font-light leading-relaxed mb-8">{product.description}</p>
              )}

              {/* Stock Status Alert */}
              {isOutOfStock && (
                <Alert variant="destructive" className="mb-6">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>This product is currently out of stock.</AlertDescription>
                </Alert>
              )}

              {/* Size Selection */}
              {product.sizes && product.sizes.length > 0 && (
                <div className="mb-6">
                  <Label className="text-sm font-medium tracking-wide mb-3 block">SIZE</Label>
                  <RadioGroup value={selectedSize} onValueChange={setSelectedSize} className="flex gap-2 flex-wrap">
                    {product.sizes.map((size) => (
                      <div key={size} className="relative">
                        <RadioGroupItem value={size} id={size} className="peer sr-only" />
                        <Label
                          htmlFor={size}
                          className="flex items-center justify-center px-4 py-2 border border-border rounded cursor-pointer hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground transition-colors"
                        >
                          {size}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {/* Color Selection */}
              {product.colors && product.colors.length > 0 && (
                <div className="mb-8">
                  <Label className="text-sm font-medium tracking-wide mb-3 block">COLOR: {selectedColor}</Label>
                  <RadioGroup value={selectedColor} onValueChange={setSelectedColor} className="flex gap-3">
                    {product.colors.map((color) => (
                      <div key={color} className="relative">
                        <RadioGroupItem value={color} id={color} className="peer sr-only" />
                        <Label
                          htmlFor={color}
                          className="flex items-center justify-center px-6 py-2 border border-border rounded cursor-pointer hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground transition-colors"
                        >
                          {color}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-4 mb-8">
                <Button 
                  size="lg" 
                  className="flex-1" 
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                >
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  {isOutOfStock ? "OUT OF STOCK" : "ADD TO CART"}
                </Button>
                <Button size="lg" variant="outline">
                  <Heart className="h-5 w-5" />
                </Button>
              </div>

              {/* Features */}
              {product.features && product.features.length > 0 && (
                <Card className="p-6 bg-muted border-0 mb-6">
                  <h3 className="text-sm font-medium tracking-wide mb-4">PRODUCT DETAILS</h3>
                  <ul className="space-y-2">
                    {product.features.map((feature, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground font-light flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Stock Information */}
              <Card className="p-6 bg-muted border-0 mb-6">
                <h3 className="text-sm font-medium tracking-wide mb-4">AVAILABILITY</h3>
                <p className="text-sm text-muted-foreground font-light">
                  {isOutOfStock 
                    ? "This product is currently out of stock."
                    : `In stock: ${product.stockQuantity} available`}
                </p>
                <p className="text-xs text-muted-foreground mt-2">SKU: {product.sku}</p>
              </Card>

              {/* Additional Info */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Truck className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Free Express Shipping</p>
                    <p className="text-sm text-muted-foreground font-light">Complimentary delivery on all orders</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">30-Day Returns</p>
                    <p className="text-sm text-muted-foreground font-light">Free returns within 30 days of purchase</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <StoreFooter />
    </div>
  )
}
