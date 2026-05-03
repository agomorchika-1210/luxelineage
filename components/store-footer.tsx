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
                  href="/shop"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/collections" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Collections
                </Link>
              </li>
              <li>
                <Link href="/brands" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  All Brands
                </Link>
              </li>
            </ul>
          </div>

          {/* Account */}
          <div>
            <h4 className="text-sm font-medium tracking-wide mb-4">ACCOUNT</h4>
            <ul className="space-y-3">
              <li>
                <Link href="/cart" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Shopping Cart
                </Link>
              </li>
              <li>
                <Link
                  href="/checkout"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Checkout
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
                <Link href="/admin/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Staff Login
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
