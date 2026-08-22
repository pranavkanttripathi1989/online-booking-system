---
id: PP002
type: analysis
feature: project-plans
created: 2026-08-22
updated: 2026-08-22
status: active
parent: PP000
related: [PP001, PP003, PP004, PP006]
---

# 02 — Findings register

33 findings, each with the evidence that establishes it, the blast radius, the
specific fix, and the doc root it should be filed under when promoted through
the `CLAUDE.md` working loop.

Severity: **S1** ship-blocker · **S2** must fix before pilot · **S3** should fix
in the next few slices · **S4** cleanup.

Summary: **4 × S1** (F-01, F-02, F-11, F-13 — all four now fixed) · **12 × S2** · **14 × S3** · **3 × S4**.
33 findings total; F-11 was upgraded from S2 to S1 and F-33 was added after this
register's initial pass, both from the same live investigation (see F-11/`BUG002`).

Verification status: every finding below was confirmed against the code in this
session, and F-01, F-02, F-07, F-11, F-13, F-22, F-24, F-32 and F-33 were
additionally confirmed by executing against the running stack. Nothing here is
inferred from a document.

**Fixed and verified — all 4 S1 findings are now closed:**

- **F-11** (`BUG002`) — clean boot, the real secret in effect, and a successful login round-trip, confirmed after an unrelated Docker Desktop stall was resolved.
- **F-02** (`BUG003`) — the exact bypass reproduced live by planting a forged `mock_` token, then confirmed rejected after the fix; a real password login, a real OTP login, and a rejected wrong-password attempt each separately verified in-browser against the live stack, plus e2e.
- **F-01** (`BUG004`) — the original exploit re-run verbatim: every query that previously leaked now returns empty for a self-registered account, while a real manager and a platform admin retain their correct (database-cross-checked) scope. 641/641 backend tests green.

- **F-13** (`BUG005`) — 0 indexes → 69, derived from the real `where`/`orderBy` clauses in the services rather than from a blanket index-every-FK rule, then proved with `EXPLAIN (ANALYZE, BUFFERS)` against a scratch database seeded to 50,000 appointments: the clinician-schedule query fell from 2,755 shared buffer hits to 34, and its sort node disappeared entirely. One deliberate negative result recorded (the org-scoped join, unchanged — see below).

With F-13 closed, **both hard prerequisites in `technical-plans/00-foundation-hardening.md`
are in place** (the `orgScope` helper from F-01, and the index baseline). The
remaining Phase F items — CI, and the integration-test tenancy matrix — are
process gaps rather than live defects, and they are what stops these four
findings from silently regressing. The rest of the register remains open.

## Security and multi-tenancy

### F-01 · S1 · Public registration mints org-less accounts that read every tenant
**Status: fixed and verified 2026-08-22, see `BUG004`.**
**File:** `backend/src/auth/auth.service.ts:282` (`register`), plus the
`...(user.client_org_id ? {...} : {})` pattern in `clinics.service.ts:17`,
`rooms.service.ts:38`, `services.service.ts:40`, `products.service.ts`,
`clinicians.service.ts`, ~~`languages`, `lookups`~~.

**Correction to this finding's own file list:** `languages` and `lookups`
(`ClinicianTypeModel`/`RoomTypeModel`) were listed above but are **not** part of
this bug. Confirmed against `schema.prisma`: none of those three models has a
`client_org_id` column at all — they are genuinely global, shared reference
taxonomies by design (a clinician-type dropdown is the same list for every
tenant), not tenant-scoped data with a missing filter. Their cross-org
visibility is intended. Fixing them would have been over-correcting.

**Evidence (live, reproducible):** registering through the `@Public() register`
mutation returns a JWT with `"client_org_id":null,"roles":["patient"]`. That
account then successfully read 4 clinics across 3 organisations, the full
service catalogue with prices, all products, all rooms, all 8 clinicians, and
both lookup tables. Full transcript in `03-security-and-tenancy-audit.md §2`.

**Why it happens:** the "an org-less caller sees everything" convention was
written for platform admins. `register` now creates org-less accounts on demand,
so an attacker only needs one HTTP call to satisfy that branch. The catalogue
queries additionally carry no `@Auth()`, so role gating does not save them.

**Fix (implemented in `BUG004`):** stopped inferring privilege from the *absence*
of an org. New shared module `backend/src/common/scoping/tenant-scope.ts`
provides `isPlatformOperator()` (an explicit `['admin','super_admin']` role
allow-list), `orgScope()` / `orgScopeVia()` for list queries, and
`isSameOrg()` / `assertSameOrg()` for single-record paths. A non-operator with
no org now gets an impossible sentinel filter (`'__no_org__'`), never `{}` —
the same fail-closed sentinel pattern `selfScope()` already used correctly.
Migrated all five affected domains (`clinics`, `rooms`, `services`, `products`,
`clinicians`) to the shared helper, so a sixth domain cannot reintroduce the
ternary.

One additional defect surfaced during migration and was fixed in the same
change: `clinicians.service.ts`'s `create()` read the new record back with a
synthetic `{ client_org_id: null } as JwtPayload` — a workaround that only
functioned *because* the old check short-circuited for a null org. With
`findOne()` now fail-closed, that bypass would have rejected the read
immediately after a successful create.

