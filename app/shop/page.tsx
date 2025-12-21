"use client"

import { StoreHeader } from "@/components/store-header"
import { StoreFooter } from "@/components/store-footer"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { SlidersHorizontal, Loader2 } from "lucide-react"
import { productsApi } from "@/lib/api-client"

interface Product {
  id: string
  name: string
  sku: string
  brand: string
  price: number
  category: string
  stockQuantity: number
  image?: string
  images?: string[]
}

function ShopContent() {
  const searchParams = useSearchParams()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)

  // Fetch products from API
  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true)
        const data = await productsApi.getAll()
        setProducts(data)
      } catch (error) {
        console.error("Failed to load products:", error)
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [])

  // Initialize filters from URL parameters
  useEffect(() => {
    const categoryParam = searchParams.get("category")
    const brandParam = searchParams.get("brand")

    if (categoryParam && products.length > 0) {
      const decodedCategory = decodeURIComponent(categoryParam)
      const availableCategories = [...new Set(products.map(p => p.category))]
      if (availableCategories.includes(decodedCategory)) {
        setSelectedCategories([decodedCategory])
      }
    }

    if (brandParam && products.length > 0) {
      const decodedBrand = decodeURIComponent(brandParam)
      const availableBrands = [...new Set(products.map(p => p.brand))]
      if (availableBrands.includes(decodedBrand)) {
        setSelectedBrands([decodedBrand])
      }
    }
  }, [searchParams, products])

  // Extract unique categories and brands from products
  const categories = [...new Set(products.map(p => p.category))].sort()
  const brands = [...new Set(products.map(p => p.brand))].sort()

  // Filter products based on selected categories and brands
  const filteredProducts = products.filter((product) => {
    const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(product.category)
    const brandMatch = selectedBrands.length === 0 || selectedBrands.includes(product.brand)
    return categoryMatch && brandMatch
  })

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    )
  }

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) => (prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]))
  }

  return (
    <div className="min-h-screen flex flex-col">
      <StoreHeader />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="font-serif text-4xl font-light tracking-wide mb-2">Shop Collection</h1>
            <p className="text-muted-foreground font-light">{filteredProducts.length} products available</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Filters Sidebar */}
            <aside className="lg:w-64 flex-shrink-0">
              <div className="lg:sticky lg:top-20">
                <div className="flex items-center justify-between mb-6 lg:hidden">
                  <h2 className="text-lg font-medium tracking-wide">FILTERS</h2>
                  <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    {showFilters ? "Hide" : "Show"}
                  </Button>
                </div>

                <div className={`space-y-8 ${showFilters ? "block" : "hidden lg:block"}`}>
                  {/* Categories Filter */}
                  <div>
                    <h3 className="text-sm font-medium tracking-wide mb-4">CATEGORIES</h3>
                    <div className="space-y-3">
                      {categories.map((category) => (
                        <div key={category} className="flex items-center gap-2">
                          <Checkbox
                            id={category}
                            checked={selectedCategories.includes(category)}
                            onCheckedChange={() => toggleCategory(category)}
                          />
                          <Label htmlFor={category} className="text-sm font-light cursor-pointer">
                            {category}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Brands Filter */}
                  <div>
                    <h3 className="text-sm font-medium tracking-wide mb-4">BRANDS</h3>
                    <div className="space-y-3">
                      {brands.map((brand) => (
                        <div key={brand} className="flex items-center gap-2">
                          <Checkbox
                            id={brand}
                            checked={selectedBrands.includes(brand)}
                            onCheckedChange={() => toggleBrand(brand)}
                          />
                          <Label htmlFor={brand} className="text-sm font-light cursor-pointer">
                            {brand}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Clear Filters */}
                  {(selectedCategories.length > 0 || selectedBrands.length > 0) && (
                    <Button
                      variant="outline"
                      className="w-full bg-transparent"
                      onClick={() => {
                        setSelectedCategories([])
                        setSelectedBrands([])
                      }}
                    >
                      Clear All Filters
                    </Button>
                  )}
                </div>
              </div>
            </aside>

            {/* Products Grid */}
            <div className="flex-1">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProducts.map((product) => {
                      const productImage = product.image || (product.images && product.images.length > 0 ? product.images[0] : "/placeholder.svg")
                      const isOutOfStock = product.stockQuantity === 0
                      
                      return (
                        <Link key={product.id} href={`/product/${product.id}`}>
                          <Card className={`group overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300 ${isOutOfStock ? 'opacity-60' : ''}`}>
                            <div className="aspect-[4/5] overflow-hidden bg-muted relative">
                              <img
                                src={productImage}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                              {isOutOfStock && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <Badge variant="destructive" className="text-sm">OUT OF STOCK</Badge>
                                </div>
                              )}
                            </div>
                            <div className="p-6">
                              <p className="text-xs text-muted-foreground mb-2 tracking-wide">
                                {product.brand.toUpperCase()}
                              </p>
                              <h3 className="text-sm font-medium mb-3 text-balance">{product.name}</h3>
                              <div className="flex items-center justify-between">
                                <p className="text-lg font-light">${product.price.toFixed(2)}</p>
                                {product.stockQuantity > 0 && product.stockQuantity < 10 && (
                                  <Badge variant="secondary" className="text-xs">Low Stock</Badge>
                                )}
                              </div>
                            </div>
                          </Card>
                        </Link>
                      )
                    })}
                  </div>

                  {filteredProducts.length === 0 && (
                    <div className="text-center py-20">
                      <p className="text-muted-foreground font-light">
                        {products.length === 0 
                          ? "No products available at the moment."
                          : "No products match your filters. Try adjusting your selection."}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      <StoreFooter />
    </div>
  )
}

export default function ShopPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <StoreHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground font-light">Loading...</p>
          </div>
        </main>
        <StoreFooter />
      </div>
    }>
      <ShopContent />
    </Suspense>
  )
}
