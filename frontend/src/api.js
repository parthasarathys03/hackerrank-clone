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

export default api