**Verification:** the original exploit was re-run verbatim against the live
backend — a fresh `register()` still returns `client_org_id: null`, and every
query that previously leaked now returns empty (`clinics`, `services`,
`products`, `rooms` → `[]`; `clinicians` → `total: 0`). Legitimate access
confirmed unaffected and cross-checked against the database: a real manager
still sees their own org's 3 clinics and 8 clinicians; `admin` still sees all 4
clinics across both orgs. Backend suite 641/641 green, including new
regression tests in each migrated domain's spec plus a dedicated
`tenant-scope.spec.ts` (17 cases).

**Not covered by this fix (separate, already-logged findings):**
`patients.service.ts` (F-04/F-05) and `test-results.service.ts` (F-08) share the
*pattern* but have distinct root causes — `createPatient` has no caller context
at all, independent of `orgScope`. Kept separate to keep this change reviewable.

**File as:** bug, feature `security`.

### F-02 · S1 · Client-side authentication and role bypass in the frontend
**Status: fixed and verified 2026-08-22, see `BUG003`.**
**File:** `frontend/src/context/AuthContext.jsx:78–112` (`getInitialState`),
`:143–156` (`meError` handler), `frontend/src/pages/auth/login.jsx:48–53`,
`:151`, `:666–690`.

**Evidence:** any token starting with `mock_` is accepted as authenticated with
the roles taken verbatim from `localStorage.medibook_user`; a failed `ME_QUERY`
falls back to the cached user instead of logging out; the login page renders five
demo accounts with plaintext passwords as one-click buttons with no environment
guard; the offline fallback accepts `"password"` or `"demo"` as a universal
password; the OTP path accepts a hardcoded `123456` and prints it in the hint.

**Blast radius:** full client-side escalation to `super_admin` in two console
commands, and every admin surface becomes reachable. The backend still rejects
the API calls, so no server data leaks by this route alone — but combined with
the surviving mock fallbacks the UI renders fabricated data that looks real, and
combined with F-18 it looks *complete*.

