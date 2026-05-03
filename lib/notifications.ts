import { prisma } from './prisma'
import { NotificationType } from '@prisma/client'

/**
 * Create notification in Supabase
 * 
 * Flow:
 * 1. Save to Supabase (source of truth)
 * 2. Supabase Realtime automatically broadcasts changes to all subscribed clients via WebSocket
 * 
 * Clients subscribe to Supabase Realtime for instant updates
 * No need for dual writes - Supabase handles both persistence and realtime!
 */
export async function createNotification(
  type: NotificationType,
  message: string
) {
  // Store in Supabase - Realtime will automatically broadcast to subscribed clients
  const notification = await prisma.notification.create({
    data: {
      type,
      message
    }
  })

  return notification
}

/**
 * Mark notification as read in Supabase
 * Realtime will automatically broadcast the update to subscribed clients
 */
export async function markNotificationAsRead(notificationId: string) {
  // Update in Supabase - Realtime broadcasts automatically
  await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true }
  })
}

/**
 * Check if product stock is below threshold and create notification if needed
 */
export async function checkLowStock(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId }
  })

  if (!product) return

  // Check if stock is below threshold
  if (product.stockQuantity <= product.lowStockThreshold) {
    // Check if we already have a recent low stock notification for this product
    const recentNotification = await prisma.notification.findFirst({
      where: {
        type: 'LOW_STOCK',
        message: { contains: product.name },
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      }
    })

    // Only create notification if we don't have a recent one
    if (!recentNotification) {
      await createNotification(
        'LOW_STOCK',
        `Low stock alert: ${product.name} (SKU: ${product.sku}) has ${product.stockQuantity} units remaining (threshold: ${product.lowStockThreshold})`
      )
    }
  }
}

