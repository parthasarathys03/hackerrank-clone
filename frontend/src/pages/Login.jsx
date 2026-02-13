import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../api'
import './Login.css'

function Login() {
  const [username, setUsername] = useState('')
  const [gmail, setGmail] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!username.trim() && !gmail.trim()) {
      setError('Please enter User Name and Gmail')
      return
    }

    if (!username.trim()) {
      setError('Please enter User Name')
      return
    }

    if (!gmail.trim()) {
      setError('Please enter Gmail')
      return
    }

    try {
      const response = await login(username, gmail)
      localStorage.setItem('session_id', response.session_id)
      localStorage.setItem('user_id', response.user_id)
      localStorage.setItem('user_name', response.name)
      localStorage.setItem('user_email', response.email)
      navigate('/problems')
    } catch (err) {
      setError('Login failed. Please try again.')
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Coding Test Platform</h1>
        <p className="subtitle">Sign in to start your coding test</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">User Name</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your User Name"
            />
          </div>

          <div className="form-group">
            <label htmlFor="gmail">Gmail</label>
            <input
              id="gmail"
              type="text"
              value={gmail}
              onChange={(e) => setGmail(e.target.value)}
              placeholder="Enter your Gmail"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit">Sign In</button>
        </form>
      </div>
    </div>
  )
}

export default Login
