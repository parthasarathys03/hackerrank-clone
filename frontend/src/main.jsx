import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import Login from './pages/Login'
import CandidateDashboard from './pages/CandidateDashboard'
import TestStructure from './pages/TestStructure'
import PythonProblems from './pages/PythonProblems'
import SQLProblems from './pages/SQLProblems'
import ProblemList from './pages/ProblemList'
import CodingPage from './pages/CodingPage'
import SubmissionComplete from './pages/SubmissionComplete'
import HRLogin from './pages/HRLogin'
import HRDashboard from './pages/HRDashboard'
import HRResults from './pages/HRResults'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<CandidateDashboard />} />
        <Route path="/test-structure" element={<TestStructure />} />
        <Route path="/problems/python" element={<PythonProblems />} />
        <Route path="/problems/sql" element={<SQLProblems />} />
        <Route path="/problems" element={<ProblemList />} />
        <Route path="/coding/:problemId" element={<CodingPage />} />
        <Route path="/submission-complete" element={<SubmissionComplete />} />
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
