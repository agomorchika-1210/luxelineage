# 🚀 Migrating from Firebase to Supabase - Complete Guide

## 🔑 Supabase API Keys (2024+)

Supabase uses **new API keys** for authentication:

| Key Type | Environment Variable | Usage |
|----------|---------------------|-------|
| `publishable` key | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client-side (public) |
| `secret` key | `SUPABASE_SECRET_KEY` | Server-side (private) |

**What You Need to Know:**
- ✅ **Publishable Key**: Safe to expose in client-side code, respects Row Level Security (RLS)
- ✅ **Secret Key**: Keep this secret! Used server-side to bypass RLS when needed
- ✅ **Better security**: New keys are not JWTs and don't expire
- ✅ **Find them in**: Supabase Dashboard > Settings > API

**In Your `.env` file:**
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - for client-side operations
- `SUPABASE_SECRET_KEY` - for server-side operations (keep secret!)

## Why Migrate to Supabase?

✅ **One Service**: Auth, Database, Realtime, Storage all in one  
✅ **Simpler Architecture**: No dual-write pattern needed  
✅ **Built-in Realtime**: PostgreSQL changes trigger WebSocket updates automatically  
✅ **Better Developer Experience**: One dashboard, one SDK  
✅ **Cost Effective**: Potentially lower costs, especially at scale  
✅ **Row Level Security**: Built-in PostgreSQL RLS for security  

## Supabase Realtime vs Firebase Realtime

### How Supabase Realtime Works

Supabase Realtime uses **PostgreSQL's logical replication** to stream database changes:

```
┌──────────────────────────────────────────────────────────┐
│  BACKEND: Order Processed                                 │
│                                                            │
│  createNotification('ORDER_PROCESSED', 'Order #123...')  │
│         │                                                  │
│         └─► Supabase (PostgreSQL)                         │
│             └─ INSERT INTO Notification                   │
│             └─ PostgreSQL logical replication triggers    │
│             └─ Supabase Realtime streams change           │
│             └─ WebSocket pushes to all subscribed clients │
└──────────────────────────────────────────────────────────┘
                          │
                          │ Supabase Realtime
                          │ (WebSocket connection)
                          ▼
┌──────────────────────────────────────────────────────────┐
│  CLIENT: Admin Dashboard                                  │
│                                                            │
│  ✅ Subscribed to Supabase Realtime                      │
│  ✅ Receives update instantly (no polling!)                │
│  ✅ Notification badge updates                            │
│  ✅ UI updates in realtime                                │
└──────────────────────────────────────────────────────────┘
```

**Key Difference**: With Supabase, you only write to ONE place (PostgreSQL), and Supabase automatically streams the changes to all subscribed clients!

### Comparison

| Feature | Firebase | Supabase |
|---------|----------|----------|
| **Realtime Engine** | Firestore (NoSQL) | PostgreSQL (SQL) |
| **Data Storage** | Separate (Firestore) | Same database |
| **Write Pattern** | Dual-write needed | Single write |
| **WebSocket** | ✅ Yes | ✅ Yes |
| **Latency** | ~50-100ms | ~10-50ms |
| **Scalability** | Excellent | Excellent |
| **Cost** | Pay per read/write | Included in plan |

## Migration Steps

### Step 1: Install Supabase Client

```bash
npm install @supabase/supabase-js
```

### Step 2: Create Supabase Client

Create `lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

// Client-side Supabase client (for browser)
// Uses the new "publishable" key - safe to expose in client-side code
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

// Server-side Supabase client (for API routes)
// Uses the new "secret" key - bypasses Row Level Security (RLS) when needed
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

**Note on API Keys:**
- **Publishable Key**: Used for client-side operations, respects Row Level Security (RLS)
- **Secret Key**: Used for server-side operations, bypasses RLS - keep this secret!
- These are the new keys introduced in 2024-2025, replacing the legacy "anon" and "service_role" keys

### Step 3: Replace Firebase Auth with Supabase Auth

**Before (Firebase):**
```typescript
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase-client'

const userCredential = await signInWithEmailAndPassword(auth, email, password)
const idToken = await userCredential.user.getIdToken()
```

**After (Supabase):**
```typescript
import { supabase } from '@/lib/supabase'

const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password
})

// Access token is automatically included in subsequent requests
```

### Step 4: Replace Realtime Notifications

**Before (Firebase Firestore):**
```typescript
import { collection, query, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase-client'

const notificationsRef = collection(db, 'notifications')
const q = query(notificationsRef, orderBy('createdAt', 'desc'))

const unsubscribe = onSnapshot(q, (snapshot) => {
  // Handle updates
})
```

**After (Supabase Realtime):**
```typescript
import { supabase } from '@/lib/supabase'

// Subscribe to PostgreSQL changes
const channel = supabase
  .channel('notifications')
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'Notification',
    },
    (payload) => {
      // New notification! Handle it
      console.log('New notification:', payload.new)
    }
  )
  .subscribe()

