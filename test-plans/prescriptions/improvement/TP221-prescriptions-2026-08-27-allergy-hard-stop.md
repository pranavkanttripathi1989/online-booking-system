---
id: TP221
type: improvement
feature: prescriptions
created: 2026-08-27
updated: 2026-08-27
status: done
parent: PLAN201
related: [REQ159, TR221]
---

# TP221 — Test plan: allergy hard-stop on prescribing (P2-07, scoped)

A safety-critical addition to an already-proven pattern
(`assertTpgCompliant()`'s own hard-stop shape, `patientAllergyBanner()`'s
own reused query) — suggestion stage skipped per `CLAUDE.md`'s
conditional rule, drafted directly.

## Backend unit

| # | Case | File |
|---|---|---|
| 1–10 | `findAllergyConflict()`: exact match; case-insensitive; short token matches within a longer composition (Sulfa/Sulfamethoxazole); a free-text description containing the drug name ("Aspirin allergy"); no match; empty allergy list; a drug-class-level allergy with no shared text does NOT match (named limitation); a too-short allergy token is skipped; the first matching allergy wins when several exist; a null composition doesn't throw | `allergy-check.spec.ts` |
| 11 | Blocks a drug conflicting with a recorded allergy, no override | `prescriptions.service.spec.ts` |
| 12 | Allows a drug with no conflict | same |
| 13 | Skips the allergy lookup entirely (no extra `drugs.findMany` call) when the patient has none recorded | same |
| 14 | Checks every item, blocks on the first conflict found | same |
| 15 | Passes the caller's own JWT through to `patientAllergyBanner` unchanged, reusing its access control | same |
| 16 | All 61 pre-existing `createPrescription`/related tests still pass unchanged | same |

## Frontend unit

| # | Case | File |
|---|---|---|
| 1 | Shows an inline allergy warning and blocks Issue when a picked drug conflicts | `clinician/PrescriptionBuilder.test.jsx` |
| 2 | Does not block Issue when the picked drug has no conflict | same |
| 3 | All 4 pre-existing P1-12 Voice-to-Rx tests pass unchanged | same |

## Live verification

Deferred — this environment has no seeded patient with a real active
allergy record to prescribe against without creating and reverting test
data; the unit-level coverage (real `Diagnoses`-shaped fixtures, real
service wiring through `EncountersService`) is the primary evidence for
this slice, matching the precedent of prior AI-clinical slices this
session that also relied on comprehensive unit coverage over a live
pass where live data didn't already exist.

## Out of scope for this test plan

- Drug-drug interaction checking (see `REQ159`'s own scope decision).
- An override/acknowledgment path — this is a genuine hard stop.
- Drug-class-level allergy matching (see `REQ159`'s own honesty note).
