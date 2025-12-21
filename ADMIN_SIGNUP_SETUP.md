# Admin Signup Page - Complete Setup

## ✅ What's Been Created

### 1. **Signup Page** (`app/admin/signup/page.tsx`)
- ✅ Beautiful signup form matching login page design
- ✅ Email, password, confirm password fields
- ✅ Role selection (Admin, Manager, Sales Person)
- ✅ Password validation (min 6 characters)
- ✅ Password confirmation matching
- ✅ Error handling and user feedback
- ✅ Link to login page

### 2. **Signup API** (`app/api/auth/signup/route.ts`)
- ✅ Creates user in Supabase Auth
- ✅ Creates admin record in database
- ✅ Assigns role (defaults to SALES_PERSON)
- ✅ Email validation
- ✅ Password strength validation
- ✅ Prevents duplicate emails
- ✅ Auto-confirms email (for admin signup)
- ✅ Error handling with cleanup

### 3. **Auth Context** (`lib/auth-context.tsx`)
- ✅ Added `signup()` function
- ✅ Automatically signs in after successful signup
- ✅ Syncs admin data after signup

### 4. **Layout Updates** (`app/admin/layout.tsx`)
- ✅ Allows signup page without authentication
- ✅ Redirects properly

### 5. **Login Page** (`app/admin/login/page.tsx`)
- ✅ Added link to signup page

## 🚀 How It Works

### Signup Flow:
1. User fills signup form (email, password, role)
2. Frontend calls `/api/auth/signup`
3. Backend creates user in Supabase Auth
4. Backend creates admin record in database with role
5. Returns success
6. Frontend automatically signs user in
7. Redirects to admin dashboard

## 📋 Features

### Security:
- ✅ Password validation (min 6 characters)
- ✅ Email format validation
- ✅ Prevents duplicate accounts
- ✅ Auto-confirms email (no email verification needed for admin)
- ✅ Role assignment

### User Experience:
- ✅ Clean, modern UI matching login page
- ✅ Role selection with icons
- ✅ Password confirmation
- ✅ Clear error messages
- ✅ Loading states
- ✅ Automatic sign-in after signup

## 🔧 Environment Variables

Make sure these are set in `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
# OR
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SECRET_KEY=your-secret-key
```

## 🎯 Usage

1. **Navigate to** `/admin/signup`
2. **Fill in:**
   - Email
   - Role (Admin, Manager, or Sales Person)
   - Password (min 6 characters)
   - Confirm Password
3. **Click "Create Account"**
4. **Automatically signed in** and redirected to dashboard

## ⚠️ Important Notes

### Supabase Auth Admin API
The signup uses `supabaseAdmin.auth.admin.createUser()` which requires:
- Server-side Supabase client (uses secret key)
- Admin privileges in Supabase

### Email Confirmation
- Signup auto-confirms email (`email_confirm: true`)
- No email verification needed for admin accounts
- Users can sign in immediately after signup

### Role Assignment
- Default role: `SALES_PERSON`
- Can be changed during signup
- Can be updated later by admins in `/admin/users`

### Database
- Creates admin record in `Admin` table
- Links to Supabase Auth UID
- Stores role in database

## 🧪 Testing

1. **Go to** `/admin/signup`
2. **Create test account:**
   - Email: test@example.com
   - Role: Sales Person
   - Password: test123
3. **Should:**
   - Create account successfully
   - Auto-sign in
   - Redirect to `/admin` dashboard

## 🔍 Troubleshooting

### "Failed to create user account"
- Check Supabase Auth is enabled
- Verify `SUPABASE_SECRET_KEY` is set correctly
- Check Supabase project settings

### "User with this email already exists"
- Email is already registered
- Use different email or sign in instead

### "Password must be at least 6 characters"
- Supabase requires minimum 6 characters
- Use a longer password

### Signup succeeds but can't sign in
- Check if admin record was created in database
- Verify role field exists (run migration if needed)
- Check browser console for errors

## 📝 Files Created/Modified

### Created:
- `app/admin/signup/page.tsx` - Signup UI
- `app/api/auth/signup/route.ts` - Signup API endpoint
- `ADMIN_SIGNUP_SETUP.md` - This guide

### Modified:
- `lib/auth-context.tsx` - Added signup function
- `app/admin/layout.tsx` - Allow signup page access
- `app/admin/login/page.tsx` - Added signup link
- `lib/supabase-client.ts` - Support both ANON_KEY and PUBLISHABLE_KEY

## ✅ Next Steps

1. Test signup flow
2. Create test accounts with different roles
3. Verify users appear in `/admin/users` page
4. Test role-based permissions

