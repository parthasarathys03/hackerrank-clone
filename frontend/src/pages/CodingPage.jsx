import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { getProblem, runCode, submitCode, runSql, submitSql } from '../api'
import './CodingPage.css'

function CodingPage() {
  const { problemId } = useParams()
  const navigate = useNavigate()

  const [problem, setProblem] = useState(null)
  const [code, setCode] = useState('')
  const [starterCode, setStarterCode] = useState('')
  const [customInput, setCustomInput] = useState('')
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitResult, setSubmitResult] = useState(null)
  const [userName, setUserName] = useState('')
  const [showInputRequired, setShowInputRequired] = useState(false)
  const [elapsedTime, setElapsedTime] = useState(0)
  const startTimeRef = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    // Check if user is logged in
    const name = localStorage.getItem('user_name')

    if (!name) {
      navigate('/login')
      return
    }

    setUserName(name)
    loadProblem()

    // Start timer
    startTimeRef.current = Date.now()
    timerRef.current = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000))
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [problemId, navigate])

  const getTimeTaken = () => {
    return startTimeRef.current ? Math.floor((Date.now() - startTimeRef.current) / 1000) : 0
  }

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const loadProblem = async () => {
    try {
      const data = await getProblem(problemId)
      setProblem(data)
      setCode(data.starter_code)
      setStarterCode(data.starter_code)
      // Only set custom input for Python problems
      if (data.language === 'python') {
        setCustomInput(data.sample_input)
      }
    } catch (err) {
      setError('Failed to load problem')
      console.error(err)
    }
  }

  const handleRun = async () => {
    setLoading(true)
    setOutput('')
    setError('')
    setSubmitResult(null)
    setShowInputRequired(false)

    try {
      // Handle SQL problems
      if (problem.language === 'sql') {
        const result = await runSql(problemId, code)
        
        if (result.status === 'success') {
          // Format SQL result set as table
          let outputText = ''
          if (result.columns && result.columns.length > 0) {
            outputText += result.columns.join(' | ') + '\n'
            outputText += result.columns.map(() => '---').join(' | ') + '\n'
            
            if (result.rows && result.rows.length > 0) {
              result.rows.forEach(row => {
                outputText += row.join(' | ') + '\n'
              })
            } else {
              outputText += '(no rows returned)\n'
            }
          } else {
            outputText = '(no columns returned)'
          }
          setOutput(outputText)
        } else {
          setOutput(result.error || 'Unknown error')
        }
        return
      }

      // Handle Python problems (existing logic)
      const result = await runCode(code, customInput)
      
      // Check for INPUT_REQUIRED error
      if (result.error === 'INPUT_REQUIRED') {
        setShowInputRequired(true)
        setOutput('')
        return
      }
      
      if (result.status === 'success') {
        setOutput(result.stdout || '(no output)')
        if (result.stderr) {
          setOutput(prev => prev + '\n\nWarnings:\n' + result.stderr)
        }
      } else {
        setOutput(result.stderr || result.stdout || 'Unknown error')
      }
    } catch (err) {
      setError('Failed to run code: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleUseSampleInput = () => {
    setCustomInput(problem.sample_input)
    setShowInputRequired(false)
    // Automatically trigger run after setting sample input
    setTimeout(() => handleRun(), 100)
  }

  const handleSubmit = async () => {
    const sessionId = localStorage.getItem('session_id')
    
    if (!sessionId) {
      navigate('/login')
      return
    }

    setLoading(true)
    setOutput('')
    setError('')
    setSubmitResult(null)
    setShowInputRequired(false)

    try {
      // Handle SQL problems
      if (problem.language === 'sql') {
        const result = await submitSql(sessionId, problemId, code, getTimeTaken())
        setSubmitResult(result)
        
        let outputText = `✓ Submission Complete\n\n`
        outputText += `Current Score: ${result.score.toFixed(2)}%\n`
        outputText += `Best Score: ${result.best_score.toFixed(2)}%\n`
        
        if (result.is_new_best) {
          outputText += `🎉 New Best Score!\n\n`
        } else {
          outputText += `\n`
        }
        
        outputText += `Passed: ${result.passed_tests}/${result.total_tests} test cases\n\n`
        
        if (result.failed_details && result.failed_details.length > 0) {
          outputText += `Failed Test Cases:\n`
          result.failed_details.forEach((detail, idx) => {
            outputText += `\nTest Case ${detail.test_case}:\n`
            if (detail.error) {
              outputText += `Error: ${detail.error}\n`
            } else {
              outputText += `Expected: ${detail.expected}\n`
              outputText += `Actual: ${detail.actual}\n`
            }
          })
        } else {
          outputText += `✓ All test cases passed!`
        }
        
        setOutput(outputText)
        return
      }

      // Handle Python problems (existing logic)
      const result = await submitCode(sessionId, problemId, code, getTimeTaken())
      setSubmitResult(result)
      
      let outputText = `✓ Submission Complete\n\n`
      outputText += `Current Score: ${result.score.toFixed(2)}%\n`
      outputText += `Best Score: ${result.best_score.toFixed(2)}%\n`
      
      if (result.is_new_best) {
        outputText += `🎉 New Best Score!\n\n`
      } else {
        outputText += `\n`
      }
      
      outputText += `Passed: ${result.passed_tests}/${result.total_tests} test cases\n\n`
      
      if (result.failed_details && result.failed_details.length > 0) {
        outputText += `Failed Test Cases:\n`
        result.failed_details.forEach((detail, idx) => {
          outputText += `\nTest Case ${detail.test_case}:\n`
          if (detail.error) {
            outputText += `Error: ${detail.error}\n`
          } else {
            outputText += `Expected: ${detail.expected}\n`
            outputText += `Actual: ${detail.actual}\n`
          }
        })
      } else {
        outputText += `✓ All test cases passed!`
      }
      
      setOutput(outputText)
    } catch (err) {
      setError('Failed to submit code: ' + (err.response?.data?.detail || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setCode(starterCode)
    setOutput('')
    setError('')
    setSubmitResult(null)
  }

  const handleLogout = () => {
    localStorage.clear()
    navigate('/login')
  }

  if (!problem) {
    return <div className="loading">Loading problem...</div>
  }

  return (
    <div className="coding-page">
      <div className="header">
        <h1>{problem.title}</h1>
        <div className="user-info">
          <span className="timer">{formatTime(elapsedTime)}</span>
          <span>{userName}</span>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </div>

      <div className="main-content">
        <div className="problem-panel">
          <div className="problem-content">
            <h2>Problem Statement</h2>
            <div className="problem-text">
              <pre>{problem.statement}</pre>
            </div>

            <h3>Input Format</h3>
            <pre className="format-text">{problem.input_format}</pre>

            <h3>Output Format</h3>
            <pre className="format-text">{problem.output_format}</pre>

            <h3>Sample Input</h3>
            <pre className="sample-text">{problem.sample_input}</pre>

            <h3>Sample Output</h3>
            <pre className="sample-text">{problem.sample_output}</pre>
          </div>
        </div>

        <div className="editor-panel">
          <div className="editor-header">
            <span>Language: {problem.language === 'sql' ? 'SQL' : 'Python'}</span>
          </div>
          <div className="editor-container">
            <Editor
              height="100%"
              defaultLanguage={problem.language === 'sql' ? 'sql' : 'python'}
              value={code}
              onChange={(value) => setCode(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
              }}
            />
          </div>
        </div>
      </div>

      <div className="bottom-section">
        {problem.language === 'python' && (
          <div className="custom-input-section">
            <label>Custom Input</label>
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Enter custom input here..."
              rows={4}
            />
          </div>
        )}

        {problem.language === 'sql' && (
          <div className="sql-note">
            <p><strong>Note:</strong> Write standard SQL only. Database-specific syntax (PostgreSQL / MySQL features) is not supported.</p>
          </div>
        )}

        <div className="action-buttons">
          <button onClick={handleRun} disabled={loading} className="btn-run">
            {loading ? 'Running...' : 'Run'}
          </button>
          <button onClick={handleSubmit} disabled={loading} className="btn-submit">
            {loading ? 'Submitting...' : 'Submit'}
          </button>
          <button onClick={handleReset} disabled={loading} className="btn-reset">
            Reset Code
          </button>
        </div>

        <div className="output-section">
          <h3>Output</h3>
          {error && <div className="error-output">{error}</div>}
          {showInputRequired && (
            <div className="input-required-message">
              <p>Input is required to run the code.</p>
              <button onClick={handleUseSampleInput} className="btn-use-sample">
                Use Sample Input & Run
              </button>
            </div>
          )}
          <pre className="output-content">{output || '// Output will appear here'}</pre>
        </div>
      </div>
    </div>
  )
}

export default CodingPage
