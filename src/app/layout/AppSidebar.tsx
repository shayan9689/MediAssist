import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/auth-context'
import { ChatRecentsSection } from '@/features/chat/components/ChatRecentsSection'
import { useChatStore } from '@/features/chat/store/chat-store'
import { enableAuth } from '@/shared/config/env'

const BRAND_LOGO_FILE = 'Screenshot 2026-05-01 102704.png'

function IconDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z"
      />
    </svg>
  )
}

function IconChat({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12h.01M12 12h.01M16 12h.01m5 0c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
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
        strokeLinejoin="round"
        d="M8 6h13M8 12h13M8 18h13M4 6h.01M4 12h.01M4 18h.01"
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

const subNavClass = ({ isActive }: { isActive: boolean }) =>
  `gpt-sidebar-nav-link gpt-sidebar-nav-sublink${isActive ? ' gpt-sidebar-nav-link-active' : ''}`

export function AppSidebar() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const createSession = useChatStore((state) => state.createSession)
  const status = useChatStore((state) => state.status)

  const displayName = user?.email?.split('@')[0] ?? 'You'
  const isBusy = status === 'loading' || status === 'sending'
  const showChatRecents = true

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
          <span className="gpt-sidebar-brand-text">NurseAI</span>
        </NavLink>

        <nav className="gpt-sidebar-nav" aria-label="Product">
          <div className="gpt-sidebar-nav-group">
            <div className="gpt-sidebar-nav-children gpt-sidebar-nav-children-always">
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
          </div>
        </nav>

        <button type="button" className="gpt-sidebar-new-chat" disabled={isBusy} onClick={() => void handleNewChat()}>
          <span className="gpt-sidebar-new-icon" aria-hidden="true">
            +
          </span>
          New chat
        </button>
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
