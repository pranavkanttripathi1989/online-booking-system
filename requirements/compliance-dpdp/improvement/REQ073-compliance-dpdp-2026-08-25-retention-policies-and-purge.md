---
id: REQ073
type: improvement
feature: compliance-dpdp
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ034
related: []
---

# REQ073 — Retention policies and an automated purge sweep

## Source

Part of an 8-slice batch, scoped from `REQ034`'s own `US-DPDP-06` —
"given a retention period is configured per data class, an automated job
purges data past that period unless a legal hold is active." `REQ034`'s
own P0 pass (2026-08-24) shipped DPDP consent capture and rights-request
queuing; automated retention enforcement was explicitly deferred.

## Current-state gap

No retention concept existed anywhere in the schema. Data accumulated
indefinitely with no documented or enforced retention schedule.

## What shipped

`RetentionPolicies` — one row per `(client_org_id, data_class)`,
`retention_years`, `legal_hold: Boolean`. `retentionPolicies` query /
`setRetentionPolicy` mutation (upsert), manager+.

A daily `RetentionPurgeService` sweep soft-deletes (`is_deleted: true`,
matching this codebase's own established convention — never a hard SQL
`DELETE`) records older than the configured window, skipping any policy
under legal hold.

**Deliberately scoped to one data class.** `RETENTION_DATA_CLASSES`
(`consent.input.ts`) lists four candidates
(`clinical_records`/`test_results`/`consents`/`messages`) as documentable
policy targets, but `SUPPORTED_DATA_CLASSES` (the sweep's own enforcement
list) is narrower — only `test_results` is actually purged today.
`clinical_records` carries a statutory-retention-vs-erasure tension this
slice's own requirement doc flags for legal review before automating;
`Consents` has no `is_deleted` column to soft-delete through at all;
`Messages` spans two people's conversation, not one patient's record, a
different deletion-scoping question. Each is a real, deliberate scope
cut, not a silent gap.

## User stories

- As a compliance officer, I can configure how long each data class is
  retained per org, with an override for legal holds.
- As a compliance officer, past-retention `test_results` data is
  automatically and safely (reversibly) purged without manual action.

## Acceptance criteria (Given/When/Then)

- **Given** a `test_results` policy with `retention_years: 7`, **when**
  the daily sweep runs, **then** `TestResults` rows older than 7 years
  for that org are soft-deleted.
- **Given** the same policy with `legal_hold: true`, **then** the sweep
  never touches that org's data, regardless of age.
- **Given** a policy for `clinical_records`/`consents`/`messages`,
  **then** it can be recorded (documented schedule) but the sweep never
  acts on it.
- **Given** an org-less platform operator, **when** they attempt to set a
  policy, **then** they are rejected with a clear error (no org to scope
  it to).

## Traceability

`REQ034` `US-DPDP-06`. `FR-COMP-07` (PRD).
