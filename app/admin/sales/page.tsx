"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  Loader2
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

export default function SalesPage() {
  const [activeTab, setActiveTab] = useState("selling")
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedSize, setSelectedSize] = useState<string>("")
  const [selectedColor, setSelectedColor] = useState<string>("")
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState({ products: true, orders: false, sales: false })
  const [processing, setProcessing] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadProducts()
    if (activeTab === "orders") {
      loadOrders()
    } else if (activeTab === "processed") {
      loadSales()
    }
  }, [activeTab])

  const loadProducts = async () => {
    try {
      setLoading({ ...loading, products: true })
      const data = await productsApi.getAll()
      setProducts(data)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load products",
        variant: "destructive",
      })
    } finally {
      setLoading({ ...loading, products: false })
    }
  }

  const loadOrders = async () => {
    try {
      setLoading({ ...loading, orders: true })
      const data = await ordersApi.getAll("PENDING")
      setOrders(data)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load orders",
        variant: "destructive",
      })
    } finally {
      setLoading({ ...loading, orders: false })
    }
  }

  const loadSales = async () => {
    try {
      setLoading({ ...loading, sales: true })
      const data = await salesApi.getAll()
      setSales(data.sales)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load sales",
        variant: "destructive",
      })
    } finally {
      setLoading({ ...loading, sales: false })
    }
  }

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

  const filteredProducts = products.filter(
    (product) =>
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const addToCart = () => {
    if (!selectedProduct) return
    
    const size = selectedSize || (selectedProduct.sizes && selectedProduct.sizes.length > 0 ? selectedProduct.sizes[0] : undefined)
    const color = selectedColor || (selectedProduct.colors && selectedProduct.colors.length > 0 ? selectedProduct.colors[0] : undefined)
    
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
  }

  const updateQuantity = (productId: string, size: string | undefined, color: string | undefined, delta: number) => {
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

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const processSale = async () => {
    if (cart.length === 0) return
    
    try {
      setProcessing("pos")
      await salesApi.createPOS({
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        total: cartTotal,
      })
      toast({
        title: "Success",
        description: "Sale processed successfully",
      })
      setCart([])
      loadProducts()
      loadSales()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process sale",
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
                          setSearchQuery(e.target.value)
                          // Auto-select product if SKU matches
                          const product = products.find(p => p.sku.toLowerCase() === e.target.value.toLowerCase())
                          if (product) {
                            setSelectedProduct(product)
                            setSearchQuery("")
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && searchQuery) {
                            const product = products.find(
                              p => p.sku.toLowerCase() === searchQuery.toLowerCase() ||
                                   p.name.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            if (product) {
                              setSelectedProduct(product)
                              setSearchQuery("")
                            }
                          }
                        }}
                        disabled={loading.products}
                        className="pl-10"
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Barcode scanning will be implemented in a future update
                    </p>
                  </div>

                  {/* Product Search/Select */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Or Search by Name</label>
                      <Select
                        value={selectedProduct?.id}
                        onValueChange={(value) => {
                          const product = products.find(p => p.id === value)
                          if (product) setSelectedProduct(product)
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
                        <Button className="w-full" onClick={addToCart}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add to Cart
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
                        <Button className="w-full" onClick={processSale} disabled={cart.length === 0 || processing === "pos"}>
                          {processing === "pos" ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            "Process Sale"
                          )}
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
              <CardTitle className="text-base font-medium tracking-wide">ONLINE ORDERS</CardTitle>
            </CardHeader>
            <CardContent>
              {loading.orders ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : orders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No pending orders</p>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <Card key={order.id} className="border">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-mono">{order.id}</span>
                              <Badge
                                variant={order.status === "PENDING" ? "secondary" : "default"}
                              >
                                {order.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(order.createdAt)} at {formatTime(order.createdAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
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
    </div>
  )
}
