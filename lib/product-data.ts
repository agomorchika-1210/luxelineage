export interface Product {
  id: number
  sku: string
  name: string
  brand: string
  price: number
  category: string
  image: string
  images: string[]
  description: string
  sizes: string[]
  colors: string[]
  features: string[]
  stock: number
}

export const products: Product[] = [
  {
    id: 1,
    sku: "WB-001",
    name: "Tailored Wool Blazer",
    brand: "Hugo Boss",
    price: 899,
    category: "Corporate Business Wear",
    image: "/black-wool-blazer-on-white-background.jpg",
    images: ["/black-wool-blazer-front-view.jpg", "/black-wool-blazer-side-view.jpg", "/black-wool-blazer-detail.jpg"],
    description:
      "Impeccably tailored wool blazer crafted from premium Italian fabric. Features notch lapels, a two-button front, and refined details throughout. Perfect for the modern professional seeking timeless elegance.",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    colors: ["Navy", "Charcoal", "Black"],
    features: ["100% Italian Wool", "Fully Lined", "Notch Lapel", "Two Button Closure", "Dry Clean Only"],
    stock: 45,
  },
  {
    id: 2,
    sku: "DS-002",
    name: "Oxford Dress Shirt",
    brand: "Armani",
    price: 299,
    category: "Corporate Business Wear",
    image: "/white-dress-shirt-folded.jpg",
    images: ["/white-dress-shirt-folded.jpg", "/white-dress-shirt-folded.jpg", "/white-dress-shirt-folded.jpg"],
    description:
      "Classic Oxford dress shirt in premium cotton. Crisp collar and impeccable tailoring make this an essential for the professional wardrobe. Versatile enough for boardroom meetings or evening events.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["White", "Light Blue", "Pink"],
    features: ["100% Premium Cotton", "Classic Oxford Weave", "Button-Down Collar", "Machine Washable"],
    stock: 78,
  },
  {
    id: 3,
    sku: "CH-003",
    name: "Slim Fit Chinos",
    brand: "Lacoste",
    price: 249,
    category: "Corporate Casual",
    image: "/beige-chino-pants.png",
    images: ["/beige-chino-pants.png", "/beige-chino-pants.png", "/beige-chino-pants.png"],
    description:
      "Perfectly tailored slim fit chinos in a versatile neutral tone. Crafted from stretch cotton for all-day comfort without compromising style. Essential for the modern smart-casual wardrobe.",
    sizes: ["28", "30", "32", "34", "36", "38"],
    colors: ["Beige", "Navy", "Olive", "Grey"],
    features: ["98% Cotton, 2% Elastane", "Slim Fit", "Stretch Fabric", "Machine Washable"],
    stock: 8,
  },
  {
    id: 4,
    sku: "CS-004",
    name: "Cashmere Sweater",
    brand: "Gucci",
    price: 1299,
    category: "Corporate Casual",
    image: "/navy-cashmere-sweater.jpg",
    images: ["/navy-cashmere-sweater.jpg", "/navy-cashmere-sweater.jpg", "/navy-cashmere-sweater.jpg"],
    description:
      "Luxuriously soft pure cashmere sweater with a timeless crew neck design. Refined Italian craftsmanship ensures this piece will be a wardrobe staple for years to come.",
    sizes: ["S", "M", "L", "XL"],
    colors: ["Navy", "Charcoal", "Camel", "Black"],
    features: ["100% Pure Cashmere", "Italian Made", "Crew Neck", "Dry Clean Only"],
    stock: 23,
  },
  {
    id: 5,
    sku: "LL-005",
    name: "Leather Loafers",
    brand: "Gucci",
    price: 899,
    category: "Footwear",
    image: "/brown-leather-loafers.jpg",
    images: ["/brown-leather-loafers.jpg", "/brown-leather-loafers.jpg", "/brown-leather-loafers.jpg"],
    description:
      "Handcrafted Italian leather loafers with signature hardware detailing. The perfect blend of casual sophistication and refined elegance for the discerning gentleman.",
    sizes: ["7", "8", "9", "10", "11", "12"],
    colors: ["Brown", "Black", "Burgundy"],
    features: ["Italian Leather", "Handcrafted", "Leather Sole", "Signature Hardware"],
    stock: 5,
  },
  {
    id: 6,
    sku: "PS-006",
    name: "Premium Polo Shirt",
    brand: "Lacoste",
    price: 179,
    category: "Polo Shirts",
    image: "/white-polo-shirt.png",
    images: ["/white-polo-shirt.png", "/white-polo-shirt.png", "/white-polo-shirt.png"],
    description:
      "Iconic polo shirt in premium piqué cotton. The signature crocodile logo and perfect fit make this a timeless piece for smart-casual occasions.",
    sizes: ["XS", "S", "M", "L", "XL", "XXL"],
    colors: ["White", "Navy", "Black", "Red", "Green"],
    features: ["100% Cotton Piqué", "Signature Logo", "Ribbed Collar", "Machine Washable"],
    stock: 62,
  },
  {
    id: 7,
    sku: "JP-007",
    name: "Jogger Pants",
    brand: "Hugo Boss",
    price: 199,
    category: "Joggers",
    image: "/black-jogger-pants.jpg",
    images: ["/black-jogger-pants.jpg", "/black-jogger-pants.jpg", "/black-jogger-pants.jpg"],
    description:
      "Contemporary jogger pants combining athletic comfort with refined tailoring. Perfect for the modern professional's off-duty wardrobe.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Black", "Navy", "Grey"],
    features: ["Cotton Blend", "Tapered Fit", "Elastic Waistband", "Machine Washable"],
    stock: 0,
  },
  {
    id: 8,
    sku: "CT-008",
    name: "Cargo Trousers",
    brand: "Armani",
    price: 349,
    category: "Cargo Pants",
    image: "/olive-cargo-pants.jpg",
    images: ["/olive-cargo-pants.jpg", "/olive-cargo-pants.jpg", "/olive-cargo-pants.jpg"],
    description:
      "Elevated cargo trousers with a refined silhouette. Multiple utility pockets meet sophisticated Italian design for a contemporary take on a classic style.",
    sizes: ["30", "32", "34", "36", "38"],
    colors: ["Olive", "Black", "Khaki"],
    features: ["Cotton Twill", "Multiple Pockets", "Straight Leg", "Machine Washable"],
    stock: 34,
  },
  {
    id: 9,
    sku: "RN-009",
    name: "Merino Wool Roundneck",
    brand: "Hugo Boss",
    price: 249,
    category: "Round Necks",
    image: "/grey-merino-wool-sweater.jpg",
    images: ["/grey-merino-wool-sweater.jpg", "/grey-merino-wool-sweater.jpg", "/grey-merino-wool-sweater.jpg"],
    description:
      "Lightweight merino wool roundneck sweater perfect for layering or wearing alone. Breathable, temperature-regulating, and incredibly soft against the skin.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Grey", "Navy", "Burgundy", "Forest Green"],
    features: ["100% Merino Wool", "Temperature Regulating", "Lightweight", "Machine Washable"],
    stock: 41,
  },
  {
    id: 10,
    sku: "CW-010",
    name: "Cotton Blend Casual Jacket",
    brand: "Lacoste",
    price: 399,
    category: "Casual Wear",
    image: "/navy-casual-jacket.jpg",
    images: ["/navy-casual-jacket.jpg", "/navy-casual-jacket.jpg", "/navy-casual-jacket.jpg"],
    description:
      "Versatile casual jacket with a modern fit. Features a lightweight cotton blend construction perfect for transitional weather and effortless style.",
    sizes: ["S", "M", "L", "XL", "XXL"],
    colors: ["Navy", "Khaki", "Charcoal"],
    features: ["Cotton Blend", "Zip Front", "Side Pockets", "Machine Washable"],
    stock: 27,
  },
]

export const categories = [
  "Corporate Business Wear",
  "Corporate Casual",
  "Casual Wear",
  "Joggers",
  "Cargo Pants",
  "Polo Shirts",
  "Round Necks",
  "Footwear",
]

export const brands = ["Gucci", "Lacoste", "Hugo Boss", "Armani"]

export function getProductById(id: number): Product | undefined {
  return products.find((p) => p.id === id)
}

export function getProductsByCategory(category: string): Product[] {
  return products.filter((p) => p.category === category)
}

export function getProductsByBrand(brand: string): Product[] {
  return products.filter((p) => p.brand === brand)
}

export function filterProducts(selectedCategories: string[], selectedBrands: string[]): Product[] {
  return products.filter((product) => {
    const categoryMatch = selectedCategories.length === 0 || selectedCategories.includes(product.category)
    const brandMatch = selectedBrands.length === 0 || selectedBrands.includes(product.brand)
    return categoryMatch && brandMatch
  })
}
