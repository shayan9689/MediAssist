import { useChatStore } from '@/features/chat/store/chat-store'

const SUGGESTIONS = [
  { label: 'Explain fluid & electrolytes', prompt: 'Explain fluid and electrolyte balance for NCLEX with clinical cues.' },
  { label: 'Pharm question drill', prompt: 'Give me one NCLEX-style pharmacology question with rationales.' },
  { label: 'Prioritization case', prompt: 'Walk me through an NCLEX prioritization scenario step by step.' },
] as const

export function ChatSuggestionChips() {
  const sendUserMessage = useChatStore((state) => state.sendUserMessage)
  const createSession = useChatStore((state) => state.createSession)
  const status = useChatStore((state) => state.status)

  const busy = status === 'loading' || status === 'sending'

  async function runPreset(prompt: string) {
    if (busy) return
    let sid = useChatStore.getState().activeSessionId
    if (!sid) {
      await createSession()
      sid = useChatStore.getState().activeSessionId
    }
    if (!sid) return
    await sendUserMessage(prompt)
  }

  return (
    <div className="chat-suggestions" aria-label="Suggested prompts">
      {SUGGESTIONS.map((item) => (
        <button
          key={item.label}
          type="button"
          className="chat-suggestion-chip"
          disabled={busy}
          onClick={() => void runPreset(item.prompt)}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
