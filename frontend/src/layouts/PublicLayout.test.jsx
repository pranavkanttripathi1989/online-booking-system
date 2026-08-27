import { Suspense } from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import i18n from '../i18n/config'
import PublicLayout from './PublicLayout'

// P1-07 — this is the real end-to-end proof the i18n framework works, not
// just that English resolves synchronously (every other test in this
// codebase only exercises that path). Switching language triggers the
// real lazy-loaded backend (a genuine dynamic import() of the Hindi
// locale file, not a mock), through the real Suspense boundary.

function renderLayout() {
  return render(
    <Suspense fallback="loading">
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<div>page content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Suspense>,
  )
}

describe('PublicLayout — i18n (P1-07)', () => {
  // Each test that switches language mutates the real, shared i18next
  // singleton (module-cached across tests in this file) — reset it after
  // every test so language choice never leaks between them.
  afterEach(async () => {
    window.localStorage.removeItem('medibook_language')
    if (i18n.language !== 'en') await i18n.changeLanguage('en')
  })

  it('renders real English text by default, on every public route', async () => {
    renderLayout()
    expect(await screen.findAllByText('HealthSync')).not.toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Book Now' })).toBeInTheDocument()
  })

  it('is reachable before login, in one interaction — I18N-3', async () => {
    renderLayout()
    expect(await screen.findByTestId('language-switcher')).toBeInTheDocument()
  })

  it('switching to Hindi actually loads the real translation file and re-renders real Hindi text', async () => {
    renderLayout()
    await screen.findByRole('button', { name: 'Sign In' })

    const switcher = within(screen.getByTestId('language-switcher')).getByRole('combobox')
    fireEvent.mouseDown(switcher)
    fireEvent.click(await screen.findByRole('option', { name: 'हिन्दी' }))

    // Genuinely async: the Hindi JSON is a real dynamic import(), not a
    // synchronously-bundled resource (see i18n/config.js) — this proves
    // the lazy-loading path actually works, not just the eager English one.
    await waitFor(() => expect(screen.getByRole('button', { name: 'साइन इन करें' })).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'अभी बुक करें' })).toBeInTheDocument()
  })

  it('persists the choice to localStorage, so it survives a real page reload — I18N-3', async () => {
    renderLayout()
    await screen.findByRole('button', { name: 'Sign In' })
    const switcher = within(screen.getByTestId('language-switcher')).getByRole('combobox')
    fireEvent.mouseDown(switcher)
    fireEvent.click(await screen.findByRole('option', { name: 'हिन्दी' }))
    await waitFor(() => expect(window.localStorage.getItem('medibook_language')).toBe('hi'))
  })
})
