import { StoreHeader } from "@/components/store-header"
import { StoreFooter } from "@/components/store-footer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight } from "lucide-react"

export default function HomePage() {
  const categories = [
    { name: "Corporate Business Wear", href: "/shop", image: "/elegant-business-suit-on-mannequin.jpg" },
    { name: "Corporate Casual", href: "/shop", image: "/smart-casual-blazer-and-chinos.jpg" },
    { name: "Casual Wear", href: "/shop", image: "/premium-casual-clothing.jpg" },
    { name: "Footwear", href: "/shop", image: "/luxury-leather-shoes.jpg" },
  ]

  const featuredBrands = ["Gucci", "Lacoste", "Hugo Boss", "Armani"]

  return (
    <div className="min-h-screen flex flex-col">
      <StoreHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative h-[70vh] min-h-[500px] bg-muted flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/20 z-10" />
          <Image
            src="/hero-casual-wear-collection.jpg"
            alt="Hero"
            fill
            priority
            className="object-cover"
          />
          <div className="relative z-20 text-center px-4 max-w-3xl mx-auto">
            <h1 className="font-serif text-5xl md:text-7xl font-light tracking-wide text-white mb-6 text-balance">
              Refined Elegance for the Modern Professional
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8 font-light leading-relaxed">
              Discover our curated collection of premium fashion from the world's most prestigious brands
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/shop">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                  EXPLORE COLLECTION
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Categories Grid */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl font-light tracking-wide mb-4">Shop by Category</h2>
            <p className="text-muted-foreground font-light">Carefully curated collections for every occasion</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link key={category.name} href={category.href}>
                <Card className="group overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300">
                  <div className="aspect-[4/5] overflow-hidden bg-muted">
                    <img
                      src={category.image || "/placeholder.svg"}
                      alt={category.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="text-sm font-medium tracking-wide text-center">{category.name.toUpperCase()}</h3>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Brands */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-serif text-4xl font-light tracking-wide mb-4">Featured Brands</h2>
              <p className="text-muted-foreground font-light">Premium labels from around the world</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {featuredBrands.map((brand) => (
                <Link key={brand} href="/shop">
                  <Card className="p-12 flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors duration-300">
                    <span className="font-serif text-2xl font-light tracking-wider">{brand}</span>
                  </Card>
                </Link>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link href="/shop">
                <Button variant="outline" size="lg">
                  VIEW ALL BRANDS
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium tracking-wide mb-2">AUTHENTIC LUXURY</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                Every piece is sourced directly from authorized distributors, ensuring 100% authenticity
              </p>
            </div>

            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium tracking-wide mb-2">EXPRESS DELIVERY</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                Complimentary express shipping on all orders, with discreet luxury packaging
              </p>
            </div>

            <div className="text-center">
              <div className="mb-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-medium tracking-wide mb-2">EASY RETURNS</h3>
              <p className="text-sm text-muted-foreground font-light leading-relaxed">
                30-day return policy with free return shipping, no questions asked
              </p>
            </div>
          </div>
        </section>
      </main>

      <StoreFooter />
    </div>
  )
}
