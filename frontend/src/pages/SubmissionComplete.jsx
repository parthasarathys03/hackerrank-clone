import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import './SubmissionComplete.css'

function SubmissionComplete() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [userName, setUserName] = useState('')
  const isAutoSubmit = searchParams.get('auto') === 'true'

  useEffect(() => {
    const name = localStorage.getItem('user_name')
    if (name) {
      setUserName(name)
    }
  }, [])

  const handleLogout = () => {
    localStorage.clear()
    navigate('/login')
  }

  const handleBackToLogin = () => {
    localStorage.clear()
    navigate('/login')
  }

  return (
    <div className="submission-complete-page">
      <div className="submission-content">
        <div className="success-icon">
          {isAutoSubmit ? '⏰' : '✓'}
        </div>
        
        <h1>
          {isAutoSubmit ? 'Time\'s Up!' : 'Exam Submitted Successfully!'}
        </h1>
        
        <p className="submission-message">
          {isAutoSubmit 
            ? 'Your exam has been automatically submitted as the time expired.'
            : 'Your exam has been submitted successfully.'}
        </p>

        {userName && (
          <p className="candidate-name">
            Candidate: <strong>{userName}</strong>
          </p>
        )}

        <div className="info-card">
          <h3>What's Next?</h3>
          <ul>
            <li>Your submission has been recorded</li>
            <li>The HR team will review your answers</li>
            <li>Results will be communicated via email</li>
          </ul>
        </div>

        <div className="submission-details">
          <div className="detail-item">
            <span className="detail-label">Submission Type</span>
            <span className="detail-value">
              {isAutoSubmit ? 'Auto-Submit (Timer Expired)' : 'Manual Submit'}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Submission Time</span>
            <span className="detail-value">
              {new Date().toLocaleString()}
            </span>
          </div>
        </div>

        <div className="thank-you-message">
          <p>Thank you for completing the assessment!</p>
          <p className="good-luck">Best of luck!</p>
        </div>

        <button onClick={handleBackToLogin} className="btn-finish">
          Finish & Exit
        </button>
      </div>
    </div>
  )
}

export default SubmissionComplete
