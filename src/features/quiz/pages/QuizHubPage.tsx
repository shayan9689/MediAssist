import { Link } from 'react-router-dom'
import { mockQuizSummaries } from '@/shared/mock/quizzes'

export function QuizHubPage() {
  return (
    <div className="page-root">
      <header className="page-header">
        <p className="page-eyebrow">NCLEX-style</p>
        <h1 className="page-title">Quiz practice</h1>
        <p className="page-lead">
          Mock question banks with rationales. Progress and scoring will sync when the API is wired.
        </p>
      </header>

      <ul className="quiz-list">
        {mockQuizSummaries.map((quiz) => (
          <li key={quiz.id}>
            <article className="ui-card ui-card-quiz">
              <div className="ui-card-quiz-main">
                <h2 className="ui-card-quiz-title">{quiz.title}</h2>
                <p className="ui-card-quiz-topic">{quiz.topic}</p>
                <p className="ui-card-quiz-meta">
                  {quiz.questionCount} questions · ~{quiz.estimateMin} min
                </p>
              </div>
              <Link to={`/quiz/${quiz.id}`} className="primary-button ui-card-quiz-btn">
                Start
              </Link>
            </article>
          </li>
        ))}
      </ul>
    </div>
  )
}
