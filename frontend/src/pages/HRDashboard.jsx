import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'
import './HRDashboard.css'

const PYTHON_TEMPLATE = `{
  "id": "your_problem_id",
  "title": "Your Problem Title",
  "language": "python",
  "statement": "Describe the problem here.\\n\\n**Constraints:**\\n- constraint 1\\n- constraint 2",
  "input_format": "Describe the input format",
  "output_format": "Describe the expected output",
  "sample_input": "5\\n1 2 3 4 5",
  "sample_output": "15",
  "starter_code": "# Write your code here\\n",
  "test_cases": [
    { "input": "5\\n1 2 3 4 5", "output": "15" },
    { "input": "3\\n10 20 30", "output": "60" }
  ]
}`

const SQL_TEMPLATE = `{
  "id": "your_sql_problem_id",
  "title": "Your SQL Problem Title",
  "language": "sql",
  "statement": "Describe the SQL problem here.\\n\\n**Table Schema:**\\n\\n\\\`\\\`\\\`sql\\nCREATE TABLE example (id INTEGER, name TEXT);\\n\\\`\\\`\\\`",
  "input_format": "Use the predefined table.",
  "output_format": "Return columns: col1, col2",
  "sample_input": "N/A (Schema and seed data are provided)",
  "sample_output": "col1 | col2\\nval1 | val2",
  "starter_code": "SELECT * FROM example;",
  "schema_sql": "CREATE TABLE example (\\n  id INTEGER,\\n  name TEXT\\n);",
  "seed_sql": "INSERT INTO example VALUES\\n(1, 'Alice'),\\n(2, 'Bob');",
  "test_cases": [
    {
      "expected_columns": ["col1", "col2"],
      "expected_rows": [["val1", "val2"]]
    }
  ]
}`

function HRDashboard() {
  const navigate = useNavigate()
  const [hrName, setHrName] = useState('')
  const [problems, setProblems] = useState([])
  const [activeTab, setActiveTab] = useState('python')
  const [showAdd, setShowAdd] = useState(false)
  const [jsonInput, setJsonInput] = useState('')
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const loggedIn = localStorage.getItem('hr_logged_in')
    const name = localStorage.getItem('hr_name')

    if (!loggedIn) {
      navigate('/hr')
      return
    }

    setHrName(name)
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

  const handleDelete = async (problemId, title) => {
    if (!window.confirm(`Delete "${title}"?`)) return

    try {
      await api.delete(`/hr/problems/${problemId}`)
      setSuccess(`"${title}" deleted`)
      setError('')
      loadProblems()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete')
      setSuccess('')
    }
  }

  const handleAdd = async () => {
    setError('')
    setSuccess('')

    if (!jsonInput.trim()) {
      setError('Paste the filled JSON here')
      return
    }

    let parsed
    try {
      parsed = JSON.parse(jsonInput)
    } catch (e) {
      setError('Invalid JSON. Please check the format and try again.')
      return
    }

    if (!parsed.id || !parsed.title || !parsed.language) {
      setError('JSON must have "id", "title", and "language" fields')
      return
    }

    try {
      await api.post('/hr/problems', parsed)
      setSuccess(`"${parsed.title}" added successfully!`)
      setJsonInput('')
      setShowAdd(false)
      loadProblems()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add problem')
    }
  }

  const handleCopyTemplate = () => {
    const template = activeTab === 'python' ? PYTHON_TEMPLATE : SQL_TEMPLATE
    navigator.clipboard.writeText(template)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLogout = () => {
    localStorage.removeItem('hr_name')
    localStorage.removeItem('hr_logged_in')
    navigate('/hr')
  }

  const openAdd = () => {
    setShowAdd(true)
    setJsonInput('')
    setError('')
    setSuccess('')
  }

  const filtered = problems.filter(p => p.language === activeTab)
  const template = activeTab === 'python' ? PYTHON_TEMPLATE : SQL_TEMPLATE

  return (
    <div className="hr-dashboard">
      <div className="hr-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1>HR Dashboard</h1>
          <button onClick={() => navigate('/hr/results')} className="hr-btn-results">Candidate Results</button>
        </div>
        <div className="hr-user-info">
          <span>{hrName}</span>
          <button onClick={handleLogout} className="hr-btn-logout">Logout</button>
        </div>
      </div>

      <div className="hr-content">
        {success && <div className="hr-success-msg">{success}</div>}
        {error && !showAdd && <div className="hr-error-msg">{error}</div>}

        <div className="hr-tabs">
          <button
            className={`hr-tab ${activeTab === 'python' ? 'active' : ''}`}
            onClick={() => { setActiveTab('python'); setShowAdd(false); setSuccess(''); setError('') }}
          >
            Python
          </button>
          <button
            className={`hr-tab ${activeTab === 'sql' ? 'active' : ''}`}
            onClick={() => { setActiveTab('sql'); setShowAdd(false); setSuccess(''); setError('') }}
          >
            SQL
          </button>
        </div>

        <div className="hr-actions">
          <span className="hr-count">{filtered.length} question{filtered.length !== 1 ? 's' : ''}</span>
          {!showAdd && (
            <button onClick={openAdd} className="hr-btn-add">+ Add Question</button>
          )}
        </div>

        {showAdd && (
          <div className="hr-add-section">
            <div className="hr-add-header">
              <h3>Add {activeTab === 'python' ? 'Python' : 'SQL'} Question</h3>
              <button onClick={() => setShowAdd(false)} className="hr-btn-cancel">Cancel</button>
            </div>

            <div className="hr-template-box">
              <div className="hr-template-top">
                <span className="hr-template-label">Copy this format, fill it using ChatGPT, then paste below</span>
                <button onClick={handleCopyTemplate} className="hr-btn-copy">
                  {copied ? 'Copied!' : 'Copy Format'}
                </button>
              </div>
              <pre className="hr-template-code">{template}</pre>
            </div>

            <div className="hr-paste-section">
              <label>Paste filled JSON here:</label>
              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder="Paste the completed JSON here..."
                rows={10}
                className="hr-json-input"
              />
              {error && <div className="hr-error-msg">{error}</div>}
              <button onClick={handleAdd} className="hr-btn-submit">Add Question</button>
            </div>
          </div>
        )}

        <div className="hr-problems-list">
          {filtered.length === 0 && !showAdd ? (
            <p className="hr-no-problems">No {activeTab.toUpperCase()} questions found.</p>
          ) : (
            filtered.map((p) => (
              <div key={p.id} className="hr-problem-item">
                <div className="hr-problem-info">
                  <h3>{p.title}</h3>
                  <span className="hr-problem-id">{p.id}</span>
                </div>
                <button
                  onClick={() => handleDelete(p.id, p.title)}
                  className="hr-btn-delete"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default HRDashboard
