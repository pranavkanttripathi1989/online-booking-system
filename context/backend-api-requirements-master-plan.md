# Backend API Requirements — Master Plan (Full Frontend Audit)

Exhaustive, no-file-skipped analysis of the entire frontend — **75 page files + 55 component files**, every one opened and read (not sampled) — to ground the remaining backend work in what the frontend actually calls, not an assumed contract. Four parallel Explore agents did the raw extraction (admin+manager pages, patient/clinician/staff pages, everything else, all shared components); this document synthesizes their findings into decisions. Companion to `frontend-contract-analysis.md` (the original, pre-session contract doc) and `backend-implementation-plan.md` (the original 17-phase plan) — this document supersedes neither, it reconciles them against what got built this session and what's still missing.

## Already built and live (10 modules, this session)

`backend/src/{auth,clinics,rooms,lookups,organizations,languages,email-templates,services,clinicians,test-results}` — see `backend-hard-rules.md`, `phase4-catalog-modules-implementation-plan.md`, `phase4-5-increment3-implementation-plan.md`, `test-results-backend-implementation-plan.md` for full detail on each. Not re-litigated here.

## Schema readiness — the good news

`schema.prisma` already has **36 models**, most of them scaffolded for domains that have *zero* backend resolvers yet: `Appointments`, `Reviews`, `MessageThreads`/`MessageParticipants`/`Messages`, `Notifications`, `Permissions`/`RolePermissions`, `SpacerBlocks`, `RoomBlocks`, `ClinicianAvailability`, `LunchBreaks`, `Patients`, `Users`/`UserProfiles`/`UserRoles`, `ProductCancellationRules`, `PaymentTransactions`, `SubscriptionPlans`. This means most of the remaining work is **resolver-writing against an already-correct schema**, not schema design from scratch — a materially smaller lift than Phase 4/4.5 was.

---

## Cross-cutting findings (read this before building anything else)

### 1. Two competing GraphQL naming dialects across the whole app

- **Canonical/admin dialect** (`graphql/queries.js`/`mutations.js`, most admin+manager pages): **snake_case** — `first_name`, `start_datetime`, `clinician_type`, `client_org_id`.
- **"Patient self-serve" dialect** (`booking/index.jsx`, `video/index.jsx`, `public/doctor-profile.jsx`, `public/landing.jsx` — all inline `gql`, never imported from the canonical files): **camelCase** — `firstName`, `startTime`, `clinicianType`, `getClinician`/`getClinicians`/`getAppointments` query-name prefix convention.
- Several dashboard/scheduling inline queries (`clinician/Dashboard.jsx`, `clinician/Calendar.jsx`, `clinician/Availability.jsx`, `manager/Availability.jsx`, `manager/Dashboard.jsx`) also default to camelCase, independently of the "public" pages.
- **Decision for all new work in this plan:** the canonical snake_case dialect (matching `graphql/queries.js`/`mutations.js` and every module built this session) is authoritative. The camelCase "public" pages are treated as a **separate, deliberately isolated public API surface** (see Phase P8 below) rather than forced to match — reconciling them would require a large, disruptive frontend rewrite across 4+ files with no clear product-requested trigger. Document, don't silently merge.

### 2. Three competing mutation-response conventions

| Pattern | Used by |
|---|---|
| Direct entity return | Everything importing canonical `graphql/mutations.js` (10 modules built this session all follow this) |
| `{success, userErrors}` (no entity) | `admin/ClinicianTypes.jsx`, `Languages.jsx`, `RoomTypes.jsx`, `Policies.jsx` (Cancellation Rules), `manager/Availability.jsx`, `manager/Blocks.jsx` |
| `{success, userErrors, entity}` | `admin/EmailTemplates.jsx`, `admin/Organizations.jsx` (create only), `manager/rooms/index.jsx`, `manager/products/index.jsx` |
| `{success}` only (no userErrors) | `notifications/index.jsx` |

**Decision:** direct-entity-return remains the standard for all *new* canonical modules in this plan (Appointments, Notifications formalized, Reviews, Messages, Staff, User Management). The wrapper pages already built this session (Languages/RoomTypes/etc.) keep their wrapper since it matches their real, live-verified contract — not retrofitted.

### 3. Entity-shape conflicts requiring a pick (not a merge)

