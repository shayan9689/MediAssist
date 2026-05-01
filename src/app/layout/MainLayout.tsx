import { Outlet } from 'react-router-dom'
import { AppSidebar } from '@/app/layout/AppSidebar'

export function MainLayout() {
  return (
    <div className="gpt-shell">
      <AppSidebar />
      <main className="gpt-main app-main-outlet">
        <Outlet />
      </main>
    </div>
  )
}
