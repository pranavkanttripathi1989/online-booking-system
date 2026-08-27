---
id: CTX-revenue-share-2026-08-27-req158
type: requirement
feature: revenue-share
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ158
related: [PLAN199, TP219, TR219]
---

# revenue-share — Doctor revenue-share & payouts engine (2026-08-27)

Phase 2 slice **P2-06** (`project-plans/phase-plans/02-phase2-win-the-midmarket.md`)
— the last of the three slices that document names as "carrying the
phase" (`P2-03`/`P2-05` shipped earlier the same day). A brand-new
feature slug — no existing feature covers doctor compensation.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ158 | [Doctor revenue-share & payouts engine](../../requirements/revenue-share/requirement/REQ158-revenue-share-2026-08-27-doctor-revenue-share-and-payouts.md) |
| implementation-plans | PLAN199 | [implementation plan](../../implementation-plans/revenue-share/requirement/PLAN199-revenue-share-2026-08-27-doctor-revenue-share-and-payouts.md) |
| test-plans | TP219 | [test plan](../../test-plans/revenue-share/requirement/TP219-revenue-share-2026-08-27-doctor-revenue-share-and-payouts.md) |
| test-results | TR219 | [results](../../test-results/revenue-share/requirement/TR219-revenue-share-2026-08-27-doctor-revenue-share-and-payouts.md) |

## What shipped

- A real scope correction, made before any code was written: the phase
  doc's "per-branch" framing assumed a clinician could have different
  rates at different branches simultaneously — checked `Clinicians` in
  `schema.prisma` and confirmed `clinic_id` is a single scalar, not a
  many-to-many relation, via a full-schema grep for a clinician↔clinic
  join table (none exists). Reinterpreted as a rate-resolution
  hierarchy instead, mirroring `resolveServicePrice()`'s own
  most-specific-wins cascade (REQ055/REQ100): clinician-level rule →
  clinic-level rule → org-level default.
- Two new models, `RevenueShareRules` and `Payouts`, with back-relations
  on `ClientOrganizations`/`Clinics`/`Clinicians`.
- `backend/src/revenue-share/` — `resolveRevenueShare()` (pure
  function), `setRevenueShareRule()` (Hard Rule 6 validated,
  find-then-upsert), `computeMonthlyPayouts()` (sums succeeded
  `AppointmentPayments` per clinician, resolves the rate, never
  overwrites an `approved` payout — US-REV-03), `approvePayout()`
  (idempotent).
- Frontend: `manager/revenue-share/index.jsx` — a Clinic-scoped page
  (`SURF-14`) with a share-rules editor, a monthly payout run, per-row
  Approve, and a CSV statement export (`SURF-8`).
- `app.module.ts` registration landed via this session's established
  clean-patch technique, with the working-tree file directly edited
  (not just the index) so `RevenueShareModule` sits alongside the
  parallel session's own uncommitted `TasksModule` addition and the app
  genuinely compiles/runs with both.
- `matrix-coverage.int-spec.ts` — a new, honest `EXEMPT` entry for
  `revenue-share`: unlike prior exemptions on this list, this domain
  DOES have a real id-keyed shape a matrix case could exercise; it is
  deferred to `setup/domain-cases.ts` for a future slice because that
  file was concurrently owned by other in-flight work in this session.
  Cross-org rejection is real and covered directly in
  `revenue-share.service.spec.ts`'s own dedicated tests.

## Deliberately not built

- Actual money movement (bank/UPI/Razorpay Route payout) — this slice
  produces the statement, not a disbursement integration.
- Multi-branch clinician support — the resolver needs zero change if
  that schema extension ever lands.
- Historical share-rule change auditing beyond the payout's own
  `share_percentage_used` snapshot.

## A live, unrelated issue found and fixed mid-slice

The user flagged a live Vite error (`Failed to resolve import
"web-vitals"`) from the running `medibook_frontend` container. Root
cause: the container's own `node_modules` volume was missing
`web-vitals` even though it existed on the host and in `package.json`
(the exact "container node_modules volume goes stale relative to the
host" class this codebase's own CLAUDE.md already documents from
`P1-18`). Fixed with `npm install` inside the container plus a restart
to clear Vite's stale dependency-optimization cache — confirmed via a
direct `curl` of the previously-failing module path returning 200.
Unrelated to this slice's own code; not a regression it introduced.
