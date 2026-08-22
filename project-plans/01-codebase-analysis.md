---
id: PP001
type: analysis
feature: project-plans
created: 2026-08-22
updated: 2026-08-22
status: active
parent: PP000
related: [PP002, PP003, PP004]
---

# 01 — Codebase analysis

Every figure below was measured in this session. Where it contradicts a
number in `CLAUDE.md` or a root `README.md`, the measured figure is stated and
the drift is noted, because several documented counts have gone stale.

## 1. Repository shape

| Metric | Measured |
|---|---|
| Files tracked outside `node_modules`/`.git`/`dist` | 1,485 |
| Markdown documents | 525 |
| Backend TypeScript files | 230 (`backend/src`) |
| Frontend JSX files | 122 (75 page files, 47 component files) |
| Prisma models / enums / schema lines | 41 / 12 / 1,071 |
| Migrations on disk / applied to the running DB | 23 / 23 (all `finished_at` set) |
| Backend spec files / test cases | 49 / 602 |
| Frontend unit spec files / test cases | 1 / 4 |
| Playwright spec files / tests / assertions | 31 / 66 / 218 |
| CI pipelines | 0 (`.github/workflows` does not exist) |

Documentation volume by root: 14 requirement docs, 26 implementation plans,
54 test plans, 53 test results, 38 test suggestions, plus 57 `context/` bundles
and two parallel legacy QA trees (`test-plan/`, `test-result/`,
`test-suggestion/`, and `test-cases/` with 15 domain folders).

### Drift found in the documented status

- `CLAUDE.md` states the backend suite is "405/405, 37 suites". Measured:
  **602 tests across 49 suites**, all passing in 140s on the host. The claim is
  not wrong in spirit — the suite is green — but the numbers are two generations
  behind, which matters because they are cited as evidence of coverage.
- `CLAUDE.md`'s architecture section lists 28 domain module names and warns the
  list drifts. Measured: **29 domains with a resolver**, matching that list plus
  `dashboard`; `account`, `notification-preferences`, `cancellation-rules`,
  `org-settings`, and `appointment-payments` are all present as claimed.
- Priority 3 is recorded as complete for every page touched. That is accurate as
  far as it goes, but the audit method (grep for a `mocks/store` import)
  structurally cannot see fabricated data that was never imported from the mock
  store — and 14 routed pages fall in exactly that gap (§5.2).

## 2. Backend architecture

### 2.1 What is genuinely well-built

The guard chain in `backend/src/app.module.ts` is correct and the ordering
comment explaining *why* it is load-bearing is accurate:
`GqlThrottlerGuard` → `GqlAuthGuard` → `RolesGuard` → `IpWhitelistGuard`, then
`AuditLogInterceptor`. Because `GqlAuthGuard` is registered as a global
`APP_GUARD`, `req.user` is guaranteed populated before `RolesGuard` reads it —
the subtle NestJS behaviour (global guards always precede handler-level
`@UseGuards`) that this codebase already learned the hard way.

Verified live: an unauthenticated `{ clinics { id name } }` returns
`UNAUTHENTICATED`. The system is genuinely fail-closed by default; exactly **16
deliberate `@Public()` operations** exist (8 in `auth`, 5 in `public`, 2 in
`appointment-payments`, 1 in `availability`) and nothing else is reachable
anonymously.

Other things done properly, worth protecting during any refactor:

- **Timing-safe login.** `auth.service.ts` compares against a constant
  `DUMMY_HASH` when the email does not exist, so a nonexistent account costs the
  same bcrypt time as a real one. Cost factor 12. Lockout after 5 failures in a
  15-minute window, keyed in Redis, checked *before* touching the password.
- **Refresh-token model.** Opaque 48-byte random tokens in Redis (not JWTs),
  tracked in a per-user set so `logout` can revoke every session without the
  client holding the token. Correct design.
