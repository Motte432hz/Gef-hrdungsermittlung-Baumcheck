import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from './router'

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    offlineReady: [false, () => {}],
    needRefresh: [false, () => {}],
    updateServiceWorker: async () => {},
  }),
}))

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(<RouterProvider router={router} />)
  return router
}

describe('AppLayout', () => {
  it('renders the start page with German UI', () => {
    renderAt('/')
    expect(
      screen.getByRole('heading', { level: 1, name: 'Gefährdungsermittlung' }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('navigation', { name: 'Hauptnavigation' })).toHaveLength(2)
  })

  it('navigates to settings and switches theme', async () => {
    const user = userEvent.setup()
    renderAt('/')
    await user.click(screen.getAllByRole('link', { name: 'Einstellungen' })[0]!)
    expect(screen.getByRole('heading', { level: 1, name: 'Einstellungen' })).toBeInTheDocument()
    await user.click(screen.getByRole('radio', { name: 'Dunkel' }))
    expect(document.documentElement).toHaveClass('dark')
    await user.click(screen.getByRole('radio', { name: 'Hell' }))
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it('shows a not-found page for unknown routes', () => {
    renderAt('/gibt-es-nicht')
    expect(screen.getByRole('heading', { name: 'Seite nicht gefunden' })).toBeInTheDocument()
  })
})
