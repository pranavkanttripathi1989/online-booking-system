import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import { gql } from '@apollo/client'
import PharmacyPage from './index'
import { CLINICS_QUERY, PATIENTS_QUERY } from '../../../graphql/queries'

// REQ059 (project-plans/08-integration-gap-analysis.md A-2/A-3) — smoke
// coverage for the Drug Catalog (real CRUD, platform-seeded rows hide
// edit/delete), Dispense (batch picker restricted to the matching drug),
// and Movement History additions to this page. Re-declares the page-local
// gql documents to match its own AST exactly, same convention as
// manager/packages/index.test.jsx.
//
// addTypename={true} + explicit __typename on every mock object, not this
// codebase's usual addTypename={false}: this page's own queries all use
// fetchPolicy: 'network-only', which writes through and reads back from
// the cache even on a first fetch — without a typename, Apollo can't
// normalize nested objects and silently drops their fields on readback
// (confirmed the same root cause, and the same fix, in
// pages/appointments/edit.test.jsx during BUG023).

const GET_DRUGS = gql`
  query GetDrugsFull {
    drugs { id name composition strength form schedule_class hsn gst_rate manufacturer is_platform_seeded }
  }
`
const GET_BATCHES = gql`
  query GetBatches($clinic_id: ID) {
    drugBatches(clinic_id: $clinic_id) { id drug_id batch_number quantity_received quantity_remaining expiry_date mrp }
  }
`
const GET_PATIENT_PRESCRIPTIONS = gql`
  query GetPatientPrescriptionsForDispense($patient_id: ID!) {
    patientPrescriptions(patient_id: $patient_id) {
      id issued_at
      items { id drug_id drug_name dose frequency duration_days qty }
    }
  }
`
const GET_STOCK_MOVEMENTS = gql`
  query GetStockMovements($batch_id: ID!) {
    stockMovements(batch_id: $batch_id) { id movement_type quantity_delta reference_type reference_id notes created_at }
  }
`
const CREATE_DRUG = gql`mutation CreateDrug($input: DrugInput!) { createDrug(input: $input) { id } }`
const DISPENSE_PRESCRIPTION_ITEM = gql`
  mutation DispensePrescriptionItem($input: DispensePrescriptionItemInput!) {
    dispensePrescriptionItem(input: $input) { id quantity_remaining }
  }
`

const clinicsMock = {
  request: { query: CLINICS_QUERY },
  result: { data: { clinics: [{ __typename: 'Clinic', id: 'clinic-1', name: 'MG Road Clinic', address: null, city: null, postcode: null, phone: null, email: null, timezone: null, is_active: true, is_primary: true }] } },
}

const platformDrug = { __typename: 'Drug', id: 'drug-platform', name: 'Paracetamol', composition: 'Paracetamol IP', strength: '500mg', form: 'Tablet', schedule_class: 'OTC', hsn: null, gst_rate: 12, manufacturer: 'Generic', is_platform_seeded: true }
const tenantDrug = { __typename: 'Drug', id: 'drug-tenant', name: 'CustomDrug', composition: null, strength: null, form: null, schedule_class: null, hsn: null, gst_rate: null, manufacturer: null, is_platform_seeded: false }

const drugsMock = (drugs = [platformDrug, tenantDrug]) => ({ request: { query: GET_DRUGS }, result: { data: { drugs } } })
const batchToGraphQL = (b) => ({ __typename: 'DrugBatch', ...b })
const batchesMock = (batches = []) => ({ request: { query: GET_BATCHES, variables: { clinic_id: undefined } }, result: { data: { drugBatches: batches.map(batchToGraphQL) } } })

function renderPage(mocks) {
  return render(
    <MockedProvider mocks={mocks} addTypename>
      <PharmacyPage />
    </MockedProvider>
  )
}

