import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { SnackbarProvider } from 'notistack'
import { gql } from '@apollo/client'
import EncounterWorkspace from './EncounterWorkspace'
import { useAuth } from '../../hooks/useAuth'

jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

// A-5/A-6 (project-plans/08-integration-gap-analysis.md) — re-declared to
// match EncounterWorkspace.jsx's own gql documents exactly (query AST
// equality, same convention as clinician/Dashboard.test.jsx).
const GET_OR_CREATE_ENCOUNTER = gql`
  mutation GetOrCreateEncounter($appointment_id: ID!) {
    getOrCreateEncounter(appointment_id: $appointment_id) { id patient_id clinician_id }
  }
`
const ENCOUNTER_QUERY = gql`
  query Encounter($id: ID!) {
    encounter(id: $id) {
      id patient_id status locked signed_at
      notes { id section content version }
      addenda { id author_id content reason created_at }
      diagnoses { id type icd10_code text status created_at }
      attachments { id file_ref mime_type original_filename created_at }
      investigation_orders { id test_name test_type urgency status date_ordered }
      referrals { id referred_to_specialty referred_to_clinician_id reason urgency status created_at }
    }
  }
`
const PATIENT_ALLERGY_BANNER = gql`
  query PatientAllergyBanner($patient_id: ID!) {
    patientAllergyBanner(patient_id: $patient_id) { id text icd10_code }
  }
`
const PATIENT_TIMELINE = gql`
  query PatientTimeline($patient_id: ID!) {
    patientTimeline(patient_id: $patient_id) { id type date title summary encounter_id }
  }
`
const ENCOUNTER_TEMPLATES = gql`
  query EncounterTemplates { encounterTemplates { id name specialty sections_json } }
`
const CREATE_DIAGNOSIS = gql`
  mutation CreateDiagnosis($input: CreateDiagnosisInput!) {
    createDiagnosis(input: $input) { id type icd10_code text status created_at }
  }
`
const CREATE_ENCOUNTER_TEMPLATE = gql`
  mutation CreateEncounterTemplate($input: CreateEncounterTemplateInput!) {
    createEncounterTemplate(input: $input) { id name specialty sections_json }
  }
`
// REQ127
const ORDER_INVESTIGATION = gql`
  mutation OrderInvestigation($input: OrderInvestigationInput!) {
    orderInvestigation(input: $input) { id test_name test_type urgency status date_ordered }
  }
`
// REQ128
const CREATE_REFERRAL = gql`
  mutation CreateReferral($input: CreateReferralInput!) {
    createReferral(input: $input) { id referred_to_specialty referred_to_clinician_id reason urgency status created_at }
  }
`
// REQ108
const ICD10_SEARCH_QUERY = gql`
  query Icd10Codes($search: String) {
    icd10Codes(search: $search) { id code description category }
  }
`

const APPOINTMENT_ID = 'appt-1'
const ENCOUNTER_ID = 'enc-1'
const PATIENT_ID = 'pat-1'

function encounter(overrides = {}) {
  return {
    __typename: 'Encounter',
    id: ENCOUNTER_ID,
    patient_id: PATIENT_ID,
    status: 'in_progress',
    locked: false,
    signed_at: null,
    notes: [],
    addenda: [],
    diagnoses: [],
    attachments: [],
    investigation_orders: [],
    referrals: [],
    ...overrides,
  }
}

function icd10Mock(search, codes = []) {
  return { request: { query: ICD10_SEARCH_QUERY, variables: { search } }, result: { data: { icd10Codes: codes } } }
}

