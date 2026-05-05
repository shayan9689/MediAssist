import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/auth-context'
import { supabase } from '@/shared/lib/supabase/client'

type QuizQuestion = {
  id: string
  stem: string
  options: string[]
  correctIndex: number
  rationale: string
  quizTitle?: string
}

export function QuizPlayPage() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const { quizId } = useParams()
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null)
  const [title, setTitle] = useState('Generated quiz')
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [phase, setPhase] = useState<'pick' | 'reveal' | 'done'>('pick')
  const [didPersistResult, setDidPersistResult] = useState(false)

  useEffect(() => {
    async function loadQuiz() {
      if (!quizId) return

      if (supabase && userId) {
        const { data, error } = await supabase
          .from('quiz_attempts')
          .select('id,questions')
          .eq('id', quizId)
          .eq('user_id', userId)
          .maybeSingle()
        if (!error && data && Array.isArray(data.questions) && data.questions.length > 0) {
          const loaded = data.questions as QuizQuestion[]
          setQuestions(loaded)
          setTitle(loaded[0]?.quizTitle || 'Generated quiz')
          setIsLoading(false)
          return
        }
      }

      try {
        const raw = localStorage.getItem(`nurseai.quiz.${quizId}`)
        const parsed = raw ? (JSON.parse(raw) as QuizQuestion[]) : []
        if (Array.isArray(parsed) && parsed.length > 0) {
          setQuestions(parsed)
          setTitle(parsed[0]?.quizTitle || 'Generated quiz')
          setIsLoading(false)
          return
        }
      } catch {
        // ignore local load error
      }

      setLoadError('Quiz not found. Generate a new quiz from Quiz Hub.')
      setIsLoading(false)
    }
    void loadQuiz()
  }, [quizId, userId])

  useEffect(() => {
    async function persistAttemptResult() {
      if (!quizId || phase !== 'done' || didPersistResult) return

      if (supabase && userId) {
        await supabase
          .from('quiz_attempts')
          .update({
            score,
            total: questions?.length ?? 0,
          })
          .eq('id', quizId)
          .eq('user_id', userId)
      } else {
        try {
          const summaryRaw = localStorage.getItem('nurseai.generated.quizzes.v1')
          const summary = summaryRaw
            ? (JSON.parse(summaryRaw) as Array<{
                id: string
                title: string
                topic: string
                questionCount: number
                estimateMin: number
                score?: number
                total?: number
                completedAt?: string
              }>)
            : []
          const next = summary.map((item) =>
            item.id === quizId
              ? {
                  ...item,
                  score,
                  total: questions?.length ?? 0,
                  completedAt: new Date().toISOString(),
                }
              : item,
          )
          localStorage.setItem('nurseai.generated.quizzes.v1', JSON.stringify(next))
        } catch {
          // Ignore local persistence errors.
        }
      }

      setDidPersistResult(true)
    }
    void persistAttemptResult()
  }, [didPersistResult, phase, questions?.length, quizId, score, userId])

  if (!quizId) {
    return <Navigate to="/quiz" replace />
  }

  if (isLoading) {
    return (
      <div className="page-root app-feature-page">
        <p className="page-empty">Loading quiz…</p>
      </div>
    )
  }

  if (loadError || !questions?.length) {
    return <Navigate to="/quiz" replace />
  }

  const question = questions[index]
  const isLast = index === questions.length - 1

  function handleChoose(optionIndex: number) {
    if (phase !== 'pick') return
    setSelected(optionIndex)
    setPhase('reveal')
    if (optionIndex === question.correctIndex) {
      setScore((s) => s + 1)
    }
  }

  function handleNext() {
    if (isLast) {
      setPhase('done')
      return
    }
    setIndex((i) => i + 1)
    setSelected(null)
    setPhase('pick')
  }

  if (phase === 'done') {
    const total = questions.length
    const percentage = total > 0 ? Math.round((score / total) * 100) : 0
    const performanceLabel =
      percentage >= 85
        ? 'Excellent'
        : percentage >= 70
          ? 'Good progress'
          : percentage >= 50
            ? 'Needs reinforcement'
            : 'Needs focused review'

    return (
      <div className="page-root app-feature-page">
        <header className="page-header quiz-results-hero">
          <p className="page-eyebrow">Quiz complete</p>
          <h1 className="page-title">{title}</h1>
          <p className="quiz-results-score-big">{percentage}%</p>
          <p className="page-lead">
            {score} of {total} correct · {performanceLabel}
          </p>
        </header>

        <section className="page-section">
          <article className="ui-card">
            <p className="ui-card-label">Coach note</p>
            <p className="ui-card-hint">
              {percentage >= 85
                ? 'Strong accuracy. Continue with higher-difficulty questions.'
                : percentage >= 70
                  ? 'Solid base. Keep practicing weak concepts to push above 85%.'
                  : 'Focus on core concepts and rationales, then retake a short quiz.'}
            </p>
          </article>
        </section>

        <div className="quiz-results-actions">
          <Link to="/quiz" className="secondary-button">
            New quiz
          </Link>
          <Link to={`/quiz/${quizId}`} className="secondary-button">
            Retake
          </Link>
          <Link to="/" className="primary-button">
            Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const correct = selected === question.correctIndex

  const progressPct = questions.length > 0 ? Math.round(((index + 1) / questions.length) * 100) : 0

  return (
    <div className="page-root app-feature-page">
      <div className="quiz-play-head">
        <Link to="/quiz" className="page-back-link">
          ← All quizzes
        </Link>
        <p className="quiz-progress">
          Question {index + 1} / {questions.length}
        </p>
      </div>

      <div className="quiz-play-progress" role="progressbar" aria-valuenow={index + 1} aria-valuemin={1} aria-valuemax={questions.length}>
        <div className="quiz-play-progress-fill" style={{ width: `${progressPct}%` }} />
      </div>

      <article className="ui-card ui-card-question">
        <h1 className="quiz-stem">{question.stem}</h1>
        <ol className="quiz-options">
          {question.options.map((opt, i) => {
            let optClass = 'quiz-option'
            if (phase === 'reveal') {
              if (i === question.correctIndex) optClass += ' quiz-option-correct'
              else if (i === selected && !correct) optClass += ' quiz-option-wrong'
            } else if (i === selected) {
              optClass += ' quiz-option-picked'
            }
            return (
              <li key={opt}>
                <button
                  type="button"
                  className={optClass}
                  disabled={phase !== 'pick'}
                  onClick={() => handleChoose(i)}
                >
                  <span className="quiz-option-letter">{String.fromCharCode(65 + i)}</span>
                  <span className="quiz-option-text">{opt}</span>
                </button>
              </li>
            )
          })}
        </ol>

        {phase === 'reveal' ? (
          <div className="quiz-rationale">
            <p className="quiz-rationale-label">{correct ? 'Correct' : 'Incorrect'}</p>
            <p>{question.rationale}</p>
            <button type="button" className="primary-button quiz-next-btn" onClick={handleNext}>
              {isLast ? 'View results' : 'Next question'}
            </button>
          </div>
        ) : null}
      </article>
    </div>
  )
}
