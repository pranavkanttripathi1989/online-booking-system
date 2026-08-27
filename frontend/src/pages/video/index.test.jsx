import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing'
import { SnackbarProvider } from 'notistack'
import { gql } from '@apollo/client'
import dayjs from 'dayjs'
import VideoConsultationPage from './index'
import { APPOINTMENT_DETAIL_QUERY, AVAILABLE_SLOTS_QUERY } from '../../graphql/queries'
import { useAuth } from '../../hooks/useAuth'

jest.mock('../../hooks/useAuth', () => ({
  useAuth: jest.fn(),
}))

// P1-16 — re-declared to match video/index.jsx's own gql documents exactly
// (query AST equality, same convention as every other page test in this
// codebase).
const GET_OR_CREATE_ENCOUNTER = gql`
  mutation GetOrCreateEncounter($appointment_id: ID!) {
    getOrCreateEncounter(appointment_id: $appointment_id) {
      id
      patient_id
      clinician_id
    }
  }
`
const ENCOUNTER_MODE_QUERY = gql`
  query EncounterMode($id: ID!) {
    encounter(id: $id) {
      id
      consultation_mode
      locked
    }
  }
`
const CLINICIAN_REGISTRATION_QUERY = gql`
  query ClinicianRegistration($id: ID!) {
    clinician(id: $id) {
      id
      full_name
      registration_number
    }
  }
`
const JOIN_SESSION = gql`
  mutation JoinTelemedicineSession($encounter_id: ID!) {
    joinTelemedicineSession(encounter_id: $encounter_id) {
      id
      status
      valid_from
      valid_to
      recording_consent_at
      room_url
      token
    }
  }
`
const CONSENT_TO_RECORDING = gql`
  mutation ConsentToTelemedicineRecording($encounter_id: ID!) {
    consentToTelemedicineRecording(encounter_id: $encounter_id) {
      success
      recording_consent_at
    }
  }
`
const CREATE_APPOINTMENT = gql`
  mutation CreateEscalatedAppointment($input: AppointmentInput!) {
    createAppointment(input: $input) {
      id
    }
  }
`

const APPT_ID = 'appt-1'
const ENCOUNTER_ID = 'enc-1'
// The button label is a local-time render of this instant -- computed here
// the same way video/index.jsx itself does, so the assertion holds under
// any timezone the test happens to run in, not just IST.
const SLOT_START = '2026-09-02T10:00:00.000Z'
const SLOT_LABEL = dayjs(SLOT_START).format('h:mm A')

function apptResult(overrides = {}) {
  return {
    __typename: 'Appointment',
    id: APPT_ID,
    tenant_id: null,
    start_datetime: '2026-09-01T09:00:00.000Z',
    end_datetime: '2026-09-01T09:30:00.000Z',
    duration_minutes: 30,
    status: 'scheduled',
    type: 'video',
    booking_mode: 'slot',
    token_no: null,
    notes: null,
    cancellation_reason: null,
    reminder_sent_at: null,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    patient: { __typename: 'Patient', id: 'p1', first_name: 'Real', last_name: 'Patient', full_name: 'Real Patient', email: null, phone: null, date_of_birth: null, gender: null },
    clinician: { __typename: 'AppointmentClinician', id: 'c1', first_name: 'Real', last_name: 'Clinician', full_name: 'Dr. Real Clinician', avatar_url: null, clinician_type: null },
    clinic: { __typename: 'AppointmentClinic', id: 'clinic-1', name: 'Real Clinic', address: null, city: null, timezone: null },
    room: null,
    service: { __typename: 'AppointmentService', id: 'svc-1', name: 'GP Consult', duration_minutes: 30, price: 50000 },
    booked_by_user: null,
    status_logs: [],
    ...overrides,
  }
}

