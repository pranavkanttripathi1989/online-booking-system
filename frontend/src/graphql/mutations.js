import { gql } from '@apollo/client'

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      access_token
      token_type
      expires_in
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

export const MARK_NO_SHOW_MUTATION = gql`
  mutation MarkNoShow($id: ID!) {
    markNoShow(id: $id) {
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
    }
  }
`

export const UPDATE_SERVICE_MUTATION = gql`
  mutation UpdateService($id: ID!, $input: ServiceInput!) {
    updateService(id: $id, input: $input) {
      id name description duration_minutes price is_active
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
