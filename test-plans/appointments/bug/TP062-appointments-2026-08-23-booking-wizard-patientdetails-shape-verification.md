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

## How this was checked

Direct `curl` POST to `http://localhost:4000/graphql` against the real
running dev backend for both TC-01 and TC-02 — not a Playwright spec, since
no existing e2e spec exercises `PaymentForm.handlePayAndBook()`'s exact
mutation-call construction, and writing a new one is out of scope for this
bug-fix-sized change (logged under "what this does not close" in `BUG014`).
