# Open Questions

Unresolved ambiguities logged per CLAUDE.md Hard Rule 10. Each entry: the question, why it's genuinely ambiguous (not just unimplemented), and current status.

## 6. admin/Communications.jsx's "Global Settings" tab lets an org pick Twilio/Vonage + paste a raw API key — contradicts the fixed-vendor rule

**Status:** ~~Open~~ — **resolved 2026-08-21**, by explicit user direction mid-session (`REQ008`, `PLAN017`): rather than either removing the picker or keeping a single hardcoded MSG91 vendor, the vendor rule itself was revised (CLAUDE.md Hard Rule 9) to make OTP/SMS providers the one deliberate per-org-configurable exception — a standard multi-tenant SaaS pattern, not a "for simplicity" shortcut. Built as a real pluggable provider registry (MSG91/Gupshup/Twilio/AWS SNS), each with its own declared credential fields, encrypted at rest (`common/crypto/secrets.ts`, AES-256-GCM) and never re-exposed to the client. See `PLAN017` for the full design.

CLAUDE.md's India-vendor rule is explicit and non-negotiable: MSG91/Gupshup for OTP SMS, AWS SES `ap-south-1` for email, Razorpay/Stripe for payments — "Don't substitute a different provider 'for simplicity' — build/test against the real one." The mock UI's SMS Settings card has a `<Select>` defaulting to `twilio` (options: Twilio, Vonage — **neither is the project's actual vendor**) plus a raw `API Key` password-type text field with no encryption/secrets-manager story. Building real backend storage for a per-org "bring your own SMS vendor + paste your API key here" flow would directly undermine the fixed-vendor architecture and create a real plaintext-secret-handling liability.

**Decision needed from the user:** remove/hide the SMS Provider + API Key controls entirely (recommended — MSG91/Gupshup is fixed, not org-configurable), or if org-level SMS vendor override is a genuine future requirement, that's a materially different, larger feature (encrypted credential storage, a provider-abstraction layer) that needs its own requirement, not a quiet extension of this one. The Email half of this tab (From Name/From Email/Reply-To/branding-in-emails toggle) has no such conflict — those configure the sender identity used *within* the fixed AWS SES pipeline, not an alternate vendor — and is being built as scoped below.

## 7. admin/Policies.jsx's "Booking Policies" tab has a Cancellation Policy + Late Fee slider that may duplicate the new Cancellation Rules feature

**Status:** Open — found while scoping REQ006's remaining tabs. Not built (these two fields specifically); the tab's other three fields (No-Show Fee, Slot Buffer, Max Reschedules, Retention Period) don't overlap with anything and are being built.

The "Booking Policies" tab's `POLICIES` array has a single flat "Cancellation Policy" (hours) + "Late Cancellation Fee" (₹) pair — conceptually the same shape as one row of the just-shipped Cancellation Rules feature (`hours_before` + `fee_type`/`fee_amount`), which already supports a "global (all clinics)" rule per org. Building a second, parallel single-value cancellation-fee setting risks two competing sources of truth for the same real-world policy.

**Decision needed from the user:** should this tab's two cancellation-related sliders be (a) removed/redirected to the Cancellation Rules tab (recommended — one system, not two), or (b) kept as a distinct "org-wide default used when no explicit rule matches" concept, in which case the cancellation-rules resolver would need an explicit fallback-precedence rule added (not currently modeled). No-Show Fee is a genuinely distinct concept (a different trigger — non-attendance, not cancellation — with no equivalent in `ProductCancellationRules` at all) and isn't blocked by this question.

## 4. settings/index.jsx Profile tab shows DOB/Gender/Address/Avatar fields with no backing schema

**Status:** ~~Open~~ — **resolved 2026-08-21** (`REQ005`, `PLAN016`). DOB/Gender/Bio all shipped as new nullable columns on `UserProfiles`; Address shipped as a new `address_structured` JSONB column matching `Patients`/`ClientOrganizations`' India structured shape (`{line1, line2, city, state, pincode, country}`), not the table's older flat Western columns. Avatar upload shipped as a plain REST endpoint (`POST /account/avatar`, magic-byte MIME validation) storing to local filesystem (`backend/uploads/avatars/`) rather than S3 — no AWS credentials exist anywhere in this environment, so building against a real S3 bucket would mean fabricating the integration; a documented swap-to-S3 path is left in `account.controller.ts`'s header comment for whenever real credentials land.

