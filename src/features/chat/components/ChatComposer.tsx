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

function UploadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"
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
  const uploadStudyFile = useChatStore((state) => state.uploadStudyFile)
  const stopGeneration = useChatStore((state) => state.stopGeneration)
  const isStreaming = useChatStore((state) => state.isStreaming)
  const status = useChatStore((state) => state.status)

  const [draft, setDraft] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const disabled = status === 'loading' || status === 'sending' || isStreaming

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
    <form
      className={`chat-composer ${variantClass}`}
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
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
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault()
              void submit()
            }
          }}
        />

        <div className="gpt-composer-trailing">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,application/pdf,text/plain,application/octet-stream"
            hidden
            onChange={(event) => {
              const selected = event.target.files?.[0]
              if (!selected) return
              void uploadStudyFile(selected)
              event.currentTarget.value = ''
            }}
          />
          <button
            type="button"
            className="gpt-composer-upload"
            disabled={disabled}
            aria-label="Upload notes or PDF"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadIcon />
          </button>
          <button
            type="submit"
            className="gpt-composer-send"
            disabled={status === 'loading' || (!isStreaming && !draft.trim())}
            aria-label={isStreaming ? 'Stop generation' : status === 'sending' ? 'Sending' : 'Send message'}
            onClick={() => {
              if (isStreaming) {
                stopGeneration()
                return
              }
              void submit()
            }}
          >
            {isStreaming ? (
              <span className="chat-composer-stop-icon" aria-hidden="true" />
            ) : status === 'sending' ? (
              <span className="chat-composer-send-spinner" aria-hidden="true" />
            ) : (
              <SendIcon />
            )}
          </button>
        </div>
      </div>
    </form>
  )
}
