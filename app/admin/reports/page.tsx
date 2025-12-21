"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, TrendingUp, TrendingDown, Eye } from "lucide-react"
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
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"

// Mock data
const dailyData = [
  { day: "Mon", revenue: 12500, orders: 28 },
  { day: "Tue", revenue: 15200, orders: 34 },
  { day: "Wed", revenue: 13800, orders: 31 },
  { day: "Thu", revenue: 16900, orders: 38 },
  { day: "Fri", revenue: 18400, orders: 42 },
  { day: "Sat", revenue: 21500, orders: 48 },
  { day: "Sun", revenue: 17800, orders: 39 },
]

const monthlyData = [
  { month: "Jul", revenue: 285000, orders: 642 },
  { month: "Aug", revenue: 312000, orders: 701 },
  { month: "Sep", revenue: 298000, orders: 668 },
  { month: "Oct", revenue: 341000, orders: 765 },
  { month: "Nov", revenue: 329000, orders: 738 },
  { month: "Dec", revenue: 387000, orders: 869 },
]

const categoryData = [
  { category: "Business Wear", value: 35, fill: "hsl(var(--chart-1))" },
  { category: "Casual", value: 25, fill: "hsl(var(--chart-2))" },
  { category: "Footwear", value: 20, fill: "hsl(var(--chart-3))" },
  { category: "Accessories", value: 15, fill: "hsl(var(--chart-4))" },
  { category: "Other", value: 5, fill: "hsl(var(--chart-5))" },
]

// Mock sales data for reports
const salesOrders = [
  {
    id: "ORD-001",
    date: "2025-01-15",
    customer: "John Smith",
    email: "john.smith@email.com",
    items: 2,
    total: 1198,
    status: "Completed",
    payment: "Paid",
  },
  {
    id: "ORD-002",
    date: "2025-01-15",
    customer: "Sarah Johnson",
    email: "sarah.j@email.com",
    items: 1,
    total: 1299,
    status: "Processing",
    payment: "Paid",
  },
  {
    id: "ORD-003",
    date: "2025-01-14",
    customer: "Michael Brown",
    email: "m.brown@email.com",
    items: 3,
    total: 1547,
    status: "Shipped",
    payment: "Paid",
  },
  {
    id: "ORD-004",
    date: "2025-01-14",
    customer: "Emily Davis",
    email: "emily.davis@email.com",
    items: 1,
    total: 299,
    status: "Completed",
    payment: "Paid",
  },
  {
    id: "ORD-005",
    date: "2025-01-13",
    customer: "David Wilson",
    email: "d.wilson@email.com",
    items: 2,
    total: 448,
    status: "Completed",
    payment: "Paid",
  },
  {
    id: "ORD-006",
    date: "2025-01-13",
    customer: "Lisa Anderson",
    email: "lisa.a@email.com",
    items: 4,
    total: 2896,
    status: "Processing",
    payment: "Paid",
  },
]

export default function ReportsPage() {
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
            <CardTitle className="text-sm font-medium tracking-wide">TOTAL ORDERS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light">156</div>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium tracking-wide">REVENUE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light">$78,942</div>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium tracking-wide">AVG. ORDER VALUE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light">$506</div>
            <p className="text-xs text-muted-foreground mt-1">Per transaction</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium tracking-wide">PENDING ORDERS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light">8</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting processing</p>
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
            <div className="text-3xl font-light">$18,400</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <p className="text-xs text-green-600">+12.5%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium tracking-wide">THIS WEEK</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light">$116,100</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <p className="text-xs text-green-600">+8.3%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium tracking-wide">THIS MONTH</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light">$387,000</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <p className="text-xs text-green-600">+17.6%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium tracking-wide">THIS QUARTER</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light">$1.06M</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingDown className="h-3 w-3 text-red-600" />
              <p className="text-xs text-red-600">-2.1%</p>
            </div>
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

      {/* All Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium tracking-wide">ALL ORDERS</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                    ORDER ID
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">DATE</th>
                  <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                    CUSTOMER
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">EMAIL</th>
                  <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">ITEMS</th>
                  <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">TOTAL</th>
                  <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                    STATUS
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                    PAYMENT
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium tracking-wide text-muted-foreground">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {salesOrders.map((order) => (
                  <tr key={order.id} className="border-b border-border last:border-0">
                    <td className="py-3 px-4 text-sm font-mono">{order.id}</td>
                    <td className="py-3 px-4 text-sm font-light">{order.date}</td>
                    <td className="py-3 px-4 text-sm font-light">{order.customer}</td>
                    <td className="py-3 px-4 text-sm font-light text-muted-foreground">{order.email}</td>
                    <td className="py-3 px-4 text-sm font-light">{order.items}</td>
                    <td className="py-3 px-4 text-sm font-light">${order.total}</td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={
                          order.status === "Completed"
                            ? "default"
                            : order.status === "Processing"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {order.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant="default">{order.payment}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Eye className="h-4 w-4" />
                      </Button>
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
