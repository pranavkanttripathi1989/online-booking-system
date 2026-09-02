---
id: PLAN253
type: improvement
feature: test-results
created: 2026-09-03
updated: 2026-09-03
status: done
parent: REQ184
related: [TP273, TR273]
---

# PLAN253 — Implementation plan: `recordTestResult` completion path (P2-13)

Full design rationale lives in the approved plan file
(`/Users/pranavkanttripathi/.claude/plans/starry-soaring-bunny.md`) — this
document is the as-built record.

## Backend

`backend/src/test-results/dto/order-test.input.ts` — added
`TestResultValueInput` (`name`/`value`/`ref`/`flag`, all `@IsNotEmpty()`,
`flag` restricted via `@IsIn(['normal', 'high', 'low'])`) and
`RecordTestResultInput` (`id`, `status: 'processing' | 'completed'`,
optional `values: [TestResultValueInput!]`, `@ValidateNested` + `@Type` for
the nested array — the `IpdPaymentTenderInput`-in-`RecordIpdPaymentInput`
precedent from the just-completed IPD slice 4).

`backend/src/test-results/test-results.service.ts` — new
`recordResult(input, user)`: loads the row (404 if missing/deleted), scopes
via `assertSameOrg(user, row.ordered_by?.client_org_id ?? null, 'Test
result')` — reused directly rather than re-deriving `findOne()`'s own
inline BUG006-era manual check, since `assertSameOrg`/`isSameOrg` already
fail closed identically (`!user?.client_org_id` returns `false`, the exact
BUG006 fix semantics). A private `RESULT_TRANSITIONS` map (`pending ->
[processing, completed]`, `processing -> [completed]`, `completed -> []`)
gates legal transitions, the `insurance.service.ts#CLAIM_TRANSITIONS`/
`ipd-insurance.service.ts#PRE_AUTH_TRANSITIONS` precedent. `values.length ===
0` is rejected only when completing; `processing` may have none.
`date_completed` is set to `new Date()` only on the transition into
`completed`, otherwise carried forward unchanged.

`backend/src/test-results/test-results.resolver.ts` — new
`recordTestResult` mutation, `@Auth('manager', 'admin', 'super_admin',
'clinician', 'staff')` — the exact gate `orderTest` already uses; this app's
fixed RBAC role set has no dedicated "lab technician" role.

## Frontend

`frontend/src/graphql/mutations.js` — new `RECORD_TEST_RESULT_MUTATION`,
placed next to `ORDER_TEST_MUTATION` (this domain's own canonical-dialect
location, not page-local `gql`).

`frontend/src/pages/test-results/index.jsx`:
- New `RecordResultDialog` component (sibling to the existing
  `ResultDialog`): a status choice (`Mark Processing` / `Complete with
  Results`) and, when completing, a dynamic add/remove list of
  parameter/value/reference/flag rows (`flag` a 3-option `Select`, matching
  `flagColorsFor()`'s own controlled vocabulary).
- A new "Record Result" `IconButton` in the table's existing Action column,
  shown when `r.status !== 'completed'` — the
  `manager/claims/index.jsx`-established status-conditional-action
  convention.
- Status KPI cards (Total/Completed/Processing/Pending) are now real,
  accessible (`role="button"`, keyboard-operable, `aria-pressed`) filter
  triggers setting `statusFilter` — the smallest change that turns the
  existing list into a usable "my queue" entry point without a second page.
- `useSnackbar` (`notistack`) added for success/error toasts on the new
  mutation, matching `manager/claims/index.jsx`'s own precedent — this page
  previously had no toast usage at all (only an inline error `Alert` for the
  read query).

## The scope decision, and why it's not a literal reading of the tracker row

Before writing any code, a codebase-wide pattern survey (an Explore
sub-agent) confirmed: **no Kanban/status-column layout exists anywhere in
`frontend/src/pages`.** Every "staff works a queue of pending items to a
terminal status" page — most directly `manager/claims/index.jsx`, itself a
close structural analog (a `submitted → under_review → approved/rejected →
settled` state machine with per-status inline actions and a decision
dialog) — uses the same flat table + status `Chip` + status-conditional
action buttons already present in `test-results/index.jsx`. Building a
second, dedicated "results inbox" page would have introduced a UI pattern
this codebase deliberately doesn't use anywhere else, and would have
duplicated the list rather than closed the actual gap (the missing
completion mutation). This is a deliberate adaptation of the phase
tracker's literal wording onto the codebase's own established convention,
per the `careos-phase-planning` skill's own guidance — recorded here, not
silently substituted.

## Verification

Backend: `npx tsc --noEmit`, `npx eslint "{src,apps,libs,test}/**/*.ts"`
clean. 9 new unit tests (`test-results.service.spec.ts`, 30 total in the
domain now). Live container restart + GraphQL introspection confirmed
`recordTestResult` genuinely served. Full integration suite: 13 suites/516
tests, all green, including the domain's existing `matrix-coverage
.int-spec.ts` coverage (unaffected — this is a same-domain mutation on an
already-`CASES`-classified table, not a new domain, so no new tenancy-matrix
entry was needed).

Frontend: 2 new tests (`index.test.jsx`, 7 total). `npm run lint` — 0 new
warnings (only the pre-existing baseline). Full frontend unit suite: 6
suites flagged failing in one full-parallel run (`PrescriptionBuilder`,
`test-results/index` itself, `patients/detail`, `booking/index`,
`CreateClinicianPage`, `EncounterWorkspace`) — each re-run in isolation and
confirmed passing cleanly; none import this slice's own changed logic
(`CreateClinicianPage.jsx` is the only one of the six importing
`graphql/mutations.js`, and this slice's edit there was purely additive —
one new exported constant, zero changes to any existing export). Matches
this codebase's own repeatedly-documented full-parallel-run
resource-contention pattern, not a regression. `npm run build` and `npm run
size` both green.
