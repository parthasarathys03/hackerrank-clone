import './TestSummaryTable.css'

function ScoreBar({ value, max = 100 }) {
  const percentage = (value / max) * 100
  let colorClass = 'bar-red'
  if (percentage >= 60) colorClass = 'bar-green'
  else if (percentage >= 40) colorClass = 'bar-yellow'

  return (
    <div className="score-cell">
      <span className="score-value">{value}</span>
      <div className="score-bar-container">
        <div 
          className={`score-bar ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function VerdictBadge({ verdict }) {
  let className = 'verdict-badge '
  if (verdict === 'Good') className += 'verdict-good'
  else if (verdict === 'Average') className += 'verdict-average'
  else className += 'verdict-below'

  return <span className={className}>{verdict}</span>
}

function SubmissionType({ type }) {
  return (
    <span className={`submission-type ${type === 'Auto' ? 'auto-warning' : ''}`}>
      {type}
      {type === 'Auto' && <span className="warning-icon">⚠</span>}
    </span>
  )
}

function TestSummaryTable({ data }) {
  if (!data || data.length === 0) {
    return <div className="no-data">No data available</div>
  }

  return (
    <div className="table-scroll-container">
      <table className="test-summary-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>User Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Test Date</th>
            <th>Login</th>
            <th>Submit</th>
            <th>Type</th>
            <th>Time (min)</th>
            <th>Questions</th>
            <th className="python-header">Python Q</th>
            <th className="sql-header">SQL Q</th>
            <th className="python-header">Python Score</th>
            <th className="sql-header">SQL Score</th>
            <th className="overall-header">Overall Score</th>
            <th className="python-header">Python %</th>
            <th className="sql-header">SQL %</th>
            <th className="overall-header">Overall %</th>
            <th className="overall-header">Verdict</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={row.candidate_id || idx}>
              <td className="id-cell">{row.candidate_id}</td>
              <td className="name-cell">{row.name}</td>
              <td>{row.email}</td>
              <td>{row.phone}</td>
              <td>{row.test_date}</td>
              <td>{row.login_time}</td>
              <td>{row.submit_time}</td>
              <td><SubmissionType type={row.submission_type} /></td>
              <td>{row.time_taken_min}</td>
              <td>{row.total_questions}</td>
              <td className="python-col">{row.python_questions}</td>
              <td className="sql-col">{row.sql_questions}</td>
              <td className="python-col"><ScoreBar value={row.python_score} /></td>
              <td className="sql-col"><ScoreBar value={row.sql_score} /></td>
              <td className="overall-col"><ScoreBar value={row.overall_score} max={200} /></td>
              <td className="python-col"><ScoreBar value={row.python_score_percentage} /></td>
              <td className="sql-col"><ScoreBar value={row.sql_score_percentage} /></td>
              <td className="overall-col"><ScoreBar value={row.overall_percentage} /></td>
              <td className="overall-col"><VerdictBadge verdict={row.overall_verdict} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default TestSummaryTable
