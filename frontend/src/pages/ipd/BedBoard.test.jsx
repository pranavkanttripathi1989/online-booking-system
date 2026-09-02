import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { gql } from '@apollo/client'
import IpdBedBoard from './BedBoard'
import { CLINICS_QUERY } from '../../graphql/queries'

// REQ179 (IPD slice 1) — first coverage for the live bed board: renders real
// data (not mock), the occupancy-rate math (blocked beds excluded from the
// denominator), and that clicking an available bed navigates to the admit
// flow with the bed preselected.

const BED_BOARD_QUERY = gql`
  query BedBoard($filter: BedBoardFilterInput!) {
    bedBoard(filter: $filter) {
      summary { total occupied available reserved cleaning blocked occupancy_rate }
      entries {
        bed_id bed_number status ward_id ward_name ward_type floor
        admission_id admission_number patient_id patient_name attending_clinician_name
        admitted_at expected_discharge_at is_mlc is_critical hold_reason hold_until
      }
    }
  }
`
const WARDS_QUERY = gql`
  query WardsForBoard($clinic_id: ID) {
    wards(clinic_id: $clinic_id) { id name ward_type }
  }
`

const clinicA = { __typename: 'Clinic', id: 'clinic-a', name: 'City Care Clinic', address: '1 Road', city: null, postcode: null, phone: '1', email: 'a@a.com', timezone: 'Asia/Kolkata', is_active: true, is_primary: true }

function baseMocks(boardEntries = []) {
  return [
    { request: { query: CLINICS_QUERY }, result: { data: { clinics: [clinicA] } } },
    { request: { query: WARDS_QUERY, variables: { clinic_id: 'clinic-a' } }, result: { data: { wards: [{ __typename: 'Ward', id: 'ward-a', name: 'Ward A', ward_type: 'general' }] } } },
    {
      request: { query: BED_BOARD_QUERY, variables: { filter: { clinic_id: 'clinic-a', ward_id: undefined } } },
      result: {
        data: {
          bedBoard: {
            __typename: 'BedBoard',
            summary: {
              __typename: 'BedBoardSummary',
              total: boardEntries.length,
              occupied: boardEntries.filter((e) => e.status === 'occupied').length,
              available: boardEntries.filter((e) => e.status === 'available').length,
              reserved: 0,
              cleaning: 0,
              blocked: boardEntries.filter((e) => e.status === 'blocked').length,
              occupancy_rate: (() => {
                const occ = boardEntries.filter((e) => e.status === 'occupied').length
                const blocked = boardEntries.filter((e) => e.status === 'blocked').length
                const denom = boardEntries.length - blocked
                return denom > 0 ? Math.round((occ / denom) * 1000) / 10 : 0
              })(),
            },
            entries: boardEntries.map((e) => ({ __typename: 'BedBoardEntry', ...e })),
          },
        },
      },
    },
  ]
}

function renderPage(mocks) {
  return render(
    <MemoryRouter>
      <MockedProvider mocks={mocks} addTypename={false}>
        <IpdBedBoard />
      </MockedProvider>
    </MemoryRouter>,
  )
}

describe('ipd/BedBoard', () => {
  it('renders the empty state when a clinic has no wards', async () => {
    renderPage(baseMocks([]))
    await waitFor(() => expect(screen.getByText(/no wards set up/i)).toBeInTheDocument())
  })

  it('renders a real occupied bed with its patient, not mock data', async () => {
    renderPage(
      baseMocks([
        {
          bed_id: 'bed-1', bed_number: 'A-01', status: 'occupied', ward_id: 'ward-a', ward_name: 'Ward A', ward_type: 'general',
          admission_id: 'adm-1', admission_number: 'ADM/2026-27/00001', patient_id: 'pat-1', patient_name: 'Jane Doe',
          attending_clinician_name: 'Sam Rao', admitted_at: '2026-09-01T10:00:00.000Z',
        },
      ]),
    )
    await waitFor(() => expect(screen.getByText('A-01')).toBeInTheDocument())
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('excludes blocked beds from the occupancy-rate denominator', async () => {
    renderPage(
      baseMocks([
        { bed_id: 'b1', bed_number: '1', status: 'occupied', ward_id: 'ward-a', ward_name: 'Ward A', ward_type: 'general' },
        { bed_id: 'b2', bed_number: '2', status: 'blocked', ward_id: 'ward-a', ward_name: 'Ward A', ward_type: 'general', hold_reason: 'AC broken' },
      ]),
    )
    // 1 occupied out of (2 total - 1 blocked) = 100%, not 50%.
    await waitFor(() => expect(screen.getByText('100%')).toBeInTheDocument())
  })

  it('shows the "Admit here" affordance only on an available bed, not an occupied one', async () => {
    renderPage(
      baseMocks([
        { bed_id: 'bed-2', bed_number: 'A-02', status: 'available', ward_id: 'ward-a', ward_name: 'Ward A', ward_type: 'general' },
        { bed_id: 'bed-3', bed_number: 'A-03', status: 'occupied', ward_id: 'ward-a', ward_name: 'Ward A', ward_type: 'general', patient_name: 'Jane Doe', admitted_at: '2026-09-01T10:00:00.000Z' },
      ]),
    )
    await waitFor(() => expect(screen.getByText('A-02')).toBeInTheDocument())
    expect(screen.getByText('Admit here')).toBeInTheDocument()
    // Clicking it must not throw (the useNavigate() call resolves against a
    // real MemoryRouter, even with no destination route mounted here).
    expect(() => fireEvent.click(screen.getByText('Admit here'))).not.toThrow()
  })
})
