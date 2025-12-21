import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from './middleware'

/**
 * Higher-order function to wrap API route handlers with authentication
 * This provides a cleaner way to protect routes without repeating code
 */
export function withAuth<T = any>(
  handler: (request: NextRequest, auth: { adminId: string; supabaseUid: string }) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest): Promise<NextResponse<T>> => {
    const auth = await requireAuth(request)
    
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      ) as NextResponse<T>
    }

    try {
      return await handler(request, auth)
    } catch (error: any) {
      console.error('API route error:', error)
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: error.status || 500 }
      ) as NextResponse<T>
    }
  }
}

/**
 * Higher-order function for public routes (no auth required)
 * Still provides error handling
 */
export function withErrorHandling<T = any>(
  handler: (request: NextRequest) => Promise<NextResponse<T>>
) {
  return async (request: NextRequest): Promise<NextResponse<T>> => {
    try {
      return await handler(request)
    } catch (error: any) {
      console.error('API route error:', error)
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: error.status || 500 }
      ) as NextResponse<T>
    }
  }
}

/**
 * Rate limiting helper (simple in-memory version)
 * For production, use Redis or a proper rate limiting service
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs
    })
    return true
  }

  if (record.count >= maxRequests) {
    return false
  }

  record.count++
  return true
}

/**
 * Rate limiting middleware wrapper
 */
export function withRateLimit<T = any>(
  handler: (request: NextRequest) => Promise<NextResponse<T>>,
  options: { maxRequests?: number; windowMs?: number } = {}
) {
  return async (request: NextRequest): Promise<NextResponse<T>> => {
    const identifier = request.headers.get('x-forwarded-for') || 
                       request.headers.get('x-real-ip') || 
                       'unknown'
    
    const maxRequests = options.maxRequests || 100
    const windowMs = options.windowMs || 60000

    if (!checkRateLimit(identifier, maxRequests, windowMs)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      ) as NextResponse<T>
    }

    return handler(request)
  }
}

