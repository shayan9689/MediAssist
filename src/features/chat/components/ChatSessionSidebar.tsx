import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/context/auth-context'
import { useChatStore } from '@/features/chat/store/chat-store'

function SessionMenuIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="5" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="12" cy="19" r="2" />
    </svg>
  )
}

export function ChatSessionSidebar() {
  const { user } = useAuth()
  const sessions = useChatStore((state) => state.sessions)
  const activeSessionId = useChatStore((state) => state.activeSessionId)
  const selectSession = useChatStore((state) => state.selectSession)
  const createSession = useChatStore((state) => state.createSession)
  const deleteSession = useChatStore((state) => state.deleteSession)
  const status = useChatStore((state) => state.status)

  const [menuSessionId, setMenuSessionId] = useState<string | null>(null)

  const closeMenu = useCallback(() => setMenuSessionId(null), [])

  useEffect(() => {
    if (!menuSessionId) return

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      const menuEl = document.querySelector(`[data-session-menu="${menuSessionId}"]`)
      if (menuEl?.contains(target)) return
      const triggerEl = document.querySelector(`[data-session-menu-trigger="${menuSessionId}"]`)
      if (triggerEl?.contains(target)) return
      closeMenu()
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') closeMenu()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [menuSessionId, closeMenu])

  const isBusy = status === 'loading' || status === 'sending'

  const displayName = user?.email?.split('@')[0] ?? 'You'

  async function handleDeleteChat(sessionId: string) {
    closeMenu()
    const ok = window.confirm('Delete this chat? This cannot be undone.')
    if (!ok) return
    await deleteSession(sessionId)
  }

  return (
    <aside className="gpt-sidebar">
      <div className="gpt-sidebar-top">
        <button
          type="button"
          className="gpt-sidebar-new-chat"
          disabled={isBusy}
          onClick={() => void createSession()}
        >
          <span className="gpt-sidebar-new-icon" aria-hidden="true">
            +
          </span>
          New chat
        </button>

        <nav className="gpt-sidebar-nav" aria-label="Sidebar">
          <button type="button" className="gpt-sidebar-nav-item" disabled>
            <span className="gpt-sidebar-nav-ico">⌕</span>
            Search chats
          </button>
          <button type="button" className="gpt-sidebar-nav-item" disabled>
            <span className="gpt-sidebar-nav-ico">◇</span>
            Study tools
          </button>
          <button type="button" className="gpt-sidebar-nav-item" disabled>
            <span className="gpt-sidebar-nav-ico">⋯</span>
            More
          </button>
        </nav>
      </div>

      <div className="gpt-sidebar-recents">
        <p className="gpt-sidebar-section-label">Recents</p>
        {sessions.length === 0 ? (
          <p className="gpt-session-empty">No chats yet — start from the composer.</p>
        ) : (
          <ul className="gpt-session-list" aria-label="Recent chats">
            {sessions.map((session) => {
              const isActive = session.id === activeSessionId
              const preview = session.messages.at(-1)?.content ?? 'New chat'
              const menuOpen = menuSessionId === session.id

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
                      closeMenu()
                      void selectSession(session.id)
                    }}
                  >
                    <span className="gpt-session-row-title">{session.title}</span>
                  </button>

                  <div className="gpt-session-row-actions">
                    <button
                      type="button"
                      data-session-menu-trigger={session.id}
                      className={`gpt-session-menu-trigger${menuOpen ? ' gpt-session-menu-trigger-open' : ''}`}
                      aria-label={`Options for ${session.title}`}
                      aria-expanded={menuOpen}
                      aria-haspopup="menu"
                      disabled={isBusy}
                      onClick={(event) => {
                        event.stopPropagation()
                        setMenuSessionId((current) => (current === session.id ? null : session.id))
                      }}
                    >
                      <SessionMenuIcon />
                    </button>

                    {menuOpen ? (
                      <div
                        className="gpt-session-menu"
                        data-session-menu={session.id}
                        role="menu"
                        aria-orientation="vertical"
                      >
                        <button
                          type="button"
                          role="menuitem"
                          className="gpt-session-menu-item gpt-session-menu-item-danger"
                          disabled={isBusy}
                          onClick={() => void handleDeleteChat(session.id)}
                        >
                          Delete chat
                        </button>
                      </div>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

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
      </div>
    </aside>
  )
}
