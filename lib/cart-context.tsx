"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"

export interface CartItem {
  id: number | string // Support both numeric (legacy) and string (database) IDs
  productId?: string // Database product ID (string CUID)
  name: string
  brand: string
  price: number
  image: string
  size: string
  color: string
  quantity: number
  stockQuantity?: number // Store stock quantity for validation
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: number | string, size: string, color: string) => void
  updateQuantity: (id: number | string, size: string, color: string, quantity: number) => void
  clearCart: () => void
  validateCart: () => Promise<{ valid: boolean; errors: string[] }>
  totalItems: number
  totalPrice: number
  isLoaded: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("cart")
    if (savedCart) {
      setItems(JSON.parse(savedCart))
    }
    setIsLoaded(true)
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem("cart", JSON.stringify(items))
  }, [items])

  const addItem = (item: CartItem) => {
    setItems((prevItems) => {
      const existingItem = prevItems.find((i) => i.id === item.id && i.size === item.size && i.color === item.color)

      if (existingItem) {
        return prevItems.map((i) =>
          i.id === item.id && i.size === item.size && i.color === item.color
            ? { ...i, quantity: i.quantity + item.quantity }
            : i,
        )
      }

      return [...prevItems, item]
    })
  }

  const removeItem = (id: number | string, size: string, color: string) => {
    setItems((prevItems) => prevItems.filter((i) => !(i.id === id && i.size === size && i.color === color)))
  }

  const updateQuantity = (id: number | string, size: string, color: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id, size, color)
      return
    }

    setItems((prevItems) =>
      prevItems.map((i) => (i.id === id && i.size === size && i.color === color ? { ...i, quantity } : i)),
    )
  }

  const clearCart = () => {
    setItems([])
  }

  // Validate cart items against current stock
  const validateCart = async (): Promise<{ valid: boolean; errors: string[] }> => {
    const errors: string[] = []
    
    if (items.length === 0) {
      return { valid: false, errors: ['Cart is empty'] }
    }

    try {
      const { productsApi } = await import('@/lib/api-client')

      const productIds = Array.from(
        new Set(items.map(i => i.productId).filter((id): id is string => !!id))
      )

      if (productIds.length !== items.length) {
        for (const item of items) {
          if (!item.productId) errors.push(`${item.name} - Invalid product ID`)
        }
      }

      const products = await productsApi.getByIds(productIds)
      const byId = new Map<string, any>(products.map((p: any) => [p.id, p]))

      const nextItems = items.map((item) => {
        if (!item.productId) return item
        const product = byId.get(item.productId)
        if (!product) {
          errors.push(`${item.name} - Product not found`)
          return item
        }

        if (product.stockQuantity < item.quantity) {
          errors.push(
            `${item.name} - Only ${product.stockQuantity} available, but ${item.quantity} requested`
          )
        }

        return { ...item, stockQuantity: product.stockQuantity }
      })

      // Single state update after validation
      setItems(nextItems)
    } catch (error: any) {
      errors.push(`Failed to validate cart: ${error.message || 'Unknown error'}`)
    }

    return { valid: errors.length === 0, errors }
  }

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0)
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, validateCart, totalItems, totalPrice, isLoaded }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return context
}
