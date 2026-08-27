---
id: PLAN196
type: improvement
feature: insurance-claims
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ155
related: [REQ155, TP216, TR216]
---

# PLAN196 — Agentic claim lifecycle (P2-03)

## Schema

- `backend/prisma/schema.prisma` — `Claims` gains
  `diagnosis_codes_json Json?`/`procedure_codes_json Json?` (arrays of
  `{code, description}`, matching this schema's established JSON-field
  convention for structured-but-not-independently-queried side data).
  New `ClaimAppeals` model: `claim_id String @unique` (one live draft
  per claim), `denial_category`, `draft_content`, `status` (default
  `'draft'`), `approved_by_user_id`/`approved_at` (both nullable until
  a human approves), `onDelete: Cascade` from `Claims`.
- `backend/prisma/migrations/20260827150000_claim_codes_and_appeals/migration.sql`
  — hand-written: two `ALTER TABLE "Claims" ADD COLUMN` (JSONB,
  nullable), `CREATE TABLE "ClaimAppeals"` + its unique/plain indexes +
  FK. Read end-to-end against the schema diff before applying.

## Backend

- `backend/src/insurance/denial-classification.ts` — pure,
  deterministic. `classifyDenial(reason)` checks a fixed, ordered list
  of keyword regexes (authorization/duplicate checked before the
  broader not_covered/coding_mismatch/missing_documentation, since the
  former are more specific), falls back to `'other'` rather than
  guessing.