describe('manager/pharmacy (REQ059)', () => {
  it('Drug Catalog: real drugs render, and edit/delete are hidden for platform-seeded rows', async () => {
    renderPage([clinicsMock, drugsMock(), batchesMock()])
    fireEvent.click(await screen.findByRole('tab', { name: 'Drug Catalog' }))

    await waitFor(() => expect(screen.getByText('CustomDrug')).toBeInTheDocument())
    const platformRow = screen.getByText('Paracetamol').closest('tr')
    expect(within(platformRow).queryByLabelText(/Edit/)).not.toBeInTheDocument()
    const tenantRow = screen.getByText('CustomDrug').closest('tr')
    expect(within(tenantRow).getByLabelText('Edit CustomDrug')).toBeInTheDocument()
  })

  it('Drug Catalog: creating a drug calls the real mutation and refreshes the list', async () => {
    const mocks = [
      clinicsMock, drugsMock([tenantDrug]), batchesMock(),
      { request: { query: CREATE_DRUG, variables: { input: { name: 'New Drug', composition: undefined, strength: undefined, form: undefined, schedule_class: undefined, hsn: undefined, gst_rate: undefined, manufacturer: undefined } } }, result: { data: { createDrug: { __typename: 'Drug', id: 'drug-new' } } } },
      // loadRefData() refetches clinics alongside drugs on every call.
      clinicsMock,
      drugsMock([tenantDrug, { ...tenantDrug, id: 'drug-new', name: 'New Drug' }]),
    ]
    renderPage(mocks)
    fireEvent.click(await screen.findByRole('tab', { name: 'Drug Catalog' }))
    await waitFor(() => expect(screen.getByText('CustomDrug')).toBeInTheDocument())

    fireEvent.click(screen.getAllByRole('button', { name: 'Add Drug' })[0])
    fireEvent.change(screen.getByLabelText(/^Name/), { target: { value: 'New Drug' } })
    // The header's own "Add Drug" button and the form's submit button both
    // read "Add Drug" -- disambiguate by type, matching the e2e spec's fix
    // for the identical collision.
    fireEvent.click(document.querySelector('button[type="submit"]'))

    await waitFor(() => expect(screen.getByText('Drug added to catalog.')).toBeInTheDocument())
  })

  it('Dispense: the batch picker only offers batches matching the selected item\'s drug', async () => {
    const batches = [
      { id: 'batch-match', drug_id: 'drug-tenant', batch_number: 'MATCH-1', quantity_received: 50, quantity_remaining: 50, expiry_date: '2028-01-01', mrp: null },
      { id: 'batch-other', drug_id: 'drug-platform', batch_number: 'OTHER-1', quantity_received: 50, quantity_remaining: 50, expiry_date: '2028-01-01', mrp: null },
    ]
    const patient = { __typename: 'Patient', id: 'pat-1', first_name: 'Test', last_name: 'Patient', full_name: 'Test Patient', email: 'test@example.com', phone: '9000000000', date_of_birth: '1990-01-01', gender: null, address: null, notes: null, created_at: '2026-01-01T00:00:00.000Z' }
    const mocks = [
      clinicsMock, drugsMock(), batchesMock(batches),
      { request: { query: PATIENTS_QUERY, variables: { search: 'Test', first: 10 } }, result: { data: { patients: { __typename: 'PatientPaginated', data: [patient], paginatorInfo: { __typename: 'PatientPaginatorInfo', count: 1, currentPage: 1, hasMorePages: false, lastPage: 1, perPage: 10, total: 1 } } } } },
      { request: { query: GET_PATIENT_PRESCRIPTIONS, variables: { patient_id: 'pat-1' } }, result: { data: { patientPrescriptions: [{ __typename: 'Prescription', id: 'rx-1', issued_at: '2026-08-01T00:00:00.000Z', items: [{ __typename: 'PrescriptionItem', id: 'item-1', drug_id: 'drug-tenant', drug_name: 'CustomDrug', dose: '1 tab', frequency: 'OD', duration_days: 5, qty: 5 }] }] } } },
    ]
    renderPage(mocks)
    fireEvent.click(await screen.findByRole('tab', { name: 'Dispense' }))

    fireEvent.change(screen.getByLabelText('Search patient by name, email, or phone'), { target: { value: 'Test' } })
    await waitFor(() => expect(screen.getByText('Test Patient')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Test Patient'))

    await waitFor(() => expect(screen.getByText('CustomDrug')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Dispense' }))

    fireEvent.mouseDown(screen.getByTestId('dispense-batch-select').querySelector('[role="combobox"]'))
    const listbox = within(screen.getByRole('listbox'))
    expect(listbox.getByText(/MATCH-1/)).toBeInTheDocument()
    expect(listbox.queryByText(/OTHER-1/)).not.toBeInTheDocument()
  })

  // REQ125 (US-PHR-02) — FEFO default. findBatches() already orders by
  // expiry_date ascending server-side, so the mock array below is supplied
  // in that same real order; the earliest-expiring batch must be
  // pre-selected without the user touching the dropdown at all.
  it('Dispense: defaults the batch picker to the earliest-expiring batch (FEFO)', async () => {
    const batches = [
      { id: 'batch-early', drug_id: 'drug-tenant', batch_number: 'EARLY-1', quantity_received: 20, quantity_remaining: 20, expiry_date: '2027-01-01', mrp: null },
      { id: 'batch-late', drug_id: 'drug-tenant', batch_number: 'LATE-1', quantity_received: 20, quantity_remaining: 20, expiry_date: '2029-01-01', mrp: null },
    ]
    const patient = { __typename: 'Patient', id: 'pat-1', first_name: 'Test', last_name: 'Patient', full_name: 'Test Patient', email: 'test@example.com', phone: '9000000000', date_of_birth: '1990-01-01', gender: null, address: null, notes: null, created_at: '2026-01-01T00:00:00.000Z' }
    const mocks = [
      clinicsMock, drugsMock(), batchesMock(batches),
      { request: { query: PATIENTS_QUERY, variables: { search: 'Test', first: 10 } }, result: { data: { patients: { __typename: 'PatientPaginated', data: [patient], paginatorInfo: { __typename: 'PatientPaginatorInfo', count: 1, currentPage: 1, hasMorePages: false, lastPage: 1, perPage: 10, total: 1 } } } } },
      { request: { query: GET_PATIENT_PRESCRIPTIONS, variables: { patient_id: 'pat-1' } }, result: { data: { patientPrescriptions: [{ __typename: 'Prescription', id: 'rx-1', issued_at: '2026-08-01T00:00:00.000Z', items: [{ __typename: 'PrescriptionItem', id: 'item-1', drug_id: 'drug-tenant', drug_name: 'CustomDrug', dose: '1 tab', frequency: 'OD', duration_days: 5, qty: 5 }] }] } } },
      { request: { query: DISPENSE_PRESCRIPTION_ITEM, variables: { input: { prescription_item_id: 'item-1', batch_id: 'batch-early', quantity: 2 } } }, result: { data: { dispensePrescriptionItem: { __typename: 'DrugBatch', id: 'batch-early', quantity_remaining: 18 } } } },
      batchesMock(batches),
    ]
    renderPage(mocks)
    fireEvent.click(await screen.findByRole('tab', { name: 'Dispense' }))
    fireEvent.change(screen.getByLabelText('Search patient by name, email, or phone'), { target: { value: 'Test' } })
    await waitFor(() => expect(screen.getByText('Test Patient')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Test Patient'))
    await waitFor(() => expect(screen.getByText('CustomDrug')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Dispense' }))

    // No dropdown interaction at all -- just fill quantity and submit,
    // proving EARLY-1 was already selected as the default.
    fireEvent.change(screen.getByLabelText(/^Quantity/), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('dialog').querySelector('button[type="submit"]'))

    await waitFor(() => expect(screen.getByText('Dispensed.')).toBeInTheDocument())
  })

  it('Dispense: a real dispensePrescriptionItem call is made with the right variables', async () => {
    const batches = [{ id: 'batch-match', drug_id: 'drug-tenant', batch_number: 'MATCH-1', quantity_received: 50, quantity_remaining: 50, expiry_date: '2028-01-01', mrp: null }]
    const patient = { __typename: 'Patient', id: 'pat-1', first_name: 'Test', last_name: 'Patient', full_name: 'Test Patient', email: 'test@example.com', phone: '9000000000', date_of_birth: '1990-01-01', gender: null, address: null, notes: null, created_at: '2026-01-01T00:00:00.000Z' }
    const mocks = [
      clinicsMock, drugsMock(), batchesMock(batches),
      { request: { query: PATIENTS_QUERY, variables: { search: 'Test', first: 10 } }, result: { data: { patients: { __typename: 'PatientPaginated', data: [patient], paginatorInfo: { __typename: 'PatientPaginatorInfo', count: 1, currentPage: 1, hasMorePages: false, lastPage: 1, perPage: 10, total: 1 } } } } },
      { request: { query: GET_PATIENT_PRESCRIPTIONS, variables: { patient_id: 'pat-1' } }, result: { data: { patientPrescriptions: [{ __typename: 'Prescription', id: 'rx-1', issued_at: '2026-08-01T00:00:00.000Z', items: [{ __typename: 'PrescriptionItem', id: 'item-1', drug_id: 'drug-tenant', drug_name: 'CustomDrug', dose: '1 tab', frequency: 'OD', duration_days: 5, qty: 5 }] }] } } },
      { request: { query: DISPENSE_PRESCRIPTION_ITEM, variables: { input: { prescription_item_id: 'item-1', batch_id: 'batch-match', quantity: 2 } } }, result: { data: { dispensePrescriptionItem: { __typename: 'DrugBatch', id: 'batch-match', quantity_remaining: 48 } } } },
      batchesMock(batches),
    ]
    renderPage(mocks)
    fireEvent.click(await screen.findByRole('tab', { name: 'Dispense' }))
    fireEvent.change(screen.getByLabelText('Search patient by name, email, or phone'), { target: { value: 'Test' } })
    await waitFor(() => expect(screen.getByText('Test Patient')).toBeInTheDocument())
    fireEvent.click(screen.getByText('Test Patient'))
    await waitFor(() => expect(screen.getByText('CustomDrug')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Dispense' }))

    fireEvent.mouseDown(screen.getByTestId('dispense-batch-select').querySelector('[role="combobox"]'))
    fireEvent.click(within(screen.getByRole('listbox')).getByText(/MATCH-1/))
    fireEvent.change(screen.getByLabelText(/^Quantity/), { target: { value: '2' } })
    fireEvent.click(screen.getByRole('dialog').querySelector('button[type="submit"]'))

    await waitFor(() => expect(screen.getByText('Dispensed.')).toBeInTheDocument())
  })

  it('Movement History dialog shows real movements for a batch', async () => {
    const batches = [{ id: 'batch-1', drug_id: 'drug-tenant', batch_number: 'HIST-1', quantity_received: 50, quantity_remaining: 45, expiry_date: '2028-01-01', mrp: null }]
    const movements = [
      { __typename: 'StockMovement', id: 'mv-1', movement_type: 'receipt', quantity_delta: 50, reference_type: null, reference_id: null, notes: null, created_at: '2026-08-01T00:00:00.000Z' },
      { __typename: 'StockMovement', id: 'mv-2', movement_type: 'dispense', quantity_delta: -5, reference_type: 'prescription_item', reference_id: 'item-1', notes: null, created_at: '2026-08-02T00:00:00.000Z' },
    ]
    const mocks = [
      clinicsMock, drugsMock(), batchesMock(batches),
      { request: { query: GET_STOCK_MOVEMENTS, variables: { batch_id: 'batch-1' } }, result: { data: { stockMovements: movements } } },
    ]
    renderPage(mocks)
    await waitFor(() => expect(screen.getByText('HIST-1')).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('History for HIST-1'))

    await waitFor(() => expect(screen.getByText('Prescription dispense')).toBeInTheDocument())
    expect(screen.getByText('-5')).toBeInTheDocument()
    expect(screen.getByText('+50')).toBeInTheDocument()
  })
})
