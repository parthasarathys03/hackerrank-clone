import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './HRLogin.css'

function HRLogin() {
  const [hrName, setHrName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (!hrName.trim() && !password.trim()) {
      setError('Please enter HR Name and Password')
      return
    }

    if (!hrName.trim()) {
      setError('Please enter HR Name')
      return
    }

    if (!password.trim()) {
      setError('Please enter Password')
      return
    }

    // Simple dummy login - just store and navigate
    localStorage.setItem('hr_name', hrName)
    localStorage.setItem('hr_logged_in', 'true')
    navigate('/hr/dashboard')
  }

  return (
    <div className="hr-login-container">
      <div className="hr-login-box">
        <h1>HR Portal</h1>
        <p className="hr-subtitle">Sign in to manage coding questions</p>

        <form onSubmit={handleSubmit}>
          <div className="hr-form-group">
            <label htmlFor="hrName">HR Name</label>
            <input
              id="hrName"
              type="text"
              value={hrName}
              onChange={(e) => setHrName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>

          <div className="hr-form-group">
            <label htmlFor="hrPassword">Password</label>
            <input
              id="hrPassword"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>

          {error && <div className="hr-error-message">{error}</div>}

          <button type="submit">Sign In</button>
        </form>
      </div>
    </div>
  )
}

export default HRLogin
