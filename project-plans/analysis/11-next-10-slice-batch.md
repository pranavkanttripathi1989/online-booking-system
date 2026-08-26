---
id: PP011
type: analysis
feature: project-plans
created: 2026-08-26
updated: 2026-08-26
status: active
parent: PP010
related: [PP002, PP007, PP008, PP010]
---

# 11 — Next-batch selection: 10 slices picked after the REQ100–113 batch (2026-08-26)

A fresh survey of `project-plans/`, `project-plans/technical-plans/`, and every
`requirements/<feature>/README.md`, done after `PP010`'s own 14-slice batch
(`REQ100`–`REQ113`) fully shipped and its stale `in-progress` status fields
were corrected. This batch has **no cross-session collision** to reconcile —
only the other session's own `Tasks`/`REQ080` work remains uncommitted in the
working tree, and it is not touched here.

## Method

Verified every candidate against live code (grep/read), not just the doc that
named it — several candidates surfaced by a first-pass survey turned out
already closed and were dropped (see §C). `context/open-questions.md`'s own
unresolved entries were checked and excluded where they require a product
decision only a human can make, not a technical scoping call.

## A. The 10 slices (execution order)

| Order | ID | Feature | Slice | Source |
|---|---|---|---|---|
| 1 | `REQ114`/`PLAN154` | security | Wire OTP-login SMS to the real per-org provider registry (`auth.service.ts#requestOtp` is still a `console.log` stub) | Flagged repeatedly, most recently `REQ109`'s own "related gap found, not fixed here" note |
| 2 | `REQ115`/`PLAN155` | catalog-master-data | "Sell a Package" UI — `purchasePackage` mutation is real/tested, no UI ever called it | `08-integration-gap-analysis.md` A-10 |
| 3 | `REQ116`/`PLAN156` | platform-integrations | Enforce `ApiKeys`: a real `ApiKeyGuard` + one real REST endpoint gated by it | `REQ015`'s own `ApiKeys` shipped create/list/revoke only — never consumed anywhere, decorative like the pre-`REQ049` permissions bug |
| 4 | `REQ117`/`PLAN157` | queue-management | Predictive rolling-median wait-time ETA (US-QUE-04) | `REQ019`'s own named P1 deferral; `queue.service.ts`'s own comment marks today-only average as the interim |
| 5 | `REQ118`/`PLAN158` | queue-management | Delay broadcast — notify waiting/upcoming patients when a clinician is running late | `REQ017`'s own named P1 deferral |
| 6 | `REQ119`/`PLAN159` | scheduling-engine | Hybrid-mode booked:walk-in interleaving | `REQ017`'s own named P1 deferral; sequenced after #4/#5 since it touches the same queue-ordering path |
| 7 | `REQ120`/`PLAN160` | appointments | Bulk-reschedule (a clinician's whole day, or a filtered set) | `REQ017`'s own named P1 deferral |
| 8 | `REQ121`/`PLAN161` | frontend-platform | Apollo `cache-and-network` audit for remaining stale-prone list pages | `02-findings-register.md` F-21 — `REQ078` verified 4 named pages only; the global `cache-first` default and other pages were never swept |
| 9 | `REQ122`/`PLAN162` | organization-branding | Bounded theme-token hex-color sweep (highest-traffic ~12 files, not the full 88) | F-19; `REQ077` shipped only the lint ratchet, not the sweep itself |
| 10 | `REQ123`/`PLAN163` | repo-hygiene | Findings-register freshness (F-10/F-17/F-20/F-32 status lines) + a CI-measured test-count status script `CLAUDE.md` can link instead of hand-edited numbers | F-30; CLAUDE.md's own account explicitly leaves this for "the next time either session touches that document" |

## B. Deliberately not in this batch

- **`REQ032` US-PLAN-03 (entitlement guard)** — still genuinely unbuilt, but
  its own cross-cutting blast radius (every feature-gated resolver at once)
  is explicitly flagged in `CLAUDE.md` as needing its own dedicated,
  carefully-reviewed slice — not a routine batch item.
- **Refresh token off `localStorage` into an `HttpOnly` cookie (F-09's
  harder half)** — a real backend-auth-architecture change (cookie-setting
  on login/OTP/refresh/logout, CORS, every e2e login helper) that the
  findings register itself says "deserves its own reviewed plan."
- **F-33 (rotate the default Postgres password)** — blocked pending a
  human's explicit live sign-off against running shared infrastructure,
  unchanged since the last pickup.
- Every entry in `context/open-questions.md` that ends in "decision needed
  from the user" (#10–#16) — not actionable without a product/business call.
- AWS SES real email sending — blocked on real AWS credentials per Hard
  Rule 9, not fabricable as a slice.

## C. First-pass candidates that turned out already closed on re-verification

- 3 tables "still missing `TableContainer`" (F-20) — already fixed, confirmed
  by direct file read.
- "Backend tests slow in container" (F-32) — very likely already closed by
  the just-shipped `REQ103`; the register's own status line is what's stale,
  not the underlying problem (folded into slice #10 above).
- `forgot-password` simulating success (F-23) — closed same-day as `BUG022`.

## Execution discipline

Same as every prior batch: each slice gets its own `TP`/`TR` doc pair,
backend + frontend implementation where applicable, a `context/` bundle, and
its own commit(s) once its own tests are green. Executed sequentially, not
in parallel — this batch touches `schema.prisma`/`app.module.ts`/the
tenancy-matrix fixture files repeatedly across slices 1–7, and running
multiple slices concurrently (even via sub-agents) would recreate the exact
cross-editor collision risk `PP010` had to solve for against the other
session, this time self-inflicted. A consolidated full-suite verification
runs after all 10 land.
