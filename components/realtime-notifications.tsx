'use client'

import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications'
import { Bell } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

/**
 * Realtime Notifications Component
 * 
 * This component subscribes to Supabase Realtime for instant updates.
 * When backend creates a notification in Supabase, Realtime automatically
 * pushes the update to all subscribed clients via WebSocket.
 * 
 * No polling needed - truly realtime with Supabase!
 */
export function RealtimeNotifications() {
  const { notifications, unreadCount, loading } = useRealtimeNotifications()

  if (loading) {
    return (
      <Button variant="ghost" size="icon" className="relative">
        <Bell className="h-5 w-5" />
      </Button>
    )
  }

  return (
    <Button variant="ghost" size="icon" className="relative">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      )}
    </Button>
  )
}

