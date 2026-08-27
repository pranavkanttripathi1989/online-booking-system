---
id: TP216
type: improvement
feature: insurance-claims
created: 2026-08-27
updated: 2026-08-27
status: done
parent: PLAN196
related: [REQ155, TR216]
---

# TP216 — Test plan: agentic claim lifecycle (P2-03)

Well-scoped against an already-proven pattern (`REQ138`'s own
`reimbursementPackPdf` REST-role-recheck shape, `REQ154`'s own
deterministic-suggestion module). Suggestion stage skipped per
`CLAUDE.md`'s own conditional rule; drafted directly.

## Backend unit

| # | Case | File |
|---|---|---|
| 1–9 | Each denial category classified correctly; specific categories (authorization/duplicate) win over broader ones; case-insensitive; unrecognized reason falls back to `other`; label lookup | `denial-classification.spec.ts` |
| 10–15 | Every literal claim field present verbatim; category-specific opening paragraph; honest "no prescriptions" empty state; real evidence listed with drug names/date; never throws on an item-less prescription | `appeal-draft.spec.ts` |
| 16 | `submitClaim` stores `diagnosis_codes`/`procedure_codes` verbatim when supplied | `insurance.service.spec.ts` |
| 17 | `toClaimGraphQL` exposes the claim's own stored codes, mapped from the `*_json` columns | same |
| 18 | `updateClaimStatus` auto-drafts an appeal on a rejection, classifying the real reason | same |
| 19 | Never drafts an appeal for a non-rejection transition | same |
| 20 | The drafted appeal includes real evidence when the appointment has an encounter | same |
| 21–23 | `suggestClaimCodes` rejects a cross-org appointment; returns empty suggestions (never throwing) with no encounter; delegates to `AiClinicalService#suggestEncounterCodes` for the resolved encounter | same |
| 24–26 | `claimAppeal` rejects a cross-org claim; returns `null` for a never-rejected claim; returns the real drafted appeal | same |
| 27–30 | `approveClaimAppeal` rejects a cross-org claim and an unknown appeal id; approves as-is with no override; overrides content when a human edits it before approving | same |
| 31–35 | `appealPdf` rejects a patient/clinician caller before calling `InsuranceService`; throws when the claim is not found; throws an honest error when no appeal has been drafted yet; renders a real PDF for an authorized caller; still renders when the clinic lookup is null | `documents.service.spec.ts` |

## Backend integration (real Postgres + real GraphQL guard chain)

| # | Case |
|---|---|
| 1 | The new migration (`Claims.*_json` columns, `ClaimAppeals` table) applies cleanly via `migrate deploy` (implicit — the full integration suite, including `ai-clinical.int-spec.ts`, depends on it) |
| 2 | `matrix-coverage.int-spec.ts` needs no new domain row — both new query surfaces live inside the already-classified `insurance` domain |

## Frontend unit

| # | Case | File |
|---|---|---|
| 1 | Accepts an AI-suggested code and attaches it to the real `submitClaim` call — never persisted before the human clicks a chip | `manager/claims/index.test.jsx` |
| 2 | Shows the AI-drafted appeal for a rejected claim (category, real content) and approves it via the real `approveClaimAppeal` mutation | same |

## Out of scope for this test plan

- Any live payer API integration or a denial-classification accuracy
  benchmark — neither has a real system/dataset to test against in this
  environment (see REQ155's own scope note).
- E2E/Playwright coverage — this is an addition to an already-covered
  manager page; `MockedProvider`-based unit coverage against the real
  query/mutation contracts is the established pattern for this file.
