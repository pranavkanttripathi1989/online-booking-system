---
id: TP100
type: improvement
feature: platform-nfr
created: 2026-08-24
updated: 2026-08-24
status: approved
parent: PLAN073
related: [TP092, TP093, TP094, TP095, TP096, TP097, TP098, TP099]
---

# TP100 — Test plan: Phase G+2 frontend completion

Skipping the test-suggestion stage per `CLAUDE.md`'s conditional rule —
every surface here is a routine CRUD/detail page against an already-real,
already-unit-tested backend contract (all 8 domains' resolvers were unit
tested in PLAN065–072), not a first-of-its-kind UX. Going straight to this
approved test plan.

## Cases

| # | Surface | Case | Expected |
|---|---|---|---|
| 1 | Admin Plans | `admin`-role (non-`super_admin`) caller loads `/admin/plans` | A graceful `/super_admin/i`-matched info message, not a raw GraphQL error or blank page |
| 2 | Admin Payers | `manager`-role caller loads `/admin/payers` | Page renders (not a 403), "Payer Directory" and "Branch Empanelment" sections visible |
| 3 | Admin Rights Requests | `manager`-role caller resolves a real, fixture-created pending rights request | Row shows "Data Access"; Resolve dialog accepts notes; "Request updated." confirmation |
| 4 | Manager Pharmacy | `manager` selects a real clinic + drug, receives stock via the form | "Stock received." confirmation; new batch number visible in the ledger table |
| 5 | Manager Reports | `manager` loads `/manager/reports`, schedules a new report | Stat cards ("New Patients", "Repeat Patients") render; "Scheduled report created." confirmation |
| 6 | Settings Integrations | `manager` registers a booking widget origin, a webhook endpoint (with `payment.succeeded` selected), and an API key | Each shown-once secret (webhook signing secret, API key) is visible immediately after creation |
| 7 | Settings Privacy | A patient (fixture-linked to a real `Patients` row for the test's duration) toggles the Communications consent switch and files a data-access rights request | Switch round-trips to the opposite state; confirmation text matches `/access request has been submitted/i` |

## Non-functional

- Responsive at each surface's declared tier per `06-frontend-architecture-
  and-mobile.md` — desktop-dense (Plans, Payers, Rights Requests, Pharmacy,
  Reports, Settings tabs are all staff/admin-facing): verify 1280/1440px,
  no silent truncation.
- Theme tokens only, no hex literals, in every new file (Hard Rule 5).
- Every table wrapped for horizontal scroll (`overflowX: 'auto'` on the raw
  `Box`-table pages, real `TableContainer` on the `settings/index.jsx`
  tabs, matching that file's own established convention).

## Out of scope (deferred, not silently dropped)

- An "Embed Code" admin UI for the booking widget (config only, per
  `PLAN065`'s own deferral).
- The entitlement guard for `REQ032` (`US-PLAN-03`) — plan-builder UI only.
- Automated erasure/correction execution on the Rights Requests page —
  review-and-queue only, by the requirement's own design.
