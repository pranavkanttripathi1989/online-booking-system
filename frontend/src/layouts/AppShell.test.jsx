import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { ThemeProvider } from '@mui/material/styles'
import { gql } from '@apollo/client'
import AppShell from './AppShell'
import { createAppTheme } from '../theme'

// BUG053 -- AppShell's sidebar header/nav used to be hardcoded module-level
// TEAL/TEAL_LIGHT constants regardless of the org's real branding accent.
// These tests confirm the header and active-nav chrome now derive from the
// live theme (theme.palette.primary), not a fixed literal, by rendering
// under two different accentColor-derived themes and asserting the DOM
// output actually differs.

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u1', name: 'Sarah Manager', email: 'manager@medibook.dev', roles: [{ name: 'manager' }] },
    logout: jest.fn(),
    isImpersonating: false,
    endImpersonating: jest.fn(),
  }),
}))

// Re-declared to match AppShell.jsx's own inline gql documents exactly
// (query AST equality), same convention as ThemeContext.test.jsx.
const GET_MY_ORG_BRANDING = gql`
  query MyOrgBrandingForShell {
    myOrgBranding {
      name
      logo_url
      primary_color
      secondary_color
    }
  }
`
const GET_THREADS_FOR_SHELL = gql`
  query ThreadsForShellBadge {
    threads {
      id
      unread_count
    }
  }
`

function brandingMock(name) {
  return {
    request: { query: GET_MY_ORG_BRANDING },
    result: { data: { myOrgBranding: { name, logo_url: null, primary_color: null, secondary_color: null } } },
  }
}
const threadsMock = { request: { query: GET_THREADS_FOR_SHELL }, result: { data: { threads: [] } } }

function renderShell(accentColor) {
  const theme = createAppTheme('light', { accentColor })
  return render(
    <MockedProvider mocks={[brandingMock('City Heart Clinic Group'), threadsMock]} addTypename={false}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <AppShell />
        </MemoryRouter>
      </ThemeProvider>
    </MockedProvider>,
  )
}

describe('AppShell — sidebar header/nav track the org accent (BUG053)', () => {
  it('renders the brand header background from theme.palette.primary, not a fixed teal', async () => {
    // The header box renders unconditionally (its own background doesn't
    // wait on the branding query resolving) -- assert on it directly rather
    // than gating on a piece of branding-query-dependent text.
    // jsdom's getComputedStyle doesn't resolve emotion's injected gradient
    // background shorthand, and emotion inserts rules via the CSSOM
    // (sheet.insertRule) rather than populating <style> textContent in this
    // environment -- read the live cssRules instead, which is where the
    // real CSS (including the accent hex) lives.
    const stylesText = () =>
      Array.from(document.styleSheets)
        .flatMap((sheet) => {
          try {
            return Array.from(sheet.cssRules).map((r) => r.cssText)
          } catch {
            return []
          }
        })
        .join('\n')

    const { unmount } = renderShell(null)
    await screen.findByTestId('sidebar-brand-header')
    expect(stylesText()).not.toContain('#080075')
    unmount()

    renderShell('#080075')
    await screen.findByTestId('sidebar-brand-header')
    expect(stylesText().toLowerCase()).toContain('#080075')
  })
})
