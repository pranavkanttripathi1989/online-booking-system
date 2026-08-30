---
id: BUG056
type: bug
feature: prescriptions
created: 2026-08-30
updated: 2026-08-30
status: done
parent: —
related: [PLAN227, TP247, TR247]
---

# BUG056 — No way to view a completed appointment's consultation or its prescribed medicines

## What was wrong

Live-reported by the user against a real completed appointment
(`/appointments/0c4a6cc6-6df5-4c8b-9ec7-7255c89a4225`): "I can see the
consultation[?] what is in consultation, prescribed medicine etc... I
can't see the prescription." Two compounding gaps:

1. `appointments/detail.jsx`'s entire "Actions" card — including the
   only entry point to the consultation workspace, "Start Consultation"
   — is gated `{!isTerminal && (...)}`. Once an appointment reaches
   `completed`, the whole card disappears with **no replacement** — a
   clinician had no way back into their own signed consultation notes
   from the appointment they just completed.
2. Even after reaching the consultation workspace directly by URL,
   `EncounterWorkspace.jsx` had no section listing prescriptions already
   issued during that encounter — only a "New Prescription" button to
   create another one. `ENCOUNTER_QUERY` never selected a `prescriptions`
   field, and `Encounters` has no GraphQL resolve-field for its own
   `Prescriptions[]` relation to select in the first place.

## Root cause

Confirmed by direct code read (not assumed): the backend relationships
already exist end-to-end — `Appointments 1–1 Encounters 1–N
Prescriptions` — and `getOrCreateEncounter` already safely handles an
already-signed encounter (no error, `locked` correctly gates editing).
The gap was purely missing frontend wiring on both ends: no read-only
entry point from a completed appointment, and no display of an
encounter's own already-issued prescriptions.

## Fix

- `appointments/detail.jsx`: added a "View Consultation" button, shown
  only when `apt.status === 'completed' && hasRole('clinician')`,
  navigating to the same `/clinician/encounters/:id` route
  "Start Consultation" already uses — `EncounterWorkspace.jsx` already
  renders correctly read-only for a signed encounter (`locked` state),
  so no changes were needed there for this half.
- `EncounterWorkspace.jsx`: added a "Prescriptions" section to
  `ActionsPane`, reusing the existing, already-tested
  `patientPrescriptions(patient_id)` query (the same one
  `PrescriptionBuilder.jsx`'s own "Repeat from History" dialog already
  calls), adding `encounter_id` to the selection so results can be
  filtered client-side to just this encounter — no backend change, no
  new resolver. Each prescription shows its issue date, a drug-name
  summary, and a "View" button linking to the existing
  `/prescriptions/:id/print` route.

See `PLAN227` for the full technical account and `TR247` for
verification, including a full live click-through confirming the real
chain: completed appointment → View Consultation → signed read-only
encounter → Prescriptions section → View → the real rendered
prescription.
