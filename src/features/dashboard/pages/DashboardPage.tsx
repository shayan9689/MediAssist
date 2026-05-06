import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/auth-context'
import { supabase } from '@/shared/lib/supabase/client'

type SavedUploadPack = {
  id: string
  sourceName: string
  topic: string
  createdAt: string
  questionCount: number
}

type TopicPerformance = {
  topic: string
  avgPct: number
}

type QuizAttemptDashboardRow = {
  topic: string
  score: number
  total: number
  questions?: unknown
}

type DashboardActivity = {
  id: string
  kind: 'quiz' | 'pack' | 'chat'
  title: string
  meta: string
  at: string
  href?: string
}

const LOCAL_UPLOAD_PACKS_KEY = 'nurseai.upload.packs.v1'
const LOCAL_QUIZ_KEY = 'nurseai.generated.quizzes.v1'
const LOCAL_CHAT_KEY = 'nurseai.chat.v1'

function topicProgressColor(avgPct: number): string {
  if (avgPct >= 85) return 'dashboard-v2-progress-high'
  if (avgPct >= 70) return 'dashboard-v2-progress-mid'
  return 'dashboard-v2-progress-low'
}

function topicGlyph(topic: string): string {
  const t = topic.toLowerCase()
  if (t.includes('cardio') || t.includes('heart') || t.includes('ecg')) return '🫀'
  if (t.includes('neuro') || t.includes('brain')) return '🧠'
  if (t.includes('pharm') || t.includes('med') || t.includes('drug')) return '💊'
  if (t.includes('fluid') || t.includes('electrolyte') || t.includes('renal')) return '💧'
  if (t.includes('pulm') || t.includes('resp')) return '🫁'
  if (t.includes('endo') || t.includes('diabetes')) return '📊'
  if (t.includes('psych') || t.includes('mental')) return '🧘'
  return '📘'
}

function formatShortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export function DashboardPage() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [savedPacks, setSavedPacks] = useState<SavedUploadPack[]>([])
  const [chatCount, setChatCount] = useState(0)
  const [quizAttempts, setQuizAttempts] = useState(0)
  const [avgQuizScore, setAvgQuizScore] = useState(0)
  const [topicPerformance, setTopicPerformance] = useState<TopicPerformance[]>([])
  const [recentActivity, setRecentActivity] = useState<DashboardActivity[]>([])

  const displayName = user?.email?.split('@')[0] ?? 'Learner'
  const displayEmail = user?.email ?? ''

  useEffect(() => {
    async function loadSavedPacks() {
      if (supabase && userId) {
        const { data, error } = await supabase
          .from('upload_packs')
          .select('id,topic,created_at,source_name,quiz')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(20)

        if (!error) {
          const mapped = (data ?? []).map((row) => ({
            id: row.id,
            sourceName: row.source_name || 'Uploaded notes',
            topic: row.topic,
            createdAt: row.created_at,
            questionCount: Array.isArray(row.quiz) ? row.quiz.length : 0,
          }))
          setSavedPacks(mapped)
          return
        }
      }

      try {
        const raw = localStorage.getItem(LOCAL_UPLOAD_PACKS_KEY)
        const parsed = raw
          ? (JSON.parse(raw) as Array<{
              id: string
              sourceName: string
              topic: string
              createdAt: string
              pack?: { quiz?: unknown[] }
            }>)
          : []
        const mapped = parsed.slice(0, 20).map((row) => ({
          id: row.id,
          sourceName: row.sourceName,
          topic: row.topic,
          createdAt: row.createdAt,
          questionCount: Array.isArray(row.pack?.quiz) ? row.pack!.quiz!.length : 0,
        }))
        setSavedPacks(mapped)
      } catch {
        setSavedPacks([])
      }
    }

    void loadSavedPacks()
  }, [userId])

  useEffect(() => {
    async function loadStats() {
      if (supabase && userId) {
        const [{ count: chatSessions }, { data: attempts }] = await Promise.all([
          supabase
            .from('chat_sessions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId),
          supabase
            .from('quiz_attempts')
            .select('topic,score,total,questions')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(200),
        ])

        setChatCount(chatSessions ?? 0)
        const list = (attempts ?? []) as QuizAttemptDashboardRow[]
        setQuizAttempts(list.length)
        if (list.length > 0) {
          const avg =
            list.reduce((acc, item) => {
              const pct = item.total > 0 ? (item.score / item.total) * 100 : 0
              return acc + pct
            }, 0) / list.length
          setAvgQuizScore(Math.round(avg))
          const perTopic = new Map<string, { sum: number; count: number }>()
          for (const item of list) {
            const pct = item.total > 0 ? (item.score / item.total) * 100 : 0
            const firstQuestion =
              Array.isArray(item.questions) && item.questions.length > 0
                ? (item.questions[0] as { quizTopicDisplay?: unknown })
                : null
            const displayTopic =
              typeof firstQuestion?.quizTopicDisplay === 'string' &&
              firstQuestion.quizTopicDisplay.trim()
                ? firstQuestion.quizTopicDisplay.trim()
                : item.topic
            const prev = perTopic.get(displayTopic) ?? { sum: 0, count: 0 }
            perTopic.set(displayTopic, { sum: prev.sum + pct, count: prev.count + 1 })
          }
          const ranked = Array.from(perTopic.entries())
            .map(([topic, value]) => ({
              topic,
              avgPct: Math.round(value.sum / value.count),
            }))
            .sort((a, b) => a.avgPct - b.avgPct)
          setTopicPerformance(ranked)
        } else {
          setAvgQuizScore(0)
          setTopicPerformance([])
        }
        return
      }

      try {
        const localQuizzesRaw = localStorage.getItem(LOCAL_QUIZ_KEY)
        const localQuizzes = localQuizzesRaw
          ? (JSON.parse(localQuizzesRaw) as Array<{
              score?: number
              total?: number
              topic?: string
            }>)
          : []
        setQuizAttempts(localQuizzes.length)
        const completed = localQuizzes.filter(
          (item) =>
            typeof item.score === 'number' &&
            typeof item.total === 'number' &&
            (item.total ?? 0) > 0,
        )
        if (completed.length > 0) {
          const avg =
            completed.reduce(
              (sum, item) => sum + ((item.score ?? 0) / (item.total ?? 1)) * 100,
              0,
            ) / completed.length
          setAvgQuizScore(Math.round(avg))
        } else {
          setAvgQuizScore(0)
        }

        const localChatRaw = localStorage.getItem(LOCAL_CHAT_KEY)
        const localChat = localChatRaw
          ? (JSON.parse(localChatRaw) as { sessions?: unknown[] })
          : null
        setChatCount(Array.isArray(localChat?.sessions) ? localChat.sessions.length : 0)
      } catch {
        setChatCount(0)
        setQuizAttempts(0)
        setAvgQuizScore(0)
        setTopicPerformance([])
      }
    }
    void loadStats()
  }, [userId])

  useEffect(() => {
    async function loadRecentActivity() {
      const merged: DashboardActivity[] = []

      if (supabase && userId) {
        const [quizRes, packRes, chatRes] = await Promise.all([
          supabase
            .from('quiz_attempts')
            .select('id,topic,score,total,questions,created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(12),
          supabase
            .from('upload_packs')
            .select('id,source_name,topic,quiz,created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10),
          supabase
            .from('chat_sessions')
            .select('id,title,topic,created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10),
        ])

        if (!quizRes.error && quizRes.data) {
          for (const row of quizRes.data) {
            const qs = row.questions
            const first =
              Array.isArray(qs) && qs.length > 0
                ? (qs[0] as { quizTitle?: unknown; quizTopicDisplay?: unknown })
                : null
            const title =
              typeof first?.quizTitle === 'string' && first.quizTitle.trim()
                ? first.quizTitle.trim()
                : `Quiz · ${row.topic}`
            const displayTopic =
              typeof first?.quizTopicDisplay === 'string' && first.quizTopicDisplay.trim()
                ? first.quizTopicDisplay.trim()
                : row.topic
            merged.push({
              id: row.id,
              kind: 'quiz',
              title,
              meta: `${row.total} questions · Score ${row.score}/${row.total} · ${displayTopic} · ${formatShortDate(row.created_at)}`,
              at: row.created_at,
              href: `/quiz/${row.id}`,
            })
          }
        }

        if (!packRes.error && packRes.data) {
          for (const row of packRes.data) {
            const n = Array.isArray(row.quiz) ? row.quiz.length : 0
            merged.push({
              id: row.id,
              kind: 'pack',
              title: `Study pack · ${row.source_name || 'Notes'}`,
              meta: `${n} quiz items · ${row.topic} · ${formatShortDate(row.created_at)}`,
              at: row.created_at,
              href: '/chat',
            })
          }
        }

        if (!chatRes.error && chatRes.data) {
          for (const row of chatRes.data) {
            merged.push({
              id: row.id,
              kind: 'chat',
              title: row.title || 'Chat session',
              meta: `${row.topic} · ${formatShortDate(row.created_at)}`,
              at: row.created_at,
              href: '/chat',
            })
          }
        }
      } else {
        try {
          const rawQ = localStorage.getItem(LOCAL_QUIZ_KEY)
          const quizzes = rawQ
            ? (JSON.parse(rawQ) as Array<{
                id: string
                title: string
                topic: string
                questionCount: number
                score?: number
                total?: number
                completedAt?: string
                createdAt?: string
              }>)
            : []
          for (const q of quizzes.slice(0, 15)) {
            const at = q.completedAt || q.createdAt || ''
            const scoreBit =
              typeof q.score === 'number' && typeof q.total === 'number'
                ? ` · Score ${q.score}/${q.total}`
                : ''
            merged.push({
              id: q.id,
              kind: 'quiz',
              title: q.title,
              meta: `${q.questionCount} questions${scoreBit}${at ? ` · ${formatShortDate(at)}` : ''}`,
              at: at || new Date(0).toISOString(),
              href: `/quiz/${q.id}`,
            })
          }
        } catch {
          /* ignore */
        }

        try {
          const rawP = localStorage.getItem(LOCAL_UPLOAD_PACKS_KEY)
          const packs = rawP
            ? (JSON.parse(rawP) as Array<{
                id: string
                sourceName: string
                topic: string
                createdAt: string
                pack?: { quiz?: unknown[] }
              }>)
            : []
          for (const p of packs.slice(0, 12)) {
            const n = Array.isArray(p.pack?.quiz) ? p.pack.quiz!.length : 0
            merged.push({
              id: p.id,
              kind: 'pack',
              title: `Study pack · ${p.sourceName}`,
              meta: `${n} quiz items · ${p.topic} · ${formatShortDate(p.createdAt)}`,
              at: p.createdAt,
              href: '/chat',
            })
          }
        } catch {
          /* ignore */
        }

        try {
          const rawC = localStorage.getItem(LOCAL_CHAT_KEY)
          const doc = rawC
            ? (JSON.parse(rawC) as {
                sessions?: Array<{ id: string; title: string; topic: string; createdAt: string }>
              })
            : null
          const sessions = Array.isArray(doc?.sessions) ? doc.sessions : []
          for (const s of sessions.slice(0, 12)) {
            merged.push({
              id: s.id,
              kind: 'chat',
              title: s.title || 'Chat session',
              meta: `${s.topic} · ${formatShortDate(s.createdAt)}`,
              at: s.createdAt,
              href: '/chat',
            })
          }
        } catch {
          /* ignore */
        }
      }

      merged.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      setRecentActivity(merged.slice(0, 8))
    }

    void loadRecentActivity()
  }, [userId])

  return (
    <div className="page-root dashboard-v2-page">
      <header className="dashboard-v2-topbar">
        <div className="dashboard-v2-topbar-user">
          <span className="dashboard-v2-avatar" aria-hidden="true">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
          <div className="dashboard-v2-topbar-text">
            <h1 className="dashboard-v2-topbar-title">NurseAI Dashboard</h1>
            <p className="dashboard-v2-topbar-sub">
              {displayEmail ? `${displayName} · ${displayEmail}` : 'Your study command center'}
            </p>
          </div>
        </div>
        <button
          type="button"
          className="dashboard-v2-notify"
          title="Notifications"
          aria-label="Notifications"
          disabled
        >
          <span aria-hidden="true">🔔</span>
        </button>
      </header>

      <p className="page-lead dashboard-v2-lead">
        Live overview of chat, quizzes, uploads, and topic mastery.
      </p>

      <section className="dashboard-v2-quickstart">
        <h2 className="page-section-title">Quick start</h2>
        <div className="dashboard-v2-quickstart-grid dashboard-v2-quickstart-grid-4">
          <Link to="/chat?new=1" className="dashboard-v2-quickstart-card dashboard-v2-quickstart-chat">
            <span className="dashboard-v2-quickstart-icon" aria-hidden="true">
              💬
            </span>
            <div>
              <p className="dashboard-v2-quickstart-title">Start AI Chat</p>
              <p className="dashboard-v2-quickstart-copy">Tutor, explainer, and MCQ practice</p>
            </div>
          </Link>
          <Link to="/quiz" className="dashboard-v2-quickstart-card dashboard-v2-quickstart-quiz">
            <span className="dashboard-v2-quickstart-icon" aria-hidden="true">
              📝
            </span>
            <div>
              <p className="dashboard-v2-quickstart-title">Practice Quiz</p>
              <p className="dashboard-v2-quickstart-copy">NCLEX-style sets by topic</p>
            </div>
          </Link>
          <Link to="/drugs" className="dashboard-v2-quickstart-card dashboard-v2-quickstart-drug">
            <span className="dashboard-v2-quickstart-icon" aria-hidden="true">
              💊
            </span>
            <div>
              <p className="dashboard-v2-quickstart-title">Drug lookup</p>
              <p className="dashboard-v2-quickstart-copy">Structured pharmacology cards</p>
            </div>
          </Link>
          <Link to="/case" className="dashboard-v2-quickstart-card dashboard-v2-quickstart-case">
            <span className="dashboard-v2-quickstart-icon" aria-hidden="true">
              📋
            </span>
            <div>
              <p className="dashboard-v2-quickstart-title">Case study</p>
              <p className="dashboard-v2-quickstart-copy">Clinical scenarios and debrief</p>
            </div>
          </Link>
        </div>
      </section>

      <section className="page-section">
        <h2 className="page-section-title">Activity metrics</h2>
        <div className="dashboard-v2-stats-grid">
          <article className="dashboard-v2-stat-card">
            <p className="dashboard-v2-stat-label">Chat sessions</p>
            <p className="dashboard-v2-stat-value">{chatCount}</p>
          </article>
          <article className="dashboard-v2-stat-card">
            <p className="dashboard-v2-stat-label">Quiz attempts</p>
            <p className="dashboard-v2-stat-value">{quizAttempts}</p>
          </article>
          <article className="dashboard-v2-stat-card">
            <p className="dashboard-v2-stat-label">Average score</p>
            <p className="dashboard-v2-stat-value">{avgQuizScore}%</p>
          </article>
          <article className="dashboard-v2-stat-card">
            <p className="dashboard-v2-stat-label">Saved packs</p>
            <p className="dashboard-v2-stat-value">{savedPacks.length}</p>
          </article>
        </div>
      </section>

      <section className="dashboard-v2-content-grid" aria-label="Topic mastery and recent activity">
        <div className="dashboard-v2-content-scroll">
          <article className="dashboard-v2-panel">
            <div className="dashboard-v2-panel-head">
              <h2 className="page-section-title">Topic mastery</h2>
              <Link to="/quiz" className="page-inline-link">
                Practice quizzes
              </Link>
            </div>
            {topicPerformance.length === 0 ? (
              <p className="page-empty">No completed quizzes yet to calculate mastery.</p>
            ) : (
              <ul className="dashboard-v2-mastery-list">
                {topicPerformance.slice(0, 5).map((item) => (
                  <li key={`topic-${item.topic}`} className="dashboard-v2-mastery-item">
                    <div className="dashboard-v2-mastery-meta">
                      <div className="dashboard-v2-mastery-label">
                        <span className="dashboard-v2-mastery-glyph" aria-hidden="true">
                          {topicGlyph(item.topic)}
                        </span>
                        <span className="dashboard-v2-mastery-topic">{item.topic}</span>
                      </div>
                      <span className="dashboard-v2-mastery-score">{item.avgPct}%</span>
                    </div>
                    <div className="dashboard-v2-progress-track">
                      <div
                        className={`dashboard-v2-progress-fill ${topicProgressColor(item.avgPct)}`}
                        style={{ width: `${Math.min(100, Math.max(0, item.avgPct))}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="dashboard-v2-panel">
            <div className="dashboard-v2-panel-head">
              <h2 className="page-section-title">Recent activity</h2>
            </div>
            {recentActivity.length === 0 ? (
              <p className="page-empty">No recent quizzes, packs, or chats yet.</p>
            ) : (
              <ul className="dashboard-v2-activity-list">
                {recentActivity.map((item) => {
                  const icon = item.kind === 'quiz' ? '📝' : item.kind === 'pack' ? '📎' : '💬'
                  const inner = (
                    <>
                      <span className="dashboard-v2-activity-icon" aria-hidden="true">
                        {icon}
                      </span>
                      <div className="dashboard-v2-activity-body">
                        <p className="dashboard-v2-activity-title">{item.title}</p>
                        <p className="dashboard-v2-activity-meta">{item.meta}</p>
                      </div>
                    </>
                  )
                  return (
                    <li key={`${item.kind}-${item.id}`}>
                      {item.href ? (
                        <Link to={item.href} className="dashboard-v2-activity-row">
                          {inner}
                        </Link>
                      ) : (
                        <div className="dashboard-v2-activity-row dashboard-v2-activity-row-static">
                          {inner}
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </article>
        </div>
      </section>

      <section className="page-section dashboard-v2-packs-section">
        <div className="dashboard-v2-panel-head">
          <h2 className="page-section-title">Saved study packs</h2>
        </div>
        {savedPacks.length === 0 ? (
          <p className="page-empty">
            No saved packs yet. Upload a PDF or TXT in Chat and save the generated pack.
          </p>
        ) : (
          <ul className="activity-list dashboard-v2-pack-list">
            {savedPacks.slice(0, 6).map((item) => (
              <li key={`recent-${item.id}`} className="activity-row">
                <span className="activity-badge activity-badge-quiz">pack</span>
                <div className="activity-body">
                  <p className="activity-title">{item.sourceName}</p>
                  <p className="activity-meta">
                    {item.topic} · {item.questionCount} questions ·{' '}
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
