import './FilterBar.css'

function FilterBar({ 
  filters, 
  setFilters, 
  onApply, 
  onReset, 
  onExport, 
  exporting,
  displayCount,
  totalCount 
}) {
  const handleChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  return (
    <div className="filter-bar">
      <div className="filter-row">
        {/* Date Range */}
        <div className="filter-group">
          <label>From</label>
          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => handleChange('date_from', e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>To</label>
          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => handleChange('date_to', e.target.value)}
            className="filter-input"
          />
        </div>

        {/* Verdict Dropdown */}
        <div className="filter-group">
          <label>Verdict</label>
          <select
            value={filters.verdict}
            onChange={(e) => handleChange('verdict', e.target.value)}
            className="filter-select"
          >
            <option value="All">All</option>
            <option value="Good">Good</option>
            <option value="Average">Average</option>
            <option value="Below Average">Below Average</option>
          </select>
        </div>

        {/* Submission Type Dropdown */}
        <div className="filter-group">
          <label>Submission Type</label>
          <select
            value={filters.submission_type}
            onChange={(e) => handleChange('submission_type', e.target.value)}
            className="filter-select"
          >
            <option value="All">All</option>
            <option value="Manual">Manual</option>
            <option value="Auto">Auto (Time Up)</option>
          </select>
        </div>

        {/* Action Buttons */}
        <div className="filter-actions">
          <button onClick={onApply} className="btn-apply">
            Apply Filter
          </button>
          <button onClick={onReset} className="btn-reset">
            Reset
          </button>
        </div>

        {/* Display Count */}
        <div className="filter-info">
          <span className="display-count">
            Displaying <strong>{displayCount}</strong> of <strong>{totalCount}</strong> candidates
          </span>
        </div>

        {/* Export Button */}
        <button 
          onClick={onExport} 
          className="btn-export"
          disabled={exporting || displayCount === 0}
        >
          {exporting ? 'Exporting...' : 'Download Excel'}
        </button>
      </div>
    </div>
  )
}

export default FilterBar
