"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, TrendingUp, TrendingDown, Eye, Loader2, DollarSign } from "lucide-react"
import { useState, useEffect, useMemo } from "react"
import { salesApi } from "@/lib/api-client"
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Pie,
  PieChart,
  Cell,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"

interface Sale {
  id: string
  orderId: string
  source: string
  total: number
  createdAt: string
  order: {
    id: string
    status: string
    source: string
    total: number
    customerName?: string
    customerEmail?: string
    items: Array<{
      id: string
      quantity: number
      price: number
      cost?: number
      product: {
        id: string
        name: string
        category: string
      }
    }>
  }
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<any>(null)
  const [sales, setSales] = useState<Sale[]>([])

  useEffect(() => {
    loadSalesData()
  }, [])

  const loadSalesData = async () => {
    try {
      setLoading(true)
      const data = await salesApi.getAll()
      setSales(data.sales || [])
      setSummary(data.summary || {})
    } catch (error: any) {
      console.error("Failed to load sales data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Generate daily data from real sales (last 7 days)
  const dailyData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const today = new Date()
    const last7Days: { day: string; revenue: number; orders: number; date: Date }[] = []
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(today.getDate() - i)
      last7Days.push({
        day: days[date.getDay()],
        revenue: 0,
        orders: 0,
        date: date
      })
    }
    
    sales.forEach(sale => {
      const saleDate = new Date(sale.createdAt)
      const dayIndex = last7Days.findIndex(d => 
        d.date.toDateString() === saleDate.toDateString()
      )
      if (dayIndex !== -1) {
        last7Days[dayIndex].revenue += sale.total
        last7Days[dayIndex].orders += 1
      }
    })
    
    return last7Days.map(({ day, revenue, orders }) => ({ day, revenue: Math.round(revenue), orders }))
  }, [sales])

