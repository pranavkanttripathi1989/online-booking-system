---
id: PP010
type: analysis
feature: project-plans
created: 2026-08-26
updated: 2026-08-26
status: active
parent: PP007
related: [PP002, PP007, PP008, PP009]
---

# 10 — Next-batch roadmap, reconciled against a parallel session's PP009 (2026-08-26)

A second, independently-run survey of `project-plans/`, `technical-plans/`,
and every `requirements/<feature>/README.md`, done in parallel with (and
initially unaware of) the session that produced `09-next-15-slice-
roadmap.md`. Both surveys converged on much of the same real gap list —
expected, since both read the same live code — but assigned the same
starting ID range (`REQ080`+/`PLAN111`+) independently, and that other
session had already begun real implementation (a `Tasks` Prisma model,
migration, and full `backend/src/tasks/` module) under `REQ080` before
this was discovered.

## Reconciliation decision

Confirmed live: `backend/src/tasks/`, `backend/prisma/migrations/
20260826000000_tasks/`, and a `Tasks` schema addition already exist as
real, in-progress work under the other session's `REQ080`. Per explicit
user decision: **that work stands as `REQ080`, unmodified.** This
session's own drafted Tasks slice (originally `REQ085`/`PLAN116`) was
discarded entirely — not merged, not renamed — to avoid two competing
implementations of the same feature. This session's remaining 14 slices
were renumbered to `REQ100`–`REQ113` / `PLAN140`–`PLAN153`, a range
clear of PP009's own full 15-item span (`REQ080`–`REQ094` if assigned
sequentially), to prevent any further collision.

## A real discrepancy between the two surveys, worth recording

PP009 lists three items as still-open gaps that this session's own
deeper, code-level (not grep-level) verification found **already fully
built**:

| PP009 item | PP009's claim | This session's finding |
|---|---|---|
| #2, `F-17` | "GST fields on `AppointmentPayments`... `PaymentTransactions` has them, patient payments don't" | **Stale.** `REQ047` already added the identical fields to `AppointmentPayments`. The real residual gap is one layer deeper — no per-product `gst_rate`, no clinic `gstin`/`state` — rescoped as this batch's `REQ101`. |
| #3, `F-20` | "3 tables still missing `TableContainer`" | **Stale.** All three named files (`settings/index.jsx`, `patients/detail.jsx`, `RecentAppointmentsTable.jsx`) already wrap every `<Table>` in a `<TableContainer>`, confirmed by direct line-number read. Dropped from this batch entirely — nothing to build. |
| #4, `F-10` | "Audit log gains `outcome`, real `resource_id`, sanitised `details`, `user_agent`" | **Stale.** All of this already exists — schema columns, the interceptor, the read-back resolver, and the frontend render. Dropped from this batch entirely. |

Recommend whoever picks up PP009's own remaining items re-verify #2/#3/#4
against live code before implementing, not the roadmap table as written.
`02-findings-register.md`'s own F-10/F-17/F-20 entries should get a
"fixed, verified 2026-08-26" status line the next time either session
touches that document — not done here, to avoid a third concurrent
writer on the same file this session.

## The 14 slices (post-reconciliation)

| ID | Feature | Slice | Source |
|---|---|---|---|
| `REQ100`/`PLAN140` | insurance-claims | Wire `PayerTariffs` into a payer-charge estimate (precedence decision resolved: tariff > branch skip > branch override > category/channel > base) | `REQ068` residue |
| `REQ101`/`PLAN141` | patient-payments | Per-product `gst_rate` + clinic `state`/`gstin`, real GST split on non-exempt payments | `02` F-17 residue (rescoped) |
| `REQ102`/`PLAN142` | messaging | Non-clinician staff department membership (new `UserProfiles.department_id_ref`, distinct from the existing free-text `department`) for thread auto-participant-add | `REQ058` residue |
| `REQ103`/`PLAN143` | repo-hygiene | `isolatedModules` on the unit-test transform + a `CLAUDE.md` note on container-vs-host speed | `02` F-32 |
| `REQ104`/`PLAN144` | frontend-platform | Unit tests for `useInactivityLogout`/`usePagination` (the original `AuthContext`/`ProtectedRoute` premise was already closed 2026-08-23 — retargeted) | `06-execution-plan.md` P1.6 (rescoped) |
| `REQ105`/`PLAN145` | appointments | Booking-widget "Embed Code" admin UI + best-effort referrer-based origin check | `REQ018` US-BOOK-05 residue |
| `REQ106`/`PLAN146` | scheduling-engine | Booking waitlist (notify-only, 30-min claim window, single-clinician/date) | `REQ017` P1 residue |
| `REQ107`/`PLAN147` | queue-management | QR self-check-in via a single-use, time-boxed, hashed token | `REQ019` P1 residue |
| `REQ108`/`PLAN148` | clinical-records | Curated ICD-10 reference table + type-ahead on the existing free-text diagnosis code field | `REQ020` P1 residue |
| `REQ109`/`PLAN149` | prescriptions | OTP-gated WhatsApp sharing of the existing prescription PDF (two-channel: link via WhatsApp, OTP via SMS) | `REQ021` P1 residue |
| `REQ110`/`PLAN150` | catalog-master-data | Package transfer between patients (+ a real F-01-class tenant-scoping bug fixed in `patientPackages()` along the way) | `REQ054` residue |
| `REQ111`/`PLAN151` | organizations | Admin UI for per-branch product price overrides | `REQ055` residue |
| `REQ112`/`PLAN152` | platform-integrations | Webhook delivery retry, fixed backoff schedule (1m/5m/30m/2h/6h), `@Cron` sweep (no new queue dependency) | `REQ030` P1 residue |
| `REQ113`/`PLAN153` | compliance-dpdp | Retention enforcement extended to `consents` (the one of three deferred domains with a purely mechanical blocker) | `REQ073` residue |

## Execution discipline

Same as every prior G-series batch and PP009's own stated discipline:
each slice gets its own `TP`/`TR` doc pair, backend + frontend
implementation where applicable, a `context/` bundle, and its own
commit(s) once its own tests are green. A consolidated full-suite
verification runs after all 14 land, matching Phase G+2/G+3/G+4's own
proven precedent.
