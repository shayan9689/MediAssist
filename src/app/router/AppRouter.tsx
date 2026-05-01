import { Navigate, Route, Routes } from 'react-router-dom'
import { enableAuth } from '@/shared/config/env'
import { RequireAuth } from '@/features/auth/components/RequireAuth'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { ChatHomePage } from '@/features/chat/pages/ChatHomePage'

export function AppRouter() {
  const chatElement = enableAuth ? (
    <RequireAuth>
      <ChatHomePage />
    </RequireAuth>
  ) : (
    <ChatHomePage />
  )

  return (
    <Routes>
      <Route path="/" element={chatElement} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
