"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Loader2, RotateCcw, Package } from "lucide-react"
import { useState, useEffect } from "react"
import { returnsApi, ordersApi } from "@/lib/api-client"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"

export default function ReturnsPage() {
  const [loading, setLoading] = useState(true)
  const [returns, setReturns] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [orders, setOrders] = useState<any[]>([])
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const { toast } = useToast()

  const [formData, setFormData] = useState({
    orderId: "",
    items: [] as Array<{ productId: string; quantity: number }>,
    reason: "",
    refundAmount: "",
  })

  useEffect(() => {
    loadReturns()
    loadOrders()
  }, [])

  const loadReturns = async () => {
    try {
      setLoading(true)
      const data = await returnsApi.getAll()
      setReturns(data.returns || [])
      setSummary(data.summary || {})
    } catch (error: any) {
      console.error("Failed to load returns:", error)
      toast({
        title: "Error",
        description: "Failed to load returns",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const loadOrders = async () => {
    try {
      const data = await ordersApi.getAll("PROCESSED", undefined, undefined, undefined, undefined)
      setOrders(data.filter((o: any) => !o.isReturn))
    } catch (error: any) {
      console.error("Failed to load orders:", error)
    }
  }

  const handleOrderSelect = (orderId: string) => {
    const order = orders.find((o) => o.id === orderId)
    setSelectedOrder(order)
    setFormData({
      ...formData,
      orderId,
      items: order?.items?.map((item: any) => ({
        productId: item.productId,
        quantity: 0,
      })) || [],
    })
  }

  const handleItemQuantityChange = (productId: string, quantity: number) => {
    setFormData({
      ...formData,
      items: formData.items.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      ),
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const itemsToReturn = formData.items.filter((item) => item.quantity > 0)
      if (itemsToReturn.length === 0) {
        toast({
          title: "Error",
          description: "Please select at least one item to return",
          variant: "destructive",
        })
        return
      }

      await returnsApi.create({
        orderId: formData.orderId,
        items: itemsToReturn,
        reason: formData.reason,
        refundAmount: formData.refundAmount ? parseFloat(formData.refundAmount) : undefined,
      })

      toast({
        title: "Success",
        description: "Return processed successfully",
      })
      setIsDialogOpen(false)
      setFormData({
        orderId: "",
        items: [],
        reason: "",
        refundAmount: "",
      })
      setSelectedOrder(null)
      loadReturns()
      loadOrders()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to process return",
        variant: "destructive",
      })
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

  if (loading && returns.length === 0) {
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
          <h1 className="text-2xl font-light tracking-wide">Returns & Refunds</h1>
          <p className="text-sm text-muted-foreground mt-1">Process returns and refunds for orders</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setFormData({
              orderId: "",
              items: [],
              reason: "",
              refundAmount: "",
            })
            setSelectedOrder(null)
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Process Return
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Process Return</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="orderId">Select Order</Label>
                <select
                  id="orderId"
                  className="w-full p-2 border rounded"
                  value={formData.orderId}
                  onChange={(e) => handleOrderSelect(e.target.value)}
                  required
                >
                  <option value="">Select an order...</option>
                  {orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      {order.id.slice(0, 8)}... - {format(new Date(order.createdAt), "MMM dd, yyyy")} - {formatCurrency(order.total)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedOrder && (
                <div className="space-y-2">
                  <Label>Select Items to Return</Label>
                  {selectedOrder.items?.map((item: any) => {
                    const returnItem = formData.items.find((i) => i.productId === item.productId)
                    const maxQuantity = item.quantity
                    return (
                      <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex-1">
                          <div className="font-medium">{item.product?.name || "Unknown Product"}</div>
                          <div className="text-sm text-muted-foreground">
                            Original: {item.quantity} × {formatCurrency(item.price)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`qty-${item.id}`} className="text-sm">Qty:</Label>
                          <Input
                            id={`qty-${item.id}`}
                            type="number"
                            min="0"
                            max={maxQuantity}
                            value={returnItem?.quantity || 0}
                            onChange={(e) => handleItemQuantityChange(item.productId, parseInt(e.target.value) || 0)}
                            className="w-20"
                          />
                          <span className="text-sm text-muted-foreground">/ {maxQuantity}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <div>
                <Label htmlFor="reason">Return Reason</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="refundAmount">Refund Amount (optional, defaults to item value)</Label>
                <Input
                  id="refundAmount"
                  type="number"
                  step="0.01"
                  value={formData.refundAmount}
                  onChange={(e) => setFormData({ ...formData, refundAmount: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">
                Process Return
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium tracking-wide">TOTAL RETURNS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light">{summary?.count || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium tracking-wide">TOTAL RETURN VALUE</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light">{formatCurrency(summary?.totalReturns || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Returned amount</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium tracking-wide">TOTAL REFUNDED</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-light">{formatCurrency(summary?.totalRefunds || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">Refunded amount</p>
          </CardContent>
        </Card>
      </div>

      {/* Returns Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium tracking-wide">ALL RETURNS</CardTitle>
        </CardHeader>
        <CardContent>
          {returns.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No returns yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Return Value</TableHead>
                  <TableHead className="text-right">Refund Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((returnOrder) => (
                  <TableRow key={returnOrder.id}>
                    <TableCell>{format(new Date(returnOrder.createdAt), "MMM dd, yyyy")}</TableCell>
                    <TableCell className="font-mono text-xs">{returnOrder.id.slice(0, 8)}...</TableCell>
                    <TableCell>{returnOrder.customerName || returnOrder.customer?.fullName || "N/A"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{returnOrder.items?.length || 0} items</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{returnOrder.returnReason || "N/A"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(returnOrder.total)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(returnOrder.refundAmount || 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

