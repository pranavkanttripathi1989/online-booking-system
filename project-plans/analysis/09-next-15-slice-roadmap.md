---
id: PP009
type: analysis
feature: project-plans
created: 2026-08-26
updated: 2026-08-26
status: active
parent: PP007
related: [PP002, PP007, PP008]
---

# 09 — Next 15-slice roadmap (2026-08-26)

A fresh pending-work survey across `project-plans/`, `project-plans/technical-plans/`,
and every `requirements/<feature>/README.md`, done to select the next 15
vertical slices. Unlike `07`'s own top-down PRD sequencing, this document
starts from "what's actually still open right now" — re-verified against
live code, not restated from a prior snapshot.

## Method

1. Re-read `02-findings-register.md` end to end; only findings with no
   "fixed"/"closed" status line, or an explicitly-named still-open half of
   a partially-fixed finding, count as open (excludes `F-33`, blocked
   pending user sign-off, per standing instruction not to re-surface it).
2. Re-read `08-integration-gap-analysis.md` — confirmed fully closed
   (`A-10`/`B-4` are documented deliberate non-issues, not resurfaced).
3. Grepped every `requirements/<feature>/README.md` for rows not marked
   `done`, then opened each doc's own frontmatter and content.
4. Cross-checked every "Absent" PRD module in `07`'s own gap table against
   a live `ls backend/src/` (44 domains today) to catch modules that have
   since landed without the roadmap being updated.

## A real, pre-existing finding surfaced by this survey itself

**Eight requirement docs (`REQ051`–`REQ058`) carry stale `status:
in-progress` frontmatter despite being fully shipped, tested, and marked
`done` in their own `context/` bundles and `test-results/` docs** — the
exact F-30 pattern ("documented status drifts from measured status"),
just not yet caught for these eight. Confirmed by reading each doc's own
frontmatter directly, not inferred. Fixed as a housekeeping commit
alongside this batch (flip `status: in-progress` → `status: done` on all
eight, cross-checked one more time against their linked `TR###` docs
before flipping) — not counted as one of the 15 slices below, since no
code changes.

**A second, unrelated live finding**: a full `frontend` Jest run this
session measured **18 suites / 117 tests, 6 suites / 10 tests failing**,
and real coverage at **~13%** (statements) — both real numbers, not the
finding register's stale "1 suite / 4 tests." The 6 failures were not
re-verified in isolation this session (that's Slice 15 below); flagging
here rather than assuming they match the previously-documented
full-parallel-contention flakiness pattern without checking.

## Selection criteria (matching every prior G-series batch in this session)

Additive and isolated where possible; no new external vendor integration
(Hard Rule 9 — vendors are fixed except OTP/notification providers); no
dependency on `REQ032`'s still-paused entitlement guard. Explicitly
**excluded** from this batch on those grounds: `REQ028` (ABDM — needs a
real government certification process), `REQ026` (telemedicine — needs
WebRTC signaling infra, oversized for a slice), `REQ033` (e-mandate
billing — payment-compliance-sensitive, deserves its own dedicated pass).

## The 15 slices

Each gets a full `REQ`/`PLAN`/`TP`/`TR` doc chain, backend + frontend
implementation where applicable, unit + integration/e2e coverage, and a
`context/` bundle — matching this codebase's own established working
loop, no step skipped. IDs assigned sequentially as each slice starts
(`REQ080`+, `PLAN111`+, `TP138`+, `TR137`+), recorded here as work
proceeds.

| # | Feature | Gap | Source | Size |
|---|---|---|---|---|
| 1 | `tasks` (new slug) | Build a real backend + wire the frontend page — the last fully-fabricated routed page in the app (F-18 residue) | `02` F-18 | medium |
| 2 | `patient-payments` | GST fields on `AppointmentPayments` (place-of-supply, HSN/SAC, CGST/SGST/IGST, invoice sequence) — `PaymentTransactions` has them, patient payments don't | `02` F-17 | small |
| 3 | `platform-nfr` (bug) | 3 tables still missing `TableContainer` — same truncation bug class fixed elsewhere | `02` F-20 | tiny |
| 4 | `security` | Audit log gains `outcome`, real `resource_id`, sanitised `details`, `user_agent`, and the two missing indexes | `02` F-10 | small |
| 5 | `appointments` | Embeddable booking-widget "Embed Code" admin UI (config/backend already exists from `REQ018` residue) | `07`, CLAUDE.md | small |
| 6 | `platform-integrations` | Webhook delivery retry with exponential backoff (currently best-effort/synchronous only, `REQ030`'s own named P1) | `07` | small-medium |
| 7 | `messaging` | SLA inbox — unresponded-thread aging report/view (`REQ024`'s own named P1) | `07` | small-medium |
| 8 | `insurance-claims` | Wire `PayerTariffs` into `resolveServicePrice()` — the deferred design question `REQ068` logged (where a payer tariff ranks against branch/category overrides) | `REQ068` residue | medium |
| 9 | `catalog-master-data` | Package renewal (multi-sitting packages currently have no renew path, `REQ054`'s own named deferral) | `REQ054` residue | small |
| 10 | `queue-management` | QR self-check-in (`REQ019`'s own named P1) | `07` | medium |
| 11 | `prescriptions` | Digital signature on a signed-off prescription (`REQ021`'s own named P1, narrower slice of a larger deferred set) | `07` | small-medium |
| 12 | `analytics-reporting` | Pharmacy report group (near-expiry/low-stock/dispense-volume) — unlocked now that `REQ022`/`REQ067` shipped | `07` §21 | small-medium |
| 13 | `organizations` | Admin UI for the branch-override price cascade (`REQ055` shipped backend-only; no UI exists to actually set an override) | `REQ055` residue | small |
| 14 | `platform-nfr` | Migrate the 5 highest-traffic still-unbounded list resolvers to the `{data, paginatorInfo}` convention (F-14's own residual scope, deliberately narrowed from "all ~19") | `02` F-14 | medium |
| 15 | `patient-portal` | ABHA-link status/action on the existing Privacy tab (mirrors the `GET_MY_PATIENT_LINK` pattern `platform-nfr-2026-08-24-phase-g2-frontend-completion` already established) | `REQ027` residue | small |

## What this deliberately does not do

Does not attempt `REQ028`/`REQ026`/`REQ033` (excluded above). Does not
touch `REQ032`'s entitlement guard. Does not re-open `F-33` (Postgres
password rotation — blocked pending explicit user sign-off, unrelated to
this batch). Slice 14 explicitly does not migrate all ~19 unbounded
resolvers named in F-14 — five is a deliberately bounded, honest subset;
the rest stays logged as open in `02-findings-register.md`, not silently
implied closed.

## Execution discipline

Per Hard Rule 4 (commit per vertical slice) and this session's own
established G-series precedent: each slice gets its own commit(s)
(backend, frontend, docs — same three-commit pattern as `REQ079`) once
its own tests are green. A single consolidated full-suite verification
(`backend: jest + test:int + eslint + tsc`, `frontend: lint + jest +
build`) runs after all 15 land, matching Phase G+2/G+3/G+4's own
precedent that batching the final verification doesn't sacrifice rigor —
each slice still gets its own scoped test run as it's built.
