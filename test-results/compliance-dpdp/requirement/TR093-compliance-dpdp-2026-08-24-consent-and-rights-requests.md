---
id: TR093
type: requirement
feature: compliance-dpdp
created: 2026-08-24
updated: 2026-08-24
status: pass
parent: TP094
related: [REQ034, PLAN067]
---

# TR093 — Results: consent capture + data-subject rights requests

Executed 2026-08-24, consolidated verification pass (all 8 slices).

| Case | Result | Evidence |
|---|---|---|
| TC-01 | pass | `rejects a patient caller acting on an arbitrary patient_id` |
| TC-02 | pass | `allows a patient caller acting on their own record` |
| TC-03 | pass | `allows a patient caller acting on a genuine dependant` |
| TC-04 | pass | `records a revoked_at timestamp when granted is false, none when true` |
| TC-05 | pass | `requestDataRights sets an SLA due date in the future, status defaults to pending` |
| TC-06 | pass | `rejects resolving a cross-org request` |
| TC-07 | pass | `stamps resolved_at/resolved_by_user_id and the new status only` |
| TC-08 | pass | New `consent`/`rightsRequests` domain-case — matrix + tenancy suites both green |
| TC-09 | pass | `npx tsc --noEmit` — clean |
| TC-10 | pass | `npx eslint` — 0 errors |
| TC-11 | pass | `npm test` — 73/73 suites, 1053/1053 tests |
| TC-12 | pass | `npm run test:int` — 4/4 suites, 315/315 tests |

## Live verification (2026-08-24, follow-up)

The backend container recovered after a full Docker Desktop restart (see
`TR092`'s environment note). Live-tested against a real patient (Anita
Sharma) as `manager@medibook.dev`:

- `updateConsent` (purpose: `communications`, `granted: true`) — created
  a real `Consents` row with `granted_at` stamped.
- `requestDataRights` (type: `access`) — created a real `RightsRequests`
  row, `status: 'pending'`, `sla_due_at` correctly 30 days out
  (2026-09-23 from a 2026-08-24 request).
- `resolveRightsRequest` (`status: 'completed'`) — stamped `resolved_at`
  and the supplied `notes`, confirming the request-queued-for-review
  design works end-to-end for a real record, not just a mocked one.