function baseMocks(enc) {
  return [
    { request: { query: GET_OR_CREATE_ENCOUNTER, variables: { appointment_id: APPOINTMENT_ID } }, result: { data: { getOrCreateEncounter: { __typename: 'Encounter', id: ENCOUNTER_ID, patient_id: PATIENT_ID, clinician_id: 'cln-1' } } } },
    { request: { query: ENCOUNTER_QUERY, variables: { id: ENCOUNTER_ID } }, result: { data: { encounter: enc } } },
    { request: { query: PATIENT_ALLERGY_BANNER, variables: { patient_id: PATIENT_ID } }, result: { data: { patientAllergyBanner: [] } } },
    { request: { query: PATIENT_TIMELINE, variables: { patient_id: PATIENT_ID } }, result: { data: { patientTimeline: [] } } },
    { request: { query: ENCOUNTER_TEMPLATES }, result: { data: { encounterTemplates: [] } } },
  ]
}

function renderPage(mocks) {
  useAuth.mockReturnValue({ hasRole: (r) => r === 'clinician' })
  return render(
    <MemoryRouter initialEntries={[`/clinician/encounters/${APPOINTMENT_ID}`]}>
      <SnackbarProvider>
        <MockedProvider mocks={mocks}>
          <Routes>
            <Route path="/clinician/encounters/:appointmentId" element={<EncounterWorkspace />} />
          </Routes>
        </MockedProvider>
      </SnackbarProvider>
    </MemoryRouter>
  )
}

