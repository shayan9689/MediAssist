import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/auth-context'
import { enableAuth, enableMockAuth, isSupabaseConfigured } from '@/shared/config/env'

function toFriendlyAuthError(error: unknown): string {
  const raw = error instanceof Error ? error.message : 'Authentication failed'
  const lower = raw.toLowerCase()
  if (
    lower.includes('user already registered') ||
    lower.includes('already been registered') ||
    lower.includes('email address is already registered') ||
    lower.includes('email already exists')
  ) {
    return 'An account with this email already exists. Sign in instead.'
  }
  if (lower.includes('failed to fetch')) {
    return [
      'Network/auth request failed.',
      'Check: (1) Supabase URL/anon key in .env, (2) app opened on the same localhost URL added in Supabase Auth URL configuration, (3) browser extensions/VPN/firewall not blocking requests.',
    ].join(' ')
  }
  return raw
}

export function LoginPage() {
  const { user, signInWithPassword, signUpWithPassword } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!enableAuth) {
    return <Navigate to="/" replace />
  }

  if (user) {
    return <Navigate to="/" replace />
  }

  function switchAuthMode(next: 'login' | 'signup') {
    if (next === mode || isSubmitting) return
    setMode(next)
    setEmail('')
    setPassword('')
    setShowPassword(false)
    setErrorMessage(null)
    setSuccessMessage(null)
  }

  async function handleEmailAuth() {
    setIsSubmitting(true)
    setErrorMessage(null)
    setSuccessMessage(null)
    try {
      if (mode === 'login') {
        await signInWithPassword(email, password)
      } else {
        await signUpWithPassword(email, password)
        setPassword('')
        setShowPassword(false)
        setMode('login')
        setSuccessMessage(
          'Account created. Sign in below with the same email and password. If email confirmation is on in Supabase, confirm your email first.',
        )
      }
    } catch (error) {
      setErrorMessage(toFriendlyAuthError(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-v2-page">
      <section className="auth-v2-hero" aria-hidden="true">
        <div className="auth-v2-hero-overlay" />
        <div className="auth-v2-hero-content">
          <div className="auth-v2-brand-icon">✚</div>
          <h1>NurseAI</h1>
          <p>Your clinical companion for NCLEX and beyond.</p>
        </div>
      </section>

      <section className="auth-v2-main">
        <div className="auth-v2-card">
          <div className="auth-v2-tabs" data-mode={mode} role="tablist" aria-label="Authentication mode">
            <span className="auth-v2-tab-indicator" aria-hidden="true" />
            <button
              type="button"
              role="tab"
              id="auth-tab-login"
              aria-selected={mode === 'login'}
              aria-controls="auth-panel"
              className={`auth-v2-tab ${mode === 'login' ? 'auth-v2-tab-active' : ''}`}
              onClick={() => switchAuthMode('login')}
              disabled={isSubmitting}
            >
              Login
            </button>
            <button
              type="button"
              role="tab"
              id="auth-tab-signup"
              aria-selected={mode === 'signup'}
              aria-controls="auth-panel"
              className={`auth-v2-tab ${mode === 'signup' ? 'auth-v2-tab-active' : ''}`}
              onClick={() => switchAuthMode('signup')}
              disabled={isSubmitting}
            >
              Signup
            </button>
          </div>

          <div key={mode} className="auth-v2-mode-copy">
            <h2 className="auth-v2-title">{mode === 'login' ? 'Welcome Back' : 'Create your account'}</h2>
            <p className="auth-v2-subtitle">
              {mode === 'login'
                ? 'Sign in to your clinical assistant account'
                : 'Start your secure NurseAI workspace'}
            </p>
          </div>

          {!isSupabaseConfigured && !enableMockAuth ? (
            <p className="error-text">
              Supabase auth is not configured. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`.
            </p>
          ) : null}
          {enableMockAuth ? (
            <p className="ui-card-hint">
              Mock auth enabled. Demo credentials: <code>shayan19609@gmail.com</code> / <code>12345678</code>
            </p>
          ) : null}

          <form
            id="auth-panel"
            role="tabpanel"
            aria-labelledby={mode === 'login' ? 'auth-tab-login' : 'auth-tab-signup'}
            className="auth-v2-form"
            autoComplete="off"
            onSubmit={(event) => {
              event.preventDefault()
              void handleEmailAuth()
            }}
          >
            <label className="auth-v2-label" htmlFor="auth-email">
              Institutional Email
            </label>
            <input
              id="auth-email"
              name="email"
              type="email"
              className="auth-v2-input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="nurse.practitioner@hospital.org"
              disabled={isSubmitting || (!isSupabaseConfigured && !enableMockAuth)}
            />

            <div className="auth-v2-row">
              <label className="auth-v2-label" htmlFor="auth-password">
                Clinical Access Key
              </label>
              <button type="button" className="auth-v2-inline-btn" disabled>
                Forgot?
              </button>
            </div>
            <div className="auth-v2-password-wrap">
              <input
                key={mode}
                id={mode === 'login' ? 'auth-password-login' : 'auth-password-signup'}
                name={mode === 'login' ? 'password' : 'new-password'}
                type={showPassword ? 'text' : 'password'}
                className="auth-v2-input auth-v2-input-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
                disabled={isSubmitting || (!isSupabaseConfigured && !enableMockAuth)}
              />
              <button
                type="button"
                className="auth-v2-password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <button
              type="submit"
              className="auth-v2-primary"
              disabled={isSubmitting || (!isSupabaseConfigured && !enableMockAuth)}
            >
              {isSubmitting ? (
                'Please wait…'
              ) : (
                <span key={mode} className="auth-v2-submit-label">
                  {mode === 'login' ? 'Begin Clinical Session' : 'Create Account'}
                </span>
              )}
            </button>
          </form>

          {successMessage ? <p className="ui-card-hint">{successMessage}</p> : null}
          {errorMessage ? <p className="error-text">{errorMessage}</p> : null}
        </div>

        <div className="auth-v2-tip">
          <strong>Pro Tip:</strong> Nurses using NurseAI 15 mins daily often improve pharmacology outcomes.
        </div>
      </section>
    </main>
  )
}
