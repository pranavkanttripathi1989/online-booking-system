import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { ThemeProvider } from '@mui/material/styles'
import { SnackbarProvider } from 'notistack'
import ManagerClinics from './index'
import { createAppTheme } from '../../../theme'
import { CLINICS_QUERY, ROOMS_QUERY } from '../../../graphql/queries'

// BUG062 — this page's useMock used to fire on ANY empty apiClinics result
// (`apiClinics.length === 0 && !clinicsLoading`), not just a genuine query
// error, silently rendering CLINICS_DATA's 4 fabricated London clinics for
// any org with genuinely zero real clinics yet — indistinguishable from
// real data, since the "Backend unavailable — showing sample data" banner
// is itself gated on a real `error` and so never appeared on this path.

function withProviders(mocks, children) {
  return (
    <ThemeProvider theme={createAppTheme('light')}>
      <SnackbarProvider>
        <MemoryRouter>
          <MockedProvider mocks={mocks} addTypename={false}>
            {children}
          </MockedProvider>
        </MemoryRouter>
      </SnackbarProvider>
    </ThemeProvider>
  )
}

const emptyMocks = [
  { request: { query: CLINICS_QUERY }, result: { data: { clinics: [] } } },
  { request: { query: ROOMS_QUERY, variables: {} }, result: { data: { rooms: [] } } },
]

describe('manager/clinics/index — real-empty vs genuine-error DATA-13 split', () => {
  it('a real, successful zero-clinics result shows a real empty state, never CLINICS_DATA fabricated rows', async () => {
    render(withProviders(emptyMocks, <ManagerClinics />))
    await waitFor(() => expect(screen.getByText(/No clinics yet/)).toBeInTheDocument())
    expect(screen.queryByText('City Heart Clinic')).not.toBeInTheDocument()
    expect(screen.queryByText(/Backend unavailable/)).not.toBeInTheDocument()
  })

  it('a genuine query error falls back to sample data, with the disclosure banner visible', async () => {
    const errorMocks = [
      { request: { query: CLINICS_QUERY }, error: new Error('network down') },
      { request: { query: ROOMS_QUERY, variables: {} }, error: new Error('network down') },
    ]
    render(withProviders(errorMocks, <ManagerClinics />))
    await waitFor(() => expect(screen.getByText(/Backend unavailable/)).toBeInTheDocument())
    expect(screen.getByText('City Heart Clinic')).toBeInTheDocument()
  })

  it('renders a real fetched clinic, never a fabricated one', async () => {
    const mocks = [
      {
        request: { query: CLINICS_QUERY },
        result: {
          data: {
            clinics: [
              {
                id: 'clinic-real-1',
                name: 'Real Clinic',
                address: '1 Real Street',
                city: 'Bengaluru',
                postcode: '560001',
                phone: '9000000000',
                email: 'real@example.test',
                timezone: 'Asia/Kolkata',
                is_active: true,
                is_primary: false,
              },
            ],
          },
        },
      },
      { request: { query: ROOMS_QUERY, variables: {} }, result: { data: { rooms: [] } } },
    ]
    render(withProviders(mocks, <ManagerClinics />))
    await waitFor(() => expect(screen.getByText('Real Clinic')).toBeInTheDocument())
    expect(screen.queryByText('City Heart Clinic')).not.toBeInTheDocument()
  })
})
