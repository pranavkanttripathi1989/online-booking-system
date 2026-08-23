---
id: TP062
type: bug
feature: appointments
created: 2026-08-23
updated: 2026-08-23
status: approved
parent: BUG014
related: [BUG011, PLAN035, TR061]
---

# TP062 — Verification for the `patientDetails` shape fix

## Suggestion stage

Skipped per the `CLAUDE.md` conditional rule — a bug fix against an
already-defined real GraphQL type, not exploratory.

## Per-defect contract

| ID | Case | Expected |
|---|---|---|
| TC-01 | Live GraphQL call with the pre-fix payload shape (`patientDetails` including `dateOfBirth: null`, `reason`, `notes`) against the real backend | Reproduces the exact three `BAD_USER_INPUT` errors the user reported, confirming root cause before writing the fix |
| TC-02 | Live GraphQL call with the fixed payload shape (`patientDetails` limited to `firstName`/`lastName`/`email`/`phone`) against the real backend, real seeded clinician + a real linked product | Returns a created appointment id, zero errors |
| TC-03 | Cleanup | The ad hoc appointment/patient row created by TC-02 removed from the dev database — this was a live-verification call, not a seeded fixture, and must not leave debris in `medibook_db` |
| TC-04 | Live GraphQL call with the pre-fix `type` value (`'inperson'`, no underscore) against the real backend | Reproduces the exact `BAD_REQUEST`/`type must be one of the following values: in_person, video, home_visit` error the user reported in a second round |
| TC-05 | Live GraphQL call with the fixed `type` value (`'in_person'`) against the real backend | Returns a created appointment id, zero errors |
| TC-06 | Cleanup | The ad hoc appointment/patient row created by TC-05 removed from the dev database |
| TC-07 | Direct `getClinician`/`getProducts` query for the real seeded demo clinician | Both populated with real data (name, id, a real linked product) — confirms the wizard renders real content once past the new `!clinicianId` guard, not that the guard merely suppresses an error |
| TC-08 | Full-file `eslint` on `booking/index.jsx` after all three defects' fixes | 0 errors; any remaining warnings pre-exist this change (confirmed via `git diff` on the warned lines) |

## How this was checked

Direct `curl` POST to `http://localhost:4000/graphql` against the real
running dev backend for TC-01/02/04/05/07 — not a Playwright spec, since no
existing e2e spec exercises `PaymentForm.handlePayAndBook()`'s exact
mutation-call construction or the no-`?doctor=` entry path, and writing new
ones is out of scope for this bug-fix-sized change (logged under "what this
does not close" in `BUG014`). TC-08 via `npx eslint`.
