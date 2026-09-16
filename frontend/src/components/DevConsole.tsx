import type { LogEntry } from '../types/devlog'

interface DevConsoleProps {
  entries: LogEntry[]
}

const STATUS_BADGE: Record<LogEntry['status'], { label: string; className: string }> = {
  pending: { label: 'RUNNING', className: 'badge-pending' },
  success: { label: 'OK', className: 'badge-success' },
  error: { label: 'ERROR', className: 'badge-error' },
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour12: false }) +
    '.' + String(new Date(iso).getMilliseconds()).padStart(3, '0')
}

export function DevConsole({ entries }: DevConsoleProps) {
  return (
    <aside className="panel dev-console">
      <header className="panel-header">
        <span className="panel-glyph" aria-hidden="true">◈</span>
        <div>
          <h2>Dev Console</h2>
          <p>Every click, traced end-to-end</p>
        </div>
        <span className="live-dot" title="live" />
      </header>

      <div className="panel-body">
        {entries.length === 0 && (
          <p className="console-hint">
            Interact with the app in the middle column — each action will appear here with the
            exact code path and HTTP request it triggered.
          </p>
        )}

        {entries.map((entry) => (
          <article key={entry.id} className={`log-entry log-${entry.status}`}>
            <div className="log-entry-head">
              <span className="log-time">{formatTime(entry.timestamp)}</span>
              <span className={`log-badge ${STATUS_BADGE[entry.status].className}`}>
                {STATUS_BADGE[entry.status].label}
              </span>
              {entry.durationMs !== undefined && (
                <span className="log-duration">{entry.durationMs.toFixed(0)}ms</span>
              )}
            </div>

            <h3>{entry.trigger}</h3>

            {entry.request && (
              <div className="log-request">
                <code>
                  <span className={`http-method method-${entry.request.method.toLowerCase()}`}>
                    {entry.request.method}
                  </span>{' '}
                  {entry.request.url}
                </code>
                {entry.request.body !== undefined && (
                  <pre>{JSON.stringify(entry.request.body, null, 2)}</pre>
                )}
              </div>
            )}

            <ol className="code-trail">
              {entry.codeTrail.map((step, i) => (
                <li key={i}>
                  <code>{step}</code>
                </li>
              ))}
            </ol>

            <p className="log-explanation">{entry.explanation}</p>

            {entry.errorMessage && <p className="log-error">{entry.errorMessage}</p>}
          </article>
        ))}
      </div>
    </aside>
  )
}
