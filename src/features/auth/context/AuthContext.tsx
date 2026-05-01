import { useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import type { Session, SupabaseClient, User } from '@supabase/supabase-js'
import { AuthContext, type AuthContextValue } from '@/features/auth/context/auth-context'
import { supabase } from '@/shared/lib/supabase/client'

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(supabase))

  useEffect(() => {
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
