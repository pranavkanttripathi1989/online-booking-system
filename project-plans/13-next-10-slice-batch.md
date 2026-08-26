# 13 — Next 10-slice batch (post-REQ124–133)

Produced 2026-08-26, after `REQ124`–`REQ133` (the previous 10-slice
batch, `12-next-10-slice-batch.md`) shipped and was committed. Selected
via a research fork that surveyed `07-prd-gap-analysis-and-roadmap.md`,
`02-findings-register.md` (checking each finding's own "Status" update,
not just its original text), `context/open-questions.md`, and — most
directly — every `REQ124`–`REQ133` document's own "Deliberately out of
scope" section, since this session has been consistently disciplined
about logging real follow-ons there rather than silently dropping them.
Each shortlisted candidate was verified against real, current code
before inclusion (several near-misses turned out already closed; see
"First-pass candidates already closed" below).

Baseline before this batch: backend unit 92/92 suites, 1525/1525 tests;
integration 4/4 suites, 387/387 tests; frontend lint 1909 warnings
(within the `--max-warnings 1909` ratchet, lowered from 1911 during
`REQ132`); `scripts/check-page-data-wiring.mjs` reports 1
known-fabricated page (`tasks`), unchanged.

## Selection and execution order

Front-loads additive, no-schema-change wins. Most of this batch needs no
`schema.prisma` change at all (unlike batch 12, which was schema-heavy) —
the two insurance-claims slices are grouped adjacently since
reimbursement-pack generation naturally builds on the claim-evidence
work landing first. The one higher-risk, schema-adjacent slice (DPDP
retention-purge extension, real data-deletion territory) is sequenced
last, per its own note below. A concurrent session's own uncommitted
`tasks`/REQ080 work (`backend/src/tasks/`, the
`20260826000000_tasks` migration, and in-progress edits to
`app.module.ts`/`schema.gql`/the tenancy-matrix fixture files) is still
sitting exactly as it was at the end of the last batch — every slice
here that touches those same shared files must keep using the
established selective-git-hunk-staging discipline (verify via `git
status --short` before every commit; never `git add -A`; hand-craft a
patch to isolate one hunk if a shared file needs a genuinely necessary
fix, as `REQ133` had to for `domain-cases.ts`).

| # | ID | Feature | What | Size | Why now |
|---|---|---|---|---|---|
| 1 | `REQ134`/`PLAN174` | platform-nfr | `notifications` bounded pagination (F-14 residue, the item `REQ133` deliberately deferred) | S | Confirmed still a plain `@Query(() => [NotificationType])` unbounded array. Direct copy of `REQ133`'s own `testResults` migration — same `{data, paginatorInfo}` shape, `first` defaulting to 200. Lower risk than `threads` (already `user_id`-scoped, one caller's own data). |
| 2 | `REQ135`/`PLAN175` | clinical-records | Referral status-transition mutation (`pending → scheduled/completed/declined`) | S | `REQ128`'s own doc named this as explicitly not built ("no mutation to advance them was built this slice"). Confirmed zero hits for `updateReferralStatus`. Mirrors `insurance.service.ts#updateClaimStatus`'s transition-map pattern, just shipped in `REQ131`. No schema change — `Referrals.status` already exists. |
| 3 | `REQ136`/`PLAN176` | prescriptions | "Verify a prescription" UI, calling the already-built `verifyPrescriptionIntegrity` query | S | `REQ129`'s own doc: "no frontend surface calling `verifyPrescriptionIntegrity` directly... a follow-on." Confirmed zero frontend references. A small dedicated page/dialog, no schema or resolver change — the backend capability already exists and is tested. |
| 4 | `REQ137`/`PLAN177` | insurance-claims | Auto-attach a signed prescription as OPD-claim evidence (US-INS-06) | S | `REQ031`'s own doc names this story; `Claims` has no evidence field today. Scoped to a read-only resolve-field joining the claim's own appointment → encounter → prescriptions, not a new attachment-storage subsystem. |
| 5 | `REQ138`/`PLAN178` | insurance-claims | Reimbursement-pack PDF generation | S–M | Named as a natural follow-on in `REQ131`'s own doc ("a natural follow-on, not bundled here"). Builds directly on #4's evidence linkage. Reuses `documents.service.ts`'s established "compose existing scoped assembly methods" pattern (`REQ057`/`REQ129`'s own precedent) — no new access-control logic. |
| 6 | `REQ139`/`PLAN179` | organization-branding | Org logo propagated into PDF letterheads (prescriptions/invoices/visit-summaries) | S–M | `REQ002`'s own doc explicitly deferred this ("booking-email/invoice/favicon propagation... no invoice module existed yet") — the `documents` module (`REQ057`) now exists and already fetches `org.logo_url` into its assembly data, unused. `drawLetterhead()` in `common/pdf/render-pdf.ts` takes no logo param at all — confirmed by reading it. |
| 7 | `REQ140`/`PLAN180` | organizations | Batch branch-override prefetch for the appointments list-preview pricing N+1 | S–M | `REQ055`'s own doc has a dedicated "Deliberate scope decision" section naming this exact gap as a named, not-silently-dropped follow-on. Same batch-prefetch pattern `messages.service.ts#threads()`'s own F-15 fix already established. |
| 8 | `REQ141`/`PLAN181` | test-coverage-audit | Zod-schema test coverage, next batch of the files `REQ132` identified but didn't individually audit | S–M | `REQ132`'s own doc lists 7 specific files (`ClinicProfileForm.jsx`, `ClinicianFormDrawer.jsx`, `patients/index.jsx`, `tasks/index.jsx`, `admin/Roles.jsx`, `CreateClinicianPage.jsx`, `EditClinicianPage.jsx`) with zero test coverage. Pick the 2-3 highest-risk (patient-data-mutating) of these rather than all 7 — same investigate-then-test discipline as `REQ132`, which found a real bug there. |
| 9 | `REQ142`/`PLAN182` | test-coverage-audit | F-28 residue: confirm which e2e specs run against the isolated `postgres_e2e` stack vs. the shared dev DB | M | Finding's own status line: "not independently re-investigated spec-by-spec." Investigation-heavy — read `frontend/e2e/*.spec.js` fixture setup against `docker-compose.yml --profile e2e`, no code-writing unless a real gap surfaces. |
| 10 | `REQ143`/`PLAN183` | compliance-dpdp | DPDP retention-purge enforcement for one more domain (`clinical_records`, `consents`, or `messages` — only `test_results` is enforced today) | M, **higher risk** | `REQ073`'s own doc: "each has its own real, distinct blocker" for the other three. Sequenced last deliberately — real clinical/consent data-deletion territory, warrants the most care and the freshest attention in the batch, not a rushed final item. Read `REQ073`'s own account of each domain's specific blocker before picking one; if all three blockers are still genuinely unresolved, this may need to become an open-question entry rather than a shipped slice — that's an acceptable outcome, not a failure to force past. |

