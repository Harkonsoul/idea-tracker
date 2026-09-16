import type { Idea } from '../types/idea'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5209'

export interface RawTableResponse {
  provider: string
  table: string
  rowCount: number
  rows: Idea[]
}

export interface SqlTraceEntry {
  timestampUtc: string
  commandText: string
  parameters: string
}

export interface SecurityNote {
  title: string
  detail: string
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`)
  if (!response.ok) throw new Error(`Debug API failed (${response.status})`)
  return (await response.json()) as T
}

export function fetchRawTable(): Promise<RawTableResponse> {
  return getJson<RawTableResponse>('/api/debug/raw-table')
}

export function fetchSqlTrace(): Promise<{ entries: SqlTraceEntry[] }> {
  return getJson<{ entries: SqlTraceEntry[] }>('/api/debug/sql-trace')
}

export function fetchSecurityNotes(): Promise<{ notes: SecurityNote[] }> {
  return getJson<{ notes: SecurityNote[] }>('/api/debug/security-notes')
}
