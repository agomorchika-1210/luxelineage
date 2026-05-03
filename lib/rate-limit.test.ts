import { describe, it, expect } from 'vitest'
import { rateLimit } from './rate-limit'

describe('rateLimit', () => {
  it('allows requests under the cap', () => {
    const k = `cap-${Math.random()}`
    expect(rateLimit(k, 3, 10_000).ok).toBe(true)
    expect(rateLimit(k, 3, 10_000).ok).toBe(true)
    expect(rateLimit(k, 3, 10_000).ok).toBe(true)
  })

  it('blocks after the cap within the window', () => {
    const key = `t2-${Math.random()}`
    rateLimit(key, 2, 60_000)
    rateLimit(key, 2, 60_000)
    const third = rateLimit(key, 2, 60_000)
    expect(third.ok).toBe(false)
    expect(third.retryAfterSec).toBeDefined()
  })
})
