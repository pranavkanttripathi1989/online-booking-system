# appointments

## requirement

| ID | Type | Title | Status | Created | Updated | Parent | Link |
|---|---|---|---|---|---|---|---|
| REQ018 | requirement | Booking engine: channels, dedup, family profiles, and no-show policy | in-progress | 2026-08-22 | 2026-08-24 | — | [REQ018-appointments-2026-08-22-booking-engine-channels-and-policies.md](./requirement/REQ018-appointments-2026-08-22-booking-engine-channels-and-policies.md) |

## improvement

_none yet_

## bug

| ID | Type | Title | Status | Created | Updated | Parent | Link |
|---|---|---|---|---|---|---|---|
| BUG020 | bug | "No Show" filter test assumes zero real no-show appointments exist, breaks at realistic volume | open | 2026-08-24 | 2026-08-24 | REQ018 | [BUG020-appointments-2026-08-24-no-show-test-assumes-zero-instances.md](./bug/BUG020-appointments-2026-08-24-no-show-test-assumes-zero-instances.md) |
| BUG019 | bug | At realistic data volume, today's appointments can fall outside the default list/calendar window | done | 2026-08-23 | 2026-08-24 | REQ018 | [BUG019-appointments-2026-08-23-realistic-volume-hides-todays-appointments.md](./bug/BUG019-appointments-2026-08-23-realistic-volume-hides-todays-appointments.md) |
| BUG011 | bug | The public booking wizard never showed real data, and its own e2e coverage never caught it | done | 2026-08-23 | 2026-08-23 | REQ018 | [BUG011-appointments-2026-08-23-public-booking-wizard-never-showed-real-data.md](./bug/BUG011-appointments-2026-08-23-public-booking-wizard-never-showed-real-data.md) |
| BUG014 | bug | Every real booking through the public wizard failed at the final step, always | done | 2026-08-23 | 2026-08-23 | REQ018 | [BUG014-appointments-2026-08-23-booking-wizard-patientdetails-schema-mismatch.md](./bug/BUG014-appointments-2026-08-23-booking-wizard-patientdetails-schema-mismatch.md) |
