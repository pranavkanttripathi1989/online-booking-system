import { gql } from '@apollo/client'

// ─── Auth ─────────────────────────────────────────────────────────────────────

// PLAN016 Slice C — login now returns a LoginResult union: AuthPayloadType
// (unchanged shape) on a normal login, or TotpChallengeType when the
// account has 2FA enabled and a second verifyTotpLogin call is required.
// __typename disambiguates which branch matched at the call site.
export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      __typename
      ... on AuthPayload {
        access_token
        token_type
        expires_in
        mfa_setup_required
        session_timeout_minutes
        user {
          id
          name
          email
          roles { name }
          clinician {
            id
            full_name
            avatar_url
            clinician_type { id name }
          }
        }
      }
      ... on TotpChallenge {
        requires_totp
        challenge_token
      }
    }
  }
`

export const VERIFY_TOTP_LOGIN_MUTATION = gql`
  mutation VerifyTotpLogin($input: VerifyTotpLoginInput!) {
    verifyTotpLogin(input: $input) {
      access_token
      token_type
      expires_in
      mfa_setup_required
      session_timeout_minutes
      user {
        id
        name
        email
        roles { name }
        clinician {
          id
          full_name
          avatar_url
          clinician_type { id name }
        }
      }
    }
  }
`

export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`

// F-02 fix — OTP login previously accepted a hardcoded MOCK_OTP client-side
// with no backend call at all. requestOtp/verifyOtp are real, already-built
// resolvers (auth.resolver.ts): OTP is phone-keyed only (RequestOtpInput has
// no email field), rate-limited, Redis-backed, 3-attempt lockout server-side.
export const REQUEST_OTP_MUTATION = gql`
  mutation RequestOtp($input: RequestOtpInput!) {
    requestOtp(input: $input) {
      success
    }
  }
`

export const VERIFY_OTP_MUTATION = gql`
  mutation VerifyOtp($input: VerifyOtpInput!) {
    verifyOtp(input: $input) {
      access_token
      token_type
      expires_in
      mfa_setup_required
      session_timeout_minutes
      user {
        id
        name
        email
        roles { name }
        clinician {
          id
          full_name
          avatar_url
          clinician_type { id name }
        }
      }
    }
  }
`

// ─── Appointments ─────────────────────────────────────────────────────────────

export const CREATE_APPOINTMENT_MUTATION = gql`
  mutation CreateAppointment($input: AppointmentInput!) {
    createAppointment(input: $input) {
      id
      start_datetime
      end_datetime
      status
      patient { id full_name email }
      clinician { id full_name }
      service { id name duration_minutes price }
      clinic { id name }
      room { id name }
      checkin_token
    }
  }
`

export const CANCEL_APPOINTMENT_MUTATION = gql`
  mutation CancelAppointment($id: ID!, $reason: String) {
    cancelAppointment(id: $id, reason: $reason) {
      id
      status
      cancellation_reason
      updated_at
    }
  }
`

export const RESCHEDULE_APPOINTMENT_MUTATION = gql`
  mutation RescheduleAppointment($id: ID!, $start_datetime: DateTime!) {
    rescheduleAppointment(id: $id, start_datetime: $start_datetime) {
      id
      start_datetime
      end_datetime
      status
      updated_at
    }
  }
`

export const COMPLETE_APPOINTMENT_MUTATION = gql`
  mutation CompleteAppointment($id: ID!) {
    completeAppointment(id: $id) {
      id
      status
      updated_at
    }
  }
`

// REQ023 (US-BIL-01, scoped subset) — front-desk mixed-tender counter billing.
// REQ056 (US-BIL-03) — discount_amount/discount_reason on the input, and
// pending_approval_id on the response: when a discount exceeds the org's
// configured threshold, payment_id/invoice_number are left unset and
// pending_approval_id is set instead (queued for a manager to decide via
// decideDiscountApproval, not applied inline).
export const RECORD_COUNTER_PAYMENT_MUTATION = gql`
  mutation RecordCounterPayment($input: RecordCounterPaymentInput!) {
    recordCounterPayment(input: $input) {
      success
      message
      payment_id
      invoice_number
      pending_approval_id
    }
  }
`

