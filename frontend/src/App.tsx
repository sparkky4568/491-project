import { BrowserRouter, Link, Route, Routes } from 'react-router'
import { Layout } from './components/Layout'
import { PageContainer, linkClass } from './components/ui'
import { AboutPage } from './pages/AboutPage'
import { IssuesPage } from './pages/IssuesPage'
import { SessionReviewRoute } from './pages/SessionReviewPage'
import { SessionsPage } from './pages/SessionsPage'
import { ValidationPage } from './pages/ValidationPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<SessionsPage />} />
          <Route path="sessions/:id" element={<SessionReviewRoute />} />
          <Route path="issues" element={<IssuesPage />} />
          <Route path="validation" element={<ValidationPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

function NotFound() {
  return (
    <PageContainer>
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="mt-2 text-sm">
        <Link to="/" className={linkClass}>
          Back to sessions
        </Link>
      </p>
    </PageContainer>
  )
}
