---
id: REQ009
type: improvement
feature: staff
created: 2026-08-21
updated: 2026-08-21
status: done
parent: null
related: [PLAN018, TP047, TR046]
---

# Staff — real backdatable `since`, create-time `status`, and admin-set password reset

**Why this exists:** resolves `context/open-questions.md` #3, logged during the Priority 1 e2e-coverage pass that wired `staff/{index,new,edit}.jsx` off mocks onto the real backend. Two gaps were found and deliberately left as open questions rather than guessed at:

1. `staff/edit.jsx`'s "Reset Password" field was disabled with an explanatory note — `UpdateStaffInput` had no `password` field, so an admin/manager had no way to reset a staff member's login password.
2. `CreateStaffInput` had no `status`/`since` fields — every staff member was created `active` as of the real row-creation timestamp regardless of what the create form's Status/Start Date controls were set to; those controls were decorative.

**Decisions (this session):**
1. Password reset: admin/manager sets a specific password directly (not an emailed reset link) — simplest, matches the pattern of other admin-driven updates in this app.
2. Backdating `since`/setting a non-active initial `status` at creation **is** a real requirement — wire the controls up rather than removing them.

## Scope

- `UserProfiles` gains a `staff_since` column (nullable `DateTime`), distinct from `created_at`. `since` in the API falls back to `created_at` for any row where `staff_since` was never set (every pre-existing staff row).
- `CreateStaffInput` gains optional `status`/`since` fields (defaulting to `active`/unset — i.e. unchanged default behavior when omitted).
- `UpdateStaffInput` gains an optional `since` field and an optional `password` field (min 8 characters, hashed before storage, only written when actually provided — an absent field must never clear the existing password).
- `staff/new.jsx`'s already-present Status/Start Date controls (previously collected but never sent) now go into the create mutation.
- `staff/edit.jsx`'s Reset Password section becomes a real New Password + Confirm New Password pair, client-side confirmed-match + min-length validated, only sent when non-empty; the Start Date field's edits are now sent too (previously silently dropped there as well).

## Acceptance criteria

- Creating a staff member with a backdated Start Date and a non-Active Status persists both, verified against the DB (not just the UI).
- Editing an existing staff member's Start Date persists the change.
- Setting a New Password from the edit page actually changes the account's login password — verified by logging in with the new password, not just confirming the mutation succeeded.
- Leaving the password fields blank on an otherwise-changed save never clears/alters the existing password.
