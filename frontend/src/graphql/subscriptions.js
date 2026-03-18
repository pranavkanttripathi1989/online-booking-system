import { gql } from '@apollo/client'

// ─── Appointment Subscription ─────────────────────────────────────────────────

/**
 * Subscribe to real-time appointment updates.
 * Optionally filter by clinician_id to only receive updates for a specific clinician.
 *
 * Usage:
 *   const { data, loading } = useSubscription(APPOINTMENT_UPDATED_SUBSCRIPTION, {
 *     variables: { clinician_id: '123' }
 *   })
 */
export const APPOINTMENT_UPDATED_SUBSCRIPTION = gql`
  subscription AppointmentUpdated($clinician_id: ID) {
    appointmentUpdated(clinician_id: $clinician_id) {
      id
      start_datetime
      end_datetime
      status
      notes
      cancellation_reason
      updated_at
      patient {
        id
        full_name
        email
        phone
      }
      clinician {
        id
        full_name
        avatar_url
      }
      service {
        id
        name
        duration_minutes
      }
      clinic {
        id
        name
      }
      room {
        id
        name
      }
    }
  }
`

// ─── Calendar Refresh Subscription ───────────────────────────────────────────

/**
 * Subscribe to calendar refresh events for a specific clinic.
 * Returns a boolean — when true, the calendar should refetch its data.
 *
 * Usage:
 *   const { data } = useSubscription(CALENDAR_REFRESH_SUBSCRIPTION, {
 *     variables: { clinic_id: '1' }
 *   })
 *   useEffect(() => {
 *     if (data?.calendarRefresh) refetch()
 *   }, [data])
 */
export const CALENDAR_REFRESH_SUBSCRIPTION = gql`
  subscription CalendarRefresh($clinic_id: ID!) {
    calendarRefresh(clinic_id: $clinic_id)
  }
`