  // Generate monthly data from real sales (last 6 months)
  const monthlyData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const today = new Date()
    const last6Months: { month: string; revenue: number; orders: number; year: number; monthNum: number }[] = []
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      last6Months.push({
        month: months[date.getMonth()],
        revenue: 0,
        orders: 0,
        year: date.getFullYear(),
        monthNum: date.getMonth()
      })
    }
    
    sales.forEach(sale => {
      const saleDate = new Date(sale.createdAt)
      const monthIndex = last6Months.findIndex(m => 
        m.year === saleDate.getFullYear() && m.monthNum === saleDate.getMonth()
      )
      if (monthIndex !== -1) {
        last6Months[monthIndex].revenue += sale.total
        last6Months[monthIndex].orders += 1
      }
    })
    
    return last6Months.map(({ month, revenue, orders }) => ({ month, revenue: Math.round(revenue), orders }))
  }, [sales])

  // Generate category data from real sales with profit analysis
  const categoryData = useMemo(() => {
    const categoryStats: Record<string, { revenue: number; cost: number; quantity: number }> = {}
    
    sales.forEach(sale => {
      sale.order.items.forEach((item: any) => {
        const category = item.product?.category || 'Other'
        // Simplify category names
        const simpleCat = category.includes(' - ') ? category.split(' - ')[0] : category
        
        if (!categoryStats[simpleCat]) {
          categoryStats[simpleCat] = { revenue: 0, cost: 0, quantity: 0 }
        }
        
        const itemRevenue = item.price * item.quantity
        const itemCost = (item.cost || 0) * item.quantity
        
        categoryStats[simpleCat].revenue += itemRevenue
        categoryStats[simpleCat].cost += itemCost
        categoryStats[simpleCat].quantity += item.quantity
      })
    })
    
    const chartColors = [
      "hsl(var(--chart-1))",
      "hsl(var(--chart-2))",
      "hsl(var(--chart-3))",
      "hsl(var(--chart-4))",
      "hsl(var(--chart-5))",
    ]
    
    // Calculate profit and margins for each category
    const sorted = Object.entries(categoryStats)
      .map(([category, stats]) => {
        const profit = stats.revenue - stats.cost
        const profitMargin = stats.revenue > 0 ? (profit / stats.revenue) * 100 : 0
        return {
          category,
          revenue: Math.round(stats.revenue),
          cost: Math.round(stats.cost),
          profit: Math.round(profit),
          profitMargin: parseFloat(profitMargin.toFixed(2)),
          quantity: stats.quantity,
          value: stats.revenue, // For pie chart
        }
      })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10) // Top 10 categories
    
    const grandTotal = sorted.reduce((sum, item) => sum + item.revenue, 0)
    
    return sorted.map((item, index) => ({
      ...item,
      value: grandTotal > 0 ? Math.round((item.revenue / grandTotal) * 100) : 0,
      fill: chartColors[index % chartColors.length]
    }))
  }, [sales])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const avgOrderValue = summary.totalSales > 0 ? summary.totalRevenue / summary.totalSales : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-wide">Sales Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">View and analyze your business performance</p>
        </div>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Sales Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium tracking-wide">TOTAL SALES</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light">{summary.totalSales || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium tracking-wide">TOTAL REVENUE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light">{formatCurrency(summary.totalRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium tracking-wide">TOTAL PROFIT</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light text-green-600">{formatCurrency(summary.totalProfit || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Margin: {summary.profitMargin?.toFixed(1) || 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium tracking-wide">AVG. ORDER VALUE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light">{formatCurrency(avgOrderValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium tracking-wide">TODAY'S REVENUE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light">{formatCurrency(summary.todayRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">{summary.todaySales || 0} sales today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium tracking-wide">TODAY'S PROFIT</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light text-green-600">{formatCurrency(summary.todayProfit || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Margin: {summary.todayProfitMargin?.toFixed(1) || 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium tracking-wide">TOTAL COST</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light text-muted-foreground">{formatCurrency(summary.totalCost || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Cost of goods sold</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium tracking-wide">PROFIT MARGIN</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light">{summary.profitMargin?.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground mt-1">Overall margin</p>
          </CardContent>
        </Card>
      </div>

      {/* Report Tabs */}
      <Tabs defaultValue="daily" className="space-y-6">
        <TabsList>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
          <TabsTrigger value="annual">Annual</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium tracking-wide">DAILY REVENUE</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    revenue: {
                      label: "Revenue",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium tracking-wide">DAILY ORDERS</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    orders: {
                      label: "Orders",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="orders" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="weekly" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium tracking-wide">MONTHLY REVENUE</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    revenue: {
                      label: "Revenue",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium tracking-wide">SALES BY CATEGORY</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    value: {
                      label: "Percentage",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie data={categoryData} dataKey="value" nameKey="category" cx="50%" cy="50%" outerRadius={100} />
                      <ChartLegend content={<ChartLegendContent />} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Category Profit Analysis Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium tracking-wide">CATEGORY PROFIT ANALYSIS</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No category data available</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                          CATEGORY
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                          QUANTITY SOLD
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                          REVENUE
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                          COST
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                          PROFIT
                        </th>
                        <th className="text-right py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                          PROFIT MARGIN
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryData.map((item) => (
                        <tr key={item.category} className="border-b border-border last:border-0">
                          <td className="py-3 px-4 text-sm font-light capitalize">{item.category.toLowerCase()}</td>
                          <td className="py-3 px-4 text-sm font-light text-right">{item.quantity}</td>
                          <td className="py-3 px-4 text-sm font-light text-right">{formatCurrency(item.revenue)}</td>
                          <td className="py-3 px-4 text-sm font-light text-right text-muted-foreground">
                            {formatCurrency(item.cost)}
                          </td>
                          <td
                            className={`py-3 px-4 text-sm font-medium text-right ${
                              item.profit >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {formatCurrency(item.profit)}
                          </td>
                          <td
                            className={`py-3 px-4 text-sm font-medium text-right ${
                              item.profitMargin >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {item.profitMargin.toFixed(2)}%
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

        <TabsContent value="quarterly" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Quarterly report data will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="annual" className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Annual report data will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* All Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium tracking-wide">RECENT SALES</CardTitle>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No sales yet</p>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                      SALE ID
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">DATE</th>
                  <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                    CUSTOMER
                  </th>
                    <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">SOURCE</th>
                  <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">ITEMS</th>
                  <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                  {sales.slice(0, 10).map((sale) => (
                    <tr key={sale.id} className="border-b border-border last:border-0">
                      <td className="py-3 px-4 text-sm font-mono">{sale.id.slice(0, 8)}...</td>
                      <td className="py-3 px-4 text-sm font-light">
                        {new Date(sale.createdAt).toLocaleDateString()}
                    </td>
                      <td className="py-3 px-4 text-sm font-light">
                        {sale.order.customerName || "Walk-in Customer"}
                    </td>
                    <td className="py-3 px-4">
                        <Badge variant={sale.source === "POS" ? "default" : "outline"}>
                          {sale.source === "POS" ? "In-Store" : "Online"}
                        </Badge>
                    </td>
                      <td className="py-3 px-4 text-sm font-light">{sale.order.items.length}</td>
                      <td className="py-3 px-4 text-sm font-light">{formatCurrency(sale.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
