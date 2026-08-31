import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { SnackbarProvider } from 'notistack'
import { gql } from '@apollo/client'
import EncounterWorkspace, { ENCOUNTER_QUERY, SET_ENCOUNTER_LMP_DATE } from './EncounterWorkspace'
import { useAuth } from '../../hooks/useAuth'

jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

// REQ130 -- jsdom has no ResizeObserver, which recharts' own
// ResponsiveContainer requires to measure its parent before rendering a
// chart at all; without this stub every chart in this file's growth-chart
// test throws inside an ErrorBoundary instead of rendering.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = ResizeObserverStub

// A-5/A-6 (project-plans/08-integration-gap-analysis.md) — re-declared to
// match EncounterWorkspace.jsx's own gql documents exactly (query AST
// equality, same convention as clinician/Dashboard.test.jsx).
const GET_OR_CREATE_ENCOUNTER = gql`
  mutation GetOrCreateEncounter($appointment_id: ID!) {
    getOrCreateEncounter(appointment_id: $appointment_id) {
      id
      patient_id
      clinician_id
    }
  }
`
// ENCOUNTER_QUERY is imported verbatim from the real component above (see
// that import's own comment) -- BUG062's own lesson: a hand-copied
// duplicate of this exact query already drifted once when the real query
// gained a field (lmp_date, REQ172) the test's own copy never did.

// P1-11/P1-12 — re-declared to match EncounterWorkspace.jsx's own gql
// documents exactly (query AST equality).
const START_TRANSCRIPTION_SESSION = gql`
  mutation StartTranscriptionSession($input: StartTranscriptionSessionInput!) {
    startTranscriptionSession(input: $input) {
      id
      status
    }
  }
`
const SUBMIT_TRANSCRIPTION = gql`
  mutation SubmitTranscription($input: SubmitTranscriptionInput!) {
    submitTranscription(input: $input) {
      id
      status
      error_message
    }
  }
`
const STRUCTURE_TRANSCRIPT_SESSION = gql`
  mutation StructureTranscriptSession($sessionId: ID!) {
    structureTranscriptSession(session_id: $sessionId) {
      success
      message
      sections {
        section
        content
      }
      vitals {
        code
        value
      }
    }
  }
`
const AI_EXTRACTED_PRESCRIPTION_DRAFT = gql`
  query AiExtractedPrescriptionDraft($sessionId: ID!) {
    aiExtractedPrescriptionDraft(session_id: $sessionId) {
      drug_name_text
      drug_id
      matched_drug_name
      dose
      frequency
      duration_days
    }
  }
`
const PRE_CONSULT_SUMMARY = gql`
  query PreConsultSummary($patientId: ID!) {
    preConsultSummary(patient_id: $patientId)
  }
`

