import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { ApiError, createIdea, deleteIdea, listIdeas, updateIdea } from './api/ideasApi'
import { IdeaForm } from './components/IdeaForm'
import { IdeaList } from './components/IdeaList'
import { StatusFilter } from './components/StatusFilter'
import type { CreateIdeaInput, Idea, IdeaStatus, UpdateIdeaInput } from './types/idea'

type View = { name: 'browse' } | { name: 'create' } | { name: 'edit'; idea: Idea }

function App() {
  const [view, setView] = useState<View>({ name: 'browse' })
  const [statusFilter, setStatusFilter] = useState<IdeaStatus | 'All'>('All')
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const loadIdeas = useCallback(async (status: IdeaStatus | 'All') => {
    setLoading(true)
    setError(null)
    try {
      const result = await listIdeas({ status, pageSize: 50 })
      setIdeas(result.items)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadIdeas(statusFilter)
  }, [statusFilter, loadIdeas])

  async function handleCreate(input: CreateIdeaInput | UpdateIdeaInput) {
    setSubmitting(true)
    setActionError(null)
    try {
      await createIdea(input as CreateIdeaInput)
      setView({ name: 'browse' })
      await loadIdeas(statusFilter)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not create this idea.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdate(id: string, input: CreateIdeaInput | UpdateIdeaInput) {
    setSubmitting(true)
    setActionError(null)
    try {
      await updateIdea(id, input as UpdateIdeaInput)
      setView({ name: 'browse' })
      await loadIdeas(statusFilter)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not save these changes.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(idea: Idea) {
    if (!window.confirm(`Delete "${idea.title}"? This can't be undone.`)) return
    setActionError(null)
    try {
      await deleteIdea(idea.id)
      await loadIdeas(statusFilter)
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Could not delete this idea.')
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Idea Tracker</h1>
        <p>Capture and triage innovation ideas from the team.</p>
      </header>

      <nav className="app-nav">
        <button
          type="button"
          className={view.name === 'browse' ? 'active' : ''}
          onClick={() => setView({ name: 'browse' })}
        >
          Browse
        </button>
        <button
          type="button"
          className={view.name === 'create' ? 'active' : ''}
          onClick={() => setView({ name: 'create' })}
        >
          Submit an idea
        </button>
      </nav>

      {actionError && (
        <p className="state-message state-error" role="alert">
          {actionError}
        </p>
      )}

      {view.name === 'browse' && (
        <section>
          <div className="toolbar">
            <StatusFilter value={statusFilter} onChange={setStatusFilter} />
          </div>
          <IdeaList
            ideas={ideas}
            loading={loading}
            error={error}
            onEdit={(idea) => setView({ name: 'edit', idea })}
            onDelete={handleDelete}
          />
        </section>
      )}

      {view.name === 'create' && (
        <section>
          <h2>Submit a new idea</h2>
          <IdeaForm mode="create" submitting={submitting} onSubmit={handleCreate} onCancel={() => setView({ name: 'browse' })} />
        </section>
      )}

      {view.name === 'edit' && (
        <section>
          <h2>Edit idea</h2>
          <IdeaForm
            mode="edit"
            initialIdea={view.idea}
            submitting={submitting}
            onSubmit={(input) => handleUpdate(view.idea.id, input)}
            onCancel={() => setView({ name: 'browse' })}
          />
        </section>
      )}
    </div>
  )
}

export default App
