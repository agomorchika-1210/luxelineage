import { StoreHeader } from "@/components/store-header"
import { StoreFooter } from "@/components/store-footer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"
import Link from "next/link"

export default function OrderConfirmationPage() {
  const orderNumber = `ORD-${Math.random().toString(36).substring(2, 9).toUpperCase()}`

  return (
    <div className="min-h-screen flex flex-col">
      <StoreHeader />

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="max-w-2xl w-full p-8 md:p-12 text-center">
          <div className="mb-6 flex justify-center">
            <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
          </div>

          <h1 className="font-serif text-3xl md:text-4xl font-light tracking-wide mb-4">Order Confirmed</h1>

          <p className="text-muted-foreground font-light mb-2">
            Thank you for your purchase! Your order has been successfully placed.
          </p>

          <p className="text-sm text-muted-foreground font-light mb-8">Order number: #{orderNumber}</p>

          <div className="bg-muted p-6 rounded mb-8">
            <h2 className="text-sm font-medium tracking-wide mb-4">WHAT'S NEXT?</h2>
            <ul className="space-y-3 text-left">
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span className="text-sm font-light text-muted-foreground">
                  You'll receive an order confirmation email with details
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span className="text-sm font-light text-muted-foreground">
                  We'll send you a shipping notification when your order is on its way
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-primary mt-1">•</span>
                <span className="text-sm font-light text-muted-foreground">Expected delivery: 3-5 business days</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/shop">
              <Button size="lg">CONTINUE SHOPPING</Button>
            </Link>
            <Link href="/">
              <Button size="lg" variant="outline">
                BACK TO HOME
              </Button>
            </Link>
          </div>
        </Card>
      </main>

      <StoreFooter />
    </div>
  )
}
