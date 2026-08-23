---
id: CTX-platform-nfr-2026-08-23-bug016
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: BUG016
related: [BUG009, BUG015, REQ035]
---

# platform-nfr — BUG016, wire patient/Profile + forgot-password (2026-08-23)

Second slice of P2.1's remaining 4 fabricated pages. Wiring
`patient/Profile.jsx` surfaced a real backend gap (no way for a patient to
learn their own `patient_id` via `me`, and `updatePatient` had no
patient-self-service path at all) — both fixed as part of this slice, not
deferred, since they were small and the self-scoping logic already existed.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | BUG016 | [wire patient/Profile + forgot-password](../../requirements/platform-nfr/bug/BUG016-platform-nfr-2026-08-23-wire-patient-profile-and-forgot-password.md) |
| implementation-plans | PLAN037 | [implementation](../../implementation-plans/platform-nfr/bug/PLAN037-platform-nfr-2026-08-23-wire-patient-profile-and-forgot-password.md) |
| test-plans | TP064 | [verification plan](../../test-plans/platform-nfr/bug/TP064-platform-nfr-2026-08-23-wire-patient-profile-and-forgot-password-verification.md) |
| test-results | TR063 | [verification results](../../test-results/platform-nfr/bug/TR063-platform-nfr-2026-08-23-wire-patient-profile-and-forgot-password-verification.md) |
| test-suggestions | — | skipped — wires against an already-established or trivially-extended real contract |

## What this does not do

- Does not wire `patients/detail.jsx` — audited and found to be its own,
  much larger multi-domain feature (most of its 8 tabs have zero backend at
  all, tied to `REQ020` clinical-records and others). Left open, explicitly.
- Does not add structured allergy/condition/insurance models — same gap as
  `patients/detail.jsx`, tracked under existing draft requirements.
- Does not add e2e coverage for either newly-wired page.
