import { IDEA_STATUSES, type IdeaStatus } from '../types/idea'

interface StatusFilterProps {
  value: IdeaStatus | 'All'
  onChange: (status: IdeaStatus | 'All') => void
}

export function StatusFilter({ value, onChange }: StatusFilterProps) {
  return (
    <label className="status-filter">
      <span>Status</span>
      <select value={value} onChange={(e) => onChange(e.target.value as IdeaStatus | 'All')}>
        <option value="All">All</option>
        {IDEA_STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
    </label>
  )
}