| Entity | Conflicting shapes | Decision |
|---|---|---|
| **Room** | Canonical `{name, capacity, clinic_id}` (create/edit/detail pages) vs. inline `{room_number, room_type, clinician_type}` (`manager/rooms/index.jsx`, already live) vs. two more inline variants in `manager/Availability.jsx`/`manager/Blocks.jsx` | **Deferred, not part of this plan's 10 features** — `SUG-P4-001`, still open. Schema already has both `room_number`/`room_type`/`clinician_type` AND `capacity` (Rooms model built Phase 4 has all four), so both live contracts already work against the same table today. Full UI consolidation is a frontend decision, out of scope here. |
| **Product/Service** | Canonical `Service{duration_minutes,price}` (dedicated entity, `services/*.jsx`) vs. canonical `Product{stock_quantity,sku}` flat (`manager/products/create.jsx`/`edit.jsx`) vs. inline catalog-rich `Product{category_id,subcategory_id,product_type}` (`manager/products/index.jsx`) vs. inline Product-as-Service (`manager/services/index.jsx`) | **Deferred** — `SUG-P45-001`, still open. Already-built `Services` module (dedicated entity) and `Products`-table-backed `services`/`clinicians` resolvers coexist without conflict at the DB level (`Products.product_type` enum already supports `service`). Frontend consolidation, not backend blocker. |
| **Availability** | `ClinicianAvailability` (schema, camelCase in `manager/Availability.jsx`'s query, snake_case in its own mutation input) vs. `clinician/Availability.jsx`'s own inline shape (`recurrenceType`, `dayOfWeek` as string) vs. `AvailabilityTemplate`-named fields in `CLINICIAN_DETAIL_QUERY` (`slot_duration_minutes`, `buffer_minutes`, `effective_from`/`effective_to` — **these field names don't exist anywhere in `ClinicianAvailability`**) | **Resolved in this plan (Phase P6)** — one real `ClinicianAvailability` model exists; `CLINICIAN_DETAIL_QUERY`'s `availability_templates{...}` field is renamed/remapped to resolve against the same table via a GraphQL alias (`slot_duration_minutes`→derived from `start_time`/`end_time` diff, `effective_from`/`effective_to`→`valid_from`/`valid_until`). No second table needed. |
| **User** | Canonical `{id,name,email,roles{name}}` (`CREATE_USER_MUTATION`) vs. inline `{id,firstName,lastName,email,isActive,roles{id,name,code}}` (`admin/users/index.jsx`, `users/form.jsx`'s `getUser`) vs. orphaned `Settings/UserManagement.jsx`'s `{inviteUser,updateUserRole,deactivateUser}` | **Resolved in this plan (Phase P9)** — `UserProfiles` already has `first_name`/`last_name`/`is_active`; a `getUsers`/`getUser` resolver is added matching `admin/users/index.jsx`'s real, live-rendered contract (higher-traffic page than the orphaned `UserManagement.jsx`, which is not imported anywhere and is explicitly deprioritized). |

### 4. Orphaned components (real GraphQL contracts, zero live consumers)

Confirmed via grep — **not imported by any page**: `components/Appointments/AppointmentDrawer.jsx`, `components/Patients/PatientDetailDrawer.jsx`, `components/Settings/ClinicProfileForm.jsx`, `components/Settings/RoomsManager.jsx`, `components/Settings/ServicesManager.jsx`, `components/Settings/UserManagement.jsx`. These have real, well-formed GraphQL contracts (some byte-identical to canonical, some diverging in minor ways — e.g. `RoomsManager.jsx`'s `deleteRoom` doesn't exist anywhere canonical). **Not built against in this plan** — building a resolver for a component nothing renders is wasted surface area. Flagged so a future session doesn't rediscover them cold; if any get wired into a real page later, their contracts are already documented (see individual agent transcripts) and mostly reusable as-is.

### 5. Fields the frontend collects but never sends (frontend bugs, not backend gaps)

`clinicians/CreateClinicianPage.jsx`/`EditClinicianPage.jsx` collect `specialties`/`qualifications`/`registration_number`/`is_locum`/`locum_*` but never include them in the real mutation's `input` (only the mock fallback gets them) — `SUG-P45-002`, already documented, still open, not a backend blocker since the fields simply aren't sent yet. `manager/services/create.jsx` collects `category` but drops it before calling `CREATE_SERVICE_MUTATION` — `SUG-P45-003`. `components/Clinicians/ClinicianFormDrawer.jsx` collects `clinician_type_id` but never sends it — newly found this pass, same class of bug, not fixed here (frontend-only, no backend action required).

---

## Domain-by-domain requirements (phase-grouped)

### Phase P5 — Appointments core (highest priority — nearly every other domain reads or writes through this)
**Schema:** `Appointments` model exists, fully relational (clinic/room/clinician/patient/product/product_variation). **Status:** zero resolvers.
**Consumers:** `appointments/{index,detail,edit,create}.jsx`, `calendar/index.jsx`, `patient/{Appointments,Dashboard}.jsx`, `clinician/{Dashboard,Calendar}.jsx`, `staff/Appointments.jsx`, `components/Appointments/AppointmentDrawer.jsx` (orphaned), `components/BookingWizard/*`.
**Contract (canonical, matches `graphql/queries.js`/`mutations.js` verbatim):** `appointments(filters: AppointmentFilters, first, page)` → paginated; `appointment(id)`; `createAppointment`, `updateAppointment`, `cancelAppointment(id,reason)`, `completeAppointment(id)`, `markNoShow(id)`. Needs an `AppointmentStatusLogs`-equivalent — **schema gap**: no such table exists yet despite `APPOINTMENT_DETAIL_QUERY` requesting `status_logs{...}`; smallest fix is a new append-only table populated inside each status-changing resolver via `$transaction` (Rule 5).
**Real-time:** `APPOINTMENT_UPDATED_SUBSCRIPTION(clinician_id)` already defined in `graphql/subscriptions.js`, consumed by `calendar/index.jsx` — needs a real GraphQL subscription resolver (Redis pub/sub, per the stack decision) publishing on every status/time mutation.

### Phase P6 — Availability, Lunch Breaks, Spacer/Room Blocks (scheduling primitives)
**Schema:** `ClinicianAvailability`, `LunchBreaks`, `SpacerBlocks`, `RoomBlocks` all exist, fully relational. **Status:** zero resolvers.
**Consumers:** `clinician/Availability.jsx`, `manager/Availability.jsx`, `manager/Blocks.jsx`, `clinician/Dashboard.jsx` (spacer/lunch read), `clinician/Calendar.jsx`.
**Contract:** build against `manager/Availability.jsx`'s query shape (richer, includes `custom_dates`/exclude-weekday flags matching the schema's own field set most closely) as the canonical one; `clinician/Availability.jsx`'s simpler inline mutations (`saveClinicianAvailability`/`saveLunchBreak`) map onto the same underlying resolvers with a thinner input. `AVAILABLE_SLOTS_QUERY` (used by `BookingStep3Slot.jsx`) derives available slots by diffing `ClinicianAvailability` against existing `Appointments` + `LunchBreaks` + `SpacerBlocks` for a given day — this is the one genuinely complex resolver in this phase (real slot-generation logic, not a straight CRUD wrapper).

### Phase P7 — Notifications (formalize) + Reviews (net new)
**Notifications schema:** exists (`Notifications`, `NotificationType`/`NotificationPriority` enums). **Status:** zero resolvers — `notifications/index.jsx`'s inline contract (`notifications(filter)`, `markNotificationRead`, `markAllNotificationsRead`, `deleteNotification`, all `{success}`-wrapped) becomes the real one; keep the `{success}` wrapper since it's the page's real, exercised contract (Rule 9).
**Reviews schema:** exists (`Reviews`, linked to `Appointments`/`Patients`/`Clinicians`/`Clinics`). **Status:** zero resolvers. **Consumers:** `reviews/index.jsx` (admin moderation, 100% mock today), `clinicians/index.jsx` + `clinicians/detail.jsx` (mock `avg_rating`/`total_reviews`/`recent_reviews` — no real contract exists yet to match, this is a from-scratch design like Test Results was). Build `reviews(filter,search)`, `respondToReview(id,response)`, `deleteReview(id)` matching the admin page; add a `clinician.reviews`/`clinician.avg_rating` computed field for the clinician-facing pages once this exists (additive, doesn't change `ClinicianFields`' required shape).

### Phase P8 — Public/patient-self-serve booking surface (separate camelCase API, deliberately)
**Schema:** reuses `Clinicians`, `ClinicianAvailability`, `Products`, `Appointments`, `PaymentTransactions` — no new models. **Status:** zero resolvers.
**Consumers:** `public/landing.jsx`, `public/doctor-profile.jsx`, `booking/index.jsx`, `video/index.jsx` (notes-update only).
**Contract:** `getClinicians` (search/discovery), `getClinician(id)`, `getClinicianAvailability(clinicianId)`, `getProducts(clinicianId)`, `getAppointments(clinicianId,date)` (slot-conflict check), `createAppointment(input: AppointmentInput!)` (camelCase input, **not** the same `AppointmentInput` type as canonical Phase P5 — a second, deliberately separate GraphQL input type, since the two dialects' field sets genuinely differ), `createPaymentTransaction`. Stripe integration: frontend sends a `paymentMethodId` from `stripe.createPaymentMethod`, never calls `confirmCardPayment` — backend must complete the PaymentIntent confirm/capture server-side (off-session or with a webhook-driven 3DS follow-up); flagged as a real gap, not silently assumed to be handled client-side.

### Phase P9 — User Management / RBAC (reconciles admin/users/* + Roles.jsx + Permissions matrix)
**Schema:** `Users`/`UserProfiles`/`UserRoles`/`Permissions`/`RolePermissions` all exist. **Status:** only Auth's own `login`/`register`/`me` resolvers exist; no list/admin-CRUD resolvers.
**Consumers:** `admin/users/{index,form}.jsx` (real, live-rendered — the canonical target), `admin/Roles.jsx` (100% mock — becomes real via this phase's role CRUD), `Settings/UserManagement.jsx` (orphaned, not targeted).
**Contract:** `getUsers(limit,offset,role,search)`, `getUser(id)`, `getUserRoles`, `getPermissions`, `getRolePermissions(roleId)`, `updateRolePermissions(roleId,permissionIds)`, plus role CRUD (`createRole`/`updateRole`/`deleteRole` — matches `admin/Roles.jsx`'s `MockStore` shape: `{name,description,is_active,is_system,permission_ids}`) reusing `UserRoles`. `createUser`/`updateUser` already partially speced by canonical `graphql/mutations.js` — extend to also satisfy `admin/users/index.jsx`'s `isActive` toggle and `admin/users/form.jsx`'s `firstName`/`lastName` split by adding both representations to the one real `User` GraphQL type (`name` computed as `` `${first_name} ${last_name}` ``, both exposed).

### Phase P10 — Staff (schema needs a small, additive extension)
**Schema gap:** no dedicated `Staff` model. **Decision:** Staff *is* `UserProfiles` scoped to non-clinician, non-patient roles (`Receptionist`, `Admin`, `Nurse`, etc. — matches `staff/new.jsx`'s role list) — reuse the User/UserProfile/UserRoles trio from Phase P9 rather than a new table, adding two nullable columns to `UserProfiles` (`department String?`, `notes String?`) via a small additive migration to cover `staff/new.jsx`/`edit.jsx`'s form fields not otherwise present. Depends on Phase P9 existing first (shares the same `Users`/`UserRoles` resolvers).
**Consumers:** `staff/{index,edit,new}.jsx` (100% `MockStore`-driven today, need full CRUD), `staff/Dashboard.jsx` (KPIs — can mostly derive from `getUsers` + `getAppointments` counts, no new resolver needed beyond P5), `staff/Appointments.jsx` (100% mock table — becomes real once Phase P5 exists, no separate Staff-specific resolver needed here).

### Phase P11 — Messages (real-time, net new)
**Schema:** `MessageThreads`/`MessageParticipants`/`Messages` exist, tenant-scoped via `client_org_id` on `MessageThreads`. **Status:** zero resolvers.
**Consumers:** `messages/index.jsx` (100% `MockStore`, fakes real-time via a local pub-sub).
**Contract (from-scratch design, no existing GraphQL to match — same situation Test Results was in):** `threads`, `thread(id)`, `sendMessage(threadId,body)`, `markThreadRead(threadId)`, `createThread(participantIds,firstMessage)`, plus a `messageReceived(userId)` subscription (Redis pub/sub, same infra pattern as Phase P5's appointment subscription) to genuinely replace the fake `MockStore.subscribe` local pub-sub.

---

## Deliberately excluded from this plan (documented, not silently dropped)

- **Finances/Billing** (`manager/Billing.jsx`, `finances/index.jsx`) — 100% mock, no existing Invoice/Refund contract anywhere to match; needs a product-level spec pass (Invoice vs. `PaymentTransactions` reconciliation flagged above) before backend work starts, same reasoning that blocked Reviews/Messages in earlier phases until now.
- **Analytics** (`analytics/index.jsx`) — 100% mock, materially overlaps `DASHBOARD_QUERY` but needs weekly-granularity/comparison-period dimensions `DASHBOARD_QUERY` doesn't have; a dedicated `analytics`/`report` query family is a larger design task, not a quick add.
- **Settings persistence** (`settings/index.jsx`'s Profile/Password/Sessions/2FA/Notification-prefs tabs, Clinic tab) — explicit `// BACKEND SWAP` TODOs already in the code naming the needed mutations (`UPDATE_PASSWORD`, `DEACTIVATE_ACCOUNT`) but no schema for Sessions/2FA/NotificationPreferences exists yet; org branding sub-feature already has a real mock-store contract worth carrying forward when this is picked up.
- **Communications/Policies non-cancellation tabs** (`admin/Communications.jsx`, `admin/Policies.jsx`'s Booking/Security/GDPR tabs) — pure settings UI, no data model designed yet.
- **Room/Product/Service contract unification** (see table above) — frontend consolidation decision, not a backend blocker; the underlying tables already support every live contract simultaneously.

## Recommended next build order

**Phase P5 (Appointments) → P6 (Availability/Blocks) → P9 (User Management/RBAC) → P7 (Notifications+Reviews) → P10 (Staff) → P11 (Messages) → P8 (Public booking)** — Appointments first because five other domains (Calendar, Dashboards, Staff-Appointments, Reviews via `appointment_id`, Booking Wizard) all read or write through it; User Management before Staff since Staff reuses its resolvers; Public booking last since it's the most isolated (own dialect, own input types, doesn't block anything else). This ordering is the basis for `context/next-10-features-implementation-plan.md`.
