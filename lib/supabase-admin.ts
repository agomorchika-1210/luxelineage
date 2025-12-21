import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client (for API routes)
// Uses the new "secret" key - bypasses Row Level Security (RLS) when needed
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

