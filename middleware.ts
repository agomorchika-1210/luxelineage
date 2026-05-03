import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, rateLimitKey } from './lib/rate-limit'

function getAllowedOrigins(): string[] {
  const raw = process.env.CORS_ALLOW_ORIGINS || ''
  return raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
}

// Routes that require authentication
const protectedApiRoutes = [
  '/api/products', // POST, PUT, DELETE operations
  '/api/orders',   // All operations
  '/api/sales',     // All operations
  '/api/notifications', // All operations
]

// Check if route requires authentication
function requiresAuth(pathname: string, method: string): boolean {
  // Auth endpoints are always public
  if (pathname.startsWith('/api/auth')) {
    return false
  }

  // Guest order tracking
  if (pathname === '/api/orders/track' && method === 'GET') {
    return false
  }

  // Paystack webhook verifies via signature, not Bearer token
  if (pathname === '/api/webhooks/paystack' && method === 'POST') {
    return false
  }

  // Guest polling after Paystack redirect
  if (
    pathname === '/api/checkout/paystack/status' &&
    method === 'GET'
  ) {
    return false
  }

  // Check protected routes
  for (const route of protectedApiRoutes) {
    if (pathname.startsWith(route)) {
      // Special cases for public operations
      
      // GET products (list and individual) is public
      if (pathname.startsWith('/api/products') && method === 'GET') {
        return false
      }
      
      // POST orders (checkout) is public
      if (pathname === '/api/orders' && method === 'POST') {
        return false
      }
      
      // All other operations require auth
      return true
    }
  }

  return false
}

// Check if route is an admin page
function isAdminRoute(pathname: string): boolean {
  return pathname.startsWith('/admin') && 
         pathname !== '/admin/login' && 
         pathname !== '/admin/signup'
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const method = request.method

  // Handle CORS for API routes
  if (pathname.startsWith('/api')) {
    const response = NextResponse.next()

    // Set CORS headers (allowlist-based)
    const origin = request.headers.get('origin')
    const allowed = getAllowedOrigins()
    if (origin && allowed.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Vary', 'Origin')
    }
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    // Handle preflight requests
    if (method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers })
    }

    // --- Rate limits (best-effort; see lib/rate-limit.ts) ---
    if (method === 'POST' && pathname === '/api/auth/login') {
      const rl = rateLimit(rateLimitKey(request, 'auth-login'), 25, 60_000)
      if (!rl.ok) {
        return NextResponse.json(
          { error: 'Too many requests', retryAfter: rl.retryAfterSec },
          { status: 429, headers: response.headers }
        )
      }
    }
    if (method === 'POST' && pathname === '/api/orders') {
      const rl = rateLimit(rateLimitKey(request, 'orders-post'), 45, 60_000)
      if (!rl.ok) {
        return NextResponse.json(
          { error: 'Too many requests', retryAfter: rl.retryAfterSec },
          { status: 429, headers: response.headers }
        )
      }
    }
    if (method === 'POST' && pathname === '/api/checkout/paystack/initialize') {
      const rl = rateLimit(rateLimitKey(request, 'paystack-init'), 20, 60_000)
      if (!rl.ok) {
        return NextResponse.json(
          { error: 'Too many requests', retryAfter: rl.retryAfterSec },
          { status: 429, headers: response.headers }
        )
      }
    }

    // Check if route requires authentication
    if (requiresAuth(pathname, method)) {
      const authHeader = request.headers.get('authorization')
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Unauthorized - Missing or invalid token' },
          { status: 401, headers: response.headers }
        )
      }

      // Token validation happens in the route handler
      // Middleware just checks for presence
      return response
    }

    return response
  }

  // Handle admin route protection
  // Note: We let client-side handle auth checks for admin pages
  // The AdminLayout component will redirect if not authenticated
  // This allows Supabase Auth to work properly client-side
  if (isAdminRoute(pathname)) {
    // Allow the request through - client-side will handle auth
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

