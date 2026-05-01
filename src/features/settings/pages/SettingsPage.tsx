import { useState } from 'react'
import { mockProfile, mockUsage } from '@/shared/mock/settings'

export function SettingsPage() {
  const [emailTips, setEmailTips] = useState(false)
  const [quizDigest, setQuizDigest] = useState(true)

  return (
    <div className="page-root">
      <header className="page-header">
        <p className="page-eyebrow">Account</p>
        <h1 className="page-title">Settings</h1>
        <p className="page-lead">Mock profile and preferences — persistence arrives with Supabase.</p>
      </header>

      <section className="page-section">
        <h2 className="page-section-title">Profile</h2>
        <article className="ui-card ui-card-settings">
          <dl className="settings-dl">
            <div>
              <dt>Display name</dt>
              <dd>{mockProfile.displayName}</dd>
            </div>
            <div>
              <dt>Exam goal</dt>
              <dd>{mockProfile.goalExam}</dd>
            </div>
            <div>
              <dt>Target window</dt>
              <dd>{mockProfile.targetDate}</dd>
            </div>
          </dl>
          <p className="ui-card-hint">Edit controls will map to your user row once authentication is enabled.</p>
        </article>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Notifications (local only)</h2>
        <article className="ui-card ui-card-settings">
          <label className="settings-toggle">
            <input type="checkbox" checked={emailTips} onChange={(e) => setEmailTips(e.target.checked)} />
            <span>Study tip emails</span>
          </label>
          <label className="settings-toggle">
            <input type="checkbox" checked={quizDigest} onChange={(e) => setQuizDigest(e.target.checked)} />
            <span>Weekly quiz digest</span>
          </label>
        </article>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Usage (mock)</h2>
        <div className="usage-grid">
          {mockUsage.map((row) => {
            const pct = Math.min(100, Math.round((row.used / row.cap) * 100))
            return (
              <article key={row.label} className="ui-card ui-card-meter">
                <div className="ui-meter-head">
                  <span>{row.label}</span>
                  <span className="ui-meter-count">
                    {row.used} / {row.cap}
                  </span>
                </div>
                <div className="ui-meter-track" role="presentation">
                  <div className="ui-meter-fill" style={{ width: `${pct}%` }} />
                </div>
              </article>
            )
          })}
        </div>
      </section>
    </div>
  )
}
