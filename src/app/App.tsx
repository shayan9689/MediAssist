import { AppRouter } from '@/app/router/AppRouter'
import { AppProviders } from '@/app/providers/AppProviders'

export function App() {
  return (
    <AppProviders>
      <div className="app-root-fill">
        <AppRouter />
      </div>
    </AppProviders>
  )
}
