export type UsageMock = {
  label: string
  used: number
  cap: number
}

export const mockUsage: UsageMock[] = [
  { label: 'Messages this week', used: 42, cap: 200 },
  { label: 'Quiz runs', used: 8, cap: 30 },
]

export const mockProfile = {
  displayName: 'Student Nurse',
  goalExam: 'NCLEX-RN',
  targetDate: 'August 2026',
}
