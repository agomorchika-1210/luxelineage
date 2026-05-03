"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Loader2, Edit, Trash2, FileText, Building2, Wallet, Package } from "lucide-react"
import { useState, useEffect } from "react"
import { balanceSheetApi, assetsApi, liabilitiesApi } from "@/lib/api-client"
import { format } from "date-fns"
import { useToast } from "@/hooks/use-toast"

const ASSET_TYPES = [
  "BANK_ACCOUNT",
  "LEASE_PROPERTY",
  "LEASE_ASSETS",
  "OTHER_FIXED",
  "OTHER_CURRENT",
]

const LIABILITY_TYPES = [
  "ACCOUNTS_PAYABLE",
  "LOANS",
  "LEASE_LIABILITIES",
  "TAXES_PAYABLE",
  "OTHER",
]

export default function BalanceSheetPage() {
  const [loading, setLoading] = useState(true)
  const [balanceSheet, setBalanceSheet] = useState<any>(null)
  const [isAssetDialogOpen, setIsAssetDialogOpen] = useState(false)
  const [isLiabilityDialogOpen, setIsLiabilityDialogOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<any>(null)
  const [editingLiability, setEditingLiability] = useState<any>(null)
  const { toast } = useToast()

  const [assetFormData, setAssetFormData] = useState({
    type: "",
    name: "",
    description: "",
    value: "",
    date: format(new Date(), "yyyy-MM-dd"),
  })

  const [liabilityFormData, setLiabilityFormData] = useState({
    type: "",
    name: "",
    description: "",
    amount: "",
    date: format(new Date(), "yyyy-MM-dd"),
  })

  useEffect(() => {
    loadBalanceSheet()
  }, [])

  const loadBalanceSheet = async () => {
    try {
      setLoading(true)
      const data = await balanceSheetApi.get()
      setBalanceSheet(data)
    } catch (error: any) {
      console.error("Failed to load balance sheet:", error)
      toast({
        title: "Error",
        description: "Failed to load balance sheet",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!assetFormData.value || assetFormData.value.trim() === "") {
        toast({
          title: "Error",
          description: "Asset value is required",
          variant: "destructive",
        })
        return
      }
      const assetPayload = {
        ...assetFormData,
        value: Number(assetFormData.value),
      }
      if (editingAsset) {
        await assetsApi.update(editingAsset.id, assetPayload)
        toast({
          title: "Success",
          description: "Asset updated successfully",
        })
      } else {
        await assetsApi.create(assetPayload)
        toast({
          title: "Success",
          description: "Asset created successfully",
        })
      }
      setIsAssetDialogOpen(false)
      setEditingAsset(null)
      setAssetFormData({
        type: "",
        name: "",
        description: "",
        value: "",
        date: format(new Date(), "yyyy-MM-dd"),
      })
      loadBalanceSheet()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save asset",
        variant: "destructive",
      })
    }
  }

  const handleLiabilitySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (!liabilityFormData.amount || liabilityFormData.amount.trim() === "") {
        toast({
          title: "Error",
          description: "Liability amount is required",
          variant: "destructive",
        })
        return
      }
      const liabilityPayload = {
        ...liabilityFormData,
        amount: Number(liabilityFormData.amount),
      }
      if (editingLiability) {
        await liabilitiesApi.update(editingLiability.id, liabilityPayload)
        toast({
          title: "Success",
          description: "Liability updated successfully",
        })
      } else {
        await liabilitiesApi.create(liabilityPayload)
        toast({
          title: "Success",
          description: "Liability created successfully",
        })
      }
      setIsLiabilityDialogOpen(false)
      setEditingLiability(null)
      setLiabilityFormData({
        type: "",
        name: "",
        description: "",
        amount: "",
        date: format(new Date(), "yyyy-MM-dd"),
      })
      loadBalanceSheet()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save liability",
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

  if (loading && !balanceSheet) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!balanceSheet) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-wide">Balance Sheet</h1>
          <p className="text-sm text-muted-foreground mt-1">
            As of {format(new Date(balanceSheet.asOf), "MMM dd, yyyy")}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isAssetDialogOpen} onOpenChange={(open) => {
            setIsAssetDialogOpen(open)
            if (!open) {
              setEditingAsset(null)
              setAssetFormData({
                type: "",
                name: "",
                description: "",
                value: "",
                date: format(new Date(), "yyyy-MM-dd"),
              })
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Asset
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingAsset ? "Edit Asset" : "Add Asset"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAssetSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="assetType">Type</Label>
                  <Select value={assetFormData.type} onValueChange={(value) => setAssetFormData({ ...assetFormData, type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace('_', ' ').toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="assetName">Name</Label>
                  <Input
                    id="assetName"
                    value={assetFormData.name}
                    onChange={(e) => setAssetFormData({ ...assetFormData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="assetDescription">Description</Label>
                  <Textarea
                    id="assetDescription"
                    value={assetFormData.description}
                    onChange={(e) => setAssetFormData({ ...assetFormData, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="assetValue">Value</Label>
                  <Input
                    id="assetValue"
                    type="number"
                    step="0.01"
                    value={assetFormData.value}
                    onChange={(e) => setAssetFormData({ ...assetFormData, value: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="assetDate">Date</Label>
                  <Input
                    id="assetDate"
                    type="date"
                    value={assetFormData.date}
                    onChange={(e) => setAssetFormData({ ...assetFormData, date: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingAsset ? "Update" : "Create"} Asset
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isLiabilityDialogOpen} onOpenChange={(open) => {
            setIsLiabilityDialogOpen(open)
            if (!open) {
              setEditingLiability(null)
              setLiabilityFormData({
                type: "",
                name: "",
                description: "",
                amount: "",
                date: format(new Date(), "yyyy-MM-dd"),
              })
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Liability
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingLiability ? "Edit Liability" : "Add Liability"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleLiabilitySubmit} className="space-y-4">
                <div>
                  <Label htmlFor="liabilityType">Type</Label>
                  <Select value={liabilityFormData.type} onValueChange={(value) => setLiabilityFormData({ ...liabilityFormData, type: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {LIABILITY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type.replace('_', ' ').toLowerCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="liabilityName">Name</Label>
                  <Input
                    id="liabilityName"
                    value={liabilityFormData.name}
                    onChange={(e) => setLiabilityFormData({ ...liabilityFormData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="liabilityDescription">Description</Label>
                  <Textarea
                    id="liabilityDescription"
                    value={liabilityFormData.description}
                    onChange={(e) => setLiabilityFormData({ ...liabilityFormData, description: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="liabilityAmount">Amount</Label>
                  <Input
                    id="liabilityAmount"
                    type="number"
                    step="0.01"
                    value={liabilityFormData.amount}
                    onChange={(e) => setLiabilityFormData({ ...liabilityFormData, amount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="liabilityDate">Date</Label>
                  <Input
                    id="liabilityDate"
                    type="date"
                    value={liabilityFormData.date}
                    onChange={(e) => setLiabilityFormData({ ...liabilityFormData, date: e.target.value })}
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  {editingLiability ? "Update" : "Create"} Liability
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Assets Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium tracking-wide flex items-center gap-2">
              <Package className="h-5 w-5" />
              CURRENT ASSETS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-light">Inventory</span>
              <span className="text-lg font-light">{formatCurrency(balanceSheet.assets.current.inventory.value)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-light">Bank Account</span>
              <span className="text-lg font-light">{formatCurrency(balanceSheet.assets.current.bankAccount)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-light">Other Current Assets</span>
              <span className="text-lg font-light">{formatCurrency(balanceSheet.assets.current.otherCurrent)}</span>
            </div>
            <div className="flex justify-between items-center py-2 pt-4 border-t-2">
              <span className="text-sm font-medium">Total Current Assets</span>
              <span className="text-2xl font-light">{formatCurrency(balanceSheet.assets.current.total)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium tracking-wide flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              FIXED ASSETS
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-light">Lease Property</span>
              <span className="text-lg font-light">{formatCurrency(balanceSheet.assets.fixed.leaseProperty)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-light">Lease Assets</span>
              <span className="text-lg font-light">{formatCurrency(balanceSheet.assets.fixed.leaseAssets)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-sm font-light">Other Fixed Assets</span>
              <span className="text-lg font-light">{formatCurrency(balanceSheet.assets.fixed.otherFixed)}</span>
            </div>
            <div className="flex justify-between items-center py-2 pt-4 border-t-2">
              <span className="text-sm font-medium">Total Fixed Assets</span>
              <span className="text-2xl font-light">{formatCurrency(balanceSheet.assets.fixed.total)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liabilities & Equity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium tracking-wide flex items-center gap-2">
              <FileText className="h-5 w-5" />
              LIABILITIES
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium">Total Liabilities</span>
              <span className="text-2xl font-light">{formatCurrency(balanceSheet.liabilities.total)}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium tracking-wide flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              EQUITY
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium">Equity</span>
              <span className="text-2xl font-light">{formatCurrency(balanceSheet.equity)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Balance Summary */}
      <Card className={balanceSheet.balance.isBalanced ? "border-green-500" : "border-red-500"}>
        <CardHeader>
          <CardTitle className="text-base font-medium tracking-wide">BALANCE SUMMARY</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm">Total Assets:</span>
              <span className="font-medium">{formatCurrency(balanceSheet.balance.assets)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Total Liabilities:</span>
              <span className="font-medium">{formatCurrency(balanceSheet.balance.liabilities)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm">Equity:</span>
              <span className="font-medium">{formatCurrency(balanceSheet.balance.equity)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-sm font-medium">Balance:</span>
              <span className={`font-medium ${balanceSheet.balance.isBalanced ? "text-green-600" : "text-red-600"}`}>
                {balanceSheet.balance.isBalanced ? "✓ Balanced" : "✗ Not Balanced"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Details */}
      {balanceSheet.assets.current.inventory.items && balanceSheet.assets.current.inventory.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium tracking-wide">INVENTORY BREAKDOWN</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {balanceSheet.assets.current.inventory.items.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.cost)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.totalValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

