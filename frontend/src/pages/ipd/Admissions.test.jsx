import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { gql } from '@apollo/client'
import IpdAdmissions from './Admissions'
import { CLINICS_QUERY } from '../../graphql/queries'

// REQ179 (IPD slice 1) — first coverage for the admissions page: real-data
// list rendering, the full New Admission flow (patient search, ward → bed
// cascade), and the detail dialog's transfer/discharge/MLC actions.

const ADMISSION_FIELDS = `
  id
  admission_number
  status
  admission_type
  admitted_at
  expected_discharge_at
  discharge_initiated_at
  discharged_at
  discharge_type
  patient { id full_name phone gender date_of_birth }
  admitting_clinician { id full_name }
  attending_clinician { id full_name }
  clinic_id
  clinic_name
  department_id
  department_name
  current_bed { bed_id bed_number ward_id ward_name ward_type start_at }
  bed_history { bed_id bed_number ward_id ward_name ward_type start_at end_at end_reason }
  provisional_diagnosis
  final_diagnosis
  admission_notes
  billing_mode
  payer_id
  payer_name
  is_mlc
  is_critical
  length_of_stay_days
  created_at
`
const ADMISSIONS_QUERY = gql`
  query IpdAdmissions($filter: AdmissionFilterInput) {
    admissions(filter: $filter) { ${ADMISSION_FIELDS} }
  }
`
const ADMISSION_EVENTS_QUERY = gql`
  query IpdAdmissionEvents($admission_id: ID!) {
    admissionEvents(admission_id: $admission_id) {
      id event_type occurred_at notes actor_name from_bed_number to_bed_number from_ward_name to_ward_name reason
    }
  }
`
const WARDS_QUERY = gql`
  query WardsForAdmit($clinic_id: ID) { wards(clinic_id: $clinic_id) { id name ward_type } }
`
const BEDS_QUERY = gql`
  query BedsForAdmit($ward_id: ID, $clinic_id: ID) { beds(ward_id: $ward_id, clinic_id: $clinic_id) { id bed_number status ward_id ward_name } }
`
const CLINICIANS_LEAN_QUERY = gql`
  query CliniciansForAdmit($clinic_id: ID) { clinicians(clinic_id: $clinic_id, is_active: true, first: 100) { data { id full_name } } }
`
const SEARCH_PATIENTS_QUERY = gql`
  query PatientsForAdmit($search: String) { patients(search: $search, first: 15) { data { id full_name phone } } }
`
const CREATE_ADMISSION = gql`
  mutation CreateAdmission($input: CreateAdmissionInput!) { createAdmission(input: $input) { ${ADMISSION_FIELDS} } }
`
const TRANSFER_BED = gql`
  mutation TransferAdmissionBed($input: TransferAdmissionBedInput!) { transferAdmissionBed(input: $input) { ${ADMISSION_FIELDS} } }
`
const DISCHARGE_ADMISSION = gql`
  mutation DischargeAdmission($input: DischargeAdmissionInput!) { dischargeAdmission(input: $input) { ${ADMISSION_FIELDS} } }
`

const clinicA = { __typename: 'Clinic', id: 'clinic-a', name: 'City Care Clinic', address: '1 Road', city: null, postcode: null, phone: '1', email: 'a@a.com', timezone: 'Asia/Kolkata', is_active: true, is_primary: true }

const admissionA = {
  __typename: 'Admission',
  id: 'adm-1',
  admission_number: 'ADM/2026-27/00001',
  status: 'admitted',
  admission_type: 'general',
  admitted_at: '2026-09-01T10:00:00.000Z',
  expected_discharge_at: null,
  discharge_initiated_at: null,
  discharged_at: null,
  discharge_type: null,
  patient: { __typename: 'AdmissionPatient', id: 'pat-1', full_name: 'Jane Doe', phone: '9999999999', gender: null, date_of_birth: null },
  admitting_clinician: { __typename: 'AdmissionClinician', id: 'clin-1', full_name: 'Dr. Sam Rao' },
  attending_clinician: { __typename: 'AdmissionClinician', id: 'clin-1', full_name: 'Dr. Sam Rao' },
  clinic_id: 'clinic-a',
  clinic_name: 'City Care Clinic',
  department_id: null,
  department_name: null,
  current_bed: { __typename: 'AdmissionBedPlacement', bed_id: 'bed-1', bed_number: 'A-01', ward_id: 'ward-a', ward_name: 'Ward A', ward_type: 'general', start_at: '2026-09-01T10:00:00.000Z' },
  bed_history: [{ __typename: 'AdmissionBedPlacement', bed_id: 'bed-1', bed_number: 'A-01', ward_id: 'ward-a', ward_name: 'Ward A', ward_type: 'general', start_at: '2026-09-01T10:00:00.000Z', end_at: null, end_reason: null }],
  provisional_diagnosis: 'Observation',
  final_diagnosis: null,
  admission_notes: '',
  billing_mode: 'itemized',
  payer_id: null,
  payer_name: null,
  is_mlc: false,
  is_critical: false,
  length_of_stay_days: 1,
  created_at: '2026-09-01T10:00:00.000Z',
}

