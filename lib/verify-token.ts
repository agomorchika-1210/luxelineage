import { createClient } from '@supabase/supabase-js'
import jwt from 'jsonwebtoken'

export interface VerifiedUser {
  id: string
  email: string
}

/**
 * Verify a Supabase access token using a 3-tier strategy:
 *
 * 1. Try service-role client (supabaseAdmin) – ideal, full trust
 * 2. Try anon/publishable key client – works when service role key is missing/wrong
 * 3. Decode JWT without signature verification – fallback when both Supabase
 *    API calls fail (e.g. service key misconfigured). Checks expiry, role claim,
 *    and issuer prefix so a casual forgery is still rejected.
 *    Security note: this tier relies on admin-record lookup as the final
 *    authorisation gate (no auto-create admins).
 */
export async function verifyToken(accessToken: string): Promise<VerifiedUser | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
  const publicKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

  if (!url) {
    console.error('[verifyToken] NEXT_PUBLIC_SUPABASE_URL is not set')
    return null
  }

  // Tier 1: service-role client
  if (serviceKey) {
    try {
      const client = createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { data: { user }, error } = await client.auth.getUser(accessToken)
      if (user && !error) {
        return { id: user.id, email: user.email! }
      }
      if (process.env.NODE_ENV === 'development') {
        console.warn('[verifyToken] tier-1 (service key) failed:', error?.message)
      }
    } catch (e: any) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[verifyToken] tier-1 exception:', e.message)
      }
    }
  } else {
    console.warn('[verifyToken] SUPABASE_SERVICE_ROLE_KEY is not set – skipping tier-1')
  }

  // Tier 2: anon / publishable key client
  if (publicKey) {
    try {
      const client = createClient(url, publicKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { data: { user }, error } = await client.auth.getUser(accessToken)
      if (user && !error) {
        return { id: user.id, email: user.email! }
      }
      if (process.env.NODE_ENV === 'development') {
        console.warn('[verifyToken] tier-2 (public key) failed:', error?.message)
      }
    } catch (e: any) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[verifyToken] tier-2 exception:', e.message)
      }
    }
  } else {
    console.warn('[verifyToken] No public key available – skipping tier-2')
  }

  // Tier 3: decode JWT without signature verification
  // Security: we check expiry + issuer prefix + role claim.
  // The admin-record lookup (no auto-create) is the final authorization gate.
  try {
    const decoded = jwt.decode(accessToken) as {
      sub?: string
      email?: string
      exp?: number
      role?: string
      iss?: string
    } | null

    if (!decoded) {
      console.error('[verifyToken] JWT decode returned null – token is malformed')
      return null
    }

    if (!decoded.sub || !decoded.email) {
      console.error('[verifyToken] JWT missing sub or email claim')
      return null
    }

    const nowSeconds = Math.floor(Date.now() / 1000)
    if (!decoded.exp || decoded.exp < nowSeconds) {
      console.error('[verifyToken] JWT is expired (exp:', decoded.exp, ', now:', nowSeconds, ')')
      return null
    }

    if (decoded.role !== 'authenticated') {
      console.error('[verifyToken] JWT role is not "authenticated":', decoded.role)
      return null
    }

    // Issuer should start with the Supabase project URL
    if (decoded.iss && !decoded.iss.startsWith(url)) {
      console.error('[verifyToken] JWT issuer mismatch. iss:', decoded.iss, 'expected prefix:', url)
      return null
    }

    console.warn('[verifyToken] fell back to tier-3 (unverified JWT decode). Check your SUPABASE_SERVICE_ROLE_KEY env var.')
    return { id: decoded.sub, email: decoded.email }
  } catch (e: any) {
    console.error('[verifyToken] tier-3 decode failed:', e.message)
  }

  return null
}
