---
id: TP047
type: improvement
feature: staff
created: 2026-08-21
updated: 2026-08-21
status: approved
parent: REQ009
related: [PLAN018]
---

# Test plan — Staff since/status/password-reset (REQ009/PLAN018)

## Unit tests

`backend/src/staff/staff.service.spec.ts` (8 new cases): `update` writes a backdated `staff_since` when provided and leaves it untouched when omitted; `update` hashes and writes a new password when provided (verified via `bcrypt.compare`, not a string-equality check) and never clears the existing password when none is provided; `create` defaults status to `active` and leaves `staff_since` null when neither is given, and honors an explicit `status`/backdated `since`; `toGraphQL`'s `since` fallback — falls back to `created_at` when `staff_since` was never set, uses the real `staff_since` when it was explicitly set.

## Live e2e verification (real backend, Playwright/Chromium)

1. Created a staff member with Start Date `2023-03-15` and Status `On Leave` via the real UI — confirmed via `psql` that `staff_status='on_leave'` and `staff_since='2023-03-15'`, distinct from the row's real `created_at`.
2. Edited the same account's password via the edit page's real New Password/Confirm New Password fields, saved, then logged in as that account with the new password to confirm it actually authenticates (not just that the mutation returned success).
3. Confirmed the backdated `since` and non-default status both render correctly in the staff list and edit-page sidebar.

## Browser e2e (Playwright)

`frontend/e2e/manager-staff.spec.js`, extended: full create (backdated since + On Leave status) → navigate to the new row via a real click → confirm both persisted on the edit page → reset the password → save → log out → log in with the new password, confirming a real redirect away from `/login`.
