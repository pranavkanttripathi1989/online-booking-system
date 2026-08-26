---
id: TP201
type: improvement
feature: test-coverage-audit
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN181
related: []
---

# TP201 — Test plan: zod-schema test coverage, round 2

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | Dead code removed cleanly | `patients/index.jsx` after deletion | `MergePatientsDialog` and the rest of the page unaffected; no lint errors; no orphaned imports/state |
| 2 | Roles: real data | Load `admin/Roles` with a real `roles` query result | Real role names/descriptions/grant counts render |
| 3 | Roles: empty state | Load with `roles: []` | "No roles defined yet" |
| 4 | Roles: zod min-length | Type a 1-char role name, submit | "Role name must be at least 2 characters", no mutation call |
| 5 | Roles: no-permissions warning | Open the create form | Warning renders; form is still submittable |
| 6 | Roles: real create round trip | Fill a valid name, grant one permission, submit | `createRole` called with the exact input incl. `permission_ids`; new role visible after refetch |
| 7 | Clinician: real data | Load `CreateClinicianPage` | Real clinics populate the assignment dropdown |
| 8 | Clinician: zod required fields | Submit with all fields empty | "Required" errors render, no mutation call |
| 9 | Clinician: zod email format | Submit with an invalid email | "Invalid email format" |
| 10 | Clinician: zod `.refine()` | Toggle "is a locum", submit with no covering clinician selected | "Select who this locum is covering for" |
| 11 | Clinician: real create round trip | Fill required fields, submit | `createClinician` called with the exact input; success toast renders |
| 12 | Clinician: real failure surfaces | Mutation rejects | The real error message renders; no fake success toast |
| 13 | Lint ratchet | `npm run lint` before/after | 1906 (down from 1909), 0 errors |
| 14 | Build | `npm run build` | Succeeds |