export const MARK_NO_SHOW_MUTATION = gql`
  mutation MarkNoShow($id: ID!) {
    markNoShow(id: $id) {
      id
      status
      updated_at
    }
  }
`

// REQ042 — waiting-room/index.jsx front-desk queue actions.
export const CHECK_IN_APPOINTMENT_MUTATION = gql`
  mutation CheckInAppointment($id: ID!) {
    checkInAppointment(id: $id) {
      id
      status
      updated_at
    }
  }
`

export const START_CONSULTATION_MUTATION = gql`
  mutation StartConsultation($id: ID!) {
    startConsultation(id: $id) {
      id
      status
      updated_at
    }
  }
`

export const RESET_APPOINTMENT_JOURNEY_MUTATION = gql`
  mutation ResetAppointmentJourney($id: ID!) {
    resetAppointmentJourney(id: $id) {
      id
      status
      updated_at
    }
  }
`

// ─── Clinicians ───────────────────────────────────────────────────────────────

export const CREATE_CLINICIAN_MUTATION = gql`
  mutation CreateClinician($input: ClinicianInput!) {
    createClinician(input: $input) {
      id
      first_name
      last_name
      full_name
      consultation_fee
      is_active
      clinician_type { id name }
      clinics { id name }
      services { id name }
    }
  }
`

export const UPDATE_CLINICIAN_MUTATION = gql`
  mutation UpdateClinician($id: ID!, $input: ClinicianInput!) {
    updateClinician(id: $id, input: $input) {
      id
      first_name
      last_name
      full_name
      bio
      consultation_fee
      is_active
      gender
      languages
      clinician_type { id name }
      clinics { id name }
      services { id name }
    }
  }
`

export const TOGGLE_CLINICIAN_ACTIVE_MUTATION = gql`
  mutation ToggleClinicianActive($id: ID!) {
    toggleClinicianActive(id: $id) {
      id
      is_active
    }
  }
`

// ─── Patients ─────────────────────────────────────────────────────────────────

export const CREATE_PATIENT_MUTATION = gql`
  mutation CreatePatient($input: PatientInput!) {
    createPatient(input: $input) {
      id
      first_name
      last_name
      full_name
      email
      phone
      date_of_birth
      gender
      created_at
    }
  }
`

export const UPDATE_PATIENT_MUTATION = gql`
  mutation UpdatePatient($id: ID!, $input: PatientInput!) {
    updatePatient(id: $id, input: $input) {
      id
      first_name
      last_name
      full_name
      email
      phone
      date_of_birth
      gender
      address
      notes
    }
  }
`

// REQ018 US-BOOK-01 — permission-gated tightly (manager/admin/super_admin
// only, see patients.resolver.ts); moves every FK reference to the survivor
// and soft-deletes the merged record.
export const MERGE_PATIENTS_MUTATION = gql`
  mutation MergePatients($input: MergePatientsInput!) {
    mergePatients(input: $input) { id full_name }
  }
`

// ─── Availability ─────────────────────────────────────────────────────────────

export const CREATE_AVAILABILITY_TEMPLATE_MUTATION = gql`
  mutation CreateAvailabilityTemplate($input: AvailabilityTemplateInput!) {
    createAvailabilityTemplate(input: $input) {
      id
      day_of_week
      start_time
      end_time
      slot_duration_minutes
      buffer_minutes
      is_active
      effective_from
      effective_to
      clinic { id name }
      room { id name }
    }
  }
`

export const UPDATE_AVAILABILITY_TEMPLATE_MUTATION = gql`
  mutation UpdateAvailabilityTemplate($id: ID!, $input: AvailabilityTemplateInput!) {
    updateAvailabilityTemplate(id: $id, input: $input) {
      id
      day_of_week
      start_time
      end_time
      slot_duration_minutes
      buffer_minutes
      is_active
      effective_from
      effective_to
    }
  }
`

export const DELETE_AVAILABILITY_TEMPLATE_MUTATION = gql`
  mutation DeleteAvailabilityTemplate($id: ID!) {
    deleteAvailabilityTemplate(id: $id)
  }
`

