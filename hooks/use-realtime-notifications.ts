'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { RealtimeChannel } from '@supabase/supabase-js'

export interface RealtimeNotification {
  id: string
  type: 'ORDER_PLACED' | 'ORDER_PROCESSED'
  message: string
  read: boolean
  createdAt: string
}

export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // First, fetch initial notifications
    const fetchInitialNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('Notification')
          .select('*')
          .order('createdAt', { ascending: false })
          .limit(50)

        if (error) throw error

        const formattedNotifications = (data || []).map((n) => ({
          id: n.id,
          type: n.type as 'ORDER_PLACED' | 'ORDER_PROCESSED',
          message: n.message,
          read: n.read,
          createdAt: n.createdAt,
        }))

        setNotifications(formattedNotifications)
        setUnreadCount(formattedNotifications.filter((n) => !n.read).length)
        setLoading(false)
      } catch (error) {
        console.error('Error fetching notifications:', error)
        setLoading(false)
      }
    }

    fetchInitialNotifications()

    // Subscribe to real-time changes
    const channel: RealtimeChannel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'Notification',
        },
        (payload) => {
          console.log('Realtime notification update:', payload)

          if (payload.eventType === 'INSERT') {
            // New notification added
            const newNotification: RealtimeNotification = {
              id: payload.new.id,
              type: payload.new.type as 'ORDER_PLACED' | 'ORDER_PROCESSED',
              message: payload.new.message,
              read: payload.new.read,
              createdAt: payload.new.createdAt,
            }
            setNotifications((prev) => [newNotification, ...prev])
            setUnreadCount((prev) => (newNotification.read ? prev : prev + 1))
          } else if (payload.eventType === 'UPDATE') {
            // Notification updated (e.g., marked as read)
            setNotifications((prev) =>
              prev.map((n) =>
                n.id === payload.new.id
                  ? {
                      ...n,
                      read: payload.new.read,
                      message: payload.new.message,
                    }
                  : n
              )
            )
            setUnreadCount((prev) =>
              payload.new.read ? Math.max(0, prev - 1) : prev
            )
          } else if (payload.eventType === 'DELETE') {
            // Notification deleted
            setNotifications((prev) =>
              prev.filter((n) => n.id !== payload.old.id)
            )
            if (!payload.old.read) {
              setUnreadCount((prev) => Math.max(0, prev - 1))
            }
          }
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { notifications, unreadCount, loading }
}

