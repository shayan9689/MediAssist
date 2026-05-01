import { createClient } from '@supabase/supabase-js'
import { env, isSupabaseConfigured } from '@/shared/config/env'

export const supabase = isSupabaseConfigured
  ? createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
