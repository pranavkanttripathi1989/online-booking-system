---
id: CTX-patient-portal-2026-08-25-req072
type: improvement
feature: patient-portal
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ072
related: [PLAN099, TP126, TR125]
---

# patient-portal — Booking wizard dependant picker (2026-08-25)

One of an 8-slice batch. Closes `REQ027`'s own `US-PAT-01` residue: the
internal booking wizard's Step 4 now shows a "Myself"/dependant radio
list for a `'patient'`-role caller, instead of the generic staff-facing
search/create flow, matching `REQ018`'s own already-shipped family-
profiles data.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ072 | [Booking wizard dependant picker](../../requirements/patient-portal/improvement/REQ072-patient-portal-2026-08-25-booking-wizard-dependant-picker.md) |
| implementation-plans | PLAN099 | [implementation plan](../../implementation-plans/patient-portal/improvement/PLAN099-patient-portal-2026-08-25-booking-wizard-dependant-picker.md) |
| test-plans | TP126 | [test plan](../../test-plans/patient-portal/improvement/TP126-patient-portal-2026-08-25-booking-wizard-dependant-picker.md) |
| test-results | TR125 | [results](../../test-results/patient-portal/improvement/TR125-patient-portal-2026-08-25-booking-wizard-dependant-picker.md) |

## Known gap — no live browser pass

This session had no browser-automation tool available. Lint/unit/build
are green and the GraphQL contract was cross-checked against `REQ018`'s
own already-live-verified queries, but the actual rendered picker has
not been driven in a real browser. Logged in `TR125`, not silently
skipped — recommended as the next follow-up on this slice.
