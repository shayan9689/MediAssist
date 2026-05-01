import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/auth-context'
import { TopicSelector } from '@/features/chat/components/TopicSelector'
import { ChatComposer } from '@/features/chat/components/ChatComposer'
import { ChatMessageThread } from '@/features/chat/components/ChatMessageThread'
import { ChatLandingHero } from '@/features/chat/components/ChatLandingHero'
import { ChatSuggestionChips } from '@/features/chat/components/ChatSuggestionChips'
import { useChatStore } from '@/features/chat/store/chat-store'
import { enableAuth } from '@/shared/config/env'

const TOOLBAR_LOGO_FILE = 'Screenshot 2026-05-01 102704.png'

export function ChatWorkspace() {
  const { user, signOut } = useAuth()
  const sessions = useChatStore((state) => state.sessions)
  const activeSessionId = useChatStore((state) => state.activeSessionId)
  const topicDraft = useChatStore((state) => state.topicDraft)
  const setTopicDraft = useChatStore((state) => state.setTopicDraft)
  const status = useChatStore((state) => state.status)
  const error = useChatStore((state) => state.error)
  const clearError = useChatStore((state) => state.clearError)

  useEffect(() => {
    void useChatStore.getState().bootstrap(user?.id ?? null)
  }, [user?.id])

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId),
    [sessions, activeSessionId],
  )

  const hasConversation = Boolean(activeSession && activeSession.messages.length > 0)

  async function handleSignOut() {
    try {
      await signOut()
    } catch (signOutError) {
      console.error(signOutError)
    }
  }

  const headerStatus =
    status === 'loading' ? 'Loading chats…' : status === 'sending' ? 'Working…' : null

  return (
    <div className="chat-workspace-root">
      <header className="gpt-toolbar">
        <div className="gpt-toolbar-left">
          <div className="gpt-toolbar-brand">
            <img
              src={`${import.meta.env.BASE_URL}logo/${encodeURIComponent(TOOLBAR_LOGO_FILE)}`}
              alt="Nurse AI"
              className="gpt-toolbar-logo"
              decoding="async"
            />
          </div>
        </div>

        <div className="gpt-toolbar-right">
          <TopicSelector
            variant="toolbar"
            value={topicDraft}
            onChange={setTopicDraft}
            disabled={status === 'loading'}
          />

          {enableAuth && user ? (
            <>
              <span className="gpt-toolbar-hint gpt-toolbar-email">{user.email}</span>
              <button type="button" className="gpt-toolbar-btn" onClick={() => void handleSignOut()}>
                Sign out
              </button>
            </>
          ) : enableAuth ? (
            <Link to="/login" className="inline-link gpt-toolbar-link">
              Sign in
            </Link>
          ) : null}
        </div>
      </header>

      {headerStatus ? <p className="chat-status-banner">{headerStatus}</p> : null}

      {error ? (
        <div className="chat-error-banner" role="alert">
          <span>{error}</span>
          <button type="button" className="chat-error-dismiss" onClick={() => clearError()}>
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="gpt-main-stage">
        {hasConversation ? (
          <>
            <div className="gpt-scroll">
              <ChatMessageThread />
            </div>
            <div className="gpt-dock">
              <ChatComposer variant="dock" />
            </div>
          </>
        ) : (
          <div className="gpt-landing">
            <ChatLandingHero />
            <ChatComposer variant="centered" />
            <ChatSuggestionChips />
          </div>
        )}
      </div>
    </div>
  )
}
