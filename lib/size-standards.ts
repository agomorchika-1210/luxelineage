/**
 * Size standards for different product types
 * Supports EU, UK, and US sizing standards
 */

export interface SizeStandard {
  eu: string
  uk: string
  us: string
  display: string // Combined display format
}

export interface SizeCategory {
  name: string
  sizes: SizeStandard[]
}

// Clothing sizes (Shirts, Pants, etc.)
export const clothingSizes: SizeCategory = {
  name: 'Clothing',
  sizes: [
    { eu: 'XS', uk: '8', us: 'XS', display: 'XS (EU) / 8 (UK) / XS (US)' },
    { eu: 'S', uk: '10', us: 'S', display: 'S (EU) / 10 (UK) / S (US)' },
    { eu: 'M', uk: '12', us: 'M', display: 'M (EU) / 12 (UK) / M (US)' },
    { eu: 'L', uk: '14', us: 'L', display: 'L (EU) / 14 (UK) / L (US)' },
    { eu: 'XL', uk: '16', us: 'XL', display: 'XL (EU) / 16 (UK) / XL (US)' },
    { eu: 'XXL', uk: '18', us: 'XXL', display: 'XXL (EU) / 18 (UK) / XXL (US)' },
    { eu: 'XXXL', uk: '20', us: 'XXXL', display: 'XXXL (EU) / 20 (UK) / XXXL (US)' },
  ]
}

// Men's Shirt sizes
export const mensShirtSizes: SizeCategory = {
  name: "Men's Shirts",
  sizes: [
    { eu: '36', uk: '14', us: '14', display: '36 (EU) / 14 (UK) / 14 (US)' },
    { eu: '38', uk: '15', us: '15', display: '38 (EU) / 15 (UK) / 15 (US)' },
    { eu: '40', uk: '16', us: '16', display: '40 (EU) / 16 (UK) / 16 (US)' },
    { eu: '42', uk: '17', us: '17', display: '42 (EU) / 17 (UK) / 17 (US)' },
    { eu: '44', uk: '18', us: '18', display: '44 (EU) / 18 (UK) / 18 (US)' },
    { eu: '46', uk: '18.5', us: '18.5', display: '46 (EU) / 18.5 (UK) / 18.5 (US)' },
    { eu: '48', uk: '19', us: '19', display: '48 (EU) / 19 (UK) / 19 (US)' },
    { eu: '50', uk: '19.5', us: '19.5', display: '50 (EU) / 19.5 (UK) / 19.5 (US)' },
    { eu: '52', uk: '20', us: '20', display: '52 (EU) / 20 (UK) / 20 (US)' },
  ]
}

// Pants/Trouser sizes (Waist)
export const pantsWaistSizes: SizeCategory = {
  name: 'Pants Waist',
  sizes: [
    { eu: '28', uk: '28', us: '28', display: '28 (EU/UK/US)' },
    { eu: '30', uk: '30', us: '30', display: '30 (EU/UK/US)' },
    { eu: '32', uk: '32', us: '32', display: '32 (EU/UK/US)' },
    { eu: '34', uk: '34', us: '34', display: '34 (EU/UK/US)' },
    { eu: '36', uk: '36', us: '36', display: '36 (EU/UK/US)' },
    { eu: '38', uk: '38', us: '38', display: '38 (EU/UK/US)' },
    { eu: '40', uk: '40', us: '40', display: '40 (EU/UK/US)' },
    { eu: '42', uk: '42', us: '42', display: '42 (EU/UK/US)' },
    { eu: '44', uk: '44', us: '44', display: '44 (EU/UK/US)' },
    { eu: '46', uk: '46', us: '46', display: '46 (EU/UK/US)' },
    { eu: '48', uk: '48', us: '48', display: '48 (EU/UK/US)' },
  ]
}

// Shoe sizes
export const shoeSizes: SizeCategory = {
  name: 'Shoes',
  sizes: [
    { eu: '38', uk: '5', us: '7', display: '38 (EU) / 5 (UK) / 7 (US)' },
    { eu: '39', uk: '6', us: '8', display: '39 (EU) / 6 (UK) / 8 (US)' },
    { eu: '40', uk: '6.5', us: '8.5', display: '40 (EU) / 6.5 (UK) / 8.5 (US)' },
    { eu: '41', uk: '7', us: '9', display: '41 (EU) / 7 (UK) / 9 (US)' },
    { eu: '42', uk: '7.5', us: '9.5', display: '42 (EU) / 7.5 (UK) / 9.5 (US)' },
    { eu: '43', uk: '8', us: '10', display: '43 (EU) / 8 (UK) / 10 (US)' },
    { eu: '44', uk: '9', us: '11', display: '44 (EU) / 9 (UK) / 11 (US)' },
    { eu: '45', uk: '10', us: '12', display: '45 (EU) / 10 (UK) / 12 (US)' },
    { eu: '46', uk: '11', us: '13', display: '46 (EU) / 11 (UK) / 13 (US)' },
    { eu: '47', uk: '12', us: '14', display: '47 (EU) / 12 (UK) / 14 (US)' },
    { eu: '48', uk: '13', us: '15', display: '48 (EU) / 13 (UK) / 15 (US)' },
  ]
}

// All size categories
export const sizeCategories: SizeCategory[] = [
  clothingSizes,
  mensShirtSizes,
  pantsWaistSizes,
  shoeSizes,
]

/**
 * Get sizes for a specific category
 */
export function getSizesForCategory(categoryName: string): SizeStandard[] {
  const category = sizeCategories.find(cat => 
    cat.name.toLowerCase() === categoryName.toLowerCase()
  )
  return category?.sizes || clothingSizes.sizes
}

/**
 * Get size display string from size standard
 */
export function getSizeDisplay(size: SizeStandard): string {
  return size.display
}

/**
 * Get size by EU size
 */
export function getSizeByEU(euSize: string, category: string = 'Clothing'): SizeStandard | undefined {
  const sizes = getSizesForCategory(category)
  return sizes.find(s => s.eu === euSize)
}

/**
 * Get size by UK size
 */
export function getSizeByUK(ukSize: string, category: string = 'Clothing'): SizeStandard | undefined {
  const sizes = getSizesForCategory(category)
  return sizes.find(s => s.uk === ukSize)
}

/**
 * Get size by US size
 */
export function getSizeByUS(usSize: string, category: string = 'Clothing'): SizeStandard | undefined {
  const sizes = getSizesForCategory(category)
  return sizes.find(s => s.us === usSize)
}

