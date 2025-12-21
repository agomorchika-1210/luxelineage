# User Management Setup Guide

## ✅ What's Been Created

### 1. **Database Schema Updates**
- ✅ Added `AdminRole` enum (ADMIN, MANAGER, SALES_PERSON)
- ✅ Added `role` field to Admin table (defaults to SALES_PERSON)
- ✅ Updated Prisma schema

### 2. **API Endpoints**
- ✅ `GET /api/admin/users` - List all users (Admin/Manager only)
- ✅ `POST /api/admin/users` - Create user (Admin only)
- ✅ `GET /api/admin/users/[id]` - Get user by ID
- ✅ `PUT /api/admin/users/[id]` - Update user (Admin only)
- ✅ `DELETE /api/admin/users/[id]` - Delete user (Admin only)

### 3. **Frontend**
- ✅ User management page at `/admin/users`
- ✅ Add/Edit/Delete users
- ✅ Role assignment (Admin, Manager, Sales Person)
- ✅ Added "Users" link to admin sidebar

### 4. **Middleware & Security**
- ✅ Role-based access control
- ✅ `requireRole()` function for role checks
- ✅ Permission checks on all user management endpoints

## 🚀 Setup Steps

### Step 1: Run Database Migration

**Option A: Using Prisma (Recommended)**
```bash
npx prisma migrate dev --name add_admin_roles
```

**Option B: Using SQL directly in Supabase**
1. Go to Supabase Dashboard → SQL Editor
2. Run `prisma/migrations/add_admin_roles.sql`
3. Or the updated `supabase-setup.sql` (includes AdminRole enum)

### Step 2: Update Existing Admins

After migration, update existing admins to have ADMIN role:

```sql
-- Set all existing admins to ADMIN role
UPDATE "Admin" SET "role" = 'ADMIN' WHERE "role" = 'SALES_PERSON';
```

### Step 3: Generate Prisma Client

```bash
npx prisma generate
```

### Step 4: Test the Feature

1. **Login as admin**
2. **Navigate to** `/admin/users`
3. **Create a test user:**
   - Email: test@example.com
   - Role: Sales Person
   - Firebase UID: (get from Firebase Auth)

## 📋 Role Permissions

### ADMIN
- ✅ Full access to all features
- ✅ Create/Edit/Delete users
- ✅ Manage inventory
- ✅ Process orders
- ✅ View reports
- ✅ Access all admin features

### MANAGER
- ✅ View users (read-only)
- ✅ Manage inventory
- ✅ Process orders
- ✅ View reports
- ❌ Cannot create/edit/delete users

### SALES_PERSON
- ✅ Process orders
- ✅ Create POS sales
- ✅ View sales
- ❌ Cannot manage users
- ❌ Cannot manage inventory
- ❌ Cannot view reports

## 🔒 Security Features

1. **Role-based API protection:**
   - User list: Admin or Manager
   - User create/update/delete: Admin only

2. **Self-protection:**
   - Cannot delete your own account

3. **Validation:**
   - Email uniqueness
   - Role validation
   - Required fields

## 📝 Usage Examples

### Creating a User via API

```typescript
const response = await fetch('/api/admin/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    email: 'user@example.com',
    role: 'SALES_PERSON',
    firebaseUid: 'firebase-uid-here'
  })
})
```

### Checking User Role in Code

```typescript
import { requireRole } from '@/lib/middleware'

// In API route
const canManageUsers = await requireRole(request, ['ADMIN'])
if (!canManageUsers) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}
```

## 🎯 Next Steps

1. **Update existing admins** to ADMIN role
2. **Create test users** with different roles
3. **Test role-based access** to ensure permissions work
4. **Update other admin pages** to check roles if needed

## ⚠️ Important Notes

- **Firebase UID Required:** When creating a user, you need their Firebase Auth UID
- **Default Role:** New users default to SALES_PERSON
- **Existing Admins:** Update them to ADMIN role after migration
- **Role Changes:** Only admins can change user roles

