import { useLayoutEffect, useRef, useState } from 'react'
import { useChatStore } from '@/features/chat/store/chat-store'

const COMPOSER_MAX_HEIGHT_PX = 200

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

type ChatComposerProps = {
  variant?: 'centered' | 'dock'
}

export function ChatComposer({ variant = 'dock' }: ChatComposerProps) {
  const sendUserMessage = useChatStore((state) => state.sendUserMessage)
  const createSession = useChatStore((state) => state.createSession)
  const status = useChatStore((state) => state.status)

  const [draft, setDraft] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const disabled = status === 'loading' || status === 'sending'

  function syncTextareaHeight() {
    const el = textareaRef.current
    if (!el) return

    el.style.height = 'auto'
    const next = Math.min(Math.max(el.scrollHeight, 52), COMPOSER_MAX_HEIGHT_PX)
    el.style.height = `${next}px`
  }

  useLayoutEffect(() => {
    syncTextareaHeight()
  }, [draft])

  async function submit() {
    const text = draft.trim()
    if (!text || disabled) return

    let sid = useChatStore.getState().activeSessionId
    if (!sid) {
      await createSession()
      sid = useChatStore.getState().activeSessionId
    }
    if (!sid) return

    setDraft('')
    await sendUserMessage(text)
    requestAnimationFrame(() => syncTextareaHeight())
  }

  const variantClass = variant === 'centered' ? 'chat-composer-centered' : 'chat-composer-dock'

  return (
    <div className={`chat-composer ${variantClass}`}>
      <div className="gpt-composer-pill">
        <textarea
          ref={textareaRef}
          className="gpt-composer-input"
          rows={1}
          placeholder="Ask anything"
          value={draft}
          disabled={disabled}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void submit()
            }
          }}
        />

        <div className="gpt-composer-trailing">
          <button
            type="button"
            className="gpt-composer-send"
            disabled={disabled || !draft.trim()}
            aria-label={status === 'sending' ? 'Sending' : 'Send message'}
            onClick={() => void submit()}
          >
            {status === 'sending' ? (
              <span className="chat-composer-send-spinner" aria-hidden="true" />
            ) : (
              <SendIcon />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