The mock UI also renders Date of Birth, Gender, a full street/city/state/ZIP address block, and an avatar-upload control. None of these have a backing column on `UserProfiles` (DOB/Gender: no column at all; Address: the table's existing Western-flat address columns — `address_line1/2`, `city`, `postal_code`, `country` — have no `state` field at all, and are the same known Western-vs-India-structured-address inconsistency CLAUDE.md already documents for `Clinics`; Avatar: `avatar_url` exists as a plain string column, but there is zero file-upload infrastructure anywhere in the backend — no multer, no S3 SDK, no GraphQL upload scalar, confirmed by grep). REQ005 itself only explicitly flagged bio/avatar as open; DOB/Gender/full-address were not previously called out.

**Decision needed from the user:** which of these (if any) are real requirements for this release. If yes: DOB/Gender/a `state` column are trivial additive schema changes; Avatar upload is a real, separate feature needing a storage decision (S3 in `ap-south-1`, matching the project's other AWS `ap-south-1` decisions, is the obvious default but hasn't been confirmed). If no: recommend removing the now-clearly-decorative controls from the UI rather than leaving them silently non-functional.

## 5. Notification preferences are real and persisted, but nothing triggers a send to read them

**Status:** ~~Open~~ — **resolved 2026-08-21** (`REQ008`, `PLAN017`). A `NotificationTriggerService.dispatch()` now reads a user's saved preferences (falling back to `notification-preferences.service.ts`'s own `DEFAULTS`) and creates an in-app `Notifications` row / sends SMS via the org's configured provider (see open question #6). Wired into the 4 real domain events with a natural hook: new appointment / appointment cancelled (`appointments.service.ts`), new message (`messages.service.ts`), payment received (`appointment-payments.service.ts`). **Still partially open**: `appointment_reminder` (needs a scheduled job, not an event hook — not built), `new_review` (`ReviewsService` genuinely has no creation/submit path anywhere to hook into — confirmed by grep, a separate pre-existing gap), and `system_announcement` (no admin broadcast UI/mutation exists to originate one) remain unwired, deliberately, not guessed at. Real outbound email sending is still a stub (logs only — no AWS SES credentials in this environment); real SMS sending now works end-to-end once an org configures a real provider.

