---
id: REQ136
type: improvement
feature: prescriptions
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ129
related: [PLAN176, TP196, TR196]
---

# REQ136 — A real frontend surface for prescription-integrity verification

## Why this slice

`REQ129` built and tested `verifyPrescriptionIntegrity` end to end on the
backend, then explicitly logged "any frontend surface calling
`verifyPrescriptionIntegrity` directly" as deliberately out of scope — a
real, working capability with no way for a person to actually reach it.
Confirmed still true before starting: `grep -rn
"verifyPrescriptionIntegrity" frontend/src` matched nothing.

## User story

As a pharmacist or patient holding a printed or shared prescription copy,
I want to enter its ID and see whether its printed verification code
still matches what the clinic has on file, so I can tell whether the
document in front of me reflects what was actually prescribed.

## Acceptance criteria

- **Given** any authenticated user (any role — matching
  `verifyPrescriptionIntegrity`'s own broad `@Auth` gate), **when** they
  navigate to `/prescriptions/verify` and enter a prescription id,
  **then** the real query runs and shows a clear valid/invalid result,
  not a placeholder.
- **Given** a valid prescription with a stored hash, **then** the result
  shows the same human-checkable verification code format as
  `PrescriptionPrint.jsx`/`documents.service.ts` already print, so a
  person can visually compare it against the code on their paper copy.
- **Given** a legacy prescription issued before `REQ129` (no stored
  hash), **then** the page shows an honest "no verification code on
  file" state rather than reporting it as tampered or erroring.
- **Given** the page is reached from a real prescription's own print
  view, **then** the prescription id is pre-filled rather than requiring
  it to be re-typed from the printed page.

## In scope

- `frontend/src/pages/prescriptions/Verify.jsx` — a standalone route,
  `/prescriptions/verify`, inside the shared authenticated `AppShell`
  layout (no role gate — matches the query's own broad `@Auth`, and the
  same "any authenticated role, no `RoleGuard`" precedent already used
  by `/calendar`, `/messages`, `/settings`, `/notifications`,
  `/profile`).
- A discoverability link from `PrescriptionPrint.jsx`'s existing
  screen-only toolbar (`Print` / `Download PDF` / `Share via WhatsApp`),
  pre-filling `?id=` for the prescription currently being viewed.
- `?id=` query-param pre-fill so a shared/printed link can carry the id
  directly.

## Deliberately out of scope

- Any change to `verifyPrescriptionIntegrity` itself, or to the pdfkit/
  print-page verification-code rendering — both already built and tested
  in `REQ129`; this slice is purely a consumption surface for an
  already-correct backend contract.
- A QR code on the printed prescription linking straight to this page —
  a real, separate enhancement (would need a QR-generation library on
  the pdfkit render path), not required to satisfy this story's own
  acceptance criteria (typing the id is sufficient).
- Attaching the verify action to `PrescriptionPrint.jsx`'s own already-
  loaded record instead of a fresh lookup — deliberately not done: that
  page already trusts the live record it's rendering, so a "verify
  against itself" check would be circular. The real use case (a
  pharmacist or patient with only a physical copy, not an active session
  already viewing that exact prescription) needs a fresh, independent
  lookup by id, which is what this page does.
