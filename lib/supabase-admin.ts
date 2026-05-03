import { createClient } from '@supabase/supabase-js'

// Server-side Supabase client (for API routes)
// Uses the service role key (bypasses RLS) — must be the long eyJ... token
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

