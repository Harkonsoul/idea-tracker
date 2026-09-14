import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { IdeaForm } from './IdeaForm'

describe('IdeaForm', () => {
  it('blocks submission and shows an error when the title is empty', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()

    render(<IdeaForm mode="create" submitting={false} onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: /submit idea/i }))

    expect(await screen.findByText(/title is required/i)).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits trimmed title, description, and parsed tags', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()

    render(<IdeaForm mode="create" submitting={false} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText(/title/i), '  Offline-first field reporting  ')
    await user.type(screen.getByLabelText(/description/i), 'Sync later.')
    await user.type(screen.getByLabelText(/tags/i), 'mobile, sync')
    await user.click(screen.getByRole('button', { name: /submit idea/i }))

    expect(onSubmit).toHaveBeenCalledWith({
      title: 'Offline-first field reporting',
      description: 'Sync later.',
      tags: ['mobile', 'sync'],
    })
  })
})