- **At-rest encryption.** `common/crypto/secrets.ts` is AES-256-GCM with a
  random 12-byte IV prepended and the auth tag stored inline; it throws loudly
  rather than falling back to a hardcoded key or plaintext. Used for TOTP
  secrets and per-org SMS provider credentials. This is the standard done right.
- **Real TOTP 2FA** via `otplib` with single-use backup codes, and a
  `TotpChallengeType` returned from `login` rather than a partial session.
- **Subscription auth.** `graphql-ws` connections synthesise a request shape
  from `connectionParams` so the same passport-jwt path serves both transports —
  one auth implementation, not two.
- **Self-scoping sentinels.** Every `selfScope()` filters on
  `'__no_patient_link__'` / `'__no_clinician_link__'` rather than omitting the
  filter when the id is null, so an unlinked account fails closed. This is the
  detail most codebases get wrong.
- **DTO validation** is real (`class-validator`, `whitelist: true`,
  `forbidNonWhitelisted: true`), and `formatError` strips `extensions.exception`
  in production.
- Backend ESLint is clean (`npx eslint "src/**/*.ts"` → no output).

### 2.2 The seam that breaks it: "org-less caller sees everything"

The documented convention is that a caller with `client_org_id: null` —
intended to mean a platform admin or super-admin — sees all records rather than
none. Roughly a dozen list resolvers implement it as
`...(user.client_org_id ? { client_org_id: user.client_org_id } : {})`.

That convention was safe while the only way to get a null org was to be seeded
as a platform operator. It stopped being safe when `register` became a
`@Public()` mutation: a self-registered account is assigned the `patient` role
and **no organisation**, so it satisfies the "sees everything" branch.

Proven live this session with a throwaway account (full transcript in
`03-security-and-tenancy-audit.md`): a brand-new, unverified patient account
read every tenant's clinics, the full service catalogue with prices, products,
rooms, all clinicians, and both lookup tables. Patient records, appointments,
and test results correctly returned empty, and `reviews` / `getUsers` /
`getAuditLogs` / `myOrgSecuritySettings` correctly returned `FORBIDDEN` — so the
role gating works; the failure is specifically the null-org branch on
catalogue-shaped queries that carry no `@Auth()`.

This is the single most important finding in this analysis, and it is invisible
to the existing test suite for the reason set out in §6.2.

### 2.3 RBAC exists as data, not as enforcement

`Permissions` and `RolePermissions` are real tables. `admin/Roles.jsx` and
`components/Roles/PermissionMatrix.jsx` let an admin assign permissions to
custom, org-scoped roles. `users.service.ts` reads `RolePermissions` in exactly
four places — `getRolePermissions`, `toAppRole`, and the two write paths.

Nothing anywhere reads it to authorise an operation. `RolesGuard` compares
`user.roles` against the string list in `@Auth(...)` and stops there. The
frontend's `hasPermission()` reads `user.permissions`, a field the auth payload
never populates, so it always returns `false`.

The practical consequence: assigning or revoking a permission in the matrix
changes nothing about what any user can do. `REQ003`'s headline competitive gap
(custom roles and access groups, benchmarked against Semble) is currently a
storage and UI feature only. See `F-03`.

### 2.4 Data model

The schema is relationally sound and India-correct in the places that matter:
money as `Int` paise, GST fields on `PaymentTransactions`, structured
`{line1, line2, city, state, pincode, country}` addresses on
`ClientOrganizations` and `Patients`. The documented inconsistency —
`Clinics.address`/`city`/`postcode` still on the older flat Western shape — is
real and still unreconciled.

Two structural problems:

**Zero indexes.** `grep -c "@@index" schema.prisma` returns **0**. There are 19
`@unique` constraints and nothing else. Confirmed against the live database:

```
\d "Appointments"
Indexes:
    "Appointments_pkey" PRIMARY KEY, btree (id)
```

