---
id: PLAN018
type: improvement
feature: staff
created: 2026-08-21
updated: 2026-08-21
status: done
parent: REQ009
related: [TP047, TR046]
---

# Implementation plan — Staff since/status/password-reset (REQ009)

## Backend

- `schema.prisma`: `UserProfiles.staff_since DateTime?`. Hand-written migration `20260821020000_staff_since_and_password_reset` (`prisma migrate deploy`).
- `staff/dto/staff.input.ts`: `CreateStaffInput` gains `status?: string` (`@IsIn(['active','on_leave','inactive'])`) and `since?: string` (`@IsDateString()`); `UpdateStaffInput` gains `since?: string` (same validation) and `password?: string` (`@MinLength(8)`).
- `staff/staff.service.ts`:
  - `toGraphQL()`: `since: p.staff_since ?? p.created_at`.
  - `create()`: `staff_status: input.status ?? 'active'`, `staff_since: input.since ? new Date(input.since) : undefined`.
  - `update()`: adds `staff_since` (same conversion) and `password` (bcrypt-hashed at the service's existing `BCRYPT_COST`, only when `input.password` is truthy — `undefined` otherwise, which Prisma treats as "don't touch this field").

## Frontend

- `staff/new.jsx`: `CREATE_STAFF` mutation call now includes `status: form.status, since: form.since` (both fields already existed in local state, just weren't sent); removed the now-stale "new staff always start Active" caption.
- `staff/edit.jsx`: `UPDATE_STAFF` mutation call now includes `since: form.since` (previously silently dropped despite being editable) and `password: newPassword || undefined`. Replaced the disabled "New Password" placeholder field with a real New Password + Confirm New Password pair (local `newPassword`/`confirmPassword` state, kept out of `form` so a since-cleared password field doesn't itself count as an "unsaved change" against unrelated profile edits); `hasChanges` extended to also fire when `newPassword` is non-empty so Save enables for a password-only edit.

## Verification

- New/extended unit tests in `staff.service.spec.ts`: backdated `since` write, `since` omission leaves the column untouched, password hashed+written when provided, password never cleared when omitted, `create()` status/since defaults and explicit values, `toGraphQL()`'s `since` fallback (both branches).
- Live e2e verification (Playwright, real backend): created a staff member with `since=2023-03-15`, `status=on_leave` — confirmed via direct `psql` that both landed distinct from `created_at`. Edited the same account's password via the real UI, then confirmed the new password actually authenticates (real login attempt, not just a successful mutation response).
- `frontend/e2e/manager-staff.spec.js` extended with a full create→edit→password-reset→login round trip.
