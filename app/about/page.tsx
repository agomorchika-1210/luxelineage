import { StoreHeader } from "@/components/store-header"
import { StoreFooter } from "@/components/store-footer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { ArrowRight } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <StoreHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative h-[60vh] min-h-[500px] bg-muted flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/20" />
          <img
            src="/luxury-fashion-boutique-interior-minimalist.jpg"
            alt="About LUXELINEAGE"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="relative z-10 text-center px-4 max-w-3xl mx-auto">
            <h1 className="font-serif text-5xl md:text-7xl font-light tracking-wide text-white mb-6">
              About LUXELINEAGE
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8 font-light leading-relaxed">
              Curating premium fashion for the discerning professional
            </p>
          </div>
        </section>

        {/* Story Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
          <div className="prose prose-lg max-w-none">
            <h2 className="font-serif text-4xl font-light tracking-wide mb-6 text-center">
              Our Story
            </h2>
            <div className="space-y-6 text-muted-foreground font-light leading-relaxed">
              <p>
                LUXELINEAGE was founded with a singular vision: to bring the world's finest luxury fashion
                to professionals who appreciate quality, craftsmanship, and timeless elegance. We understand
                that true style is not about following trends, but about investing in pieces that reflect
                your personal excellence.
              </p>
              <p>
                Our carefully curated collection features only the most prestigious brands, each piece
                selected for its exceptional quality, impeccable tailoring, and enduring appeal. From
                boardroom essentials to sophisticated casual wear, every item in our collection is chosen
                to help you present your best self, whatever the occasion.
              </p>
              <p>
                We believe that luxury should be accessible, authentic, and always exceptional. That's why
                we work directly with authorized distributors to ensure every product is genuine, and why
                we're committed to providing an unparalleled shopping experience from discovery to delivery.
              </p>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-serif text-4xl font-light tracking-wide mb-4">Our Values</h2>
              <p className="text-muted-foreground font-light">
                The principles that guide everything we do
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="p-8 border-0 shadow-sm">
                <div className="mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-medium tracking-wide mb-4">Excellence</h3>
                <p className="text-muted-foreground font-light leading-relaxed">
                  We are committed to excellence in every aspect of our business, from product selection to
                  customer service. Only the finest quality meets our standards.
                </p>
              </Card>

              <Card className="p-8 border-0 shadow-sm">
                <div className="mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-medium tracking-wide mb-4">Authenticity</h3>
                <p className="text-muted-foreground font-light leading-relaxed">
                  Every product is guaranteed authentic, sourced directly from authorized distributors. We
                  stand behind the authenticity of every item we sell.
                </p>
              </Card>

              <Card className="p-8 border-0 shadow-sm">
                <div className="mb-6">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </div>
                </div>
                <h3 className="text-xl font-medium tracking-wide mb-4">Service</h3>
                <p className="text-muted-foreground font-light leading-relaxed">
                  Your satisfaction is our priority. We provide personalized service, expert styling advice,
                  and seamless shopping experiences from start to finish.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Commitment Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-serif text-4xl font-light tracking-wide mb-6">
                Our Commitment to You
              </h2>
              <div className="space-y-4 text-muted-foreground font-light leading-relaxed">
                <p>
                  At LUXELINEAGE, we're more than just a retailer—we're your partner in style. We
                  understand that building a professional wardrobe is an investment, and we're here to help
                  you make choices that will serve you for years to come.
                </p>
                <p>
                  Our team of style experts is always available to provide personalized recommendations,
                  whether you're building your first professional wardrobe or adding to an existing
                  collection. We believe in building lasting relationships with our customers, based on trust,
                  quality, and exceptional service.
                </p>
                <p>
                  Every purchase is backed by our commitment to authenticity, quality, and your complete
                  satisfaction. We stand behind every product we sell and are dedicated to ensuring your
                  shopping experience exceeds expectations.
                </p>
              </div>
            </div>
            <div className="relative aspect-[4/5] overflow-hidden rounded-lg">
              <img
                src="/elegant-business-suit-on-mannequin.jpg"
                alt="Our Commitment"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-serif text-4xl font-light tracking-wide mb-6">
              Experience the LUXELINEAGE Difference
            </h2>
            <p className="text-muted-foreground font-light mb-8 leading-relaxed max-w-2xl mx-auto">
              Discover our curated collection of premium fashion and experience the quality, service, and
              style that sets us apart.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/shop">
                <Button size="lg">
                  Shop Now
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/collections">
                <Button size="lg" variant="outline">
                  View Collections
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

