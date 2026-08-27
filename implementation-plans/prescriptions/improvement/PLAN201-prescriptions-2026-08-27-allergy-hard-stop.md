---
id: PLAN201
type: improvement
feature: prescriptions
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ159
related: [REQ159, TP221, TR221]
---

# PLAN201 — Allergy hard-stop on prescribing (P2-07, scoped)

## Backend

- `backend/src/prescriptions/allergy-check.ts` — new pure module,
  `findAllergyConflict(drug, allergies)`: normalizes both sides,
  bidirectional substring match. Deterministic, dependency-free, fully
  unit-tested standalone — same shape as `column-mapping.ts`/
  `denial-classification.ts`.
- `backend/src/prescriptions/prescriptions.service.ts` — new
  `assertNoAllergyConflict(patientId, items, user)`, mirroring
  `assertTpgCompliant()`'s own shape immediately above it (a real hard
  stop, no override). Reuses
  `EncountersService.patientAllergyBanner(patientId, user)` rather than
  re-deriving the same `Diagnoses` query — the same discipline
  `ai-clinical.service.ts`'s `preConsultSummary()` already established
  for this exact query. Called from `createPrescription()` right after
  `assertTpgCompliant()`. Not called from `createPrescriptionSet()` —
  a favourite drug set has no `patient_id` at all (it's a reusable
  template), so there is nothing to check an allergy against.
- `backend/src/prescriptions/prescriptions.module.ts` — imports
  `EncountersModule` for the cross-module injection (no cycle: neither
  `EncountersModule` nor its own imports reference `PrescriptionsModule`).

## Frontend — `frontend/src/pages/clinician/PrescriptionBuilder.jsx`

- New `PATIENT_ALLERGY_BANNER` query (identical AST to
  `EncounterWorkspace.jsx`'s own persistent allergy banner — reused
  verbatim, not re-declared differently).
- `DRUGS_QUERY` gains `composition` for a closer client-side match.
- A client-side mirror of the backend's own `findAllergyConflict()` —
  the same bidirectional substring check — computes a per-line conflict
  and disables "Issue Prescription" with a summary `Alert` plus an
  inline `error`/`helperText` on the specific drug field (`UI-11`: never
  disable a submit button without saying why). This page's own check is
  UX only (`SEC-18`) — the backend enforces the real hard stop
  regardless of what this function finds.

## Testing

- `allergy-check.spec.ts` — 10 cases: exact match, case-insensitivity,
  short-token-in-longer-composition, free-text-description-contains-
  drug-name, no match, empty list, the named drug-class-limitation
  case, too-short-token skip, first-match-wins, null composition.
- `prescriptions.service.spec.ts` — 5 new cases in a dedicated
  `describe` block: blocks with no override, allows a non-conflicting
  drug, skips the lookup entirely when the patient has no allergies
  recorded (asserted via `drugs.findMany` call count), checks every
  item and reports the first conflict, passes the caller's own JWT
  through to `patientAllergyBanner` unchanged. All 61 pre-existing
  tests in this file pass unchanged (a default "no allergies" mock was
  added for `EncountersService`).
- `clinician/PrescriptionBuilder.test.jsx` — 2 new cases: the inline
  warning appears and Issue is blocked for a conflicting drug; a
  non-conflicting drug does not block Issue. All 4 pre-existing P1-12
  Voice-to-Rx tests pass unchanged.

## Documentation

`REQ159`, this `PLAN201`, `TP221`/`TR221`, a context bundle, all five
root indexes, and the Phase 2 tracker's `CURRENT POSITION`.