function baseMocks(admissions = [admissionA]) {
  return [
    { request: { query: CLINICS_QUERY }, result: { data: { clinics: [clinicA] } } },
    {
      request: { query: ADMISSIONS_QUERY, variables: { filter: { clinic_id: 'clinic-a', status: 'admitted', limit: 100 } } },
      result: { data: { admissions } },
    },
  ]
}

function renderPage(mocks) {
  return render(
    <MemoryRouter>
      <MockedProvider mocks={mocks} addTypename={false}>
        <IpdAdmissions />
      </MockedProvider>
    </MemoryRouter>,
  )
}

describe('ipd/Admissions', () => {
  it('renders the empty state when no admissions match the filter', async () => {
    renderPage(baseMocks([]))
    await waitFor(() => expect(screen.getByText(/no admissions match this filter/i)).toBeInTheDocument())
  })

  it('lists a real admission, not mock data', async () => {
    renderPage(baseMocks())
    await waitFor(() => expect(screen.getByText('ADM/2026-27/00001')).toBeInTheDocument())
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('A-01 (Ward A)')).toBeInTheDocument()
  })

  it('completes the New Admission flow end to end', async () => {
    const mocks = [
      ...baseMocks([]),
      { request: { query: WARDS_QUERY, variables: { clinic_id: 'clinic-a' } }, result: { data: { wards: [{ __typename: 'Ward', id: 'ward-a', name: 'Ward A', ward_type: 'general' }] } } },
      { request: { query: CLINICIANS_LEAN_QUERY, variables: { clinic_id: 'clinic-a' } }, result: { data: { clinicians: { __typename: 'ClinicianConnection', data: [{ __typename: 'Clinician', id: 'clin-1', full_name: 'Dr. Sam Rao' }] } } } },
      { request: { query: BEDS_QUERY, variables: { ward_id: 'ward-a' } }, result: { data: { beds: [{ __typename: 'Bed', id: 'bed-9', bed_number: 'A-09', status: 'available', ward_id: 'ward-a', ward_name: 'Ward A' }] } } },
      { request: { query: SEARCH_PATIENTS_QUERY, variables: { search: 'Jane' } }, result: { data: { patients: { __typename: 'PatientConnection', data: [{ __typename: 'Patient', id: 'pat-1', full_name: 'Jane Doe', phone: '9999999999' }] } } } },
      {
        request: { query: CREATE_ADMISSION, variables: { input: { clinic_id: 'clinic-a', patient_id: 'pat-1', bed_id: 'bed-9', admitting_clinician_id: 'clin-1', admission_type: 'general', provisional_diagnosis: undefined } } },
        result: { data: { createAdmission: { ...admissionA, id: 'adm-2', admission_number: 'ADM/2026-27/00002' } } },
      },
      ...baseMocks([admissionA]),
    ]
    renderPage(mocks)
    await waitFor(() => expect(screen.getByText(/no admissions match this filter/i)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: /new admission/i }))
    const dialog = await screen.findByRole('dialog')

    await userEvent.type(within(dialog).getByLabelText(/patient/i), 'Jane', { delay: null })
    const option = await screen.findByText('Jane Doe (9999999999)')
    fireEvent.click(option)

    fireEvent.mouseDown(within(dialog).getByLabelText(/^ward/i))
    fireEvent.click(await screen.findByRole('option', { name: 'Ward A' }))

    // The bed <Select> menu is a Popover, not mounted until opened, so "A-09"
    // only appears in the DOM once opened — and the beds query itself only
    // resolves after the ward is chosen, so this waits on both.
    fireEvent.mouseDown(within(dialog).getByLabelText(/^bed/i))
    fireEvent.click(await screen.findByRole('option', { name: 'A-09' }))

    fireEvent.mouseDown(within(dialog).getByLabelText(/admitting clinician/i))
    fireEvent.click(await screen.findByRole('option', { name: 'Dr. Sam Rao' }))

    fireEvent.click(within(dialog).getByRole('button', { name: /admit patient/i }))

    await waitFor(() => expect(screen.getByText(/admitted — ADM\/2026-27\/00002/i)).toBeInTheDocument())
  }, 15000)

  it('opens the detail dialog and shows the discharge action for a live admission', async () => {
    const mocks = [
      ...baseMocks(),
      { request: { query: ADMISSION_EVENTS_QUERY, variables: { admission_id: 'adm-1' } }, result: { data: { admissionEvents: [] } } },
    ]
    renderPage(mocks)
    await waitFor(() => expect(screen.getByText('ADM/2026-27/00001')).toBeInTheDocument())
    fireEvent.click(screen.getByText('ADM/2026-27/00001'))

    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', { name: /discharge/i })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /transfer/i })).toBeInTheDocument()
  })

  it('submits a discharge and refreshes the list', async () => {
    const mocks = [
      ...baseMocks(),
      { request: { query: ADMISSION_EVENTS_QUERY, variables: { admission_id: 'adm-1' } }, result: { data: { admissionEvents: [] } } },
      {
        request: { query: DISCHARGE_ADMISSION, variables: { input: { admission_id: 'adm-1', discharge_type: 'routine', final_diagnosis: undefined } } },
        result: { data: { dischargeAdmission: { ...admissionA, status: 'discharged' } } },
      },
      { request: { query: ADMISSIONS_QUERY, variables: { filter: { clinic_id: 'clinic-a', status: 'admitted', limit: 100 } } }, result: { data: { admissions: [] } } },
    ]
    renderPage(mocks)
    await waitFor(() => expect(screen.getByText('ADM/2026-27/00001')).toBeInTheDocument())
    fireEvent.click(screen.getByText('ADM/2026-27/00001'))
    const detailDialog = await screen.findByRole('dialog')
    fireEvent.click(within(detailDialog).getByRole('button', { name: /discharge/i }))

    const dischargeDialog = await screen.findByRole('dialog', { name: /discharge patient/i })
    fireEvent.click(within(dischargeDialog).getByRole('button', { name: /confirm discharge/i }))

    await waitFor(() => expect(screen.getByText(/patient discharged/i)).toBeInTheDocument())
  })

  it('shows the police-intimation-overdue warning for a flagged MLC admission', async () => {
    const mlcAdmission = { ...admissionA, id: 'adm-3', admission_number: 'ADM/2026-27/00003', is_mlc: true }
    const mocks = [
      { request: { query: CLINICS_QUERY }, result: { data: { clinics: [clinicA] } } },
      { request: { query: ADMISSIONS_QUERY, variables: { filter: { clinic_id: 'clinic-a', status: 'admitted', limit: 100 } } }, result: { data: { admissions: [mlcAdmission] } } },
      { request: { query: ADMISSION_EVENTS_QUERY, variables: { admission_id: 'adm-3' } }, result: { data: { admissionEvents: [] } } },
      {
        request: { query: gql`query IpdMlcRegisters($clinic_id: ID) { mlcRegisters(clinic_id: $clinic_id) { id mlc_number admission_id mlc_category identification_mark_1 identification_mark_2 injury_details police_intimated_at police_intimation_overdue recorded_at } }`, variables: { clinic_id: 'clinic-a' } },
        result: {
          data: {
            mlcRegisters: [
              { __typename: 'MlcRegister', id: 'mlc-1', mlc_number: 'MLC/2026-27/00001', admission_id: 'adm-3', mlc_category: 'road_accident', identification_mark_1: 'Scar', identification_mark_2: 'Mole', injury_details: 'Abrasions', police_intimated_at: null, police_intimation_overdue: true, recorded_at: '2026-08-30T00:00:00.000Z' },
            ],
          },
        },
      },
    ]
    renderPage(mocks)
    await waitFor(() => expect(screen.getByText('ADM/2026-27/00003')).toBeInTheDocument())
    fireEvent.click(screen.getByText('ADM/2026-27/00003'))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('tab', { name: /mlc/i }))
    await waitFor(() => expect(within(dialog).getByText(/police intimation is overdue/i)).toBeInTheDocument())
  })
})
