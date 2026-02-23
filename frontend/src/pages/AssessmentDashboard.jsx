import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import FilterBar from '../components/assessment/FilterBar'
import StatCards from '../components/assessment/StatCards'
import TestSummaryTable from '../components/assessment/TestSummaryTable'
import DifficultyTable from '../components/assessment/DifficultyTable'
import ProblemDetailTable from '../components/assessment/ProblemDetailTable'
import ColorLegend from '../components/assessment/ColorLegend'
import { getAssessmentResults, exportAssessmentResults, initSampleData } from '../services/assessmentApi'
import './AssessmentDashboard.css'

function AssessmentDashboard() {
  const navigate = useNavigate()
  const [results, setResults] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [filteredCount, setFilteredCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [hrName, setHrName] = useState('')
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    verdict: 'All',
    submission_type: 'All'
  })

  useEffect(() => {
    // Check HR login
    const loggedIn = localStorage.getItem('hr_logged_in')
    const name = localStorage.getItem('hr_name')

    if (!loggedIn) {
      navigate('/hr')
      return
    }

    setHrName(name || 'HR User')
    loadResults()
  }, [navigate])

  const loadResults = async (currentFilters = {}) => {
    setLoading(true)
    try {
      const response = await getAssessmentResults(currentFilters)
      setResults(response.data || [])
      setFilteredCount(response.total || 0)
      
      // Get total count (unfiltered)
      if (Object.keys(currentFilters).length === 0 || 
          (currentFilters.verdict === 'All' && currentFilters.submission_type === 'All' && 
           !currentFilters.date_from && !currentFilters.date_to)) {
        setTotalCount(response.total || 0)
      }
    } catch (err) {
      console.error('Failed to load results:', err)
      // If no data, try to initialize sample data
      if (err.response?.status === 500 || results.length === 0) {
        try {
          await initSampleData()
          const response = await getAssessmentResults()
          setResults(response.data || [])
          setTotalCount(response.total || 0)
          setFilteredCount(response.total || 0)
        } catch (initErr) {
          console.error('Failed to init sample data:', initErr)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const handleApplyFilter = () => {
    loadResults(filters)
  }

  const handleResetFilter = () => {
    const resetFilters = {
      date_from: '',
      date_to: '',
      verdict: 'All',
      submission_type: 'All'
    }
    setFilters(resetFilters)
    loadResults(resetFilters)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportAssessmentResults(filters)
    } catch (err) {
      console.error('Failed to export:', err)
      alert('Failed to export Excel report')
    } finally {
      setExporting(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('hr_name')
    localStorage.removeItem('hr_logged_in')
    navigate('/hr')
  }

  // Calculate stats from current results
  const stats = {
    total: results.length,
    good: results.filter(r => r.overall_verdict === 'Good').length,
    average: results.filter(r => r.overall_verdict === 'Average').length,
    belowAverage: results.filter(r => r.overall_verdict === 'Below Average').length,
    autoSubmitted: results.filter(r => r.submission_type === 'Auto').length
  }

  return (
    <div className="assessment-dashboard">
      {/* Top Navigation */}
      <header className="assessment-nav">
        <div className="nav-left">
          <h1>Assessment Dashboard</h1>
        </div>
        <div className="nav-right">
          <span className="user-name">{hrName}</span>
          <button onClick={handleLogout} className="btn-logout">Logout</button>
        </div>
      </header>

      {/* Filter Bar */}
      <FilterBar
        filters={filters}
        setFilters={setFilters}
        onApply={handleApplyFilter}
        onReset={handleResetFilter}
        onExport={handleExport}
        exporting={exporting}
        displayCount={filteredCount}
        totalCount={totalCount}
      />

      {/* Main Content */}
      <main className="assessment-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading assessment data...</p>
          </div>
        ) : (
          <>
            {/* Stat Cards */}
            <StatCards stats={stats} />

            {/* Color Legend */}
            <ColorLegend />

            {/* Table 1: Test Summary */}
            <div className="table-card">
              <div className="table-header">
                <h2>Test Summary</h2>
                <span className="table-subtitle">candidate_test_summary</span>
              </div>
              <TestSummaryTable data={results} />
            </div>

            {/* Table 2: Difficulty Breakdown */}
            <div className="table-card">
              <div className="table-header">
                <h2>Difficulty Breakdown</h2>
                <span className="table-subtitle">candidate_problem_testcases</span>
              </div>
              <DifficultyTable data={results} />
            </div>

            {/* Table 3: Problem-wise Performance */}
            <div className="table-card">
              <div className="table-header">
                <h2>Problem-wise Performance</h2>
                <span className="table-subtitle">candidate_problem_testcase_details</span>
              </div>
              <ProblemDetailTable data={results} />
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default AssessmentDashboard
