'use client'

import { createClient } from '@supabase/supabase-js'

// Client-side Supabase client (for browser)
// Uses the new "publishable" key - safe to expose in client-side code
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
)