function baseMocks({ consultationMode = 'video' } = {}) {
  return [
    { request: { query: GET_OR_CREATE_ENCOUNTER, variables: { appointment_id: APPT_ID } }, result: { data: { getOrCreateEncounter: { __typename: 'Encounter', id: ENCOUNTER_ID, patient_id: 'p1', clinician_id: 'c1' } } } },
    { request: { query: ENCOUNTER_MODE_QUERY, variables: { id: ENCOUNTER_ID } }, result: { data: { encounter: { __typename: 'Encounter', id: ENCOUNTER_ID, consultation_mode: consultationMode, locked: false } } } },
    { request: { query: APPOINTMENT_DETAIL_QUERY, variables: { id: APPT_ID } }, result: { data: { appointment: apptResult() } } },
    { request: { query: CLINICIAN_REGISTRATION_QUERY, variables: { id: 'c1' } }, result: { data: { clinician: { __typename: 'Clinician', id: 'c1', full_name: 'Dr. Real Clinician', registration_number: 'MCI-12345' } } } },
  ]
}

function renderPage(mocks, role = 'patient') {
  useAuth.mockReturnValue({ hasRole: (r) => r === role })
  return render(
    <MemoryRouter initialEntries={[`/video/${APPT_ID}`]}>
      <SnackbarProvider>
        <MockedProvider mocks={mocks}>
          <Routes>
            <Route path="/video/:id" element={<VideoConsultationPage />} />
          </Routes>
        </MockedProvider>
      </SnackbarProvider>
    </MemoryRouter>,
  )
}

