import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/auth-context'
import { enableAuth } from '@/shared/config/env'

export function LoginPage() {
  const { user, signInWithGoogle } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!enableAuth) {
    return <Navigate to="/" replace />
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  async function handleGoogleSignIn() {
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await signInWithGoogle()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign-in failed'
      setErrorMessage(message)
      setIsSubmitting(false)
    }
  }

  return (
    <main className="layout">
      <section className="card">
        <p className="eyebrow">NurseAI</p>
        <h1>Sign in to continue</h1>
        <p className="muted">
          Use your Google account to access saved sessions, quizzes, and personalized NCLEX prep.
        </p>

        <button type="button" className="primary-button" onClick={handleGoogleSignIn}>
          {isSubmitting ? 'Redirecting...' : 'Continue with Google'}
        </button>

        {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
      </section>
    </main>
  )
}
