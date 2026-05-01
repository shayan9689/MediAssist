import type { ReactElement } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { MainLayout } from '@/app/layout/MainLayout'
import { enableAuth } from '@/shared/config/env'
import { RequireAuth } from '@/features/auth/components/RequireAuth'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ChatHomePage } from '@/features/chat/pages/ChatHomePage'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { QuizHubPage } from '@/features/quiz/pages/QuizHubPage'
import { QuizPlayPage } from '@/features/quiz/pages/QuizPlayPage'
import { DrugReferencePage } from '@/features/drugs/pages/DrugReferencePage'
import { CaseStudyPage } from '@/features/cases/pages/CaseStudyPage'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'

function ProtectedLayout({ children }: { children: ReactElement }) {
  return <RequireAuth>{children}</RequireAuth>
}

export function AppRouter() {
  const layoutElement = enableAuth ? (
    <ProtectedLayout>
      <MainLayout />
    </ProtectedLayout>
  ) : (
    <MainLayout />
  )

  return (
    <Routes>
      <Route element={layoutElement}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/chat" element={<ChatHomePage />} />
        <Route path="/quiz" element={<QuizHubPage />} />
        <Route path="/quiz/:quizId" element={<QuizPlayPage />} />
        <Route path="/drugs" element={<DrugReferencePage />} />
        <Route path="/case" element={<CaseStudyPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
