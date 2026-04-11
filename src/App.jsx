import './App.css'
import { Navigate, Route, Routes } from 'react-router-dom'
import Admin from './pages/Admin'
import BigScreen from './pages/BigScreen'
import Audience from './pages/Audience'
import PromptPage from './pages/PromptPage'
import QuestionsPage from './pages/QuestionsPage'
import McPage from './pages/McPage'
import PolicyPage from './pages/PolicyPage'
import StayTunedPage from './pages/StayTunedPage'

function isDoesGodExistHost() {
  if (typeof window === 'undefined') return false
  const h = window.location.hostname
  return h === 'doesgodexist.ca' || h === 'www.doesgodexist.ca'
}

function App() {
  if (isDoesGodExistHost()) {
    return (
      <Routes>
        <Route path="*" element={<StayTunedPage />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/ask" replace />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/screen" element={<BigScreen />} />
      <Route path="/ask" element={<Audience />} />
      <Route path="/prompt" element={<PromptPage />} />
      <Route path="/questions" element={<QuestionsPage />} />
      <Route path="/mc" element={<McPage />} />
      <Route path="/policy" element={<PolicyPage />} />
      <Route path="/stay-tuned" element={<StayTunedPage />} />
    </Routes>
  )
}

export default App