`NotificationsService.create()` (`backend/src/notifications`) has zero callers anywhere in the codebase outside its own module (confirmed by grep) — no domain (appointments, messages, reviews, payments) currently creates an in-app `Notifications` row when its underlying event happens. There is also no real outbound email/SMS sending infrastructure — the only thing that exists is an OTP-SMS *stub* (`auth.service.ts`'s `requestOtp`, logs `[OTP STUB] Would send...` rather than calling MSG91/Gupshup for real).

**Decision needed from the user:** whether/when to build the actual event→notification trigger pipeline (a real, separate, larger feature spanning every domain that should produce a notification) that would make these preferences meaningful, versus leaving them as inert-but-correct user-configurable settings for now.

## 1. manager/Dashboard.jsx "Recent Transactions" table has no backing data model

**Status:** ~~Open~~ — **resolved 2026-08-20**, by `REQ004`'s Razorpay/`AppointmentPayments` work
(`context/patient-payments-2026-08-20/manifest.md`). `getTransactionsByDate` is now a real resolver in
`backend/src/appointment-payments` — this entry was left marked "Open" after the fact (a stale-index gap,
caught 2026-08-21 during a pending-work audit) even though the code had already moved on. The page's inline
mock-fallback array and its misleading "no backend" console warning were dead code by that point and have now
been removed (`manager/Dashboard.jsx`) — `transactions` just defaults to `[]` like every other real query on
this page.

`manager/Dashboard.jsx`'s `getTransactionsByDate(startDate, endDate, limit, offset)` query expects a list of
per-appointment *patient payment* records — `{id, createdAt, amount, status: succeeded|pending|failed, appointment{clinician{name}, patient{firstName,lastName}, product{name}}}`.

No model in `schema.prisma` backs this. The only payment-shaped model is `PaymentTransactions`, which is explicitly
scoped to `ClientOrganizations` (tenant **SaaS-subscription** billing via Stripe — see CLAUDE.md's India-vendor
rules) and has no relation to `Appointments`/`Patients` at all. Patient-facing payments (Razorpay, per
CLAUDE.md's vendor rules) have no schema, no order/payment-intent tracking, no webhook handling — this is the
not-yet-built Finances/Billing domain (CLAUDE.md Priority 2).

Why this stopped me rather than being a normal "write the resolver" task: building a plausible-looking
`AppointmentPayments`-style table and a resolver against it right now, without real Razorpay sandbox
credentials or a decision on the order/capture/webhook flow, would produce exactly the kind of fabricated,
un-integration-tested "payments" feature the project's Role instructions (production-grade, not prototype)
and Hard Rule 9 (build/test against the real vendor, sandbox credentials) rule out. This needs a deliberate
Finances/Billing slice (schema + Razorpay integration + webhook handling + tests), not a bolt-on to a
dashboard fix.

**Left as-is for now:** the transactions table still reads `data?.getTransactionsByDate` with its existing
mock-array fallback (`manager/Dashboard.jsx`). Per Priority 3 point 3 ("leave the fallback but make it visible
in dev, not silent") this should get a console warning the next time this file is touched, until the real
Finances/Billing domain exists.

**Decision needed from the user:** build the real Finances/Billing/Razorpay domain now as its own dedicated
slice (needs sandbox API keys), or continue deferring it to Priority 2 and leave this one table on mock data
in the meantime.

---

## 2. Products/ProductCategories/ProductSubcategories create paths never populate `clinic_id`, making the existing tenant-scoping filter inert

**Status:** ~~Open~~ — **resolved 2026-08-21**, see `BUG001` (`context/products-2026-08-21/manifest.md`). Went
with the org-column fix (below), not the UI clinic-picker — no product-creation page has ever had one, itself
evidence products were always meant to be an org-wide catalog. Digging deeper than this question originally
described also surfaced a more severe instance of the same bug class: `updateCategory`/`deleteCategory`/
`updateSubcategory`/`deleteSubcategory` had **zero** tenant check at all, not just a broken null-guarded one —
fixed in the same slice.

`backend/src/products/products.service.ts`'s `create()`/`createCategory()`/`createSubcategory()` never set
`clinic_id` on the row they insert — `CreateProductInput`/`CreateProductCategoryInput`/
`CreateProductSubcategoryInput` (`dto/product.input.ts`) don't even have a `clinic_id` field, matching
`manager/products/{create,edit}.jsx`'s real submitted fields exactly (per the DTO's own comment) — the frontend
never sends one either. So every product/category/subcategory created through the live UI ends up with
`clinic_id: null`.

`findAll()`/`categories()`/`subcategories()` scope by `clinic: user.client_org_id ? {client_org_id: user.client_org_id} : undefined`
— a relation filter requiring an attached clinic. A `clinic_id: null` row has no `clinic` relation, so it fails
this filter for every org-scoped caller and becomes invisible in list views to the very org that "created" it.
`findOne()`'s tenant check is `if (user.client_org_id && row.clinic && row.clinic.client_org_id !== user.client_org_id) throw NotFound`
— when `row.clinic` is null (no clinic attached), the check short-circuits to false and is skipped entirely, so
**any authenticated user, from any org, can read a clinic-less product directly via `product(id)`** once they
know or guess its id. `update()`/`remove()` call `findOne()` first, so they inherit the same gap.

Why this isn't the same bug pattern as the already-fixed `createAvailability`/`createSpacerBlock`/`createClinician`
cross-org creates (CLAUDE.md's Hard Rule 6 note): those took a caller-supplied `clinic_id` and simply never
validated it against the caller's org — a classic IDOR with an obvious fix (validate the supplied id). Here
there is no caller-supplied `clinic_id` to validate — the field doesn't exist on the DTO at all, so the fix
isn't "add a check," it's "decide how Products should be tenant-scoped in the first place": either (a) add
`clinic_id` to the create DTOs and require the frontend to supply/select one (a UI change, since none of
`manager/products/{index,create,edit}.jsx` currently expose clinic selection), or (b) give `Products`/
`ProductCategories`/`ProductSubcategories` their own direct `client_org_id` column and stamp it from the JWT at
create time the way `Clinics`/`Availability` etc. do, decoupled from any specific clinic. Both are real schema/
frontend-contract changes, not something to guess at inside a test-writing pass.

**Resolution:** went with the org-column fix — `Products`/`ProductCategories`/`ProductSubcategories` now each
carry their own nullable `client_org_id`, stamped from the JWT at create time in `create()`/`createCategory()`/
`createSubcategory()` (and `services.service.ts`'s `create()`, which writes to the same table — this addendum's
gap closed in the same slice). `findAll`/`findOne`/`categories`/`subcategories` scope by that direct column
instead of the old always-null `clinic` relation filter. Existing rows backfilled from real appointment history
where available (migration `20260821000000_products_client_org_id`), so already-shipped functionality depending
on pre-existing data (`GP Consultation`) didn't silently break. `products.service.spec.ts`/`services.service.spec.ts`
now test the fixed behavior, including new cross-tenant rejection cases for `updateCategory`/`deleteCategory`/
`updateSubcategory`/`deleteSubcategory`, which had no test before because they had no check to test.

---

## 3. Staff module has no password-reset path, and create-time status/since are UI-only

**Status:** Open — found while wiring `staff/{index,new,edit}.jsx` off mocks onto the real backend (Priority 1's
last e2e-coverage gap). Not fixed, since both are contract/product decisions, not bugs with an obvious fix.

`backend/src/staff/dto/staff.input.ts`'s `UpdateStaffInput` has no `password` field, so there is currently no
way for an admin/manager to reset a staff member's login password from `staff/edit.jsx` — the page's "Reset
Password" field has been disabled with an explanatory note rather than silently dropping whatever the admin
types into it. `CreateStaffInput` likewise has no `status`/`since` fields — every staff member is created
`active` as of the real creation timestamp regardless of what the create form's Status/Start Date controls are
set to; the create form now shows a caption ("New staff start Active — change this after creation if needed")
rather than letting those controls imply behavior the backend doesn't actually perform.

Why this needs a decision rather than a fix: adding password-reset requires deciding the actual flow (admin
sets a specific password vs. triggers a reset-link email via the existing AWS SES setup, matching how patient/
clinician accounts might eventually get self-service reset) — not something to guess at inside a wiring pass.
Backdating `since` at creation is a real but narrow product question (does "since" ever need to reflect a
pre-existing employment start date entered after the fact, e.g. onboarding a staff member whose real start date
was last month) — if never needed, the create form's Start Date field should probably be removed entirely
rather than left decorative.

**Decision needed from the user:** (a) whether/how staff password reset should work (admin-set vs. email link),
and (b) whether create-time backdating of `since`/non-active initial `status` is a real requirement — if not,
simplify `staff/new.jsx` by removing those now-inert controls instead of leaving them decorative.

---

## Resolved

### manager/Dashboard.jsx KPIs, charts, and clinic filter (resolved 2026-08-18)

`getClinics` and `getAppointmentStats` (totals, revenue, active patients, cancellation rate, utilization,
trends, time series, status distribution, revenue-by-clinic, top clinicians) are now real, backed by
`backend/src/analytics/` querying `Appointments`/`Clinicians`/`Products`/`Clinics` directly — no per-appointment
payment ledger needed for these, since "revenue" here is defined as the billable value (`Products.price`) of
`completed` appointments, not captured payments. One assumption worth flagging (not a blocker, just a
documented judgment call): "utilization" is defined as a completion-rate proxy
(`completed / total appointments * 100`), not true slot-capacity utilization (which would require walking
`ClinicianAvailability` windows minus `Blocks`) — see the comment in
`backend/src/analytics/entities/analytics.entity.ts`.
