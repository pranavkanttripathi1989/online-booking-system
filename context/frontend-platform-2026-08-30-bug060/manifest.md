---
id: CTX-frontend-platform-2026-08-30-bug060
type: bug
feature: frontend-platform
created: 2026-08-30
updated: 2026-08-30
status: done
parent: null
related: [BUG060, PLAN235, TP255, TR255]
---

# admin/* pages — 7 integration gaps (2026-08-30)

Third slice of the full-repo frontend/backend integration audit,
scoped to `frontend/src/pages/admin/`.

Found and fixed 7 real bugs: two SEC-18 route/backend `@Auth`
mismatches (`/admin/users*` locking out `manager`, `/admin/departments`
locking out `manager`/`staff`); `admin/users/form.jsx`'s `EditUserPage`
had no not-found guard (DATA-13); `createUser` claimed success on a
real network failure; `role_ids` was sent as `undefined` against a
required backend field (rejecting every zero-role user creation);
`admin/users/index.jsx`'s Permissions Matrix save used a banned
`alert()` and never refetched (DATA-9); a failed status-toggle gave no
user feedback at all.

All other admin pages audited (`ClinicianTypes`, `RoomTypes`,
`Languages`, `EmailTemplates`, `Organizations`, `Roles`, `Plans`,
`Payers`, `RightsRequests`, `Communications`, `Policies`) confirmed
clean.

Commit: `d800f61`. Verification: 5 new tests pass, full admin Jest
suite green (25/25), eslint/build clean.

See `BUG060`/`PLAN235`/`TP255`/`TR255`.
