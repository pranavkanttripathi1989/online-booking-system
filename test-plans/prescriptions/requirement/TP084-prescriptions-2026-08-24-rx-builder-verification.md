---
id: TP084
type: requirement
feature: prescriptions
created: 2026-08-24
updated: 2026-08-24
status: approved
parent: PLAN057
related: [REQ021, TR083]
---

# TP084 — Verification for prescription builder, print view, and repeat-Rx

## Suggestion stage

Skipped. `REQ021` already carries full Given/When/Then acceptance criteria
for its scoped P0 stories, and `PLAN057` records the one genuine
architectural decision (no server-side PDF pipeline, browser-print single
rendering path) with its rationale — this is a routine tenant-scoped
resource module (matching the `Encounters`/`EncounterTemplates` pattern
`REQ020` already proved) plus a print view following an existing precedent
(`/video/:id`'s bare-route shape), not a genuinely exploratory feature.

## Per-defect/feature contract

| ID | Case | Expected |
|---|---|---|
| TC-01 | Qty auto-calc — `BD` × 5 days | `10` |
| TC-02 | Qty auto-calc — `SOS` (as-needed) with a duration given | no qty (null), never guessed |
| TC-03 | Qty auto-calc — no duration given | no qty, regardless of frequency |
| TC-04 | `createPrescription` — non-clinician caller (e.g. front-desk staff) | rejected |
| TC-05 | `createPrescription` — cross-org encounter | rejected, `NotFoundException` |
| TC-06 | `createPrescription` — clinician not the encounter's own clinician | rejected |
| TC-07 | `createPrescription` — `repeated_from_id` pointing at a different patient's prescription | rejected, `BadRequestException` |
| TC-08 | `createPrescription` — valid input | stamps `patient_id`/`clinician_id` from the encounter, not the caller's input |
| TC-09 | `prescription()`/`patientPrescriptions()` — cross-org read | rejected |
| TC-10 | `prescription()` — patient reading another patient's prescription | rejected |
| TC-11 | `prescription()` — clinician reading another clinician's prescription | rejected |
| TC-12 | `prescription()` — org-less non-operator | rejected outright (F-01 sentinel, never falls through to "see everything") |
| TC-13 | `patientPrescriptions()` — clinician who never treated this patient | rejected |
| TC-14 | `patientPrescriptions()` — owning patient | returns prescriptions with drug names resolved |
| TC-15 | `repeatPrescription` | returns an unsaved draft shape, never calls `prescriptions.create` |
| TC-16 | `repeatPrescription` — cross-tenant source | rejected |
| TC-17 | `printPrescription` — first fetch | `is_reprint: false`, `reprint_count` set to `1` |
| TC-18 | `printPrescription` — second+ fetch | `is_reprint: true`, `reprint_count` incremented |
| TC-19 | `printPrescription` — cross-tenant | rejected |
| TC-20 | `createPrescriptionSet` — org-less non-operator | rejected (`orgIdForWrite` fails closed) |
| TC-21 | `createPrescriptionSet` — org-shared vs. personal | `clinician_id` null for org-shared, caller's own id for personal |
| TC-22 | `applyPrescriptionSet` — unknown or cross-org set | rejected |
| TC-23 | `applyPrescriptionSet` — valid set | returns items with qty computed from frequency × duration |
| TC-24 | Tenancy matrix — `prescriptions` domain | classified in `domain-cases.ts`; org-A caller never sees org-B's row; role gate matches `@Auth()` exactly |
| TC-25 | Tenancy matrix anti-rot gate | no unclassified resolver domain |
| TC-26 | Full backend suite regression | 0 failures |
| TC-27 | Backend lint + `tsc --noEmit` | clean |
| TC-28 | Backend integration suite regression | 0 failures |
| TC-29 | Full frontend suite regression | 0 failures |
| TC-30 | Frontend lint (both new/touched pages) | clean |
| TC-31 | Frontend build | succeeds, new pages code-split |
| TC-32 | Responsive — `PrescriptionBuilder`'s drug-line table at 768/1024/1280px | scrolls, never silently truncates |
| TC-33 | Responsive — `PrescriptionPrint`'s drug table at 768/1024/1280px | scrolls, never silently truncates |
| TC-34 | e2e — live browser pass: build a line with auto-qty, save a favourite set (appears without reload), issue, print view has no watermark on first view, `DUPLICATE` on reload, repeat-from-history pre-fills the drug line | full flow passes against the real dev stack |

## Notes for the test-runner

The e2e spec creates a real `Appointments`/`Encounters` row and a real
`PrescriptionSets` row against the dev database with fixed identifiers
(`notes: 'REQ021-E2E-PROBE'`, set name `'REQ021-E2E-PROBE Set'`) and a fixed
appointment slot (`2027-02-01T09:00:00.000Z`). `afterAll` cleans both up
child-first (`Prescriptions` → `Encounters` → `Appointments`; no
`deletePrescriptionSet` mutation exists, so the set is deleted directly).
Before re-running this spec after a prior run was interrupted (killed
mid-test, `afterAll` never fires), check the dev DB for a leftover row at
that slot/name and delete it manually — the same class of issue
`CLAUDE.md` already documents for `manager-services.spec.js`.
