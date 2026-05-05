import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/auth-context'
import { generateQuizSet } from '@/features/shared/services/clinical-api'
import { supabase } from '@/shared/lib/supabase/client'
import type { Topic } from '@/shared/types/chat'

type QuizSummary = {
  id: string
  title: string
  topic: string
  questionCount: number
  estimateMin: number
  createdAt?: string
}

const LOCAL_QUIZ_KEY = 'nurseai.generated.quizzes.v1'

const TOPIC_PRESETS = [
  'Cardiac disorders',
  'Pharmacology',
  'Fluid & electrolytes',
  'Infection control',
  'Maternal-newborn',
  'NCLEX fundamentals',
]

function normalizeTopicForStorage(input: string): Topic {
  const text = input.trim().toLowerCase()
  if (text.includes('pharm') || text.includes('drug') || text.includes('medication')) return 'pharm'
  if (text.includes('anatomy') || text.includes('physio')) return 'anatomy'
  if (text.includes('nutrition') || text.includes('diet')) return 'nutrition'
  if (text.includes('psych') || text.includes('mental')) return 'psych'
  return 'medsurg'
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 3h6m-7 4h8m-9 4v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V11M10 11v6m4-6v6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function QuizHubPage() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [topic, setTopic] = useState('NCLEX fundamentals')
  const [difficulty, setDifficulty] = useState<'novice' | 'intermediate' | 'expert'>('intermediate')
  const [count, setCount] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quizzes, setQuizzes] = useState<QuizSummary[]>([])
  const [pendingDeleteQuizId, setPendingDeleteQuizId] = useState<string | null>(null)

  useEffect(() => {
    async function loadQuizzes() {
      if (supabase && userId) {
        const { data, error: dbError } = await supabase
          .from('quiz_attempts')
          .select('id,topic,total,questions,created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(50)
        if (!dbError) {
          setQuizzes(
            (data ?? []).map((row) => ({
              id: row.id,
              title:
                Array.isArray(row.questions) && typeof row.questions[0]?.quizTitle === 'string'
                  ? row.questions[0].quizTitle
                  : `Quiz · ${row.topic}`,
              topic: row.topic,
              questionCount: row.total,
              estimateMin: Math.max(3, Math.round((row.total || 5) * 1.5)),
              createdAt: row.created_at,
            })),
          )
          return
        }
      }
      try {
        const raw = localStorage.getItem(LOCAL_QUIZ_KEY)
        const parsed = raw ? (JSON.parse(raw) as QuizSummary[]) : []
        setQuizzes(parsed)
      } catch {
        setQuizzes([])
      }
    }
    void loadQuizzes()
  }, [userId])

  async function handleGenerateQuiz() {
    setLoading(true)
    setError(null)
    try {
      const generated = await generateQuizSet({ topic, difficulty, count })
      const dbTopic = normalizeTopicForStorage(topic)
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const summary: QuizSummary = {
        id,
        title: generated.title || `${topic} quiz`,
        topic,
        questionCount: generated.questions.length,
        estimateMin: Math.max(3, Math.round(generated.questions.length * 1.5)),
        createdAt: now,
      }

      if (supabase && userId) {
        const { error: saveError } = await supabase.from('quiz_attempts').insert({
          id,
          user_id: userId,
          topic: dbTopic,
          score: 0,
          total: generated.questions.length,
          questions: generated.questions.map((question) => ({
            ...question,
            quizTitle: summary.title,
            quizTopicDisplay: topic,
            quizTopicKey: dbTopic,
          })),
          created_at: now,
        })
        if (saveError) throw saveError
      }

      setQuizzes((prev) => [summary, ...prev])
      try {
        const raw = localStorage.getItem(LOCAL_QUIZ_KEY)
        const parsed = raw ? (JSON.parse(raw) as QuizSummary[]) : []
        const next = [summary, ...parsed].slice(0, 100)
        localStorage.setItem(LOCAL_QUIZ_KEY, JSON.stringify(next))
        localStorage.setItem(`nurseai.quiz.${id}`, JSON.stringify(generated.questions))
      } catch {
        // ignore local fallback issues
      }
    } catch (generateError) {
      const details =
        generateError instanceof Error
          ? generateError.message
          : typeof generateError === 'object' && generateError && 'message' in generateError
            ? String((generateError as { message?: unknown }).message ?? '')
            : ''
      setError(details || 'Failed to generate quiz')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteQuiz(quizId: string) {
    setError(null)
    setPendingDeleteQuizId(null)

    try {
      if (supabase && userId) {
        const { error: deleteError } = await supabase
          .from('quiz_attempts')
          .delete()
          .eq('id', quizId)
          .eq('user_id', userId)

        if (deleteError) throw deleteError
      }

      setQuizzes((prev) => prev.filter((quiz) => quiz.id !== quizId))

      try {
        const raw = localStorage.getItem(LOCAL_QUIZ_KEY)
        const parsed = raw ? (JSON.parse(raw) as QuizSummary[]) : []
        localStorage.setItem(
          LOCAL_QUIZ_KEY,
          JSON.stringify(parsed.filter((quiz) => quiz.id !== quizId)),
        )
        localStorage.removeItem(`nurseai.quiz.${quizId}`)
      } catch {
        // ignore local cleanup issues
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete quiz')
    }
  }

  return (
    <div className="page-root app-feature-page">
      <header className="page-header app-feature-hero">
        <p className="page-eyebrow">NCLEX-style</p>
        <h1 className="page-title">Quiz practice</h1>
        <p className="page-lead">
          Generate practice sets from any topic, then work through questions with rationales. New sets appear below;
          your scores update the dashboard when you finish.
        </p>
      </header>

      <section className="page-section">
        <div className="app-tool-panel">
          <h2 className="page-section-title">Build a quiz</h2>
          <p className="ui-card-hint app-tool-lead">
            Pick a topic (or use a quick suggestion), difficulty, and length. Generation often takes about 10–30 seconds.
          </p>
          <div className="ui-field">
            <span className="ui-field-label">Topic</span>
            <input className="ui-input ui-input-full" value={topic} onChange={(e) => setTopic(e.target.value)} />
            <div className="app-topic-chips">
              {TOPIC_PRESETS.map((preset) => (
                <button key={preset} type="button" className="app-topic-chip" onClick={() => setTopic(preset)}>
                  {preset}
                </button>
              ))}
            </div>
          </div>
          <div className="app-tool-grid">
            <div className="ui-field ui-field-inline">
              <span className="ui-field-label">Difficulty</span>
              <select
                className="ui-select"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'novice' | 'intermediate' | 'expert')}
              >
                <option value="novice">🌱 Novice</option>
                <option value="intermediate">⚡ Intermediate</option>
                <option value="expert">🔥 Expert</option>
              </select>
            </div>
            <div className="ui-field ui-field-inline">
              <span className="ui-field-label">Questions</span>
              <select className="ui-select" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                <option value={5}>5</option>
                <option value={7}>7</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>
          <button type="button" className="primary-button" onClick={() => void handleGenerateQuiz()} disabled={loading}>
            {loading ? 'Generating…' : 'Generate quiz'}
          </button>
          {loading ? (
            <p className="ui-card-hint">
              Generating your quiz now. This can take around 10–30 seconds depending on API response time.
            </p>
          ) : null}
          {error ? <p className="error-text">{error}</p> : null}
        </div>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Your quizzes</h2>
        {quizzes.length === 0 ? (
          <p className="page-empty">No quizzes yet. Generate one above to get started.</p>
        ) : (
          <ul className="quiz-list">
            {quizzes.map((quiz) => (
              <li key={quiz.id}>
                <article className="ui-card ui-card-quiz">
                  <div className="ui-card-quiz-main">
                    <h2 className="ui-card-quiz-title">{quiz.title}</h2>
                    <p className="ui-card-quiz-topic">{quiz.topic}</p>
                    <p className="ui-card-quiz-meta">
                      {quiz.questionCount} questions · ~{quiz.estimateMin} min
                      {quiz.createdAt ? ` · ${new Date(quiz.createdAt).toLocaleDateString()}` : ''}
                    </p>
                  </div>
                  <div className="ui-card-quiz-actions">
                    <Link to={`/quiz/${quiz.id}`} className="primary-button ui-card-quiz-btn">
                      Start
                    </Link>
                    <button
                      type="button"
                      className="quiz-delete-btn"
                      aria-label={`Delete ${quiz.title}`}
                      title="Delete quiz"
                      onClick={() => setPendingDeleteQuizId(quiz.id)}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pendingDeleteQuizId ? (
        <div className="gpt-confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="delete-quiz-title">
          <div className="gpt-confirm-card">
            <h3 id="delete-quiz-title" className="gpt-confirm-title">
              Delete this quiz?
            </h3>
            <p className="gpt-confirm-copy">This action cannot be undone.</p>
            <div className="gpt-confirm-actions">
              <button
                type="button"
                className="gpt-confirm-btn gpt-confirm-btn-cancel"
                onClick={() => setPendingDeleteQuizId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="gpt-confirm-btn gpt-confirm-btn-danger"
                onClick={() => void handleDeleteQuiz(pendingDeleteQuizId)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
