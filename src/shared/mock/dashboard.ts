export type DashboardStat = {
  label: string
  value: string
  hint?: string
}

export type RecentActivityItem = {
  id: string
  title: string
  meta: string
  kind: 'chat' | 'quiz' | 'case'
}

export const dashboardStats: DashboardStat[] = [
  { label: 'Study streak', value: '7 days', hint: 'Mock · resets when backend lands' },
  { label: 'Quizzes', value: '12 done', hint: 'NCLEX-style practice' },
  { label: 'Topics touched', value: 'Pharm · Med-Surg', hint: 'From recent sessions' },
]

export const quickStartTopics = [
  { id: 'pharm', label: 'Pharmacology', blurb: 'Mechanisms, adverse effects, calculations' },
  { id: 'medsurg', label: 'Medical–surgical', blurb: 'Prioritization & complications' },
  { id: 'peds', label: 'Pediatrics', blurb: 'Growth, vaccines, family teaching' },
  { id: 'mental', label: 'Mental health', blurb: 'Therapeutic communication & safety' },
]

export const recentActivity: RecentActivityItem[] = [
  { id: 'a1', title: 'Beta-blockers & asthma', meta: 'Chat · 2h ago', kind: 'chat' },
  { id: 'a2', title: 'Fluid overload priorities', meta: 'Quiz · yesterday', kind: 'quiz' },
  { id: 'a3', title: 'DKA case walkthrough', meta: 'Case study · 3d ago', kind: 'case' },
]
