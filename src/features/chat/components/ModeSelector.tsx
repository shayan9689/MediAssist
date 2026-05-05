import { CHAT_MODES } from '@/features/chat/constants/modes'
import type { ChatMode } from '@/shared/types/chat'

type ModeSelectorProps = {
  value: ChatMode | null
  onChange: (mode: ChatMode) => void
  disabled?: boolean
}

export function ModeSelector({ value, onChange, disabled = false }: ModeSelectorProps) {
  return (
    <div className="mode-selector" role="radiogroup" aria-label="Chat mode">
      {CHAT_MODES.map((mode) => {
        const active = mode.value === value
        return (
          <button
            key={mode.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={`mode-selector-btn${active ? ' mode-selector-btn-active' : ''}`}
            disabled={disabled}
            onClick={() => onChange(mode.value)}
          >
            {mode.label}
          </button>
        )
      })}
    </div>
  )
}
