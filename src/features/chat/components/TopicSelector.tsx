import { useEffect, useId, useRef, useState } from 'react'
import { TOPICS } from '@/features/chat/constants/topics'
import type { Topic } from '@/shared/types/chat'

type TopicSelectorProps = {
  value: Topic
  onChange: (topic: Topic) => void
  disabled?: boolean
  variant?: 'field' | 'toolbar'
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`topic-dropdown-chevron${open ? ' topic-dropdown-chevron-open' : ''}`}
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

export function TopicSelector({
  value,
  onChange,
  disabled,
  variant = 'field',
}: TopicSelectorProps) {
  const uid = useId()
  const triggerId = `topic-trigger-${uid.replace(/:/g, '')}`
  const listboxId = `topic-list-${uid.replace(/:/g, '')}`

  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  const activeLabel = TOPICS.find((t) => t.value === value)?.label ?? value

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open])

  function pick(topic: Topic) {
    onChange(topic)
    setOpen(false)
  }

  const dropdown = (
    <div
      ref={wrapRef}
      className={`topic-dropdown topic-dropdown--${variant}${open ? ' topic-dropdown--open' : ''}`}
    >
      <button
        type="button"
        id={triggerId}
        className="topic-dropdown-trigger"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-label={variant === 'toolbar' ? `Study topic: ${activeLabel}` : undefined}
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev)
        }}
      >
        <span className="topic-dropdown-trigger-label">{activeLabel}</span>
        <ChevronIcon open={open} />
      </button>

      {open ? (
        <div className="topic-dropdown-panel">
          <ul
            id={listboxId}
            className="topic-dropdown-list"
            role="listbox"
            aria-label="Study topics"
          >
            {TOPICS.map((topic) => {
              const selected = topic.value === value
              return (
                <li
                  key={topic.value}
                  role="option"
                  aria-selected={selected}
                  className={`topic-dropdown-option${selected ? ' topic-dropdown-option-selected' : ''}`}
                  onClick={() => pick(topic.value)}
                >
                  {topic.label}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )

  if (variant === 'field') {
    return (
      <div className="chat-field">
        <label className="chat-field-label" htmlFor={triggerId}>
          Topic
        </label>
        {dropdown}
      </div>
    )
  }

  return dropdown
}
