"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  CheckCircle2, 
  Package, 
  Eye,
  X,
  Loader2,
  Truck,
  CheckCircle,
  XCircle,
  FileText,
  Filter
} from "lucide-react"
import { useState, useEffect } from "react"
import { productsApi, ordersApi, salesApi } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

interface Product {
  id: string
  name: string
  sku: string
  brand: string
  price: number
  stockQuantity: number
  sizes?: string[]
  colors?: string[]
}

interface Order {
  id: string
  status: string
  source: string
  total: number
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  shippingAddress?: string
  createdAt: string
  items: Array<{
    id: string
    quantity: number
    price: number
    product: Product
  }>
}

interface Sale {
  id: string
  orderId: string
  source: string
  total: number
  createdAt: string
  order: Order
}

interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
  size?: string
  color?: string
}

function parseMoneyInput(raw: string): number | null {
  const n = parseFloat(raw.replace(/,/g, "").trim())
  return Number.isFinite(n) ? n : null
}

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState("selling")
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedSuggestion, setHighlightedSuggestion] = useState(0)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedSize, setSelectedSize] = useState<string>("")
  const [selectedColor, setSelectedColor] = useState<string>("")
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState({ products: true, orders: false, sales: false })
  const [processing, setProcessing] = useState<string | null>(null)
  const [posCheckoutOpen, setPosCheckoutOpen] = useState(false)
  const [posAmountPaid, setPosAmountPaid] = useState("")
  
  // Order filtering
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("ALL")
  const [orderSourceFilter, setOrderSourceFilter] = useState<string>("ALL")
  const [orderSearch, setOrderSearch] = useState<string>("")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  
  const { toast } = useToast()

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    if (activeTab === "orders") {
      loadOrders()
    }
  }, [activeTab, orderStatusFilter, orderSourceFilter, startDate, endDate, orderSearch])

  useEffect(() => {
    if (activeTab === "processed") {
      loadSales()
    }
  }, [activeTab])

  const loadProducts = async () => {
    try {
      setLoading((prev) => ({ ...prev, products: true }))
      const data = await productsApi.getAll()
      setProducts(data)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load products",
        variant: "destructive",
      })
    } finally {
      setLoading((prev) => ({ ...prev, products: false }))
    }
  }

  const loadOrders = async () => {
    try {
      setLoading((prev) => ({ ...prev, orders: true }))
      const data = await ordersApi.getAll(
        orderStatusFilter === "ALL" ? undefined : orderStatusFilter,
        orderSourceFilter === "ALL" ? undefined : orderSourceFilter,
        startDate || undefined,
        endDate || undefined,
        orderSearch || undefined
      )
      setOrders(data)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load orders",
        variant: "destructive",
      })
    } finally {
      setLoading((prev) => ({ ...prev, orders: false }))
    }
  }

  const loadSales = async () => {
    try {
      setLoading((prev) => ({ ...prev, sales: true }))
      const data = await salesApi.getAll()
      setSales(data.sales)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load sales",
        variant: "destructive",
      })
    } finally {
      setLoading((prev) => ({ ...prev, sales: false }))
    }
  }

  const selectProduct = (product: Product) => {
    setSelectedProduct(product)
    setSelectedSize("")
    setSelectedColor("")
    setSearchQuery("")
    setShowSuggestions(false)
    setHighlightedSuggestion(0)
  }

  const getTotalQuantityInCartForProduct = (productId: string) =>
    cart
      .filter((item) => item.productId === productId)
      .reduce((sum, item) => sum + item.quantity, 0)

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const filteredProducts = products.filter((product) => {
    if (!normalizedQuery) return true
    return (
      product.name.toLowerCase().includes(normalizedQuery) ||
      product.brand?.toLowerCase().includes(normalizedQuery) ||
      product.sku.toLowerCase().includes(normalizedQuery)
    )
  })

  const suggestedProducts =
    normalizedQuery.length > 0
      ? products
          .filter((product) => {
            const name = product.name.toLowerCase()
            const brand = (product.brand || "").toLowerCase()
            const sku = product.sku.toLowerCase()
            return (
              sku.includes(normalizedQuery) ||
              name.includes(normalizedQuery) ||
              brand.includes(normalizedQuery)
            )
          })
          .sort((a, b) => {
            const aSkuStarts = a.sku.toLowerCase().startsWith(normalizedQuery) ? 1 : 0
            const bSkuStarts = b.sku.toLowerCase().startsWith(normalizedQuery) ? 1 : 0
            if (aSkuStarts !== bSkuStarts) return bSkuStarts - aSkuStarts
            return a.name.localeCompare(b.name)
          })
          .slice(0, 8)
      : []

  useEffect(() => {
    setHighlightedSuggestion(0)
  }, [searchQuery])

  useEffect(() => {
    if (!showSuggestions) return
    if (highlightedSuggestion >= suggestedProducts.length) {
      setHighlightedSuggestion(0)
    }
  }, [showSuggestions, highlightedSuggestion, suggestedProducts.length])

  const handleProcessOrder = async (orderId: string) => {
    try {
      setProcessing(orderId)
      await ordersApi.process(orderId)
      toast({
        title: "Success",
        description: "Order processed successfully",
      })
      loadOrders()
      loadSales()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process order",
        variant: "destructive",
      })
    } finally {
      setProcessing(null)
    }
  }

  const handleShipOrder = async (orderId: string) => {
    try {
      setProcessing(orderId)
      await ordersApi.ship(orderId)
      toast({
        title: "Success",
        description: "Order marked as shipped",
      })
      loadOrders()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to ship order",
        variant: "destructive",
      })
    } finally {
      setProcessing(null)
    }
  }

  const handleDeliverOrder = async (orderId: string) => {
    try {
      setProcessing(orderId)
      await ordersApi.deliver(orderId)
      toast({
        title: "Success",
        description: "Order marked as delivered",
      })
      loadOrders()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to deliver order",
        variant: "destructive",
      })
    } finally {
      setProcessing(null)
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to cancel this order? Stock will be restored.")) {
      return
    }
    try {
      setProcessing(orderId)
      await ordersApi.cancel(orderId)
      toast({
        title: "Success",
        description: "Order cancelled successfully",
      })
      loadOrders()
      loadSales()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel order",
        variant: "destructive",
      })
    } finally {
      setProcessing(null)
    }
  }

  const handlePrintReceipt = async (orderId: string) => {
    try {
      const receipt = await ordersApi.getReceipt(orderId)
      const receiptWindow = window.open("", "_blank")
      if (!receiptWindow) {
        toast({
          title: "Allow pop-ups",
          description: "Receipt was saved — enable pop-ups for this site to print, or use Receipt from Processed Sales.",
          variant: "destructive",
        })
        return
      }
      receiptWindow.document.write(`
          <html>
            <head>
              <title>Receipt - ${receipt.orderNumber}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
                h1 { border-bottom: 2px solid #000; padding-bottom: 10px; }
                .info { margin: 10px 0; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
                .total { font-size: 18px; font-weight: bold; margin-top: 20px; }
                @media print { button { display: none; } }
              </style>
            </head>
            <body>
              <h1>Receipt ${receipt.orderNumber}</h1>
              <div class="info"><strong>Date:</strong> ${new Date(receipt.date).toLocaleString()}</div>
              <div class="info"><strong>Status:</strong> ${receipt.status}</div>
              <div class="info"><strong>Customer:</strong> ${receipt.customer.name}</div>
              ${receipt.customer.email ? `<div class="info"><strong>Email:</strong> ${receipt.customer.email}</div>` : ''}
              ${receipt.customer.phone ? `<div class="info"><strong>Phone:</strong> ${receipt.customer.phone}</div>` : ''}
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${receipt.items.map((item: any) => `
                    <tr>
                      <td>${item.name} (${item.sku})</td>
                      <td>${item.quantity}</td>
                      <td>$${item.unitPrice.toFixed(2)}</td>
                      <td>$${item.total.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div class="total">Total: $${receipt.total.toFixed(2)}</div>
              ${
                receipt.amountTendered != null
                  ? `<div class="info"><strong>Amount tendered:</strong> $${Number(receipt.amountTendered).toFixed(2)}</div>`
                  : ""
              }
              ${
                receipt.changeGiven != null
                  ? `<div class="info"><strong>Change:</strong> $${Number(receipt.changeGiven).toFixed(2)}</div>`
                  : ""
              }
              <div class="info"><strong>Payment Method:</strong> ${receipt.paymentMethod}</div>
              <button onclick="window.print()">Print Receipt</button>
            </body>
          </html>
        `)
      receiptWindow.document.close()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate receipt",
        variant: "destructive",
      })
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "PENDING": return "secondary"
      case "PROCESSED": return "default"
      case "SHIPPED": return "outline"
      case "DELIVERED": return "default"
      case "CANCELLED": return "destructive"
      default: return "secondary"
    }
  }

  const addToCart = () => {
    if (!selectedProduct) return
    
    const size = selectedSize || (selectedProduct.sizes && selectedProduct.sizes.length > 0 ? selectedProduct.sizes[0] : undefined)
    const color = selectedColor || (selectedProduct.colors && selectedProduct.colors.length > 0 ? selectedProduct.colors[0] : undefined)
    const totalQuantityInCart = getTotalQuantityInCartForProduct(selectedProduct.id)

    if (totalQuantityInCart >= selectedProduct.stockQuantity) {
      toast({
        title: "Insufficient stock",
        description: `Only ${selectedProduct.stockQuantity} units available for ${selectedProduct.name}.`,
        variant: "destructive",
      })
      return
    }
    
    const existingItem = cart.find(
      (item) => item.productId === selectedProduct.id && item.size === size && item.color === color
    )

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.productId === selectedProduct.id && item.size === size && item.color === color
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      )
    } else {
      setCart([
        ...cart,
        {
          productId: selectedProduct.id,
          name: selectedProduct.name,
          price: selectedProduct.price,
          quantity: 1,
          size,
          color,
        },
      ])
    }

    setSelectedProduct(null)
    setSelectedSize("")
    setSelectedColor("")
    setSearchQuery("")
    setShowSuggestions(false)
  }

  const updateQuantity = (productId: string, size: string | undefined, color: string | undefined, delta: number) => {
    if (delta > 0) {
      const product = products.find((p) => p.id === productId)
      const totalQuantityInCart = getTotalQuantityInCartForProduct(productId)

      if (product && totalQuantityInCart >= product.stockQuantity) {
        toast({
          title: "Insufficient stock",
          description: `Cannot add more than ${product.stockQuantity} units of ${product.name}.`,
          variant: "destructive",
        })
        return
      }
    }

    setCart(
      cart.map((item) => {
        if (item.productId === productId && item.size === size && item.color === color) {
          const newQuantity = item.quantity + delta
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : null
        }
        return item
      }).filter(Boolean) as CartItem[]
    )
  }

  const removeFromCart = (productId: string, size: string | undefined, color: string | undefined) => {
    setCart(cart.filter((item) => !(item.productId === productId && item.size === size && item.color === color)))
  }

  /** Rounded to cents — avoids float mismatch with server totals on POS POST. */
  const cartTotal =
    Math.round(cart.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100
  const amountPaidNum = parseMoneyInput(posAmountPaid)
  const posTenderSufficient =
    amountPaidNum !== null && amountPaidNum + 0.005 >= cartTotal
  const posChangeDue =
    posTenderSufficient && amountPaidNum !== null
      ? Math.round((amountPaidNum - cartTotal) * 100) / 100
      : 0
  const posAmountShort =
    amountPaidNum !== null && amountPaidNum + 0.005 < cartTotal
      ? Math.round((cartTotal - amountPaidNum) * 100) / 100
      : null

  const openPosCheckout = () => {
    if (cart.length === 0) return

    const stockValidationErrors: string[] = []
    cart.forEach((item) => {
      const product = products.find((p) => p.id === item.productId)
      if (!product) {
        stockValidationErrors.push(`${item.name}: Product not found`)
        return
      }
      if (item.quantity > product.stockQuantity) {
        stockValidationErrors.push(
          `${item.name}: Requested ${item.quantity}, available ${product.stockQuantity}`
        )
      }
    })

    if (stockValidationErrors.length > 0) {
      toast({
        title: "Stock validation failed",
        description: stockValidationErrors.join(" | "),
        variant: "destructive",
      })
      return
    }

    setPosAmountPaid(cartTotal.toFixed(2))
    setPosCheckoutOpen(true)
  }

  const completePosCheckout = async () => {
    if (cart.length === 0) return
    const paid = parseMoneyInput(posAmountPaid)
    if (paid === null) {
      toast({
        title: "Invalid amount",
        description: "Enter the amount the customer paid.",
        variant: "destructive",
      })
      return
    }
    if (paid + 0.005 < cartTotal) {
      toast({
        title: "Insufficient payment",
        description: `Amount must be at least $${cartTotal.toFixed(2)}.`,
        variant: "destructive",
      })
      return
    }

    try {
      setProcessing("pos")
      const roundedPaid = Math.round(paid * 100) / 100
      const result = await salesApi.createPOS({
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        total: cartTotal,
        amountTendered: roundedPaid,
      })
      const orderId = (result as { order?: { id: string } })?.order?.id

      setCart([])
      setPosCheckoutOpen(false)
      loadProducts()
      loadSales()

      toast({
        title: "Sale completed",
        description: orderId
          ? `Order ${orderId.slice(0, 8)}… recorded. Opening receipt…`
          : "Sale recorded.",
      })

      if (orderId) {
        await handlePrintReceipt(orderId)
      }
    } catch (error: any) {
      toast({
        title: "Sale failed",
        description: error.message || "Failed to process sale. Check you are logged in and the database is migrated.",
        variant: "destructive",
      })
    } finally {
      setProcessing(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString()
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-wide">Sales Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage in-store sales and online orders</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="selling">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Selling
          </TabsTrigger>
          <TabsTrigger value="orders">
            <Package className="h-4 w-4 mr-2" />
            Orders
            {orders.filter(o => o.status === "PENDING").length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {orders.filter(o => o.status === "PENDING").length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="processed">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Processed Sales
          </TabsTrigger>
        </TabsList>

        {/* Selling Tab - Point of Sale */}
        <TabsContent value="selling" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Product Selection */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium tracking-wide">ADD PRODUCT</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Barcode Scanner - Placeholder for future implementation */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Scan Barcode / Enter SKU</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Scan barcode or enter SKU..."
                        value={searchQuery}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[\r\n]+/g, "")
                          setSearchQuery(value)
                          setShowSuggestions(Boolean(value.trim()))

                          // Scanner-friendly: auto-pick exact SKU/barcode matches.
                          const exactSkuMatch = products.find(
                            (p) => p.sku.toLowerCase() === value.trim().toLowerCase()
                          )
                          if (exactSkuMatch) {
                            selectProduct(exactSkuMatch)
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowDown" && suggestedProducts.length > 0) {
                            e.preventDefault()
                            setShowSuggestions(true)
                            setHighlightedSuggestion((prev) =>
                              prev + 1 >= suggestedProducts.length ? 0 : prev + 1
                            )
                            return
                          }

                          if (e.key === "ArrowUp" && suggestedProducts.length > 0) {
                            e.preventDefault()
                            setHighlightedSuggestion((prev) =>
                              prev - 1 < 0 ? suggestedProducts.length - 1 : prev - 1
                            )
                            return
                          }

                          if (e.key === "Escape") {
                            setShowSuggestions(false)
                            return
                          }

                          if (e.key === "Enter" && normalizedQuery) {
                            e.preventDefault()
                            const suggested = suggestedProducts[highlightedSuggestion]
                            const exactSkuMatch = products.find(
                              (p) => p.sku.toLowerCase() === normalizedQuery
                            )
                            const product = exactSkuMatch || suggested
                            if (product) {
                              selectProduct(product)
                            }
                          }
                        }}
                        onFocus={() => {
                          setShowSuggestions(Boolean(searchQuery.trim()) && suggestedProducts.length > 0)
                        }}
                        onBlur={() => {
                          // Allow click events on suggestion buttons before closing.
                          setTimeout(() => setShowSuggestions(false), 150)
                        }}
                        disabled={loading.products}
                        className="pl-10"
                        autoFocus
                      />
                    </div>
                    {showSuggestions && suggestedProducts.length > 0 && (
                      <div className="mt-2 border border-border rounded-md bg-background shadow-sm overflow-hidden">
                        {suggestedProducts.map((product, index) => (
                          <button
                            key={product.id}
                            type="button"
                            className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                              index === highlightedSuggestion
                                ? "bg-muted"
                                : "hover:bg-muted/60"
                            }`}
                            onMouseEnter={() => setHighlightedSuggestion(index)}
                            onClick={() => selectProduct(product)}
                          >
                            <div className="font-medium">{product.name}</div>
                            <div className="text-xs text-muted-foreground">
                              SKU: {product.sku} | {product.brand || "N/A"} | Stock: {product.stockQuantity}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Type SKU, barcode value, or product name. Press Enter to quick-select top match.
                    </p>
                  </div>

                  {/* Product Search/Select */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Or Search by Name</label>
                      <Select
                        value={selectedProduct?.id}
                        onValueChange={(value) => {
                          const product = products.find(p => p.id === value)
                          if (product) selectProduct(product)
                        }}
                        disabled={loading.products}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loading.products ? "Loading products..." : "Search and select a product..."} />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredProducts.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} - {product.brand || "N/A"} (${product.price}) - Stock: {product.stockQuantity}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                  </div>

                  {/* Quick Add Product Form */}
                  {selectedProduct && (
                    <Card className="border">
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-medium">{selectedProduct.name}</h3>
                            <p className="text-sm text-muted-foreground">{selectedProduct.brand}</p>
                            <p className="text-sm font-light mt-1">SKU: {selectedProduct.sku}</p>
                            <p className="text-lg font-light mt-2">${selectedProduct.price}</p>
                            <p className="text-xs text-muted-foreground mt-1">Stock: {selectedProduct.stockQuantity}</p>
                          </div>
                        </div>
                        {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                          <div>
                            <label className="text-sm font-medium mb-2 block">Size</label>
                            <Select value={selectedSize} onValueChange={setSelectedSize}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select size" />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedProduct.sizes.map((size) => (
                                  <SelectItem key={size} value={size}>
                                    {size}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                          <div>
                            <label className="text-sm font-medium mb-2 block">Color</label>
                            <Select value={selectedColor} onValueChange={setSelectedColor}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select color" />
                              </SelectTrigger>
                              <SelectContent>
                                {selectedProduct.colors.map((color) => (
                                  <SelectItem key={color} value={color}>
                                    {color}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <Button
                          className="w-full"
                          onClick={addToCart}
                          disabled={selectedProduct.stockQuantity <= getTotalQuantityInCartForProduct(selectedProduct.id)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {selectedProduct.stockQuantity <= getTotalQuantityInCartForProduct(selectedProduct.id)
                            ? "Out of Stock in Cart"
                            : "Add to Cart"}
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Cart & Checkout */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-medium tracking-wide">CART</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cart.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Cart is empty</p>
                  ) : (
                    <>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {cart.map((item, index) => (
                          <div key={index} className="flex items-start gap-3 p-2 border rounded">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{item.name}</p>
                              {(item.size || item.color) && (
                                <p className="text-xs text-muted-foreground">
                                  {item.size && `Size: ${item.size}`}
                                  {item.size && item.color && " • "}
                                  {item.color && `Color: ${item.color}`}
                                </p>
                              )}
                              <p className="text-sm font-light mt-1">${item.price} × {item.quantity}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateQuantity(item.productId, item.size, item.color, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm w-8 text-center">{item.quantity}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateQuantity(item.productId, item.size, item.color, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive"
                                onClick={() => removeFromCart(item.productId, item.size, item.color)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="border-t pt-4 space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-light">${cartTotal.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-light">
                          <span>Total</span>
                          <span>${cartTotal.toFixed(2)}</span>
                        </div>
                        <Button
                          className="w-full"
                          onClick={openPosCheckout}
                          disabled={cart.length === 0 || processing === "pos"}
                        >
                          Process Sale
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

        </TabsContent>

        {/* Orders Tab - Online Orders */}
        <TabsContent value="orders" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium tracking-wide">ORDERS</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                <Input
                  placeholder="Search customer..."
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  className="col-span-1 md:col-span-2"
                />
                <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PROCESSED">Processed</SelectItem>
                    <SelectItem value="SHIPPED">Shipped</SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={orderSourceFilter} onValueChange={setOrderSourceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All Sources</SelectItem>
                    <SelectItem value="ONLINE">Online</SelectItem>
                    <SelectItem value="POS">POS</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    placeholder="Start Date"
                    className="flex-1"
                  />
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="End Date"
                    className="flex-1"
                  />
                </div>
              </div>

              {loading.orders ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : orders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No orders found</p>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <Card key={order.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-mono">{order.id}</span>
                              <Badge variant={getStatusBadgeVariant(order.status)}>
                                {order.status}
                              </Badge>
                              <Badge variant={order.source === "POS" ? "default" : "outline"}>
                                {order.source}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(order.createdAt)} at {formatTime(order.createdAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePrintReceipt(order.id)}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Receipt
                            </Button>
                            {order.status === "PENDING" && (
                              <Button 
                                size="sm" 
                                onClick={() => handleProcessOrder(order.id)}
                                disabled={processing === order.id}
                              >
                                {processing === order.id ? (
                                  <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                    Process
                                  </>
                                )}
                              </Button>
                            )}
                            {order.status === "PROCESSED" && order.source === "ONLINE" && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleShipOrder(order.id)}
                                disabled={processing === order.id}
                              >
                                {processing === order.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Truck className="h-4 w-4 mr-2" />
                                    Ship
                                  </>
                                )}
                              </Button>
                            )}
                            {order.status === "SHIPPED" && order.source === "ONLINE" && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDeliverOrder(order.id)}
                                disabled={processing === order.id}
                              >
                                {processing === order.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Deliver
                                  </>
                                )}
                              </Button>
                            )}
                            {order.status !== "CANCELLED" && order.status !== "DELIVERED" && (
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => handleCancelOrder(order.id)}
                                disabled={processing === order.id}
                              >
                                {processing === order.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Cancel
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Customer</p>
                            <p className="font-light">{order.customerName || "N/A"}</p>
                            <p className="text-xs text-muted-foreground">{order.customerEmail || ""}</p>
                            <p className="text-xs text-muted-foreground">{order.customerPhone || ""}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Shipping</p>
                            <p className="text-xs text-muted-foreground">{order.shippingAddress || "N/A"}</p>
                          </div>
                        </div>
                        <div className="mt-4 pt-4 border-t">
                          <div className="space-y-1">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="text-muted-foreground">
                                  {item.product.name} × {item.quantity}
                                </span>
                                <span className="font-light">${(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between mt-3 pt-3 border-t">
                            <span className="font-medium">Total</span>
                            <span className="text-lg font-light">${order.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Processed Sales Tab */}
        <TabsContent value="processed" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium tracking-wide">PROCESSED SALES</CardTitle>
            </CardHeader>
            <CardContent>
              {loading.sales ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : sales.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No processed sales</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                          SALE ID
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                          DATE & TIME
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                          TYPE
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                          CUSTOMER
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                          ITEMS
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                          TOTAL
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                          ACTIONS
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {sales.map((sale) => (
                        <tr key={sale.id} className="border-b border-border last:border-0">
                          <td className="py-3 px-4 text-sm font-mono">{sale.id}</td>
                          <td className="py-3 px-4 text-sm font-light">
                            {formatDate(sale.createdAt)} {formatTime(sale.createdAt)}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={sale.source === "POS" ? "default" : "outline"}>
                              {sale.source === "POS" ? "In-Store" : "Online"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-sm font-light">
                            {sale.order.customerName || "Walk-in Customer"}
                          </td>
                          <td className="py-3 px-4 text-sm font-light">
                            {sale.order.items.map((item, idx) => (
                              <div key={idx} className="text-xs">
                                {item.product.name} × {item.quantity}
                              </div>
                            ))}
                          </td>
                          <td className="py-3 px-4 text-sm font-light">${sale.total.toFixed(2)}</td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePrintReceipt(sale.orderId)}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Receipt
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        open={posCheckoutOpen}
        onOpenChange={(open) => {
          setPosCheckoutOpen(open)
          if (!open) setPosAmountPaid("")
        }}
      >
        <DialogContent className="sm:max-w-lg" showCloseButton={processing !== "pos"}>
          <DialogHeader>
            <DialogTitle className="font-light tracking-wide">Complete in-store sale</DialogTitle>
            <DialogDescription>
              Confirm line items, enter cash received (or card total), then complete. Change is calculated automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-1">
            <div className="rounded-md border divide-y">
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between gap-4 px-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium">{item.name}</span>
                    {(item.size || item.color) && (
                      <span className="text-muted-foreground text-xs block">
                        {[item.size, item.color].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {item.quantity} × ${item.price.toFixed(2)}
                  </span>
                  <span className="shrink-0 font-light">
                    ${(item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-medium border-t pt-2">
                <span>Total due</span>
                <span>${cartTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pos-amount-paid">Amount received</Label>
              <Input
                id="pos-amount-paid"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={posAmountPaid}
                onChange={(e) => setPosAmountPaid(e.target.value)}
                className="text-lg tabular-nums"
                disabled={processing === "pos"}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPosAmountPaid(cartTotal.toFixed(2))}
                  disabled={processing === "pos"}
                >
                  Exact (total)
                </Button>
              </div>
            </div>

            {amountPaidNum !== null && (
              <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm space-y-1">
                {posTenderSufficient ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Change due</span>
                      <span className="font-medium tabular-nums">
                        ${posChangeDue.toFixed(2)}
                      </span>
                    </div>
                    {posChangeDue <= 0 && (
                      <p className="text-xs text-muted-foreground">Exact payment — no change.</p>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-destructive">
                      <span>Still owed</span>
                      <span className="font-medium tabular-nums">
                        ${posAmountShort?.toFixed(2) ?? "—"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Customer must pay at least the total before you can complete the sale.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPosCheckoutOpen(false)}
              disabled={processing === "pos"}
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={completePosCheckout}
              disabled={
                cart.length === 0 ||
                processing === "pos" ||
                !posTenderSufficient ||
                amountPaidNum === null
              }
            >
              {processing === "pos" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Completing…
                </>
              ) : (
                "Complete sale"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
