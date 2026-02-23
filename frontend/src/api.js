import axios from 'axios'

const API_BASE_URL = 'http://127.0.0.1:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

export const login = async (name, email) => {
  const response = await api.post('/login', { name, email })
  return response.data
}

export const getProblem = async (problemId) => {
  const response = await api.get(`/problems/${problemId}`)
  return response.data
}

export const runCode = async (code, customInput) => {
  const response = await api.post('/run', { code, custom_input: customInput })
  return response.data
}

export const submitCode = async (sessionId, problemId, code, timeTaken) => {
  const response = await api.post('/submit', {
    session_id: sessionId,
    problem_id: problemId,
    code,
    time_taken: timeTaken || 0,
  })
  return response.data
}

// SQL API functions
export const runSql = async (problemId, query) => {
  const response = await api.post('/sql/run', { problem_id: problemId, query })
  return response.data
}

export const submitSql = async (sessionId, problemId, query, timeTaken) => {
  const response = await api.post('/sql/submit', {
    session_id: sessionId,
    problem_id: problemId,
    query,
    time_taken: timeTaken || 0,
  })
  return response.data
}

// Exam session API functions
export const getExamSummary = async () => {
  const response = await api.get('/exam/summary')
  return response.data
}

export const getPythonProblems = async () => {
  const response = await api.get('/problems/python')
  return response.data
}

export const getSqlProblems = async () => {
  const response = await api.get('/problems/sql')
  return response.data
}

export const startExam = async (sessionId) => {
  const response = await api.post('/exam/start', { session_id: sessionId })
  return response.data
}

export const getExamStatus = async (sessionId) => {
  const response = await api.get(`/exam/status?session_id=${sessionId}`)
  return response.data
}

export const saveExamAnswer = async (sessionId, problemId, code) => {
  const response = await api.post(`/exam/save-answer?session_id=${sessionId}&problem_id=${problemId}&code=${encodeURIComponent(code)}`)
  return response.data
}

export const submitExam = async (sessionId, answers, autoSubmit = false) => {
  const response = await api.post('/exam/submit', {
    session_id: sessionId,
    answers: answers,
    auto_submit: autoSubmit,
  })
  return response.data
}

export default api
