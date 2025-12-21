import { StoreHeader } from "@/components/store-header"
import { StoreFooter } from "@/components/store-footer"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { brands, getProductsByBrand } from "@/lib/product-data"

export default function BrandsPage() {
  const brandData = brands.map((brand) => ({
    name: brand,
    href: `/shop?brand=${encodeURIComponent(brand)}`,
    productCount: getProductsByBrand(brand).length,
    description: getBrandDescription(brand),
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
            alt="Brands"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
            <h1 className="font-serif text-5xl md:text-6xl font-light tracking-wide text-white mb-6">
              Our Brands
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8 font-light leading-relaxed">
              Discover premium fashion from the world's most prestigious labels
            </p>
          </div>
        </section>

        {/* Brands Grid */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl font-light tracking-wide mb-4">Featured Brands</h2>
            <p className="text-muted-foreground font-light">
              We partner with the finest luxury brands to bring you authentic, high-quality fashion
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {brandData.map((brand) => (
              <Card key={brand.name} className="p-8 border-0 shadow-sm hover:shadow-lg transition-all duration-300">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <h3 className="font-serif text-3xl font-light tracking-wider mb-4">{brand.name}</h3>
                    <p className="text-muted-foreground font-light leading-relaxed mb-4">{brand.description}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground font-light">
                        {brand.productCount} {brand.productCount === 1 ? "product" : "products"} available
                      </p>
                      <Link href={brand.href}>
                        <Button variant="outline" size="sm">
                          View Collection
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Brand Showcase */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12">
            {brands.map((brand) => (
              <Link key={brand} href={`/shop?brand=${encodeURIComponent(brand)}`}>
                <Card className="p-12 flex items-center justify-center hover:bg-accent hover:text-accent-foreground transition-colors duration-300 min-h-[200px]">
                  <span className="font-serif text-2xl font-light tracking-wider text-center">{brand}</span>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Authenticity Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-serif text-4xl font-light tracking-wide mb-6">100% Authentic</h2>
            <p className="text-muted-foreground font-light mb-8 leading-relaxed max-w-2xl mx-auto">
              Every product in our collection is sourced directly from authorized distributors and brand partners.
              We guarantee the authenticity of every item, backed by our commitment to excellence and customer
              satisfaction.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
              <div className="text-center">
                <div className="mb-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-medium tracking-wide mb-2">AUTHENTICATED</h3>
                <p className="text-sm text-muted-foreground font-light">
                  Direct from authorized distributors
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
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-medium tracking-wide mb-2">BEST PRICE</h3>
                <p className="text-sm text-muted-foreground font-light">
                  Competitive pricing on luxury items
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-medium tracking-wide mb-2">GUARANTEED</h3>
                <p className="text-sm text-muted-foreground font-light">
                  Full authenticity guarantee
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <StoreFooter />
    </div>
  )
}

function getBrandDescription(brand: string): string {
  const descriptions: Record<string, string> = {
    Gucci: "Italian luxury brand known for its innovative designs and exceptional craftsmanship. A symbol of contemporary elegance and timeless style.",
    Lacoste: "French heritage brand celebrated for its iconic polo shirts and sporty elegance. Combining classic style with modern sophistication.",
    "Hugo Boss": "German luxury fashion house specializing in premium menswear. Known for impeccable tailoring and refined business attire.",
    Armani: "Italian fashion empire renowned for its minimalist elegance and sophisticated designs. A benchmark of luxury and style.",
  }
  return descriptions[brand] || "Premium luxury brand offering exceptional quality and timeless design."
}

