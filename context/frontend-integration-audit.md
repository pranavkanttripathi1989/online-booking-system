# Frontend Integration Audit — every page + component, checked against real backend source

**Method:** not a repeat of the earlier discovery audit (`backend-api-requirements-master-plan.md`). This time, the complete, authoritative list of every real GraphQL operation that exists today was extracted directly from `backend/src/*/​*.resolver.ts` (73 operations across 20 domains), then 4 parallel agents re-read all 75 pages + 55 components and checked every operation name AND every field/argument a frontend file sends or requests against the actual `entities/*.entity.ts` / `dto/*.input.ts` source for that domain — not against memory, not against what "should" work. File + line number given for every finding below.

**Ground-truth operation list used (still current as of this audit):**
`appointments, appointment, createAppointment, updateAppointment, cancelAppointment, completeAppointment, markNoShow, appointmentUpdated` · `login, register, refresh, logout, me, requestOtp, verifyOtp, forgotPassword, resetPassword` · `availabilities, createAvailability, updateAvailability, deleteAvailability, getClinicianAvailability, getLunchBreaks, getRooms, saveClinicianAvailability, deleteClinicianAvailability, saveLunchBreak, deleteLunchBreak, availableSlots` · `spacerBlocks, roomBlocks, getSpacerBlocks, createSpacerBlock, updateSpacerBlock, deleteSpacerBlock, createRoomBlock, updateRoomBlock, deleteRoomBlock` · `clinicians, clinician, createClinician, updateClinician` · `clinics, clinic, createClinic, updateClinic` · `emailTemplates, updateEmailTemplate` · `languages, createLanguage, updateLanguage, deleteLanguage` · `clinicianTypes, createClinicianType, updateClinicianType, deleteClinicianType, roomTypes, createRoomType, updateRoomType, deleteRoomType` · `threads, thread, sendMessage, markThreadRead, createThread, messageReceived` · `notifications, markNotificationRead, markAllNotificationsRead, deleteNotification` · `organizationsPaginated, createOrganization, updateOrganization, deleteOrganization` · `patients, patient, createPatient, updatePatient` · `getClinicians, getClinician, getProducts, getAppointments, getAppointment, bookPatientAppointment, createPaymentTransaction` · `reviews, respondToReview, deleteReview` · `rooms, room, createRoom, updateRoom` · `services, service, createService, updateService` · `staff, staffMember, createStaff, updateStaff, deactivateStaff` · `testResults, testResult, orderTest` · `getUsers, getUser, getUserRoles, getPermissions, getRolePermissions, updateRolePermissions, getAuditLogs, createUser, updateUser, roles, createRole, updateRole, deleteRole`

**If it's not in that list, it doesn't exist. Every "BROKEN" finding below is a call to something not in that list, or a field/argument that doesn't exist on the real type/DTO for an operation that does.**

---

## 1. Structural finding, affects how to read everything below

`App.jsx` routes through `frontend/src/layouts/AppShell.jsx`. `frontend/src/components/Layout/**` (`Layout.jsx`, `Sidebar.jsx`, `Navbar.jsx`, `TopNav.jsx`, `MobileBottomNav.jsx`, `AppBreadcrumbs.jsx`) plus `components/GlobalSearch.jsx` and `components/NotificationPanel.jsx` are a **complete, self-contained, never-imported dead subtree** — 8 files, confirmed via repo-wide grep, not just `pages/`+`components/`. Any mock/broken pattern inside that subtree affects zero real users. Listed below as ORPHANED, not GAP/BROKEN.

---

## 2. CONFIRMED BROKEN — live, user-facing (will error every time the call fires)

