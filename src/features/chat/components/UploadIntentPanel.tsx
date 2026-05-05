import { useState } from 'react'
import { useChatStore } from '@/features/chat/store/chat-store'
import type { UploadPackIntent } from '@/features/chat/services/chat-api'

export function UploadIntentPanel() {
  const uploadPipeline = useChatStore((state) => state.uploadPipeline)
  const activeSessionId = useChatStore((state) => state.activeSessionId)
  const status = useChatStore((state) => state.status)
  const completeUploadWithIntent = useChatStore((state) => state.completeUploadWithIntent)
  const clearUploadPipeline = useChatStore((state) => state.clearUploadPipeline)

  const [focusNotes, setFocusNotes] = useState('')
  const [showFocus, setShowFocus] = useState(false)

  if (!uploadPipeline || uploadPipeline.sessionId !== activeSessionId) {
    return null
  }

  const busy = status === 'sending'

  function run(intent: UploadPackIntent) {
    void completeUploadWithIntent(intent, intent === 'custom_focus' ? focusNotes : undefined)
    if (intent !== 'custom_focus') {
      setFocusNotes('')
      setShowFocus(false)
    }
  }

  return (
    <div className="upload-intent-panel" role="region" aria-label="Choose what to generate from your upload">
      <p className="upload-intent-title">
        <span aria-hidden="true">📎 </span>Document ready: {uploadPipeline.sourceName}
      </p>
      <p className="upload-intent-lead">
        <span aria-hidden="true">✨ </span>What should we create from this file?
      </p>
      <div className="upload-intent-actions">
        <button type="button" className="upload-intent-btn" disabled={busy} onClick={() => run('summary_only')}>
          📄 Summary only
        </button>
        <button type="button" className="upload-intent-btn" disabled={busy} onClick={() => run('quiz_only')}>
          📝 Quiz only
        </button>
        <button
          type="button"
          className="upload-intent-btn upload-intent-btn-primary"
          disabled={busy}
          onClick={() => run('summary_quiz')}
        >
          🎯 Summary + quiz
        </button>
      </div>
      {!showFocus ? (
        <button type="button" className="upload-intent-link" disabled={busy} onClick={() => setShowFocus(true)}>
          🎓 Specific topics or points…
        </button>
      ) : (
        <div className="upload-intent-focus">
          <label className="upload-intent-focus-label" htmlFor="upload-focus-notes">
            What should we prioritize? (summary + quiz will follow your notes)
          </label>
          <textarea
            id="upload-focus-notes"
            className="upload-intent-textarea"
            rows={3}
            value={focusNotes}
            disabled={busy}
            onChange={(e) => setFocusNotes(e.target.value)}
            placeholder="e.g. drug interactions, nursing interventions, lab values to watch…"
          />
          <div className="upload-intent-focus-row">
            <button
              type="button"
              className="upload-intent-btn upload-intent-btn-primary"
              disabled={busy || !focusNotes.trim()}
              onClick={() => run('custom_focus')}
            >
              Generate with this focus
            </button>
            <button type="button" className="upload-intent-btn-muted" disabled={busy} onClick={() => setShowFocus(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
      <button type="button" className="upload-intent-dismiss" disabled={busy} onClick={() => clearUploadPipeline()}>
        Dismiss (choose later)
      </button>
    </div>
  )
}
