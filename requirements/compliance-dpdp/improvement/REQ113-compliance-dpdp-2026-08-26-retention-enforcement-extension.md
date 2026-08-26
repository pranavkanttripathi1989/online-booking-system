---
id: REQ113
type: improvement
feature: compliance-dpdp
created: 2026-08-26
updated: 2026-08-26
status: in-progress
parent: REQ073
related: []
---

# REQ113 — Extend automated retention enforcement to `consents`

## Source

`REQ073` (`US-DPDP-06`) shipped a daily `RetentionPurgeService` sweep but
deliberately enforced only one of its four documentable data classes
(`test_results`), leaving `clinical_records`, `consents`, and `messages`
as policy-recordable-but-unenforced. Each of the three has its own
distinct, real blocker (`REQ073`'s own document, restated below) — this
slice does not treat them as one mechanical follow-up, and closes only
the one whose blocker is actually resolvable in a small, additive
change.

## The three blockers, restated from REQ073's own document

- **`clinical_records`** — "carries the exact statutory-retention-vs-
  erasure tension REQ034's own requirement doc flags for legal review
  before automating." This is a **policy/legal** blocker, not a
  technical one. No code change resolves it — automating a purge here
  without that legal review would be the wrong fix, not a smaller scope
  of the right one. **Remains blocked.**
- **`messages`** — "spans two people's own conversation, not one
  patient's record, which is a different deletion-scoping question."
  This is a real **design** question (whose retention policy governs a
  thread with participants from potentially different orgs, or a
  patient and staff pair — not just a missing column) that needs its
  own scoping decision, not a mechanical fix. **Remains blocked.**
- **`consents`** — "has no `is_deleted` column to safely soft-delete
  through at all." Confirmed by reading `backend/prisma/schema.prisma`'s
  `Consents` model directly: no `is_deleted` field exists. Unlike the
  other two, this is a **purely mechanical, additive** blocker — add the
  column (default `false`, matching every other soft-deletable model in
  this schema), backfill existing rows, and this data class enforces
  identically to `test_results`.

**This slice picks `consents`.** It is the only one of the three whose
blocker is a schema gap rather than a legal or design question, and
`Consents` already has a direct `client_org_id` column (simpler than
`test_results`' own indirect `ordered_by: {client_org_id}` relation
scoping) and a natural retention-clock field (`granted_at`, with an
optional `revoked_at`).

## Design decision: what date is the retention clock measured from?

A `Consents` row is not static — a patient can revoke consent at any
time after granting it. Purging a `granted`-only reading of the clock
would keep a long-revoked consent record alive indefinitely as long as
it was originally granted recently, which defeats the point of
retention minimization for a record that has been inactive since its
revocation. This slice measures the retention clock from
**`revoked_at` if set, otherwise `granted_at`** — i.e. "how long has it
been since this consent record was last a live, actionable fact" — the
same intent as `test_results`' own `date_ordered` clock (time since the
record became a static, no-longer-changing fact).

## User stories

- As a compliance officer, I can configure a retention period for the
  `consents` data class (already possible today via the existing
  `setRetentionPolicy` mutation and `RETENTION_DATA_CLASSES` list — no
  change needed there), and it now actually enforces, matching
  `test_results`' existing behaviour.
- As a compliance officer, an org's `legal_hold: true` policy for
  `consents` continues to be respected exactly as it already is for
  `test_results` — no consent record is purged while a legal hold is
  active, regardless of age.

## Acceptance criteria (Given/When/Then)

- **Given** a `consents` policy with `retention_years: N` for an org,
  **when** the daily sweep runs, **then** `Consents` rows for that org
  whose `revoked_at` (if set) or otherwise `granted_at` is older than
  `N` years are soft-deleted (`is_deleted: true`).
- **Given** the same policy with `legal_hold: true`, **then** the sweep
  never touches that org's `Consents` rows, regardless of age.
- **Given** a `Consents` row already soft-deleted, **when** the sweep
  runs again, **then** it is not re-processed (the `where` clause
  excludes `is_deleted: true` rows, matching `test_results`' own
  pattern).
- **Given** a `clinical_records` or `messages` policy, **then** the
  sweep continues to record but never act on it — unchanged from
  `REQ073`'s own shipped behaviour.

## What is deliberately NOT built in this slice

- `clinical_records` and `messages` enforcement — both remain blocked
  on the reasons restated above; neither is a smaller-scope version of
  this slice's own work.
- Any change to `RETENTION_DATA_CLASSES` or the `setRetentionPolicy`
  mutation — a `consents` policy can already be created today; this
  slice only makes the sweep act on it.
- A per-record legal hold (litigation-hold on one specific patient's
  consent record rather than an org-wide class-level hold) — `REQ073`'s
  own schema comment already flags this as a distinct, larger, not-yet-
  built feature.

## Traceability

`REQ073`, `REQ034` `US-DPDP-06`. `FR-COMP-07` (PRD).
