import { useCallback, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/auth-context'
import { ChatRecentsSection } from '@/features/chat/components/ChatRecentsSection'
import { useChatStore } from '@/features/chat/store/chat-store'
import { enableAuth } from '@/shared/config/env'

const BRAND_LOGO_FILE = 'Screenshot 2026-05-01 102704.png'

function IconDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="12" cy="12" r="3" fill="currentColor" />
    </svg>
  )
}

function IconChat({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 5.5 17.5 12 12 18.5 6.5 12z" />
    </svg>
  )
}

function IconQuiz({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        d="M12 5.5 17.5 12 12 18.5 6.5 12z"
      />
    </svg>
  )
}

function IconDrugs({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        d="M9 5v14M15 5v14M5 9h14M5 15h14"
      />
    </svg>
  )
}

function IconCases({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        d="M8 4h11v16H8zM8 8h11M8 12h7M8 16h9"
      />
    </svg>
  )
}

function IconSettings({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c0 .49.21.95.56 1.27.35.31.8.47 1.27.47H21a2 2 0 1 1 0 4h-.09c-.49 0-.95.21-1.27.56-.31.35-.47.8-.47 1.27z"
      />
    </svg>
  )
}

function isDashboardSectionPath(pathname: string): boolean {
  if (pathname === '/') return true
  const prefixes = ['/chat', '/quiz', '/drugs', '/case', '/settings']
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))
}

const subNavClass = ({ isActive }: { isActive: boolean }) =>
  `gpt-sidebar-nav-link gpt-sidebar-nav-sublink${isActive ? ' gpt-sidebar-nav-link-active' : ''}`

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const createSession = useChatStore((state) => state.createSession)
  const status = useChatStore((state) => state.status)

  const sectionActive = isDashboardSectionPath(location.pathname)
  const [dashboardOpen, setDashboardOpen] = useState(false)

  const toggleDashboard = useCallback(() => {
    setDashboardOpen((open) => !open)
  }, [])

  const displayName = user?.email?.split('@')[0] ?? 'You'
  const isBusy = status === 'loading' || status === 'sending'
  const showChatRecents = location.pathname.startsWith('/chat')

  async function handleNewChat() {
    await createSession()
    navigate('/chat')
  }

  async function handleSignOut() {
    try {
      await signOut()
    } catch (signOutError) {
      console.error(signOutError)
    }
  }

  const parentLooksActive = sectionActive && !dashboardOpen

  return (
    <aside className="gpt-sidebar">
      <div className="gpt-sidebar-top">
        <NavLink to="/" className="gpt-sidebar-brand" end>
          <img
            src={`${import.meta.env.BASE_URL}logo/${encodeURIComponent(BRAND_LOGO_FILE)}`}
            alt=""
            className="gpt-sidebar-brand-logo"
            decoding="async"
          />
          <span className="gpt-sidebar-brand-text">MediAssist</span>
        </NavLink>

        <button type="button" className="gpt-sidebar-new-chat" disabled={isBusy} onClick={() => void handleNewChat()}>
          <span className="gpt-sidebar-new-icon" aria-hidden="true">
            +
          </span>
          New chat
        </button>

        <nav className="gpt-sidebar-nav" aria-label="Product">
          <div className="gpt-sidebar-nav-group">
            <button
              type="button"
              id="sidebar-dashboard-trigger"
              className={`gpt-sidebar-nav-parent${parentLooksActive ? ' gpt-sidebar-nav-parent-active' : ''}${dashboardOpen ? ' gpt-sidebar-nav-parent-open' : ''}`}
              aria-expanded={dashboardOpen}
              aria-controls="sidebar-dashboard-links"
              onClick={toggleDashboard}
            >
              <span className="gpt-sidebar-nav-parent-main">
                <IconDashboard className="gpt-sidebar-nav-svg" />
                <span className="gpt-sidebar-nav-parent-label">Dashboard</span>
              </span>
              <span className="gpt-sidebar-nav-chevron" aria-hidden="true">
                ▸
              </span>
            </button>

            {dashboardOpen ? (
              <div className="gpt-sidebar-nav-children" id="sidebar-dashboard-links" role="group" aria-labelledby="sidebar-dashboard-trigger">
                <NavLink to="/" className={subNavClass} end>
                  <IconDashboard className="gpt-sidebar-nav-svg gpt-sidebar-nav-svg-sub" />
                  Home
                </NavLink>
                <NavLink to="/chat" className={subNavClass}>
                  <IconChat className="gpt-sidebar-nav-svg gpt-sidebar-nav-svg-sub" />
                  Chat
                </NavLink>
                <NavLink to="/quiz" className={subNavClass}>
                  <IconQuiz className="gpt-sidebar-nav-svg gpt-sidebar-nav-svg-sub" />
                  Quiz
                </NavLink>
                <NavLink to="/drugs" className={subNavClass}>
                  <IconDrugs className="gpt-sidebar-nav-svg gpt-sidebar-nav-svg-sub" />
                  Drugs
                </NavLink>
                <NavLink to="/case" className={subNavClass}>
                  <IconCases className="gpt-sidebar-nav-svg gpt-sidebar-nav-svg-sub" />
                  Cases
                </NavLink>
                <NavLink to="/settings" className={subNavClass}>
                  <IconSettings className="gpt-sidebar-nav-svg gpt-sidebar-nav-svg-sub" />
                  Settings
                </NavLink>
              </div>
            ) : null}
          </div>
        </nav>
      </div>

      {showChatRecents ? <ChatRecentsSection /> : <div className="gpt-sidebar-spacer" aria-hidden="true" />}

      <div className="gpt-sidebar-footer">
        <div className="gpt-sidebar-user">
          <span className="gpt-sidebar-avatar" aria-hidden="true">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
          <div className="gpt-sidebar-user-meta">
            <span className="gpt-sidebar-user-name">{displayName}</span>
            {user?.email ? <span className="gpt-sidebar-user-sub">{user.email}</span> : null}
          </div>
        </div>
        {enableAuth && user ? (
          <button type="button" className="gpt-sidebar-signout" onClick={() => void handleSignOut()}>
            Sign out
          </button>
        ) : enableAuth ? (
          <NavLink to="/login" className="gpt-sidebar-signout-link">
            Sign in
          </NavLink>
        ) : null}
      </div>
    </aside>
  )
}