describe('EncounterWorkspace — diagnoses + save-as-template (A-5/A-6)', () => {
  it('renders real recorded diagnoses, not just an empty state', async () => {
    const enc = encounter({
      diagnoses: [{ __typename: 'EncounterDiagnosis', id: 'dx-1', type: 'diagnosis', icd10_code: 'J06.9', text: 'Upper respiratory infection', status: 'active', created_at: '2026-08-25T10:00:00.000Z' }],
    })
    renderPage(baseMocks(enc))

    await waitFor(() => expect(screen.getByText('Upper respiratory infection')).toBeInTheDocument())
    expect(screen.getByText('J06.9')).toBeInTheDocument()
  })

  it('adds a diagnosis via the real createDiagnosis mutation and refetches', async () => {
    const enc = encounter()
    const withDiagnosis = encounter({
      diagnoses: [{ __typename: 'EncounterDiagnosis', id: 'dx-2', type: 'allergy', icd10_code: null, text: 'Penicillin allergy', status: 'active', created_at: '2026-08-25T10:00:00.000Z' }],
    })
    renderPage([
      ...baseMocks(enc),
      icd10Mock(undefined),
      { request: { query: CREATE_DIAGNOSIS, variables: { input: { encounter_id: ENCOUNTER_ID, type: 'diagnosis', text: 'Penicillin allergy' } } }, result: { data: { createDiagnosis: { __typename: 'EncounterDiagnosis', id: 'dx-2', type: 'diagnosis', icd10_code: null, text: 'Penicillin allergy', status: 'active', created_at: '2026-08-25T10:00:00.000Z' } } } },
      { request: { query: ENCOUNTER_QUERY, variables: { id: ENCOUNTER_ID } }, result: { data: { encounter: withDiagnosis } } },
    ])

    await waitFor(() => expect(screen.getByText('No diagnoses recorded yet.')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Add Diagnosis' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Description'), 'Penicillin allergy')
    // ICD-10 field left blank (free-text-capable, per REQ108's own soft-
    // validation scope) -- Save must still work with no code selected.
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.getByText('Penicillin allergy')).toBeInTheDocument())
  }, 20000)

  // REQ108
  it('renders the ICD-10 field as a searchable Autocomplete, not a bare text box', async () => {
    const enc = encounter()
    renderPage([...baseMocks(enc), icd10Mock(undefined)])

    await waitFor(() => expect(screen.getByText('No diagnoses recorded yet.')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Add Diagnosis' }))
    const dialog = await screen.findByRole('dialog')
    const icd10Field = within(dialog).getByLabelText(/^ICD-10 code/)
    expect(icd10Field).toHaveAttribute('role', 'combobox')
  })

  it('searches real codes as the clinician types and lets them select one', async () => {
    const enc = encounter()
    renderPage([
      ...baseMocks(enc),
      icd10Mock(undefined),
      icd10Mock('J0', [{ __typename: 'Icd10Code', id: 'icd-1', code: 'J06.9', description: 'Acute upper respiratory infection, unspecified', category: 'Respiratory' }]),
      {
        request: { query: CREATE_DIAGNOSIS, variables: { input: { encounter_id: ENCOUNTER_ID, type: 'diagnosis', text: 'URI', icd10_code: 'J06.9' } } },
        result: { data: { createDiagnosis: { __typename: 'EncounterDiagnosis', id: 'dx-3', type: 'diagnosis', icd10_code: 'J06.9', text: 'URI', status: 'active', created_at: '2026-08-25T10:00:00.000Z' } } },
      },
      { request: { query: ENCOUNTER_QUERY, variables: { id: ENCOUNTER_ID } }, result: { data: { encounter: encounter({ diagnoses: [{ __typename: 'EncounterDiagnosis', id: 'dx-3', type: 'diagnosis', icd10_code: 'J06.9', text: 'URI', status: 'active', created_at: '2026-08-25T10:00:00.000Z' }] }) } } },
    ])

    await waitFor(() => expect(screen.getByText('No diagnoses recorded yet.')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Add Diagnosis' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Description'), 'URI')
    const icd10Field = within(dialog).getByLabelText(/^ICD-10 code/)
    await userEvent.click(icd10Field)
    // A single fireEvent.change (not userEvent.type's per-keystroke firing)
    // so exactly one Icd10Codes request goes out, matching the 'J0' mock.
    fireEvent.change(icd10Field, { target: { value: 'J0' } })
    await userEvent.click(await screen.findByRole('option', { name: /J06\.9/ }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.getByText('URI')).toBeInTheDocument())
    expect(screen.getByText('J06.9')).toBeInTheDocument()
  }, 20000)

  it('saves the current note content as a reusable template', async () => {
    const enc = encounter()
    renderPage([
      ...baseMocks(enc),
      {
        request: {
          query: CREATE_ENCOUNTER_TEMPLATE,
          variables: { input: { name: 'Standard OPD Note', specialty: undefined, sections_json: JSON.stringify({ complaints: '', history: '', exam: '', vitals: '', diagnosis: '', investigations: '', advice: '', follow_up: '' }), org_shared: true } },
        },
        result: { data: { createEncounterTemplate: { __typename: 'EncounterTemplate', id: 'tpl-1', name: 'Standard OPD Note', specialty: null, sections_json: '{}' } } },
      },
      { request: { query: ENCOUNTER_TEMPLATES }, result: { data: { encounterTemplates: [{ __typename: 'EncounterTemplate', id: 'tpl-1', name: 'Standard OPD Note', specialty: null, sections_json: '{}' }] } } },
    ])

    await waitFor(() => expect(screen.getByText('No templates yet.')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /save as template/i }))
    await userEvent.type(screen.getByLabelText('Template Name'), 'Standard OPD Note')
    await userEvent.click(screen.getByRole('dialog').querySelector('button.MuiButton-contained'))

    await waitFor(() => expect(screen.getByText(/template saved/i)).toBeInTheDocument())
  })
})

