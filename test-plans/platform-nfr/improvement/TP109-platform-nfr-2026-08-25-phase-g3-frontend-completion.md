---
id: TP109
type: improvement
feature: platform-nfr
created: 2026-08-25
updated: 2026-08-25
status: approved
parent: PLAN082
related: [TP101, TP102, TP103, TP104, TP105, TP106, TP107, TP108]
---

# TP109 — Test plan: Phase G+3 frontend completion

Skipping the test-suggestion stage per `CLAUDE.md`'s conditional rule — as
with `TP100`, every surface here is real UI against an already-real,
already unit-tested backend contract (all 8 domains' resolvers were unit
tested in `PLAN074`–`081`), not a first-of-its-kind UX. Going straight to
this approved test plan.

## Cases

| # | Surface | Case | Expected |
|---|---|---|---|
| 1 | Checklist | Manager creates a required item; staff checks it off from a real appointment | `callNextInQueue` rejects with "required checklist items incomplete" before completion, succeeds (`status: 'called'`) after |
| 2 | Intake Fields | Manager configures a required field; a booking omitting it is rejected server-side, one supplying it round-trips the value | `createAppointment` throws "Missing required field(s)" without it; `intake_responses` reflects the submitted value with it |
| 3 | Break-glass | A clinician requests emergency access from Settings; a manager revokes it early | Grant appears in `myBreakGlassGrants` as active; `revokeBreakGlassAccess` flips it to inactive with `revoked_at` set |
| 4 | Impersonation | Admin impersonates a target user from `/admin/users`, exits | Impersonation banner appears with the target's name; exiting restores the original admin session (confirmed via a real admin-only route still working after) |
| 5 | Packages | Manager creates a package, purchases it for a patient, staff redeems a sitting on a real appointment | `sittings_remaining` decrements from 5 to 4 after redemption |
| 6 | Branch Overrides | Manager sets an override price for one branch on a master service | Value persists across a page reload |
| 7 | Discount Approval | Staff records a payment with a discount above the org's threshold; a manager approves it | Response carries `pending_approval_id`, not `payment_id`; the request row shows an "Approved" status chip after |
| 8 | Cash Drawer Close | Staff closes the cash drawer for a clinic/date from Appointments | Result shows "Closed. Expected ₹X, counted ₹Y"; the closeout appears in Finances' Cash Drawer tab |
| 9 | Documents | Staff records a real payment, downloads the resulting invoice PDF | Intercepted response is `200` with `content-type: application/pdf` |
| 10 | Messages | Manager composes a department-scoped thread, attaches a file, inserts a canned reply | The thread is visible via the department-oversight filter without the manager needing to be a participant |

## Non-functional

- Responsive per each surface's declared tier (`06-frontend-architecture-
  and-mobile.md`) — all staff/manager-facing (desktop-dense): verified at
  1280/1440px during the live checks each domain's own `PLAN0[74-81]`
  already ran.
- Theme tokens only, no hex literals, in every new/touched file.
- Every new interactive control that has only a `Tooltip` (no visible
  label) gets an explicit `aria-label` — not optional, since MUI's
  `Tooltip` alone leaves the control's accessible name empty.

## Out of scope (deferred, not silently dropped)

- A patient-facing "My Documents"/"My Packages" browse view — no
  patient-safe list query exists yet.
- Re-downloading a historical invoice after a page reload — `Appointment`
  has no `payment_id` field to look one up by.
- An "Embed Code" admin UI, a real admin broadcast UI for
  `system_announcement`, and any other backend-only gap each domain's own
  `PLAN074`–`081` already logged as deferred.
