import './DifficultyTable.css'

function SolvedScore({ solved, total }) {
  const percentage = total > 0 ? (solved / total) * 100 : 0
  let colorClass = 'score-red'
  if (percentage >= 70) colorClass = 'score-green'
  else if (percentage >= 35) colorClass = 'score-yellow'

  return (
    <span className={`solved-score ${colorClass}`}>
      {solved}/{total}
    </span>
  )
}

function DifficultyTable({ data }) {
  if (!data || data.length === 0) {
    return <div className="no-data">No data available</div>
  }

  return (
    <div className="table-scroll-container">
      <table className="difficulty-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>User Name</th>
            <th>Easy</th>
            <th>Medium</th>
            <th>Hard</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => {
            const tc = row.problem_testcases || {}
            const easySolved = tc.easy_solved || 0
            const easyTotal = tc.easy_total || 2
            const mediumSolved = tc.medium_solved || 0
            const mediumTotal = tc.medium_total || 9
            const hardSolved = tc.hard_solved || 0
            const hardTotal = tc.hard_total || 9
            const totalSolved = easySolved + mediumSolved + hardSolved
            const totalProblems = easyTotal + mediumTotal + hardTotal

            return (
              <tr key={row.candidate_id || idx}>
                <td className="id-cell">{row.candidate_id}</td>
                <td className="name-cell">{row.name}</td>
                <td><SolvedScore solved={easySolved} total={easyTotal} /></td>
                <td><SolvedScore solved={mediumSolved} total={mediumTotal} /></td>
                <td><SolvedScore solved={hardSolved} total={hardTotal} /></td>
                <td><SolvedScore solved={totalSolved} total={totalProblems} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default DifficultyTable
