# Next 10 Features — Backend Implementation Plan

## Status: all 10 built, migrated, and live-verified via curl (2026-08-17)

`backend/src/{patients,appointments,availability,blocks,users,staff,notifications,reviews,messages}` — a Patients module (feature 0, an unplanned but required prerequisite discovered mid-build: Appointments has a hard, non-nullable FK to Patients, which had zero backend despite a live canonical frontend contract) plus all ten planned domains. Real-time transport added along the way: `graphql-ws` subscriptions (`appointmentUpdated`, `messageReceived`) over a single-process `graphql-subscriptions` PubSub, with JWT auth reused from the existing passport-jwt guard (no separate WS auth path) and the HTTP-shaped throttler guard exempted for subscriptions. Four additive migrations along the way (`AppointmentStatusLogs` + 3 `Appointments` columns; `RoomBlocks` recurrence fields; `UserRoles.code`/`UserProfiles.last_login_at`/`avatar_url`; `UserProfiles.department`/`job_title`/`notes`/`staff_status`) — no destructive schema changes, every existing live contract from Phase 4/4.5 continues to work unchanged.

Not yet done: unit/integration tests per `backend-hard-rules.md` Rule 7 (curl + live-data verification only, no `.spec.ts` files written this pass — same gap flagged for every prior increment), a live Playwright-MCP browser pass against the actual frontend pages (curl-verified against the schema/resolvers directly, not yet clicked through in a browser), and Reviews' `avg_rating`/`total_reviews` computed fields on `Clinician` (flagged as additive/optional in the plan, deferred). Public/patient-self-serve booking (`getClinicians` et al., the camelCase dialect) remains the next natural batch, as planned.


