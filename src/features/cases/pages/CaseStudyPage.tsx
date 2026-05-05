import { useState } from 'react'
import { generateCaseScenario, type CaseScenario } from '@/features/shared/services/clinical-api'

export function CaseStudyPage() {
  const [condition, setCondition] = useState('COPD exacerbation')
  const [complexity, setComplexity] = useState<'basic' | 'intermediate' | 'advanced'>('intermediate')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scenario, setScenario] = useState<CaseScenario | null>(null)

  async function generate() {
    setLoading(true)
    setError(null)
    try {
      const result = await generateCaseScenario({ condition, complexity })
      setScenario(result)
    } catch (caseError) {
      setError(caseError instanceof Error ? caseError.message : 'Failed to generate case scenario')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-root app-feature-page">
      <header className="page-header app-feature-hero">
        <p className="page-eyebrow">Clinical reasoning</p>
        <h1 className="page-title">Case study</h1>
        <p className="page-lead">
          Generate NCLEX-style patient scenarios with vitals, chart data, and debrief prompts. This is for education only,
          not live patient care.
        </p>
      </header>

      <div className="app-tool-panel">
        <h2 className="page-section-title">Scenario builder</h2>
        <div className="app-tool-grid">
          <div className="ui-field">
            <span className="ui-field-label">Condition / focus</span>
            <input
              type="text"
              className="ui-input ui-input-full"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
              placeholder="e.g. DKA, sepsis, stroke"
            />
          </div>
          <div className="ui-field ui-field-inline">
            <span className="ui-field-label">Complexity</span>
            <select
              className="ui-select"
              value={complexity}
              onChange={(e) => setComplexity(e.target.value as 'basic' | 'intermediate' | 'advanced')}
            >
              <option value="basic">🌱 Basic</option>
              <option value="intermediate">⚡ Intermediate</option>
              <option value="advanced">🔥 Advanced</option>
            </select>
          </div>
        </div>
        <button type="button" className="primary-button" onClick={() => void generate()} disabled={loading}>
          {loading ? 'Generating…' : 'Generate scenario'}
        </button>
      </div>
      {error ? <p className="error-text">{error}</p> : null}

      {!scenario ? null : (
        <div className="case-split">
          <section className="ui-card case-chart" aria-label="Patient chart">
            <h2 className="case-chart-title">{scenario.title}</h2>
            <h3 className="case-subheading">Chart summary</h3>
            <ul className="ui-dot-list">
              {scenario.chartSummary.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>

            <h3 className="case-subheading">Vitals</h3>
            <dl className="case-vitals">
              <div>
                <dt>BP</dt>
                <dd>{scenario.vitals.bp}</dd>
              </div>
              <div>
                <dt>HR</dt>
                <dd>{scenario.vitals.hr}</dd>
              </div>
              <div>
                <dt>RR</dt>
                <dd>{scenario.vitals.rr}</dd>
              </div>
              <div>
                <dt>Temp</dt>
                <dd>{scenario.vitals.temp}</dd>
              </div>
              <div>
                <dt>SpO₂</dt>
                <dd>{scenario.vitals.spo2}</dd>
              </div>
              <div>
                <dt>Pain</dt>
                <dd>{scenario.vitals.pain}</dd>
              </div>
            </dl>
          </section>

          <section className="case-tutor" aria-label="Case tutor prompt">
            <div className="gpt-messages case-thread">
              <article className="gpt-msg gpt-msg-assistant">
                <div className="gpt-msg-head">
                  <span className="gpt-msg-avatar" aria-hidden="true">
                    🩺
                  </span>
                  <p className="gpt-msg-role">NurseAI</p>
                </div>
                <p className="gpt-msg-body">{scenario.assistantPrompt}</p>
              </article>
            </div>
            <h3 className="case-subheading">Debrief points</h3>
            <ul className="ui-dot-list">
              {scenario.debriefPoints.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            {scenario.safetyNotice ? (
              <>
                <h3 className="case-subheading">Safety note</h3>
                <p className="page-lead">{scenario.safetyNotice}</p>
              </>
            ) : null}
            {scenario.sourceCitations?.length ? (
              <>
                <h3 className="case-subheading">Sources</h3>
                <ul className="ui-dot-list">
                  {scenario.sourceCitations.map((citation) => (
                    <li key={citation}>{citation}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        </div>
      )}
    </div>
  )
}
