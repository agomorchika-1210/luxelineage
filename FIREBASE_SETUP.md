# Firebase Setup Guide

## Overview

This project uses a **hybrid architecture**:
- **Firebase**: Authentication + Realtime Notifications
- **Supabase**: All business data (products, orders, sales, inventory)

## How They Connect

1. **Authentication Flow**:
   - User logs in with Firebase Auth (client-side)
   - Firebase returns ID token
   - Client sends token to `/api/auth/login`
   - Backend verifies token and creates/links admin in Supabase
   - Admin record in Supabase has `firebaseUid` linking to Firebase user

2. **Notifications Flow**:
   - Notifications stored in **both** Supabase and Firebase
   - Supabase: For persistence, queries, and history
   - Firebase Firestore: For realtime updates to clients
   - When notification created: Saved to both systems

## Setup Steps

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable **Authentication**:
   - Go to Authentication > Sign-in method
   - Enable **Email/Password**

4. Enable **Firestore Database**:
   - Go to Firestore Database
   - Create database in **test mode** (we'll add security rules later)
   - Choose a location

### 2. Get Firebase Configuration

1. Go to **Project Settings** > **General**
2. Scroll to "Your apps" section
3. Click **Web** icon (`</>`) to add a web app
4. Copy the configuration values

### 3. Update Environment Variables

Edit `.env` file with your Firebase config:

```env
# Client-side Firebase config (public)
NEXT_PUBLIC_FIREBASE_API_KEY="AIza..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789:web:abc123"
```

### 4. Setup Firebase Admin SDK

**Option A: Service Account JSON (Recommended)**

1. Go to **Project Settings** > **Service Accounts**
2. Click **Generate New Private Key**
3. Download the JSON file
4. Copy the entire JSON content and paste it in `.env`:
   ```env
   FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"...","private_key":"..."}'
   ```
   (Keep it as a single line, or use proper JSON escaping)

**Option B: Individual Credentials**

Extract from service account JSON:
```env
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### 5. Firestore Security Rules

Create a `firestore.rules` file (optional, for production):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Notifications: Only authenticated admins can read
    match /notifications/{notificationId} {
      allow read: if request.auth != null;
      allow write: if false; // Only server can write
    }
  }
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

## Architecture Details

### Authentication

```
Client (Firebase Auth) 
  → Login with email/password
  → Get Firebase ID Token
  → Send to /api/auth/login
  → Backend verifies token
  → Creates/updates Admin in Supabase with firebaseUid
  → Returns admin data
```

### Notifications

```
Backend creates notification:
  → Saves to Supabase (persistence)
  → Saves to Firebase Firestore (realtime)
  
Client subscribes:
  → Firebase Firestore listener for realtime updates
  → Can also query Supabase for history
```

### Data Flow

```
┌─────────────┐         ┌──────────────┐
│   Firebase   │         │   Supabase   │
├─────────────┤         ├──────────────┤
│ Auth        │────────▶│ Admin        │
│ (Users)     │ firebaseUid │ (Business) │
│             │         │              │
│ Firestore   │         │ Products    │
│ (Realtime)  │         │ Orders      │
│             │         │ Sales       │
│             │         │ Inventory   │
└─────────────┘         └──────────────┘
```

## Client-Side Usage

### Login Example

```typescript
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase-client'

// 1. Login with Firebase
const userCredential = await signInWithEmailAndPassword(
  auth, 
  email, 
  password
)

// 2. Get ID token
const idToken = await userCredential.user.getIdToken()

// 3. Sync with Supabase backend
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ idToken })
})

const { admin, token } = await response.json()
// Store token for API requests
```

### Realtime Notifications Example

```typescript
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase-client'

// Subscribe to realtime notifications
const notificationsRef = collection(db, 'notifications')
const q = query(notificationsRef, orderBy('createdAt', 'desc'))

const unsubscribe = onSnapshot(q, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    if (change.type === 'added') {
      console.log('New notification:', change.doc.data())
    }
  })
})
```

## Migration from JWT Auth

The old JWT-based auth has been replaced with Firebase Auth. The middleware now:
1. Verifies Firebase ID token
2. Looks up admin in Supabase by `firebaseUid`
3. Returns admin data

All existing API endpoints work the same way, just with Firebase tokens instead of JWT.

## Security Notes

1. **Never commit `.env`** - Contains sensitive Firebase credentials
2. **Firestore Rules** - Set up proper security rules for production
3. **Admin Creation** - First admin must be created manually or via seed script
4. **Token Verification** - All admin endpoints verify Firebase tokens server-side

## Troubleshooting

### "Firebase Admin not initialized"
- Check that `FIREBASE_SERVICE_ACCOUNT_KEY` or `FIREBASE_PROJECT_ID` is set
- Verify service account JSON is valid

### "Invalid token" errors
- Ensure Firebase Auth is properly configured
- Check that user exists in Firebase Auth
- Verify token hasn't expired

### Realtime not working
- Check Firestore is enabled in Firebase Console
- Verify security rules allow reads
- Check client Firebase config is correct

