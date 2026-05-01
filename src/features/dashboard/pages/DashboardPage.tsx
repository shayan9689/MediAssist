import { Link } from 'react-router-dom'
import {
  dashboardStats,
  quickStartTopics,
  recentActivity,
} from '@/shared/mock/dashboard'

export function DashboardPage() {
  return (
    <div className="page-root">
      <header className="page-header">
        <p className="page-eyebrow">Study hub</p>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-lead">
          Mock overview — swap these tiles for live analytics once the backend is connected.
        </p>
      </header>

      <section className="page-section">
        <div className="stat-grid">
          {dashboardStats.map((stat) => (
            <article key={stat.label} className="ui-card ui-card-stat">
              <p className="ui-card-label">{stat.label}</p>
              <p className="ui-card-value">{stat.value}</p>
              {stat.hint ? <p className="ui-card-hint">{stat.hint}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Quick start</h2>
        <div className="topic-card-grid">
          {quickStartTopics.map((topic) => (
            <article key={topic.id} className="ui-card ui-card-topic">
              <h3 className="ui-card-topic-title">{topic.label}</h3>
              <p className="ui-card-topic-blurb">{topic.blurb}</p>
              <Link to="/chat" className="ui-card-action">
                Open chat
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="page-section">
        <div className="page-section-head">
          <h2 className="page-section-title">Recent activity</h2>
          <Link to="/chat" className="page-inline-link">
            Go to chat
          </Link>
        </div>
        <ul className="activity-list">
          {recentActivity.map((item) => (
            <li key={item.id} className="activity-row">
              <span className={`activity-badge activity-badge-${item.kind}`}>{item.kind}</span>
              <div className="activity-body">
                <p className="activity-title">{item.title}</p>
                <p className="activity-meta">{item.meta}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="page-section page-section-row">
        <Link to="/quiz" className="ui-pill-link">
          Practice quizzes
        </Link>
        <Link to="/drugs" className="ui-pill-link ui-pill-link-muted">
          Drug cards
        </Link>
        <Link to="/case" className="ui-pill-link ui-pill-link-muted">
          Case study
        </Link>
      </section>
    </div>
  )
}
