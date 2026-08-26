import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { SnackbarProvider } from 'notistack'
import { HelmetProvider } from 'react-helmet-async'
import CreateClinicianPage from './CreateClinicianPage'
import { CLINICS_QUERY, CLINICIAN_TYPES_QUERY, SERVICES_QUERY, CLINICIANS_QUERY } from '../../graphql/queries'
import { CREATE_CLINICIAN_MUTATION } from '../../graphql/mutations'

// REQ141 (test-coverage-audit F-24 residue) — CreateClinicianPage.jsx is
// one of the 7 files REQ132 identified as zod-schema-using with zero
// test coverage. Imports the real canonical-dialect gql documents
// (not page-local re-declared ones) to match edit.test.jsx's own
// precedent for pages consuming graphql/{queries,mutations}.js directly.

const clinicsMock = { request: { query: CLINICS_QUERY, variables: {} }, result: { data: { clinics: [{ __typename: 'Clinic', id: 'clinic-1', name: 'MG Road Clinic', is_active: true }] } } }
const typesMock = { request: { query: CLINICIAN_TYPES_QUERY, variables: {} }, result: { data: { clinicianTypes: [] } } }
const servicesMock = { request: { query: SERVICES_QUERY, variables: {} }, result: { data: { services: [] } } }
const cliniciansMock = { request: { query: CLINICIANS_QUERY, variables: { first: 100 } }, result: { data: { clinicians: { data: [{ __typename: 'Clinician', id: 'cln-existing', full_name: 'Dr. Sarah Mitchell' }] } } } }

function renderPage(mocks) {
  return render(
    <HelmetProvider>
      <SnackbarProvider>
        <MemoryRouter>
          <MockedProvider mocks={mocks} addTypename={false}>
            <CreateClinicianPage />
          </MockedProvider>
        </MemoryRouter>
      </SnackbarProvider>
    </HelmetProvider>,
  )
}

describe('clinicians/CreateClinicianPage (REQ141)', () => {
  it('renders real clinics for the assignment dropdown, not fabricated data', async () => {
    const { container } = renderPage([clinicsMock, typesMock, servicesMock, cliniciansMock])
    await screen.findByLabelText('First Name *')
    // MUI generates this id from the Controller field's own `name` when no
    // explicit id/labelId is given — a stable target for a multi-select
    // whose accessible name isn't reliably queryable via getByLabelText/
    // getByRole (a known MUI Select quirk once it can hold a value, see
    // project-plans/technical-plans/06-frontend-architecture-and-mobile.md §7).
    const clinicsSelect = container.querySelector('#mui-component-select-clinic_ids')
    await userEvent.click(clinicsSelect)
    expect(await screen.findByRole('option', { name: 'MG Road Clinic' })).toBeInTheDocument()
  })

  it('blocks submission client-side when required fields are empty (zod validation)', async () => {
    renderPage([clinicsMock, typesMock, servicesMock, cliniciansMock])
    await screen.findByLabelText('First Name *')

    await userEvent.click(screen.getByRole('button', { name: 'Save Clinician' }))

    expect(await screen.findAllByText('Required')).not.toHaveLength(0)
  })

  it('blocks submission client-side on an invalid email format', async () => {
    renderPage([clinicsMock, typesMock, servicesMock, cliniciansMock])
    await userEvent.type(await screen.findByLabelText('First Name *'), 'Sarah')
    await userEvent.type(screen.getByLabelText('Last Name *'), 'Mitchell')
    await userEvent.type(screen.getByLabelText('Email *'), 'not-an-email')
    await userEvent.click(screen.getByRole('button', { name: 'Save Clinician' }))

    expect(await screen.findByText('Invalid email format')).toBeInTheDocument()
  })

  it('requires a "covering for" clinician once the locum toggle is on (zod .refine())', async () => {
    renderPage([clinicsMock, typesMock, servicesMock, cliniciansMock])
    await userEvent.type(await screen.findByLabelText('First Name *'), 'Sarah')
    await userEvent.type(screen.getByLabelText('Last Name *'), 'Mitchell')
    await userEvent.type(screen.getByLabelText('Email *'), 'sarah@example.com')
    await userEvent.click(screen.getByText(/This clinician is a locum/))
    await userEvent.click(screen.getByRole('button', { name: 'Save Clinician' }))

    expect(await screen.findByText('Select who this locum is covering for')).toBeInTheDocument()
  })

  it('creates a clinician end-to-end via the real createClinician mutation', async () => {
    const mocks = [
      clinicsMock, typesMock, servicesMock, cliniciansMock,
      {
        request: {
          query: CREATE_CLINICIAN_MUTATION,
          variables: { input: { first_name: 'Sarah', last_name: 'Mitchell', email: 'sarah@example.com', phone: undefined, gender: undefined, bio: undefined, consultation_fee: undefined, clinician_type_id: undefined, clinic_ids: undefined, service_ids: undefined, languages: undefined, is_active: true } },
        },
        result: { data: { createClinician: { id: 'cln-new', first_name: 'Sarah', last_name: 'Mitchell', full_name: 'Sarah Mitchell', consultation_fee: null, is_active: true, clinician_type: null, clinics: [], services: [] } } },
      },
    ]
    renderPage(mocks)
    await userEvent.type(await screen.findByLabelText('First Name *'), 'Sarah')
    await userEvent.type(screen.getByLabelText('Last Name *'), 'Mitchell')
    await userEvent.type(screen.getByLabelText('Email *'), 'sarah@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Save Clinician' }))

    expect(await screen.findByText('Clinician created successfully')).toBeInTheDocument()
  }, 15000)

  it('shows a real error toast, not a fake success, when the mutation fails', async () => {
    const mocks = [
      clinicsMock, typesMock, servicesMock, cliniciansMock,
      {
        request: {
          query: CREATE_CLINICIAN_MUTATION,
          variables: { input: { first_name: 'Sarah', last_name: 'Mitchell', email: 'sarah@example.com', phone: undefined, gender: undefined, bio: undefined, consultation_fee: undefined, clinician_type_id: undefined, clinic_ids: undefined, service_ids: undefined, languages: undefined, is_active: true } },
        },
        error: new Error('A clinician with this email already exists'),
      },
    ]
    renderPage(mocks)
    await userEvent.type(await screen.findByLabelText('First Name *'), 'Sarah')
    await userEvent.type(screen.getByLabelText('Last Name *'), 'Mitchell')
    await userEvent.type(screen.getByLabelText('Email *'), 'sarah@example.com')
    await userEvent.click(screen.getByRole('button', { name: 'Save Clinician' }))

    expect(await screen.findByText(/A clinician with this email already exists/)).toBeInTheDocument()
    expect(screen.queryByText('Clinician created successfully')).not.toBeInTheDocument()
  }, 15000)
})
