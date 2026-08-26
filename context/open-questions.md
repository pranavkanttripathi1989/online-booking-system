# Open Questions

Unresolved ambiguities logged per CLAUDE.md Hard Rule 10. Each entry: the question, why it's genuinely ambiguous (not just unimplemented), and current status.

## 18. Retention-purge enforcement for `messages` — whose retention clock governs a shared, cross-participant thread?

**Status:** Open, raised 2026-08-26 while scoping `REQ143` (picking up
`REQ073`'s own remaining unenforced data classes after `REQ113` closed
`consents`).

`REQ073`'s own doc named this exact tension: a `MessageThreads` row
"spans two people's own conversation, not one patient's record," and
`createThread()` (`messages.service.ts`) confirmed it structurally, not
just in theory — `client_org_id` is derived from *one* participant (the
caller, or the first org-linked participant found) at create time, with
no check that every `participant_ids` entry belongs to that same org.
A thread with staff from two different orgs, or a patient and a
different org's staff member, is not prevented by anything in the
schema or the service today.

This blocks an automated purge two ways, not one: (1) **whose org's
`RetentionPolicies` row governs** a thread that could span participants
from more than one org — the org derived at creation time, the oldest
participant's org, all participants' orgs independently (each purging
their own "view," which the data model has no concept of)? (2) **there
is no `is_deleted` column on either `Messages` or `MessageThreads` at
all** — confirmed by reading both models directly — so even a
resolved policy-ownership answer would still need a schema change
before any purge could run, and a design decision on granularity
(soft-delete individual `Messages` rows past their own `sent_at`, or
cascade an entire thread once its `last_activity` ages out, silently
deleting one participant's ability to reference a conversation the
other participant's own org might still be within its retention window
for).

