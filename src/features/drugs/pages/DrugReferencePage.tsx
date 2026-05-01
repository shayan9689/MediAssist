import { useMemo, useState } from 'react'
import { mockDrugs } from '@/shared/mock/drugs'

export function DrugReferencePage() {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return mockDrugs
    return mockDrugs.filter(
      (d) =>
        d.genericName.toLowerCase().includes(q) ||
        d.commonUses.some((u) => u.toLowerCase().includes(q)) ||
        d.keyPoints.some((k) => k.toLowerCase().includes(q)),
    )
  }, [query])

  return (
    <div className="page-root">
      <header className="page-header">
        <p className="page-eyebrow">Reference</p>
        <h1 className="page-title">Drug cards</h1>
        <p className="page-lead">
          Mock formulary for NCLEX-style teaching points. Search is client-side only until the backend ships.
        </p>
      </header>

      <label className="ui-field">
        <span className="ui-field-label">Search</span>
        <input
          type="search"
          className="ui-input"
          placeholder="e.g. metoprolol, diuretic, insulin…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
      </label>

      <div className="drug-grid">
        {filtered.map((drug) => (
          <article key={drug.id} className="ui-card ui-card-drug">
            <h2 className="ui-card-drug-name">{drug.genericName}</h2>
            <section className="ui-card-drug-block">
              <h3 className="ui-card-drug-heading">Uses</h3>
              <ul className="ui-dot-list">
                {drug.commonUses.map((u) => (
                  <li key={u}>{u}</li>
                ))}
              </ul>
            </section>
            <section className="ui-card-drug-block">
              <h3 className="ui-card-drug-heading">Key points</h3>
              <ul className="ui-dot-list">
                {drug.keyPoints.map((k) => (
                  <li key={k}>{k}</li>
                ))}
              </ul>
            </section>
            <section className="ui-card-drug-block">
              <h3 className="ui-card-drug-heading">Cautions</h3>
              <ul className="ui-dot-list">
                {drug.cautions.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </section>
            <p className="ui-card-nclex">{drug.nclexAngle}</p>
          </article>
        ))}
      </div>

      {filtered.length === 0 ? <p className="page-empty">No mock drugs match that search.</p> : null}
    </div>
  )
}
