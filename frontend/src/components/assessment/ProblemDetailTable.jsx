import './ProblemDetailTable.css'

function ScoreChip({ score }) {
  let colorClass = 'chip-gray'
  if (score === 5) colorClass = 'chip-green'
  else if (score === 4) colorClass = 'chip-blue'
  else if (score === 3) colorClass = 'chip-yellow'
  else if (score === 2) colorClass = 'chip-orange'
  else if (score === 1) colorClass = 'chip-red'

  return <span className={`score-chip ${colorClass}`}>{score}</span>
}

function ProblemDetailTable({ data }) {
  if (!data || data.length === 0) {
    return <div className="no-data">No data available</div>
  }

  const pythonProblems = ['P1_py', 'P2_py', 'P3_py', 'P4_py', 'P5_py']
  const sqlProblems = ['P6_sql', 'P7_sql', 'P8_sql', 'P9_sql', 'P10_sql']

  return (
    <div className="table-scroll-container">
      <table className="problem-detail-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>User Name</th>
            {pythonProblems.map(p => (
              <th key={p} className="python-header">{p.replace('_py', '')}</th>
            ))}
            {sqlProblems.map(p => (
              <th key={p} className="sql-header">{p.replace('_sql', '')}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const scores = row.problem_scores || {}
            return (
              <tr key={row.candidate_id || idx}>
                <td className="id-cell">{row.candidate_id}</td>
                <td className="name-cell">{row.name}</td>
                {pythonProblems.map(p => (
                  <td key={p} className="python-col">
                    <ScoreChip score={scores[p] || 0} />
                  </td>
                ))}
                {sqlProblems.map(p => (
                  <td key={p} className="sql-col">
                    <ScoreChip score={scores[p] || 0} />
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default ProblemDetailTable
