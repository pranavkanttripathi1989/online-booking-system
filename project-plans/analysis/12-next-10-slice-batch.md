# 12 — Next 10-slice batch (post-REQ114–123)

Produced 2026-08-26, after `REQ114`–`REQ123` (the previous 10-slice
batch, `11-next-10-slice-batch.md`) shipped and was committed. Selected
via a research fork that surveyed `context/open-questions.md`, the
findings register, `07-prd-gap-analysis-and-roadmap.md`,
`08-integration-gap-analysis.md`, `09`/`10`/`11`'s own "deferred" notes,
every `requirements/*/README.md`, and live code — each shortlisted
candidate was verified against real, current code before inclusion, not
trusted from a document's own claim (several near-misses turned out
already closed; see "First-pass candidates already closed" below).

Baseline before this batch: backend unit 92/92 suites, 1470/1470 tests
(`node scripts/test-count-status.mjs`); integration 4/4 suites, 387/387
tests; frontend lint 1911 warnings (within the `--max-warnings 1911`
ratchet); `scripts/check-page-data-wiring.mjs` reports 1 known-fabricated
page (`tasks`), unchanged.

## Selection and execution order

Sequenced to front-load additive, no-schema-change wins, then
schema-adding slices grouped so each gets its own clean migration
without racing the others (executed sequentially, not in parallel — the
prior batch's own note on this still applies: this batch, like the
last, touches `schema.prisma`/`app.module.ts`/the tenancy-matrix fixture
files repeatedly, and the same files remain under a concurrent
session's own uncommitted edits (`backend/src/tasks/`,
`20260826000000_tasks` migration) — every slice must use the established
selective-git-hunk-staging discipline to avoid colliding with that work).

