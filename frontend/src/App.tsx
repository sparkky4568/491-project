import { useEffect } from 'react'
import { Layout } from './components/Layout'
import { ConnectionProvider } from './lib/connection'
import { useRoute } from './lib/router'
import { RunsProvider } from './lib/runs'
import { RunsPage } from './pages/RunsPage'
import { ScorePage } from './pages/ScorePage'
import { SessionPage } from './pages/SessionPage'

function Routes() {
  const route = useRoute()
  const title =
    route.page === 'session'
      ? `${route.sessionId} · AVEN Scorer`
      : route.page === 'score'
        ? 'Score a call · AVEN Scorer'
        : 'Scored runs · AVEN Scorer'
  useEffect(() => {
    document.title = title
  }, [title])
  return (
    <Layout route={route}>
      {route.page === 'runs' && <RunsPage />}
      {route.page === 'score' && <ScorePage />}
      {route.page === 'session' && <SessionPage key={route.sessionId} sessionId={route.sessionId} tab={route.tab} />}
    </Layout>
  )
}

export function App() {
  return (
    <ConnectionProvider>
      <RunsProvider>
        <Routes />
      </RunsProvider>
    </ConnectionProvider>
  )
}
