---
id: PLAN227
type: bug
feature: prescriptions
created: 2026-08-30
updated: 2026-08-30
status: done
parent: BUG056
related: [TP247, TR247]
---

# PLAN227 — Surface consultation + prescriptions from a completed appointment

## Research first

Confirmed by direct code read before writing anything:

- `Encounters.appointment_id` is `@unique`; `getOrCreateEncounter(appointment_id)`
  (`encounters.service.ts`) returns an existing encounter unmodified
  regardless of `locked`/`signed_at` — no error path for an
  already-signed encounter. `EncounterWorkspace.jsx` already derives
  `const locked = !!encounter?.locked` and correctly disables every edit
  affordance (notes, templates, uploads, voice-to-Rx) when locked, and
  already shows a "Signed" chip — **the read-only view already worked
  correctly**, it was simply unreachable from a completed appointment.
- `Prescriptions.encounter_id` exists (schema.prisma); `PrescriptionType`
  already exposes it. `prescriptions.resolver.ts` has `patientPrescriptions(patient_id)`
  (used correctly today by `PrescriptionBuilder.jsx`'s "Repeat from
  History" dialog) but no `prescriptionsByEncounter` query and no
  resolve-field on `Encounters` for its own `Prescriptions[]` relation.

## Design decision — reuse, no backend change

Rather than add a new backend resolve-field (`Encounters.prescriptions`)
for a one-section display need, reused the existing, already-tested
`patientPrescriptions(patient_id)` query — the same one already proven
correct elsewhere — with `encounter_id` added to its selection so
`ActionsPane` can filter client-side to just the current encounter. This
matches Hard Rule 7 (match the existing contract) and avoids adding
backend surface area for what a client-side filter already solves
correctly.

## What changed

- `frontend/src/pages/appointments/detail.jsx`: new sibling `Card` to the
  existing (unmodified) `{!isTerminal && ...}` Actions card:
  `{isTerminal && apt.status === 'completed' && hasRole('clinician') &&
  (...)}`, a single "View Consultation" button navigating to
  `/clinician/encounters/${apt.id}` — the exact same route and role gate
  "Start Consultation" already uses.
- `frontend/src/pages/clinician/EncounterWorkspace.jsx`: new local
  `ENCOUNTER_PRESCRIPTIONS_QUERY` (id, encounter_id, issued_at, items{
  drug_name, dose, frequency}); `ActionsPane` now also calls
  `useQuery(ENCOUNTER_PRESCRIPTIONS_QUERY, {variables:{patient_id:
  encounter?.patient_id}, skip: !encounter?.patient_id})` and filters to
  `p.encounter_id === encounter?.id`. New "Prescriptions" section
  (between Attachments and the existing "New Prescription" button):
  empty state, or one `Paper` row per prescription (issue date, drug-name
  summary, a "View" button to `/prescriptions/:id/print`, the existing
  route — no new route needed).

## Files changed

```
frontend/src/pages/appointments/detail.jsx        — new "View Consultation" card for completed appointments
frontend/src/pages/appointments/detail.test.jsx   — new file, 3 tests
frontend/src/pages/clinician/EncounterWorkspace.jsx      — new query + Prescriptions section in ActionsPane
frontend/src/pages/clinician/EncounterWorkspace.test.jsx — baseMocks() extended, 2 new tests
```

## Verification

- Unit: `appointments/detail.test.jsx` (new file) 3/3 pass — "View
  Consultation" shows/navigates for a clinician on a completed
  appointment, hidden for a non-clinician role, hidden for a non-completed
  appointment (where "Start Consultation" correctly still shows instead).
  `EncounterWorkspace.test.jsx` — 2 new Prescriptions tests pass (renders
  a real prescription filtered to this encounter, excludes a different
  encounter's own prescription; shows a real empty state); full suite
  24/25 (the 1 failure is the pre-existing, already-documented
  contention-flaky voice-to-Rx test, confirmed passing 100% in isolation,
  unrelated to this change — neither touched file is in its dependency
  path).
- `npx eslint` on all 4 touched files: 0 errors.
- Live (Chrome DevTools MCP, real dev stack, `clinician@medibook.dev`,
  the real completed appointment the user reported,
  `0c4a6cc6-6df5-4c8b-9ec7-7255c89a4225`): clicked "View Consultation" →
  landed on the real, signed, read-only `EncounterWorkspace` → the new
  "Prescriptions" section showed a real prescription ("Omeprazole,
  Ibuprofen", 30/08/2026) → clicked "View" → the real prescription
  print page rendered correctly with the real drug table, patient, and
  clinician details.

See `TR247` for the full recorded outcome.
