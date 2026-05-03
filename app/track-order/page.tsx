"use client"

import { useState } from "react"
import { StoreHeader } from "@/components/store-header"
import { StoreFooter } from "@/components/store-footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { trackGuestOrder } from "@/lib/api-client"

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await trackGuestOrder(orderId.trim(), email.trim())
      setResult(data)
    } catch (err: any) {
      setError(err.message || "Lookup failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <StoreHeader />
      <main className="flex-1 max-w-lg mx-auto w-full px-4 py-12">
        <h1 className="font-serif text-3xl font-light tracking-wide mb-6 text-center">
          Track your order
        </h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-normal">
              Enter the order ID from your confirmation and the email you used at checkout.
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orderId">Order ID</Label>
                <Input
                  id="orderId"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="e.g. clx..."
                  required
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Look up"}
              </Button>
            </form>
            {error && <p className="text-sm text-destructive mt-4">{error}</p>}
            {result && (
              <div className="mt-6 space-y-2 text-sm border-t pt-4">
                <p>
                  <span className="text-muted-foreground">Status:</span> {result.status}
                </p>
                <p>
                  <span className="text-muted-foreground">Payment:</span>{" "}
                  {result.paymentStatus}
                </p>
                <p>
                  <span className="text-muted-foreground">Total:</span> $
                  {Number(result.total).toFixed(2)}
                </p>
                <p className="text-muted-foreground text-xs">
                  Placed {new Date(result.createdAt).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <StoreFooter />
    </div>
  )
}
