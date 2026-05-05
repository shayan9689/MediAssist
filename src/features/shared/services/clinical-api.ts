export type DrugCard = {
  drugName: string
  drugClass: string
  mechanism: string
  indications: string[]
  contraindications: string[]
  sideEffects: string[]
  nursingNotes: string[]
  nclexPriority: string
}

export type CaseScenario = {
  title: string
  chartSummary: string[]
  vitals: {
    bp: string
    hr: string
    rr: string
    temp: string
    spo2: string
    pain: string
  }
  assistantPrompt: string
  debriefPoints: string[]
  sourceCitations?: string[]
  safetyNotice?: string
}

export type QuizQuestion = {
  id: string
  stem: string
  options: string[]
  correctIndex: number
  rationale: string
}

export type QuizSet = {
  title: string
  questions: QuizQuestion[]
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || 'Request failed')
  }
  return (await response.json()) as T
}

export async function fetchDrugCard(name: string): Promise<DrugCard> {
  const response = await fetch('/api/drug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  })
  const data = await parseJson<{ card: DrugCard }>(response)
  if (!data.card) throw new Error('No drug card returned')
  return data.card
}

export async function generateCaseScenario(params: {
  condition: string
  complexity: 'basic' | 'intermediate' | 'advanced'
}): Promise<CaseScenario> {
  const response = await fetch('/api/case', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const data = await parseJson<{ scenario: CaseScenario }>(response)
  if (!data.scenario) throw new Error('No scenario returned')
  return data.scenario
}

export async function generateQuizSet(params: {
  topic: string
  difficulty: 'novice' | 'intermediate' | 'expert'
  count: number
}): Promise<QuizSet> {
  const response = await fetch('/api/quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })
  const data = await parseJson<{ quiz: QuizSet }>(response)
  if (!data.quiz?.questions?.length) throw new Error('No quiz questions returned')
  return data.quiz
}