| # | File : line | Calls | Why it fails |
|---|---|---|---|
| 1 | `pages/patient/Dashboard.jsx:22-51` | `getPatientAppointments`, `getNotifications`, `getPatientKpis` | None of the three exist anywhere in the backend |
| 2 | `pages/clinician/Calendar.jsx:30-36` | `getClinicianSchedule` | Doesn't exist anywhere |
| 3 | `pages/clinician/Dashboard.jsx:31-35` | `getAppointments` selects `duration status type patient{...} product{...}` | `PublicAppointmentSlotType` only has `id, startTime, endTime` |
| 4 | `pages/clinician/Dashboard.jsx:39-41` | `getLunchBreaks` selects `duration` | Not a field on `LunchBreakSlotType` |
| 5 | `pages/appointments/edit.jsx:108` | `updateAppointment` sends `end_datetime` | Not a field on `AppointmentUpdateInput` |
| 6 | `pages/booking/index.jsx:154` (values set 259, 397) | `bookPatientAppointment` sends `type: 'inperson'` | DTO only accepts `'in_person' \| 'video' \| 'home_visit'` (`@IsIn`) — every in-person booking fails |
| 7 | `pages/calendar/index.jsx:53,449` | `AVAILABILITIES_QUERY` (Room View only) sends `clinic_id/room_ids/start_date/end_date` args, requests snake_case fields | Real `availabilities` query only takes `search: SearchInput{limit}`; `AvailabilityType` is camelCase, no `excluded_days` |
| 8 | `pages/dashboard/index.jsx` (`graphql/queries.js:111-113`) | `dashboard { ... }` | No `dashboard` domain/resolver exists anywhere |
| 9 | `pages/profile/index.jsx:19,33,46,54` | `myProfile`, `updateProfile`, `uploadProfileImage`, `deleteProfileImage` | None exist anywhere (not in `auth`, not in `users`) |
| 10 | `pages/admin/users/index.jsx:33` | `getUserRoles { id name code description }` | `Role` type has no `code` field — breaks the whole `GetAdminData` query |
| 11 | `pages/admin/users/index.jsx:50-54` | `ToggleUser` → `updateUser(id, input:{isActive}){id isActive}` | `updateUser` returns `User` (`AuthUserType`): only `id, email, name, roles, clinician, client_org_id` — no `isActive` |
| 12 | `pages/admin/Policies.jsx:20-31,89-112,230-304` | `cancellationRules`, `createCancellationRule`, `updateCancellationRule`, `deleteCancellationRule` | None exist anywhere (only unrelated `PublicCancellationRule` type on the Public module) |
| 13 | `pages/manager/Availability.jsx` (`GET_AVAILABILITY_DATA`) | `clinicians(search:{limit:500})`, `clinics(search:{limit:100})` sub-selections | Real `clinicians` takes `clinic_id/is_active/first/page` (no `search`), returns paginated `{data,paginatorInfo}` not a list; real `clinics` takes no args at all. Breaks the whole query, including the otherwise-correct `availabilities` selection |
| 14 | `pages/manager/Availability.jsx` (`GET_ROOMS_FOR_CLINIC`) | `rooms(search:{limit:200}, clinicId:$clinicId){id roomNumber isActive}` | Real arg is `clinic_id` not `clinicId`, no `search` arg, `RoomType` has `name`/`is_active` not `roomNumber`/`isActive` |
| 15 | `pages/manager/Blocks.jsx` (`GET_BLOCKS_DATA`) | Same `clinicians(search)`/`clinics(search)`/`rooms(search)` sub-query issues as #13/#14 | Breaks the whole query even though `spacerBlocks`/`roomBlocks` selections in the same document are correct |
| 16 | `pages/manager/Dashboard.jsx:27-94` | `getClinics`, `getAppointmentStats`, `getTransactionsByDate` | None of the three exist anywhere |
| 17 | `pages/manager/products/index.jsx:20-42` | `products`, `productCategories`, `productSubcategories`, `createProduct`, `updateProduct`, `deleteProduct`, `createProductCategory`/`updateProductCategory`/`deleteProductCategory`, `createProductSubcategory`/`updateProductSubcategory`/`deleteProductSubcategory` | **No product-catalog domain exists in the backend at all** — 12 dead operations |
| 18 | `pages/manager/products/create.jsx:21` | `createProduct` | Doesn't exist |
| 19 | `pages/manager/products/edit.jsx:36,54` | `updateProduct`, `product` | Don't exist |
| 20 | `pages/manager/rooms/index.jsx:19-51` | `roomsPaginated` (no pagination wrapper on real `rooms`); `CreateRoomInput`/`UpdateRoomInput` (real type is `RoomInput`, wrong `{success,userErrors,room}` wrapper vs. direct `RoomType`); `deleteRoom` (doesn't exist at all) | 4 separate breaks in one file |
| 21 | `pages/manager/services/index.jsx:38-106` | `getProductCategories` (doesn't exist); `getProducts(clinicId,categoryId)` (real signature is `getProducts(clinicianId: ID!)`, both args unknown); `saveProduct`, `saveProductVariation`, `saveProductCancellationRule` (none exist) | Whole page's catalog view + all CRUD dead |
| 22 | `components/Clinicians/ClinicianCard.jsx:22,89,188` — **live via `pages/clinicians/index.jsx`** | `toggleClinicianActive` | Doesn't exist (clinicians domain has no toggle mutation) |
| 23 | `components/Clinicians/ClinicianProfileDrawer.jsx:25,55` (root cause `graphql/queries.js:268-288`) — **live via `pages/clinicians/index.jsx`** | `CLINICIAN_DETAIL_QUERY` requests `availability_templates{...}` | No such field on `ClinicianType`; query fails, component silently falls back to the list-row prop object |

## 3. CONFIRMED BROKEN — in orphaned components (zero live consumers, not currently user-facing)

| File : line | Issue |
|---|---|
| `components/Clinicians/ClinicianFormDrawer.jsx:93-109` | `onSubmit` never sends required `email` on `ClinicianInput`. Imported by `pages/clinicians/index.jsx` but never rendered — dead import. |
| `components/Settings/RoomsManager.jsx:42-43,134,190` | `deleteRoom` doesn't exist. Orphaned. |
| `components/Settings/ServicesManager.jsx:49-56,162,166,176` | `deleteService`/`toggleServiceActive` don't exist; `createService` sends `category_id`, not on `ServiceInput`. Orphaned. |
| `components/Settings/UserManagement.jsx:30-58,73,116,119,124` | `users`, `inviteUser`, `updateUserRole`, `deactivateUser` are all fictional. Orphaned. |
| `components/Patients/PatientDetailDrawer.jsx:80` | `updatePatient` called with `{notes}` only; `PatientInput` requires `first_name/last_name/email/phone/date_of_birth`. Orphaned (zero consumers). |

---

## 4. CONFIRMED GAP — real backend exists today, page/component still not wired to it

| File | Real backend that exists |
|---|---|
| `pages/patient/Profile.jsx` (whole file) | `patients` domain |
| `pages/patient/Appointments.jsx` (whole file) | `appointments` domain |
| `pages/patients/detail.jsx` (whole file) | `patients` domain (core identity fields only — extended fields like blood_type/letters/intake have no model) |
| `pages/clinician/Patients.jsx` (whole file) | `patients` domain |
| `pages/clinicians/CreateClinicianPage.jsx:88` | `createClinician` exists and matches — `const useMock = true` hardcodes it dead |
| `pages/clinicians/detail.jsx` (whole file) | `clinicians` domain (`clinician(id)` already used successfully in `EditClinicianPage.jsx`) |
| `pages/staff/index.jsx:57-58` | `staff`, `deactivateStaff` — field shapes match exactly |
| `pages/staff/new.jsx:80` | `createStaff` — `CreateStaffInput` matches the form exactly |
| `pages/staff/edit.jsx:79-80` | `staffMember`, `updateStaff`, `deactivateStaff` |
| `pages/staff/Appointments.jsx` (whole file) | `appointments` domain |
| `pages/staff/Dashboard.jsx` (whole file, partial) | `appointments` domain covers queue data; check-in/activity-feed/room-capacity have no model |
| `pages/messages/index.jsx` (whole file) | `messages` domain — full match (`threads`, `thread`, `sendMessage`, `markThreadRead`, `createThread`) |
| `pages/reviews/index.jsx` (whole file) | `reviews` domain — full match |
| `pages/public/landing.jsx:230-258` | `public.getClinicians` |
| `pages/auth/forgot-password.jsx:24` | `auth.forgotPassword` |
| `pages/auth/login.jsx` `RegisterTab` (763-927) | `auth.register` |
| `pages/auth/login.jsx` `ForgotPasswordTab` (930-1032) | `auth.forgotPassword` |
| `pages/admin/Roles.jsx` (whole file) | `users` domain's `roles`/`createRole`/`updateRole`/`deleteRole` — built this session specifically to match this page's `MockStore` shape |
| `pages/admin/Communications.jsx` (whole file) | Overlaps `email-templates` domain; duplicates the real `admin/EmailTemplates.jsx` |
| `components/shared/NotificationBell.jsx` — **live via `layouts/AppShell.jsx`** | `notifications` domain — full match |

## 5. Correctly still mock — no backend exists for this domain (not a defect)

`pages/finances/index.jsx` · `pages/analytics/index.jsx` · `pages/settings/index.jsx` (all tabs incl. branding) · `pages/onboarding/index.jsx` · `pages/manager/Billing.jsx` · `pages/admin/Policies.jsx` (Booking Policies / Security / GDPR tabs only — Cancellation Rules tab is BROKEN, see §2)

## 6. Orphaned — real, working contract, but zero live consumers (not broken, just unused)

`components/Appointments/AppointmentDrawer.jsx` (fully correct contract) · `components/Settings/ClinicProfileForm.jsx` (fully correct contract) · `components/Settings/NotificationTemplates.jsx` (mock; `email-templates` backend exists but this path is unreachable) · everything under `components/Layout/**` + `GlobalSearch.jsx` + `NotificationPanel.jsx` (see §1)

## 7. Fully real and working, no discrepancies found

`patients/index.jsx`, `patients/CreatePatientPage.jsx`, `patients/EditPatientPage.jsx`, `clinician/Availability.jsx`, `clinicians/index.jsx` (except the two component-level bugs in §2), `clinicians/EditClinicianPage.jsx`, `appointments/index.jsx`, `appointments/detail.jsx` (except Reschedule, which is local-only/cosmetic), `notifications/index.jsx`, `video/index.jsx`, `public/doctor-profile.jsx`, `auth/login.jsx` Sign In tab, `auth/login-legacy.jsx`, `admin/ClinicianTypes.jsx`, `admin/EmailTemplates.jsx`, `admin/Languages.jsx`, `admin/Organizations.jsx`, `admin/RoomTypes.jsx`, `admin/users/form.jsx`, `manager/clinics/{create,detail,edit,index}.jsx`, `manager/rooms/{create,detail,edit}.jsx` (not `index.jsx` — see §2), `manager/services/{create,detail,edit}.jsx` (not `index.jsx` — see §2), all `BookingWizard/*` steps, most `shared/*` presentational components.

---

## Priority order for fixing (highest blast-radius first)

1. **`manager/products/*` + `manager/services/index.jsx` + `manager/rooms/index.jsx`** — three entire manager-facing catalog pages are dead end-to-end. This is the single biggest chunk of broken surface area.
2. **`manager/Availability.jsx` + `manager/Blocks.jsx`** — both fail on the same class of bug (inline `clinicians(search)`/`clinics(search)`/`rooms(search)` sub-queries with wrong args/shape) despite their own core mutations being correct. Fixing the metadata-dropdown queries unblocks both.
3. **`manager/Dashboard.jsx` + `pages/dashboard/index.jsx`** — both call a `dashboard`/manager-stats aggregation layer that was never built (Priority 2 territory, not a quick fix — needs real resolver work, not just a frontend patch).
4. **`admin/users/index.jsx`** (2 bugs) + **`components/Clinicians/{ClinicianCard,ClinicianProfileDrawer}.jsx`** (2 bugs, live) — small, surgical fixes (add `code` to `Role`, add a real toggle path or drop the `isActive` request, add a `toggleClinicianActive` mutation or point the card at `updateClinician`, drop `availability_templates` from the query or add the field).
5. **`admin/Policies.jsx` Cancellation Rules tab** — needs a real backend module (doesn't exist at all).
6. **Priority-3-style rewiring** (§4 table) — `messages`, `reviews`, `staff/*`, `patient`/`patients` pages, `admin/Roles.jsx`, `public/landing.jsx` — no bugs, just needs the mock calls swapped for the real ones that already match.
