import { useState } from 'react'
import { fetchDrugCard, type DrugCard } from '@/features/shared/services/clinical-api'

export function DrugReferencePage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [card, setCard] = useState<DrugCard | null>(null)

  async function handleSearch() {
    const name = query.trim()
    if (!name) return
    setLoading(true)
    setError(null)
    try {
      const next = await fetchDrugCard(name)
      setCard(next)
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : 'Failed to fetch drug card')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page-root app-feature-page">
      <header className="page-header app-feature-hero">
        <p className="page-eyebrow">Reference</p>
        <h1 className="page-title">Drug cards</h1>
        <p className="page-lead">
          Search any drug name to generate a structured pharmacology card with NCLEX-focused nursing guidance. Always verify
          with your facility formulary and orders.
        </p>
      </header>

      <div className="app-tool-panel">
        <h2 className="page-section-title">Lookup</h2>
        <p className="ui-card-hint app-tool-lead">Generic or brand names work. Press Enter to search.</p>
        <label className="ui-field">
          <span className="ui-field-label">Drug name</span>
          <input
            type="search"
            className="ui-input ui-input-full"
            placeholder="e.g. metoprolol, furosemide, insulin…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void handleSearch()
              }
            }}
            autoComplete="off"
          />
        </label>
        <button type="button" className="primary-button" onClick={() => void handleSearch()} disabled={loading}>
          {loading ? 'Searching…' : 'Generate drug card'}
        </button>
      </div>

      {error ? <p className="error-text">{error}</p> : null}

      {card ? (
        <div className="drug-grid">
          <article className="ui-card ui-card-drug">
            <h2 className="ui-card-drug-name">{card.drugName}</h2>
            <section className="ui-card-drug-block">
              <h3 className="ui-card-drug-heading">Class</h3>
              <p>{card.drugClass}</p>
            </section>
            <section className="ui-card-drug-block">
              <h3 className="ui-card-drug-heading">Mechanism</h3>
              <p>{card.mechanism}</p>
            </section>
            <section className="ui-card-drug-block">
              <h3 className="ui-card-drug-heading">Uses</h3>
              <ul className="ui-dot-list">
                {card.indications.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </section>
            <section className="ui-card-drug-block">
              <h3 className="ui-card-drug-heading">Contraindications</h3>
              <ul className="ui-dot-list">
                {card.contraindications.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            </section>
            <section className="ui-card-drug-block">
              <h3 className="ui-card-drug-heading">Side effects</h3>
              <ul className="ui-dot-list">
                {card.sideEffects.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </section>
            <section className="ui-card-drug-block">
              <h3 className="ui-card-drug-heading">Nursing notes</h3>
              <ul className="ui-dot-list">
                {card.nursingNotes.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </section>
            <p className="ui-card-nclex">{card.nclexPriority}</p>
          </article>
        </div>
      ) : null}
    </div>
  )
}
