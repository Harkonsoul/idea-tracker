import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchRawTable, fetchSecurityNotes, fetchSqlTrace } from '../api/debugApi'
import type { RawTableResponse, SecurityNote, SqlTraceEntry } from '../api/debugApi'

interface DatabasePanelProps {
  /** Bumped by the parent after any API mutation so the panel re-pulls. */
  refreshToken: number
}

const SECURITY_FALLBACK: SecurityNote[] = [
  {
    title: 'Security notes unavailable',
    detail: 'Could not reach the API — start the backend (dotnet run --project backend/src/IdeaTracker.Api) to see the live SQL trace and hardening notes.',
  },
]

export function DatabasePanel({ refreshToken }: DatabasePanelProps) {
  const [table, setTable] = useState<RawTableResponse | null>(null)
  const [trace, setTrace] = useState<SqlTraceEntry[]>([])
  const [notes, setNotes] = useState<SecurityNote[]>([])
  const [error, setError] = useState<string | null>(null)
  const firstLoad = useRef(true)

  const refresh = useCallback(async () => {
    try {
      const [tableRes, traceRes] = await Promise.all([fetchRawTable(), fetchSqlTrace()])
      setTable(tableRes)
      setTrace(traceRes.entries)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load database panel data.')
    }
  }, [])

  // Load security notes once; refresh table + trace on mount and after every mutation.
  useEffect(() => {
    // Deferred past the effect body so the fetch-settle setStates aren't
    // flagged as synchronous setState-in-effect (react/set-state-in-effect).
    const id = setTimeout(() => {
      void refresh()
      if (firstLoad.current) {
        firstLoad.current = false
        fetchSecurityNotes()
          .then((res) => setNotes(res.notes))
          .catch(() => setNotes(SECURITY_FALLBACK))
      }
    }, 0)
    return () => clearTimeout(id)
  }, [refreshToken, refresh])

  return (
    <aside className="panel db-panel">
      <header className="panel-header">
        <span className="panel-glyph" aria-hidden="true">▣</span>
        <div>
          <h2>Database</h2>
          <p>{table ? `${table.provider} · ${table.table} · ${table.rowCount} rows` : 'connecting…'}</p>
        </div>
      </header>

      <div className="panel-body">
        {error && <p className="state-message state-error">{error}</p>}

        <section className="db-section">
          <h3 className="db-section-title">Raw rows — Ideas table</h3>
          {table && table.rows.length > 0 ? (
            <div className="raw-table-wrap">
              <table className="raw-table">
                <thead>
                  <tr>
                    <th>Id</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Tags</th>
                    <th>CreatedAt</th>
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row) => (
                    <tr key={row.id}>
                      <td title={row.id}>{row.id.slice(0, 8)}…</td>
                      <td>{row.title}</td>
                      <td>{row.status}</td>
                      <td>{row.tags.join(', ') || '—'}</td>
                      <td>{new Date(row.createdAt).toLocaleDateString('en-GB')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            !error && <p className="state-message">No rows yet — submit an idea.</p>
          )}
        </section>

        <section className="db-section">
          <h3 className="db-section-title">SQL trace — live from EF Core</h3>
          {trace.length === 0 ? (
            <p className="state-message">No statements captured yet.</p>
          ) : (
            trace.slice(0, 5).map((entry, i) => (
              <div key={i} className="sql-card">
                <pre className="sql-text">{entry.commandText}</pre>
                {entry.parameters && <p className="sql-params">params: {entry.parameters}</p>}
              </div>
            ))
          )}
        </section>

        <section className="db-section">
          <h3 className="db-section-title">Security &amp; going live</h3>
          <ul className="security-notes">
            {notes.map((note) => (
              <li key={note.title}>
                <strong>{note.title}</strong>
                <p>{note.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  )
}
