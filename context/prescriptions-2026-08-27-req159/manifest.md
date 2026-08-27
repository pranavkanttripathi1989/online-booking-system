---
id: CTX-prescriptions-2026-08-27-req159
type: improvement
feature: prescriptions
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ159
related: [PLAN201, TP221, TR221]
---

# prescriptions — allergy hard-stop (P2-07, scoped) (2026-08-27)

Phase 2 slice **P2-07** (`project-plans/phase-plans/02-phase2-win-the-midmarket.md`),
scoped down after an explicit ask to the user: allergy-only, drug-drug
interaction checking deferred pending the PRD's own unresolved
drug-database licensing question.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ159 | [Allergy hard-stop](../../requirements/prescriptions/improvement/REQ159-prescriptions-2026-08-27-allergy-hard-stop.md) |
| implementation-plans | PLAN201 | [implementation plan](../../implementation-plans/prescriptions/improvement/PLAN201-prescriptions-2026-08-27-allergy-hard-stop.md) |
| test-plans | TP221 | [test plan](../../test-plans/prescriptions/improvement/TP221-prescriptions-2026-08-27-allergy-hard-stop.md) |
| test-results | TR221 | [results](../../test-results/prescriptions/improvement/TR221-prescriptions-2026-08-27-allergy-hard-stop.md) |

## What shipped

- `backend/src/prescriptions/allergy-check.ts` — a deterministic,
  bidirectional substring matcher against the patient's own free-text
  allergy records (`Diagnoses`, `type='allergy'`), the same "honestly
  non-exhaustive" ethic as `column-mapping.ts`/`denial-classification.ts`.
- `PrescriptionsService#assertNoAllergyConflict()`, called from
  `createPrescription()` alongside the existing `assertTpgCompliant()` —
  a real hard stop, no override, reusing
  `EncountersService.patientAllergyBanner()` rather than re-deriving it.
- Frontend: `clinician/PrescriptionBuilder.jsx` gains a live, client-side
  mirror of the same check — an inline warning per conflicting line and
  a disabled "Issue Prescription" with an explanation, before any
  network call.

## Deliberately not built

- Drug-drug interaction checking — this codebase has no real
  interaction-pair data, and the PRD's own drug-database licensing
  question is unresolved. Fabricating it for a safety-critical hard
  stop was explicitly declined by the user when asked.
- An override/acknowledgment path — matches the existing TPG
  teleconsultation guard's own no-override precedent.

## A related bug fixed the same session, different feature

While verifying this slice's live backend state, the user separately
reported a real, live bug in the clinician edit flow (email appearing
to never save) — root-caused and fixed as its own unit: `BUG028`/
`PLAN200`/`TP220`/`TR220` under a new `clinicians` feature slug. See
that bundle for the full account; unrelated to this slice's own scope,
handled as an interleaved but separately committed fix.
