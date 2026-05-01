import { z } from 'zod'

const raw = import.meta.env

const envSchema = z.object({
  VITE_APP_NAME: z.string().default('NurseAI'),
  VITE_SUPABASE_URL: z.string().optional().default(''),
  VITE_SUPABASE_ANON_KEY: z.string().optional().default(''),
})

const parsed = envSchema.safeParse(raw)

if (!parsed.success) {
  const formattedErrors = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n')

  throw new Error(`Invalid environment variables:\n${formattedErrors}`)
}

const data = parsed.data

const supabaseUrl = data.VITE_SUPABASE_URL.trim()
const supabaseAnonKey = data.VITE_SUPABASE_ANON_KEY.trim()

const enableAuthRaw = raw.VITE_ENABLE_AUTH
export const enableAuth =
  enableAuthRaw === 'true' || enableAuthRaw === '1'

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const env = {
  VITE_APP_NAME: data.VITE_APP_NAME,
  VITE_SUPABASE_URL: supabaseUrl,
  VITE_SUPABASE_ANON_KEY: supabaseAnonKey,
}
