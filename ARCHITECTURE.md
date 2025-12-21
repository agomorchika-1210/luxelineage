# System Architecture

## Overview

This project uses a **hybrid architecture** combining Firebase and Supabase:

- **Firebase**: Authentication + Realtime Notifications
- **Supabase**: All business data (products, orders, sales, inventory)

## Data Flow

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (Browser)                      │
│                                                          │
│  ┌──────────────┐              ┌──────────────┐        │
│  │ Firebase Auth│              │ Firebase     │        │
│  │ (Login)      │              │ Firestore    │        │
│  │              │              │ (Realtime)   │        │
│  └──────┬───────┘              └──────┬───────┘        │
│         │                              │                │
│         │ ID Token                     │ Subscribe      │
│         │                              │                │
└─────────┼──────────────────────────────┼────────────────┘
          │                              │
          ▼                              ▼
┌─────────────────────────────────────────────────────────┐
│                  BACKEND (Next.js API)                  │
│                                                          │
│  ┌──────────────┐              ┌──────────────┐        │
│  │ Firebase     │              │ Supabase     │        │
│  │ Admin SDK    │              │ (PostgreSQL) │        │
│  │              │              │              │        │
│  │ - Verify     │              │ - Products  │        │
│  │   tokens     │              │ - Orders    │        │
│  │ - Write to   │              │ - Sales     │        │
│  │   Firestore  │              │ - Inventory │        │
│  └──────┬───────┘              │ - Admin     │        │
│         │                      │   (linked)  │        │
│         │                      └─────────────┘        │
│         │                              │                │
│         └──────────┬───────────────────┘                │
│                    │                                     │
│         Create notifications in both                     │
└─────────────────────────────────────────────────────────┘
```

## How They Connect

### 1. Authentication

**Flow:**
1. User logs in with Firebase Auth (client-side)
2. Firebase returns ID token
3. Client sends token to `/api/auth/login`
4. Backend verifies token with Firebase Admin SDK
5. Backend creates/updates Admin record in Supabase with `firebaseUid`
6. Admin record links Firebase user to Supabase admin

**Key Point:** Admin table in Supabase has `firebaseUid` field that links to Firebase Auth user.

### 2. Notifications

**Dual Storage Strategy:**
- **Supabase**: Stores all notifications for persistence, queries, and history
- **Firebase Firestore**: Stores notifications for realtime updates

**Flow:**
1. Backend creates notification (e.g., new order)
2. Saves to Supabase (persistent storage)
3. Saves to Firebase Firestore (realtime)
4. Clients subscribe to Firestore for instant updates
5. Clients can query Supabase for notification history

**Why Both?**
- Supabase: Reliable, queryable, persistent
- Firebase: Realtime updates, instant notifications

### 3. Data Storage

**Supabase (PostgreSQL) stores:**
- ✅ Products
- ✅ Orders
- ✅ Sales
- ✅ Inventory
- ✅ Admin records (linked to Firebase)
- ✅ Notification history

**Firebase stores:**
- ✅ User authentication (Firebase Auth)
- ✅ Realtime notifications (Firestore)

## API Endpoints

All endpoints use Firebase Auth tokens:

```
Authorization: Bearer <firebase-id-token>
```

The middleware:
1. Verifies Firebase token
2. Looks up admin in Supabase by `firebaseUid`
3. Returns admin data for authorization

## Benefits of This Architecture

1. **Best of Both Worlds**:
   - Firebase: Excellent auth + realtime
   - Supabase: Powerful PostgreSQL + great DX

2. **Separation of Concerns**:
   - Auth/Realtime: Firebase
   - Business Logic: Supabase

3. **Scalability**:
   - Firebase handles auth scaling
   - Supabase handles data scaling

4. **Cost Effective**:
   - Use Firebase free tier for auth/realtime
   - Use Supabase for data (often cheaper than Firebase Firestore for large datasets)

## Migration Path

If you ever want to move everything to one platform:

- **To Supabase only**: Add Supabase Auth + Realtime
- **To Firebase only**: Migrate data to Firestore

But the current hybrid approach is optimal for most use cases.

