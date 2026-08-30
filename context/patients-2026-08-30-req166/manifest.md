---
id: CTX-patients-2026-08-30-req166
type: improvement
feature: patients
created: 2026-08-30
updated: 2026-08-30
status: done
parent: —
related: [REQ166, PLAN229, TP249, TR249]
---

# Patient Membership Plans, built for real (2026-08-30)

While fixing `BUG054`–`057` on `patients/detail.jsx`, the user flagged
its membership chip as "not integrated" — analysis confirmed it was
100% local `useState` (zero backend, matching the already-logged
deferred item in `context/open-questions.md #13`). Shown this, the user
chose to build it for real rather than remove or leave it.

Mirrored `Packages`/`PatientPackages` (REQ054) exactly — same module
scaffolding, tenant-scoping helpers, mutation-response convention, and
admin-UI structure — rather than inventing a new pattern. New backend
module `backend/src/memberships/` (`MembershipPlans` catalog,
`PatientMemberships` enrollment, denormalizing price at enroll time, a
DB-level partial unique index guaranteeing one active membership per
patient). Frontend: `patients/detail.jsx`'s existing chip/dialog wired
to real data (same visual shape, real source), plus a new
`manager/memberships/index.jsx` catalog-management page.

## Verification

Backend: 130 unit suites/2075 tests, 9 integration suites/432 tests, all
green (one real finding along the way: the tenancy-matrix's own domain
name must match the literal `backend/src/<folder>` name, not a
product-facing string — first attempt used `'membership-plans'`, fixed
to `'memberships'`). Frontend: 21 new/extended tests across two files,
build/size/lint all clean. **Live-verified end-to-end** against the
real dev stack: created a real plan as a manager, enrolled a real
patient as a clinician, and confirmed both the enrollment and a
subsequent cancellation survive a full page reload — the exact gap the
old mock had (it always reset to "No membership" on reload).

## Documents

- `requirements/patients/improvement/REQ166-*.md`
- `implementation-plans/patients/improvement/PLAN229-*.md`
- `test-plans/patients/improvement/TP249-*.md`
- `test-results/patients/improvement/TR249-*.md`

## Not done this pass, stated not hidden

- No member-discount pricing integration (`resolveServicePrice()` has no
  membership parameter — a genuine, separate open design question).
- No plan versioning, no recurring billing/payment collection — matches
  `REQ166`'s own stated scope cuts.
