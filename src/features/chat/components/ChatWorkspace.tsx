import { useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/auth-context'
import { ModeSelector } from '@/features/chat/components/ModeSelector'
import { TopicSelector } from '@/features/chat/components/TopicSelector'
import { ChatComposer } from '@/features/chat/components/ChatComposer'
import { ChatMessageThread } from '@/features/chat/components/ChatMessageThread'
import { ChatLandingHero } from '@/features/chat/components/ChatLandingHero'
import { useChatStore } from '@/features/chat/store/chat-store'

const TOOLBAR_LOGO_FILE = 'Screenshot 2026-05-01 102704.png'

export function ChatWorkspace() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessions = useChatStore((state) => state.sessions)
  const activeSessionId = useChatStore((state) => state.activeSessionId)
  const topicDraft = useChatStore((state) => state.topicDraft)
  const setTopicDraft = useChatStore((state) => state.setTopicDraft)
  const modeDraft = useChatStore((state) => state.modeDraft)
  const requiresModeSelection = useChatStore((state) => state.requiresModeSelection)
  const setModeDraft = useChatStore((state) => state.setModeDraft)
  const setLearnerName = useChatStore((state) => state.setLearnerName)
  const drillStatsBySession = useChatStore((state) => state.drillStatsBySession)
  const status = useChatStore((state) => state.status)
  const error = useChatStore((state) => state.error)
  const clearError = useChatStore((state) => state.clearError)

  useEffect(() => {
    void useChatStore.getState().bootstrap(user?.id ?? null)
  }, [user?.id])

  useEffect(() => {
    const raw = searchParams.get('new')
    const wantNewChat = raw === '1' || raw === 'true' || raw === 'yes'
    if (!wantNewChat) return

    let cancelled = false

    void (async () => {
      const deadline = Date.now() + 30_000
      let ready = false
      while (!cancelled && Date.now() < deadline) {
        const s = useChatStore.getState()
        if (s.status === 'error') {
          navigate('/chat', { replace: true })
          return
        }
        if (s.persistence && s.status === 'idle') {
          ready = true
          break
        }
        await new Promise((r) => setTimeout(r, 40))
      }

      if (cancelled) return
      if (!ready) {
        navigate('/chat', { replace: true })
        return
      }

      await useChatStore.getState().createSession()
      if (cancelled) return
      navigate('/chat', { replace: true })
    })()

    return () => {
      cancelled = true
    }
  }, [searchParams, navigate, user?.id])

  useEffect(() => {
    const raw = user?.email?.split('@')[0] ?? ''
    const display = raw.replace(/[._-]+/g, ' ').trim()
    setLearnerName(display || null)
  }, [setLearnerName, user?.email])

  const activeSession = useMemo(
    () => sessions.find((session) => session.id === activeSessionId),
    [sessions, activeSessionId],
  )

  const hasConversation = Boolean(activeSession && activeSession.messages.length > 0)
  const drillStats = activeSessionId ? drillStatsBySession[activeSessionId] : undefined
  const accuracy = drillStats?.attempted
    ? Math.round((drillStats.correct / drillStats.attempted) * 100)
    : 0

  const headerStatus =
    status === 'loading' ? 'Loading chats…' : status === 'sending' ? 'Working…' : null

  return (
    <div className="chat-workspace-root">
      <header className="gpt-toolbar gpt-toolbar-v2">
        <div className="gpt-toolbar-left">
          <div className="gpt-toolbar-brand">
            <img
              src={`${import.meta.env.BASE_URL}logo/${encodeURIComponent(TOOLBAR_LOGO_FILE)}`}
              alt="Nurse AI"
              className="gpt-toolbar-logo"
              decoding="async"
            />
            <div className="gpt-toolbar-titles">
              <span className="gpt-toolbar-product">NurseAI</span>
              <span className="gpt-toolbar-tagline">Clinical study workspace</span>
            </div>
          </div>
        </div>

        <div className="gpt-toolbar-right">
          {modeDraft === 'drill' ? (
            <span className="drill-score-chip">
              {drillStats?.correct ?? 0}/{drillStats?.attempted ?? 0} ({accuracy}%)
            </span>
          ) : null}
          <ModeSelector
            value={requiresModeSelection ? null : modeDraft}
            onChange={setModeDraft}
            disabled={status === 'loading'}
          />
          <TopicSelector
            variant="toolbar"
            value={topicDraft}
            onChange={setTopicDraft}
            disabled={status === 'loading'}
          />
        </div>
      </header>

      {headerStatus ? <p className="chat-status-banner">{headerStatus}</p> : null}
      {requiresModeSelection ? (
        <p className="chat-status-banner">
          Select a mode first: Tutor, Topic Explainer, or MCQ Practice. Then you can type, or upload a PDF/TXT—after
          upload you will choose summary, quiz, both, or a custom focus before anything is generated.
        </p>
      ) : null}

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
          </div>
        )}
      </div>
    </div>
  )
}
