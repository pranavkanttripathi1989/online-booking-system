---
id: REQ158
type: requirement
feature: revenue-share
created: 2026-08-27
updated: 2026-08-27
status: done
parent: null
related: [PLAN199, TP219, TR219]
---

# REQ158 — Doctor revenue-share & payouts engine (P2-06)

## Why this slice

`project-plans/phase-plans/02-phase2-win-the-midmarket.md`'s P2-06 slice —
the last of the three slices that document names as "carrying the phase"
(`P2-03`/`P2-05` already shipped). Named chain-ICP need: a multi-branch
chain wants to know, at month end, exactly what each doctor is owed.
No existing feature slug covers doctor compensation — new feature `revenue-share`.

## A real scope correction, found before writing any code

The phase doc's own BE bullet: *"per-clinician, per-branch share rules
(visiting consultants have different rates at different branches — PRD
v1 §2.3.2)."* Checked `Clinicians` in `schema.prisma` — `clinic_id` is a
**single scalar field**, not a many-to-many relation; grepped the whole
schema for a clinician↔clinic join table (`ClinicianClinics`,
`VisitingClinician`, etc.) — none exists. A clinician belongs to exactly
one clinic today. "Per-branch" therefore cannot mean "the same clinician
has a different rate at branch A vs branch B" (a clinician cannot be at
two branches simultaneously in this schema) — reinterpreted as the real,
buildable need it maps to: **a rate-resolution hierarchy**, org-level
default → clinic-level override → clinician-level override, most-specific
wins. This is the exact shape `resolveServicePrice()`
(`backend/src/common/pricing/resolve-price.ts`, REQ055/REQ100) already
uses for branch pricing — reused as the precedent, not reinvented: check
the most specific rule first, fall through to the next level, and a rule
set at a level never gets diluted by a less-specific one.

This still delivers the real product need named in the phase doc — "a
branch manager sets 55% as the branch default; one senior consultant at
that branch negotiated 65%" — without fabricating a multi-branch
clinician relation the schema does not have. If multi-branch clinicians
are ever added as their own schema change, this same three-level
resolver needs no change — the clinician-level rule would just apply
regardless of which of the clinician's branches was billing.

## User stories

**US-REV-01**: As a branch manager, I can set a default revenue-share
percentage for my branch, and override it for a specific doctor who
negotiated a different rate, so the split reflects real contracts.

- Given no rule exists anywhere for a clinician or their clinic
- When a payout is computed for that clinician
- Then no payout row is created for them and the computation reports
  which clinicians were skipped for having no configured rate

**US-REV-02**: As a manager, I can close a real month and get a payout
per doctor, computed from actual succeeded patient payments.

- Given a clinician has 2 succeeded `AppointmentPayments` in the given
  month totalling ₹5,000, and a clinic-level share rule of 60%
- When `computeMonthlyPayouts` runs for that clinic/month
- Then a `Payouts` row is created with `gross_amount = 500000` (paise),
  `share_percentage_used = 60`, `payout_amount = 300000`

**US-REV-03**: As a manager, once I approve a payout it is locked — a
later change to the share rule or a re-run of the computation must never
silently alter an already-approved figure.

- Given a payout is `status: 'approved'`
- When `computeMonthlyPayouts` is run again for the same clinician/
  clinic/period
- Then that specific payout row is left untouched (recomputation only
  ever updates a `pending_approval` row)

**US-REV-04**: As a manager, I can export a CSV statement per doctor for
a closed month (`FRONTEND_RULES` `SURF-8` — CSV export is non-negotiable
on every manager table).

## Deliberately not built

- Actual money movement (bank transfer, UPI payout, Razorpay Route) —
  this slice produces the *statement* (what is owed), not a disbursement
  integration. No payment-out vendor exists in this codebase.
- Multi-branch clinician support — see the scope correction above; the
  resolver is written so it would need zero change if that schema
  extension ever lands.
- Historical share-rule versioning (audit of "the rate changed on
  date X") — `Payouts.share_percentage_used` snapshots the rate at
  computation time, which is what the approval-locking invariant
  (US-REV-03) actually depends on; a full rule-change history log is a
  separate, smaller follow-on if ever needed.

## Acceptance criteria

- Tenant-scoped throughout via `orgScope`/`orgIdForWrite` — never a
  ternary (Hard Rule 6).
- `setRevenueShareRule` validates a caller-supplied `clinic_id`/
  `clinician_id` belongs to the caller's own org before writing
  (Hard Rule 6's `create*` bug class).
- `computeMonthlyPayouts` never overwrites an `approved` payout.
- Frontend: share-rule editor, a "Run Payouts" action for the selected
  clinic/month, a payout list with per-row Approve, and a CSV statement
  export per doctor. Persistent clinic-scope selector (`SURF-14`).