// Cleanup
return () => {
  supabase.removeChannel(channel)
}
```

### Step 5: Update Notification Creation

**Before (Dual-write to Supabase + Firebase):**
```typescript
// Save to Supabase
const notification = await prisma.notification.create({...})

// Also save to Firebase for realtime
await adminFirestore.collection('notifications').add({...})
```

**After (Single write to Supabase):**
```typescript
// Just save to Supabase - Realtime happens automatically!
const notification = await prisma.notification.create({
  data: {
    type,
    message
  }
})

// That's it! Supabase Realtime automatically streams this to all subscribers
```

### Step 6: Update Auth Middleware

**Before (Firebase token verification):**
```typescript
import { adminAuth } from '@/lib/firebase'

const decodedToken = await adminAuth.verifyIdToken(token)
```

**After (Supabase token verification):**
```typescript
import { supabaseAdmin } from '@/lib/supabase'

const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
```

## Complete Code Examples

### 1. Realtime Notifications Hook (Supabase)

Create/update `hooks/use-realtime-notifications.ts`:

```typescript
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
    // First, fetch existing notifications
    const fetchNotifications = async () => {
      const { data, error } = await supabase
        .from('Notification')
        .select('*')
        .order('createdAt', { ascending: false })
        .limit(50)

      if (data) {
        setNotifications(data)
        setUnreadCount(data.filter((n) => !n.read).length)
      }
      setLoading(false)
    }

    fetchNotifications()

    // Then, subscribe to realtime changes
    const channel: RealtimeChannel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Notification',
        },
        (payload) => {
          // New notification arrived!
          const newNotification = payload.new as RealtimeNotification
          setNotifications((prev) => [newNotification, ...prev])
          setUnreadCount((prev) => prev + 1)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Notification',
        },
        (payload) => {
          // Notification updated (e.g., marked as read)
          const updated = payload.new as RealtimeNotification
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          )
          setUnreadCount((prev) =>
            updated.read ? prev - 1 : prev
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return { notifications, unreadCount, loading }
}
```

### 2. Simplified Notification Creation

Update `lib/notifications.ts`:

```typescript
import { prisma } from './prisma'
import { NotificationType } from '@prisma/client'

/**
 * Create notification in Supabase
 * 
 * Supabase Realtime automatically streams this to all subscribed clients!
 * No need for dual-write pattern anymore.
 */
export async function createNotification(
  type: NotificationType,
  message: string
) {
  // Single write to Supabase - Realtime happens automatically!
  const notification = await prisma.notification.create({
    data: {
      type,
      message
    }
  })

  // That's it! Supabase Realtime will automatically:
  // 1. Detect the INSERT
  // 2. Stream it via WebSocket to all subscribed clients
  // 3. Update their UI instantly

  return notification
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string) {
  // Single update - Realtime streams the change automatically
  return await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true }
  })
}
```

### 3. Auth Login Route (Supabase)

Update `app/api/auth/login/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password
    })

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const supabaseUid = authData.user.id
    const userEmail = authData.user.email!

    // Check if admin exists in database, create if not
    let admin = await prisma.admin.findUnique({
      where: { firebaseUid: supabaseUid } // Note: You might want to rename this field to supabaseUid
    })

    if (!admin) {
      admin = await prisma.admin.create({
        data: {
          firebaseUid: supabaseUid, // Or rename to supabaseUid
          email: userEmail
        }
      })
    }

    // Get session token
    const { data: sessionData } = await supabaseAdmin.auth.getSession()

    return NextResponse.json({
      admin: {
        id: admin.id,
        email: admin.email,
        supabaseUid: supabaseUid
      },
      session: sessionData.session
    })
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## Enable Supabase Realtime

1. Go to your Supabase Dashboard
2. Navigate to **Database** > **Replication**
3. Enable replication for the `Notification` table
4. That's it! Realtime is now active

## Benefits After Migration

✅ **Simpler Code**: No dual-write pattern  
✅ **Single Source of Truth**: PostgreSQL is the only database  
✅ **Automatic Realtime**: No manual Firebase writes needed  
✅ **Better Performance**: Direct PostgreSQL access  
✅ **Easier Debugging**: One service to monitor  
✅ **Lower Cost**: One service instead of two  

## Migration Checklist

- [ ] Install `@supabase/supabase-js`
- [ ] Create `lib/supabase.ts` with client setup
- [ ] Update `.env` with Supabase credentials
- [ ] Replace Firebase Auth with Supabase Auth
- [ ] Update `hooks/use-realtime-notifications.ts` to use Supabase Realtime
- [ ] Simplify `lib/notifications.ts` (remove Firebase writes)
- [ ] Update auth middleware to use Supabase
- [ ] Update login route to use Supabase Auth
- [ ] Enable Realtime replication in Supabase Dashboard
- [ ] Test realtime notifications
- [ ] Remove Firebase dependencies (optional cleanup)

## Next Steps

1. Fill in your Supabase credentials in `.env`
2. Run `npm install @supabase/supabase-js`
3. Follow the migration steps above
4. Test everything works
5. Remove Firebase packages if desired: `npm uninstall firebase firebase-admin`

You're all set! 🎉

