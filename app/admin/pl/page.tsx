"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Download, TrendingUp, TrendingDown, Loader2, DollarSign, Package, Receipt } from "lucide-react"
import { useState, useEffect } from "react"
import { plApi } from "@/lib/api-client"
import { format } from "date-fns"

export default function PLPage() {
  const [loading, setLoading] = useState(true)
  const [plData, setPlData] = useState<any>(null)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  useEffect(() => {
    loadPLData()
  }, [])

  const loadPLData = async () => {
    try {
      setLoading(true)
      const data = await plApi.get(startDate || undefined, endDate || undefined)
      setPlData(data)
    } catch (error: any) {
      console.error("Failed to load P&L data:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const handleFilter = () => {
    loadPLData()
  }

  const handleReset = () => {
    setStartDate("")
    setEndDate("")
    setTimeout(() => loadPLData(), 100)
  }

  if (loading && !plData) {
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
          <h1 className="text-2xl font-light tracking-wide">Profit & Loss Statement</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your profitability and financial performance</p>
        </div>
        <Button onClick={() => window.print()}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Date Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium tracking-wide">FILTER BY DATE</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleFilter}>Apply Filter</Button>
              <Button variant="outline" onClick={handleReset}>Reset</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {plData && (
        <>
          {/* Revenue Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium tracking-wide flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                REVENUE
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm font-light">Total Sales</span>
                <span className="text-lg font-light">{formatCurrency(plData.revenue.totalSales)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm font-light text-muted-foreground">Returns</span>
                <span className="text-lg font-light text-red-600">-{formatCurrency(plData.revenue.returns)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm font-light text-muted-foreground">Discounts</span>
                <span className="text-lg font-light text-red-600">-{formatCurrency(plData.revenue.discounts || 0)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium">Net Revenue</span>
                <span className="text-2xl font-light">{formatCurrency(plData.revenue.netRevenue)}</span>
              </div>
            </CardContent>
          </Card>

          {/* COGS Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium tracking-wide flex items-center gap-2">
                <Package className="h-5 w-5" />
                COST OF GOODS SOLD (COGS)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm font-light">Total COGS</span>
                <span className="text-lg font-light">{formatCurrency(plData.cogs.totalCOGS)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-sm font-light text-muted-foreground">Returns COGS</span>
                <span className="text-lg font-light text-green-600">-{formatCurrency(plData.cogs.returnsCOGS)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium">Net COGS</span>
                <span className="text-2xl font-light">{formatCurrency(plData.cogs.netCOGS)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Gross Profit */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium tracking-wide flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                GROSS PROFIT
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium">Gross Profit</span>
                <div className="text-right">
                  <div className="text-3xl font-light">{formatCurrency(plData.grossProfit)}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Margin: {plData.grossProfitMargin.toFixed(2)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Expenses Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium tracking-wide flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                EXPENSES
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(plData.expenses.byCategory || {}).map(([category, amount]: [string, any]) => (
                <div key={category} className="flex justify-between items-center py-2 border-b">
                  <span className="text-sm font-light capitalize">{category.replace('_', ' ').toLowerCase()}</span>
                  <span className="text-lg font-light">{formatCurrency(amount)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-2 pt-4 border-t-2">
                <span className="text-sm font-medium">Total Expenses</span>
                <span className="text-2xl font-light">{formatCurrency(plData.expenses.total)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Net Profit/Loss */}
          <Card className={plData.netProfit >= 0 ? "border-green-500" : "border-red-500"}>
            <CardHeader>
              <CardTitle className="text-base font-medium tracking-wide flex items-center gap-2">
                {plData.netProfit >= 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-600" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-red-600" />
                )}
                NET {plData.netProfit >= 0 ? "PROFIT" : "LOSS"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium">Net {plData.netProfit >= 0 ? "Profit" : "Loss"}</span>
                <div className="text-right">
                  <div className={`text-4xl font-light ${plData.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCurrency(plData.netProfit)}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Margin: {plData.netProfitMargin.toFixed(2)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium tracking-wide">SUMMARY</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Period:</span>
                  <span className="ml-2">
                    {plData.period.startDate
                      ? format(new Date(plData.period.startDate), "MMM dd, yyyy")
                      : "All time"} - {plData.period.endDate
                      ? format(new Date(plData.period.endDate), "MMM dd, yyyy")
                      : "Present"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Gross Profit Margin:</span>
                  <span className="ml-2 font-medium">{plData.grossProfitMargin.toFixed(2)}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Net Profit Margin:</span>
                  <span className="ml-2 font-medium">{plData.netProfitMargin.toFixed(2)}%</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Expense Ratio:</span>
                  <span className="ml-2 font-medium">
                    {plData.revenue.netRevenue > 0
                      ? ((plData.expenses.total / plData.revenue.netRevenue) * 100).toFixed(2)
                      : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

