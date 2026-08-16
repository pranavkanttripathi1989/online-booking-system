# Frontend Contract Analysis

Source: `frontend/src`. Purpose: capture exactly what the backend must satisfy, since the frontend was built ahead of the backend and currently runs **100% against mock data** (see §4). This is the ground truth the backend implementation plan (`backend-implementation-plan.md`) is derived from.

## 1. Pages / routes

**Public**: `landing.jsx` (marketing + clinician search), `doctor-profile.jsx` (`/doctor/:id`).

**Auth**: `login.jsx` (Sign In / Register / Forgot Password / OTP / mobile signup, all in one), `login-legacy.jsx`, `forgot-password.jsx`.

**Errors**: `not-found.jsx` (404), `forbidden.jsx` (403 + `RoleGuard`).

**Shared/protected** (any authenticated role): `dashboard`, `calendar` (FullCalendar + live subscription), `messages`, `settings`, `profile`, `notifications`, `analytics`, `finances`, `reviews`, `test-results`, `video/:id`.

**Appointments**: list, create, edit, detail (status-log timeline); `booking/index.jsx` — multi-step patient booking wizard with Stripe payment.

**Clinicians / Patients**: index, detail, create, edit for each.

**Staff role**: CRUD + `Dashboard.jsx` / `Appointments.jsx` (front-desk views).

**Patient portal**: `Dashboard.jsx`, `Appointments.jsx`, `Profile.jsx`.

**Clinician portal**: `Dashboard.jsx`, `Calendar.jsx`, `Availability.jsx` (templates/lunch breaks), `Patients.jsx` (own patients only).

**Manager** (role-guarded `admin|super_admin|manager`): `Dashboard`, `Availability`, `Blocks` (room/leave blocking), `Billing`, plus `clinics/`, `rooms/`, `services/`, `products/` each with index/create/detail/edit.

**Admin** (role-guarded `admin|super_admin`): `users` (index+form), `Organizations`, `Communications`, `Policies`, `Roles` (RBAC), `ClinicianTypes`, `RoomTypes`, `Languages`, `EmailTemplates`.

## 2. GraphQL operations expected

Two overlapping, **inconsistent** sources exist and must be reconciled into one schema before backend work starts:
- Central: `src/graphql/queries.js` (511 lines), `mutations.js` (319 lines), `subscriptions.js` (70 lines)
- Local: 25+ page/component files define their own colocated `gql` operations that duplicate/diverge from the central ones (e.g. `GetManagerDashboardData` vs `DASHBOARD`)

By domain:

