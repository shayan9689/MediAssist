import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChatStore } from '@/features/chat/store/chat-store'

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 3h6m-7 4h8m-9 4v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V11M10 11v6m4-6v6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ChatRecentsSection() {
  const navigate = useNavigate()
  const sessions = useChatStore((state) => state.sessions)
  const activeSessionId = useChatStore((state) => state.activeSessionId)
  const selectSession = useChatStore((state) => state.selectSession)
  const deleteSession = useChatStore((state) => state.deleteSession)
  const status = useChatStore((state) => state.status)

  const [pendingDeleteSessionId, setPendingDeleteSessionId] = useState<string | null>(null)

  const isBusy = status === 'loading' || status === 'sending'

  async function handleDeleteChat(sessionId: string) {
    setPendingDeleteSessionId(null)
    await deleteSession(sessionId)
  }

  return (
    <div className="gpt-sidebar-recents">
      <p className="gpt-sidebar-section-label">Recents</p>
      {sessions.length === 0 ? (
        <p className="gpt-session-empty">No chats yet — start from New chat.</p>
      ) : (
        <ul className="gpt-session-list" aria-label="Recent chats">
          {sessions.map((session) => {
            const isActive = session.id === activeSessionId
            const preview = session.messages.at(-1)?.content ?? 'New chat'

            return (
              <li
                key={session.id}
                className={`gpt-session-row-wrap${isActive ? ' gpt-session-row-wrap-active' : ''}`}
              >
                <button
                  type="button"
                  className="gpt-session-row-main"
                  title={preview}
                  onClick={() => {
                    void selectSession(session.id)
                    navigate('/chat')
                  }}
                >
                  <span className="gpt-session-row-title">{session.title}</span>
                </button>

                <div className="gpt-session-row-actions">
                  <button
                    type="button"
                    className="gpt-session-menu-trigger gpt-session-delete-btn"
                    aria-label={`Delete ${session.title}`}
                    title="Delete chat"
                    disabled={isBusy}
                    onClick={(event) => {
                      event.stopPropagation()
                      setPendingDeleteSessionId(session.id)
                    }}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {pendingDeleteSessionId ? (
        <div className="gpt-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-chat-title">
          <div className="gpt-confirm-card">
            <h3 id="delete-chat-title" className="gpt-confirm-title">
              Delete this chat?
            </h3>
            <p className="gpt-confirm-copy">This action cannot be undone.</p>
            <div className="gpt-confirm-actions">
              <button
                type="button"
                className="gpt-confirm-btn gpt-confirm-btn-cancel"
                onClick={() => setPendingDeleteSessionId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="gpt-confirm-btn gpt-confirm-btn-danger"
                onClick={() => void handleDeleteChat(pendingDeleteSessionId)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
