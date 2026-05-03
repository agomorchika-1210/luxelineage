import type { NextRequest } from 'next/server'

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

/** Fixed-window counter. Best-effort only (resets on cold starts in serverless). */
export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): { ok: boolean; retryAfterSec?: number } {
  const now = Date.now()
  let b = buckets.get(key)
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }
  if (b.count >= max) {
    return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) }
  }
  b.count += 1
  return { ok: true }
}

export function rateLimitKey(request: NextRequest, label: string): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip =
    forwarded?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  return `${label}:${ip}`
}
