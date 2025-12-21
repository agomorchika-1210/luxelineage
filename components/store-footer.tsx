import Link from "next/link"

export function StoreFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1">
            <h3 className="font-serif text-xl font-light tracking-wider mb-4">LUXELINEAGE</h3>
            <p className="text-sm text-muted-foreground font-light leading-relaxed">
              Premium fashion for the discerning professional. Curated collections from the world's finest brands.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-sm font-medium tracking-wide mb-4">SHOP</h4>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/shop/business-wear"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Corporate Business Wear
                </Link>
              </li>
              <li>
                <Link
                  href="/shop/casual"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Casual Wear
                </Link>
              </li>
              <li>
                <Link
                  href="/shop/footwear"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Footwear
                </Link>
              </li>
              <li>
                <Link href="/brands" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  All Brands
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-medium tracking-wide mb-4">SUPPORT</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  href="/shipping"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Shipping & Returns
                </Link>
              </li>
              <li>
                <Link
                  href="/size-guide"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Size Guide
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-medium tracking-wide mb-4">COMPANY</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-center text-sm text-muted-foreground font-light">© 2025 LUXELINEAGE. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