describe('EncounterWorkspace — investigation orders (REQ127)', () => {
  it('renders real ordered investigations, not just an empty state', async () => {
    const enc = encounter({
      investigation_orders: [{ __typename: 'InvestigationOrder', id: 'inv-1', test_name: 'CBC', test_type: 'Blood', urgency: 'routine', status: 'pending', date_ordered: '2026-08-26T10:00:00.000Z' }],
    })
    renderPage(baseMocks(enc))

    await waitFor(() => expect(screen.getByText('CBC')).toBeInTheDocument())
    expect(screen.getByText('Blood')).toBeInTheDocument()
  })

  it('orders an investigation via the real orderInvestigation mutation and refetches', async () => {
    const enc = encounter()
    const withOrder = encounter({
      investigation_orders: [{ __typename: 'InvestigationOrder', id: 'inv-2', test_name: 'Chest X-Ray', test_type: 'Imaging', urgency: 'urgent', status: 'pending', date_ordered: '2026-08-26T10:00:00.000Z' }],
    })
    renderPage([
      ...baseMocks(enc),
      {
        request: { query: ORDER_INVESTIGATION, variables: { input: { encounter_id: ENCOUNTER_ID, test_name: 'Chest X-Ray', test_type: 'Imaging', urgency: 'urgent' } } },
        result: { data: { orderInvestigation: { __typename: 'InvestigationOrder', id: 'inv-2', test_name: 'Chest X-Ray', test_type: 'Imaging', urgency: 'urgent', status: 'pending', date_ordered: '2026-08-26T10:00:00.000Z' } } },
      },
      { request: { query: ENCOUNTER_QUERY, variables: { id: ENCOUNTER_ID } }, result: { data: { encounter: withOrder } } },
    ])

    await waitFor(() => expect(screen.getByText('No investigations ordered yet.')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Order Investigation' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Test name'), 'Chest X-Ray')
    await userEvent.type(within(dialog).getByLabelText('Test type'), 'Imaging')
    await userEvent.selectOptions(within(dialog).getByLabelText('Urgency'), 'urgent')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Order' }))

    await waitFor(() => expect(screen.getByText('Chest X-Ray')).toBeInTheDocument())
    expect(screen.getByText('urgent')).toBeInTheDocument()
  }, 20000)
})

describe('EncounterWorkspace — referrals (REQ128)', () => {
  it('renders real referrals, not just an empty state', async () => {
    const enc = encounter({
      referrals: [{ __typename: 'Referral', id: 'ref-1', referred_to_specialty: 'Cardiology', referred_to_clinician_id: null, reason: 'Murmur on exam', urgency: 'routine', status: 'pending', created_at: '2026-08-26T10:00:00.000Z' }],
    })
    renderPage(baseMocks(enc))

    await waitFor(() => expect(screen.getByText('Cardiology')).toBeInTheDocument())
    expect(screen.getByText('Murmur on exam')).toBeInTheDocument()
  })

  it('refers a patient via the real createReferral mutation and refetches', async () => {
    const enc = encounter()
    const withReferral = encounter({
      referrals: [{ __typename: 'Referral', id: 'ref-2', referred_to_specialty: 'Orthopaedics', referred_to_clinician_id: null, reason: 'Chronic knee pain', urgency: 'routine', status: 'pending', created_at: '2026-08-26T10:00:00.000Z' }],
    })
    renderPage([
      ...baseMocks(enc),
      {
        request: { query: CREATE_REFERRAL, variables: { input: { encounter_id: ENCOUNTER_ID, referred_to_specialty: 'Orthopaedics', reason: 'Chronic knee pain', urgency: 'routine' } } },
        result: { data: { createReferral: { __typename: 'Referral', id: 'ref-2', referred_to_specialty: 'Orthopaedics', referred_to_clinician_id: null, reason: 'Chronic knee pain', urgency: 'routine', status: 'pending', created_at: '2026-08-26T10:00:00.000Z' } } },
      },
      { request: { query: ENCOUNTER_QUERY, variables: { id: ENCOUNTER_ID } }, result: { data: { encounter: withReferral } } },
    ])

    await waitFor(() => expect(screen.getByText('No referrals made yet.')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Refer Patient' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Refer to specialty'), 'Orthopaedics')
    await userEvent.type(within(dialog).getByLabelText('Reason for referral'), 'Chronic knee pain')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Refer' }))

    await waitFor(() => expect(screen.getByText('Chronic knee pain')).toBeInTheDocument())
    expect(screen.getByText('Orthopaedics')).toBeInTheDocument()
  }, 20000)
})
