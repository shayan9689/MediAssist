export type VitalSigns = {
  bp: string
  hr: string
  rr: string
  temp: string
  spo2: string
  pain: string
}

export type CaseStudyMock = {
  id: string
  title: string
  chiefComplaint: string
  vitals: VitalSigns
  history: string[]
  ordersMock: string[]
  labsMock: string[]
  assistantSeed: string
}

export const mockCaseStudies: CaseStudyMock[] = [
  {
    id: 'dka-intro',
    title: 'Type 1 DM — hyperglycemia & dehydration',
    chiefComplaint: 'Polyuria, thirst, nausea × 2 days; lethargy worsening today.',
    vitals: {
      bp: '102/64 mmHg',
      hr: '118 bpm',
      rr: '24 / min',
      temp: '37.2 °C',
      spo2: '97% RA',
      pain: '3/10 generalized abdominal discomfort',
    },
    history: [
      'Insulin pump malfunction suspected; missed basal boluses',
      'Positive urine ketones on POC test',
      'Alert but fatigued; skin turgor decreased',
    ],
    ordersMock: ['IV fluids per protocol', 'Insulin infusion per protocol', 'Labs: BMP, VBG, UA'],
    labsMock: ['Glucose markedly elevated (mock)', 'K+ pending correction protocol'],
    assistantSeed:
      'You are reviewing a mock case for NCLEX-style reasoning. Ask clarifying questions about DKA priorities: fluids, insulin, electrolytes, and monitoring.',
  },
  {
    id: 'chf-exacerbation',
    title: 'Heart failure exacerbation',
    chiefComplaint: 'Increasing SOB and orthopnea over 3 days.',
    vitals: {
      bp: '148/92 mmHg',
      hr: '104 bpm',
      rr: '26 / min',
      temp: '36.8 °C',
      spo2: '91% RA → 94% 2L NC',
      pain: '0/10',
    },
    history: [
      '+3 bilateral pitting edema',
      'Recent dietary sodium excess',
      'Weight +6 lb in one week',
    ],
    ordersMock: ['Diuretic per protocol', 'Telemetry', 'Strict I&O & daily weights'],
    labsMock: ['BNP elevated (mock)', 'Creatinine baseline comparison'],
    assistantSeed:
      'Mock CHF exacerbation case: focus on fluid overload assessment, medication teaching, and escalation criteria.',
  },
]
