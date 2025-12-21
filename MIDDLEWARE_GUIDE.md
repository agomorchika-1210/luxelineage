# Middleware Guide

## Overview

This project now includes a **strong middleware system** that provides:

1. **Route-level protection** (Next.js Edge Middleware)
2. **Centralized authentication** (API middleware helpers)
3. **Rate limiting** (basic implementation)
4. **CORS handling**
5. **Error handling** (centralized)

## Architecture

### 1. Next.js Edge Middleware (`middleware.ts`)

Runs at the **edge** (before requests reach your API routes) and provides:

- ✅ **Early rejection** of unauthorized requests
- ✅ **Route protection** at the framework level
- ✅ **CORS handling** for API routes
- ✅ **Admin route protection** (redirects to login)

**Benefits:**
- Can't be bypassed by direct API calls
- Better performance (rejects early)
- Consistent security across all routes

### 2. API Middleware Helpers (`lib/api-middleware.ts`)

Provides higher-order functions to wrap route handlers:

#### `withAuth()`
Wraps protected routes with authentication:

```typescript
// Before (repetitive)
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // ... handler code
}

// After (clean)
export const GET = withAuth(async (request, auth) => {
  // auth is guaranteed to exist
  // ... handler code
})
```

#### `withErrorHandling()`
Provides centralized error handling:

```typescript
export const GET = withErrorHandling(async (request) => {
  // Errors are automatically caught and formatted
  // ... handler code
})
```

#### `withRateLimit()`
Adds rate limiting to routes:

```typescript
export const POST = withRateLimit(
  withAuth(async (request, auth) => {
    // ... handler code
  }),
  { maxRequests: 10, windowMs: 60000 } // 10 requests per minute
)
```

## Current Protection Levels

### Public Routes (No Auth Required)
- `GET /api/products` - Browse products
- `POST /api/orders` - Create order (checkout)
- `POST /api/auth/login` - Login endpoint

### Protected Routes (Auth Required)
- `POST /api/products` - Create product
- `PUT /api/products/[id]` - Update product
- `POST /api/products/[id]/stock` - Update stock
- `GET /api/orders` - List orders
- `POST /api/orders/[id]/process` - Process order
- `GET /api/sales` - Get sales
- `POST /api/sales/pos` - Create POS sale
- `GET /api/notifications` - Get notifications

### Admin Pages
- `/admin/*` (except `/admin/login`) - All require authentication

## Migration Guide

### Step 1: Refactor Protected Routes

**Before:**
```typescript
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAuth(request)
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    // ... handler code
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

**After:**
```typescript
import { withAuth } from '@/lib/api-middleware'

export const GET = withAuth(async (request, auth) => {
  // auth is guaranteed to exist
  // ... handler code
})
```

### Step 2: Add Rate Limiting (Optional)

For sensitive operations:
```typescript
import { withAuth, withRateLimit } from '@/lib/api-middleware'

export const POST = withRateLimit(
  withAuth(async (request, auth) => {
    // ... handler code
  }),
  { maxRequests: 5, windowMs: 60000 } // 5 requests per minute
)
```

## Security Benefits

1. **Defense in Depth**
   - Edge middleware (first line)
   - Route-level auth (second line)
   - Database-level checks (if needed)

2. **Performance**
   - Early rejection saves server resources
   - Rate limiting prevents abuse

3. **Maintainability**
   - Centralized auth logic
   - DRY principle (Don't Repeat Yourself)
   - Easier to update security policies

4. **Production Ready**
   - Handles edge cases
   - Proper error responses
   - CORS configuration

## Future Enhancements

Consider adding:

1. **Redis-based rate limiting** (for distributed systems)
2. **Request validation** (Zod schemas)
3. **Audit logging** (track admin actions)
4. **IP whitelisting** (for sensitive operations)
5. **Request signing** (for webhook endpoints)

## Testing

Test the middleware by:

1. **Unauthorized requests:**
   ```bash
   curl http://localhost:3000/api/orders
   # Should return 401
   ```

2. **Authorized requests:**
   ```bash
   curl -H "Authorization: Bearer <token>" http://localhost:3000/api/orders
   # Should return data
   ```

3. **Rate limiting:**
   ```bash
   # Make multiple rapid requests
   # Should return 429 after limit
   ```

## Notes

- The middleware runs on **every request** (edge runtime)
- Keep middleware logic **lightweight** (no heavy operations)
- Token validation still happens in route handlers (for security)
- Middleware provides **early rejection** for better performance

