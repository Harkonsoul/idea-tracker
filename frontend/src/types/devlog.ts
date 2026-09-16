/**
 * A single row in the left-hand "Dev Console" panel — a plain-English +
 * code-level trace of exactly what happened when the user clicked something.
 * Purely a UI/demo affordance (no backend changes needed): every user action
 * in App.tsx pushes one of these before/after calling the API client.
 */
export interface LogEntry {
  id: string
  timestamp: string
  /** Short label for what the user did, e.g. "Filtered ideas by Approved". */
  trigger: string
  /** The actual HTTP call this trigger caused, if any. */
  request?: {
    method: string
    url: string
    body?: unknown
  }
  /** Ordered list of the real code path this request travels through. */
  codeTrail: string[]
  /** One or two sentences explaining the "why", for non-engineers. */
  explanation: string
  status: 'pending' | 'success' | 'error'
  durationMs?: number
  errorMessage?: string
}
