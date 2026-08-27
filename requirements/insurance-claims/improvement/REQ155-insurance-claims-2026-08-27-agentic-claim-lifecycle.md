---
id: REQ155
type: improvement
feature: insurance-claims
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ131
related: [PLAN196, TP216, TR216]
---

# REQ155 — Agentic claim lifecycle: auto-coding, denial classification, drafted appeals (P2-03)

## Why this slice

`project-plans/phase-plans/02-phase2-win-the-midmarket.md`'s P2-03 slice
— named "the differentiator": *"Every competitor's AI stops at the note.
This continues into the money."* Depends on `P2-02` (`REQ154`), which
shipped `suggestEncounterCodes` and the `Icd10Codes`/`ProcedureCodes`
reference data this slice consumes.

## What was found before scoping

- **No real payer API exists anywhere in this codebase**, confirmed
  again before starting (`REQ131`'s own header comment: *"Deliberately
  manual/portal-assist per the PRD's own R11 risk mitigation... no real
  payer API"*). "Auto-populate and submit the claim" and "poll/track
  status" from the phase doc's own BE bullet cannot mean live external
  submission or polling — there is nothing to poll. Scoped accordingly:
  "auto-populate" means auto-suggesting codes for a human to review
  before their own explicit Submit click; "submit the claim" is the
  existing, unchanged `submitClaim` mutation; "track status" is the
  existing, unchanged `updateClaimStatus` state machine. The genuinely
  new "agentic" work is the denial → classification → drafted-appeal
  step, which needed no external system at all.
- `Claims` had no diagnosis/procedure-code field of any kind before
  this slice (found while scoping `REQ154`, logged there) — extended
  with `diagnosis_codes_json`/`procedure_codes_json` here, the "consume
  P2-02's codes" half of this slice's own dependency.

## User story

As insurance-desk staff, I want a rejected claim to already have a
drafted appeal waiting for me — classified by why it was denied, with
the claim's own real evidence attached — so I only have to review,
edit if needed, and approve, instead of writing one from scratch.

## Acceptance criteria

- **Given** a claim moves to `rejected` via `updateClaimStatus`,
  **then** a draft appeal is automatically created: a denial category
  (from a fixed, deterministic classification of the free-text
  rejection reason), a full letter body including the claim's own real
  details and its real evidence (`REQ137`'s prescriptions).
- **Given** the claims desk views a rejected claim, **then** they can
  open the drafted appeal, see its category and content, edit the
  content, and approve it in one click — matching the phase doc's own
  "never auto-submit without a human decision point."
- **Given** a claim is rejected a second time (a real, if unusual, path
  back through the state machine), **then** the appeal is regenerated
  in place, reset to `draft` — an approval of a since-superseded draft
  never silently remains "approved" against stale content.
- **Given** the claims desk is submitting a new claim for an
  appointment with a real encounter, **then** they see AI-suggested
  diagnosis/procedure codes they can accept (one click) before Submit —
  never persisted without that explicit action.
- **Given** every "agent" action (drafting, approving), **then** it is
  a real, auditable, reversible database row (`ClaimAppeals`) — created
  unattributed, approved only once a real human (`approved_by_user_id`,
  `approved_at`) does so.
- ⚖️ Nothing in this slice submits an approved appeal to a payer —
  this environment has no live payer API to submit to, and the phase
  doc's own constraint is explicit regardless.

## In scope

- `Claims.diagnosis_codes_json`/`procedure_codes_json` — optional,
  human-reviewed-then-submitted.
- `ClaimAppeals` — `denial_category`, `draft_content`, `status`
  (`draft`/`approved`), `approved_by_user_id`/`approved_at`.
- `denial-classification.ts` — deterministic keyword-rule classifier
  (`missing_documentation` / `coding_mismatch` / `not_covered` /
  `authorization_required` / `duplicate_claim` / `other`), honestly not
  true NLU, matching every other `ai-clinical/*` module's own
  documented discipline (no classification-LLM provider/credentials
  exist in this environment).
- `appeal-draft.ts` — templated, category-specific letter body; every
  fact in it is a literal field passed in, never invented.
- `InsuranceService#suggestClaimCodes` (wraps `REQ154`'s
  `suggestEncounterCodes` for an appointment, not an encounter id — the
  shape the claims desk actually has), `#draftAppealFor` (auto-run
  inside `updateClaimStatus` on rejection), `#claimAppeal`,
  `#approveClaimAppeal`.
- `GET /documents/claims/:id/appeal/pdf` — mirrors `REQ138`'s own
  reimbursement-pack pattern exactly, including its explicit role
  re-check (the REST layer bypasses `GqlAuthGuard`).
- `manager/claims/index.jsx` — suggested-code chips in the Submit Claim
  dialog; an "Appeal" button + review/edit/approve dialog for a
  rejected claim.

## Deliberately out of scope

- Any live payer API integration, submission, or status polling — none
  exists in this codebase or environment; would be a fabricated
  capability.
- Auto-submitting an approved appeal anywhere — approving only marks
  the draft ready; a human sends it outside the system, the same
  "manual/portal-assist" model `REQ131` itself established.
- A denial-classification accuracy benchmark — no labeled dataset
  exists in this environment, the same honest limitation `REQ152`'s own
  risk-weighting carries.
- Multiple appeal drafts per claim / appeal history — one live draft
  per claim (`@unique claim_id`), regenerated on a re-rejection rather
  than accumulated.
