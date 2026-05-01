import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { mockCaseStudies } from '@/shared/mock/cases'

export function CaseStudyPage() {
  const [caseId, setCaseId] = useState(mockCaseStudies[0]?.id ?? '')

  const study = useMemo(() => mockCaseStudies.find((c) => c.id === caseId), [caseId])

  if (!study) {
    return (
      <div className="page-root">
        <p className="page-empty">No mock cases loaded.</p>
      </div>
    )
  }

  return (
    <div className="page-root">
      <header className="page-header">
        <p className="page-eyebrow">Clinical reasoning</p>
        <h1 className="page-title">Case study</h1>
        <p className="page-lead">
          Mock chart on the left and a scripted tutor thread on the right — replace with live chat when wired.
        </p>
      </header>

      <label className="ui-field ui-field-inline">
        <span className="ui-field-label">Scenario</span>
        <select
          className="ui-select"
          value={caseId}
          onChange={(e) => setCaseId(e.target.value)}
          aria-label="Select case study"
        >
          {mockCaseStudies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </label>

      <div className="case-split">
        <section className="ui-card case-chart" aria-label="Mock patient chart">
          <h2 className="case-chart-title">{study.title}</h2>
          <p className="case-cc">{study.chiefComplaint}</p>

          <h3 className="case-subheading">Vitals</h3>
          <dl className="case-vitals">
            <div>
              <dt>BP</dt>
              <dd>{study.vitals.bp}</dd>
            </div>
            <div>
              <dt>HR</dt>
              <dd>{study.vitals.hr}</dd>
            </div>
            <div>
              <dt>RR</dt>
              <dd>{study.vitals.rr}</dd>
            </div>
            <div>
              <dt>Temp</dt>
              <dd>{study.vitals.temp}</dd>
            </div>
            <div>
              <dt>SpO₂</dt>
              <dd>{study.vitals.spo2}</dd>
            </div>
            <div>
              <dt>Pain</dt>
              <dd>{study.vitals.pain}</dd>
            </div>
          </dl>

          <h3 className="case-subheading">Assessment notes</h3>
          <ul className="ui-dot-list">
            {study.history.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>

          <h3 className="case-subheading">Orders (mock)</h3>
          <ul className="ui-dot-list">
            {study.ordersMock.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>

          <h3 className="case-subheading">Labs (mock)</h3>
          <ul className="ui-dot-list">
            {study.labsMock.map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
        </section>

        <section className="case-tutor" aria-label="Mock tutor conversation">
          <div className="gpt-messages case-thread">
            <article className="gpt-msg gpt-msg-assistant">
              <p className="gpt-msg-role">Assistant</p>
              <p className="gpt-msg-body">{study.assistantSeed}</p>
            </article>
            <article className="gpt-msg gpt-msg-assistant">
              <p className="gpt-msg-role">Assistant</p>
              <p className="gpt-msg-body">
                What are your first three nursing priorities, and which assessments will you perform before calling the
                provider?
              </p>
            </article>
            <article className="gpt-msg gpt-msg-user">
              <p className="gpt-msg-role">You</p>
              <p className="gpt-msg-body case-mock-user">
                (Student answer — connect chat backend here to capture real responses.)
              </p>
            </article>
            <article className="gpt-msg gpt-msg-assistant">
              <p className="gpt-msg-role">Assistant</p>
              <p className="gpt-msg-body">
                Strong start: stabilize airway/breathing/circulation trends, verify glucose/ketones per protocol, and
                monitor electrolytes closely during insulin therapy — always follow facility policies.
              </p>
            </article>
          </div>
          <div className="case-composer-hint">
            <span>Open </span>
            <Link to="/chat" className="page-inline-link">
              Chat
            </Link>
            <span> for an interactive session using this scenario.</span>
          </div>
        </section>
      </div>
    </div>
  )
}
