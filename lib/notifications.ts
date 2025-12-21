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

