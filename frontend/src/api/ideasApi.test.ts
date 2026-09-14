import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, listIdeas } from './ideasApi'
import type { PagedResult } from '../types/idea'

const emptyPage: PagedResult<never> = { items: [], total: 0, page: 1, pageSize: 20 }

describe('listIdeas', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('omits the status query param when filtering by "All"', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(emptyPage), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await listIdeas({ status: 'All' })

    const requestedUrl = fetchMock.mock.calls[0][0] as string
    expect(requestedUrl).not.toContain('status=')
  })

  it('includes the status query param for a specific status', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(emptyPage), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await listIdeas({ status: 'Approved' })

    const requestedUrl = fetchMock.mock.calls[0][0] as string
    expect(requestedUrl).toContain('status=Approved')
  })

  it('surfaces the server-provided detail message as an ApiError', async () => {
    const problem = { title: 'Invalid status filter', detail: "'Bogus' is not a valid status." }
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(problem), { status: 400 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(listIdeas({})).rejects.toMatchObject({
      message: "'Bogus' is not a valid status.",
      status: 400,
    } satisfies Partial<ApiError>)
  })
})
