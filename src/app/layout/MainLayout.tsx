import { NavLink, Outlet } from 'react-router-dom'
import { AppSidebar } from '@/app/layout/AppSidebar'

export function MainLayout() {
  return (
    <div className="gpt-shell gpt-shell-with-mobile-nav">
      <AppSidebar />
      <main className="gpt-main app-main-outlet">
        <Outlet />
      </main>
      <nav className="app-mobile-tabbar" aria-label="Primary">
        <NavLink to="/" className={({ isActive }) => `app-mobile-tab${isActive ? ' app-mobile-tab-active' : ''}`} end>
          <span className="app-mobile-tab-icon" aria-hidden="true">
            ⌂
          </span>
          Home
        </NavLink>
        <NavLink to="/chat" className={({ isActive }) => `app-mobile-tab${isActive ? ' app-mobile-tab-active' : ''}`}>
          <span className="app-mobile-tab-icon" aria-hidden="true">
            💬
          </span>
          Chat
        </NavLink>
        <NavLink to="/quiz" className={({ isActive }) => `app-mobile-tab${isActive ? ' app-mobile-tab-active' : ''}`}>
          <span className="app-mobile-tab-icon" aria-hidden="true">
            📝
          </span>
          Quiz
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `app-mobile-tab${isActive ? ' app-mobile-tab-active' : ''}`}>
          <span className="app-mobile-tab-icon" aria-hidden="true">
            ⚙
          </span>
          Profile
        </NavLink>
      </nav>
    </div>
  )
}
