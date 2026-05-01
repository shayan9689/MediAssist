import { useEffect, useRef } from 'react'
import { useChatStore } from '@/features/chat/store/chat-store'

export function ChatMessageThread() {
  const sessions = useChatStore((state) => state.sessions)
  const activeSessionId = useChatStore((state) => state.activeSessionId)
  const bottomRef = useRef<HTMLDivElement | null>(null)

  const activeSession = sessions.find((session) => session.id === activeSessionId)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeSession?.messages.length, activeSessionId])

  if (!activeSession) {
    return null
  }

  return (
    <div className="gpt-thread">
      <div className="gpt-thread-inner">
        <div className="gpt-messages">
          {activeSession.messages.map((message) => (
            <article
              key={message.id}
              className={`gpt-msg gpt-msg-${message.role}`}
              aria-label={`${message.role} message`}
            >
              <p className="gpt-msg-role">{message.role === 'user' ? 'You' : 'Assistant'}</p>
              <p className="gpt-msg-body">{message.content}</p>
            </article>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}