const PATIENT_ALLERGY_BANNER = gql`
  query PatientAllergyBanner($patient_id: ID!) {
    patientAllergyBanner(patient_id: $patient_id) {
      id
      text
      icd10_code
    }
  }
`
const PATIENT_TIMELINE = gql`
  query PatientTimeline($patient_id: ID!) {
    patientTimeline(patient_id: $patient_id) {
      id
      type
      date
      title
      summary
      encounter_id
    }
  }
`
const ENCOUNTER_PRESCRIPTIONS_QUERY = gql`
  query EncounterPrescriptions($patient_id: ID!) {
    patientPrescriptions(patient_id: $patient_id) {
      id
      encounter_id
      issued_at
      items {
        drug_name
        dose
        frequency
      }
    }
  }
`
const ENCOUNTER_TEMPLATES = gql`
  query EncounterTemplates {
    encounterTemplates {
      id
      name
      specialty
      sections_json
    }
  }
`
const CREATE_DIAGNOSIS = gql`
  mutation CreateDiagnosis($input: CreateDiagnosisInput!) {
    createDiagnosis(input: $input) {
      id
      type
      icd10_code
      procedure_code
      text
      status
      created_at
    }
  }
`
const CREATE_ENCOUNTER_TEMPLATE = gql`
  mutation CreateEncounterTemplate($input: CreateEncounterTemplateInput!) {
    createEncounterTemplate(input: $input) {
      id
      name
      specialty
      sections_json
    }
  }
`
// REQ127
const ORDER_INVESTIGATION = gql`
  mutation OrderInvestigation($input: OrderInvestigationInput!) {
    orderInvestigation(input: $input) {
      id
      test_name
      test_type
      urgency
      status
      date_ordered
    }
  }
`
// REQ128
const CREATE_REFERRAL = gql`
  mutation CreateReferral($input: CreateReferralInput!) {
    createReferral(input: $input) {
      id
      referred_to_specialty
      referred_to_clinician_id
      reason
      urgency
      status
      created_at
    }
  }
`
// REQ135
const UPDATE_REFERRAL_STATUS = gql`
  mutation UpdateReferralStatus($id: ID!, $input: UpdateReferralStatusInput!) {
    updateReferralStatus(id: $id, input: $input) {
      id
      status
    }
  }
`
// REQ130
const RECORD_VITALS = gql`
  mutation RecordVitals($input: RecordVitalsInput!) {
    recordVitals(input: $input) {
      id
      code
      value
      unit
      recorded_at
    }
  }
`
const PATIENT_VITALS = gql`
  query PatientVitals($patient_id: ID!, $code: String!) {
    patientVitals(patient_id: $patient_id, code: $code) {
      id
      code
      value
      unit
      recorded_at
    }
  }
`
// REQ108
const ICD10_SEARCH_QUERY = gql`
  query Icd10Codes($search: String) {
    icd10Codes(search: $search) {
      id
      code
      description
      category
    }
  }
`
// REQ154 (P2-02)
const PROCEDURE_SEARCH_QUERY = gql`
  query ProcedureCodes($search: String) {
    procedureCodes(search: $search) {
      id
      code
      description
      category
    }
  }
`
const SUGGEST_CODES_QUERY = gql`
  query SuggestEncounterCodes($encounter_id: ID!) {
    suggestEncounterCodes(encounter_id: $encounter_id) {
      diagnosis_suggestions {
        code
        description
        category
        matched_terms
        score
      }
      procedure_suggestions {
        code
        description
        category
        matched_terms
        score
      }
    }
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
    lmp_date: null,
    notes: [],
    addenda: [],
    diagnoses: [],
    attachments: [],
    investigation_orders: [],
    referrals: [],
    vitals: [],
    ...overrides,
  }
}

function icd10Mock(search, codes = []) {
  return { request: { query: ICD10_SEARCH_QUERY, variables: { search } }, result: { data: { icd10Codes: codes } } }
}

// REQ154 (P2-02)
function procedureMock(search, codes = []) {
  return { request: { query: PROCEDURE_SEARCH_QUERY, variables: { search } }, result: { data: { procedureCodes: codes } } }
}

function suggestCodesMock(diagnosisSuggestions = [], procedureSuggestions = []) {
  return {
    request: { query: SUGGEST_CODES_QUERY, variables: { encounter_id: ENCOUNTER_ID } },
    result: { data: { suggestEncounterCodes: { diagnosis_suggestions: diagnosisSuggestions, procedure_suggestions: procedureSuggestions } } },
  }
}

function baseMocks(enc) {
  return [
    {
      request: { query: GET_OR_CREATE_ENCOUNTER, variables: { appointment_id: APPOINTMENT_ID } },
      result: {
        data: { getOrCreateEncounter: { __typename: 'Encounter', id: ENCOUNTER_ID, patient_id: PATIENT_ID, clinician_id: 'cln-1' } },
      },
    },
    { request: { query: ENCOUNTER_QUERY, variables: { id: ENCOUNTER_ID } }, result: { data: { encounter: enc } } },
    { request: { query: PATIENT_ALLERGY_BANNER, variables: { patient_id: PATIENT_ID } }, result: { data: { patientAllergyBanner: [] } } },
    { request: { query: PATIENT_TIMELINE, variables: { patient_id: PATIENT_ID } }, result: { data: { patientTimeline: [] } } },
    { request: { query: ENCOUNTER_TEMPLATES }, result: { data: { encounterTemplates: [] } } },
    { request: { query: PRE_CONSULT_SUMMARY, variables: { patientId: PATIENT_ID } }, result: { data: { preConsultSummary: [] } } },
    { request: { query: ENCOUNTER_PRESCRIPTIONS_QUERY, variables: { patient_id: PATIENT_ID } }, result: { data: { patientPrescriptions: [] } } },
  ]
}

// A marker route so a Voice-to-Rx navigation test can assert both the
// destination URL and the router-state payload it was handed, without
// mounting the real (much heavier) PrescriptionBuilder page.
function PrescriptionBuilderMarker() {
  const location = useLocation()
  return <div data-testid="prescription-builder-marker">{JSON.stringify(location.state)}</div>
}

function renderPage(mocks) {
  useAuth.mockReturnValue({ hasRole: (r) => r === 'clinician' })
  return render(
    <MemoryRouter initialEntries={[`/clinician/encounters/${APPOINTMENT_ID}`]}>
      <SnackbarProvider>
        <MockedProvider mocks={mocks}>
          <Routes>
            <Route path="/clinician/encounters/:appointmentId" element={<EncounterWorkspace />} />
            <Route path="/clinician/prescriptions/new" element={<PrescriptionBuilderMarker />} />
          </Routes>
        </MockedProvider>
      </SnackbarProvider>
    </MemoryRouter>,
  )
}

describe('EncounterWorkspace — diagnoses + save-as-template (A-5/A-6)', () => {
  it('renders real recorded diagnoses, not just an empty state', async () => {
    const enc = encounter({
      diagnoses: [
        {
          __typename: 'EncounterDiagnosis',
          id: 'dx-1',
          type: 'diagnosis',
          icd10_code: 'J06.9',
          procedure_code: null,
          text: 'Upper respiratory infection',
          status: 'active',
          created_at: '2026-08-25T10:00:00.000Z',
        },
      ],
    })
    renderPage(baseMocks(enc))

    await waitFor(() => expect(screen.getByText('Upper respiratory infection')).toBeInTheDocument())
    expect(screen.getByText('J06.9')).toBeInTheDocument()
  })

  it('adds a diagnosis via the real createDiagnosis mutation and refetches', async () => {
    const enc = encounter()
    const withDiagnosis = encounter({
      diagnoses: [
        {
          __typename: 'EncounterDiagnosis',
          id: 'dx-2',
          type: 'allergy',
          icd10_code: null,
          procedure_code: null,
          text: 'Penicillin allergy',
          status: 'active',
          created_at: '2026-08-25T10:00:00.000Z',
        },
      ],
    })
    renderPage([
      ...baseMocks(enc),
      icd10Mock(undefined),
      {
        request: {
          query: CREATE_DIAGNOSIS,
          variables: { input: { encounter_id: ENCOUNTER_ID, type: 'diagnosis', text: 'Penicillin allergy' } },
        },
        result: {
          data: {
            createDiagnosis: {
              __typename: 'EncounterDiagnosis',
              id: 'dx-2',
              type: 'diagnosis',
              icd10_code: null,
              procedure_code: null,
              text: 'Penicillin allergy',
              status: 'active',
              created_at: '2026-08-25T10:00:00.000Z',
            },
          },
        },
      },
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
      icd10Mock('J0', [
        {
          __typename: 'Icd10Code',
          id: 'icd-1',
          code: 'J06.9',
          description: 'Acute upper respiratory infection, unspecified',
          category: 'Respiratory',
        },
      ]),
      {
        request: {
          query: CREATE_DIAGNOSIS,
          variables: { input: { encounter_id: ENCOUNTER_ID, type: 'diagnosis', text: 'URI', icd10_code: 'J06.9' } },
        },
        result: {
          data: {
            createDiagnosis: {
              __typename: 'EncounterDiagnosis',
              id: 'dx-3',
              type: 'diagnosis',
              icd10_code: 'J06.9',
              procedure_code: null,
              text: 'URI',
              status: 'active',
              created_at: '2026-08-25T10:00:00.000Z',
            },
          },
        },
      },
      {
        request: { query: ENCOUNTER_QUERY, variables: { id: ENCOUNTER_ID } },
        result: {
          data: {
            encounter: encounter({
              diagnoses: [
                {
                  __typename: 'EncounterDiagnosis',
                  id: 'dx-3',
                  type: 'diagnosis',
                  icd10_code: 'J06.9',
                  procedure_code: null,
                  text: 'URI',
                  status: 'active',
                  created_at: '2026-08-25T10:00:00.000Z',
                },
              ],
            }),
          },
        },
      },
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

  // REQ154 (P2-02)
  it('adds a procedure via the real createDiagnosis mutation, using the procedure-code search', async () => {
    const enc = encounter()
    renderPage([
      ...baseMocks(enc),
      icd10Mock(undefined),
      procedureMock(undefined),
      procedureMock('PR-0', [
        { __typename: 'ProcedureCode', id: 'pr-1', code: 'PR-010', description: 'Wound dressing, minor', category: 'Wound care' },
      ]),
      {
        request: {
          query: CREATE_DIAGNOSIS,
          variables: {
            input: { encounter_id: ENCOUNTER_ID, type: 'procedure', text: 'Dressing change', procedure_code: 'PR-010' },
          },
        },
        result: {
          data: {
            createDiagnosis: {
              __typename: 'EncounterDiagnosis',
              id: 'dx-4',
              type: 'procedure',
              icd10_code: null,
              procedure_code: 'PR-010',
              text: 'Dressing change',
              status: 'active',
              created_at: '2026-08-25T10:00:00.000Z',
            },
          },
        },
      },
      {
        request: { query: ENCOUNTER_QUERY, variables: { id: ENCOUNTER_ID } },
        result: {
          data: {
            encounter: encounter({
              diagnoses: [
                {
                  __typename: 'EncounterDiagnosis',
                  id: 'dx-4',
                  type: 'procedure',
                  icd10_code: null,
                  procedure_code: 'PR-010',
                  text: 'Dressing change',
                  status: 'active',
                  created_at: '2026-08-25T10:00:00.000Z',
                },
              ],
            }),
          },
        },
      },
    ])

    await waitFor(() => expect(screen.getByText('No diagnoses recorded yet.')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Add Diagnosis' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.selectOptions(within(dialog).getByLabelText('Type'), 'procedure')
    await userEvent.type(within(dialog).getByLabelText('Description'), 'Dressing change')
    const procedureField = within(dialog).getByLabelText(/^Procedure code/)
    await userEvent.click(procedureField)
    fireEvent.change(procedureField, { target: { value: 'PR-0' } })
    await userEvent.click(await screen.findByRole('option', { name: /PR-010/ }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.getByText('Dressing change')).toBeInTheDocument())
    expect(screen.getByText('PR-010')).toBeInTheDocument()
  }, 20000)

  // REQ154 (P2-02)
  it('shows AI code suggestions and pre-fills the Add Diagnosis dialog from a suggestion, without auto-saving it', async () => {
    const enc = encounter()
    renderPage([
      ...baseMocks(enc),
      icd10Mock(undefined),
      suggestCodesMock(
        [{ code: 'J02.9', description: 'Acute pharyngitis, unspecified', category: 'Respiratory', matched_terms: ['acute', 'pharyngitis'], score: 1 }],
        [{ code: 'PR-010', description: 'Wound dressing, minor', category: 'Wound care', matched_terms: ['wound', 'dressing'], score: 1 }],
      ),
    ])

    await waitFor(() => expect(screen.getByText('No diagnoses recorded yet.')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Suggest Codes' }))

    const suggestDialog = await screen.findByRole('dialog')
    await waitFor(() => expect(within(suggestDialog).getByText(/J02\.9/)).toBeInTheDocument())
    expect(within(suggestDialog).getByText(/PR-010/)).toBeInTheDocument()
    expect(within(suggestDialog).getByText(/Matched: acute, pharyngitis/)).toBeInTheDocument()

    // Nothing is saved by opening the suggestions dialog itself — clicking
    // "Add" only pre-fills and opens the existing Add Diagnosis dialog, a
    // human still has to click Save (FR-AI-06's own discipline).
    const addButtons = within(suggestDialog).getAllByRole('button', { name: 'Add' })
    await userEvent.click(addButtons[0])

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByLabelText('Description')).toHaveValue('Acute pharyngitis, unspecified')
    expect(within(dialog).getByDisplayValue('J02.9')).toBeInTheDocument()
    expect(screen.getByText('No diagnoses recorded yet.')).toBeInTheDocument()
  }, 20000)

  it('saves the current note content as a reusable template', async () => {
    const enc = encounter()
    renderPage([
      ...baseMocks(enc),
      {
        request: {
          query: CREATE_ENCOUNTER_TEMPLATE,
          variables: {
            input: {
              name: 'Standard OPD Note',
              specialty: undefined,
              sections_json: JSON.stringify({
                complaints: '',
                history: '',
                exam: '',
                vitals: '',
                diagnosis: '',
                investigations: '',
                advice: '',
                follow_up: '',
              }),
              org_shared: true,
            },
          },
        },
        result: {
          data: {
            createEncounterTemplate: {
              __typename: 'EncounterTemplate',
              id: 'tpl-1',
              name: 'Standard OPD Note',
              specialty: null,
              sections_json: '{}',
            },
          },
        },
      },
      {
        request: { query: ENCOUNTER_TEMPLATES },
        result: {
          data: {
            encounterTemplates: [
              { __typename: 'EncounterTemplate', id: 'tpl-1', name: 'Standard OPD Note', specialty: null, sections_json: '{}' },
            ],
          },
        },
      },
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
      investigation_orders: [
        {
          __typename: 'InvestigationOrder',
          id: 'inv-1',
          test_name: 'CBC',
          test_type: 'Blood',
          urgency: 'routine',
          status: 'pending',
          date_ordered: '2026-08-26T10:00:00.000Z',
        },
      ],
    })
    renderPage(baseMocks(enc))

    await waitFor(() => expect(screen.getByText('CBC')).toBeInTheDocument())
    expect(screen.getByText('Blood')).toBeInTheDocument()
  })

  it('orders an investigation via the real orderInvestigation mutation and refetches', async () => {
    const enc = encounter()
    const withOrder = encounter({
      investigation_orders: [
        {
          __typename: 'InvestigationOrder',
          id: 'inv-2',
          test_name: 'Chest X-Ray',
          test_type: 'Imaging',
          urgency: 'urgent',
          status: 'pending',
          date_ordered: '2026-08-26T10:00:00.000Z',
        },
      ],
    })
    renderPage([
      ...baseMocks(enc),
      {
        request: {
          query: ORDER_INVESTIGATION,
          variables: { input: { encounter_id: ENCOUNTER_ID, test_name: 'Chest X-Ray', test_type: 'Imaging', urgency: 'urgent' } },
        },
        result: {
          data: {
            orderInvestigation: {
              __typename: 'InvestigationOrder',
              id: 'inv-2',
              test_name: 'Chest X-Ray',
              test_type: 'Imaging',
              urgency: 'urgent',
              status: 'pending',
              date_ordered: '2026-08-26T10:00:00.000Z',
            },
          },
        },
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
      referrals: [
        {
          __typename: 'Referral',
          id: 'ref-1',
          referred_to_specialty: 'Cardiology',
          referred_to_clinician_id: null,
          reason: 'Murmur on exam',
          urgency: 'routine',
          status: 'pending',
          created_at: '2026-08-26T10:00:00.000Z',
        },
      ],
    })
    renderPage(baseMocks(enc))

    await waitFor(() => expect(screen.getByText('Cardiology')).toBeInTheDocument())
    expect(screen.getByText('Murmur on exam')).toBeInTheDocument()
  })

  it('refers a patient via the real createReferral mutation and refetches', async () => {
    const enc = encounter()
    const withReferral = encounter({
      referrals: [
        {
          __typename: 'Referral',
          id: 'ref-2',
          referred_to_specialty: 'Orthopaedics',
          referred_to_clinician_id: null,
          reason: 'Chronic knee pain',
          urgency: 'routine',
          status: 'pending',
          created_at: '2026-08-26T10:00:00.000Z',
        },
      ],
    })
    renderPage([
      ...baseMocks(enc),
      {
        request: {
          query: CREATE_REFERRAL,
          variables: {
            input: { encounter_id: ENCOUNTER_ID, referred_to_specialty: 'Orthopaedics', reason: 'Chronic knee pain', urgency: 'routine' },
          },
        },
        result: {
          data: {
            createReferral: {
              __typename: 'Referral',
              id: 'ref-2',
              referred_to_specialty: 'Orthopaedics',
              referred_to_clinician_id: null,
              reason: 'Chronic knee pain',
              urgency: 'routine',
              status: 'pending',
              created_at: '2026-08-26T10:00:00.000Z',
            },
          },
        },
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

  // REQ135
  it('shows the legal next-status buttons for a pending referral', async () => {
    const enc = encounter({
      referrals: [
        {
          __typename: 'Referral',
          id: 'ref-1',
          referred_to_specialty: 'Cardiology',
          referred_to_clinician_id: null,
          reason: 'Murmur on exam',
          urgency: 'routine',
          status: 'pending',
          created_at: '2026-08-26T10:00:00.000Z',
        },
      ],
    })
    renderPage(baseMocks(enc))

    await waitFor(() => expect(screen.getByText('Cardiology')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Mark scheduled' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark completed' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark declined' })).toBeInTheDocument()
  })

  it('shows no transition buttons for a terminal (completed) referral', async () => {
    const enc = encounter({
      referrals: [
        {
          __typename: 'Referral',
          id: 'ref-1',
          referred_to_specialty: 'Cardiology',
          referred_to_clinician_id: null,
          reason: 'Murmur on exam',
          urgency: 'routine',
          status: 'completed',
          created_at: '2026-08-26T10:00:00.000Z',
        },
      ],
    })
    renderPage(baseMocks(enc))

    await waitFor(() => expect(screen.getByText('Cardiology')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /Mark /i })).not.toBeInTheDocument()
  })

  // Every test in this file mounts the full EncounterWorkspace, which now
  // renders 8 real TipTap/ProseMirror editor instances (FORM-20, one per
  // SECTIONS entry). jsdom has no real layout engine, so mounting 8
  // ProseMirror views is measurably slower here than in a real browser
  // (confirmed live: a real Chrome page renders and interacts with them
  // without any perceptible lag) -- this specific test's own extra
  // mutation+refetch+re-render work on top of that mount cost pushes it
  // past the default 5s jest timeout on this host. A longer timeout, not
  // a code change, is the correct fix for a jsdom-environment cost, not a
  // real one.
  it('advances a referral to scheduled via the real updateReferralStatus mutation and refetches', async () => {
    const enc = encounter({
      referrals: [
        {
          __typename: 'Referral',
          id: 'ref-1',
          referred_to_specialty: 'Cardiology',
          referred_to_clinician_id: null,
          reason: 'Murmur on exam',
          urgency: 'routine',
          status: 'pending',
          created_at: '2026-08-26T10:00:00.000Z',
        },
      ],
    })
    const scheduled = encounter({
      referrals: [
        {
          __typename: 'Referral',
          id: 'ref-1',
          referred_to_specialty: 'Cardiology',
          referred_to_clinician_id: null,
          reason: 'Murmur on exam',
          urgency: 'routine',
          status: 'scheduled',
          created_at: '2026-08-26T10:00:00.000Z',
        },
      ],
    })
    renderPage([
      ...baseMocks(enc),
      {
        request: { query: UPDATE_REFERRAL_STATUS, variables: { id: 'ref-1', input: { status: 'scheduled' } } },
        result: { data: { updateReferralStatus: { __typename: 'Referral', id: 'ref-1', status: 'scheduled' } } },
      },
      { request: { query: ENCOUNTER_QUERY, variables: { id: ENCOUNTER_ID } }, result: { data: { encounter: scheduled } } },
    ])

    await waitFor(() => expect(screen.getByRole('button', { name: 'Mark scheduled' })).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Mark scheduled' }))

    await waitFor(() => expect(screen.getByRole('button', { name: 'Mark completed' })).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: 'Mark scheduled' })).not.toBeInTheDocument()
  }, 15000)
})

describe('EncounterWorkspace — vitals + growth chart (REQ130)', () => {
  it('renders real recorded vitals as chips, not just an empty state', async () => {
    const enc = encounter({
      vitals: [{ __typename: 'Vital', id: 'v-1', code: 'weight_kg', value: 25, unit: 'kg', recorded_at: '2026-08-26T10:00:00.000Z' }],
    })
    renderPage(baseMocks(enc))

    await waitFor(() => expect(screen.getByText('Weight: 25 kg')).toBeInTheDocument())
  })

  it('records a batch of vitals via the real recordVitals mutation and refetches', async () => {
    const enc = encounter()
    const withVitals = encounter({
      vitals: [{ __typename: 'Vital', id: 'v-2', code: 'weight_kg', value: 30, unit: 'kg', recorded_at: '2026-08-26T10:00:00.000Z' }],
    })
    renderPage([
      ...baseMocks(enc),
      {
        request: {
          query: RECORD_VITALS,
          variables: { input: { encounter_id: ENCOUNTER_ID, readings: [{ code: 'weight_kg', value: 30 }] } },
        },
        result: {
          data: {
            recordVitals: [
              { __typename: 'Vital', id: 'v-2', code: 'weight_kg', value: 30, unit: 'kg', recorded_at: '2026-08-26T10:00:00.000Z' },
            ],
          },
        },
      },
      { request: { query: ENCOUNTER_QUERY, variables: { id: ENCOUNTER_ID } }, result: { data: { encounter: withVitals } } },
    ])

    await waitFor(() => expect(screen.getByText('No vitals recorded yet.')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Record Vitals' }))
    const dialog = await screen.findByRole('dialog')
    await userEvent.type(within(dialog).getByLabelText('Weight (kg)'), '30')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(screen.getByText('Weight: 30 kg')).toBeInTheDocument())
  }, 20000)

  it('opens the growth chart and shows real weight/height trend data', async () => {
    const enc = encounter()
    renderPage([
      ...baseMocks(enc),
      {
        request: { query: PATIENT_VITALS, variables: { patient_id: PATIENT_ID, code: 'weight_kg' } },
        result: {
          data: {
            patientVitals: [
              { __typename: 'Vital', id: 'v-1', code: 'weight_kg', value: 20, unit: 'kg', recorded_at: '2026-01-01T00:00:00.000Z' },
            ],
          },
        },
      },
      {
        request: { query: PATIENT_VITALS, variables: { patient_id: PATIENT_ID, code: 'height_cm' } },
        result: { data: { patientVitals: [] } },
      },
    ])

    await waitFor(() => expect(screen.getByText('No vitals recorded yet.')).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Growth Chart' }))
    await waitFor(() => expect(screen.getByText('No height readings recorded yet.')).toBeInTheDocument())
    expect(screen.queryByText('No weight readings recorded yet.')).not.toBeInTheDocument()
    // recharts' ResponsiveContainer render is genuinely slow under jsdom's
    // mocked ResizeObserver (see this file's own header comment) -- this
    // test sat right at Jest's bare 5000ms default under host load, the
    // same class of flakiness already confirmed and fixed for its sibling
    // tests in this file. Extended to match, not a sign of a slower test
    // introduced by this change.
  }, 20000)

  it('sets the obstetric LMP date via the real setEncounterLmpDate mutation and refetches (REQ172)', async () => {
    const enc = encounter()
    const withLmp = encounter({ lmp_date: '2025-12-21T00:00:00.000Z' })
    renderPage([
      ...baseMocks(enc),
      {
        request: {
          query: SET_ENCOUNTER_LMP_DATE,
          variables: { encounter_id: ENCOUNTER_ID, lmp_date: '2025-12-21' },
        },
        result: { data: { setEncounterLmpDate: { __typename: 'Encounter', id: ENCOUNTER_ID, lmp_date: '2025-12-21T00:00:00.000Z' } } },
      },
      { request: { query: ENCOUNTER_QUERY, variables: { id: ENCOUNTER_ID } }, result: { data: { encounter: withLmp } } },
    ])

    const field = await screen.findByLabelText('LMP Date (obstetric)')
    expect(field).toHaveValue('')
    fireEvent.change(field, { target: { value: '2025-12-21' } })

    await waitFor(() => expect(screen.getByLabelText('LMP Date (obstetric)')).toHaveValue('2025-12-21'))
  })
})

describe('EncounterWorkspace — AI Scribe (P1-11/P1-12)', () => {
  it('badges an AI-generated note section and leaves a human-authored one unbadged', async () => {
    const enc = encounter({
      notes: [
        { __typename: 'EncounterNote', id: 'n-1', section: 'advice', content: 'Rest and fluids', version: 1, ai_generated: true },
        { __typename: 'EncounterNote', id: 'n-2', section: 'complaints', content: 'Fever x2 days', version: 1, ai_generated: false },
      ],
    })
    renderPage(baseMocks(enc))

    // RichTextEditor (FORM-20) renders content in a contentEditable div, not
    // a native form control, so its value isn't queryable via
    // getByDisplayValue -- assert on the rendered text instead.
    await waitFor(() => expect(screen.getByText('Rest and fluids')).toBeInTheDocument())
    expect(screen.getByText('AI draft — review before signing')).toBeInTheDocument()
    // Only one section is flagged -- exactly one badge, not one per section.
    expect(screen.getAllByText('AI draft — review before signing')).toHaveLength(1)
  })

  it('badges an AI-generated vital reading', async () => {
    const enc = encounter({
      vitals: [{ __typename: 'Vital', id: 'v-ai', code: 'bp_systolic', value: 118, unit: 'mmHg', recorded_at: '2026-08-27T09:00:00.000Z', ai_generated: true }],
    })
    renderPage(baseMocks(enc))

    await waitFor(() => expect(screen.getByText('BP Systolic: 118 mmHg')).toBeInTheDocument())
    const chip = screen.getByText('BP Systolic: 118 mmHg').closest('.MuiChip-root')
    expect(within(chip).getByTestId('AutoAwesomeRoundedIcon')).toBeInTheDocument()
  })

  it('shows the pre-consult summary the backend ranks, when there is one', async () => {
    const enc = encounter()
    renderPage([
      ...baseMocks(enc).filter((m) => m.request.query !== PRE_CONSULT_SUMMARY),
      {
        request: { query: PRE_CONSULT_SUMMARY, variables: { patientId: PATIENT_ID } },
        result: { data: { preConsultSummary: ['⚠ Allergic to: Penicillin', 'Last diagnosis: Hypertension'] } },
      },
    ])

    await waitFor(() => expect(screen.getByText('⚠ Allergic to: Penicillin')).toBeInTheDocument())
    expect(screen.getByText('Last diagnosis: Hypertension')).toBeInTheDocument()
  })

  it('hides recording controls and shows a graceful notice when this browser cannot record', async () => {
    // jsdom has no MediaRecorder by default -- the real "never a broken
    // button" (WV-17) fallback for the majority of headless/CI browsers.
    const enc = encounter()
    renderPage(baseMocks(enc))

    await waitFor(() => expect(screen.getByText('AI Scribe')).toBeInTheDocument())
    expect(screen.getByText(/doesn't support in-app recording/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Record Consultation' })).not.toBeInTheDocument()
  })

  describe('with a recording-capable browser', () => {
    const originalMediaRecorder = window.MediaRecorder
    const originalMediaDevices = navigator.mediaDevices
    const originalFileReader = global.FileReader
    const FAKE_AUDIO_BASE64 = 'ZmFrZS1hdWRpbw=='

    beforeEach(() => {
      window.MediaRecorder = class {
        constructor() {}
        start() {}
        stop() {
          this.ondataavailable?.({ data: { size: 1, type: 'audio/webm' } })
          this.onstop?.()
        }
      }
      // Stubbed so the resulting base64 is a fixed, assertable value --
      // this test exercises the GraphQL wiring, not jsdom's own Blob/
      // FileReader byte-for-byte encoding of a fake MediaRecorder chunk.
      global.FileReader = class {
        readAsDataURL() {
          this.result = `data:audio/webm;base64,${FAKE_AUDIO_BASE64}`
          this.onloadend?.()
        }
      }
    })

    afterEach(() => {
      window.MediaRecorder = originalMediaRecorder
      global.FileReader = originalFileReader
      Object.defineProperty(navigator, 'mediaDevices', { value: originalMediaDevices, configurable: true })
    })

    it('shows a graceful error, not a crash, when microphone access is denied', async () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: jest.fn().mockRejectedValue(new Error('Permission denied')) },
        configurable: true,
      })
      const enc = encounter()
      renderPage([
        ...baseMocks(enc),
        {
          request: { query: START_TRANSCRIPTION_SESSION, variables: { input: { encounter_id: ENCOUNTER_ID, consent_given: true } } },
          result: { data: { startTranscriptionSession: { __typename: 'AiTranscriptionSession', id: 'sess-1', status: 'recording' } } },
        },
      ])

      await waitFor(() => expect(screen.getByRole('button', { name: 'Record Consultation' })).toBeInTheDocument())
      await userEvent.click(screen.getByRole('button', { name: 'Record Consultation' }))
      const dialog = await screen.findByRole('dialog')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Patient Consents — Start Recording' }))

      await waitFor(() => expect(screen.getByText('Permission denied')).toBeInTheDocument())
      // No crash: the rest of the workspace is still usable. `hidden: true`
      // because MUI's Dialog exit transition never resolves under jsdom (no
      // real `transitionend`), leaving its aria-hidden wrapper in place --
      // a jsdom/MUI-transition artifact, not a real app bug.
      await waitFor(() => expect(screen.getByRole('button', { name: 'Record Consultation', hidden: true })).toBeInTheDocument())
    }, 20000)

    it('records, transcribes, drafts AI-flagged notes, and offers Voice-to-Rx through the real mutations end to end', async () => {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: jest.fn().mockResolvedValue({ getTracks: () => [{ stop: jest.fn() }] }) },
        configurable: true,
      })
      const enc = encounter()
      const withAiNotes = encounter({
        notes: [{ __typename: 'EncounterNote', id: 'n-ai', section: 'advice', content: 'Paracetamol advised', version: 1, ai_generated: true }],
      })
      const submitMockFor = (durationSeconds) => ({
        request: {
          query: SUBMIT_TRANSCRIPTION,
          variables: { input: { session_id: 'sess-1', audio_base64: FAKE_AUDIO_BASE64, duration_seconds: durationSeconds } },
        },
        result: { data: { submitTranscription: { __typename: 'AiTranscriptionSession', id: 'sess-1', status: 'transcribed', error_message: null } } },
      })
      renderPage([
        ...baseMocks(enc),
        {
          request: { query: START_TRANSCRIPTION_SESSION, variables: { input: { encounter_id: ENCOUNTER_ID, consent_given: true } } },
          result: { data: { startTranscriptionSession: { __typename: 'AiTranscriptionSession', id: 'sess-1', status: 'recording' } } },
        },
        // duration_seconds is real wall-clock elapsed time (min 1s); allow
        // either value a fast test run can plausibly land on rather than
        // pinning to a single fragile number.
        submitMockFor(1),
        submitMockFor(2),
        {
          request: { query: STRUCTURE_TRANSCRIPT_SESSION, variables: { sessionId: 'sess-1' } },
          result: {
            data: {
              structureTranscriptSession: {
                __typename: 'StructureTranscriptResult',
                success: true,
                message: null,
                sections: [{ __typename: 'AiStructuredSection', section: 'advice', content: 'Paracetamol advised' }],
                vitals: [],
              },
            },
          },
        },
        { request: { query: ENCOUNTER_QUERY, variables: { id: ENCOUNTER_ID } }, result: { data: { encounter: withAiNotes } } },
        {
          request: { query: AI_EXTRACTED_PRESCRIPTION_DRAFT, variables: { sessionId: 'sess-1' } },
          result: {
            data: {
              aiExtractedPrescriptionDraft: [
                { __typename: 'AiExtractedPrescriptionItem', drug_name_text: 'paracetamol', drug_id: null, matched_drug_name: null, dose: '500mg', frequency: 'BD', duration_days: 5 },
              ],
            },
          },
        },
      ])

      // MUI's Dialog exit transition never resolves under jsdom (no real
      // `transitionend`), which leaves its aria-hidden wrapper on the rest
      // of the page indefinitely -- a jsdom/MUI-transition artifact, not a
      // real app bug (nothing in this suite's other dialogs asserts via
      // getByRole post-close for the same reason). `hidden: true` opts
      // back into querying past that wrapper, same as every getByText
      // assertion elsewhere in this file already implicitly does.
      const findHiddenButton = (name) => screen.findByRole('button', { name, hidden: true })

      await waitFor(() => expect(screen.getByRole('button', { name: 'Record Consultation' })).toBeInTheDocument())
      await userEvent.click(screen.getByRole('button', { name: 'Record Consultation' }))
      const dialog = await screen.findByRole('dialog')
      await userEvent.click(within(dialog).getByRole('button', { name: 'Patient Consents — Start Recording' }))

      await userEvent.click(await findHiddenButton('Stop Recording'))
      await userEvent.click(await findHiddenButton('Draft Notes From Recording'))

      // The structuring write really landed and refetched: the badge now
      // shows on the real, re-fetched encounter, not an optimistic guess.
      await waitFor(() => expect(screen.getByText('AI draft — review before signing')).toBeInTheDocument())

      await userEvent.click(await findHiddenButton('Voice-to-Rx: Draft Prescription'))
      const marker = await screen.findByTestId('prescription-builder-marker')
      const state = JSON.parse(marker.textContent)
      expect(state.aiDraftItems).toEqual([
        {
          __typename: 'AiExtractedPrescriptionItem',
          drug_name_text: 'paracetamol',
          drug_id: null,
          matched_drug_name: null,
          dose: '500mg',
          frequency: 'BD',
          duration_days: 5,
        },
      ])
    }, 20000)
  })
})

describe('EncounterWorkspace — Prescriptions section (reported: "I can\'t see the prescription")', () => {
  it('renders a real prescription issued in this encounter, not just an empty state', async () => {
    const enc = encounter()
    const mocks = [
      ...baseMocks(enc).filter((m) => m.request.query !== ENCOUNTER_PRESCRIPTIONS_QUERY),
      {
        request: { query: ENCOUNTER_PRESCRIPTIONS_QUERY, variables: { patient_id: PATIENT_ID } },
        result: {
          data: {
            patientPrescriptions: [
              {
                __typename: 'Prescription',
                id: 'rx-1',
                encounter_id: ENCOUNTER_ID,
                issued_at: '2026-08-30T10:00:00.000Z',
                items: [{ __typename: 'PrescriptionItem', drug_name: 'Paracetamol', dose: '500mg', frequency: 'BD' }],
              },
              // A different encounter's prescription -- must NOT appear here.
              {
                __typename: 'Prescription',
                id: 'rx-2',
                encounter_id: 'enc-other',
                issued_at: '2026-08-20T10:00:00.000Z',
                items: [{ __typename: 'PrescriptionItem', drug_name: 'Ibuprofen', dose: '400mg', frequency: 'TDS' }],
              },
            ],
          },
        },
      },
    ]
    renderPage(mocks)
    await waitFor(() => expect(screen.getByText('Paracetamol')).toBeInTheDocument())
    expect(screen.queryByText('Ibuprofen')).not.toBeInTheDocument()
    expect(screen.queryByText('No prescriptions issued in this consultation yet.')).not.toBeInTheDocument()
  })

  it('shows a real empty state when nothing has been prescribed in this encounter', async () => {
    renderPage(baseMocks(encounter()))
    await waitFor(() => expect(screen.getByText('No prescriptions issued in this consultation yet.')).toBeInTheDocument())
  })
})
