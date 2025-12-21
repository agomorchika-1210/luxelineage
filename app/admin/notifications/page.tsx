import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Package, ShoppingCart, AlertTriangle, X } from "lucide-react"

// Mock notifications data
const notifications = [
  {
    id: 1,
    type: "sale",
    title: "New Order Received",
    message: "Order #ORD-007 from Jessica Martin for $1,547",
    time: "2 minutes ago",
    read: false,
    icon: ShoppingCart,
  },
  {
    id: 2,
    type: "low-stock",
    title: "Low Stock Alert",
    message: "Leather Loafers (SKU: LL-005) - Only 5 items remaining",
    time: "15 minutes ago",
    read: false,
    icon: AlertTriangle,
  },
  {
    id: 3,
    type: "sale",
    title: "Item Sold",
    message: "Cashmere Sweater sold to Robert Lee",
    time: "1 hour ago",
    read: false,
    icon: Package,
  },
  {
    id: 4,
    type: "low-stock",
    title: "Low Stock Alert",
    message: "Slim Fit Chinos (SKU: CH-003) - Only 8 items remaining",
    time: "2 hours ago",
    read: true,
    icon: AlertTriangle,
  },
  {
    id: 5,
    type: "order",
    title: "New Order Received",
    message: "Order #ORD-006 from Lisa Anderson for $2,896",
    time: "3 hours ago",
    read: true,
    icon: ShoppingCart,
  },
  {
    id: 6,
    type: "low-stock",
    title: "Out of Stock",
    message: "Jogger Pants (SKU: JP-007) is now out of stock",
    time: "5 hours ago",
    read: true,
    icon: AlertTriangle,
  },
]

export default function NotificationsPage() {
  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-wide">Notification Center</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount} unread notification{unreadCount !== 1 ? "s" : ""}
          </p>
        </div>
        <Button variant="outline">Mark All as Read</Button>
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
            <div className="text-3xl font-light">24</div>
            <p className="text-xs text-muted-foreground mt-1">Today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium tracking-wide flex items-center gap-2">
              <Package className="h-4 w-4" />
              ITEMS SOLD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light">58</div>
            <p className="text-xs text-muted-foreground mt-1">Today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium tracking-wide flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              LOW STOCK
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light">12</div>
            <p className="text-xs text-muted-foreground mt-1">Items need attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium tracking-wide">ALL NOTIFICATIONS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {notifications.map((notification) => {
              const Icon = notification.icon
              return (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 p-4 rounded border transition-colors ${
                    notification.read ? "border-border bg-transparent" : "border-primary/20 bg-primary/5"
                  }`}
                >
                  <div
                    className={`p-2 rounded ${
                      notification.type === "low-stock"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-1">
                      <h3 className="text-sm font-medium">{notification.title}</h3>
                      {!notification.read && <Badge variant="default">New</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                    <p className="text-xs text-muted-foreground">{notification.time}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