| Domain | Key operations |
|---|---|
| Auth | `LOGIN`, `LOGOUT`, `ME` (`me{...UserFields, clinician}`) |
| Dashboard | `DASHBOARD` (KPI aggregate: today's appointments, clinician/patient counts, monthly revenue, no-show rate, upcoming list, utilisation-by-clinician, volume-by-day, bookings-by-service) + role variants (`GetManagerDashboardData`, `GetClinicianDashboardData`, `GetPatientDashboardData`, `GetAdminData`) |
| Appointments | `APPOINTMENTS` (paginated+filtered), `APPOINTMENT_DETAIL` (+status_logs), `CREATE/UPDATE/CANCEL/RESCHEDULE/COMPLETE_APPOINTMENT`, `MARK_NO_SHOW` |
| Availability | `AVAILABLE_SLOTS(clinician_id, date, service_id)`, `AVAILABILITY_TEMPLATES`, template/lunch-break/spacer-block/room-block CRUD, `CancellationRules` CRUD |
| Clinicians | `CLINICIANS` (paginated, filtered), `CLINICIAN_DETAIL`, create/update/toggle-active, `ClinicianTypes` CRUD |
| Patients | `PATIENTS` (search+paginate), `PATIENT_DETAIL` (+appointments), create/update |
| Clinics / Rooms | full CRUD, `RoomTypes` CRUD |
| Services / Products | full CRUD + categories/subcategories/variations |
| Users / RBAC (admin) | user CRUD, invite/deactivate/toggle, role CRUD + permission assignment, audit logs, organizations CRUD, languages CRUD, email templates |
| Billing | Only `CreatePaymentTransaction` (local, in `booking/index.jsx`) — **no invoice/payment query exists anywhere**; `finances`/`manager/Billing` pages run entirely off mock data |
| Notifications | `GetNotifications`, `MarkNotificationRead`, `MarkAllNotificationsRead`, `DeleteNotification` — local only, not in central files |
| Profile | `GetMyProfile`, `UpdateProfile`, `UploadProfileImage(imageBase64, filename)`, `DeleteProfileImage` |
| Reviews / Messages | **No GraphQL operations exist at all.** Both pages read/write exclusively through `MockStore`. Schema for these two domains does not exist yet anywhere in the frontend contract. |

## 3. Auth flow

`src/context/AuthContext.jsx` is the source of truth (re-exported via `useAuth.js`). Hydrates synchronously from `localStorage`/`sessionStorage` (`medibook_token`, `medibook_user`) before first render. Real JWTs trigger a network-only `ME_QUERY`; `mock_`-prefixed tokens skip the network. `login(token, user, rememberMe)` picks storage based on "remember me". `logout()` clears storage + calls `apolloClient.clearStore()`. `hasRole`/`hasPermission` read `user.roles[].name` / `user.permissions[].name`.

`pages/auth/login.jsx` (1128 lines) does far more than log in: tries `LOGIN_MUTATION`, and **on any failure falls back to a hardcoded `MOCK_USERS` map** (7 demo accounts) with client-side lockout after 5 attempts, password-strength meter, CapsLock detection, an OTP passwordless flow (hardcoded `MOCK_OTP='123456'`), and a mobile-signup flow — **none of the OTP/mobile-signup paths call any backend**, they're `setTimeout` simulations. Registration also never calls a mutation (comment: "replace with real GraphQL mutation when backend ready"). Forgot-password simulates a 60s cooldown against the same known-email list.

Routing guards: `ProtectedRoute` (auth-only), `RoleGuard` (role allow-list, wraps `/manager/*` → `['admin','super_admin','manager']` and `/admin/*` → `['admin','super_admin']`). **Every other protected route (patient appointments, clinician's own patients, etc.) has no client-side ownership check** — fine-grained "patients see only their own data" scoping must be enforced entirely server-side.

## 4. Mocks — the app currently runs 100% offline

`src/mocks/` is a full offline backend simulation: `store.js` (611 lines, in-memory store + pub/sub, seeded from `mocks/data/*`), `useMockData.js` (hooks shaped to mimic Apollo's `useQuery`/`useMutation` return shapes, explicitly commented "BACKEND SWAP: Replace with useQuery/useMutation").

`apollo/client.js` **actively fails fast into the mock path**: a custom `fetch` wrapper aborts any GraphQL request after **2 seconds**, and `errorLink` silently swallows network errors ("Backend offline — using mock data") instead of surfacing them. Reviews/messages/finances/billing bypass Apollo entirely and read `MockStore` directly. Net effect: **there is currently no way to tell, from the UI, whether a real backend is running** — this needs to change (surface real errors) once a backend exists, or QA will keep testing against mocks unknowingly.

## 5. Hooks

Only 4 generic hooks in `src/hooks/` (most data-fetching is inline per-page): `useAuth.js`, `usePagination.js` (generic `{data, pagination, searchTerm, currentPage, totalPages}` wrapper), `useInactivityLogout.js` (15-min idle timer, 60s warning, auto-logout), `usePageTitle.js`.

## 6. Real-time

`subscriptions.js` defines `APPOINTMENT_UPDATED_SUBSCRIPTION(clinician_id)` and `CALENDAR_REFRESH_SUBSCRIPTION(clinic_id)`. Only one is actually used: `calendar/index.jsx` calls `useSubscription(APPOINTMENT_UPDATED_SUBSCRIPTION, ...)`.

**Gap**: `apollo/client.js` never configures a WebSocket link — no `graphql-ws`/`split()` despite `graphql-ws` being a listed dependency. Subscriptions are wired on the frontend but **have no transport**. This must be fixed on both ends.

## 7. Third-party integrations

- **Stripe**: `booking/index.jsx` only — `loadStripe('pk_test_placeholder')`, `<Elements>` + `<CardElement>`, `stripe.createPaymentMethod()` → posts the resulting `paymentMethod.id` via the local `CreatePaymentTransaction` mutation. Backend needs a PaymentIntent/charge-confirmation resolver.
- **Calendar**: `@fullcalendar/*` powers `calendar/index.jsx` and `components/Calendar/CalendarView.jsx` (day/week/list, drag-drop, room-view overlay).
- **File uploads**: no multipart anywhere. `profile/index.jsx` reads via `FileReader`, strips the data-URL prefix, sends **base64 string + filename through a GraphQL mutation** (`UploadProfileImage`). Backend must accept base64 images via GraphQL unless this contract is changed.
- No Pusher/Socket.io found — real-time depends solely on the unwired GraphQL subscription above.

## 8. Roles & authorization

5 roles surface on the login screen: **Admin, Manager, Clinician, Staff, Patient**, plus `super_admin` (no dedicated demo chip; admin user carries both `admin` and `super_admin`). Redirect map (`AuthContext.getPostLoginRedirect`): `super_admin|admin→/dashboard`, `manager→/manager/dashboard`, `clinician→/clinician/dashboard`, `staff→/staff/dashboard`, `patient→/patient/dashboard`.

Enforcement is two-layered client-side (auth gate + role allow-list on `/manager/*` and `/admin/*` only) — **everything else relies entirely on the backend** for row-level scoping (a patient must only ever receive their own appointments/profile; a clinician only their own patients/schedule).

## 9. Note — target market is India

This product is being built for an Indian client. Several parts of the current frontend contract were built generically (Stripe, no GST fields, `address_structured{line1,line2,city,postalCode,country}` in the Prisma schema) and will need India-specific decisions at the backend layer — see "India-specific decisions" in `backend-implementation-plan.md`. The mobile-OTP login flow already stubbed in `login.jsx` is a good sign: OTP-first auth is the dominant pattern for Indian consumer apps, so that UX doesn't need to change, only its backend needs a real SMS provider.