PostgreSQL does not index foreign-key columns automatically (it indexes the
referenced primary key, not the referencing column). So the core query of a
booking product — appointments for a clinician within a date range, filtered by
`status` and `is_deleted`, scoped through `clinic.client_org_id` — is a
sequential scan plus a nested loop, on every request. The same is true of
`Notifications.user_id`, `Messages.thread_id`, `AuditLogs.user_id`,
`AppointmentPayments.appointment_id`, and every `client_org_id` scoping column.

Current row counts (live): 4 appointments, 4 patients, 4 clinics, 3 rooms,
8 clinicians, 13 messages, 2 test results, 4 appointment payments, 243 audit
logs. At that volume nothing is measurable. This is a latent defect that
surfaces as a cliff, not a slope. See `F-13`.

**No database-level double-booking prevention.** `assertSlotFree()` in
`appointments.service.ts` does a `findFirst` overlap check inside the same
transaction as the insert, but the transaction runs at PostgreSQL's default
`READ COMMITTED` isolation and there is no unique index or exclusion constraint
on `(clinician_id, time range)`. Two concurrent bookings for the same slot can
both pass the check and both commit. For a booking system this is the one race
that must be closed in the database, not in application code. See `F-16`.

### 2.5 Notifications, payments, integrations

`NotificationTriggerService.dispatch()` is real and correctly reads saved
preferences with a defaults fallback, wired into four genuine domain events.
SMS goes through a real pluggable provider registry (MSG91, Gupshup, Twilio,
AWS SNS) with per-org encrypted credentials — a legitimate multi-tenant pattern,
and the one deliberate exception to the fixed-vendor rule.

Email is a log-line stub (no SES credentials in this environment, honestly
documented). `appointment_reminder` needs a scheduler that does not exist;
`new_review` has nothing to hook because `ReviewsService` has **no creation
path at all** — reviews can be read and moderated but never submitted, which
also means the review flywheel that is Practo's actual moat is absent (see
`05`).

Razorpay is a real integration: order creation against
`api.razorpay.com/v1/orders`, and signature verification using
`createHmac('sha256', keySecret)` over `order_id|payment_id` compared with
`timingSafeEqual`. Correct per Razorpay's client-integration pattern. Two gaps:
both mutations are `@Public()` (`F-07`), and there is no webhook path, so a
payment that succeeds at Razorpay but whose browser callback never fires leaves
the row `pending` forever with no reconciliation.

## 3. Frontend architecture

React 18 + Vite + MUI v5 + Apollo, all 75 page modules route-split with
`React.lazy`, layered layouts (`AppShell`, `AdminLayout`, `AuthLayout`,
`PublicLayout`), `ProtectedRoute` + `RoleGuard`, real idle-timeout logout driven
by the org's own setting. The structure is sound.

### 3.1 The client-side auth bypass

`context/AuthContext.jsx` contains a demo-mode path that is a genuine
authorisation bypass:

- `getInitialState()` treats **any** token beginning with `mock_` as fully
  authenticated, taking the user object — including its `roles` array —
  verbatim from `localStorage.medibook_user`.
- When `ME_QUERY` fails for a real JWT, the error handler **falls back to the
  cached user** rather than logging out. An expired or revoked token therefore
  keeps its client-side session.
- `pages/auth/login.jsx` ships five demo accounts with plaintext passwords as
  one-click buttons, unconditionally — there is no `import.meta.env.PROD` guard
  anywhere in the codebase. Its offline fallback additionally accepts
  `"password"` or `"demo"` as a universal password for those accounts, and the
  OTP path accepts a hardcoded `MOCK_OTP = '123456'` whose value the UI prints
  in the hint text.

Two lines in a browser console are enough to enter the application as
`super_admin`. The backend still rejects the API calls — so no real data is
exposed by this alone — but every admin surface becomes reachable, and any page
with a mock fallback renders fabricated data inside it. This must not ship. See
`F-02`.

### 3.2 Pages that are still entirely fabricated

