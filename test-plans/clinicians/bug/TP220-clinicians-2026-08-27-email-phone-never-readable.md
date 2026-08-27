---
id: TP220
type: bug
feature: clinicians
created: 2026-08-27
updated: 2026-08-27
status: done
parent: PLAN200
related: [BUG028, TR220]
---

# TP220 — Test plan: clinician `email`/`phone` never readable over GraphQL

Live-reported bug against real production-shaped data, with a clear
observed-vs-expected gap — suggestion stage skipped per `CLAUDE.md`'s
conditional rule, drafted directly.

## Backend unit

| # | Case | File |
|---|---|---|
| 1 | `email()` returns the real value for a manager caller | `clinicians.resolver.spec.ts` |
| 2 | `phone()` returns the real value for a clinician caller | same |
| 3 | `email()` withholds (returns `null`) for a patient caller | same |
| 4 | `phone()` withholds (returns `null`) for a patient caller | same |
| 5 | `email()` returns `null`, not `undefined`, when the underlying row has no email set | same |

## Live verification (real dev backend, not mocked)

| # | Case |
|---|---|
| 1 | Direct `psql` read against the real dev DB confirms the original `UpdateClinician` save already persisted the new email correctly — the bug is read-side only |
| 2 | `clinician(id) { email phone }` as `manager@medibook.dev` returns the real, current values |
| 3 | The identical query as `patient@medibook.dev` returns `null` for both fields |

## Out of scope for this test plan

- Adding an `email`/`phone` display to `clinicians/detail.jsx` — no UI
  slot exists for it today; wiring the data through (this fix) is
  necessary but a new visible display element is a separate, smaller
  follow-on if wanted.
- Widening the fix to also gate on `clinician_id` self-scoping (a
  clinician viewing another clinician's own contact info) — out of
  scope for what was actually reported; the real, reported gap is
  patient-facing exposure.