**Decision needed from the user:** does a `messages` retention policy
apply per-org (only that org's own... something — there's no per-org
"share" of a shared thread to isolate today), or does this need a
schema change first (e.g. thread-level `client_org_id` becoming
authoritative and multi-org threads disallowed outright, closing
question (1) by design rather than by policy) before retention
enforcement is even well-defined? `clinical_records` remains blocked on
a separate, already-logged legal-review question (`REQ073`'s own doc)
and was not re-investigated this slice — no new information changes
that one.

## 17. What actually distinguishes a "walk-in" from a "booked" appointment, given no such flag exists in the schema?

**Status:** Open, raised 2026-08-26 while building `REQ119`'s hybrid-mode
booked:walk-in interleaving (`REQ017` US-CAL-04 / `REQ019` FR-QUE-02).

Confirmed by grep before building: no `is_walk_in`/`booking_source`
column or equivalent exists anywhere on `Appointments` or `QueueEntries`.
`Patients.acquisition_source` (`REQ029`) is a one-time patient-level
marketing-attribution field, not a per-visit signal, and doesn't apply
to a returning patient's same-day walk-in.

`queue.service.ts#applyWalkInInterleaving()` uses a heuristic instead:
an appointment created on the same calendar day it's scheduled for is
treated as a walk-in, everything else as booked-in-advance. This is
defensible for the common case (front desk registers a walk-in patient
on the spot, same day) but has a real false-positive: a patient who
books online the same morning for a same-day slot is counted as a
walk-in even though they went through the normal booking flow, not the
front desk.

**Decision needed from the user:** is this heuristic good enough to
ship as-is (it's directionally correct and the interleaving is a
soft-ordering nicety, not a hard guarantee), or does the product need a
real `booking_source`/`is_walk_in` flag — set explicitly at
`createAppointment` time (patient-initiated booking) vs. a distinct
future "register walk-in" front-desk flow (which doesn't exist yet
either, per `REQ017`'s own "no hybrid mode" note) — for this to be
trustworthy? If the latter, it's a schema change plus a new front-desk
creation path, not a fix to the interleaving algorithm itself (which is
already correct given whatever classification it's handed).

## 16. Should a patient caller be able to see a dependant's messages, given a dependant has no login of their own?

**Status:** Open, raised 2026-08-25 while closing `REQ018`'s own residue
note on dependant self-scoping (`REQ065`).

`REQ018`'s family/dependant profiles feature (2026-08-24) let one
phone-verified patient login manage multiple `Patients` records — a
dependant `Patients` row is created with `email: ''` and no linked
`UserProfiles` row at all (`patients.service.ts`'s own comment:
"dependants have no login/contact of their own this slice"). Prescriptions
and test results are keyed by `patient_id` directly, so widening their
self-scope to include dependant ids (`REQ065`) was a mechanical,
low-risk extension of the same "own or dependant" definition
`appointments.service.ts` already uses.

Messages are structurally different: `MessageThreads`/`Messages` have no
`patient_id` column at all — access is scoped entirely by
`MessageParticipants.user_id`, a real `UserProfiles.id`. A dependant has
no `UserProfiles` row to be a participant under, so there is no existing
concept of "a dependant's message thread" for a parent to be widened
into seeing. Making this work would require inventing new data model
(e.g. tagging a thread with a `patient_id` the way prescriptions/test
results already are, or a "linked account acts as" participant
substitution) — a real product/schema decision, not a bug fix.

**Decision needed from the user:** is "message a clinic on a dependant's
behalf" an actual near-term requirement? If yes, it needs its own
requirement doc scoping the data model change (most likely: an optional
`patient_id` on `MessageThreads`, set at thread-creation time when the
caller specifies which of their own/dependant profiles the thread is
about, then included in `threads()`'s own scoping alongside the existing
`user_id` check). If no, `REQ018`'s own residue note should be corrected
to say two of its three flagged domains are closed, not three, since the
third was never a like-for-like gap.

## 6. admin/Communications.jsx's "Global Settings" tab lets an org pick Twilio/Vonage + paste a raw API key — contradicts the fixed-vendor rule

**Status:** ~~Open~~ — **resolved 2026-08-21**, by explicit user direction mid-session (`REQ008`, `PLAN017`): rather than either removing the picker or keeping a single hardcoded MSG91 vendor, the vendor rule itself was revised (CLAUDE.md Hard Rule 9) to make OTP/SMS providers the one deliberate per-org-configurable exception — a standard multi-tenant SaaS pattern, not a "for simplicity" shortcut. Built as a real pluggable provider registry (MSG91/Gupshup/Twilio/AWS SNS), each with its own declared credential fields, encrypted at rest (`common/crypto/secrets.ts`, AES-256-GCM) and never re-exposed to the client. See `PLAN017` for the full design.

CLAUDE.md's India-vendor rule is explicit and non-negotiable: MSG91/Gupshup for OTP SMS, AWS SES `ap-south-1` for email, Razorpay/Stripe for payments — "Don't substitute a different provider 'for simplicity' — build/test against the real one." The mock UI's SMS Settings card has a `<Select>` defaulting to `twilio` (options: Twilio, Vonage — **neither is the project's actual vendor**) plus a raw `API Key` password-type text field with no encryption/secrets-manager story. Building real backend storage for a per-org "bring your own SMS vendor + paste your API key here" flow would directly undermine the fixed-vendor architecture and create a real plaintext-secret-handling liability.

**Decision needed from the user:** remove/hide the SMS Provider + API Key controls entirely (recommended — MSG91/Gupshup is fixed, not org-configurable), or if org-level SMS vendor override is a genuine future requirement, that's a materially different, larger feature (encrypted credential storage, a provider-abstraction layer) that needs its own requirement, not a quiet extension of this one. The Email half of this tab (From Name/From Email/Reply-To/branding-in-emails toggle) has no such conflict — those configure the sender identity used *within* the fixed AWS SES pipeline, not an alternate vendor — and is being built as scoped below.

## 7. admin/Policies.jsx's "Booking Policies" tab has a Cancellation Policy + Late Fee slider that may duplicate the new Cancellation Rules feature

**Status:** ~~Open~~ — **resolved 2026-08-21** (`REQ010`, `PLAN019`), by explicit user direction: redirect, don't duplicate. Removed the two sliders entirely; the tab now shows an info banner pointing to the real Cancellation Rules tab (per-clinic or global, priority-ordered) instead. The other four fields (No-Show Fee, Slot Buffer, Max Reschedules, Retention Period) were unaffected — already real and already shipped.

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

## 11. Two staff/clinician concepts were removed when their pages were wired, because nothing backs them

**Status:** Open, raised 2026-08-22 while closing `BUG009`.

Wiring the seven fabricated pages meant deleting UI that had no backend. Two of
those deletions are visible losses of apparent functionality and need a product
decision before they can come back.

**(a) Patient check-in.** ~~Open~~ — **resolved 2026-08-23, by `REQ042`**.
`staff/Dashboard.jsx` had a "Check In" button and a "Checked In" KPI.
`Appointments.status` was `scheduled | completed | cancelled | no_show` — no
`checked_in` state existed anywhere in the schema, so the button wrote
nowhere and the KPI counted a field that did not exist. Both were removed
rather than left as a control that silently does nothing.

The decision (lightweight extra `Appointments.status` values vs. the full
queue/token model the PRD describes) is now made: went lightweight.
`checked_in`/`in_consultation` are additive status values, real
`checkInAppointment`/`startConsultation`/`resetAppointmentJourney`
mutations exist, and `waiting-room/index.jsx` (previously 100% mock) is
wired to them. The full queue/token/wait-time-estimation model `REQ019`
also describes remains unbuilt — that half is still genuinely open, tied to
`REQ017`/`REQ020` per `REQ019`'s own text — but the specific "check-in
button wrote nowhere" gap this entry was about is closed. `staff/Dashboard.jsx`'s
removed button/KPI were not restored in this pass — the waiting-room page
is the canonical place for check-in now; restoring a duplicate control on
the dashboard is a follow-up, not a blocker.

**(b) Patient `status` and `condition`.** `clinician/Patients.jsx` had columns
for a clinical `condition` and an `active`/`new`/`inactive` status, plus filter
chips driven by them. Neither exists in the schema.

`condition` is genuinely absent — the closest column is `Patients.medical_notes`,
free text, which is not the same thing and would be misleading rendered as a
single-value column. `REQ020` (clinical records) is where a real problem list
belongs.

`status` is the more interesting one, because it *could* be derived from data
that already exists: "new" if the patient has one visit, "inactive" if their last
visit is older than N months. It was **not** derived, because N is a
clinical/business rule nobody has set, and picking one would be exactly the
"invent a reasonable contract" that Hard Rule 7 forbids — the number would then
quietly become the product's definition of a lapsed patient.

**Decision needed from the user:** for (a), whether check-in is a status value or
the full `REQ019` queue; for (b), the actual thresholds for new/inactive (and
whether "condition" should wait for `REQ020` or be dropped from the page's design
entirely). Both columns and the check-in control return the moment there is a
real definition to render.

## 12. The public booking wizard asks for and requires a reason-for-visit and DOB that are never stored

**Status:** Open, raised 2026-08-23 while fixing `BUG014`.

`pages/booking/index.jsx`'s step-2 form captures `dateOfBirth`, `reason`
(marked `required`, gates advancing past the step), and `notes` — none of
which exist on `PatientDetailsInput`/`BookPatientAppointmentInput`
(`backend/src/public/dto/public.input.ts`). `public.service.ts:216` already
hardcodes `reason: ''` when creating a new patient's appointment through
this path, regardless of what the resolver receives — there was never a way
for these three fields to reach the database, independent of `BUG014`'s
GraphQL-coercion error. `BUG014` only fixed the crash; it deliberately did
not add these fields to the real schema, since that's new scope (a
`PatientDetailsInput` change, a resolver change, and — for `dateOfBirth`
specifically — a decision on whether an unauthenticated public form should
be allowed to set `Patients.date_of_birth` at all), not a bug-fix-sized
change.

**Decision needed from the user:** is capturing reason-for-visit/DOB/notes
for a brand-new anonymous patient in scope for this release? If yes, this
is a small requirement (extend `PatientDetailsInput`, have
`public.service.ts` consume `reason`/`notes` instead of hardcoding, decide
where `dateOfBirth` writes). If no, the form fields should be removed (or at
minimum the `required` gate on "Reason for visit" dropped) rather than left
silently discarding what the patient is required to type.

## 13. `pages/patients/detail.jsx` is a single page standing in for at least four unbuilt PRD features

**Status:** Open, raised 2026-08-23 while closing `BUG016` (`06-execution-plan.md` P2.1).

Auditing this page to decide whether it could be wired for real found it's
1,000+ lines across 8 tabs, and only 3 (Overview's identity fields,
Appointments, Test Results) have any real backend equivalent at all. The
other 5 — Letters (with a Draft/Pending Review/Approved workflow),
patient membership plans, an intake questionnaire, document upload/storage,
a communication log, structured allergy/diagnosis records, related-account
linking — are all local `useState` only, each already explicitly commented
as tracing to `requirements/semble-competitive-gap-analysis-requirements.md`'s
phased plan, and each is genuinely a separate feature's worth of schema +
resolver + UI work, not a page-wiring bug fix. `patients/detail.jsx`'s
"(demo mode)" toasts already disclose this locally, but the page as a whole
still reads as one coherent, real patient record.

**Decision needed from the user:** which of these 5 sub-features are real,
prioritized requirements for an upcoming release (each would get its own
`REQ*` doc — clinical-records `REQ020` already covers the structured
allergy/diagnosis piece) versus which should be removed from this page
entirely until built for real, rather than left as permanently-local,
never-persisted UI. Until that's decided, the page is intentionally left
as-is beyond its `TableContainer` fix (`BUG015`) and is not claimed as
"wired" anywhere in `project-plans/06-execution-plan.md`.

---

## 10. The telemedicine video call has no captions track, and the PRD commits to accessibility

**Status:** Open, raised 2026-08-22 while fixing F-22.

`pages/video/index.jsx:275` renders a `<video>` element with no `<track>`, which
`jsx-a11y/media-has-caption` flags. Unlike the 11 `no-autofocus` findings beside
it — all of which turned out to be correct focus management the rule cannot see
in context — **this one is a real gap**, not a false positive. A deaf or
hard-of-hearing patient cannot use a video consultation without captions.

It is also not fixable by a lint change. Live captioning needs a real
speech-to-text service on the media stream; there is no `<track>` file to point
at, because the content is generated in real time. The rule has been downgraded
to a warning so it stops blocking CI, with the reasoning recorded in
`eslint.config.js` rather than as a bare suppression.

**Why this is a decision rather than a task:** it is a vendor and cost question,
and it interacts with commitments already made elsewhere. `CLAUDE.md` Hard Rule 5
sets patient-facing accessibility floors and cites the PRD's own §13 commitment;
`REQ026` (telemedicine) and `REQ035` (platform NFRs, which covers accessibility)
are both still `draft`, so neither has scoped this. India-market vendor choice
matters too — the fixed-vendor rule (Hard Rule 9) says nothing about
speech-to-text.

**Decision needed from the user:** (a) accept the gap for now and record it
explicitly as a known accessibility limitation in `REQ026`, (b) scope live
captioning as part of `REQ026` and pick a provider, or (c) ship an interim
mitigation — a text chat sidecar during the call is already partially built
(`messages` domain) and would give a non-hearing patient *a* channel, without
claiming it is captioning.

---

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

**Status:** ~~Open~~ — **resolved 2026-08-21** (`REQ009`, `PLAN018`). Both decided by explicit user direction: (a) admin/manager sets a specific password directly, not an emailed reset link — `UpdateStaffInput` gained a `password` field; (b) backdating `since`/setting a non-Active initial status at creation *is* a real requirement — `CreateStaffInput` gained `status`/`since`, `UserProfiles` gained a `staff_since` column distinct from `created_at`. Live-verified: a backdated/non-Active staff member's fields land correctly in the DB, and an admin-reset password actually authenticates on a real login attempt, not just a successful mutation response.

Original framing, kept for history — found while wiring `staff/{index,new,edit}.jsx` off mocks onto the real backend (Priority 1's
last e2e-coverage gap). Not fixed at the time, since both were contract/product decisions, not bugs with an obvious fix.

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

## 8. Clinician detail page dropped rating/review count/patient count/years of experience/education/reviews — no backing data model

**Status:** Open — found and worked around (not fixed) 2026-08-22 during the Priority 3 mock-removal sweep.

`pages/clinicians/detail.jsx` was previously a single hardcoded `MOCK_CLINICIAN` object ("Dr. Jane Smith") with
zero real GraphQL call at all — every clinician's detail page, for every real clinician, showed the exact same
fabricated profile regardless of the `:id` in the URL. Rewired onto the real `CLINICIAN_DETAIL_QUERY` (the same
query `components/Clinicians/ClinicianProfileDrawer.jsx` already used successfully elsewhere), which fixes the
core identity/contact/schedule/services fields. But several fields the old mock displayed have no real
counterpart anywhere in the schema and were dropped rather than faked:

- `rating` / `review_count` / `recent_reviews` — `reviews.resolver.ts`'s `reviews` query has no clinician-scoped
  filter (`ReviewFilterInput` is `stars`/`search` only, and `ReviewType.clinician_name` is a display string, not
  an id to join on) and is admin/manager-only anyway, so there's no way to fetch "this clinician's reviews" at all
  without a backend change.
- `total_patients` / `appointments_this_month` — no aggregate field on `ClinicianType`; buildable from the real
  `appointments` query filtered by `clinician_id` plus a date range, but that's new aggregation logic, not a
  wiring fix.
- `years_experience` / `education` — no matching column on the `Clinicians` Prisma model at all; entirely a UI-only
  concept that was never real.

**Decision needed from the user:** whether any of these are worth building for real (a `clinician_id` filter on
`ReviewFilterInput` plus a real join is the smallest of the three), or whether the detail page should stay
without them — the current fix (drop them silently rather than fake them) is a safe default either way, not a
placeholder waiting on this decision.

---

## 9. `CLAUDE.md`'s working loop describes a mandatory suggestion-review stage every real-era feature has actually been skipping

**Status:** ~~Open~~ — **resolved 2026-08-22** (`REQ013` Phase D, `PLAN026`), by explicit user direction: made the suggestion stage conditional rather than restoring it as mandatory or removing it outright. `CLAUDE.md`'s working loop step 4 now says a genuinely exploratory/ambiguous feature (new domain, unclear contract, first-of-its-kind UX) still needs a `test-suggestions/` doc reviewed and promoted before a `test-plans/` doc exists; a well-scoped slice against an already-proven pattern (a routine CRUD domain matching an existing contract, a bug fix, a small additive change) may go straight to a test-plan — the human-review gate stays either way, only the intermediate unreviewed-suggestion artifact is optional.

`REQ013`'s Finding 6 found that the mock-era generation (`TP001`–`TP038`) paired a suggestion/plan/result under one ID in a single pass (no real review gate between suggestion and plan), and every real-era feature since (`communications-policies`, `organization-branding`, `patient-payments`, `products`, `security`) has zero `test-suggestions/` entries at all — going straight from a requirement to an already-approved test-plan. `CLAUDE.md`'s documented 5-step loop still described the suggestion stage as a universal step 4, which no longer matched actual practice.

**Resolution:** this document's own decision — no code change, just `CLAUDE.md`'s process description now matching (and codifying, going forward) what disciplined engineering judgment was already doing case-by-case.

---

## 14. `createAppointment`'s room assignment has no availability check at all — a data-integrity backstop was added, the underlying selection logic was not

**Status:** ~~Open~~ — **resolved 2026-08-26** (`REQ124`/`PLAN164`).
Re-reading this entry while scoping the next batch found it wasn't
actually a product-judgment call after all: trying the next active room
before rejecting the booking has no tradeoff to weigh against (unlike,
say, a pricing or UX decision) — it's strictly better with no downside.
Built `findFreeRoom()`/`isRoomFree()` (mirroring `assertSlotFree()`'s
own overlap-detection shape) and wired them into `create()`'s slot-mode
room-assignment branch only; session/hybrid-mode room selection is
unaffected by design (see `REQ124`'s own note). This entry's "needs its
own requirement... touches the slot-search/availability-calculation
logic" framing turned out overstated — the fix stayed entirely inside
`create()`'s existing room-pick, no slot-search changes needed.

**Original status (superseded):** Open, raised 2026-08-23 while closing `BUG017` (booking-concurrency exclusion constraint).

`appointments.service.ts`'s `create()` picks a room via
`rooms.findFirst({clinic_id, is_active, is_deleted})` — no ordering, no
availability check, no regard for whether that room is already booked at
the requested time. It deterministically returns whichever room comes
first for the clinic, every time. Confirmed live: MG Road Clinic has 2
active rooms, so two different clinicians' appointments could both be
silently assigned the same room at overlapping times.

A second `EXCLUDE` constraint (`appointments_no_overlapping_room_booking`,
migration `20260823031500`) was added as a data-integrity backstop — a
genuine room double-booking now fails loudly with the same clean "This
time slot is no longer available" message, matching
`technical-plans/01-phase1-mvp.md` §3.3's own design (it specifies the
clinician and room constraints as a pair, "do this once, for both modes").
This closes the *data-corruption* risk. It does not fix the *actual*
problem: a clinic with 2+ rooms still cannot genuinely double-book a room
by luck, but a legitimate booking attempt for clinician B can now be
rejected outright (told "no longer available") when room A is busy, even
if room B (or C, ...) is sitting idle — `create()` has no logic to try a
different room, only to reject.

**Decision needed from the user:** is real room-availability-aware
assignment (try the next active room if the first candidate is booked at
this time, rather than only ever trying one) in scope as a follow-up? This
is genuinely separate, larger scope than the concurrency-safety fix itself
— it needs its own requirement, and likely touches the slot-search/
availability-calculation logic the booking wizard already relies on, not
just `create()`'s room pick in isolation.

---

## 15. Backend containers run in UTC with no `TZ` set — "today" can disagree with IST by a full day near midnight

**Status:** Open, raised 2026-08-24 while verifying `BUG019`'s e2e fix against the isolated stack.

Verifying `BUG019` (wiring `date_from`/`date_to` into `/calendar` and
`/appointments`) hit a reproducible false failure right at the IST/UTC day
boundary: `docker exec medibook_backend date` and `docker exec
medibook_backend_e2e date` both return UTC (`Sun Aug 23 19:06:32 UTC 2026`
at a moment when the host/IST clock already read `Mon, Aug 24, 00:19`) —
grep confirms no `TZ` is set anywhere in `docker-compose.yml`, for any
backend service, dev or e2e. `backend/prisma/seed-e2e.ts`'s `daysFromNow(0)`
helper computes "today" via a bare `new Date()`, so during the ~5.5-hour
window after IST midnight where UTC hasn't yet rolled over, a fixture
seeded as "today" lands on what IST already considers "yesterday" —
confirmed live: `Anita Sharma`'s fixture appointment was seeded at
`2026-08-23 10:00:00` (backend's UTC "today" at seed time), while the
browser's `dayjs()` — and therefore `BUG019`'s own new date-window
logic — correctly computed "today" as `2026-08-24` (IST, from the host
OS). The fix's logic was not wrong; it correctly excluded a genuinely
not-today appointment. But this is a live illustration of a **real**
latent bug class for a product whose entire market is India: any backend
code that computes "today" server-side (a default date window like this
one, `appointment_reminder` scheduling per open question #5, cancellation
deadlines, GST invoice dating) can silently disagree with what every
patient/clinician/manager's clock and calendar actually says, for up to
5.5 hours every night.

**Decision needed from the user:** (a) set `TZ=Asia/Kolkata` on the backend
containers in `docker-compose.yml` (simplest, makes `new Date()` agree with
users everywhere backend code doesn't explicitly reason about timezones —
but changes what "midnight" means for every existing UTC-anchored
migration/log-timestamp comparison, so needs a quick audit first), or (b)
keep containers in UTC and require any "today"-anchored backend logic to
explicitly convert via a fixed `Asia/Kolkata` offset rather than relying on
the container's local `Date`. Not fixed here — this is infrastructure/
architecture scope well beyond `BUG019`'s frontend date-filter wiring, and
picking wrong could have quiet correctness implications elsewhere in the
codebase this session hasn't audited.

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