Prior sweeps searched for a `mocks/store` import. Fourteen routed pages plus two
components never had one — they hardcode arrays inline — so they were never
audited. Verified by checking every JSX file for any of `useQuery`,
`useMutation`, `useLazyQuery`, `useSubscription`, or a `gql` template:

| Page / component | Backend that already exists |
|---|---|
| `pages/analytics/index.jsx` | `analytics` module (real) |
| `pages/patients/detail.jsx` (1,013 lines) | `patients` module (real) |
| `pages/clinician/Patients.jsx` (`MOCK_PATIENTS`) | `patients` self-scoped by clinician (real) |
| `pages/staff/Dashboard.jsx` | `dashboard`/`appointments` (real) |
| `pages/staff/Appointments.jsx` (`MOCK_APPOINTMENTS`) | `appointments` (real) |
| `pages/patient/Appointments.jsx` | `appointments` self-scoped (real) |
| `pages/patient/Profile.jsx` | `account` + `patients` (real) |
| `pages/manager/Billing.jsx` | `appointment-payments` (real) |
| `pages/auth/forgot-password.jsx` | `requestPasswordReset` (real) |
| `components/GlobalSearch.jsx` (`MOCK_DATA`) | none — needs a search resolver |
| `components/Settings/NotificationTemplates.jsx` | `email-templates` (real) |
| `pages/tasks/index.jsx` | none — no domain |
| `pages/waiting-room/index.jsx` | none — no domain |
| `pages/public/landing.jsx` | `public` module (partly real) |
| `pages/onboarding/index.jsx` | none — mock-store mutations only |

Eleven of these have a real backend module sitting unused behind them. Only
`tasks`, `waiting-room`, and `onboarding` are honestly blocked on a missing
domain. `patients/detail.jsx` is the most serious: a 1,013-line clinical detail
page — documents, diagnoses, letters — driven entirely by `useState([])`, so a
clinician looking at a real patient sees an empty clinical record that looks
authoritative. See `F-18`.

### 3.3 Theming, responsiveness, accessibility

- 88 of 122 JSX files hardcode hex colours. `REQ002` shipped real logo upload,
  colour pickers, and WCAG-AA contrast validation, and propagates the result into
  `AppShell`'s sidebar and top nav — but the other 88 files ignore the theme, so
  white-labelling stops at the chrome. For a multi-tenant SaaS sold on
  branding, that is a product gap, not a polish gap. See `F-19`.
- Three `<Table>` usages still lack a `TableContainer` wrapper
  (`pages/settings/index.jsx`, `pages/patients/detail.jsx`,
  `components/Dashboard/RecentAppointmentsTable.jsx`) — the exact overflow bug
  class already found and fixed in `staff/index.jsx`. See `F-20`.
- `npm run lint` **fails immediately** (exit 1): the script passes `--ext`,
  which the installed ESLint rejects because the project uses a flat
  `eslint.config.js`. So the frontend has effectively been unlinted, and Hard
  Rule 3 has been passing vacuously. Running ESLint correctly reports 2,911
  problems, but 2,880 of those are spurious `no-unused-vars` on imported
  components: the flat config omits `eslint-plugin-react`, so
  `react/jsx-uses-vars` is off and ESLint cannot see that JSX uses an import.
  Behind that noise sit **12 real errors** — 11 × `jsx-a11y/no-autofocus`, 1 ×
  `jsx-a11y/media-has-caption` on the video-consultation page. See `F-22`.
- Apollo is configured globally with `fetchPolicy: 'cache-first'` and
  `errorPolicy: 'all'`. Together those mean lists serve stale data after a
  mutation unless a refetch is explicit, and partial errors resolve as success
  — which is precisely the shape of failure that lets a mock fallback look like
  a working page. See `F-21`.

## 4. Test reality

Detailed in `04-test-and-quality-strategy.md`. The short version:

