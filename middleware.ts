import { NextRequest, NextResponse } from 'next/server'

// Routes that require authentication
const protectedApiRoutes = [
  '/api/products', // POST, PUT, DELETE operations
  '/api/orders',   // All operations
  '/api/sales',     // All operations
  '/api/notifications', // All operations
]

// Public API routes (read-only or specific endpoints)
const publicApiRoutes = [
  '/api/products', // GET is public
  '/api/orders',  // POST (for checkout) is public
  '/api/auth',    // Auth endpoints are public
]

// Check if route requires authentication
function requiresAuth(pathname: string, method: string): boolean {
  // Auth endpoints are always public
  if (pathname.startsWith('/api/auth')) {
    return false
  }

  // Check protected routes
  for (const route of protectedApiRoutes) {
    if (pathname.startsWith(route)) {
      // Special cases for public operations
      if (pathname === '/api/products' && method === 'GET') {
        return false // GET products is public
      }
      if (pathname === '/api/orders' && method === 'POST') {
        return false // POST orders (checkout) is public
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

    // Set CORS headers
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    // Handle preflight requests
    if (method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers })
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
  if (isAdminRoute(pathname)) {
    // Check for auth token in cookie or header
    const token = request.cookies.get('auth_token')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) {
      // Redirect to login
      const loginUrl = new URL('/admin/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Token validation happens client-side and in API routes
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

