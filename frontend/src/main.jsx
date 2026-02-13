import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import Login from './pages/Login'
import ProblemList from './pages/ProblemList'
import CodingPage from './pages/CodingPage'
import HRLogin from './pages/HRLogin'
import HRDashboard from './pages/HRDashboard'
import HRResults from './pages/HRResults'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/problems" element={<ProblemList />} />
        <Route path="/coding/:problemId" element={<CodingPage />} />
        <Route path="/hr" element={<HRLogin />} />
        <Route path="/hr/dashboard" element={<HRDashboard />} />
        <Route path="/hr/results" element={<HRResults />} />
      </Routes>
    </BrowserRouter>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
