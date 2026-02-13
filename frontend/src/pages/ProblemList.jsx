import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import './ProblemList.css'

function ProblemList() {
  const navigate = useNavigate()
  const [userName, setUserName] = useState('')
  const [problems, setProblems] = useState([])

  useEffect(() => {
    const name = localStorage.getItem('user_name')

    if (!name) {
      navigate('/login')
      return
    }

    setUserName(name)
    loadProblems()
  }, [navigate])

  const loadProblems = async () => {
    try {
      const response = await api.get('/hr/problems')
      setProblems(response.data)
    } catch (err) {
      console.error('Failed to load problems', err)
    }
  }

  const handleLogout = () => {
    localStorage.clear()
    navigate('/login')
  }

  return (
    <div className="problem-list-page">
      <div className="header">
        <h1>Coding Test Platform</h1>
        <div className="user-info">
          <span>{userName}</span>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </div>

      <div className="problem-list-container">
        <h2>Select a Problem</h2>
        <div className="problems-grid">
          {problems.map((problem) => (
            <div
              key={problem.id}
              className="problem-card"
              onClick={() => navigate(`/coding/${problem.id}`)}
            >
              <div className="problem-header">
                <h3>{problem.title}</h3>
                <span className={`language-badge ${problem.language.toLowerCase()}`}>
                  {problem.language}
                </span>
              </div>
              <div className="problem-footer">
                <span className="difficulty">{problem.difficulty}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ProblemList