Ten domains, in dependency order, selected from `backend-api-requirements-master-plan.md`'s phase-grouped requirements. Written before any code, per the standing session convention. Every domain below already has a fully-relational Prisma model with zero resolvers (confirmed via `grep -n "^model "` + reading each model's fields directly) — this is resolver-writing against an already-correct schema, not schema design, except Staff (#7) which needs two additive nullable columns.

## Build order and why

1. **Appointments CRUD** — blocks everything else; Calendar, Dashboards, Staff-Appointments, Reviews (`appointment_id` FK), Booking Wizard all read/write through it.
2. **Appointment real-time subscription** — depends on #1 existing; `calendar/index.jsx` already has a dead subscription import waiting for it.
3. **Available Slots resolver** — depends on #1 (conflict-checks against real appointments) + #4 (diffs against real availability); ordered here so #4 can build against a settled `Appointments` shape, resolver itself finalized after #4.
4. **Clinician Availability + Lunch Breaks** — independent of #1-3 except for #3's dependency on it.
5. **Spacer Blocks + Room Blocks** — same table family as #4, same resolver pattern, builds immediately after.
6. **User Management & RBAC** — independent; Staff (#7) depends on it.
7. **Staff** — depends on #6 (reuses `Users`/`UserRoles`/`UserProfiles` resolvers).
8. **Notifications** — independent; formalizes an already-live inline contract.
9. **Reviews** — depends on #1 (`Reviews.appointment_id` is a required FK).
10. **Messages** — independent; last because it's the most isolated (own real-time channel, no other domain reads/writes through it).

Public/patient-self-serve booking (`getClinicians`/`getClinician`/booking flow, camelCase dialect) is **deliberately excluded from this batch** — it's the most isolated domain (separate GraphQL dialect by design decision, doesn't block or get blocked by anything above) and this batch is already ten substantial domains. Tracked as the natural next batch after this one.

---

## Hard-rules recap (full text: `backend-hard-rules.md`) — applies to every feature below without exception

1. `client_org_id` scoping from JWT, never a client argument (indirect via `clinic.client_org_id` for models without their own column — Appointments/Availability/Blocks/Reviews/Notifications all need the indirect join path since none of them carry `client_org_id` directly).
2. Auth is a global guard; new resolvers are protected by default, `@Public()` only where genuinely required (none of these ten need it).
3. Every mutation input is a validated `@InputType()` DTO.
4. `formatError` already strips internals in production (one-time, already done Phase 4) — no action needed unless a new error path bypasses the existing exception filter.
5. Multi-table writes wrapped in `$transaction` — directly relevant to #1 (Appointment + status-log row), #6 (Role + RolePermissions rows), #10 (Thread + Participants + first Message).
6. No dead `.env.example` entries; no `change-me` secrets in non-dev `NODE_ENV`.
7. Unit tests (mocked Prisma) + one real-DB integration test per domain, matching `test-cases/<domain>/test-cases.md`.
8. Timing-safety pattern for anything revealing account existence — relevant to #6/#7 (`inviteUser`-style flows, if built) and #10 (thread participant lookup by email, if that path is added).
9. Contract fidelity — every field/type/argument checked against the actual frontend file, not assumed (see per-feature "matches" notes below, sourced from the four-agent audit).

---

## 1. Appointments CRUD

**Schema:** `Appointments` (exists) — `clinic_id, room_id, clinician_id, patient_id, appointment_date, appointment_time, duration_minutes, status, reason, notes, product_id?, product_variation_id?`.
**Schema gap:** `APPOINTMENT_DETAIL_QUERY` (`graphql/queries.js`) requests `status_logs{id status reason created_at changed_by_user{id name}}` — no such table exists. **New migration:** `AppointmentStatusLogs{id, appointment_id, status, reason?, changed_by_user_id, created_at}`, populated inside every status-changing mutation via `$transaction` (Rule 5).
**Contract (canonical, matches `graphql/queries.js`/`mutations.js` + `appointments/index.jsx`/`detail.jsx`/`edit.jsx` verbatim):**
- `appointments(filters: AppointmentFilters, first: Int, page: Int)` → `{data{...AppointmentFields}, paginatorInfo{count,currentPage,firstItem,hasMorePages,lastItem,lastPage,perPage,total}}`. `AppointmentFilters = {date_from, date_to, status, clinician_id, patient_name}`.
- `appointment(id: ID!)` → `AppointmentFields + status_logs{...}`.
- `createAppointment(input: AppointmentInput!)`, `updateAppointment(id, input: AppointmentUpdateInput!)`, `cancelAppointment(id, reason)`, `completeAppointment(id)`, `markNoShow(id)` — all direct entity return.
- `AppointmentFields` fragment: `id start_datetime end_datetime status notes patient{id full_name} clinician{id full_name} service{id name} room{id name} clinic{id name}` (per `EditPatientPage.jsx`'s embedded shape and `edit.jsx`'s mutation response) — resolve `start_datetime`/`end_datetime` from `appointment_date`+`appointment_time`+`duration_minutes` at the resolver boundary (schema stores date/time/duration separately; GraphQL exposes combined ISO datetimes, same "match the wire contract, not the column layout" pattern as the rupees/paise conversion in Services).
- `service{id name}` resolves from `product_id` (Products where `product_type='service'`) — reuses the existing `Products` relation already on `Appointments`, no new join needed.
**RBAC:** all roles can read their own scoped appointments (patient sees own via `patient_id` matching their `UserProfiles.patient_id`); `manager/admin/super_admin/clinician/staff` can write.
**Bulk cancel** (`appointments/index.jsx`): no batch mutation — frontend already calls `cancelAppointment` once per row; no backend change needed for this.

## 2. Appointment real-time subscription

**Contract:** `appointmentUpdated(clinician_id: ID)` — matches `graphql/subscriptions.js`'s existing (currently unconsumed-by-backend) definition, consumed live by `calendar/index.jsx`'s `client.cache.modify` patch logic (`status, start_datetime, end_datetime, notes`).
**Implementation:** Redis pub/sub (already provisioned per stack decision — `backend/src/redis`), published from inside #1's `updateAppointment`/`cancelAppointment`/`completeAppointment`/`markNoShow` resolvers after the DB write commits. `CALENDAR_REFRESH_SUBSCRIPTION(clinic_id)` (also defined in `subscriptions.js` but **confirmed unused by any current page** — not built in this batch, noted so a future session doesn't rebuild it blind).

## 3. Available Slots resolver

**Contract:** `AVAILABLE_SLOTS_QUERY(clinician_id: ID!, date: Date!, service_id: ID)` → `availableSlots{id start_datetime end_datetime duration_minutes is_available clinician{id full_name}}` (matches `BookingStep3Slot.jsx` verbatim, `fetchPolicy: network-only` on the frontend — never cached, so no resolver-side caching either).
**Logic:** for the given clinician+date, enumerate `ClinicianAvailability` windows active that day (respecting `recurrence_type`/`exclude_*`/`valid_from`/`valid_until`), subtract `LunchBreaks` and `SpacerBlocks` for that clinician/date, subtract existing non-cancelled `Appointments` for that clinician/date, chunk the remainder into `service.duration_minutes`-sized slots (default 30 if no `service_id` given). This is the one genuinely algorithmic resolver in the batch — everything else is CRUD.
**Slot `id` stability note** (flagged in the master plan): the frontend sends both `slot_id` and `start_datetime` back to `createAppointment` — resolve by making slot `id` a deterministic, non-persisted composite (`${clinician_id}-${date}-${start_time}`) rather than a real row; `createAppointment` validates the slot is still free by re-running the same conflict check server-side at write time, never trusting the client-supplied `slot_id` as proof of availability (a client could otherwise submit a stale/fabricated slot id).

## 4. Clinician Availability + Lunch Breaks

**Schema:** `ClinicianAvailability`, `LunchBreaks` (both exist, fully relational to `Clinicians`/`Clinics`/`Rooms`).
**Contract (canonical, matches `manager/Availability.jsx` for the richer admin CRUD, `clinician/Availability.jsx` for the clinician's own thinner self-service mutations — both map onto the same table):**
- `availabilities(search: SearchInput)` → `{clinicianId, clinicId, roomId, dayOfWeek, startTime, endTime, recurrenceType, excludeWeekends, excludeSaturday, excludeSunday, validFrom, validUntil, isActive, clinician{...}, clinic{...}, room{...}}` — response fields **camelCase** (matches the live query exactly, Rule 9), while `createAvailability`/`updateAvailability`'s `input` is **snake_case** (`clinician_id`, `start_time`, ...) — this asymmetry is the frontend's real, already-exercised contract, not a bug to "fix" by unifying casing (see master plan §1).
- `createAvailability`/`updateAvailability`/`deleteAvailability` — `{success, userErrors, availability{id}}` wrapper (matches `manager/Availability.jsx` live).
- `getClinicianAvailability(clinicianId)`, `getLunchBreaks(clinicianId)`, `saveClinicianAvailability(input: ClinicianAvailabilityInput!)`, `deleteClinicianAvailability(id)`, `saveLunchBreak(input: LunchBreakInput!)`, `deleteLunchBreak(id)` — the `clinician/Availability.jsx` self-service surface, thinner input, direct `{id}` return (matches that page exactly), same underlying table.
**`custom_dates`** (schema column exists, `String?`, JSON-array-of-dates) is write-only from the frontend's perspective (`manager/Availability.jsx` never reads it back) — store it, don't surface it in the read query, matching the live gap exactly rather than inventing a read path nothing asked for.

## 5. Spacer Blocks + Room Blocks

**Schema:** `SpacerBlocks`, `RoomBlocks` (both exist).
**Contract (canonical, matches `manager/Blocks.jsx` verbatim):**
- `spacerBlocks(search)`, `roomBlocks(search)` → both `{success, userErrors}`-adjacent read shape per the file (`clinician{id first_name last_name}` snake_case for spacer, mixed casing confirmed live — preserve as-is, Rule 9).
- `createSpacerBlock`/`updateSpacerBlock`/`deleteSpacerBlock`, `createRoomBlock`/`updateRoomBlock`/`deleteRoomBlock` — `{success, userErrors, spacerBlock{id}|roomBlock{id}}` wrapper. Note: the frontend's `updateSpacerBlock`/`updateRoomBlock` reuse the *Create* input type name (`CreateSpacerBlockInput`/`CreateRoomBlockInput`) for updates too — matched as-is, not split into separate Update DTOs, since that's the live contract.
- `getSpacerBlocks(clinicianId, date)` (thinner shape, `{id startTime endTime duration reason}`) also needed for `clinician/Dashboard.jsx` — same table, second read resolver with a narrower selection, same pattern as Availability's two-surfaces-one-table approach in #4.
**Validation carried server-side, not just client-side** (per the master plan's cross-cutting note): end_time > start_time, block_date/end_date not in the past, `recurrence_type='custom'` requires ≥1 `recurrence_days` entry — the frontend already validates these client-side; the backend DTO re-validates independently (never trust client-side-only validation for a write).

## 6. User Management & RBAC

**Schema:** `Users`, `UserProfiles`, `UserRoles`, `Permissions`, `RolePermissions` (all exist).
**Contract (canonical, matches `admin/users/index.jsx` + `admin/users/form.jsx` — the live, rendered pages; `Settings/UserManagement.jsx`'s divergent `inviteUser`/`updateUserRole`/`deactivateUser` contract is the orphaned one per the master plan, not targeted):**
- `getUsers(limit, offset, role, search)` → bare array (no pagination wrapper — matches the live page's `count={-1}` client-side handling exactly, Rule 9 over "should probably paginate this properly").
- `getUser(id)` → `{id firstName lastName email isActive roles{id name code} profile{avatarUrl} clinic{id name}}`.
- `getUserRoles` → `UserRoles` list.
- `getPermissions` → `Permissions` list (`{id action resource description}`).
- `getRolePermissions(roleId)` → `RolePermissions` joined to `Permissions`.
- `updateRolePermissions(roleId, permissionIds: [ID!]!)` → bare scalar/boolean (matches live contract, no object wrapper).
- `getAuditLogs(limit, offset, action, resource)` → reuses the already-scaffolded `AuditLogs` model; `details` stored/returned as a JSON string (matches `JSON.parse(log.details)` on the frontend).
- `createUser(input: UserInput!)`/`updateUser(id, input: UserUpdateInput!)` — canonical direct-return, extended to also expose `firstName`/`lastName`/`isActive` (both the combined `name` and the split fields on one real `User` GraphQL type, per master-plan decision).
- Role CRUD: `createRole`/`updateRole`/`deleteRole(input: {name, description, is_active, permission_ids})` — matches `admin/Roles.jsx`'s `MockStore` shape exactly, becomes this phase's real backing (`is_system` roles reject rename/delete server-side, not just UI-disabled).
**Multi-table write:** role create/update with a `permission_ids` array is a `UserRoles` row + N `RolePermissions` rows in one `$transaction` (Rule 5).

## 7. Staff

**Schema extension (additive migration):** `UserProfiles.department String?`, `UserProfiles.notes String?` — the only new columns in this whole batch. Staff *is* `UserProfiles` scoped to roles outside `{clinician, patient}` (matches `staff/new.jsx`'s role list: Receptionist/Admin/Nurse/Lab Technician/IT Administrator/Billing Specialist/Security Officer/Pharmacist/Coordinator) — no separate `Staff` table, reuses #6's `Users`/`UserRoles` resolvers directly.
**Contract (from-scratch design against `staff/index.jsx`/`edit.jsx`/`new.jsx`'s `MockStore` shape, since there's no existing GraphQL contract to match — same situation Test Results was in):** `staff(search, department, status)` → filtered `getUsers`-equivalent; `createStaff`/`updateStaff(id, input: {name,email,phone,role_id,department,status,address,notes})`; `deactivateStaff(id)` as a dedicated mutation (not overloading `updateUser` with `{status:'inactive'}`, matching the page's explicit "Deactivate" action as its own audit-worthy event, per master-plan Rule-8-adjacent reasoning).
**Password reset on create** (`staff/new.jsx` collects `password`): reuses Auth's existing `bcrypt` hashing path in `UserProfiles.password`, never a separate staff-specific hashing implementation.
**`staff/Dashboard.jsx`/`staff/Appointments.jsx`:** no new resolvers needed beyond #1/#6 — KPIs derive from `getUsers`+`appointments` counts, the appointments table becomes real once #1 exists.

## 8. Notifications

**Schema:** `Notifications` (exists, `NotificationType`/`NotificationPriority` enums already defined).
**Contract (formalizes the already-live inline contract in `notifications/index.jsx` verbatim):**
- `notifications(filter: String)` → `{id title message type priority is_read created_at}`.
- `markNotificationRead(id)`, `markAllNotificationsRead`, `deleteNotification(id)` — all `{success}` only (no `userErrors` — matches the live contract exactly, Rule 9 over "should probably add userErrors for consistency").
**Who creates notifications:** system-generated, from inside other resolvers (e.g. #1's `cancelAppointment` creates a `type: appointment` notification for the affected patient/clinician) — no client-facing `createNotification` mutation, matching the fact the frontend never attempts to create one itself.
**Not built this batch:** a `notificationReceived` subscription — `notifications/index.jsx` currently polls every 30s and that's its real, live behavior; adding a subscription would be a frontend change too (swap `pollInterval` for `useSubscription`), out of scope for a backend-only batch.

## 9. Reviews

**Schema:** `Reviews` (exists, FKs to `Appointments`/`Patients`/`Clinicians`/`Clinics`, all required except `clinician_id`/`clinic_id`).
**Contract (from-scratch design against `reviews/index.jsx`'s `MockStore` shape — `admin/Roles.jsx`-style situation, no prior GraphQL to match):** `reviews(filter: {stars, search})` → `{id patient_name clinician_name stars comment created_at response}` (denormalized `patient_name`/`clinician_name` via the relations, not raw FKs, matching the admin moderation table's display needs); `respondToReview(id, response)` (also used for editing an existing response — single mutation for both, matching the live page); `deleteReview(id)`.
**Clinician-facing aggregate fields** (additive, for `clinicians/index.jsx`/`clinicians/detail.jsx`'s currently-mock `avg_rating`/`total_reviews`): add `avg_rating`/`total_reviews` as computed fields on the `Clinician` GraphQL type (resolved via a `Reviews` aggregate query scoped to `clinician_id`), not stored/denormalized columns — avoids a write-time consistency problem for a read-mostly aggregate.
**No `createReview` mutation** — confirmed nowhere in the app; review creation is out of scope for this batch (master plan flags this as worth confirming with product — likely a post-consultation flow that doesn't exist in the audited frontend yet).

## 10. Messages

**Schema:** `MessageThreads` (tenant-scoped via `client_org_id`), `MessageParticipants`, `Messages` (all exist).
**Contract (from-scratch design against `messages/index.jsx`'s `MockStore` shape):** `threads` → `{id participants{id name role} last_message last_activity unread_count}` (per-user `unread_count` from the caller's own `MessageParticipants` row); `thread(id)` → adds `messages{id from_id from_name body sent_at read}`; `sendMessage(threadId, body)`; `markThreadRead(threadId)` (zeroes the caller's `MessageParticipants.unread_count`); `createThread(participant_ids, first_message)` (`$transaction`: thread + N participant rows + first message row, Rule 5).
**Real-time:** `messageReceived(userId)` subscription — same Redis pub/sub infra as #2, published from `sendMessage` to every other participant in the thread. This directly replaces `MockStore.subscribe`'s fake local pub-sub, which is explicitly not real-time across browser tabs/sessions today.
**Attachments:** `messages/index.jsx` has an "Attach file" button with no handler wired — **not built this batch** (no upload contract exists anywhere in the frontend to match, would be inventing a feature rather than matching one).

---

## What "done" looks like for this batch

Same Definition-of-Done as every prior phase (`backend-hard-rules.md`'s checklist) applied to all ten domains: `client_org_id` scoping via JWT, global-guard auth with no stray `@UseGuards`, validated DTOs, production error formatting (already in place), `$transaction` for the multi-table writes called out above, no dead env vars, unit + integration tests per domain matching `test-cases/`, and every field/type/argument checked against the real frontend file before being declared final. Each domain gets curl-verified first, then a live Playwright-MCP browser pass (console + network checked, per this session's established practice) before being marked live — not just "the watch container compiled with 0 errors."