## First-pass candidates already closed — don't re-investigate

- **F-23** (`forgot-password.jsx` simulates success) — already wired for
  real (`useMutation(FORGOT_PASSWORD_MUTATION)` confirmed live). The
  finding's register entry just never got a status line — folded in as
  a one-liner during this batch's own docs pass (see below), not a slice.
- **REQ102** (messaging non-clinician dept membership) — `status: done`.
- **US-MSG-04/05** (auto-responder, clinical-record linkage) — both
  shipped, `REQ070`/`REQ071`.
- **Scheduling-engine waitlist + delay broadcast** — both fully built
  (`backend/src/waitlist/*`, `backend/src/queue/*` broadcast logic)
  despite `REQ017`'s own original doc still reading "P1, not built" in
  its own stale prose.
- **QR self-check-in** (`REQ107`) — fully built, confirmed live route +
  token flow.
- **REQ023 bill-split mechanism** — confirmed still not built (zero
  hits for `bill_split`/`payer_payable`), which is *why*
  benefit-wallet auto-adjudication (US-INS-05) stays excluded below,
  not offered as a candidate itself.

## Deliberately not in this batch

Same standing exclusions as `12-next-10-slice-batch.md`, unchanged:
`REQ032` US-PLAN-03 entitlement guard; refresh-token-to-`HttpOnly`-cookie;
`F-33` Postgres password rotation (blocked pending human sign-off); the
global Apollo `cache-first` default flip; real WebRTC teleconsultation
(`REQ026`) and the TPG drug-list enforcement blocked on it; every
`context/open-questions.md` entry marked "decision needed from the
user"; real AWS SES email sending (blocked on credentials);
insurance-claims P2/P3 scope (IPD pre-auth, NHCX, government schemes).
Additionally this batch: **US-INS-05 benefit-wallet auto-adjudication**
— still blocked on `REQ023`'s bill-split mechanism, confirmed unbuilt.

**Fold-in, not a slice on its own:** F-23 has no status line recording
that `forgot-password.jsx` is already real (see above) — added as a
one-line correction inside this batch's own final docs pass, matching
the `F-30` precedent from batch 12.

## Execution discipline

Same as the prior two batches: full requirement → plan → implement
(backend + frontend where the slice calls for it) → unit/integration
tests → test-plan/test-result docs → context bundle → all five
doc-root indexes → commit per slice (code, then docs, matching the
established two-commit convention), continuing sequentially through
all 10. A final consolidated verification pass (backend `npx jest
--maxWorkers=2` + `npm run test:int` + `eslint` + `tsc --noEmit`;
frontend `lint` + `test` + `build`) runs once after slice 10.
