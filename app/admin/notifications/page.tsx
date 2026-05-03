"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Package,
  ShoppingCart,
  AlertTriangle,
  X,
  Loader2,
  CheckCircle2,
  Truck,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { useState, useEffect } from "react"
import { notificationsApi, productsApi } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"

type NotificationType =
  | "ORDER_PLACED"
  | "ORDER_PROCESSED"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "ORDER_CANCELLED"
  | "LOW_STOCK"

interface Notification {
  id: string
  type: NotificationType
  message: string
  read: boolean
  createdAt: string
}

interface Product {
  id: string
  name: string
  sku: string
  stockQuantity: number
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [notifs, products] = await Promise.all([
        notificationsApi.getAll(),
        productsApi.getAll()
      ])
      setNotifications(notifs)
      // Filter products with low stock (< 10) or out of stock
      setLowStockProducts(products.filter((p: Product) => p.stockQuantity < 10))
    } catch (error: any) {
      console.error("Failed to load notifications:", error)
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    
    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "ORDER_PLACED":
        return ShoppingCart
      case "ORDER_PROCESSED":
        return CheckCircle2
      case "ORDER_SHIPPED":
        return Truck
      case "ORDER_DELIVERED":
        return CheckCircle
      case "ORDER_CANCELLED":
        return XCircle
      case "LOW_STOCK":
        return AlertTriangle
      default:
        return Package
    }
  }

  const getNotificationTitle = (type: string) => {
    switch (type) {
      case "ORDER_PLACED":
        return "New Order Received"
      case "ORDER_PROCESSED":
        return "Order Processed"
      case "ORDER_SHIPPED":
        return "Order Shipped"
      case "ORDER_DELIVERED":
        return "Order Delivered"
      case "ORDER_CANCELLED":
        return "Order Cancelled"
      case "LOW_STOCK":
        return "Low Stock Alert"
      default:
        return "Notification"
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length
  const outOfStockCount = lowStockProducts.filter(p => p.stockQuantity === 0).length
  const lowStockCount = lowStockProducts.filter(p => p.stockQuantity > 0).length
  const todayOrders = notifications.filter(n => {
    const today = new Date()
    const notifDate = new Date(n.createdAt)
    return notifDate.toDateString() === today.toDateString() && n.type === "ORDER_PLACED"
  }).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-wide">Notification Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline" onClick={loadData}>
          Refresh
        </Button>
      </div>

      {/* Notification Categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium tracking-wide flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              NEW ORDERS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light">{todayOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">Today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium tracking-wide flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              LOW STOCK
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light text-amber-500">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Items below 10 units</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium tracking-wide flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              OUT OF STOCK
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light text-destructive">{outOfStockCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Need immediate restock</p>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alerts */}
      {lowStockProducts.length > 0 && (
      <Card>
        <CardHeader>
            <CardTitle className="text-base font-medium tracking-wide">STOCK ALERTS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
              {lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className={`flex items-start gap-4 p-4 rounded border transition-colors ${
                    product.stockQuantity === 0 
                      ? "border-destructive/30 bg-destructive/5" 
                      : "border-amber-500/30 bg-amber-500/5"
                  }`}
                >
                  <div
                    className={`p-2 rounded ${
                      product.stockQuantity === 0
                        ? "bg-destructive/10 text-destructive"
                        : "bg-amber-500/10 text-amber-500"
                    }`}
                  >
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <h3 className="text-sm font-medium">
                        {product.stockQuantity === 0 ? "Out of Stock" : "Low Stock Alert"}
                      </h3>
                      <Badge variant={product.stockQuantity === 0 ? "destructive" : "secondary"}>
                        {product.stockQuantity} left
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{product.name}</p>
                    <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium tracking-wide">ORDER NOTIFICATIONS</CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No notifications yet</p>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type)
                return (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-4 p-4 rounded border transition-colors ${
                      notification.read ? "border-border bg-transparent" : "border-primary/20 bg-primary/5"
                    }`}
                  >
                    <div className="p-2 rounded bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <h3 className="text-sm font-medium">{getNotificationTitle(notification.type)}</h3>
                        {!notification.read && <Badge variant="default">New</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">{formatTimeAgo(notification.createdAt)}</p>
                    </div>
                </div>
              )
            })}
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
