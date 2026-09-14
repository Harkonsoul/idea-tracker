// Kept as a union + const tuple (not a TS `enum`) so the shape stays a plain
// erasable type — no runtime object the bundler has to emit — while still
// giving us an iterable list for the status-filter dropdown.
export const IDEA_STATUSES = ['Proposed', 'InReview', 'Approved', 'Rejected'] as const

export type IdeaStatus = (typeof IDEA_STATUSES)[number]

export interface Idea {
  id: string
  title: string
  description: string
  status: IdeaStatus
  createdAt: string
  updatedAt: string
  tags: string[]
}

export interface CreateIdeaInput {
  title: string
  description: string
  tags: string[]
}

export interface UpdateIdeaInput extends CreateIdeaInput {
  status: IdeaStatus
}

export interface PagedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}
