import { useCallback, useEffect, useState } from 'react'
import './App.css'
import { ApiError, createIdea, deleteIdea, listIdeas, updateIdea } from './api/ideasApi'
import { DatabasePanel } from './components/DatabasePanel'
import { DevConsole } from './components/DevConsole'
import { IdeaForm } from './components/IdeaForm'
import { IdeaList } from './components/IdeaList'
import { StatusFilter } from './components/StatusFilter'
import type { LogEntry } from './types/devlog'
import type { CreateIdeaInput, Idea, IdeaStatus, UpdateIdeaInput } from './types/idea'

type View = { name: 'browse' } | { name: 'create' } | { name: 'edit'; idea: Idea }

let logCounter = 0
function nextLogId(): string {
  logCounter += 1
  return `log-${Date.now()}-${logCounter}`
}

function App() {
  const [view, setView] = useState<View>({ name: 'browse' })
  const [statusFilter, setStatusFilter] = useState<IdeaStatus | 'All'>('All')
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [dbRefreshToken, setDbRefreshToken] = useState(0)

  const pushLog = useCallback((entry: Omit<LogEntry, 'id' | 'timestamp' | 'status'>): string => {
    const id = nextLogId()
    setLogEntries((prev) => [
      { ...entry, id, timestamp: new Date().toISOString(), status: 'pending' },
      ...prev.slice(0, 19),
    ])
    return id
  }, [])

  const settleLog = useCallback(
    (id: string, outcome: Pick<LogEntry, 'status' | 'durationMs' | 'errorMessage'>) => {
      setLogEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...outcome } : e)))
    },
    [],
  )

  const bumpDbPanel = useCallback(() => setDbRefreshToken((t) => t + 1), [])

  const loadIdeas = useCallback(
    async (status: IdeaStatus | 'All') => {
      const started = performance.now()
      const logId = pushLog({
        trigger: status === 'All' ? 'Loaded all ideas' : `Filtered ideas by status "${status}"`,
        request: {
          method: 'GET',
          url: `/api/ideas${status === 'All' ? '' : `?status=${status}`}&pageSize=50`,
        },
        codeTrail: [
          'App.tsx → loadIdeas(status)',
          'api/ideasApi.ts → listIdeas({ status, pageSize })',
          'fetch() → GET /api/ideas?status=…',
          'IdeasController.List() → parses + validates status',
          'IdeaService.ListAsync() → clamps page/pageSize',
          'IdeaRepository.ListAsync() → IQueryable + CountAsync',
          'EF Core → SELECT … WHERE Status = @p (see SQL panel)',
        ],
        explanation:
          'Browsing or filtering sends one parameterized SELECT. EF Core builds the SQL; the status filter becomes a WHERE clause bound as a parameter — never string-concatenated, so injection is not possible here.',
      })
      setLoading(true)
      setError(null)
      try {
        const result = await listIdeas({ status, pageSize: 50 })
        setIdeas(result.items)
        settleLog(logId, { status: 'success', durationMs: performance.now() - started })
        bumpDbPanel()
      } catch (err) {
        const message = err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
        setError(message)
        settleLog(logId, { status: 'error', durationMs: performance.now() - started, errorMessage: message })
      } finally {
        setLoading(false)
      }
    },
    [pushLog, settleLog, bumpDbPanel],
  )

  useEffect(() => {
    // Deferred past the effect body: loadIdeas sets loading/log state, and a
    // synchronous setState directly inside an effect triggers a cascading
    // render (react/set-state-in-effect). A 0ms timeout keeps the behaviour
    // identical from the user's perspective while letting the effect commit first.
    const id = setTimeout(() => void loadIdeas(statusFilter), 0)
    return () => clearTimeout(id)
  }, [statusFilter, loadIdeas])


  async function handleCreate(input: CreateIdeaInput | UpdateIdeaInput) {
    const started = performance.now()
    const logId = pushLog({
      trigger: `Submitted idea "${(input as CreateIdeaInput).title}"`,
      request: { method: 'POST', url: '/api/ideas', body: input },
      codeTrail: [
        'IdeaForm → onSubmit(input) (client validation passed)',
        'App.tsx → handleCreate(input)',
        'api/ideasApi.ts → createIdea(input)',
        'fetch() → POST /api/ideas (JSON body)',
        'IdeasController.Create() → [ApiController] model validation',
        'IdeaService.CreateAsync() → trims, defaults Status=Proposed, stamps UTC timestamps',
        'IdeaRepository.AddAsync() → DbContext.Add + SaveChangesAsync',
        'EF Core → parameterized INSERT INTO Ideas (see SQL panel)',
      ],
      explanation:
        'The form payload travels as JSON, gets re-validated server-side (never trust the client), the service layer applies business defaults, and EF Core issues one parameterized INSERT. New ideas always start as "Proposed".',
    })
    setSubmitting(true)
    setActionError(null)
    try {
      await createIdea(input as CreateIdeaInput)
      settleLog(logId, { status: 'success', durationMs: performance.now() - started })
      setView({ name: 'browse' })
      await loadIdeas(statusFilter)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not create this idea.'
      setActionError(message)
      settleLog(logId, { status: 'error', durationMs: performance.now() - started, errorMessage: message })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleUpdate(id: string, input: CreateIdeaInput | UpdateIdeaInput) {
    const started = performance.now()
    const logId = pushLog({
      trigger: `Saved changes to idea ${id.slice(0, 8)}…`,
      request: { method: 'PUT', url: `/api/ideas/${id}`, body: input },
      codeTrail: [
        'IdeaForm → onSubmit(input) (edit mode)',
        'App.tsx → handleUpdate(id, input)',
        'api/ideasApi.ts → updateIdea(id, input)',
        `fetch() → PUT /api/ideas/${id.slice(0, 8)}…`,
        'IdeasController.Update() → 404 if unknown id',
        'IdeaService.UpdateAsync() → applies fields + new UpdatedAt',
        'IdeaRepository.UpdateAsync() → SaveChangesAsync',
        'EF Core → parameterized UPDATE (see SQL panel)',
      ],
      explanation:
        'Update is a full replacement of the editable fields. The server re-checks the row exists (404 otherwise), refreshes UpdatedAt, and EF Core issues a single parameterized UPDATE.',
    })
    setSubmitting(true)
    setActionError(null)
    try {
      await updateIdea(id, input as UpdateIdeaInput)
      settleLog(logId, { status: 'success', durationMs: performance.now() - started })
      setView({ name: 'browse' })
      await loadIdeas(statusFilter)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not save these changes.'
      setActionError(message)
      settleLog(logId, { status: 'error', durationMs: performance.now() - started, errorMessage: message })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(idea: Idea) {
    if (!window.confirm(`Delete "${idea.title}"? This can't be undone.`)) return
    const started = performance.now()
    const logId = pushLog({
      trigger: `Deleted idea "${idea.title}"`,
      request: { method: 'DELETE', url: `/api/ideas/${idea.id}` },
      codeTrail: [
        'IdeaList → onDelete(idea) (after confirm dialog)',
        'App.tsx → handleDelete(idea)',
        'api/ideasApi.ts → deleteIdea(id)',
        `fetch() → DELETE /api/ideas/${idea.id.slice(0, 8)}…`,
        'IdeasController.Delete() → 204 on success, 404 if missing',
        'IdeaRepository.DeleteAsync() → FindAsync + Remove + SaveChangesAsync',
        'EF Core → SELECT then parameterized DELETE (see SQL panel)',
      ],
      explanation:
        'Delete first verifies the row exists, then removes it in one SaveChanges round-trip. The 204 No Content response means "done, nothing to return".',
    })
    setActionError(null)
    try {
      await deleteIdea(idea.id)
      settleLog(logId, { status: 'success', durationMs: performance.now() - started })
      await loadIdeas(statusFilter)
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Could not delete this idea.'
      setActionError(message)
      settleLog(logId, { status: 'error', durationMs: performance.now() - started, errorMessage: message })
    }
  }

  return (
    <div className="workbench">
      <DevConsole entries={logEntries} />

      <main className="panel app-panel">
        <header className="app-header">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">⌬</span>
            <div>
              <h1>SYSPRO Idea Tracker</h1>
              <p>Capture and triage innovation ideas from the team.</p>
            </div>
          </div>
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
            <h2 className="view-title">Submit a new idea</h2>
            <IdeaForm mode="create" submitting={submitting} onSubmit={handleCreate} onCancel={() => setView({ name: 'browse' })} />
          </section>
        )}

        {view.name === 'edit' && (
          <section>
            <h2 className="view-title">Edit idea</h2>
            <IdeaForm
              mode="edit"
              initialIdea={view.idea}
              submitting={submitting}
              onSubmit={(input) => handleUpdate(view.idea.id, input)}
              onCancel={() => setView({ name: 'browse' })}
            />
          </section>
        )}
      </main>

      <DatabasePanel refreshToken={dbRefreshToken} />
    </div>
  )
}

export default App

