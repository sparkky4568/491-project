import { BrowserRouter, Link, Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { PageContainer, textLink } from './components/ui'
import { AccuracyPage } from './pages/AccuracyPage'
import { ConversationRoute } from './pages/ConversationPage'
import { ConversationsPage } from './pages/ConversationsPage'
import { HowItWorksPage } from './pages/HowItWorksPage'
import { ProblemsPage } from './pages/ProblemsPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ConversationsPage />} />
          <Route path="sessions/:id" element={<ConversationRoute />} />
          <Route path="issues" element={<ProblemsPage />} />
          <Route path="validation" element={<AccuracyPage />} />
          <Route path="about" element={<HowItWorksPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function NotFound() {
  return (
    <PageContainer narrow>
      <h1 className="pt-16 text-4xl font-extrabold tracking-tight">Page not found</h1>
      <p className="mt-3">
        <Link to="/" className={textLink}>
          Back to all conversations
        </Link>
      </p>
    </PageContainer>
  )
}