- `backend/src/insurance/appeal-draft.ts` — pure.
  `buildAppealDraft(claim, category, evidence)` composes a plain-text
  letter: claim fields verbatim, a category-specific opening paragraph
  from a fixed lookup table, a real evidence list (or an honest "no
  prescriptions on file" line). No external call, nothing invented.
- `backend/src/insurance/insurance.module.ts` — imports
  `AiClinicalModule` (already exports `AiClinicalService`), reused by
  `suggestClaimCodes` rather than re-deriving `REQ154`'s own matching
  logic.
- `backend/src/insurance/insurance.service.ts`:
  - `toClaimGraphQL` maps `diagnosis_codes_json`/`procedure_codes_json`
    → `diagnosis_codes`/`procedure_codes` (DB column name differs from
    the GraphQL field name; Prisma's `Json` column round-trips the
    stored array as-is).
  - `submitClaim` passes `input.diagnosis_codes`/`procedure_codes`
    straight into the `Json?` columns — populated only if the claims
    desk accepted a suggestion before clicking Submit.
  - `suggestClaimCodes(appointmentId, user)` — resolves the
    appointment's own encounter (if any) and delegates to
    `AiClinicalService#suggestEncounterCodes`, reusing its self-scoping
    rather than re-deriving encounter access. Empty suggestions (never
    an error) when no encounter exists yet, mirroring
    `claimEvidencePrescriptions`'s own precedent.
  - `updateClaimStatus` — on a transition into `'rejected'`, calls the
    new private `draftAppealFor(graphqlClaim)`: classifies the
    rejection reason, gathers real evidence via the extracted
    `prescriptionEvidenceFor(appointmentId)` helper (now shared with
    `claimEvidencePrescriptions`, avoiding duplicated encounter-lookup
    logic), builds the draft, and `upsert`s it into `ClaimAppeals` —
    `update` resets `status`/`approved_by_user_id`/`approved_at` on a
    re-rejection, so a stale approval never survives a regenerated
    draft.
  - `claimAppeal(claimId, user)` — read-only, reuses `loadClaimForUser`
    for org access; `null` for a claim never rejected (a legitimate
    empty state).
  - `approveClaimAppeal(appealId, input, user)` — loads the appeal via
    its own claim's org, sets `status: 'approved'`,
    `approved_by_user_id`/`approved_at`, optionally overrides
    `draft_content` with a human-edited version (the "one-click
    accept/override" the phase doc names).
- `backend/src/insurance/insurance.resolver.ts` — `suggestClaimCodes`/
  `claimAppeal` gated `staff, manager, admin, super_admin` (same as
  `claims()`/`claimEvidencePrescriptions`, no `EntitlementGuard` — pure
  matching, no vendor cost); `approveClaimAppeal` gated `manager, admin,
  super_admin` (same as `updateClaimStatus`'s own approve/reject gate —
  deciding an appeal is the same class of decision as deciding the
  claim).
- `backend/src/insurance/dto/insurance.input.ts` — `ClaimCodeInput`
  (`code`, `description`), `SubmitClaimInput` gains optional
  `diagnosis_codes`/`procedure_codes` arrays (`ValidateNested` +
  `@Type()`, mirroring `UpdateAiProviderConfigInput.credentials`'s own
  established pattern for a nested array input);
  `ApproveClaimAppealInput` (`content?`).
- `backend/src/insurance/entities/insurance.entity.ts` —
  `ClaimCodeType`, `ClaimType` gains `diagnosis_codes`/
  `procedure_codes`, `ClaimAppealType`.
- `backend/src/documents/documents.service.ts#appealPdf` +
  `documents.controller.ts` (`GET /documents/claims/:id/appeal/pdf`) —
  line-for-line `reimbursementPackPdf`'s own pattern: the same explicit
  role re-check (this REST controller never passes through
  `GqlAuthGuard`/`RolesGuard`), composing `insuranceService.claim()` +
  `.claimAppeal()`, throwing a clean `NotFoundException` when no appeal
  has been drafted yet rather than rendering a broken PDF.

## Frontend

- `manager/claims/index.jsx`:
  - `SUGGEST_CLAIM_CODES`/`GET_CLAIM_APPEAL`/`APPROVE_CLAIM_APPEAL`
    GraphQL operations, matching the backend contract verbatim.
  - `handleSelectAppointment` now also fires `suggestClaimCodes`
    (`network-only`, alongside the existing policy lookup) the moment
    an appointment is picked — suggestions render as clickable chips in
    the Submit Claim dialog; `toggleClaimCode` accepts/removes one,
    written into `claimForm.diagnosis_codes`/`procedure_codes`, sent
    on Submit.
  - A rejected claim's row gains an "Appeal" button opening a new
    dialog: denial-category chip, status chip (Draft/Approved), an
    editable multiline `TextField` pre-filled with the real draft
    content, a "Download PDF" action (mirrors the existing "Pack"
    button's `downloadAuthenticatedPdf` call), and an "Approve" button
    (hidden once already approved) that sends the edited content only
    if it actually changed from the fetched draft.

## Design decisions worth recording

1. **The "agentic" work that actually fits this environment is denial
   classification + appeal drafting, not live submission/polling.**
   Scoped explicitly before writing code, once a `grep` for any payer
   API confirmed none exists — matches this codebase's own repeated
   "buy, don't build" honesty about capabilities it doesn't have
   credentials for.
2. **`suggestClaimCodes` takes an `appointment_id`, not an
   `encounter_id`.** The claims desk only ever has an appointment
   selected (never an encounter id directly) — this method resolves
   the encounter internally rather than inventing a new FE-side lookup
   query that duplicates what `claimEvidencePrescriptions` already does
   for the identical appointment→encounter resolution.
3. **One live appeal per claim (`@unique claim_id`), regenerated on
   re-rejection rather than accumulated as history.** A superseded
   draft's own prior approval is explicitly reset, so "approved" always
   means "approved against the content currently on this row."
4. **`ClaimAppeals` itself is the audit trail** the phase plan's own
   "every agent action audited and reversible" language asks for — no
   separate `AuditLogs` write needed, matching `REQ056`'s own precedent
   of treating the request/decision row itself as the durable record.

## Verification

Backend: 117/117 unit suites, 1885/1885 tests (29 new — 13 in
`denial-classification.spec.ts`/`appeal-draft.spec.ts` combined, 16 in
`insurance.service.spec.ts`'s new blocks, plus `documents.service.spec.ts`
extended with 5 new `appealPdf` cases); `tsc --noEmit`/`eslint` clean;
integration 9/9 suites, 414/414 tests, confirming the new migration
applies cleanly and `matrix-coverage.int-spec.ts` needed no new domain
row (both new query surfaces live inside the already-classified
`insurance` domain). Frontend: `manager/claims/index.test.jsx` 7/7 (2
new — accepting a suggested code into a real `submitClaim` call,
viewing/approving a real drafted appeal); lint ratchet raised
4832→4842 (all pre-existing I18N-1 warning class); build + `size-limit`
green (claims desk is its own lazy chunk, no initial-bundle impact).
