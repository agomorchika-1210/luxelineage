/**
 * Standard color palette for fashion products
 * Organized by color families
 */

export interface Color {
  name: string
  hex?: string
  display: string
}

export interface ColorFamily {
  name: string
  colors: Color[]
}

// Neutral Colors
export const neutralColors: ColorFamily = {
  name: 'Neutral',
  colors: [
    { name: 'Black', hex: '#000000', display: 'Black' },
    { name: 'White', hex: '#FFFFFF', display: 'White' },
    { name: 'Gray', hex: '#808080', display: 'Gray' },
    { name: 'Charcoal', hex: '#36454F', display: 'Charcoal' },
    { name: 'Navy', hex: '#000080', display: 'Navy' },
    { name: 'Beige', hex: '#F5F5DC', display: 'Beige' },
    { name: 'Cream', hex: '#FFFDD0', display: 'Cream' },
    { name: 'Ivory', hex: '#FFFFF0', display: 'Ivory' },
    { name: 'Taupe', hex: '#483C32', display: 'Taupe' },
    { name: 'Khaki', hex: '#C3B091', display: 'Khaki' },
  ]
}

// Blue Colors
export const blueColors: ColorFamily = {
  name: 'Blue',
  colors: [
    { name: 'Navy Blue', hex: '#000080', display: 'Navy Blue' },
    { name: 'Royal Blue', hex: '#4169E1', display: 'Royal Blue' },
    { name: 'Sky Blue', hex: '#87CEEB', display: 'Sky Blue' },
    { name: 'Light Blue', hex: '#ADD8E6', display: 'Light Blue' },
    { name: 'Dark Blue', hex: '#00008B', display: 'Dark Blue' },
    { name: 'Steel Blue', hex: '#4682B4', display: 'Steel Blue' },
    { name: 'Teal', hex: '#008080', display: 'Teal' },
  ]
}

// Red Colors
export const redColors: ColorFamily = {
  name: 'Red',
  colors: [
    { name: 'Red', hex: '#FF0000', display: 'Red' },
    { name: 'Burgundy', hex: '#800020', display: 'Burgundy' },
    { name: 'Maroon', hex: '#800000', display: 'Maroon' },
    { name: 'Crimson', hex: '#DC143C', display: 'Crimson' },
    { name: 'Scarlet', hex: '#FF2400', display: 'Scarlet' },
    { name: 'Wine', hex: '#722F37', display: 'Wine' },
  ]
}

// Green Colors
export const greenColors: ColorFamily = {
  name: 'Green',
  colors: [
    { name: 'Green', hex: '#008000', display: 'Green' },
    { name: 'Olive', hex: '#808000', display: 'Olive' },
    { name: 'Forest Green', hex: '#228B22', display: 'Forest Green' },
    { name: 'Emerald', hex: '#50C878', display: 'Emerald' },
    { name: 'Mint', hex: '#98FB98', display: 'Mint' },
    { name: 'Sage', hex: '#87AE73', display: 'Sage' },
  ]
}

// Brown/Tan Colors
export const brownColors: ColorFamily = {
  name: 'Brown',
  colors: [
    { name: 'Brown', hex: '#A52A2A', display: 'Brown' },
    { name: 'Tan', hex: '#D2B48C', display: 'Tan' },
    { name: 'Camel', hex: '#C19A6B', display: 'Camel' },
    { name: 'Coffee', hex: '#6F4E37', display: 'Coffee' },
    { name: 'Chocolate', hex: '#7B3F00', display: 'Chocolate' },
    { name: 'Cognac', hex: '#9F4636', display: 'Cognac' },
  ]
}

// Purple/Violet Colors
export const purpleColors: ColorFamily = {
  name: 'Purple',
  colors: [
    { name: 'Purple', hex: '#800080', display: 'Purple' },
    { name: 'Lavender', hex: '#E6E6FA', display: 'Lavender' },
    { name: 'Violet', hex: '#8A2BE2', display: 'Violet' },
    { name: 'Plum', hex: '#8B4789', display: 'Plum' },
  ]
}

// Yellow/Gold Colors
export const yellowColors: ColorFamily = {
  name: 'Yellow',
  colors: [
    { name: 'Yellow', hex: '#FFFF00', display: 'Yellow' },
    { name: 'Gold', hex: '#FFD700', display: 'Gold' },
    { name: 'Mustard', hex: '#FFDB58', display: 'Mustard' },
    { name: 'Amber', hex: '#FFBF00', display: 'Amber' },
  ]
}

// Pink Colors
export const pinkColors: ColorFamily = {
  name: 'Pink',
  colors: [
    { name: 'Pink', hex: '#FFC0CB', display: 'Pink' },
    { name: 'Rose', hex: '#FF007F', display: 'Rose' },
    { name: 'Salmon', hex: '#FA8072', display: 'Salmon' },
    { name: 'Coral', hex: '#FF7F50', display: 'Coral' },
  ]
}

// Orange Colors
export const orangeColors: ColorFamily = {
  name: 'Orange',
  colors: [
    { name: 'Orange', hex: '#FFA500', display: 'Orange' },
    { name: 'Burnt Orange', hex: '#CC5500', display: 'Burnt Orange' },
    { name: 'Tangerine', hex: '#FF9500', display: 'Tangerine' },
  ]
}

// All color families
export const colorFamilies: ColorFamily[] = [
  neutralColors,
  blueColors,
  redColors,
  greenColors,
  brownColors,
  purpleColors,
  yellowColors,
  pinkColors,
  orangeColors,
]

// Flattened list of all colors
export const allColors: Color[] = colorFamilies.flatMap(family => family.colors)

/**
 * Get colors by family name
 */
export function getColorsByFamily(familyName: string): Color[] {
  const family = colorFamilies.find(f => 
    f.name.toLowerCase() === familyName.toLowerCase()
  )
  return family?.colors || []
}

/**
 * Search colors by name
 */
export function searchColors(query: string): Color[] {
  const lowerQuery = query.toLowerCase()
  return allColors.filter(color => 
    color.name.toLowerCase().includes(lowerQuery) ||
    color.display.toLowerCase().includes(lowerQuery)
  )
}

