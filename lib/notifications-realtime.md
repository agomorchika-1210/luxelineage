# Realtime Notifications Architecture

## The Problem
- Supabase: Stores all data, but **no built-in realtime** for Next.js client
- Firebase: Has **excellent realtime** capabilities
- Need: Realtime notifications while keeping data in Supabase

## The Solution: Dual Write Pattern

When a notification is created, we write to **both** systems:

```
Backend creates notification
         │
         ├─► Supabase (PostgreSQL)
         │   └─ Persistent storage, queryable, part of main DB
         │
         └─► Firebase Firestore
             └─ Realtime updates, clients subscribe here
```

## How Realtime Works

### 1. Backend Creates Notification

```typescript
// lib/notifications.ts
async function createNotification(type, message) {
  // 1. Save to Supabase (persistence)
  const notification = await prisma.notification.create({
    data: { type, message }
  })
  
  // 2. Save to Firebase (realtime trigger)
  await adminFirestore.collection('notifications').add({
    id: notification.id,        // Link by ID
    type,
    message,
    read: false,
    createdAt: notification.createdAt.toISOString()
  })
  
  // Firebase automatically notifies all subscribed clients!
}
```

### 2. Client Subscribes to Firebase

```typescript
// Client-side code
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase-client'

// Subscribe to realtime notifications
const notificationsRef = collection(db, 'notifications')
const q = query(notificationsRef, orderBy('createdAt', 'desc'))

const unsubscribe = onSnapshot(q, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === 'added') {
      // NEW NOTIFICATION ARRIVED! 🎉
      const notification = change.doc.data()
      showNotification(notification)
    }
  })
})
```

## Complete Flow

```
┌─────────────────────────────────────────────────────────┐
│  BACKEND: Order Processed                                │
│                                                          │
│  1. Process order in Supabase                           │
│  2. Create notification:                                │
│     ┌─────────────────┐    ┌──────────────────┐     │
│     │   Supabase       │    │   Firebase        │     │
│     │   (PostgreSQL)   │    │   (Firestore)    │     │
│     │                  │    │                  │     │
│     │  Notification    │    │  Notification    │     │
│     │  Record Saved    │    │  Document Added   │     │
│     └─────────────────┘    └────────┬─────────┘     │
│                                      │                 │
└──────────────────────────────────────┼─────────────────┘
                                       │
                                       │ Firebase Realtime
                                       │ (WebSocket-like)
                                       ▼
┌─────────────────────────────────────────────────────────┐
│  CLIENT: Admin Dashboard                                 │
│                                                          │
│  ✅ Subscribed to Firebase Firestore                    │
│  ✅ Receives instant update                             │
│  ✅ Shows notification badge                            │
│  ✅ Updates UI in realtime                              │
└─────────────────────────────────────────────────────────┘
```

## Why This Works

### Firebase Firestore Realtime
- Uses **WebSocket connections**
- Automatically pushes updates to all subscribed clients
- Works instantly across all connected devices
- No polling needed

### Supabase Storage
- Reliable persistent storage
- Queryable (filter, sort, paginate)
- Part of your main database
- Can query notification history

## Data Sync Strategy

### Option 1: Write to Both (Current Implementation)
```
Backend → Supabase (persistence)
       → Firebase (realtime trigger)
```

**Pros:**
- ✅ Supabase has full history
- ✅ Firebase triggers realtime
- ✅ Both systems stay in sync

**Cons:**
- ⚠️ Need to write to both
- ⚠️ If one fails, need error handling

### Option 2: Supabase Only + Polling (Not Recommended)
```
Backend → Supabase only
Client → Polls API every few seconds
```

**Cons:**
- ❌ Not truly realtime
- ❌ Wastes resources
- ❌ Delayed updates

### Option 3: Firebase Only (Not Recommended)
```
Backend → Firebase only
```

**Cons:**
- ❌ No integration with main database
- ❌ Harder to query/analyze
- ❌ Data in two places

## Implementation Details

### Backend: Create Notification

```typescript
// When order is processed
const { createNotification } = await import('@/lib/notifications')

await createNotification(
  'ORDER_PROCESSED',
  `Order ${orderId} has been processed`
)
```

This function:
1. Saves to Supabase ✅
2. Saves to Firebase ✅
3. Firebase automatically notifies clients ✅

### Client: Subscribe to Realtime

```typescript
// In your admin dashboard component
'use client'
import { useEffect, useState } from 'react'
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase-client'

export function useRealtimeNotifications() {
  const [notifications, setNotifications] = useState([])
  
  useEffect(() => {
    const notificationsRef = collection(db, 'notifications')
    const q = query(notificationsRef, orderBy('createdAt', 'desc'))
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setNotifications(newNotifications)
    })
    
    return () => unsubscribe()
  }, [])
  
  return notifications
}
```

### Client: Query History from Supabase

```typescript
// For notification history/archive
const response = await fetch('/api/notifications', {
  headers: {
    'Authorization': `Bearer ${firebaseToken}`
  }
})
const notifications = await response.json()
```

## Error Handling

If Firebase write fails:
- Notification still saved to Supabase ✅
- Client can poll Supabase as fallback
- Log error for monitoring

If Supabase write fails:
- Firebase write still happens ✅
- Realtime still works
- But no persistence (retry logic needed)

## Best Practices

1. **Always write to Supabase first** (source of truth)
2. **Then write to Firebase** (realtime trigger)
3. **Handle errors gracefully** (one can fail, other succeeds)
4. **Use Firebase for realtime UI updates**
5. **Use Supabase for queries and history**

## Alternative: Supabase Realtime

If you want to use only Supabase, you could use Supabase Realtime:

```typescript
// Supabase Realtime (alternative approach)
const channel = supabase
  .channel('notifications')
  .on('postgres_changes', 
    { event: 'INSERT', schema: 'public', table: 'Notification' },
    (payload) => {
      // Realtime update!
    }
  )
  .subscribe()
```

But Firebase Realtime is more reliable and easier to set up for this use case.

## Summary

**Realtime Flow:**
1. Backend writes to both Supabase and Firebase
2. Firebase automatically pushes to all subscribed clients
3. Clients get instant updates via Firebase WebSocket
4. Supabase stores persistent data for queries

**The systems don't need to sync** - they serve different purposes:
- Supabase = Database (persistence)
- Firebase = Realtime engine (updates)

