import { gql } from '@apollo/client'

// ─── Fragments ───────────────────────────────────────────────────────────────

export const USER_FIELDS = gql`
  fragment UserFields on User {
    id
    name
    email
    roles { name }
  }
`

export const APPOINTMENT_FIELDS = gql`
  fragment AppointmentFields on Appointment {
    id
    tenant_id
    start_datetime
    end_datetime
    duration_minutes
    status
    type
    booking_mode
    token_no
    notes
    cancellation_reason
    reminder_sent_at
    created_at
    updated_at
    patient {
      id
      first_name
      last_name
      full_name
      email
      phone
      date_of_birth
      gender
    }
    clinician {
      id
      first_name
      last_name
      full_name
      avatar_url
      clinician_type { id name }
    }
    clinic {
      id
      name
      address
      city
      timezone
    }
    room { id name }
    service { id name duration_minutes price }
    booked_by_user { id name }
  }
`

export const CLINICIAN_FIELDS = gql`
  fragment ClinicianFields on Clinician {
    id
    first_name
    last_name
    full_name
    bio
    avatar_url
    consultation_fee
    is_active
    gender
    languages
    clinician_type { id name description }
    clinics { id name city }
    services { id name duration_minutes price }
    registration_number
    medical_council
    verification_status
    verified_at
  }
`

export const PATIENT_FIELDS = gql`
  fragment PatientFields on Patient {
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
    created_at
  }
`

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const ME_QUERY = gql`
  query Me {
    me {
      ...UserFields
      clinician {
        id
        full_name
        avatar_url
        clinician_type { id name }
      }
      patient {
        id
        full_name
      }
    }
  }
  ${USER_FIELDS}
`

// ─── Dashboard ───────────────────────────────────────────────────────────────

export const DASHBOARD_QUERY = gql`
  query Dashboard {
    dashboard {
      total_appointments_today
      total_appointments_today_change
      total_appointments_week
      total_appointments_month
      total_clinicians
      total_clinicians_change
      total_patients
      total_patients_change
      total_revenue_month
      total_revenue_month_change
      no_show_rate
      upcoming_appointments {
        id
        start_datetime
        end_datetime
        status
        patient { id full_name }
        clinician { id full_name }
        service { id name }
      }
      utilisation_by_clinician {
        clinician { id full_name avatar_url clinician_type { name } }
        slots_available
        slots_booked
        utilisation_percent
      }
      volume_by_day {
        date
        confirmed_count
        cancelled_count
      }
      bookings_by_service {
        service_name
        count
      }
    }
  }
`

// ─── Appointments ─────────────────────────────────────────────────────────────

export const APPOINTMENTS_QUERY = gql`
  query Appointments(
    $filters: AppointmentFilters
    $first: Int = 20
    $page: Int
  ) {
    appointments(filters: $filters, first: $first, page: $page) {
      data {
        ...AppointmentFields
      }
      paginatorInfo {
        count
        currentPage
        firstItem
        hasMorePages
        lastItem
        lastPage
        perPage
        total
      }
    }
  }
  ${APPOINTMENT_FIELDS}
`

export const APPOINTMENT_DETAIL_QUERY = gql`
  query AppointmentDetail($id: ID!) {
    appointment(id: $id) {
      ...AppointmentFields
      status_logs {
        id
        status
        reason
        created_at
        changed_by_user { id name }
      }
    }
  }
  ${APPOINTMENT_FIELDS}
`

// ─── Availability ─────────────────────────────────────────────────────────────

export const AVAILABLE_SLOTS_QUERY = gql`
  query AvailableSlots(
    $clinician_id: ID!
    $date: Date!
    $service_id: ID
  ) {
    availableSlots(
      clinician_id: $clinician_id
      date: $date
      service_id: $service_id
    ) {
      id
      start_datetime
      end_datetime
      duration_minutes
      is_available
      clinician { id full_name }
    }
  }
`

export const AVAILABILITY_TEMPLATES_QUERY = gql`
  query AvailabilityTemplates($clinician_id: ID!) {
    availabilityTemplates(clinician_id: $clinician_id) {
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

// ─── Clinicians ───────────────────────────────────────────────────────────────

export const CLINICIANS_QUERY = gql`
  query Clinicians(
    $clinic_id: ID
    $is_active: Boolean
    $first: Int = 20
    $page: Int
  ) {
    clinicians(
      clinic_id: $clinic_id
      is_active: $is_active
      first: $first
      page: $page
    ) {
      data {
        ...ClinicianFields
      }
      paginatorInfo {
        count
        currentPage
        hasMorePages
        lastPage
        perPage
        total
      }
    }
  }
  ${CLINICIAN_FIELDS}
`

export const CLINICIAN_DETAIL_QUERY = gql`
  query ClinicianDetail($id: ID!) {
    clinician(id: $id) {
      ...ClinicianFields
      availability_templates {
        id
        day_of_week
        start_time
        end_time
        is_active
        effective_from
        effective_to
        clinic { id name }
        room { id name }
      }
    }
  }
  ${CLINICIAN_FIELDS}
