"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, ShoppingCart, Package, AlertTriangle, Loader2 } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { useEffect, useState } from "react"
import { productsApi, ordersApi, salesApi } from "@/lib/api-client"

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalSales: 0,
    ordersToday: 0,
    inventoryCount: 0,
    lowStockAlerts: 0,
  })
  const [salesData, setSalesData] = useState<Array<{ month: string; sales: number }>>([])
  const [recentOrders, setRecentOrders] = useState<Array<{
    id: string
    customer: string
    product: string
    amount: number
    status: string
  }>>([])

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      
      // Load products for inventory count and low stock
      const products = await productsApi.getAll()
      const inventoryCount = products.length
      const lowStockAlerts = products.filter(p => p.stockQuantity < 10).length

      // Load sales for revenue
      const salesResponse = await salesApi.getAll()
      const totalSales = salesResponse.summary.totalRevenue || 0
      
      // Load today's orders
      const allOrders = await ordersApi.getAll()
      const today = new Date()
      const ordersToday = allOrders.filter(order => {
        const orderDate = new Date(order.createdAt)
        return orderDate.toDateString() === today.toDateString()
      }).length

      // Get recent orders
      const recent = allOrders.slice(0, 4).map(order => ({
        id: order.id,
        customer: order.customerName || "N/A",
        product: order.items[0]?.product?.name || "N/A",
        amount: order.total,
        status: order.status,
      }))

      // Generate sales chart data (last 6 months)
      const chartData = generateSalesChartData(salesResponse.sales)

      setStats({
        totalSales,
        ordersToday,
        inventoryCount,
        lowStockAlerts,
      })
      setSalesData(chartData)
      setRecentOrders(recent)
    } catch (error) {
      console.error("Failed to load dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const generateSalesChartData = (sales: any[]) => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
    const data = months.map(month => ({ month, sales: 0 }))
    
    // Group sales by month (simplified - using current month distribution)
    sales.forEach(sale => {
      const saleDate = new Date(sale.createdAt)
      const monthIndex = saleDate.getMonth()
      if (monthIndex < 6) {
        data[monthIndex].sales += sale.total
      }
    })

    return data
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
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium tracking-wide">TOTAL SALES</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light">${stats.totalSales.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Total revenue</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium tracking-wide">ORDERS TODAY</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light">{stats.ordersToday}</div>
            <p className="text-xs text-muted-foreground mt-1">Orders placed today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium tracking-wide">INVENTORY COUNT</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light">{stats.inventoryCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Total products</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium tracking-wide">LOW STOCK ALERTS</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light">{stats.lowStockAlerts}</div>
            <p className="text-xs text-muted-foreground mt-1">Items need restocking</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium tracking-wide">SALES TREND</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                sales: {
                  label: "Sales",
                  color: "hsl(var(--chart-1))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="sales" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium tracking-wide">MONTHLY REVENUE</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                sales: {
                  label: "Revenue",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="sales" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium tracking-wide">RECENT ORDERS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                    ORDER ID
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                    CUSTOMER
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                    PRODUCT
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                    AMOUNT
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                    STATUS
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0">
                    <td className="py-3 px-4 text-sm font-light">{order.id}</td>
                    <td className="py-3 px-4 text-sm font-light">{order.customer}</td>
                    <td className="py-3 px-4 text-sm font-light">{order.product}</td>
                    <td className="py-3 px-4 text-sm font-light">${order.amount.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          order.status === "PROCESSED"
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : order.status === "PENDING"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
