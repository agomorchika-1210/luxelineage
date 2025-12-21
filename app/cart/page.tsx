"use client"

import { StoreHeader } from "@/components/store-header"
import { StoreFooter } from "@/components/store-footer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useCart } from "@/lib/cart-context"
import { Minus, Plus, X, ArrowRight } from "lucide-react"
import Link from "next/link"

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice } = useCart()

  const shipping = 0 // Free shipping
  const tax = totalPrice * 0.1 // 10% tax
  const total = totalPrice + shipping + tax

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex flex-col">
        <StoreHeader />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <h1 className="font-serif text-3xl font-light tracking-wide mb-4">Your cart is empty</h1>
            <p className="text-muted-foreground font-light mb-8">Discover our curated collection of premium fashion</p>
            <Link href="/shop">
              <Button size="lg">
                SHOP COLLECTION
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </main>
        <StoreFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <StoreHeader />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="font-serif text-4xl font-light tracking-wide mb-8">Shopping Cart</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <Card key={`${item.id}-${item.size}-${item.color}`} className="p-6">
                  <div className="flex gap-6">
                    <div className="w-32 h-40 flex-shrink-0 bg-muted rounded overflow-hidden">
                      <img
                        src={item.image || "/placeholder.svg"}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 tracking-wide">{item.brand.toUpperCase()}</p>
                          <h3 className="text-lg font-light mb-2">{item.name}</h3>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => removeItem(item.id, item.size, item.color)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-2 mb-4">
                        <p className="text-sm text-muted-foreground">
                          Size: <span className="text-foreground">{item.size}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Color: <span className="text-foreground">{item.color}</span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 bg-transparent"
                            onClick={() => updateQuantity(item.id, item.size, item.color, item.quantity - 1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 bg-transparent"
                            onClick={() => updateQuantity(item.id, item.size, item.color, item.quantity + 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-lg font-light">${item.price * item.quantity}</p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <Card className="p-6 sticky top-24">
                <h2 className="text-lg font-medium tracking-wide mb-6">ORDER SUMMARY</h2>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-light">${totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-light">{shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tax (10%)</span>
                    <span className="font-light">${tax.toFixed(2)}</span>
                  </div>
                  <div className="pt-4 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="font-medium tracking-wide">Total</span>
                      <span className="text-2xl font-light">${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <Input placeholder="Promo code" />
                  <Button variant="outline" className="w-full bg-transparent">
                    APPLY
                  </Button>
                </div>

                <Link href="/checkout">
                  <Button size="lg" className="w-full">
                    PROCEED TO CHECKOUT
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>

                <Link href="/shop">
                  <Button variant="ghost" className="w-full mt-4">
                    CONTINUE SHOPPING
                  </Button>
                </Link>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <StoreFooter />
    </div>
  )
}
