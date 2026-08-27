# appointments

## requirement

| ID | Type | Title | Status | Created | Updated | Parent | Link |
|---|---|---|---|---|---|---|---|
| REQ018 | requirement | Booking engine: channels, dedup, family profiles, and no-show policy | in-progress | 2026-08-22 | 2026-08-24 | — | [REQ018-appointments-2026-08-22-booking-engine-channels-and-policies.md](./requirement/REQ018-appointments-2026-08-22-booking-engine-channels-and-policies.md) |

## improvement

| ID | Type | Title | Status | Created | Updated | Parent | Link |
|---|---|---|---|---|---|---|---|
| REQ124 | improvement | Room assignment tries the next available room, not just the first | done | 2026-08-26 | 2026-08-26 | — | [REQ124-appointments-2026-08-26-room-assignment-retries-next-available.md](./improvement/REQ124-appointments-2026-08-26-room-assignment-retries-next-available.md) |
| REQ120 | improvement | Bulk-reschedule a clinician's whole day | done | 2026-08-26 | 2026-08-26 | REQ017 | [REQ120-appointments-2026-08-26-bulk-reschedule.md](./improvement/REQ120-appointments-2026-08-26-bulk-reschedule.md) |
| REQ065 | improvement | Dependant self-scoping for prescriptions and test results | done | 2026-08-25 | 2026-08-25 | REQ018 | [REQ065-appointments-2026-08-25-dependant-self-scoping-for-prescriptions-and-test-results.md](./improvement/REQ065-appointments-2026-08-25-dependant-self-scoping-for-prescriptions-and-test-results.md) |
| REQ052 | improvement | Auto-mark-no-show after grace period, and configurable intake fields | done | 2026-08-25 | 2026-08-25 | REQ018 | [REQ052-appointments-2026-08-25-auto-no-show-and-intake-fields.md](./improvement/REQ052-appointments-2026-08-25-auto-no-show-and-intake-fields.md) |
| REQ105 | improvement | Booking-widget embed code UI | done | 2026-08-26 | 2026-08-26 | REQ018 | [REQ105-appointments-2026-08-26-booking-widget-embed-code-ui.md](./improvement/REQ105-appointments-2026-08-26-booking-widget-embed-code-ui.md) |
| REQ148 | improvement | Server-side slot hold + booking idempotency (P1-05) | done | 2026-08-27 | 2026-08-27 | — | [REQ148-appointments-2026-08-27-slot-hold-and-idempotency.md](./improvement/REQ148-appointments-2026-08-27-slot-hold-and-idempotency.md) |
| REQ152 | improvement | No-show risk score (P1-17) | done | 2026-08-27 | 2026-08-27 | REQ018 | [REQ152-appointments-2026-08-27-no-show-risk-score.md](./improvement/REQ152-appointments-2026-08-27-no-show-risk-score.md) |

## bug

| ID | Type | Title | Status | Created | Updated | Parent | Link |
|---|---|---|---|---|---|---|---|
| BUG023 | bug | `edit.jsx` fell back to fake data on empty results and its own Save button has never actually worked | done | 2026-08-25 | 2026-08-25 | — | [BUG023-appointments-2026-08-25-edit-page-fake-data-and-broken-save.md](./bug/BUG023-appointments-2026-08-25-edit-page-fake-data-and-broken-save.md) |
| BUG020 | bug | "No Show" filter test assumes zero real no-show appointments exist, breaks at realistic volume | open | 2026-08-24 | 2026-08-24 | REQ018 | [BUG020-appointments-2026-08-24-no-show-test-assumes-zero-instances.md](./bug/BUG020-appointments-2026-08-24-no-show-test-assumes-zero-instances.md) |
| BUG019 | bug | At realistic data volume, today's appointments can fall outside the default list/calendar window | done | 2026-08-23 | 2026-08-24 | REQ018 | [BUG019-appointments-2026-08-23-realistic-volume-hides-todays-appointments.md](./bug/BUG019-appointments-2026-08-23-realistic-volume-hides-todays-appointments.md) |
| BUG011 | bug | The public booking wizard never showed real data, and its own e2e coverage never caught it | done | 2026-08-23 | 2026-08-23 | REQ018 | [BUG011-appointments-2026-08-23-public-booking-wizard-never-showed-real-data.md](./bug/BUG011-appointments-2026-08-23-public-booking-wizard-never-showed-real-data.md) |
| BUG014 | bug | Every real booking through the public wizard failed at the final step, always | done | 2026-08-23 | 2026-08-23 | REQ018 | [BUG014-appointments-2026-08-23-booking-wizard-patientdetails-schema-mismatch.md](./bug/BUG014-appointments-2026-08-23-booking-wizard-patientdetails-schema-mismatch.md) |
