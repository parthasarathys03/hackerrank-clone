import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getExamSummary, startExam, getExamStatus } from '../api'
import './CandidateDashboard.css'

function CandidateDashboard() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('')
  const [examSummary, setExamSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [examStarted, setExamStarted] = useState(false)

  useEffect(() => {
    const name = localStorage.getItem('user_name')
    const sessionId = localStorage.getItem('session_id')

    if (!name || !sessionId) {
      navigate('/login')
      return
    }

    setUserName(name)
    loadExamData()
  }, [navigate])

  const loadExamData = async () => {
    try {
      const summary = await getExamSummary()
      setExamSummary(summary)

      // Check if exam already started
      const sessionId = localStorage.getItem('session_id')
      const status = await getExamStatus(sessionId)
      
      if (status.status === 'active') {
        setExamStarted(true)
        // Store remaining time
        localStorage.setItem('exam_remaining', status.remaining_seconds)
        localStorage.setItem('exam_start_time', status.start_time)
      } else if (status.status === 'completed') {
        navigate('/submission-complete')
      }
    } catch (err) {
      console.error('Failed to load exam data', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStartExam = async () => {
    try {
      const sessionId = localStorage.getItem('session_id')
      const response = await startExam(sessionId)
      
      // Store exam start time and remaining seconds
      localStorage.setItem('exam_start_time', response.start_time)
      localStorage.setItem('exam_remaining', response.remaining_seconds)
      localStorage.setItem('exam_answers', JSON.stringify({}))
      
      navigate('/test-structure')
    } catch (err) {
      console.error('Failed to start exam', err)
      alert('Failed to start exam. Please try again.')
    }
  }

  const handleContinueExam = () => {
    navigate('/test-structure')
  }

  const handleLogout = () => {
    localStorage.clear()
    navigate('/login')
  }

  const getDifficultyColor = (difficulty) => {
    switch (difficulty.toLowerCase()) {
      case 'easy': return '#4caf50'
      case 'medium': return '#ff9800'
      case 'hard': return '#f44336'
      default: return '#9e9e9e'
    }
  }

  if (loading) {
    return <div className="loading">Loading exam details...</div>
  }

  return (
    <div className="dashboard-page">
      <div className="header">
        <h1>Coding Assessment Platform</h1>
        <div className="user-info">
          <span>{userName}</span>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="welcome-section">
          <h2>Welcome, {userName}!</h2>
          <p className="welcome-subtitle">You are about to begin your coding assessment</p>
        </div>

        <div className="instructions-card">
          <h3>Assessment Instructions</h3>
          
          <div className="instruction-grid">
            <div className="instruction-item">
              <span className="instruction-icon">⏱️</span>
              <div>
                <strong>Total Duration</strong>
                <p>2 Hours</p>
              </div>
            </div>
            
            <div className="instruction-item">
              <span className="instruction-icon">📝</span>
              <div>
                <strong>Total Questions</strong>
                <p>{examSummary?.total_questions || 0} Questions</p>
              </div>
            </div>
            
            <div className="instruction-item">
              <span className="instruction-icon">🐍</span>
              <div>
                <strong>Python Problems</strong>
                <p>{examSummary?.python_questions || 0} Questions</p>
              </div>
            </div>
            
            <div className="instruction-item">
              <span className="instruction-icon">🗄️</span>
              <div>
                <strong>SQL Problems</strong>
                <p>{examSummary?.sql_questions || 0} Questions</p>
              </div>
            </div>
          </div>

          <div className="rules-section">
            <h4>Important Rules</h4>
            <ul>
              <li>Timer cannot be paused once the test starts</li>
              <li>Auto submission will occur when time expires</li>
              <li>You can manually submit anytime before time runs out</li>
              <li>Navigate freely between problems during the test</li>
              <li>Your progress is auto-saved while you type</li>
            </ul>
          </div>

          <div className="difficulty-legend">
            <h4>Difficulty Levels</h4>
            <div className="legend-items">
              <span className="legend-item"><span className="dot easy"></span> Easy - 10 marks</span>
              <span className="legend-item"><span className="dot medium"></span> Medium - 20 marks</span>
              <span className="legend-item"><span className="dot hard"></span> Hard - 30 marks</span>
            </div>
          </div>
        </div>

        <div className="problems-overview">
          <h3>Questions Overview</h3>
          <div className="problems-table">
            <table>
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Language</th>
                  <th>Difficulty</th>
                  <th>Marks</th>
                  <th>Est. Time</th>
                </tr>
              </thead>
              <tbody>
                {examSummary?.problems?.map((problem, index) => (
                  <tr key={problem.id}>
                    <td>{problem.title}</td>
                    <td>
                      <span className={`lang-badge ${problem.language}`}>
                        {problem.language === 'python' ? '🐍 Python' : '🗄️ SQL'}
                      </span>
                    </td>
                    <td>
                      <span 
                        className="difficulty-badge"
                        style={{ backgroundColor: getDifficultyColor(problem.difficulty) }}
                      >
                        {problem.difficulty}
                      </span>
                    </td>
                    <td>{problem.marks}</td>
                    <td>{problem.time_limit} mins</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="3"><strong>Total</strong></td>
                  <td><strong>{examSummary?.total_marks || 0}</strong></td>
                  <td><strong>120 mins</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="action-section">
          {examStarted ? (
            <button onClick={handleContinueExam} className="btn-take-test continue">
              Continue Test
            </button>
          ) : (
            <button onClick={handleStartExam} className="btn-take-test">
              Take Test
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default CandidateDashboard
