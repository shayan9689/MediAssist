export type QuizQuestion = {
  id: string
  stem: string
  options: string[]
  correctIndex: number
  rationale: string
}

export type QuizSummary = {
  id: string
  title: string
  topic: string
  questionCount: number
  estimateMin: number
}

export const mockQuizSummaries: QuizSummary[] = [
  {
    id: 'safety-priority',
    title: 'Safety & prioritization',
    topic: 'NCLEX fundamentals',
    questionCount: 5,
    estimateMin: 8,
  },
  {
    id: 'cardiac-meds',
    title: 'Cardiac medications',
    topic: 'Pharmacology',
    questionCount: 4,
    estimateMin: 6,
  },
  {
    id: 'infection-control',
    title: 'Infection control',
    topic: 'Safety',
    questionCount: 5,
    estimateMin: 7,
  },
]

const safetyQuestions: QuizQuestion[] = [
  {
    id: 'q1',
    stem: 'Which client should the nurse assess first?',
    options: [
      'Stable post-op client requesting pain medication',
      'New onset confusion with SaO₂ 88% on room air',
      'Client awaiting discharge teaching',
      'Client with a scheduled dressing change in 2 hours',
    ],
    correctIndex: 1,
    rationale:
      'Airway and oxygenation take priority. Confusion with hypoxemia suggests an urgent need for assessment and intervention.',
  },
  {
    id: 'q2',
    stem: 'The nurse finds an unconscious client with no pulse. What is the priority action?',
    options: [
      'Open the airway and begin CPR',
      'Insert an IV line',
      'Draw labs',
      'Place the client in Trendelenburg',
    ],
    correctIndex: 0,
    rationale: 'Early CPR and activation of emergency response improve outcomes in cardiac arrest.',
  },
  {
    id: 'q3',
    stem: 'A client reports sudden chest pain and diaphoresis. Which intervention comes first?',
    options: [
      'Administer prescribed nitroglycerin per protocol',
      'Complete full admission paperwork',
      'Schedule echo for next week',
      'Offer a snack',
    ],
    correctIndex: 0,
    rationale: 'Follow agency protocol for suspected cardiac events; timely assessment and interventions reduce harm.',
  },
  {
    id: 'q4',
    stem: 'Four clients need care. Who should the nurse see first?',
    options: [
      'Client with infiltrated IV needing restart',
      'Client with acute respiratory distress',
      'Client requesting a blanket',
      'Client due for routine meds in 30 minutes',
    ],
    correctIndex: 1,
    rationale: 'Life-threatening instability (respiratory distress) outroutines comfort or routine tasks.',
  },
  {
    id: 'q5',
    stem: 'After a fall with suspected head injury, what is the nurse’s immediate concern?',
    options: [
      'Completing incident forms',
      'Airway, breathing, circulation, neurologic status',
      'Discharging home with instructions',
      'Ordering dietary tray',
    ],
    correctIndex: 1,
    rationale: 'ABC + neurologic assessment guides stabilization before administrative tasks.',
  },
]

const cardiacQuestions: QuizQuestion[] = [
  {
    id: 'c1',
    stem: 'A beta-blocker is prescribed for hypertension. What teaching is essential?',
    options: [
      'Stop abruptly if dizzy',
      'Do not stop abruptly; report bradycardia or wheezing',
      'Double the dose if BP is high',
      'Take only when symptomatic',
    ],
    correctIndex: 1,
    rationale:
      'Abrupt cessation can cause rebound effects; monitor HR and respiratory status especially with asthma history.',
  },
  {
    id: 'c2',
    stem: 'Digoxin toxicity risk increases with which finding?',
    options: ['Hypokalemia', 'Hyperkalemia', 'Hypernatremia', 'Metabolic alkalosis'],
    correctIndex: 0,
    rationale: 'Hypokalemia increases sensitivity to digoxin and toxicity risk.',
  },
  {
    id: 'c3',
    stem: 'ACE inhibitor teaching should include monitoring for:',
    options: ['Dry cough', 'Bradycardia only', 'Hyperglycemia crisis', 'Urinary retention'],
    correctIndex: 0,
    rationale: 'Persistent dry cough is a common ACE inhibitor side effect clients should report.',
  },
  {
    id: 'c4',
    stem: 'Statins are primarily used to:',
    options: [
      'Lower LDL cholesterol',
      'Raise blood glucose',
      'Treat acute MI alone',
      'Replace potassium',
    ],
    correctIndex: 0,
    rationale: 'Statins reduce LDL and cardiovascular risk per provider orders.',
  },
]

const infectionQuestions: QuizQuestion[] = [
  {
    id: 'i1',
    stem: 'Standard precautions apply to:',
    options: [
      'Only clients with confirmed infections',
      'All clients',
      'Only ICU clients',
      'Only surgical clients',
    ],
    correctIndex: 1,
    rationale: 'Treat all body fluids as potentially infectious unless proven otherwise.',
  },
  {
    id: 'i2',
    stem: 'Hand hygiene should be performed:',
    options: [
      'Only before sterile procedures',
      'Before and after client contact and after glove removal',
      'Once per shift',
      'Only if visibly soiled',
    ],
    correctIndex: 1,
    rationale: 'WHO five moments emphasize contact-based indications.',
  },
  {
    id: 'i3',
    stem: 'Airborne precautions include:',
    options: ['N95 respirator when indicated', 'Gloves only', 'Private room never needed', 'No signage'],
    correctIndex: 0,
    rationale: 'Airborne pathogens require appropriate respiratory protection per protocol.',
  },
  {
    id: 'i4',
    stem: 'Transmission-based precautions are added when:',
    options: [
      'Suspected or confirmed infectious agent transmission risk',
      'Client requests privacy',
      'Night shift only',
      'Visitor arrives',
    ],
    correctIndex: 0,
    rationale: 'Precautions match suspected route of transmission.',
  },
  {
    id: 'i5',
    stem: 'Sharps safety includes:',
    options: [
      'Recapping needles carefully',
      'Never recap; use engineered sharps injury protections',
      'Leaving sharps on the bedside table',
      'Passing sharps hand-to-hand',
    ],
    correctIndex: 1,
    rationale: 'Avoid recapping; follow engineered controls and disposal protocols.',
  },
]

export const mockQuizQuestionsById: Record<string, QuizQuestion[]> = {
  'safety-priority': safetyQuestions,
  'cardiac-meds': cardiacQuestions,
  'infection-control': infectionQuestions,
}