// ─── Clinics ──────────────────────────────────────────────────────────────────

export const CREATE_CLINIC_MUTATION = gql`
  mutation CreateClinic($input: ClinicInput!) {
    createClinic(input: $input) {
      id name address city postcode phone email timezone is_active
    }
  }
`

export const UPDATE_CLINIC_MUTATION = gql`
  mutation UpdateClinic($id: ID!, $input: ClinicInput!) {
    updateClinic(id: $id, input: $input) {
      id name address city postcode phone email timezone is_active
    }
  }
`

// REQ041 -- designates one clinic per org as the head office.
export const SET_HEAD_OFFICE_CLINIC_MUTATION = gql`
  mutation SetHeadOfficeClinic($id: ID!) {
    setHeadOfficeClinic(id: $id) {
      id
      is_primary
    }
  }
`

// ─── Rooms ────────────────────────────────────────────────────────────────────

export const CREATE_ROOM_MUTATION = gql`
  mutation CreateRoom($input: RoomInput!) {
    createRoom(input: $input) {
      id name capacity is_active clinic { id name }
    }
  }
`

export const UPDATE_ROOM_MUTATION = gql`
  mutation UpdateRoom($id: ID!, $input: RoomInput!) {
    updateRoom(id: $id, input: $input) {
      id name capacity is_active clinic { id name }
    }
  }
`

// ─── Services ─────────────────────────────────────────────────────────────────

export const CREATE_SERVICE_MUTATION = gql`
  mutation CreateService($input: ServiceInput!) {
    createService(input: $input) {
      id name description duration_minutes price is_active
      category_pricing { general corporate staff camp }
      channel_pricing { online walkin }
      prepayment_policy
    }
  }
`

export const UPDATE_SERVICE_MUTATION = gql`
  mutation UpdateService($id: ID!, $input: ServiceInput!) {
    updateService(id: $id, input: $input) {
      id name description duration_minutes price is_active
      category_pricing { general corporate staff camp }
      channel_pricing { online walkin }
      prepayment_policy
    }
  }
`

// ─── Products ─────────────────────────────────────────────────────────────────

// {success, userErrors, product{id}} wrapper -- matches the real backend
// (backend/src/products/products.resolver.ts), unified with
// manager/products/index.jsx's own contract for the same mutation names
// (context/frontend-integration-audit.md #17-19).
export const CREATE_PRODUCT_MUTATION = gql`
  mutation CreateProduct($input: CreateProductInput!) {
    createProduct(input: $input) {
      success
      userErrors { message }
      product { id }
    }
  }
`

export const UPDATE_PRODUCT_MUTATION = gql`
  mutation UpdateProduct($id: ID!, $input: UpdateProductInput!) {
    updateProduct(id: $id, input: $input) {
      success
      userErrors { message }
      product { id }
    }
  }
`

// ─── Users (Admin) ────────────────────────────────────────────────────────────

export const CREATE_USER_MUTATION = gql`
  mutation CreateUser($input: UserInput!) {
    createUser(input: $input) {
      id name email roles { name }
    }
  }
`

export const UPDATE_USER_MUTATION = gql`
  mutation UpdateUser($id: ID!, $input: UserUpdateInput!) {
    updateUser(id: $id, input: $input) {
      id name email roles { name }
    }
  }
`

// ─── Appointments edit ────────────────────────────────────────────────────────

export const UPDATE_APPOINTMENT_MUTATION = gql`
  mutation UpdateAppointment($id: ID!, $input: AppointmentUpdateInput!) {
    updateAppointment(id: $id, input: $input) {
      id status start_datetime end_datetime notes
      patient { id full_name }
      clinician { id full_name }
      service { id name }
      room { id name }
    }
  }
`

// ─── Test Results ─────────────────────────────────────────────────────────────

export const ORDER_TEST_MUTATION = gql`
  mutation OrderTest($input: OrderTestInput!) {
    orderTest(input: $input) {
      id
      patient
      test
      ordered_by
      date_ordered
      date_completed
      status
      type
      values { name value ref flag }
    }
  }
`
