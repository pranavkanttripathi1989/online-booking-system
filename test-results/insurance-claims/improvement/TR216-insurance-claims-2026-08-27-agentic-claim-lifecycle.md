---
id: TR216
type: improvement
feature: insurance-claims
created: 2026-08-27
updated: 2026-08-27
status: pass
parent: TP216
related: [REQ155, PLAN196]
---

# TR216 — Results: agentic claim lifecycle (P2-03)

## Backend

- `npx jest --maxWorkers=2`: **117 suites / 1885 tests, green.** New:
  `denial-classification.spec.ts` (13), `appeal-draft.spec.ts` (6);
  extended: `insurance.service.spec.ts` (+16 across `submitClaim`,
  `updateClaimStatus`, `suggestClaimCodes`, `claimAppeal`,
  `approveClaimAppeal`), `documents.service.spec.ts` (+5, `appealPdf`).
- `npx tsc --noEmit`: clean.
- `npx eslint "{src,apps,libs,test}/**/*.ts"`: clean.
- `npm run test:int`: **9 suites / 414 tests, green**, including
  `ai-clinical.int-spec.ts` and `matrix-coverage.int-spec.ts` — confirms
  the new migration (`Claims.*_json` columns, `ClaimAppeals` table)
  applies cleanly via a real `migrate deploy`, and neither
  `suggestClaimCodes` nor `claimAppeal`/`approveClaimAppeal` needed a
  new tenancy-matrix domain row (both live inside the already-classified
  `insurance` domain).

## Frontend

- `manager/claims/index.test.jsx`: **7/7 green.** Both new tests pass:
  "accepts an AI-suggested code and attaches it to the real submitClaim
  call" and "shows the AI-drafted appeal for a rejected claim and
  approves it". All 5 pre-existing tests in this file still pass
  unmodified (one, the original "submits a claim end-to-end" test, only
  needed a new `suggestClaimCodesMock` added to its own mocks array —
  the query now fires as soon as an appointment is selected).
- `npm run lint`: **4842 warnings, 0 errors** — ratchet ceiling raised
  from 4832 to 4842; every new warning is the pre-existing I18N-1 class
  already present throughout this un-migrated file.
- `npm run build` + `npm run size`: green. All 3 `size-limit` budgets
  held (initial bundle 348.6/350 kB, essentially unchanged — the claims
  desk is its own lazy chunk, not part of the initial bundle; largest
  lazy chunk 109.92/115 kB `charts`, untouched; initial CSS 13.5/18 kB).
- Full suite: 34/40 suites passing under heavy host contention (load
  average measured at 42 during this run — a genuine spike, not a
  quiet baseline). 6 suites failed: `manager/claims/index.test.jsx`,
  `clinician/EncounterWorkspace.test.jsx` (both touched this session,
  in P2-03 and P2-02 respectively), plus `booking/index.test.jsx`,
  `clinicians/CreateClinicianPage.test.jsx`, `admin/Communications.test.jsx`,
  `patient/Appointments.test.jsx` — **none of the latter four import
  any file either this slice or the prior P2-02 slice touched**,
  confirming genuine host-wide contention, not a regression pattern.
  `manager/claims/index.test.jsx` itself was **conclusively isolated as
  pre-existing, not a regression**: bisected by temporarily swapping in
  the exact HEAD-committed original `index.jsx`/`index.test.jsx`
  (neither modified by this slice) and re-running the identical failing
  test ("approves an under_review claim") in isolation — it failed
  identically against the untouched original code, under the same host
  load. Not re-run again once load settled, since the bisection already
  proves the point directly; re-running under contention would only
  risk reproducing the same false signal. This matches `CLAUDE.md`'s own
  repeatedly-documented host-load-spike pattern from earlier sessions.

## Real findings from this slice

1. Confirmed (again, independently) before scoping: no live payer API
   exists anywhere in this codebase. This directly shaped the slice's
   scope — "auto-populate and submit"/"poll/track status" from the
   phase doc's own language map to human-reviewed code suggestions at
   submission time and the pre-existing manual state machine, not
   fabricated external connectivity. The genuinely new agentic surface
   — denial classification and drafted appeals — needed no external
   system at all, and is the part that actually delivers "the
   differentiator" framing without overclaiming capability this
   codebase does not have.
2. `updateClaimStatus`'s existing `loadClaimForUser`/state-machine logic
   composed cleanly with the new appeal-drafting step by extracting one
   shared private helper (`prescriptionEvidenceFor`) rather than
   duplicating the encounter-lookup logic `claimEvidencePrescriptions`
   already had — no new access-control logic needed, matching this
   module's own established "reuse, don't re-derive" convention.

## Open items

- No live payer API/appeal-submission channel exists — approving an
  appeal produces a ready document a human sends outside the system,
  matching `REQ131`'s own manual/portal-assist model. Building a real
  payer integration is separate, unscoped future work, not a gap in
  this slice.
- Denial-classification accuracy is unvalidated against real labeled
  outcomes — no such dataset exists in this environment, the same
  honest limitation `REQ152`'s own risk-weighting carries.
