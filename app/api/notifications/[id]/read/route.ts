import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware'

// PATCH /api/notifications/[id]/read - Mark notification as read (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const { markNotificationAsRead } = await import('@/lib/notifications')
    await markNotificationAsRead(id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Mark notification read error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