describe('VideoConsultation (P1-16)', () => {
  it('shows an error state, not a broken join attempt, for a non-video appointment', async () => {
    renderPage(baseMocks({ consultationMode: 'in_person' }))
    await waitFor(() => expect(screen.getByText('This appointment is not a video consultation.')).toBeInTheDocument())
  })

  it('joins the real session and embeds the vendor call with the real per-participant token', async () => {
    renderPage([
      ...baseMocks(),
      { request: { query: JOIN_SESSION, variables: { encounter_id: ENCOUNTER_ID } }, result: { data: { joinTelemedicineSession: { __typename: 'TelemedicineSession', id: 'sess-1', status: 'active', valid_from: '2026-09-01T08:50:00.000Z', valid_to: '2026-09-01T09:45:00.000Z', recording_consent_at: null, room_url: 'https://medibook.daily.co/encounter-enc-1', token: 'jwt-abc' } } } },
    ])

    await waitFor(() => expect(screen.getByTitle('Video consultation')).toBeInTheDocument())
    expect(screen.getByTitle('Video consultation')).toHaveAttribute('src', 'https://medibook.daily.co/encounter-enc-1?t=jwt-abc')
  })

  it('shows the clinician registration number as a visible trust signal (US-TEL-04)', async () => {
    renderPage([
      ...baseMocks(),
      { request: { query: JOIN_SESSION, variables: { encounter_id: ENCOUNTER_ID } }, result: { data: { joinTelemedicineSession: { __typename: 'TelemedicineSession', id: 'sess-1', status: 'active', valid_from: '2026-09-01T08:50:00.000Z', valid_to: '2026-09-01T09:45:00.000Z', recording_consent_at: null, room_url: 'https://medibook.daily.co/x', token: 't' } } } },
    ])
    await waitFor(() => expect(screen.getByText('Reg. No. MCI-12345')).toBeInTheDocument())
  })

  it('shows a graceful error and a retry, not a crash, when the video provider is not configured', async () => {
    renderPage([
      ...baseMocks(),
      { request: { query: JOIN_SESSION, variables: { encounter_id: ENCOUNTER_ID } }, error: new Error('Telemedicine video is not configured for this deployment') },
    ])
    await waitFor(() => expect(screen.getByText('Telemedicine video is not configured for this deployment')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument()
  })

  it('shows clinician-only actions (consent, escalate) for a clinician, not a patient', async () => {
    renderPage(
      [
        ...baseMocks(),
        { request: { query: JOIN_SESSION, variables: { encounter_id: ENCOUNTER_ID } }, result: { data: { joinTelemedicineSession: { __typename: 'TelemedicineSession', id: 'sess-1', status: 'active', valid_from: '2026-09-01T08:50:00.000Z', valid_to: '2026-09-01T09:45:00.000Z', recording_consent_at: null, room_url: 'https://x', token: 't' } } } },
      ],
      'clinician',
    )
    await waitFor(() => expect(screen.getByText('Clinician Actions')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Advise In-Person Visit' })).toBeInTheDocument()
  })

  it('records real recording consent via the real mutation, and reflects it in the header badge (FR-TEL-03)', async () => {
    renderPage(
      [
        ...baseMocks(),
        { request: { query: JOIN_SESSION, variables: { encounter_id: ENCOUNTER_ID } }, result: { data: { joinTelemedicineSession: { __typename: 'TelemedicineSession', id: 'sess-1', status: 'active', valid_from: '2026-09-01T08:50:00.000Z', valid_to: '2026-09-01T09:45:00.000Z', recording_consent_at: null, room_url: 'https://x', token: 't' } } } },
        { request: { query: CONSENT_TO_RECORDING, variables: { encounter_id: ENCOUNTER_ID } }, result: { data: { consentToTelemedicineRecording: { __typename: 'ConsentToRecordingResult', success: true, recording_consent_at: '2026-09-01T09:05:00.000Z' } } } },
      ],
      'clinician',
    )

    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Patient consents to recording' })).toBeInTheDocument())
    expect(screen.queryByText('Recording consented')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Patient consents to recording' }))

    await waitFor(() => expect(screen.getByText('Recording consented')).toBeInTheDocument())
    expect(screen.getByRole('checkbox', { name: 'Patient consents to recording' })).toBeDisabled()
  })

  it('never shows clinician actions to a patient caller', async () => {
    renderPage([
      ...baseMocks(),
      { request: { query: JOIN_SESSION, variables: { encounter_id: ENCOUNTER_ID } }, result: { data: { joinTelemedicineSession: { __typename: 'TelemedicineSession', id: 'sess-1', status: 'active', valid_from: '2026-09-01T08:50:00.000Z', valid_to: '2026-09-01T09:45:00.000Z', recording_consent_at: null, room_url: 'https://x', token: 't' } } } },
    ])
    await waitFor(() => expect(screen.getByTitle('Video consultation')).toBeInTheDocument())
    expect(screen.queryByText('Clinician Actions')).not.toBeInTheDocument()
  })

  it('books a real in-person follow-up via the escalation dialog, linked to this encounter', async () => {
    renderPage(
      [
        ...baseMocks(),
        { request: { query: JOIN_SESSION, variables: { encounter_id: ENCOUNTER_ID } }, result: { data: { joinTelemedicineSession: { __typename: 'TelemedicineSession', id: 'sess-1', status: 'active', valid_from: '2026-09-01T08:50:00.000Z', valid_to: '2026-09-01T09:45:00.000Z', recording_consent_at: null, room_url: 'https://x', token: 't' } } } },
        {
          request: { query: AVAILABLE_SLOTS_QUERY },
          variableMatcher: () => true,
          result: {
            data: {
              availableSlots: [
                { __typename: 'AvailableSlot', id: 'slot-1', start_datetime: SLOT_START, end_datetime: '2026-09-02T10:30:00.000Z', duration_minutes: 30, is_available: true, clinician: { __typename: 'AvailableSlotClinician', id: 'c1', full_name: 'Dr. Real Clinician' } },
              ],
            },
          },
        },
        {
          request: {
            query: CREATE_APPOINTMENT,
            variables: {
              input: {
                clinic_id: 'clinic-1', clinician_id: 'c1', patient_id: 'p1', service_id: 'svc-1',
                start_datetime: SLOT_START, type: 'in_person', notes: 'Escalated from teleconsultation',
                escalated_from_encounter_id: ENCOUNTER_ID,
              },
            },
          },
          result: { data: { createAppointment: { __typename: 'Appointment', id: 'appt-new' } } },
        },
      ],
      'clinician',
    )

    await waitFor(() => expect(screen.getByRole('button', { name: 'Advise In-Person Visit' })).toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: 'Advise In-Person Visit' }))
    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(within(dialog).getByRole('button', { name: SLOT_LABEL })).toBeInTheDocument())
    await userEvent.click(within(dialog).getByRole('button', { name: SLOT_LABEL }))

    await waitFor(() => expect(screen.getByText('In-person follow-up booked.')).toBeInTheDocument())
  })
})
