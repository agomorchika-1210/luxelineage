import { StoreHeader } from "@/components/store-header"
import { StoreFooter } from "@/components/store-footer"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { categories, getProductsByCategory } from "@/lib/product-data"

export default function CollectionsPage() {
  const collections = categories.map((category) => ({
    name: category,
    href: `/shop?category=${encodeURIComponent(category)}`,
    productCount: getProductsByCategory(category).length,
    image: getProductsByCategory(category)[0]?.image || "/placeholder.svg",
  }))

  return (
    <div className="min-h-screen flex flex-col">
      <StoreHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative h-[50vh] min-h-[400px] bg-muted flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/20" />
          <img
            src="/luxury-fashion-boutique-interior-minimalist.jpg"
            alt="Collections"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
            <h1 className="font-serif text-5xl md:text-6xl font-light tracking-wide text-white mb-6">
              Our Collections
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8 font-light leading-relaxed">
              Curated collections designed for the modern professional
            </p>
          </div>
        </section>

        {/* Collections Grid */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl font-light tracking-wide mb-4">Explore Our Collections</h2>
            <p className="text-muted-foreground font-light">
              Each collection is thoughtfully curated to meet your professional and lifestyle needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {collections.map((collection) => (
              <Link key={collection.name} href={collection.href}>
                <Card className="group overflow-hidden border-0 shadow-sm hover:shadow-lg transition-all duration-300">
                  <div className="aspect-[4/5] overflow-hidden bg-muted">
                    <img
                      src={collection.image || "/placeholder.svg"}
                      alt={collection.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-medium tracking-wide mb-2">{collection.name}</h3>
                    <p className="text-sm text-muted-foreground font-light mb-4">
                      {collection.productCount} {collection.productCount === 1 ? "product" : "products"}
                    </p>
                    <div className="flex items-center text-sm font-light text-primary group-hover:underline">
                      Shop Collection
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-serif text-4xl font-light tracking-wide mb-6">
              Can't Find What You're Looking For?
            </h2>
            <p className="text-muted-foreground font-light mb-8 leading-relaxed max-w-2xl mx-auto">
              Our team is here to help you find the perfect piece. Contact us for personalized styling
              assistance or to inquire about special orders.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/shop">
                <Button size="lg" variant="outline">
                  Browse All Products
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg">
                  Contact Us
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <StoreFooter />
    </div>
  )
}

