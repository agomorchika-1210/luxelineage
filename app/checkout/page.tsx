"use client"

import type React from "react"

import { StoreHeader } from "@/components/store-header"
import { StoreFooter } from "@/components/store-footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useCart } from "@/lib/cart-context"
import { CreditCard, Wallet, Lock, Loader2, AlertCircle } from "lucide-react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function CheckoutPage() {
  const { items, totalPrice, clearCart, validateCart, isLoaded } = useCart()
  const router = useRouter()
  /** `cod` = cash on delivery; `paystack` = redirect to Paystack (requires env). */
  const [checkoutMode, setCheckoutMode] = useState<"cod" | "paystack">("cod")
  const paystackEnabled =
    typeof process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY === "string" &&
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY.length > 0
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return (crypto as any).randomUUID()
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
  })

  const shipping = 0
  const tax = totalPrice * 0.1
  const total = totalPrice + shipping + tax

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Redirect to cart if empty (after cart is loaded)
  useEffect(() => {
    if (isLoaded && items.length === 0) {
      router.push("/cart")
    }
  }, [isLoaded, items.length, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const validation = await validateCart()

      if (!validation.valid) {
        setError(
          `Some items in your cart are no longer available:\n${validation.errors.join('\n')}\n\nPlease update your cart and try again.`
        )
        setIsSubmitting(false)
        return
      }

      const form = e.currentTarget as HTMLFormElement
      const formData = new FormData(form)

      const firstName = formData.get("firstName") as string
      const lastName = formData.get("lastName") as string
      const email = formData.get("email") as string
      const phone = formData.get("phone") as string
      const address = formData.get("address") as string
      const city = formData.get("city") as string
      const state = formData.get("state") as string
      const zip = formData.get("zip") as string
      const country = formData.get("country") as string

      const shippingAddress = `${address}, ${city}, ${state} ${zip}, ${country}`
      const customerName = `${firstName} ${lastName}`

      const lineItems = items.map((item) => ({
        productId: item.productId || item.id.toString(),
        quantity: item.quantity,
      }))

      const { ordersApi, checkoutApi } = await import("@/lib/api-client")

      if (checkoutMode === "paystack" && paystackEnabled) {
        const { authorizationUrl } = await checkoutApi.initializePaystack(
          {
            items: lineItems,
            customerName,
            customerEmail: email,
            customerPhone: phone,
            shippingAddress,
          },
          idempotencyKey
        )
        window.location.href = authorizationUrl
        return
      }

      await ordersApi.create(
        {
          source: "ONLINE",
          items: lineItems,
          customerName,
          customerEmail: email,
          customerPhone: phone,
          shippingAddress,
          paymentMethod: checkoutMode === "cod" ? "cod" : "instant_checkout",
        },
        idempotencyKey
      )

      clearCart()
      router.push("/order-confirmation")
    } catch (err: any) {
      setError(err.message || "Failed to place order. Please try again.")
      setIsSubmitting(false)
      // New key for a future retry attempt after an error.
      setIdempotencyKey(() => {
        if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
          return (crypto as any).randomUUID()
        }
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`
      })
    }
  }

  // Show loading while cart is loading
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex flex-col">
        <StoreHeader />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
        <StoreFooter />
      </div>
    )
  }

  // Don't render checkout form if cart is empty
  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <StoreHeader />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
        <StoreFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <StoreHeader />

      <main className="flex-1 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="font-serif text-4xl font-light tracking-wide mb-8">Checkout</h1>

          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Checkout Form */}
              <div className="lg:col-span-2 space-y-6">
                {/* Shipping Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-medium tracking-wide">SHIPPING INFORMATION</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" placeholder="John" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" placeholder="Smith" required />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="john.smith@email.com" required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" required />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Street Address</Label>
                      <Input id="address" placeholder="123 Main St" required />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City</Label>
                        <Input id="city" placeholder="New York" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="state">State/Province</Label>
                        <Input id="state" placeholder="NY" required />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="zip">ZIP/Postal Code</Label>
                        <Input id="zip" placeholder="10001" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Input id="country" placeholder="United States" required />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Method */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg font-medium tracking-wide">PAYMENT METHOD</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <RadioGroup
                      value={checkoutMode}
                      onValueChange={(v) => setCheckoutMode(v as "cod" | "paystack")}
                    >
                      <div className="flex items-center space-x-3 p-4 border border-border rounded cursor-pointer hover:bg-muted">
                        <RadioGroupItem value="cod" id="cod" />
                        <Label htmlFor="cod" className="flex items-center gap-2 cursor-pointer flex-1">
                          <Wallet className="h-5 w-5" />
                          <span>
                            Cash on delivery / pay in store when you collect
                            <span className="block text-xs text-muted-foreground font-normal mt-1">
                              Inventory is updated as soon as you place the order.
                            </span>
                          </span>
                        </Label>
                      </div>

                      {paystackEnabled && (
                        <div className="flex items-center space-x-3 p-4 border border-border rounded cursor-pointer hover:bg-muted">
                          <RadioGroupItem value="paystack" id="paystack" />
                          <Label htmlFor="paystack" className="flex items-center gap-2 cursor-pointer flex-1">
                            <CreditCard className="h-5 w-5" />
                            <span>
                              Pay now with Paystack (card, bank, USSD…)
                              <span className="block text-xs text-muted-foreground font-normal mt-1">
                                Secure redirect — payment confirmed before the order is recorded in the shop.
                              </span>
                            </span>
                          </Label>
                        </div>
                      )}
                    </RadioGroup>

                    {!paystackEnabled && (
                      <p className="text-sm text-muted-foreground font-light">
                        Online card/bank payments via Paystack appear here when{" "}
                        <code className="text-xs">NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY</code> and{" "}
                        <code className="text-xs">PAYSTACK_SECRET_KEY</code> are configured.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <Card className="sticky top-24">
                  <CardHeader>
                    <CardTitle className="text-lg font-medium tracking-wide">ORDER SUMMARY</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      {items.map((item) => (
                        <div key={`${item.id}-${item.size}-${item.color}`} className="flex gap-4">
                          <div className="w-16 h-20 bg-muted rounded overflow-hidden flex-shrink-0">
                            <img
                              src={item.image || "/placeholder.svg"}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-light truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.size}, {item.color}
                            </p>
                            <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                            <p className="text-sm font-light mt-1">${item.price * item.quantity}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3 pt-4 border-t border-border">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-light">${totalPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Shipping</span>
                        <span className="font-light">Free</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Tax</span>
                        <span className="font-light">${tax.toFixed(2)}</span>
                      </div>
                      <div className="pt-3 border-t border-border">
                        <div className="flex items-center justify-between">
                          <span className="font-medium tracking-wide">Total</span>
                          <span className="text-2xl font-light">${total.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          PROCESSING...
                        </>
                      ) : (
                        <>
                          <Lock className="mr-2 h-4 w-4" />
                          PLACE ORDER
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center font-light">
                      Your payment information is secure and encrypted
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </div>
      </main>

      <StoreFooter />
    </div>
  )
}
