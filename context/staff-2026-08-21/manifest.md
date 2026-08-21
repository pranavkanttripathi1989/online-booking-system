---
feature: staff
date: 2026-08-21
ids: [REQ009, PLAN018, TP047, TR046]
status: done
---

# staff — 2026-08-21

Resolves `context/open-questions.md` #3, logged during Priority 1's staff-domain e2e wiring. Two decisions from the user: admin sets a specific password directly (not an emailed reset link), and backdating `since`/setting a non-Active initial status at creation is a real requirement, not decorative UI to remove.

`UserProfiles` gained `staff_since` (nullable, distinct from `created_at`, falls back to it for every pre-existing row). `CreateStaffInput` gained `status`/`since`; `UpdateStaffInput` gained `since`/`password`. `staff/new.jsx`'s Status/Start Date controls (previously collected but never sent) and `staff/edit.jsx`'s Start Date field (previously silently dropped) now reach the backend; `staff/edit.jsx`'s Reset Password section is real (New Password + Confirm New Password, validated, hashed server-side).

Live-verified: a backdated/non-Active staff member's fields land correctly in the DB (not just the UI), and an admin-reset password actually authenticates on a real login attempt.

## Requirement

- [REQ009 — Staff since/status/password-reset](../../requirements/staff/improvement/REQ009-staff-2026-08-21-since-and-password-reset.md) — done

## Implementation plan

- [PLAN018 — Staff since/status/password-reset](../../implementation-plans/staff/improvement/PLAN018-staff-2026-08-21-since-and-password-reset.md) — done

## Test plan

- [TP047 — Staff since/status/password-reset](../../test-plans/staff/improvement/TP047-staff-2026-08-21-since-and-password-reset.md) — approved

## Test results

- [TR046 — Staff since/status/password-reset](../../test-results/staff/improvement/TR046-staff-2026-08-21-since-and-password-reset.md) — passed
