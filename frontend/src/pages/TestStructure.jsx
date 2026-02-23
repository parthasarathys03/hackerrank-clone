import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getExamStatus, getExamSummary, submitExam } from '../api'
import './TestStructure.css'

function TestStructure() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('')
  const [remainingTime, setRemainingTime] = useState(0)
  const [examSummary, setExamSummary] = useState(null)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
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
    loadExamData()

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
          // Update localStorage for persistence
          localStorage.setItem('exam_remaining', prev - 1)
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [remainingTime, handleAutoSubmit])

  const loadExamData = async () => {
    try {
      const sessionId = localStorage.getItem('session_id')
      
      // Get exam status to check remaining time
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
      
      // Load exam summary
      const summary = await getExamSummary()
      setExamSummary(summary)
      
    } catch (err) {
      console.error('Failed to load exam data', err)
    }
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getTimerClass = () => {
    if (remainingTime <= 300) return 'timer critical' // 5 mins
    if (remainingTime <= 900) return 'timer warning' // 15 mins
    return 'timer'
  }

  const handleManualSubmit = async () => {
    setSubmitting(true)
    const sessionId = localStorage.getItem('session_id')
    const answers = JSON.parse(localStorage.getItem('exam_answers') || '{}')
    
    const answersList = Object.entries(answers).map(([problemId, data]) => ({
      problem_id: problemId,
      code: data.code || '',
      language: data.language || 'python'
    }))

    try {
      await submitExam(sessionId, answersList, false)
      localStorage.removeItem('exam_answers')
      localStorage.removeItem('exam_start_time')
      localStorage.removeItem('exam_remaining')
      navigate('/submission-complete')
    } catch (err) {
      console.error('Submit failed', err)
      alert('Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
      setShowSubmitConfirm(false)
    }
  }

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout? Your exam progress will be lost.')) {
      localStorage.clear()
      navigate('/login')
    }
  }

  const getAnsweredCount = (language) => {
    const answers = JSON.parse(localStorage.getItem('exam_answers') || '{}')
    return Object.values(answers).filter(a => a.language === language).length
  }

  return (
    <div className="test-structure-page">
      <div className="header">
        <h1>Coding Assessment</h1>
        <div className="header-right">
          <div className={getTimerClass()}>
            <span className="timer-icon">⏱️</span>
            <span className="timer-value">{formatTime(remainingTime)}</span>
          </div>
          <span className="user-name">{userName}</span>
          <button onClick={() => setShowSubmitConfirm(true)} className="btn-submit-exam">
            Submit Exam
          </button>
        </div>
      </div>

      <div className="test-structure-content">
        <h2>Choose Assessment Section</h2>
        <p className="section-subtitle">Select a section to view and solve problems</p>

        <div className="sections-grid">
          <div 
            className="section-card python"
            onClick={() => navigate('/problems/python')}
          >
            <div className="section-icon">🐍</div>
            <h3>Python Problems</h3>
            <p className="section-count">
              {examSummary?.python_questions || 0} Questions
            </p>
            <div className="section-progress">
              <span className="answered">
                {getAnsweredCount('python')} answered
              </span>
            </div>
            <button className="btn-section">View Problems</button>
          </div>

          <div 
            className="section-card sql"
            onClick={() => navigate('/problems/sql')}
          >
            <div className="section-icon">🗄️</div>
            <h3>SQL Problems</h3>
            <p className="section-count">
              {examSummary?.sql_questions || 0} Questions
            </p>
            <div className="section-progress">
              <span className="answered">
                {getAnsweredCount('sql')} answered
              </span>
            </div>
            <button className="btn-section">View Problems</button>
          </div>
        </div>

        <div className="exam-tips">
          <h4>Tips</h4>
          <ul>
            <li>You can switch between sections anytime</li>
            <li>Your code is auto-saved as you type</li>
            <li>Submit each problem individually or submit all at once</li>
            <li>Keep an eye on the timer above</li>
          </ul>
        </div>
      </div>

      {showSubmitConfirm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Submit Exam?</h3>
            <p>Are you sure you want to submit your exam? This action cannot be undone.</p>
            <p className="time-remaining">Time remaining: {formatTime(remainingTime)}</p>
            <div className="modal-buttons">
              <button 
                onClick={() => setShowSubmitConfirm(false)} 
                className="btn-cancel"
                disabled={submitting}
              >
                Cancel
              </button>
              <button 
                onClick={handleManualSubmit} 
                className="btn-confirm"
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Confirm Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default TestStructure
