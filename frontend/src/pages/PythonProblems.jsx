import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getPythonProblems, getExamStatus, submitExam } from '../api'
import './SectionProblems.css'

function PythonProblems() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('')
  const [problems, setProblems] = useState([])
  const [remainingTime, setRemainingTime] = useState(0)
  const [loading, setLoading] = useState(true)
  const timerRef = useRef(null)

  const handleAutoSubmit = useCallback(async () => {
    const sessionId = localStorage.getItem('session_id')
    const answers = JSON.parse(localStorage.getItem('exam_answers') || '{}')
    
    const answersList = Object.entries(answers).map(([problemId, data]) => ({
      problem_id: problemId,
      code: data.code || '',
      language: data.language || 'python'
    }))

    try {
      await submitExam(sessionId, answersList, true)
      localStorage.removeItem('exam_answers')
      localStorage.removeItem('exam_start_time')
      localStorage.removeItem('exam_remaining')
      navigate('/submission-complete?auto=true')
    } catch (err) {
      console.error('Auto submit failed', err)
    }
  }, [navigate])

  useEffect(() => {
    const name = localStorage.getItem('user_name')
    const sessionId = localStorage.getItem('session_id')

    if (!name || !sessionId) {
      navigate('/login')
      return
    }

    setUserName(name)
    loadData()

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [navigate])

  useEffect(() => {
    if (remainingTime > 0) {
      timerRef.current = setInterval(() => {
        setRemainingTime(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current)
            handleAutoSubmit()
            return 0
          }
          localStorage.setItem('exam_remaining', prev - 1)
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [remainingTime, handleAutoSubmit])

  const loadData = async () => {
    try {
      const sessionId = localStorage.getItem('session_id')
      
      // Check exam status
      const status = await getExamStatus(sessionId)
      
      if (status.status === 'not_started') {
        navigate('/dashboard')
        return
      }
      
      if (status.status === 'completed') {
        navigate('/submission-complete')
        return
      }
      
      if (status.status === 'expired') {
        handleAutoSubmit()
        return
      }
      
      setRemainingTime(status.remaining_seconds)
      
      // Load Python problems
      const problemsData = await getPythonProblems()
      setProblems(problemsData)
    } catch (err) {
      console.error('Failed to load problems', err)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getTimerClass = () => {
    if (remainingTime <= 300) return 'timer critical'
    if (remainingTime <= 900) return 'timer warning'
    return 'timer'
  }

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'easy': return '#4caf50'
      case 'medium': return '#ff9800'
      case 'hard': return '#f44336'
      default: return '#9e9e9e'
    }
  }

  const isAnswered = (problemId) => {
    const answers = JSON.parse(localStorage.getItem('exam_answers') || '{}')
    return !!answers[problemId]
  }

  if (loading) {
    return <div className="loading">Loading problems...</div>
  }

  return (
    <div className="section-problems-page">
      <div className="header">
        <div className="header-left">
          <button onClick={() => navigate('/test-structure')} className="btn-back">
            ← Back
          </button>
          <h1>🐍 Python Problems</h1>
        </div>
        <div className="header-right">
          <div className={getTimerClass()}>
            <span className="timer-icon">⏱️</span>
            <span className="timer-value">{formatTime(remainingTime)}</span>
          </div>
          <span className="user-name">{userName}</span>
        </div>
      </div>

      <div className="problems-content">
        <div className="problems-list">
          {problems.map((problem, index) => (
            <div 
              key={problem.id}
              className={`problem-item ${isAnswered(problem.id) ? 'answered' : ''}`}
              onClick={() => navigate(`/coding/${problem.id}`)}
            >
              <div className="problem-number">{index + 1}</div>
              <div className="problem-info">
                <h3>{problem.title}</h3>
                <div className="problem-meta">
                  <span 
                    className="difficulty-badge"
                    style={{ backgroundColor: getDifficultyColor(problem.difficulty) }}
                  >
                    {problem.difficulty}
                  </span>
                  <span className="marks">{problem.marks} marks</span>
                  <span className="time-limit">{problem.time_limit} mins</span>
                </div>
              </div>
              <div className="problem-status">
                {isAnswered(problem.id) ? (
                  <span className="status-answered">✓ Answered</span>
                ) : (
                  <span className="status-pending">Not answered</span>
                )}
              </div>
              <button className="btn-solve">Solve</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PythonProblems
