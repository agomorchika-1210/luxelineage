"use client"

import { Suspense } from "react"
import { StoreHeader } from "@/components/store-header"
import { StoreFooter } from "@/components/store-footer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle2, Loader2 } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { useCart } from "@/lib/cart-context"

function OrderConfirmationInner() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")
  const { clearCart } = useCart()

  const [orderId, setOrderId] = useState<string | null>(null)
  const [pending, setPending] = useState(!!sessionId)
  const [pollError, setPollError] = useState<string | null>(null)
  const cleared = useRef(false)

  useEffect(() => {
    if (!sessionId) return

    let cancelled = false
    let attempts = 0
    const maxAttempts = 45

    const poll = async () => {
      const { checkoutApi } = await import("@/lib/api-client")
      while (!cancelled && attempts < maxAttempts) {
        attempts += 1
        try {
          const res = await checkoutApi.getOrderFromSession(sessionId)
          if (!res.pending && res.order?.id) {
            setOrderId(res.order.id)
            setPending(false)
            if (!cleared.current) {
              cleared.current = true
              clearCart()
            }
            return
          }
        } catch (e: any) {
          setPollError(e.message || "Could not confirm payment status.")
          setPending(false)
          return
        }
        await new Promise((r) => setTimeout(r, 1000))
      }
      if (!cancelled) {
        setPollError(
          "Payment received but order is still processing. Check your email or track your order."
        )
        setPending(false)
      }
    }

    poll()
    return () => {
      cancelled = true
    }
  }, [sessionId, clearCart])

  const displayId =
    orderId ||
    (!sessionId ? "pending" : null)

  return (
    <div className="min-h-screen flex flex-col">
      <StoreHeader />

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="max-w-2xl w-full p-8 md:p-12 text-center">
          <div className="mb-6 flex justify-center">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              {pending ? (
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
              ) : (
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              )}
            </div>
          </div>

          <h1 className="font-serif text-3xl md:text-4xl font-light tracking-wide mb-4">
            {pending ? "Confirming your order…" : "Order Confirmed"}
          </h1>

          <p className="text-muted-foreground font-light mb-2">
            {pending
              ? "Finalising your payment with the store. This usually takes a few seconds."
              : "Thank you for your purchase! Your order has been recorded."}
          </p>

          {!pending && displayId && displayId !== "pending" && (
            <p className="text-sm text-muted-foreground font-light mb-8">
              Order ID: <span className="font-mono">{displayId}</span>
            </p>
          )}

          {!sessionId && !orderId && (
            <p className="text-sm text-muted-foreground font-light mb-8">
              Save your confirmation details. You can track status with your email on the{" "}
              <Link href="/track-order" className="underline">
                track order
              </Link>{" "}
              page.
            </p>
          )}

          {pollError && (
            <p className="text-sm text-amber-700 dark:text-amber-400 mb-6">{pollError}</p>
          )}

          <div className="bg-muted p-6 rounded mb-8">
            <h2 className="text-sm font-medium tracking-wide mb-4">WHAT&apos;S NEXT?</h2>
            <ul className="space-y-3 text-left">
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span className="text-sm font-light text-muted-foreground">
                  We will confirm and process your order from the admin dashboard.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span className="text-sm font-light text-muted-foreground">
                  Track your order anytime with your email and order ID.
                </span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/shop">
              <Button size="lg">CONTINUE SHOPPING</Button>
            </Link>
            <Link href="/track-order">
              <Button size="lg" variant="outline">
                TRACK ORDER
              </Button>
            </Link>
          </div>
        </Card>
      </main>

      <StoreFooter />
    </div>
  )
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <OrderConfirmationInner />
    </Suspense>
  )
}
