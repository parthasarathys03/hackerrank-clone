import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import './HRResults.css'

function getCategory(score) {
  if (score >= 80) return { label: 'Good', className: 'cat-good' }
  if (score >= 50) return { label: 'Medium', className: 'cat-medium' }
  return { label: 'Average', className: 'cat-average' }
}

function getVerdictClass(verdict) {
  switch (verdict) {
    case 'Accepted': return 'verdict-accepted'
    case 'Partial': return 'verdict-partial'
    case 'Failed': return 'verdict-failed'
    default: return 'verdict-pending'
  }
}

function formatTime(seconds) {
  if (!seconds || seconds === 0) return '--'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

function formatExecTime(ms) {
  if (!ms || ms === 0) return '--'
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}

function HRResults() {
  const navigate = useNavigate()
  const [results, setResults] = useState([])
  const [hrName, setHrName] = useState('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    const loggedIn = localStorage.getItem('hr_logged_in')
    const name = localStorage.getItem('hr_name')

    if (!loggedIn) {
      navigate('/hr')
      return
    }

    setHrName(name)
    loadResults()
  }, [navigate])

  const loadResults = async () => {
    try {
      const response = await api.get('/hr/results')
      setResults(response.data)
    } catch (err) {
      console.error('Failed to load results', err)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('hr_name')
    localStorage.removeItem('hr_logged_in')
    navigate('/hr')
  }

  const handleDownloadPDF = async () => {
    setDownloading(true)
    try {
      const response = await api.get('/hr/report/pdf', {
        responseType: 'blob'
      })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `candidate_report_${new Date().toISOString().split('T')[0]}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download PDF', err)
      alert('Failed to generate PDF report')
    } finally {
      setDownloading(false)
    }
  }

  // Group results by user
  const userMap = {}
  results.forEach(r => {
    const key = r.email
    if (!userMap[key]) {
      userMap[key] = { name: r.name, email: r.email, problems: [], totalScore: 0, count: 0 }
    }
    userMap[key].problems.push(r)
    userMap[key].totalScore += r.best_score
    userMap[key].count += 1
  })

  const users = Object.values(userMap).map(u => ({
    ...u,
    avgScore: u.count > 0 ? u.totalScore / u.count : 0,
    category: getCategory(u.count > 0 ? u.totalScore / u.count : 0)
  })).sort((a, b) => b.avgScore - a.avgScore)

  return (
    <div className="hr-results-page">
      <div className="hr-header">
        <div className="hr-header-left">
          <h1>Candidate Results</h1>
          <button onClick={() => navigate('/hr/dashboard')} className="hr-btn-back">Dashboard</button>
          <button 
            onClick={handleDownloadPDF} 
            className="hr-btn-pdf"
            disabled={downloading || results.length === 0}
          >
            {downloading ? 'Generating...' : 'Download PDF Report'}
          </button>
        </div>
        <div className="hr-user-info">
          <span>{hrName}</span>
          <button onClick={handleLogout} className="hr-btn-logout">Logout</button>
        </div>
      </div>

      <div className="hr-results-content">
        {users.length === 0 ? (
          <p className="hr-no-results">No submissions yet.</p>
        ) : (
          users.map((user) => (
            <div key={user.email} className="hr-candidate-card">
              <div className="hr-candidate-header">
                <div className="hr-candidate-info">
                  <h2>{user.name}</h2>
                  <span className="hr-candidate-email">{user.email}</span>
                </div>
                <div className="hr-candidate-stats">
                  <span className={`hr-category-badge ${user.category.className}`}>
                    {user.category.label}
                  </span>
                  <span className="hr-avg-score">Avg: {user.avgScore.toFixed(1)}%</span>
                </div>
              </div>

              <table className="hr-results-table">
                <thead>
                  <tr>
                    <th>Problem</th>
                    <th>Score</th>
                    <th>Test Cases</th>
                    <th>Verdict</th>
                    <th>Exec Time</th>
                    <th>Time Taken</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {user.problems.map((p) => {
                    return (
                      <tr key={p.problem_id}>
                        <td className="hr-td-problem">{p.problem_id}</td>
                        <td>
                          <span className={`hr-score ${p.best_score === 100 ? 'perfect' : p.best_score >= 50 ? 'good' : 'low'}`}>
                            {p.best_score.toFixed(1)}%
                          </span>
                        </td>
                        <td>{p.passed_tests}/{p.total_tests}</td>
                        <td>
                          <span className={`hr-verdict ${getVerdictClass(p.verdict)}`}>
                            {p.verdict}
                          </span>
                        </td>
                        <td>{formatExecTime(p.execution_time_ms)}</td>
                        <td>{formatTime(p.time_taken)}</td>
                        <td className="hr-td-date">{new Date(p.updated_at).toLocaleString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default HRResults
