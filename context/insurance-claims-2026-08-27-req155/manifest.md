---
id: CTX-insurance-claims-2026-08-27-req155
type: improvement
feature: insurance-claims
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ155
related: [PLAN196, TP216, TR216]
---

# insurance-claims — agentic claim lifecycle (2026-08-27)

Phase 2 slice **P2-03** (`project-plans/phase-plans/02-phase2-win-the-midmarket.md`)
— "the differentiator." Depends on `P2-02` (`REQ154`), which shipped the
code-suggestion layer this slice consumes.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ155 | [Agentic claim lifecycle](../../requirements/insurance-claims/improvement/REQ155-insurance-claims-2026-08-27-agentic-claim-lifecycle.md) |
| implementation-plans | PLAN196 | [implementation plan](../../implementation-plans/insurance-claims/improvement/PLAN196-insurance-claims-2026-08-27-agentic-claim-lifecycle.md) |
| test-plans | TP216 | [test plan](../../test-plans/insurance-claims/improvement/TP216-insurance-claims-2026-08-27-agentic-claim-lifecycle.md) |
| test-results | TR216 | [results](../../test-results/insurance-claims/improvement/TR216-insurance-claims-2026-08-27-agentic-claim-lifecycle.md) |

## What shipped

- `Claims.diagnosis_codes_json`/`procedure_codes_json` — human-reviewed
  code suggestions attached at submission time.
- `ClaimAppeals` — an auto-drafted appeal for a rejected claim: a
  deterministic denial-category classification
  (`denial-classification.ts`) plus a templated letter body
  (`appeal-draft.ts`) including the claim's own real evidence
  (`REQ137`'s prescriptions). One live draft per claim, regenerated on
  a re-rejection.
- `suggestClaimCodes` (wraps `REQ154`'s `suggestEncounterCodes` for an
  appointment id), `claimAppeal`, `approveClaimAppeal` — the "one-click
  accept/override" the phase doc names.
- `GET /documents/claims/:id/appeal/pdf` — mirrors `REQ138`'s own
  reimbursement-pack pattern exactly, including its explicit REST-layer
  role re-check.
- `manager/claims/index.jsx` — suggested-code chips in Submit Claim, an
  Appeal review/edit/approve dialog for a rejected claim.

## The scoping decision that shaped everything else

No live payer API exists anywhere in this codebase (confirmed again
before starting). The phase doc's own "auto-populate and submit"/
"poll/track status" language was read against that reality: submission
and status tracking stay the existing, unchanged, human-driven
mechanisms; "auto-populate" means human-reviewed code suggestions at
submission time, not silent persistence. The real new agentic surface —
denial classification and drafted appeals — needed no external system
at all, which is exactly where this slice's own effort went.

## Design decisions worth knowing before touching this again

1. `suggestClaimCodes` takes an `appointment_id`, matching what the
   claims desk actually has — resolves the encounter internally rather
   than inventing a new FE-side lookup.
2. One live appeal per claim (`@unique claim_id`); a re-rejection
   regenerates it in place and resets any prior approval.
3. `ClaimAppeals` itself is the audit trail — no separate `AuditLogs`
   write, matching `REQ056`'s own precedent.
4. Never auto-submits anywhere — approving an appeal produces a ready
   document; a human sends it outside the system, the same manual/
   portal-assist model `REQ131` already established.

## Verification

Backend: 117/117 unit suites, 1885/1885 tests (29 new); integration
9/9 suites, 414/414 tests (confirms the new migration and no new
tenancy-matrix domain needed); `tsc`/`eslint` clean. Frontend: 7/7 in
`manager/claims/index.test.jsx` (2 new); lint ratchet raised
4832→4842 (pre-existing warning class only); build + `size-limit`
green. See TR216 for the full account.

## What this closes

`P2-03` is the last of the three slices `project-plans/phase-plans/02-phase2-win-the-midmarket.md`
names as "carrying the phase." `P2-04` (denial analytics + payer
scorecards) depends on this slice and can now proceed — real denial
categories and appeal outcomes now exist to analyze.