| # | ID | Feature | What | Size | Why now |
|---|---|---|---|---|---|
| 1 | `REQ124`/`PLAN164` | appointments | Room assignment tries the next available room instead of only the first, on conflict | S | `context/open-questions.md` #14 — reframed: not actually ambiguous, trying the next active room before rejecting is strictly better with no product judgment call needed. No schema change. |
| 2 | `REQ125`/`PLAN165` | pharmacy | FEFO (first-expiry-first-out) default ordering on the dispense batch picker | S | `REQ022` US-PHR-02 residue. `REQ067`/`REQ059` already built near-expiry reporting and the dispense UI; this is the missing default-sort, reusing existing infra. No schema change. |
| 3 | `REQ126`/`PLAN166` | prescriptions | Pending-dispense queue view across the whole pharmacy (not per-patient search) | S–M | `REQ021` US-RX-09's own doc says this was "blocked on REQ022 not existing" — stale, `REQ022` shipped since. Read-only query + a new pharmacy tab. No schema change. |
| 4 | `REQ127`/`PLAN167` | clinical-records | Investigation orders (FR-EMR-08) | S–M | `REQ020` P1 residue, confirmed unbuilt (`grep InvestigationOrder schema.prisma` — no hits). New table, links `encounters` → `test-results`. |
| 5 | `REQ128`/`PLAN168` | clinical-records | Referrals (FR-EMR-10) | S–M | `REQ020` P1 residue, confirmed unbuilt. New table, own migration (sequenced after #4 so both clinical-records schema additions land as two clean, reviewable migrations rather than one combined one). |
| 6 | `REQ129`/`PLAN169` | prescriptions | Digital signature + tamper-evident hash on printed Rx (US-RX-08) | S–M | `REQ021` P1 residue, confirmed unbuilt. Reuses the `documents`/pdfkit module (`REQ057`) for the signed PDF; adds a hash column to `Prescriptions`. |
| 7 | `REQ130`/`PLAN170` | clinical-records | Discrete vitals for growth charts (FR-EMR-05) | M–L | `REQ020` P1 residue, confirmed unbuilt (`vitals` today is free text inside `EncounterSections`, not structured/trendable rows). New `Vitals` table + a chart component — bigger than #4/#5 because of the chart UI. |
| 8 | `REQ131`/`PLAN171` | insurance-claims | OPD cashless claim submission (basic state machine) | M | `REQ031` P1 scope, confirmed unbuilt (`grep Claim schema.prisma` — no hits beyond unrelated names). Scoped to submitted→under_review→approved/rejected→settled, manual/portal-assist per the requirement's own R11 mitigation — no real payer API. Reimbursement-pack PDF generation is a natural follow-on, not bundled here. |
| 9 | `REQ132`/`PLAN172` | test-coverage-audit | F-24 spec-by-spec confirmation for the named highest-risk untested surfaces | M | F-24's own status line lists `AuthContext`, `ProtectedRoute`/`RoleGuard`, booking-wizard step validation, and currency/date utils as never individually confirmed covered file-by-file. Investigation-heavy; fills real gaps found, doesn't pad. |
| 10 | `REQ133`/`PLAN173` | platform-nfr | Bounded pagination for the 2–3 highest-value unbounded resolvers (F-14 residue) | M | F-14's own status line: the hard-cliff risk is closed (global 200-row clamp middleware) but the real `{data, paginatorInfo}` migration for `testResults`/`notifications`/`threads` is still open. Backend + matching frontend contract change (Hard Rule 7) — sequenced last since it's the most likely to need a live-regression pass on each touched page. |

## First-pass candidates already closed — don't re-investigate

- **F-07** (Razorpay order creation anonymous) — closed 2026-08-23, `REQ040`.
- **F-12** (introspection/rate-limiting) — closed, `REQ038`.
- **F-15** (N+1 patterns) — closed, `REQ074` (the one real remaining instance).
- **REQ102** (messaging non-clinician dept membership) — already shipped 2026-08-26, `requirements/messaging/README.md` already says `done`.
- **REQ018 residue** (per-service prepayment, embeddable booking widget) — `07-prd-gap-analysis-and-roadmap.md`'s own prose still says "deferred," but both shipped in Phase G+2/`REQ105`; that document's line is stale, not this codebase.
- **`scripts/check-page-data-wiring.mjs`** — unchanged (1 known page, `tasks`), not a fresh finding.

## Deliberately not in this batch

Same standing exclusions as `11-next-10-slice-batch.md`, unchanged:
`REQ032` US-PLAN-03 entitlement guard; refresh-token-to-`HttpOnly`-cookie
(F-09's harder half); `F-33` Postgres password rotation (blocked
pending human sign-off); the global Apollo `cache-first` default flip;
real WebRTC teleconsultation (`REQ026`) and the TPG drug-list
enforcement blocked on it; every `context/open-questions.md` entry
marked "decision needed from the user" (#11(b)/#12/#13/#15/#16/#17);
real AWS SES email sending (blocked on credentials); insurance-claims
P2/P3 scope (IPD pre-auth, NHCX, government schemes — `REQ031`'s own
doc says these need their own follow-on requirement once P1 is live,
not built speculatively here).

**Fold-in, not a slice on its own:** `F-30` has no status line pointing
at `REQ123`'s `scripts/test-count-status.mjs`, even though it's the
literal fix that finding asked for. Added as a one-line correction
inside slice 10's own docs pass rather than spending a dedicated slice
on it.

## Execution discipline

Same as the prior batch: full requirement → plan → implement (backend
+ frontend where the slice calls for it) → unit/integration tests →
test-plan/test-result docs → context bundle → all five doc-root indexes
→ commit per slice (code, then docs, matching the established two-commit
convention), continuing sequentially through all 10. A final consolidated
verification pass (backend `npx jest --maxWorkers=2` + `npm run test:int`
+ `eslint` + `tsc --noEmit`; frontend `lint` + `test` + `build`) runs
once after slice 10, not after each one — matching `11`'s own
demonstrated "does not sacrifice rigor" precedent from the batches
before it.