- Backend: 602 tests, 49 suites, green, 140s on the host. Every one is a unit
  test with `PrismaService` replaced by a `jest.fn()` mock; assertions inspect
  the `where` object handed to Prisma. There is no `supertest`, no test database,
  no API-level test anywhere. Tenant isolation is proven against a mock's
  argument shape, never against SQL.
- Frontend: 1 suite, 4 tests, covering one 51-line component. `jest.config.cjs`
  sets no `collectCoverageFrom` and no thresholds, so `--coverage` reports 100%
  over the single file it happened to touch.
- E2E: 66 Playwright tests with 218 assertions, of which 160 (73%) are
  `toBeVisible`. No negative-RBAC test, no cross-tenant test, no cleanup — specs
  create records and leave them, which has already produced two documented false
  failures.
- Inside the container a single spec file exceeded 400 seconds; on the host the
  same file runs in 42s. The container is resource-starved, which is why the
  documented advice to run tests in small batches exists. Also, the run ends with
  `A worker process has failed to exit gracefully` — an unref'd timer or open
  handle that will hang CI.

## 5. Operations

- **No CI.** There is no `.github/workflows`. Lint, typecheck, unit, and e2e are
  all manual, so the hard rule "run lint + typecheck + the full test suite and
  confirm green before every commit" cannot be enforced and cannot be audited.
- `docker-compose.yml` defaults `JWT_ACCESS_SECRET=change-me-in-production` and
  `JWT_REFRESH_SECRET=change-me-too-in-production`, and never passes
  `SETTINGS_ENCRYPTION_KEY`, `RAZORPAY_*`, or `OTP_*`. A `docker compose up`
  without a root `.env` therefore boots with a known signing key. There is no
  production compose target, no backend healthcheck, and no resource limits.
- The root `.env.example` is pre-pivot: MySQL, Nginx, Pusher, Laravel `APP_KEY`.
  Same generation as the `Makefile` that `CLAUDE.md` already warns is stale.
  Anyone onboarding from the example file configures the wrong stack.
- Repo hygiene: `backend/.env.bak`, `.env.bak2`, `.env.bak3` exist on disk
  (correctly untracked — only `.env.example` is in git, verified). Root holds
  ~15 large pre-pivot planning documents (`plan-new.md` at 162 KB,
  `medibook-ui-plan-v5-complete.txt` at 104 KB, `schema.ts`,
  `healthsync-plan.html`) plus a 3.9 MB `.pptx` and a 128-entry
  `.playwright-mcp/` directory. None of it is load-bearing; all of it competes
  for attention with the five curated doc roots.

## 6. Why the existing process did not catch these

This matters more than any individual bug, because the process is otherwise
unusually disciplined.

### 6.1 The audits were grep-shaped

The mock-removal sweep searched for an import string. Fabricated data that never
imported anything was structurally invisible to it. The fix is not more
diligence — it is a different query: "which routed page renders data without any
GraphQL operation?" That check takes one command and would have found all
fourteen.

### 6.2 The tests mock the thing being tested

`patients.service.spec.ts` asserts `where.id === 'pat-1'` for a patient caller.
That is a real and valuable regression test for the self-scoping fix. But no
test asks "what does a `client_org_id: null` caller actually get back from
PostgreSQL?" — because there is no PostgreSQL in the test run. A mocked Prisma
cannot fail an isolation test, so 602 green tests coexist with a live,
reproducible cross-tenant read. One integration test with a real database and
two seeded orgs would have caught `F-01`, `F-04`, and `F-05` together.

### 6.3 Green is asserted in prose, not in a pipeline

Test-result documents record pass/fail and a commit SHA, which is genuinely good
practice. But without CI, "green" is a statement about one machine at one
moment, and the numbers drift (405→602) while the claim stays. A pipeline makes
the claim continuously true or visibly false.

---

Continue to [02-findings-register.md](./02-findings-register.md) for the
itemised backlog, or straight to
[06-execution-plan.md](./06-execution-plan.md) for the sequenced plan.
