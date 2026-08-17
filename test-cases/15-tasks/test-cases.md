# Tasks — Test Cases

**Domain covers:** Internal staff follow-up tasks — `/tasks` (list, filter, create, advance status), independent of any specific patient though usually linked to one. New this increment, built as a standalone frontend mockup (Semble gap-analysis Phase 3 — mirrors Semble's `Task`/`task`/`tasks` object, confirmed as a real object via the live Queries index).
**Grounded in:** `requirements/semble-competitive-gap-analysis-requirements.md` Part 2 (Practice Administration) + Phase 3 roadmap, `frontend/src/mocks/data/tasks.js`, `frontend/src/pages/tasks/index.jsx`, `frontend/src/mocks/store.js` (`getTasks`/`createTask`/`updateTaskStatus`/`deleteTask`), `context/phase1-frontend-missing-features-implementation-plan.md` Phase 3.
**Key schema fact:** **`Tasks` does not exist in `schema.prisma` at all** — this is a wholly new domain with no backend model, unlike most other files in this suite which at least have a partial schema to react against. The fields below (`subject`, `task_type`, `priority`, `status`, `due_date`, `assigned_to_name`, `patient_name`/`patient_id`, `created_at`) are the mock's shape and the concrete starting point for a real `Tasks` model — `assigned_to_name`/`patient_name` are denormalized display strings in the mock and should become proper `assigned_to_user_id`/`patient_id` foreign keys in the real schema, not copied as flat strings.

---

## 1. Unit Test Cases

### TC-TASK-UNIT-001 — Status-advance cycles Open → In Progress → Done and stops at Done
- **Priority:** High
- **Steps:** Call the status-advance function on a task with `status: 'Open'`, then again on the result, then a third time on the `'Done'` result.
- **Expected Result:** `'Open'` → `'In Progress'` → `'Done'` → stays `'Done'` (idempotent at the terminal state, never wraps back to `'Open'`) — matches `pages/tasks/index.jsx`'s `advanceStatus()` (`TASK_STATUSES.indexOf`-based).

### TC-TASK-UNIT-002 — Overdue detection compares `due_date` against today, gated by status
- **Priority:** Medium
- **Steps:** Compute overdue-ness for `{due_date: <yesterday>, status: 'Open'}` and `{due_date: <yesterday>, status: 'Done'}`.
- **Expected Result:** First returns `true`; second returns `false` — a completed task with a past due date is not "overdue," it's just late-but-finished. This distinction matters for any future "overdue tasks" dashboard widget that shouldn't nag about finished work.

### TC-TASK-UNIT-003 — Priority sort order is High → Medium → Low, not alphabetical
- **Priority:** Low
- **Steps:** Sort a list of tasks with mixed priorities by priority.
- **Expected Result:** `High` tasks first, then `Medium`, then `Low` — alphabetical sort would incorrectly produce `High, Low, Medium`.

---

## 2. Backend/API Test Cases

*No backend exists for this domain yet — every case below defines the contract a future `Tasks` resolver must satisfy, the same way `05-patients` §2's newest cases were written ahead of their resolvers.*

### TC-TASK-API-001 — `tasks` query is scoped to the caller's tenant
- **Priority:** Critical
- **Preconditions:** Org 1 and Org 2 each have their own tasks.
- **Steps:** Log in as an Org 1 staff member, call `tasks`.
- **Expected Result:** Org 2's tasks never appear — same `client_org_id`-from-JWT scoping principle as every other domain (`context/backend-hard-rules.md` Rule 1); tasks likely need to inherit scoping through their linked patient/clinic rather than carrying `client_org_id` directly, similar to `Patients`' indirect scoping documented in `05-patients/test-cases.md`.

### TC-TASK-API-002 — `createTask` accepts an optional `patient_id` but does not require one
- **Priority:** Medium
- **Steps:** Call `createTask` with no `patient_id` (e.g. "Order more consent-form paper" — a genuinely patient-unrelated task).
- **Expected Result:** Succeeds — matches Semble's own `Task` object and the mock's `patient_id: null`-tolerant shape; don't force every task into a patient relationship it doesn't have.

### TC-TASK-API-003 — `updateTaskStatus` records who advanced the task and when
- **Priority:** Medium
- **Steps:** Call `updateTaskStatus(id, 'Done')` as a specific user, then query the task's history/audit trail.
- **Expected Result:** The completing user and timestamp are recorded — matters for accountability on tasks like "chase lab result," where knowing *who* marked it done (and whether they actually did the chasing) is the entire point of the feature.

### TC-TASK-API-004 — `assigned_to_user_id` must reference an active user in the same organization
- **Priority:** High
- **Steps:** Call `createTask` with `assigned_to_user_id` set to a user from a different organization.
- **Expected Result:** Rejected — prevents a task silently becoming unassignable/invisible because it points at someone who can never see it.

### TC-TASK-API-005 — Deleting a task is a hard delete (unlike Patients' soft delete)
- **Priority:** Low
- **Steps:** Call `deleteTask(id)`, then query `tasks`.
- **Expected Result:** The task is gone entirely, not soft-deleted — a decision worth making explicit and testing, since it deliberately diverges from `TC-PAT-API-009`'s soft-delete pattern (a stale internal follow-up task has no audit/compliance value once done or abandoned, unlike a patient record).

---

## 3. Functional / E2E Test Cases

### TC-TASK-E2E-001 — Creating a task makes it immediately visible and filterable
- **Priority:** High
- **Steps:** As staff, go to `/tasks`, create a task with a specific subject and `High` priority, then filter the list to `Open` status.
- **Expected Result:** The new task appears in the filtered list without a reload — real-backend equivalent of the mockup's `useMockMutation(MockStore.createTask)` flow.

### TC-TASK-E2E-002 — A staff member only sees tasks assigned to them or their organization, per role
- **Priority:** High
- **Preconditions:** Staff member S1 has 2 tasks assigned to them; staff member S2 (same org) has 3 different tasks.
- **Steps:** Log in as S1, load `/tasks` with no filter applied.
- **Expected Result:** Depending on the product decision made when this ships (org-wide visibility vs. assignee-only) — this test exists specifically to force that decision to be made explicitly and documented, rather than left ambiguous the way the mock (all tasks visible to any logged-in user) currently leaves it.

### TC-TASK-E2E-003 — Advancing a task's status from the UI persists across reload
- **Priority:** Medium
- **Steps:** Click the status-advance button on a task card twice (Open → In Progress → Done), reload the page.
- **Expected Result:** The task still shows `Done` after reload.

---

## 4. Frontend Test Cases

*Component/page-level, run against the existing mock store (`frontend/src/mocks/`) — these should pass today, independent of backend readiness.*

### TC-TASK-FE-001 — Filter ToggleButtonGroup shows only tasks matching the selected status
- **Priority:** Medium
- **Steps:** On `/tasks`, click each status filter (`All`/`Open`/`In Progress`/`Done`) in turn.
- **Expected Result:** The card grid updates to show only matching tasks each time — matches `pages/tasks/index.jsx`'s `statusFilter` state wired into `getTasks({status})`.

### TC-TASK-FE-002 — Create-task dialog validates a required subject via RHF+zod
- **Priority:** High
- **Steps:** Open "New Task", leave Subject blank, attempt to submit.
- **Expected Result:** Inline "Required" error under Subject, submit blocked — matches the `taskSchema` zod validator (`subject: z.string().trim().min(1, 'Required')`), per `context/frontend-hard-rules.md` Rule 2 (RHF+zod mandatory on all forms).

### TC-TASK-FE-003 — Overdue tasks are visually distinguished from on-time ones
- **Priority:** Medium
- **Steps:** Seed a task with a `due_date` in the past and `status: 'Open'`, load `/tasks`.
- **Expected Result:** The card shows an overdue indicator (color/badge) distinct from a normal open task — a task with a past due date and `status: 'Done'` must NOT show this indicator (see `TC-TASK-UNIT-002`).

### TC-TASK-FE-004 — Empty state renders when a filter matches zero tasks
- **Priority:** Low
- **Steps:** Filter to a status with no matching seeded tasks (e.g. filter to `Done` after seeding only `Open`/`In Progress` tasks).
- **Expected Result:** A shared `EmptyState` component renders (not a blank grid) — per `context/frontend-hard-rules.md` Rule 4's EmptyState discipline.

### TC-TASK-FE-005 — Clicking a task's linked patient name navigates to that patient's detail page
- **Priority:** Low
- **Steps:** Click the patient name on a task card that has `patient_id` set.
- **Expected Result:** Navigates to `/patients/:id` for that patient — a task with no `patient_id` (e.g. "Order supplies") shows no clickable patient link at all, not a broken/empty one.
