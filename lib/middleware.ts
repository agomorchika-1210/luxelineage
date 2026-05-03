import { NextRequest } from 'next/server'
import { prisma } from './prisma'
import { verifyToken } from './verify-token'

export type AdminRole = 'ADMIN' | 'MANAGER' | 'SALES_PERSON'

export interface AuthResult {
  adminId: string
  supabaseUid: string
  role: AdminRole
  email: string
}

export function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  return null
}

export async function requireAuth(request: NextRequest): Promise<AuthResult | null> {
  const token = getAuthToken(request)
  if (!token) return null
  
  try {
    const verified = await verifyToken(token)

    if (!verified) {
      return null
    }

    const supabaseUid = verified.id

    // Check if admin exists in database
    const admin = await prisma.admin.findUnique({
      where: { firebaseUid: supabaseUid } // Field name is firebaseUid but stores Supabase UID
    })

    if (!admin) {
      return null
    }

    return {
      adminId: admin.id,
      supabaseUid: supabaseUid,
      role: admin.role,
      email: admin.email
    }
  } catch (error: any) {
    console.error('Auth verification error:', {
      code: error.code,
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    // Log Prisma errors specifically
    if (error.code === 'P1001' || error.message?.includes('Can\'t reach database')) {
      console.error('Database connection error - check DATABASE_URL and network connectivity')
    }
    return null
  }
}

/**
 * Check if the authenticated user has one of the required roles
 * @param request - NextRequest object
 * @param allowedRoles - Array of roles that are allowed
 * @returns true if user has required role, false otherwise
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: AdminRole[]
): Promise<boolean> {
  const auth = await requireAuth(request)
  if (!auth) {
    return false
  }

  return allowedRoles.includes(auth.role)
}

/**
 * Get the current user's role
 * @param request - NextRequest object
 * @returns AdminRole or null if not authenticated
 */
export async function getUserRole(request: NextRequest): Promise<AdminRole | null> {
  const auth = await requireAuth(request)
  return auth?.role || null
}