`

// ─── Patients ─────────────────────────────────────────────────────────────────

export const PATIENTS_QUERY = gql`
  query Patients(
    $search: String
    $first: Int = 20
    $page: Int
  ) {
    patients(search: $search, first: $first, page: $page) {
      data {
        ...PatientFields
      }
      paginatorInfo {
        count
        currentPage
        hasMorePages
        lastPage
        perPage
        total
      }
    }
  }
  ${PATIENT_FIELDS}
`

export const PATIENT_DETAIL_QUERY = gql`
  query PatientDetail($id: ID!) {
    patient(id: $id) {
      ...PatientFields
      appointments(first: 20, page: 1) {
        data {
          id
          start_datetime
          end_datetime
          status
          clinician { id full_name }
          service { id name }
          clinic { id name }
        }
        paginatorInfo {
          total
          hasMorePages
        }
      }
    }
  }
  ${PATIENT_FIELDS}
`

// ─── Clinics ──────────────────────────────────────────────────────────────────

export const CLINICS_QUERY = gql`
  query Clinics {
    clinics {
      id
      name
      address
      city
      postcode
      phone
      email
      timezone
      is_active
      is_primary
    }
  }
`

// ─── Services ─────────────────────────────────────────────────────────────────

export const SERVICES_QUERY = gql`
  query Services($clinic_id: ID, $is_active: Boolean) {
    services(clinic_id: $clinic_id, is_active: $is_active) {
      id
      name
      description
      duration_minutes
      price
      is_active
      category { id name }
      clinicians { id full_name }
    }
  }
`

// ─── Rooms ────────────────────────────────────────────────────────────────────

export const ROOMS_QUERY = gql`
  query Rooms($clinic_id: ID) {
    rooms(clinic_id: $clinic_id) {
      id
      name
      capacity
      is_active
      clinic { id name }
    }
  }
`

// ─── Availabilities (for Calendar Room View overlay) ─────────────────────────

export const AVAILABILITIES_QUERY = gql`
  query Availabilities(
    $clinic_id: ID
    $room_ids: [ID]
    $start_date: Date
    $end_date: Date
  ) {
    availabilities(
      clinic_id: $clinic_id
      room_ids: $room_ids
      start_date: $start_date
      end_date: $end_date
      first: 200
    ) {
      data {
        id
        day_of_week
        start_time
        end_time
        recurrence_type
        exclude_weekends
        excluded_days
        valid_from
        valid_until
        is_active
        room { id name }
        clinician { id full_name first_name last_name }
        clinic { id name }
      }
    }
  }
`

// ─── Clinician Types ──────────────────────────────────────────────────────────

export const CLINICIAN_TYPES_QUERY = gql`
  query ClinicianTypes {
    clinicianTypes {
      id
      name
      description
      is_active
    }
  }
`

// ─── Clinic Detail ────────────────────────────────────────────────────────────

export const CLINIC_DETAIL_QUERY = gql`
  query ClinicDetail($id: ID!) {
    clinic(id: $id) {
      id
      name
      address
      city
      postcode
      state
      gstin
      phone
      email
      timezone
      is_active
    }
  }
`

// ─── Service Detail ───────────────────────────────────────────────────────────

export const SERVICE_DETAIL_QUERY = gql`
  query ServiceDetail($id: ID!) {
    service(id: $id) {
      id
      name
      description
      duration_minutes
      price
      is_active
      category { id name }
      clinicians { id full_name }
      category_pricing { general corporate staff camp }
      channel_pricing { online walkin }
      prepayment_policy
    }
  }
`

// ─── Room Detail ──────────────────────────────────────────────────────────────

export const ROOM_DETAIL_QUERY = gql`
  query RoomDetail($id: ID!) {
    room(id: $id) {
      id
      name
      capacity
      is_active
      clinic { id name }
    }
  }
`

// ─── Roles ────────────────────────────────────────────────────────────────────

export const ROLES_QUERY = gql`
  query Roles {
    roles {
      id
      name
      description
    }
  }
`

// ─── Product Detail ───────────────────────────────────────────────────────────

export const PRODUCT_DETAIL_QUERY = gql`
  query ProductDetail($id: ID!) {
    product(id: $id) {
      id
      name
      description
      price
      stock_quantity
      sku
      is_active
    }
  }
`

// ─── Test Results ─────────────────────────────────────────────────────────────
// New this increment — pages/test-results/index.jsx was 100% mock before;
// field names match its MOCK_RESULTS shape exactly so the rewrite is a
// drop-in swap. See context/test-results-backend-implementation-plan.md.

// REQ133 (F-14 residue) — migrated to {data, paginatorInfo}; first/page
// are optional (the resolver defaults first: 200, page: 1), so every
// existing caller keeps working unchanged if it never passes them.
export const TEST_RESULTS_QUERY = gql`
  query TestResults($search: String, $type: String, $status: String, $first: Int, $page: Int) {
    testResults(search: $search, type: $type, status: $status, first: $first, page: $page) {
      data {
        id
        patient
        test
        ordered_by
        date_ordered
        date_completed
        status
        type
        values {
          name
          value
          ref
          flag
        }
      }
      paginatorInfo {
        count
        currentPage
        hasMorePages
        lastPage
        perPage
        total
      }
    }
  }
`
