import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import type { Session, SupabaseClient, User } from '@supabase/supabase-js'
import { AuthContext, type AuthContextValue } from '@/features/auth/context/auth-context'
import { enableMockAuth } from '@/shared/config/env'
import { supabase } from '@/shared/lib/supabase/client'

const MOCK_USER_KEY = 'nurseai.mock.user.v1'
const MOCK_REGISTERED_EMAIL_KEY = 'nurseai.mock.registered-email.v1'
const MOCK_AUTH_EMAIL = 'shayan19609@gmail.com'
const MOCK_AUTH_PASSWORD = '12345678'

const DUPLICATE_EMAIL_MESSAGE = 'An account with this email already exists. Sign in instead.'

function getMockRegisteredEmail(): string | null {
  try {
    return localStorage.getItem(MOCK_REGISTERED_EMAIL_KEY)
  } catch {
    return null
  }
}

function setMockRegisteredEmail(email: string) {
  try {
    localStorage.setItem(MOCK_REGISTERED_EMAIL_KEY, email)
  } catch {
    // ignore quota / private mode
  }
}

function createMockUser(email: string): User {
  return {
    id: 'mock-user-1',
    aud: 'authenticated',
    role: 'authenticated',
    email,
    app_metadata: {},
    user_metadata: { full_name: 'Mock User' },
    identities: [],
    created_at: new Date().toISOString(),
  } as User
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(() => {
    if (!enableMockAuth) return null
    try {
      const saved = localStorage.getItem(MOCK_USER_KEY)
      if (!saved) return null
      const parsed = JSON.parse(saved) as { email?: string }
      return parsed.email ? createMockUser(parsed.email) : null
    } catch {
      return null
    }
  })
  const [isLoading, setIsLoading] = useState(Boolean(supabase) && !enableMockAuth)

  useEffect(() => {
    if (enableMockAuth) {
      return
    }

    const client = supabase
    if (!client) {
      return
    }

    const sb: SupabaseClient = client
    let isMounted = true

    async function hydrateSession(client: SupabaseClient) {
      const { data, error } = await client.auth.getSession()

      if (error) {
        console.error('Failed to load Supabase session', error)
      }

      if (!isMounted) return

      setSession(data.session ?? null)
      setUser(data.session?.user ?? null)
      setIsLoading(false)
    }

    void hydrateSession(sb)

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
      setIsLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      isLoading,
      async signInWithPassword(email: string, password: string) {
        if (enableMockAuth) {
          const normalizedEmail = email.trim().toLowerCase()
          if (normalizedEmail !== MOCK_AUTH_EMAIL || password !== MOCK_AUTH_PASSWORD) {
            throw new Error(`Mock login failed. Use ${MOCK_AUTH_EMAIL} / ${MOCK_AUTH_PASSWORD}`)
          }
          const mockUser = createMockUser(normalizedEmail)
          setUser(mockUser)
          setSession(null)
          localStorage.setItem(MOCK_USER_KEY, JSON.stringify({ email: normalizedEmail }))
          setMockRegisteredEmail(normalizedEmail)
          return
        }
        if (!supabase) {
          throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
        }
        const normalizedEmail = email.trim().toLowerCase()
        if (!normalizedEmail || !password.trim()) {
          throw new Error('Email and password are required.')
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        })
        if (error) throw error
      },
      async signUpWithPassword(email: string, password: string) {
        if (enableMockAuth) {
          const normalizedEmail = email.trim().toLowerCase()
          if (normalizedEmail !== MOCK_AUTH_EMAIL || password !== MOCK_AUTH_PASSWORD) {
            throw new Error(`Mock signup allowed only for ${MOCK_AUTH_EMAIL} / ${MOCK_AUTH_PASSWORD}`)
          }
          if (getMockRegisteredEmail() === normalizedEmail) {
            throw new Error(DUPLICATE_EMAIL_MESSAGE)
          }
          const mockUser = createMockUser(normalizedEmail)
          setUser(mockUser)
          setSession(null)
          localStorage.setItem(MOCK_USER_KEY, JSON.stringify({ email: normalizedEmail }))
          setMockRegisteredEmail(normalizedEmail)
          return
        }
        if (!supabase) {
          throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
        }
        const normalizedEmail = email.trim().toLowerCase()
        if (!normalizedEmail || !password.trim()) {
          throw new Error('Email and password are required.')
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.')
        }
        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
          },
        })
        if (error) throw error

        const identities = data.user?.identities
        if (data.user && Array.isArray(identities) && identities.length === 0) {
          throw new Error(DUPLICATE_EMAIL_MESSAGE)
        }
      },
      async signInWithGoogle() {
        if (!supabase) {
          throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
        }

        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          },
        })

        if (error) {
          throw error
        }
      },
      async signOut() {
        if (enableMockAuth) {
          setUser(null)
          setSession(null)
          localStorage.removeItem(MOCK_USER_KEY)
          return
        }
        if (!supabase) return

        const { error } = await supabase.auth.signOut()

        if (error) {
          throw error
        }
      },
    }),
    [isLoading, session, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
