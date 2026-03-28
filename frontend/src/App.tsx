import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Dashboard } from './pages/Dashboard'
import { SessionDetailPage } from './pages/SessionDetailPage'
import { InsightsPage } from './pages/InsightsPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { MemoryPanel } from './components/MemorySidebar'
import { SkillPanel } from './components/SkillSidebar'
import './App.css'

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/session/:sessionId" element={<SessionDetailPage />}>
            <Route path="memory" element={<MemoryPanel />} />
            <Route path="skills/:skillName" element={<SkillPanel />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
