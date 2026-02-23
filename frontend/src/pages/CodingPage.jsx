import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { getProblem, runCode, submitCode, runSql, submitSql, getExamStatus, submitExam } from '../api'
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
  const [remainingTime, setRemainingTime] = useState(0)
  const [isExamMode, setIsExamMode] = useState(false)
  const timerRef = useRef(null)
  const autoSaveRef = useRef(null)

  const handleAutoSubmit = useCallback(async () => {
    const sessionId = localStorage.getItem('session_id')
    const answers = JSON.parse(localStorage.getItem('exam_answers') || '{}')
    
    const answersList = Object.entries(answers).map(([pid, data]) => ({
      problem_id: pid,
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

    if (!name) {
      navigate('/login')
      return
    }

    setUserName(name)
    checkExamStatus()
    loadProblem()

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    }
  }, [problemId, navigate])

  useEffect(() => {
    if (isExamMode && remainingTime > 0) {
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
  }, [isExamMode, remainingTime, handleAutoSubmit])

  // Auto-save code when it changes
  useEffect(() => {
    if (isExamMode && problem && code !== starterCode) {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
      
      autoSaveRef.current = setTimeout(() => {
        const answers = JSON.parse(localStorage.getItem('exam_answers') || '{}')
        answers[problemId] = {
          code: code,
          language: problem.language
        }
        localStorage.setItem('exam_answers', JSON.stringify(answers))
      }, 500) // Auto-save after 500ms of no typing
    }

    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current)
    }
  }, [code, isExamMode, problemId, problem, starterCode])

  const checkExamStatus = async () => {
    try {
      const sessionId = localStorage.getItem('session_id')
      const status = await getExamStatus(sessionId)
      
      if (status.status === 'active') {
        setIsExamMode(true)
        setRemainingTime(status.remaining_seconds)
      } else if (status.status === 'expired') {
        handleAutoSubmit()
      }
    } catch (err) {
      // Not in exam mode, continue normally
      console.log('Not in exam mode')
    }
  }

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getTimerClass = () => {
    if (remainingTime <= 300) return 'global-timer critical'
    if (remainingTime <= 900) return 'global-timer warning'
    return 'global-timer'
  }

  const loadProblem = async () => {
    try {
      const data = await getProblem(problemId)
      setProblem(data)
      
      // Check if there's a saved answer
      const answers = JSON.parse(localStorage.getItem('exam_answers') || '{}')
      if (answers[problemId]) {
        setCode(answers[problemId].code)
      } else {
        setCode(data.starter_code)
      }
      setStarterCode(data.starter_code)
      
      if (data.language === 'python') {
        setCustomInput(data.sample_input)
      }
    } catch (err) {
      setError('Failed to load problem')
      console.error(err)
    }
  }

  const handleBack = () => {
    if (problem?.language === 'sql') {
      navigate('/problems/sql')
    } else {
      navigate('/problems/python')
    }
  }

  const handleRun = async () => {
    setLoading(true)
    setOutput('')
    setError('')
    setSubmitResult(null)
    setShowInputRequired(false)

    try {
      if (problem.language === 'sql') {
        const result = await runSql(problemId, code)
        
        if (result.status === 'success') {
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

      const result = await runCode(code, customInput)
      
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
      let result
      if (problem.language === 'sql') {
        result = await submitSql(sessionId, problemId, code, remainingTime > 0 ? 7200 - remainingTime : 0)
      } else {
        result = await submitCode(sessionId, problemId, code, remainingTime > 0 ? 7200 - remainingTime : 0)
      }
      
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
        result.failed_details.forEach((detail) => {
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
      
      // Update saved answer after successful submit
      if (isExamMode) {
        const answers = JSON.parse(localStorage.getItem('exam_answers') || '{}')
        answers[problemId] = {
          code: code,
          language: problem.language
        }
        localStorage.setItem('exam_answers', JSON.stringify(answers))
      }
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
        <div className="header-left">
          {isExamMode && (
            <button onClick={handleBack} className="btn-back-coding">
              ← Back
            </button>
          )}
          <h1>{problem.title}</h1>
        </div>
        <div className="user-info">
          {isExamMode && (
            <div className={getTimerClass()}>
              <span className="timer-icon">⏱️</span>
              <span className="timer-value">{formatTime(remainingTime)}</span>
            </div>
          )}
          <span>{userName}</span>
          {!isExamMode && (
            <button onClick={handleLogout} className="btn-logout">Logout</button>
          )}
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
            {isExamMode && <span className="auto-save-indicator">Auto-saving...</span>}
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
