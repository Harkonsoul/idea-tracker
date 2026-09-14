import { useState, type FormEvent } from 'react'
import { IDEA_STATUSES, type CreateIdeaInput, type Idea, type IdeaStatus, type UpdateIdeaInput } from '../types/idea'

interface IdeaFormProps {
  mode: 'create' | 'edit'
  initialIdea?: Idea
  submitting: boolean
  onSubmit: (input: CreateIdeaInput | UpdateIdeaInput) => void
  onCancel?: () => void
}

function tagsToText(tags: string[]): string {
  return tags.join(', ')
}

function textToTags(text: string): string[] {
  return text
    .split(',')
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
}

export function IdeaForm({ mode, initialIdea, submitting, onSubmit, onCancel }: IdeaFormProps) {
  const [title, setTitle] = useState(initialIdea?.title ?? '')
  const [description, setDescription] = useState(initialIdea?.description ?? '')
  const [tagsText, setTagsText] = useState(tagsToText(initialIdea?.tags ?? []))
  const [status, setStatus] = useState<IdeaStatus>(initialIdea?.status ?? 'Proposed')
  const [titleError, setTitleError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedTitle = title.trim()
    if (trimmedTitle.length === 0) {
      setTitleError('Title is required.')
      return
    }
    setTitleError(null)

    const tags = textToTags(tagsText)

    if (mode === 'edit') {
      onSubmit({ title: trimmedTitle, description: description.trim(), tags, status } satisfies UpdateIdeaInput)
    } else {
      onSubmit({ title: trimmedTitle, description: description.trim(), tags } satisfies CreateIdeaInput)
    }
  }

  return (
    <form className="idea-form" onSubmit={handleSubmit} noValidate>
      <div className="form-field">
        <label htmlFor="idea-title">Title *</label>
        <input
          id="idea-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          aria-invalid={titleError ? 'true' : 'false'}
          aria-describedby={titleError ? 'idea-title-error' : undefined}
        />
        {titleError && (
          <p id="idea-title-error" className="field-error" role="alert">
            {titleError}
          </p>
        )}
      </div>

      <div className="form-field">
        <label htmlFor="idea-description">Description</label>
        <textarea
          id="idea-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
        />
      </div>

      <div className="form-field">
        <label htmlFor="idea-tags">Tags (comma-separated)</label>
        <input
          id="idea-tags"
          type="text"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder="mobile, sync"
        />
      </div>

      {mode === 'edit' && (
        <div className="form-field">
          <label htmlFor="idea-status">Status</label>
          <select id="idea-status" value={status} onChange={(e) => setStatus(e.target.value as IdeaStatus)}>
            {IDEA_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Submit idea'}
        </button>
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