**Fix (implemented in `BUG003`):** deleted the `mock_` branch and the
`MOCK_USERS` login fallback outright; `ME_QUERY` failure now always logs out;
demo-account chips gated behind `import.meta.env.DEV` (confirmed live —
`loginAs()`, shared by 29 of 31 e2e specs, still works unchanged since
Playwright runs against the dev server); `MOCK_OTP` removed and the OTP path
rewired to the real `requestOtp`/`verifyOtp` resolvers, including a real UI
correction (phone-only, matching `RequestOtpInput`'s actual shape, not "email
or phone" as the mock version guessed). `login-legacy.jsx` — a second,
less-visible instance of the same bypass at `/login-legacy` — was deleted
entirely rather than fixed in place, confirmed unreferenced elsewhere.
Reproduced the exact bypass live before fixing (planting a forged `mock_`
token + `super_admin` role directly in `localStorage`) and confirmed it is
rejected after the fix, with the session cleared and the user redirected to
`/login`.

**File as:** bug, feature `security`.

### F-03 · S2 · The RBAC permission matrix is stored but never enforced
**File:** `backend/src/common/guards/roles.guard.ts` (role names only),
`backend/src/users/users.service.ts:76–102`,
`frontend/src/context/AuthContext.jsx:236` (`hasPermission`).

**Evidence:** `RolePermissions` is read in exactly four places, all of which
either display the matrix or write to it. No authorisation path consults it.
`hasPermission()` reads `user.permissions`, which the auth payload never
populates, so it always returns `false`.

**Blast radius:** assigning or revoking a permission changes nothing. `REQ003`'s
headline competitive gap against Semble — custom roles and access groups — is
non-functional, and an operator who relies on the matrix to restrict a
receptionist is not actually restricting anything.

**Fix:** two slices. (1) Resolve the caller's effective permission set at login
(or in a small Redis-cached lookup) and include it in the JWT/`me` payload, so
`hasPermission()` becomes meaningful in the UI. (2) Add a
`@RequirePermission('appointment:delete')` decorator and a
`PermissionsGuard` after `RolesGuard`, then migrate resolvers domain by domain,
keeping `@Auth()` as the coarse gate. Do not attempt a big-bang switch.

**File as:** requirement, feature `security` (parent `REQ003`).

### F-04 · S2 · `createPatient` has no caller context and no org linkage
**File:** `backend/src/patients/patients.resolver.ts:37–41`,
`backend/src/patients/patients.service.ts:149`.

**Evidence:** the mutation signature is `createPatient(@Args('input') input)` —
no `@CurrentUser()`. `Patients` has no `client_org_id` column, and
`orgScope()` deliberately treats a patient with zero appointments as visible to
any authenticated staff caller (`{ appointments: { none: {} } }`).

**Blast radius:** every patient created through the UI is, until their first
appointment exists, readable by staff in *any* organisation — including
`date_of_birth` and `medical_notes`. This is the same bug class as
Hard Rule 6's documented `create*` family, in the most PHI-sensitive domain.

**Fix:** add `client_org_id` to `Patients` (nullable, backfilled from
appointment history exactly as `BUG001` did for `Products`), stamp it from the
JWT at create time, and scope `findAll`/`findOne` on the direct column instead
of the relation fallback. Drop the `appointments: { none: {} }` escape hatch once
the column exists.

**File as:** bug, feature `patients`.

### F-05 · S2 · `Patient.appointments` resolve-field is unscoped
**File:** `backend/src/patients/patients.resolver.ts:28–35`,
`patients.service.ts:122`.

**Evidence:** `appointments(@Parent() patient, first, page)` takes no
`@CurrentUser()`, and the service filters only on
`{ patient_id, is_deleted: false }`.

**Blast radius:** a patient treated at two organisations exposes their entire
cross-org appointment history — clinician names, services, clinics — to a
clinician at either one, once that clinician can resolve the parent `Patient`
(which the treated-by check permits).

**Fix:** thread `@CurrentUser()` through and apply the same `orgScope` +
`selfScope` the top-level `appointments` query already uses.

**File as:** bug, feature `patients`.

### F-06 · S2 · Admin mutations in the RBAC domain take no caller context
**File:** `backend/src/users/users.resolver.ts` /
`users.service.ts:92,104,165,240,265`.

**Evidence:** `updateRolePermissions(roleId, permissionIds)`,
`updateUser(id, input)`, `updateRole(id, input)`, `deleteRole(id)` and
`getAuditLogs(...)` all omit `@CurrentUser()`. `updateRole` and `deleteRole`
guard `is_system`; **`updateRolePermissions` does not** — it can strip every
permission from a system role. `permissionIds` is passed straight to
`createMany` with no existence check, so a bad id surfaces as a raw Prisma
foreign-key error.

**Blast radius:** these are `admin`/`super_admin`-only, and those roles are
platform-wide by design, so this is not a tenant break. It is a
privilege-integrity and self-lockout problem: an admin can render the `admin`
role permissionless, and audit logs are readable across every tenant with no
scoping at all.

**Fix:** add the `is_system` guard to `updateRolePermissions`; validate
`permissionIds` against `Permissions` before the write; thread `@CurrentUser()`
through all five and scope `getAuditLogs` by org for any non-platform caller.

**File as:** bug, feature `security`.

### F-07 · S3 · Razorpay order creation is anonymous
**File:** `backend/src/appointment-payments/appointment-payments.resolver.ts:20`.

**Evidence:** `createRazorpayOrder(appointmentId)` and
`verifyRazorpayPayment(input)` are both `@Public()`. Probed anonymously with a
nil UUID: returns `Appointment not found` — so it does reach the service.

**Blast radius:** anyone who learns an appointment UUID (a shared link, a
forwarded email, their own id) can create real Razorpay orders against it
without authenticating, generating unbounded `pending` rows and real vendor-side
order objects. Signature verification makes theft of funds implausible;
this is abuse and reconciliation noise, not fraud.

**Fix:** require authentication on `createRazorpayOrder` and check that the
caller is the appointment's patient or org staff. Keep `verifyRazorpayPayment`
public only if the checkout callback genuinely cannot carry a token — and if so,
rate-limit it per order id. Separately, add the missing webhook endpoint so a
succeeded-but-uncallback'd payment reconciles instead of sitting `pending`.

**File as:** bug, feature `patient-payments`.

### F-08 · S3 · `orderTest` never sets `patient_id`, so patient self-scoping is dead code
**File:** `backend/src/test-results/test-results.service.ts:71–88`.

**Evidence:** `orderTest` writes `patient_name` (free text) but not
`patient_id`, while `findAll`/`findOne` scope a patient caller on
`patient_id: user.patient_id ?? '__no_patient_link__'`.

**Blast radius:** a patient can never see their own lab results (the filter
never matches), and the results themselves carry no patient linkage, so no
per-patient access control is possible at all. The security fix that was
written is inert.

**Fix:** add a patient picker to the order dialog (or resolve `patient_id` from
the selected patient) and require it on `OrderTestInput`. This is the open
design question already logged for `TestResults`; it needs closing, because the
current state silently defeats a control that tests assert.

**File as:** bug, feature `test-results`.

### F-09 · S3 · JWTs in `localStorage`, no CSP
**File:** `frontend/src/apollo/client.js:26`, `AuthContext.jsx`.

**Blast radius:** any XSS yields a 15-minute access token and, via the cached
user, a persistent client-side session. There is no Content-Security-Policy
header anywhere in the stack.

**Fix:** medium-term, move the refresh token to an `HttpOnly; Secure; SameSite`
cookie and keep only the short-lived access token in memory. Immediately: add a
CSP and the standard security headers (`helmet` on the Nest app), which is a
one-file change and materially reduces the exposure.

**File as:** improvement, feature `security`.

### F-10 · S3 · Audit log records too little to be an audit trail
**File:** `backend/src/common/interceptors/audit-log.interceptor.ts:70–96`.

**Evidence:** the `AuditLogs` model has `resource_id` and a `details` JSON
column. The interceptor writes only `user_id`, `action`, `resource`,
`ip_address`, and writes the **same row** whether the mutation succeeded or
threw — its own comment says a rejected attempt is worth logging, but the record
cannot distinguish the two.

**Blast radius:** "someone performed create Appointment" with no target id, no
outcome, no before/after. That is not sufficient for a clinical or DPDP-era
audit obligation, and it is not sufficient to investigate an incident.

**Fix:** capture the mutation's result id into `resource_id`, record
`outcome: success|failure` plus the error class, put the sanitised input
arguments (PHI-redacted) in `details`, and add `user_agent`. Index
`(user_id, created_at)` and `(resource, resource_id)` — currently neither exists.

**File as:** improvement, feature `security`.

### F-11 · S1 (upgraded from S2 — confirmed live) · Default signing secrets in `docker-compose.yml`
**File:** `docker-compose.yml:33–36`; root `.env.example`.

**Status: fixed and verified 2026-08-22, see `BUG002`.** This was not a conditional risk —
it was confirmed to be the actual state of the running dev backend at the
time of discovery: `docker exec medibook_backend sh -c 'echo $JWT_ACCESS_SECRET'`
returned the literal string `change-me-in-production`, and `backend/.env`
itself contained the same placeholder rather than a real secret. Severity
raised from S2 to S1 to reflect that this was live-exploitable, not merely
possible under a misconfiguration. See `BUG002` for the full fix (real
generated secrets, a root `.env`, and `docker-compose.yml`'s fallback removed)
and a related discovery made during the same investigation: `SETTINGS_ENCRYPTION_KEY`,
`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `OTP_TTL_SECONDS` — all present
with real values in `backend/.env` — were not reaching the running container
at all, meaning every `encrypt()`/`decrypt()` call (TOTP secrets, SMS provider
credentials) and every Razorpay order-creation call would have thrown at
runtime until this fix landed.

**Evidence (original):** `JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET:-change-me-in-production}`
and the refresh equivalent. `SETTINGS_ENCRYPTION_KEY`, `RAZORPAY_*` and `OTP_*`
are never passed to the container at all. The root `.env.example` still
describes MySQL, Nginx, Pusher and a Laravel `APP_KEY`.

**Blast radius:** any environment brought up without a root `.env` signs tokens
with a public, known key — trivially forgeable JWTs for any role and any org.
The stale example file means a new environment is *likely* to be that
environment.

**Remaining scope (not yet fixed):** the root `.env.example` rewrite for the
current Postgres/Nest stack is still outstanding — tracked as its own item,
not silently dropped. See also the new `F-33` below, a related but distinct
and higher-risk issue found during this same investigation.

**Fix (original writeup, superseded by `BUG002`'s actual implementation):**
remove the fallback defaults so the container fails to boot without
real secrets; rewrite `.env.example` for the Postgres/Nest stack including
`SETTINGS_ENCRYPTION_KEY` generation instructions; delete or replace the
pre-pivot `Makefile` that `CLAUDE.md` already warns against.

**File as:** bug, feature `security`.

### F-12 · S3 · Introspection, stack traces, and coarse rate limiting
**Evidence:** `formatError` strips `extensions.exception` only when
`NODE_ENV === 'production'`, and introspection is likewise production-gated —
both correct, but they mean a misconfigured `NODE_ENV` leaks file paths and the
full schema (observed in this session's probes). Throttling is one global bucket
of 100 requests / 60s with no tighter limit on `register`, `login`, `requestOtp`,
or `requestPasswordReset`.

**Fix:** per-operation throttles on the auth family (e.g. 5/min on `register`
and `requestOtp` per IP), plus a startup assertion that `NODE_ENV` is one of a
known set.

**File as:** improvement, feature `security`.

## Data model and performance

### F-13 · S1 · Zero indexes across 41 models
**File:** `backend/prisma/schema.prisma`.

**Evidence as originally found** (all figures below describe the pre-fix state):
`grep -c "@@index"` → 0, and a live `\d "Appointments"` showed exactly one
index, the primary key. PostgreSQL does not auto-index foreign-key columns — a
`@relation` gives referential integrity and nothing else.

**Blast radius:** every list query in the product is a sequential scan. The core
booking query (clinician + date range + status, scoped through
`clinic.client_org_id`) has no supporting index whatsoever, and neither do
`Notifications.user_id`, `Messages.thread_id`, `AppointmentPayments.appointment_id`,
`AuditLogs.user_id`, or any `client_org_id` scoping column. At the current 4
appointments this is unmeasurable; it becomes a hard cliff, not a gradual slope.

**Status: fixed and verified 2026-08-22, see `BUG005` / `PLAN027` / `TR053`.**

**Fix as delivered:** 69 indexes across 30 of the 41 models, in `schema.prisma`
plus the hand-written migration `20260822130000_add_indexes`. The register's
original suggestion above was to index roughly the right places, but two of its
specifics were wrong once checked against the code, and correcting them mattered:

1. It proposed `Appointments(clinician_id, appointment_date)` and
   `(clinic_id, appointment_date)`. The services overwhelmingly filter and sort
   on **`appointment_time`**, not `appointment_date` — the schema carries both.
   Indexing `appointment_date` there would have produced indexes the planner
   ignores. Delivered as `(clinician_id, appointment_time)` and
   `(clinic_id, appointment_time)`, keeping `(patient_id, appointment_date)`
   where the history view genuinely uses the date.
2. It proposed indexing `client_org_id` scoping columns for their own sake.
   Measured, that predicate matches ~20% of rows and a sequential scan is
   correctly chosen with or without an index — identical buffer counts, same
   plan. **Tenant-scoping columns are not selective enough to index alone.**
   They only help led by a selective column, which is why every composite here
   leads with `clinician_id`/`clinic_id`/`patient_id`. This is the single most
   transferable result, given the PRD adds ~40 more tenant-scoped tables.

   **Do not over-generalise this into "never lead with an unselective column."**
   `Appointments(is_deleted, appointment_time)` leads with a boolean that is
   `false` for effectively every row, and the planner uses it anyway — measured,
   an Index Scan Backward at 130 buffers versus a 2,753-buffer sequential scan
   plus a 50,000-row sort — because it supplies pre-sorted access so the sort
   node vanishes and the `LIMIT` stops early. The real test is **"does this index
   let the planner avoid a full scan *or* a sort,"** not "is the leading column
   selective." `client_org_id` fails both here, and for a further reason: it is
   not a column on `Appointments` at all — it is joined through `Clinics`, so no
   index on `Appointments` could serve it. Indirectly-scoped models are served by
   the parent's scoping-column index plus the join key, together.

Eleven models were deliberately left unindexed: small global reference tables
(`Languages`, `RoomTypes`, `ClinicianTypes`, `EmailTemplates`) where the whole
table is a page or two and an index scan is strictly slower. Unused indexes are
not free — they cost write amplification on every insert forever.

**Measured, not assumed** (per `technical-plans/04-data-model-evolution.md` §2.2),
on a scratch database seeded to 5 orgs / 20 clinics / 100 clinicians / 5,000
patients / 50,000 appointments:

| Query | Before | After | Buffers |
|---|---|---|---|
| clinician schedule, 30d window | Seq Scan + top-N heapsort | Index Scan Backward, no sort | 2755 → **34** |
| clinic schedule, 7d window | Seq Scan + quicksort | Index Scan, no sort | 2753 → **77** |
| patient history | Seq Scan | Bitmap Index Scan | 2753 → **20** |
| org-scoped join | Seq Scan | Seq Scan (**unchanged, expected**) | 610 → 610 |

Buffer counts, not milliseconds, carried the verdict — the measurement host was
saturated (load average 45–190), so wall-clock timings are noisy while buffer
counts are deterministic.

**Still open after this fix:** nothing enforces the baseline. The next model can
land with zero indexes and no test will notice, because unit tests mock Prisma
and the dev database's 4 appointments make a sequential scan genuinely optimal.
That gate is proposed in `technical-plans/00-foundation-hardening.md` and is not
built. Separately, `prisma migrate diff` surfaced 33 lines of **pre-existing**
schema-vs-database drift (missing foreign keys, a `UserProfiles.staff_status`
nullability mismatch) — real, unrelated to indexing, and not folded into this
migration.

**Filed as:** bug `BUG005` under the existing `platform-nfr` feature slug (parent
`REQ035`), rather than creating a new `performance` slug as this register
originally suggested — `REQ035` already owns the platform non-functional
requirements this belongs to.


### F-14 · S2 · Unbounded list resolvers
**Evidence:** `clinics`, `rooms`, `services`, `products`, `testResults`,
`notifications`, `threads`, `languages`, `roomTypes`, `clinicianTypes`,
`cancellationRules` all return plain arrays with no `take`/pagination
(`clinics` accepts an optional `limit` that the frontend does not always send).

**Blast radius:** one tenant with a large catalogue degrades the whole API, and a
single query can materialise an unbounded result set into memory and over the
wire. Combined with F-13 this is the realistic first outage.

**Fix:** adopt the existing `{data, paginatorInfo}` convention (already used by
`appointments`, `patients`, `clinicians`, `roomsPaginated`) for every list, or
at minimum enforce a server-side default and maximum `take`. Match each page's
existing contract per Hard Rule 7 — some consumers expect a bare array, so this
needs a frontend slice alongside it.

**File as:** improvement, feature `performance`.

### F-15 · S3 · N+1 patterns and JS-side aggregation
**Evidence:** `public.service.ts:40` maps `clinicians` with an `async` callback
issuing a query per clinician; `messages.service.ts:120`,
`dashboard.service.ts:155,164,229`, `analytics.service.ts:101,110,119` and
`appointment-payments.service.ts:230` all loop over full result sets in
JavaScript. No DataLoader anywhere.

**Fix:** batch the `public` clinician fan-out into one query with `include`;
move dashboard and analytics counting into `groupBy`/`count` aggregates so
Postgres does the work; add DataLoader if the resolve-field surface grows beyond
the current two.

**File as:** improvement, feature `performance`.

### F-16 · S2 · Double-booking is prevented only in application code
**File:** `backend/src/appointments/appointments.service.ts:195` (`assertSlotFree`).

**Evidence:** the overlap check is a `findFirst` inside the same transaction as
the insert, at PostgreSQL's default `READ COMMITTED`. No unique index, no
`EXCLUDE USING gist` constraint on the clinician's time range.

**Blast radius:** two concurrent requests for the same slot can both pass the
check and both commit. For a booking product this is the defining correctness
property, and it is currently best-effort.

**Fix:** add a database exclusion constraint on
`(clinician_id, tstzrange(start, end))` excluding cancelled rows — with
`btree_gist` enabled — and let the insert fail cleanly, mapping the constraint
violation to the existing "This time slot is no longer available" error. Keep
the application check as the fast, friendly path. Separately, decide the
timezone model: `appointment_date` and `appointment_time` are two independent
timestamps with no stored zone, which will not survive a multi-city tenant.

**File as:** bug, feature `appointments`.

### F-17 · S3 · Patient payments carry no GST fields
**Evidence:** GST columns exist on `PaymentTransactions` (tenant SaaS billing via
Stripe) but not on `AppointmentPayments` (patient payments via Razorpay).

**Blast radius:** a clinic cannot issue a GST-compliant invoice for a
consultation, which is a statutory requirement for registered providers in India
and a hard blocker for any paying clinic customer.

**Fix:** mirror the GST fields (place of supply, HSN/SAC, CGST/SGST/IGST split,
GSTIN of supplier and recipient) onto `AppointmentPayments`, and add an invoice
number sequence per organisation. Pairs naturally with the invoice-generation
work already scoped out of `REQ002`.

**File as:** requirement, feature `patient-payments`.

## Frontend and product integrity

### F-18 · S2 · Fourteen routed pages render fabricated data with no GraphQL
Full table in `01-codebase-analysis.md §3.2`. Eleven of the fourteen have a real
backend module already built and unused.

**Blast radius:** a clinician opening a real patient's detail page
(`patients/detail.jsx`, 1,013 lines) sees an empty-but-authoritative clinical
record: no documents, no diagnoses, no letters, none of it connected to
anything. `analytics/index.jsx` presents invented business metrics.
`manager/Billing.jsx` presents invented money. This is the highest-trust-damage
category of defect in a healthcare product.

**Fix:** wire the eleven that have a backend, page by page, matching each page's
existing contract per Hard Rule 7. For `tasks`, `waiting-room`, and `onboarding`
— genuinely backend-less — either build the domain or remove the route; do not
leave them reachable. Add the missing search resolver for `GlobalSearch`, or
remove the component from the shell.

**Prevention:** add the structural check to the pre-commit/CI gate — every file
under `src/pages` that renders a list or detail view must reference a GraphQL
operation. Grep for `mocks/store` was never sufficient.

**File as:** bug, feature per page (`analytics`, `patients`, `staff`, …).

### F-19 · S3 · Branding does not reach 88 of 122 UI files
**Evidence:** 88 JSX files contain literal hex colours; `REQ002`'s branding
propagates only into `AppShell`.

**Blast radius:** white-labelling — a headline multi-tenant SaaS selling point,
and the subject of a completed requirement — visibly stops at the sidebar.

**Fix:** replace literal hex with theme tokens and drive the MUI theme from the
org's branding at the `ThemeContext` level, so every component inherits it. Do
it as a mechanical sweep with a lint rule (`no-hardcoded-colors`) to hold the
line afterwards.

**File as:** improvement, feature `organization-branding`.

### F-20 · S3 · Three tables still lack `TableContainer`
`pages/settings/index.jsx`, `pages/patients/detail.jsx`,
`components/Dashboard/RecentAppointmentsTable.jsx` — the exact overflow class
already fixed in `staff/index.jsx` once real data proved wider than mock data.
**Fix:** add the wrapper; add an ESLint rule or a review checklist item.
**File as:** bug, feature `settings` / `patients` / `dashboard`.

### F-21 · S3 · Global `cache-first` + `errorPolicy: 'all'` hides failure
**File:** `frontend/src/apollo/client.js:88–96`.
Lists serve stale data after mutations unless refetch is explicit, and partial
errors resolve as success — the exact shape that lets a broken page look fine.
**Fix:** default to `cache-and-network` for lists, keep `cache-first` only where
staleness is genuinely acceptable, and surface partial errors instead of
swallowing them. Also drop the "Backend offline — using mock data" `console.debug`
once the mock fallbacks are gone.
**File as:** improvement, feature `frontend-platform`.

### F-22 · S2 · `npm run lint` is broken in the frontend, hiding 12 real errors
**Evidence:** `npm run lint` exits 1 immediately — the script passes `--ext`,
rejected by the installed ESLint because the project uses flat
`eslint.config.js`. Running ESLint correctly yields 2,911 problems, of which
2,880 are spurious `no-unused-vars` on JSX-used imports because the flat config
omits `eslint-plugin-react` (so `react/jsx-uses-vars` is off). Behind that noise:
11 × `jsx-a11y/no-autofocus` and 1 × `jsx-a11y/media-has-caption`.
**Blast radius:** Hard Rule 3 has been satisfied vacuously for every frontend
commit.
**Fix:** drop `--ext` from the script, add `eslint-plugin-react` with
`jsx-uses-vars`/`jsx-uses-react` to the flat config, then fix the 12 real errors
and set `--max-warnings` to a real budget.
**File as:** bug, feature `frontend-platform`.

### F-23 · S3 · `forgot-password` simulates success while a real resolver exists
`pages/auth/forgot-password.jsx` has no GraphQL call; the backend exposes a real
`requestPasswordReset`. A user is told a reset email was sent when nothing was
sent. **Fix:** wire it (accepting that email delivery itself is a documented
stub, which is a different and honest problem).
**File as:** bug, feature `auth`.

## Testing, process, and operations

### F-24 · S2 · Frontend unit coverage is one component
**Evidence:** `npx jest --coverage` → 1 suite, 4 tests,
`PermissionMatrix.jsx` only. `jest.config.cjs` sets no `collectCoverageFrom` and
no `coverageThreshold`, so the reported "100%" describes a single 51-line file.
**Fix:** set `collectCoverageFrom: ['src/**/*.{js,jsx}']` so the real number is
visible, then add tests where the risk is: `AuthContext` (after F-02),
`ProtectedRoute`/`RoleGuard`, the booking wizard's step validation, currency and
date formatting, and each form's zod schema.
**File as:** requirement, feature `test-coverage-audit`.

### F-25 · S2 · No integration tests; tenancy is proven against a mock — ✅ CLOSED 2026-08-22
**Evidence:** all 49 suites replace `PrismaService` with `jest.fn()` mocks and
assert the shape of the `where` argument. No `supertest`, no test database, no
API-level test. F-01, F-04 and F-05 are all invisible to this design.
**Fix:** add a Testcontainers (or dedicated compose service) PostgreSQL, run
`migrate deploy` plus a two-org fixture, and add a `supertest` GraphQL suite
whose core is a **tenancy matrix**: for each of ~8 roles × each domain, assert
own-org read succeeds and other-org read returns empty or `FORBIDDEN`. That
suite is the regression net this project most needs and does not have.
**File as:** requirement, feature `test-coverage-audit`.

**Closed** as `BUG007` / `PLAN028` / `TP055` / `TR054` (filed under
`platform-nfr`, not `test-coverage-audit` — the fix is a platform capability, and
the leaks it exposed belong to `security`). Went with the dedicated compose
service over Testcontainers: no new dependency, and it maps one-to-one onto a
GitHub Actions `services:` block for F-26.

**What it found on first run, exactly as predicted.** Two live cross-tenant
leaks reachable by an account anyone can self-register — the full platform user
directory via `messageableContacts`, and lab results across tenants via
`testResult(id)`. Ten further instances of the same pattern, latent behind role
gates. All twelve are `BUG006`.

**Three corrections to the finding as written**, each of which matters for
whoever extends the matrix:

1. **The defect has four spellings, not one.** The F-01 write-up describes
   `client_org_id ? {…} : {}`. Also live were `?? undefined`, `: undefined` on a
   relation, and `if (user.client_org_id && …)` guards that skip entirely for a
   null org. A grep for the first spelling finds a third of the instances —
   which is exactly how `BUG004` left twelve behind.
2. **The write path is a separate bug class with the same cause.**
   `client_org_id: user.client_org_id ?? undefined` on a `create` never leaks on
   read; it silently writes an **org-less row**. Six `create` paths did this.
   `tenant-scope.ts` had no write-path helper at all, which is why each service
   improvised the same wrong thing. `orgIdForWrite()` now exists.
3. **The unit suite had begun asserting the defect.** Three specs expected
   `client_org_id: undefined` — the precise value the bug produced — so they
   would have failed against a *correct* implementation. A suite that cannot
   detect a defect eventually gets edited to agree with it. This is the strongest
   argument for the matrix, stronger than the missing coverage itself.

**Not closed by this:** coverage is 12 of 22 tenant-scoped domains, with the
other ten declared in a frozen `KNOWN_GAPS` list that the suite asserts by exact
equality; the ten latent fixes are not matrix-proven (their role gates make them
unreachable today); and the suite needs `--forceExit` (see F-29), which must be
resolved before F-26.

### F-26 · S2 · No CI
**Evidence:** `.github/workflows` does not exist.
**Fix:** one workflow: backend lint + `tsc --noEmit` + Jest; frontend lint +
Jest; `prisma validate` + `migrate deploy` against a service container;
Playwright against a composed stack. Make it required on the default branch.
Without this, "verify before you commit" is a convention, not a control.
**File as:** requirement, feature `ci-cd` (new slug).

### F-27 · S3 · E2E is smoke-weighted and leaves data behind
**Evidence:** 218 assertions, 160 of them (73%) `toBeVisible`. No negative-RBAC
test, no cross-tenant test. Specs create records and never delete them — already
the documented cause of two false failures (a page-wide `₹50.00` locator and an
`admin@` account falling off page 1 as the user count grew).
**Fix:** add `afterEach` cleanup or per-run unique tenants; add negative RBAC
specs (a patient hitting `/admin/*`, a manager hitting another org's record);
assert on values, not just visibility.
**File as:** improvement, feature `test-coverage-audit`.

### F-28 · S3 · The development database is the test database
**Evidence:** live counts are 4 appointments, 4 patients, 3 rooms, plus
accumulating `E2E Service …` and `E2E TestClinician` rows from previous runs.
**Blast radius:** e2e largely proves empty-state rendering; performance and
pagination behaviour are untestable; test runs mutate the dev dataset, which is
what caused the two documented false failures.
**Fix:** a deterministic seed script (two organisations, ~5 clinicians, ~200
patients, ~2,000 appointments across a date range, payments, messages) plus a
separate database for e2e and a reset between runs.
**File as:** requirement, feature `test-coverage-audit`.

### F-29 · S3 · Backend Jest leaks a worker
**Evidence:** the run ends with `A worker process has failed to exit gracefully
and has been force exited`.
**Fix:** run `--detectOpenHandles`, `.unref()` the offending timer (likely a
Redis client or throttler interval in a testing module), and add
`--forceExit` only as a last resort — a hanging worker will hang CI.
**File as:** bug, feature `test-coverage-audit`.

**Confirmed and widened 2026-08-22** while building F-25's harness. The
integration suite hits the same class harder — it currently *requires*
`--forceExit` and logs `Cannot log after tests are done` after teardown, so
something holds a handle past `app.close()`. Two further measured facts for
whoever picks this up: the default `npm test` worker count is **OOM-killed on
this host** (exit 137) before finishing, and at `--maxWorkers=2` the `account`
and `staff` suites intermittently time out on bcrypt under contention while
passing in isolation. All three are the same underlying problem — the backend
suite is not currently safe to run unattended, which blocks F-26.

### F-30 · S4 · Documented status drifts from measured status
`CLAUDE.md` cited 405 tests / 37 suites when this register measured 602 / 49; as
of 2026-08-22 the real figures are **645 / 50** unit plus **120 / 3** integration
(`CLAUDE.md` corrected in the same commit, but by hand, which is the problem) and asserts several
"green" states that need re-verification each session. This is a known, already
logged pattern rather than a new problem, but it compounds: the counts are cited
as coverage evidence.
**Fix:** have CI write the measured numbers into a generated status file that
`CLAUDE.md` links to, instead of restating them by hand.
**File as:** improvement, feature `test-coverage-audit`.

### F-31 · S4 · Repository root noise
~15 large pre-pivot planning documents (`plan-new.md` 162 KB,
`medibook-ui-plan-v5-complete.txt` 104 KB, `medibook-dashboard-ui-plan.txt`
98 KB, `healthsync-plan.html`, `schema.ts`, `FRONTEND_PLAN.md` at 11 bytes), a
3.9 MB `.pptx`, a 128-entry `.playwright-mcp/`, three `backend/.env.bak*` files
(untracked, verified), and a `Makefile` targeting the abandoned Laravel/MySQL
stack.
**Fix:** move the historical planning documents under `context/archive/` where
the archive-sweep script can manage them, delete the stale `Makefile` and
`FRONTEND_PLAN.md`, add `.playwright-mcp/` and `*.env.bak*` to `.gitignore`.
**File as:** improvement, feature `repo-hygiene`.

### F-32 · S4 · Backend test suite is unusable inside the container
**Evidence:** a single spec file exceeded 400s in `medibook_backend`; the same
file runs in 42s on the host, and the full suite in 140s.
**Fix:** raise the container's CPU/memory allocation or run tests on the host in
the normal loop; note the difference in `CLAUDE.md` so the existing
"run in small batches" advice has its cause attached.
**File as:** improvement, feature `repo-hygiene`.

### F-33 · S2 · Postgres also defaults to a weak, published password, and rotating it is not a simple env-var change
**File:** `docker-compose.yml` (postgres service) — `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-medibook_secret}`.

**Evidence:** found while fixing `F-11`/`BUG002`. Unlike the JWT secrets, this
default is not merely a live risk on paper — it is the actual password
currently in use by the running `medibook_postgres` container (no root `.env`
overrides it), and Postgres's port is mapped to the host (`5432:5432`). The
value is published verbatim in this very findings document.

**Why it wasn't fixed alongside F-11:** the password is baked into the
existing `postgres_data` Docker volume from its first initialization —
changing the compose-level `POSTGRES_PASSWORD` environment variable alone does
**not** change the already-provisioned role's actual password, and would instead
break the backend's `DATABASE_URL` connection string on the next container
start (a real, easy-to-hit footgun: "I rotated the password and now nothing
connects"). A safe fix requires either an in-place `ALTER ROLE medibook
PASSWORD '...'` against the live database (paired with updating `DATABASE_URL`
in the same change) or a deliberate data-preserving migration — meaningfully
higher risk and blast radius than the JWT fix, and deliberately not bundled
into `BUG002`.

**Blast radius:** with the host port mapped, any process that can reach the
host's network interface (not just other containers) can attempt to connect
to Postgres with a published, guessable password. In a real deployment this
port typically wouldn't be exposed publicly, but the default should not rely
on that assumption holding.

**Fix:** rotate the password via `ALTER ROLE` against the live instance,
update `DATABASE_URL` in the same change (both `backend/.env` and the root
`.env`), verify the backend reconnects cleanly, and only then remove the
insecure compose-level default — in that order, not by changing the compose
file first.

**File as:** bug, feature `security`, parent `BUG002` (same root-cause
investigation, deliberately split into a second, separately-risk-assessed fix).
