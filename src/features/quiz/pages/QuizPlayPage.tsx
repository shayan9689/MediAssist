import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { mockQuizQuestionsById, mockQuizSummaries } from '@/shared/mock/quizzes'

export function QuizPlayPage() {
  const { quizId } = useParams()
  const summary = useMemo(() => mockQuizSummaries.find((q) => q.id === quizId), [quizId])
  const questions = quizId ? mockQuizQuestionsById[quizId] : undefined

  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [phase, setPhase] = useState<'pick' | 'reveal' | 'done'>('pick')

  if (!quizId || !summary || !questions?.length) {
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
    return (
      <div className="page-root">
        <header className="page-header">
          <p className="page-eyebrow">Results</p>
          <h1 className="page-title">{summary.title}</h1>
          <p className="page-lead">
            You answered {score} of {questions.length} correctly (mock run — not persisted).
          </p>
        </header>
        <div className="quiz-results-actions">
          <Link to="/quiz" className="secondary-button">
            Back to quizzes
          </Link>
          <Link to="/chat" className="primary-button">
            Review in chat
          </Link>
        </div>
      </div>
    )
  }

  const correct = selected === question.correctIndex

  return (
    <div className="page-root">
      <div className="quiz-play-head">
        <Link to="/quiz" className="page-back-link">
          ← All quizzes
        </Link>
        <p className="quiz-progress">
          Question {index + 1} / {questions.length}
        </p>
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
