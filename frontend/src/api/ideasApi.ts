import type { CreateIdeaInput, Idea, IdeaStatus, PagedResult, UpdateIdeaInput } from '../types/idea'

// Vite exposes env vars prefixed VITE_ on import.meta.env. Falls back to the
// backend's default dev port (see backend/src/IdeaTracker.Api/Properties/launchSettings.json)
// so `npm run dev` works out of the box without a .env file.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5209'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })

  if (!response.ok) {
    const message = await extractErrorMessage(response)
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json()
    // ASP.NET Core's ProblemDetails / ValidationProblemDetails shapes.
    if (typeof body?.detail === 'string') return body.detail
    if (typeof body?.title === 'string') return body.title
    if (body?.errors) {
      const firstError = Object.values(body.errors).flat()[0]
      if (typeof firstError === 'string') return firstError
    }
  } catch {
    // Response wasn't JSON — fall through to the generic message below.
  }
  return `Request failed with status ${response.status}`
}

export interface ListIdeasParams {
  status?: IdeaStatus | 'All'
  page?: number
  pageSize?: number
}

export function listIdeas(params: ListIdeasParams = {}): Promise<PagedResult<Idea>> {
  const query = new URLSearchParams()
  if (params.status && params.status !== 'All') query.set('status', params.status)
  if (params.page) query.set('page', String(params.page))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))

  const qs = query.toString()
  return request<PagedResult<Idea>>(`/api/ideas${qs ? `?${qs}` : ''}`)
}

export function getIdea(id: string): Promise<Idea> {
  return request<Idea>(`/api/ideas/${id}`)
}

export function createIdea(input: CreateIdeaInput): Promise<Idea> {
  return request<Idea>('/api/ideas', {
    method: 'POST',
    body: JSON.stringify(input),
  })
}

export function updateIdea(id: string, input: UpdateIdeaInput): Promise<Idea> {
  return request<Idea>(`/api/ideas/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

export function deleteIdea(id: string): Promise<void> {
  return request<void>(`/api/ideas/${id}`, { method: 'DELETE' })
}
