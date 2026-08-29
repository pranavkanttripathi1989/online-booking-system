import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { SnackbarProvider } from 'notistack'
import { HelmetProvider } from 'react-helmet-async'
import { ThemeProvider } from '@mui/material/styles'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import NewAppointmentSeriesPage from './new'
import { CLINICS_QUERY, CLINICIANS_QUERY, PATIENTS_QUERY } from '../../../graphql/queries'
import { CREATE_APPOINTMENT_SERIES_MUTATION } from '../../../graphql/mutations'
import { createAppTheme } from '../../../theme'

const theme = createAppTheme('light')

// Every nested object needs an explicit __typename even with
// addTypename={false} on MockedProvider (that flag only controls whether
// Apollo injects __typename into the OUTGOING query) — without it,
// InMemoryCache's normalization silently drops every field down to `{}`
// on read, confirmed by direct diagnostic. Matches the same fix
// pages/patients/detail.test.jsx's own PATIENTS_QUERY mock already uses.
const clinicsMock = {
  request: { query: CLINICS_QUERY },
  result: { data: { clinics: [{ __typename: 'Clinic', id: 'clinic-1', name: 'MG Road Clinic', address: '', city: '', postcode: '', phone: '', email: '', timezone: 'Asia/Kolkata', is_active: true, is_primary: true }] } },
}
const cliniciansMock = {
  request: { query: CLINICIANS_QUERY, variables: { clinic_id: 'clinic-1', is_active: true, first: 100 } },
  result: {
    data: {
      clinicians: {
        __typename: 'ClinicianPaginated',
        data: [{ __typename: 'Clinician', id: 'clin-1', first_name: 'Sarah', last_name: 'Mitchell', full_name: 'Sarah Mitchell', email: '', phone: '', bio: '', avatar_url: null, consultation_fee: 0, is_active: true, gender: null, languages: [], clinician_type: null, clinics: [], services: [{ __typename: 'Service', id: 'svc-1', name: 'Physiotherapy', duration_minutes: 30, price: 500 }] }],
        paginatorInfo: { __typename: 'ClinicianPaginatorInfo', count: 1, currentPage: 1, hasMorePages: false, lastPage: 1, perPage: 20, total: 1 },
      },
    },
  },
}
// A repeatable mock (react-testing-library's userEvent.type fires one
// query per keystroke, not just the final string) — matches any search
// value so every intermediate keystroke's query is served.
const patientsMock = () => ({
  request: { query: PATIENTS_QUERY },
  variableMatcher: () => true,
  result: {
    data: {
      patients: {
        __typename: 'PatientPaginated',
        data: [{ __typename: 'Patient', id: 'pat-1', first_name: 'Priya', last_name: 'Nair', full_name: 'Priya Nair', email: 'priya@example.test', phone: '+919810000001', date_of_birth: '1990-01-01', gender: 'female', address: null, notes: '', created_at: '2026-01-01' }],
        paginatorInfo: { __typename: 'PatientPaginatorInfo', count: 1, currentPage: 1, hasMorePages: false, lastPage: 1, perPage: 20, total: 1 },
      },
    },
  },
})

function renderPage(mocks) {
  return render(
    <HelmetProvider>
      <ThemeProvider theme={theme}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <SnackbarProvider>
            <MemoryRouter>
              <MockedProvider mocks={mocks} addTypename={false}>
                <NewAppointmentSeriesPage />
              </MockedProvider>
            </MemoryRouter>
          </SnackbarProvider>
        </LocalizationProvider>
      </ThemeProvider>
    </HelmetProvider>,
  )
}

describe('NewAppointmentSeriesPage (REQ163)', () => {
  it('renders the series-creation form', async () => {
    renderPage([clinicsMock, patientsMock()])
    expect(await screen.findByText('New Appointment Series')).toBeInTheDocument()
    expect(screen.getByLabelText('Series name')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recurring' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Treatment Plan' })).toBeInTheDocument()
  })

  it('disables Create Series until the form has enough occurrences and required fields', async () => {
    renderPage([clinicsMock, patientsMock()])
    await screen.findByText('New Appointment Series')
    const submit = screen.getByRole('button', { name: /Create Series/ })
    expect(submit).toBeDisabled()
  })

  it('submits a recurring series and shows the partial-success report', async () => {
    let capturedInput
    const createMock = {
      request: { query: CREATE_APPOINTMENT_SERIES_MUTATION },
      variableMatcher: (vars) => {
        capturedInput = vars.input
        return true
      },
      result: {
        data: {
          createAppointmentSeries: {
            __typename: 'CreateAppointmentSeriesResult',
            success: true,
            userErrors: [],
            attempted_count: 2,
            created_count: 1,
            failed_count: 1,
            failures: [{ __typename: 'AppointmentSeriesOccurrenceFailure', occurrence_index: 1, message: 'This time slot is no longer available' }],
            series: { __typename: 'AppointmentSeries', id: 'series-1', name: 'Physio program', series_type: 'recurring', status: 'active' },
          },
        },
      },
    }

    renderPage([clinicsMock, patientsMock(), patientsMock(), cliniciansMock, createMock])
    await screen.findByText('New Appointment Series')

    await userEvent.type(screen.getByLabelText('Series name'), 'Physio program')

    const patientField = screen.getByLabelText('Patient')
    await userEvent.click(patientField)
    // A single fireEvent.change (not userEvent.type's per-keystroke firing)
    // so exactly one Patients request goes out, matching this file's own
    // single patientsMock() — same fix EncounterWorkspace.test.jsx already
    // established for this exact MUI Autocomplete-vs-userEvent.type gap.
    fireEvent.change(patientField, { target: { value: 'Priya' } })
    await userEvent.click(await screen.findByRole('option', { name: /Priya Nair/ }))

    const clinicField = screen.getByLabelText('Clinic')
    await userEvent.click(clinicField)
    await userEvent.click(await screen.findByRole('option', { name: 'MG Road Clinic' }))

    const clinicianField = await screen.findByLabelText('Clinician')
    await userEvent.click(clinicianField)
    await userEvent.click(await screen.findByRole('option', { name: 'Sarah Mitchell' }))

    const serviceField = screen.getByLabelText('Service')
    await userEvent.click(serviceField)
    await userEvent.click(await screen.findByRole('option', { name: 'Physiotherapy' }))

    // A single fireEvent.change, not userEvent.clear()+type() — the same
    // fix this file already applies to the Patient field above; a
    // controlled numeric input re-clamping on every keystroke doesn't
    // reach the intended value through per-keystroke firing.
    fireEvent.change(screen.getByLabelText('Occurrences'), { target: { value: '2' } })

    const submit = await screen.findByRole('button', { name: /Create Series/ })
    await waitFor(() => expect(submit).not.toBeDisabled())
    await userEvent.click(submit)

    await waitFor(() => expect(capturedInput).toBeDefined())
    expect(capturedInput.occurrences).toHaveLength(2)
    expect(capturedInput.series_type).toBe('recurring')

    expect(await screen.findByText('1 of 2 appointments scheduled.')).toBeInTheDocument()
    expect(screen.getByText(/This time slot is no longer available/)).toBeInTheDocument()
  }, 20000)
})
