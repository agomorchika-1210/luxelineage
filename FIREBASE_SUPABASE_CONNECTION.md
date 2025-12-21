# How Firebase & Supabase Connect

## The Connection Point: `firebaseUid`

The **only link** between Firebase and Supabase is the `firebaseUid` field in the Admin table.

## Visual Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    USER LOGS IN                              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              FIREBASE AUTH (Client-Side)                     │
│                                                               │
│  User: admin@luxelineage.com                                │
│  Password: ******                                            │
│                                                               │
│  ✅ Firebase verifies credentials                            │
│  ✅ Returns: { uid: "abc123xyz", email: "admin@..." }       │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Firebase ID Token
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND API: /api/auth/login                     │
│                                                               │
│  1. Verify Firebase token                                    │
│  2. Extract firebaseUid: "abc123xyz"                         │
│  3. Look up in Supabase:                                     │
│     SELECT * FROM Admin WHERE firebaseUid = "abc123xyz"     │
│                                                               │
│  ✅ Found admin record in Supabase                           │
│  ✅ Return admin data                                        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE DATABASE                                │
│                                                               │
│  Admin Table:                                                │
│  ┌──────────┬──────────────┬─────────────────────────┐     │
│  │ id       │ firebaseUid  │ email                   │     │
│  ├──────────┼──────────────┼─────────────────────────┤     │
│  │ "adm-1"  │ "abc123xyz"  │ "admin@luxelineage.com" │     │
│  └──────────┴──────────────┴─────────────────────────┘     │
│                                                               │
│  This firebaseUid links Firebase user to Supabase admin     │
└─────────────────────────────────────────────────────────────┘
```

## Step-by-Step Connection

### 1. Initial Setup (One Time)

**Create Admin in Supabase:**
```sql
-- Admin record in Supabase
INSERT INTO Admin (id, firebaseUid, email)
VALUES ('adm-1', 'abc123xyz', 'admin@luxelineage.com');
```

**Create User in Firebase:**
- Go to Firebase Console > Authentication
- Add user: admin@luxelineage.com
- Copy the User UID (e.g., "abc123xyz")
- Use this UID as `firebaseUid` in Supabase

### 2. Login Flow (Every Time)

```
Client:
  → Login with Firebase Auth
  → Get Firebase ID Token
  
Backend:
  → Verify token with Firebase Admin SDK
  → Extract firebaseUid from token
  → Query Supabase: WHERE firebaseUid = extracted_uid
  → Return admin data from Supabase
```

### 3. API Requests (Every Request)

```
Client sends request:
  Headers: { Authorization: "Bearer <firebase-token>" }
  
Backend middleware:
  → Verify Firebase token
  → Get firebaseUid from token
  → Look up admin in Supabase by firebaseUid
  → If found: Allow request
  → If not found: Reject (401)
```

## Code Example

### Backend Middleware (lib/middleware.ts)

```typescript
export async function requireAuth(request: NextRequest) {
  // 1. Get Firebase token from header
  const token = getAuthToken(request) // "Bearer abc123..."
  
  // 2. Verify with Firebase
  const decodedToken = await adminAuth.verifyIdToken(token)
  const firebaseUid = decodedToken.uid // "abc123xyz"
  
  // 3. Look up in Supabase using firebaseUid
  const admin = await prisma.admin.findUnique({
    where: { firebaseUid } // This is the connection!
  })
  
  // 4. Return admin from Supabase
  return { adminId: admin.id, firebaseUid }
}
```

## Notifications: Dual Storage

### Why Both?

**Supabase (PostgreSQL):**
- ✅ Persistent storage
- ✅ Queryable (filter, sort, paginate)
- ✅ Reliable
- ✅ Part of your main database

**Firebase Firestore:**
- ✅ Realtime updates
- ✅ Instant notifications
- ✅ WebSocket-like experience

### How They Sync

```typescript
// When creating notification:
async function createNotification(type, message) {
  // 1. Save to Supabase (persistence)
  const notification = await prisma.notification.create({
    data: { type, message }
  })
  
  // 2. Save to Firebase (realtime)
  await adminFirestore.collection('notifications').add({
    id: notification.id, // Link them by ID
    type,
    message,
    createdAt: notification.createdAt
  })
  
  // Clients subscribed to Firebase get instant update!
}
```

## Data Ownership

| Data Type | Stored In | Why |
|-----------|-----------|-----|
| User Auth | Firebase | Firebase Auth handles this |
| Admin Records | Supabase | Business data, linked via firebaseUid |
| Products | Supabase | All business data |
| Orders | Supabase | All business data |
| Sales | Supabase | All business data |
| Inventory | Supabase | All business data |
| Notifications | Both | Supabase for queries, Firebase for realtime |

## The Key Insight

**Firebase UID is the bridge:**

```
Firebase Auth User (uid: "abc123xyz")
           │
           │ firebaseUid field
           ▼
Supabase Admin Record (firebaseUid: "abc123xyz")
           │
           │ This admin can access
           ▼
All Supabase Data (products, orders, sales, etc.)
```

## No Direct Database Connection

- Firebase and Supabase are **completely separate**
- They don't share a database
- They don't sync automatically
- The **only connection** is the `firebaseUid` field

## Benefits

1. **Clear Separation**: Auth in Firebase, data in Supabase
2. **Best Tools**: Use each platform for what it's best at
3. **Simple Link**: Just one field (`firebaseUid`) connects them
4. **No Conflicts**: They operate independently

## Example: Complete Flow

```
1. User logs in → Firebase Auth → Returns UID: "abc123xyz"

2. Client calls /api/auth/login with Firebase token

3. Backend:
   - Verifies token with Firebase ✅
   - Gets UID: "abc123xyz"
   - Queries Supabase: Admin WHERE firebaseUid = "abc123xyz"
   - Returns admin data from Supabase

4. Client stores token, uses for all API calls

5. Every API call:
   - Backend verifies Firebase token
   - Gets UID from token
   - Looks up admin in Supabase
   - Processes request with Supabase data
```

This is a **loose coupling** - Firebase and Supabase don't know about each other, but your backend code connects them using the `firebaseUid` field.

