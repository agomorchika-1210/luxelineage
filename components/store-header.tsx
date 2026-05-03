"use client"

import Link from "next/link"
import { ShoppingBag, Search, Menu, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { useCart } from "@/lib/cart-context"
import { ThemeToggle } from "@/components/theme-toggle"
import { Logo } from "@/components/logo"

export function StoreHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { totalItems } = useCart()

  return (
    <header className="border-b border-border bg-background sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Logo showSubtitle={false} />

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/shop" className="text-sm font-light tracking-wide hover:text-accent transition-colors">
              SHOP
            </Link>
            <Link href="/collections" className="text-sm font-light tracking-wide hover:text-accent transition-colors">
              COLLECTIONS
            </Link>
            <Link href="/brands" className="text-sm font-light tracking-wide hover:text-accent transition-colors">
              BRANDS
            </Link>
            <Link href="/about" className="text-sm font-light tracking-wide hover:text-accent transition-colors">
              ABOUT
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
              <User className="h-5 w-5" />
            </Button>
            <Link href="/cart">
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingBag className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <nav className="flex flex-col gap-4">
              <Link href="/shop" className="text-sm font-light tracking-wide hover:text-accent transition-colors">
                SHOP
              </Link>
              <Link
                href="/collections"
                className="text-sm font-light tracking-wide hover:text-accent transition-colors"
              >
                COLLECTIONS
              </Link>
              <Link href="/brands" className="text-sm font-light tracking-wide hover:text-accent transition-colors">
                BRANDS
              </Link>
              <Link href="/about" className="text-sm font-light tracking-wide hover:text-accent transition-colors">
                ABOUT
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
