import type { Idea } from '../types/idea'

interface IdeaListProps {
  ideas: Idea[]
  loading: boolean
  error: string | null
  onEdit: (idea: Idea) => void
  onDelete: (idea: Idea) => void
}

const STATUS_CLASS: Record<Idea['status'], string> = {
  Proposed: 'status-proposed',
  InReview: 'status-in-review',
  Approved: 'status-approved',
  Rejected: 'status-rejected',
}

export function IdeaList({ ideas, loading, error, onEdit, onDelete }: IdeaListProps) {
  if (loading) {
    return (
      <p className="state-message" role="status">
        Loading ideas…
      </p>
    )
  }

  if (error) {
    return (
      <p className="state-message state-error" role="alert">
        Couldn't load ideas: {error}
      </p>
    )
  }

  if (ideas.length === 0) {
    return <p className="state-message">No ideas match this filter yet.</p>
  }

  return (
    <ul className="idea-list">
      {ideas.map((idea) => (
        <li key={idea.id} className="idea-card">
          <div className="idea-card-header">
            <h3>{idea.title}</h3>
            <span className={`status-pill ${STATUS_CLASS[idea.status]}`}>{idea.status}</span>
          </div>
          {idea.description && <p className="idea-description">{idea.description}</p>}
          {idea.tags.length > 0 && (
            <ul className="tag-list">
              {idea.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          )}
          <div className="idea-card-actions">
            <button type="button" onClick={() => onEdit(idea)}>
              Edit
            </button>
            <button type="button" className="danger" onClick={() => onDelete(idea)}>
              Delete
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}
