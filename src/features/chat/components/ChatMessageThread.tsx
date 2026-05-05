import { useEffect, useRef, useState } from 'react'
import {
  MCQ_MESSAGE_PREFIX,
  UPLOAD_PACK_PREFIX,
  WELCOME_UPLOAD_HINT_PREFIX,
  type DrillMcq,
  type UploadStudyPack,
} from '@/features/chat/services/chat-api'
import { UploadIntentPanel } from '@/features/chat/components/UploadIntentPanel'
import { useChatStore } from '@/features/chat/store/chat-store'

function RegenerateIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 11a8 8 0 1 0-2.3 5.7M20 11V5m0 6h-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20h4l10.6-10.6a1.8 1.8 0 0 0 0-2.6l-1.4-1.4a1.8 1.8 0 0 0-2.6 0L4 16v4z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MessageHead({ role }: { role: 'user' | 'assistant' }) {
  const avatar = role === 'user' ? '💬' : '🩺'
  const label = role === 'user' ? 'You' : 'NurseAI'
  return (
    <div className="gpt-msg-head">
      <span className="gpt-msg-avatar" aria-hidden="true">
        {avatar}
      </span>
      <p className="gpt-msg-role">{label}</p>
    </div>
  )
}

export function ChatMessageThread() {
  const sessions = useChatStore((state) => state.sessions)
  const activeSessionId = useChatStore((state) => state.activeSessionId)
  const isStreaming = useChatStore((state) => state.isStreaming)
  const status = useChatStore((state) => state.status)
  const streamingMessageId = useChatStore((state) => state.streamingMessageId)
  const regenerateLastReply = useChatStore((state) => state.regenerateLastReply)
  const requestNextDrillQuestion = useChatStore((state) => state.requestNextDrillQuestion)
  const submitDrillAnswer = useChatStore((state) => state.submitDrillAnswer)
  const saveUploadPack = useChatStore((state) => state.saveUploadPack)
  const editLatestUserMessage = useChatStore((state) => state.editLatestUserMessage)
  const savedUploadPackMessageIdsBySession = useChatStore(
    (state) => state.savedUploadPackMessageIdsBySession,
  )
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const [selectedByMessage, setSelectedByMessage] = useState<Record<string, number | undefined>>({})
  const [submittedByMessage, setSubmittedByMessage] = useState<Record<string, boolean | undefined>>({})
  const [uploadSelectedByQuestion, setUploadSelectedByQuestion] = useState<Record<string, number | undefined>>({})
  const [uploadSubmittedByQuestion, setUploadSubmittedByQuestion] = useState<Record<string, boolean | undefined>>({})
  const [typedStream, setTypedStream] = useState<{ messageId: string | null; text: string }>({
    messageId: null,
    text: '',
  })
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState('')

  const activeSession = sessions.find((session) => session.id === activeSessionId)
  const latestAssistantId = [...(activeSession?.messages ?? [])]
    .reverse()
    .find((message) => message.role === 'assistant')?.id
  const latestUserId = [...(activeSession?.messages ?? [])]
    .reverse()
    .find((message) => message.role === 'user')?.id

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeSession?.messages.length, activeSessionId])

  const liveStreamingMessage = streamingMessageId
    ? activeSession?.messages.find((message) => message.id === streamingMessageId)
    : null
  const liveStreamingTarget = liveStreamingMessage?.content ?? ''

  useEffect(() => {
    if (!isStreaming || !streamingMessageId) return

    const timer = window.setTimeout(() => {
      setTypedStream((prev) => {
        if (prev.messageId !== streamingMessageId) {
          return {
            messageId: streamingMessageId,
            text: '',
          }
        }
        const nextLength = Math.min(liveStreamingTarget.length, prev.text.length + 1)
        if (nextLength <= prev.text.length) return prev
        return {
          messageId: prev.messageId,
          text: liveStreamingTarget.slice(0, nextLength),
        }
      })
    }, 10)

    return () => window.clearTimeout(timer)
  }, [isStreaming, streamingMessageId, liveStreamingTarget, typedStream])

  if (!activeSession) {
    return null
  }

  function parseMcq(content: string): DrillMcq | null {
    if (!content.startsWith(MCQ_MESSAGE_PREFIX)) return null
    try {
      const parsed = JSON.parse(content.slice(MCQ_MESSAGE_PREFIX.length)) as DrillMcq
      if (!parsed.question || !Array.isArray(parsed.options) || !Array.isArray(parsed.rationales)) return null
      return parsed
    } catch {
      return null
    }
  }

  function parseUploadPack(content: string): UploadStudyPack | null {
    if (!content.startsWith(UPLOAD_PACK_PREFIX)) return null
    try {
      const parsed = JSON.parse(content.slice(UPLOAD_PACK_PREFIX.length)) as UploadStudyPack
      if (!Array.isArray(parsed.summary) || !Array.isArray(parsed.quiz)) return null
      if (parsed.summary.length === 0 && parsed.quiz.length === 0) return null
      return parsed
    } catch {
      return null
    }
  }

  return (
    <div className="gpt-thread">
      <div className="gpt-thread-inner">
        <div className="gpt-messages">
          {activeSession.messages.map((message, messageIndex) => (
            message.role === 'assistant' && message.content.startsWith(WELCOME_UPLOAD_HINT_PREFIX) ? null : (
            <article
              key={message.id}
              className={`gpt-msg gpt-msg-${message.role}`}
              aria-label={`${message.role} message`}
            >
              {(() => {
                if (
                  message.role === 'user' &&
                  editingMessageId === message.id &&
                  message.id === latestUserId
                ) {
                  return (
                    <>
                      <MessageHead role="user" />
                      <div className="gpt-edit-wrap">
                        <textarea
                          className="gpt-edit-input"
                          rows={3}
                          value={editingDraft}
                          onChange={(event) => setEditingDraft(event.target.value)}
                          disabled={isStreaming || status === 'sending'}
                        />
                        <div className="gpt-edit-actions">
                          <button
                            type="button"
                            className="gpt-edit-btn gpt-edit-btn-cancel"
                            onClick={() => {
                              setEditingMessageId(null)
                              setEditingDraft('')
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="gpt-edit-btn gpt-edit-btn-save"
                            disabled={!editingDraft.trim() || isStreaming || status === 'sending'}
                            onClick={() => {
                              const next = editingDraft.trim()
                              if (!next) return
                              setEditingMessageId(null)
                              setEditingDraft('')
                              void editLatestUserMessage(next)
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    </>
                  )
                }

                const pack = message.role === 'assistant' ? parseUploadPack(message.content) : null
                if (pack) {
                  const isSaved = (savedUploadPackMessageIdsBySession[activeSession.id] ?? []).includes(
                    message.id,
                  )
                  const priorUploadMessage = [...activeSession.messages]
                    .slice(0, messageIndex)
                    .reverse()
                    .find(
                      (msg) => msg.role === 'user' && msg.content.toLowerCase().startsWith('uploaded file:'),
                    )
                  const sourceName = priorUploadMessage
                    ? priorUploadMessage.content.replace(/^uploaded file:\s*/i, '').trim()
                    : 'Uploaded notes'
                  const totalQuestions = pack.quiz.length
                  const answeredCount = pack.quiz.filter(
                    (_q, qIndex) => uploadSubmittedByQuestion[`${message.id}:${qIndex}`],
                  ).length
                  const correctCount = pack.quiz.filter((_q, qIndex) => {
                    const key = `${message.id}:${qIndex}`
                    if (!uploadSubmittedByQuestion[key]) return false
                    return uploadSelectedByQuestion[key] === pack.quiz[qIndex]?.correctIndex
                  }).length

                  return (
                    <>
                      <MessageHead role="assistant" />
                      <div className="upload-pack-card">
                        {pack.summary.length > 0 ? (
                          <>
                            <p className="upload-pack-title">📚 Study summary</p>
                            <ul className="upload-pack-summary">
                              {pack.summary.map((item, index) => (
                                <li key={`${message.id}-sum-${index}`}>{item}</li>
                              ))}
                            </ul>
                          </>
                        ) : null}
                        {pack.quiz.length > 0 ? (
                          <p className="upload-pack-title upload-pack-title-quiz">
                            📝 Practice quiz ({pack.quiz.length} questions)
                          </p>
                        ) : null}
                        <div className="upload-pack-actions">
                          <button
                            type="button"
                            className="upload-pack-save-btn"
                            disabled={isSaved}
                            onClick={() => void saveUploadPack(message.id, sourceName, JSON.stringify(pack))}
                          >
                            {isSaved ? 'Saved to dashboard' : 'Save pack'}
                          </button>
                        </div>
                        {pack.quiz.length > 0 ? (
                          <p className="upload-pack-score">
                            Score: {correctCount}/{answeredCount} answered ({totalQuestions} total)
                          </p>
                        ) : null}
                        <ol className="upload-pack-quiz">
                          {pack.quiz.map((q, qIndex) => (
                            <li key={`${message.id}-q-${qIndex}`} className="upload-pack-quiz-item">
                              <p className="upload-pack-question">{q.question}</p>
                              {(() => {
                                const key = `${message.id}:${qIndex}`
                                const submitted = Boolean(uploadSubmittedByQuestion[key])
                                const selected = uploadSelectedByQuestion[key]
                                return (
                                  <>
                                    <div className="upload-pack-options">
                                      {q.options.map((option, oIndex) => {
                                        const isSelected = selected === oIndex
                                        const isCorrect = oIndex === q.correctIndex
                                        let className = 'upload-pack-option-btn'
                                        if (isSelected) className += ' upload-pack-option-btn-selected'
                                        if (submitted && isCorrect) className += ' upload-pack-option-btn-correct'
                                        if (submitted && isSelected && !isCorrect) {
                                          className += ' upload-pack-option-btn-wrong'
                                        }
                                        return (
                                          <button
                                            key={`${message.id}-q-${qIndex}-o-${oIndex}`}
                                            type="button"
                                            className={className}
                                            disabled={submitted}
                                            onClick={() =>
                                              setUploadSelectedByQuestion((prev) => ({ ...prev, [key]: oIndex }))
                                            }
                                          >
                                            <strong>{String.fromCharCode(65 + oIndex)}.</strong> {option}
                                          </button>
                                        )
                                      })}
                                    </div>
                                    {!submitted ? (
                                      <button
                                        type="button"
                                        className="upload-pack-check-btn"
                                        disabled={selected === undefined}
                                        onClick={() =>
                                          setUploadSubmittedByQuestion((prev) => ({ ...prev, [key]: true }))
                                        }
                                      >
                                        Check answer
                                      </button>
                                    ) : (
                                      <p className="upload-pack-answer">
                                        Answer: {String.fromCharCode(65 + q.correctIndex)} - {q.rationale}
                                      </p>
                                    )}
                                  </>
                                )
                              })()}
                            </li>
                          ))}
                        </ol>
                      </div>
                    </>
                  )
                }

                const mcq = message.role === 'assistant' ? parseMcq(message.content) : null
                if (!mcq) {
                  const renderedText =
                    message.role === 'assistant' &&
                    isStreaming &&
                    streamingMessageId === message.id &&
                    typedStream.messageId === message.id
                      ? typedStream.text
                      : message.content

                  return (
                    <>
                      <MessageHead role={message.role} />
                      <p className="gpt-msg-body">
                        {renderedText}
                        {message.role === 'assistant' && isStreaming && streamingMessageId === message.id ? (
                          <span className="chat-typing-cursor" aria-hidden="true" />
                        ) : null}
                      </p>
                    </>
                  )
                }

                return (
                  <>
                    <MessageHead role="assistant" />
                    <div className="mcq-card">
                      <p className="mcq-title">
                        <span className="mcq-title-emoji" aria-hidden="true">
                          🎯{' '}
                        </span>
                        {mcq.question}
                      </p>
                      <div className="mcq-options">
                        {mcq.options.map((option, index) => {
                          const selected = selectedByMessage[message.id] === index
                          const submitted = Boolean(submittedByMessage[message.id])
                          const isCorrect = index === mcq.correctIndex
                          let className = 'mcq-option-btn'
                          if (selected) className += ' mcq-option-btn-selected'
                          if (submitted && isCorrect) className += ' mcq-option-btn-correct'
                          if (submitted && selected && !isCorrect) className += ' mcq-option-btn-wrong'
                          return (
                            <button
                              key={`${message.id}-opt-${index}`}
                              type="button"
                              className={className}
                              disabled={submitted}
                              onClick={() =>
                                setSelectedByMessage((prev) => ({
                                  ...prev,
                                  [message.id]: index,
                                }))
                              }
                            >
                              <span className="mcq-option-letter">{String.fromCharCode(65 + index)}.</span> {option}
                            </button>
                          )
                        })}
                      </div>

                      {!submittedByMessage[message.id] ? (
                        <button
                          type="button"
                          className="mcq-submit-btn"
                          disabled={selectedByMessage[message.id] === undefined}
                          onClick={() => {
                            const selected = selectedByMessage[message.id]
                            if (selected === undefined) return
                            setSubmittedByMessage((prev) => ({
                              ...prev,
                              [message.id]: true,
                            }))
                            submitDrillAnswer(activeSession.id, message.id, selected === mcq.correctIndex)
                          }}
                        >
                          Check answer
                        </button>
                      ) : (
                        <>
                          <div className="mcq-answer">
                            Correct: {String.fromCharCode(65 + mcq.correctIndex)}
                          </div>
                          <ul className="mcq-rationales">
                            {mcq.rationales.map((item, index) => (
                              <li key={`${message.id}-rat-${index}`}>
                                <strong>{String.fromCharCode(65 + index)}:</strong> {item}
                              </li>
                            ))}
                          </ul>
                          <button
                            type="button"
                            className="mcq-next-btn"
                            disabled={status === 'sending' || isStreaming}
                            onClick={() => void requestNextDrillQuestion()}
                          >
                            Next question
                          </button>
                        </>
                      )}
                    </div>
                  </>
                )
              })()}
              {message.role === 'assistant' &&
              latestAssistantId === message.id &&
              !message.content.startsWith(WELCOME_UPLOAD_HINT_PREFIX) ? (
                <div className="gpt-msg-actions gpt-msg-actions-outside-left">
                  <button
                    type="button"
                    className="gpt-msg-action-icon"
                    onClick={() => void regenerateLastReply()}
                    disabled={isStreaming}
                    aria-label="Regenerate response"
                    title="Regenerate response"
                  >
                    <RegenerateIcon />
                  </button>
                </div>
              ) : null}
              {message.role === 'user' && latestUserId === message.id && editingMessageId !== message.id ? (
                <div className="gpt-msg-actions gpt-msg-actions-outside-right">
                  <button
                    type="button"
                    className="gpt-msg-action-icon"
                    disabled={isStreaming || status === 'sending'}
                    aria-label="Edit message"
                    title="Edit message"
                    onClick={() => {
                      setEditingMessageId(message.id)
                      setEditingDraft(message.content)
                    }}
                  >
                    <EditIcon />
                  </button>
                </div>
              ) : null}
            </article>
            )
          ))}
          <UploadIntentPanel />
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  )
}
