---
id: PP003
type: analysis
feature: project-plans
created: 2026-08-22
updated: 2026-08-22
status: active
parent: PP000
related: [PP001, PP002, PP006]
---

# 03 — Security and multi-tenancy audit

Scope: authentication, authorisation, tenant isolation, secrets, payment
integrity, audit. Conducted by reading every guard, every resolver's decorator
set, every service's scoping helper, and then probing the running stack.

## 1. What holds

Stated plainly, because the plan that follows should not disturb any of it:

| Control | State |
|---|---|
| Default-deny authentication | **Holds.** Global `GqlAuthGuard`; anonymous `{clinics}` → `UNAUTHENTICATED`. |
| Guard ordering | **Holds.** Throttle → auth → roles → IP whitelist, in `APP_GUARD` registration order, with a correct explanation of why global registration is required. |
| Role gating where declared | **Holds.** A patient-role caller received `FORBIDDEN` on `reviews`, `getUsers`, `getAuditLogs`, `cancellationRules`, `myOrgSecuritySettings`. |
| Login hardening | **Holds.** Constant-time dummy-hash comparison, bcrypt cost 12, Redis lockout at 5/15min checked before the password compare, generic error text. |
| Refresh tokens | **Holds.** Opaque random tokens in Redis with per-user revocation sets, not self-contained JWTs. |
| TOTP 2FA | **Holds.** Real `otplib` enrolment with QR, single-use backup codes, challenge-not-session on partial auth. |
| Secrets at rest | **Holds.** AES-256-GCM, random IV, auth tag, fails loudly with no plaintext fallback. |
| Self-scoping fail-closed | **Holds.** Sentinel filters (`'__no_patient_link__'`) rather than dropped filters, so unlinked accounts see nothing. Verified live: `patients`, `appointments`, `testResults` all returned empty for a fresh patient account. |
| Injection surface | **Holds.** Prisma parameterises everywhere; no raw SQL in `src`. |
| IP whitelist self-lockout | **Holds.** The settings mutation itself is deliberately exempt — a real safety decision, correctly reasoned. |

That is a stronger baseline than most codebases at this stage. The failures
below are all at boundaries between two correct decisions.

## 2. Finding F-01, reproduced

The convention "a caller with `client_org_id: null` sees everything" was written
for platform operators. `register` is `@Public()` and creates accounts with the
`patient` role and no organisation. Those two facts compose into a cross-tenant
read.

### 2.1 Step one — mint an org-less account

```
POST /graphql
mutation { register(input: {
  email: "probe@example.test", password: "Probe1234",
  first_name: "P", last_name: "Q"
}) { access_token user { roles { name } client_org_id } } }
```

Response, and the decoded JWT body:

```json
{"user":{"roles":[{"name":"patient"}],"client_org_id":null}}
{"sub":"03ca6941-…","roles":["patient"],"client_org_id":null,
 "patient_id":null,"clinician_id":null}
```

No email verification, no invite, no org association. One HTTP call.

### 2.2 Step two — read other tenants

Every query below was issued with that account's bearer token.

```
{ clinics { id name city } }
→ MG Road Clinic (Bengaluru), Admin Test Clinic,
  Koramangala Health Center (Bengaluru), Westside FC Road Clinic (Pune)
  — 4 clinics spanning 3 organisations

{ services { id name price } }
→ full catalogue with prices (GP Consultation ₹499, …)

{ products { id name price } }      → all products, all tenants
{ rooms { id name } }               → Room 3A, Room 5B
{ clinicians { paginatorInfo { total } data { full_name } } }
                                    → total: 8, all tenants
{ languages { id name } }           → all
{ roomTypes { id name } }           → all
{ clinicianTypes { id name } }      → all
```

Correctly refused, for contrast:

```
{ patients(first:5){ paginatorInfo{ total } } }   → total: 0
{ appointments(first:5){ paginatorInfo{ total } } } → total: 0
{ testResults { id } }                            → []
{ reviews { id } }                                → FORBIDDEN
{ getUsers(limit:2){ id } }                       → FORBIDDEN
{ getAuditLogs(limit:2){ id } }                   → FORBIDDEN
{ myOrgSecuritySettings { mfa_required } }        → FORBIDDEN
```

### 2.3 What this establishes

The role gating works. The self-scoping works. What fails is precisely the
category of query that (a) implements tenant scoping through
`user.client_org_id ? {...} : {}` and (b) carries no `@Auth()` because "any
authenticated user may read the catalogue" seemed reasonable.

Disclosed today: every tenant's clinic names and cities, service and product
catalogues **with prices**, room inventory, clinician roster, and reference data.
For a multi-tenant SaaS where tenants are competing clinics in the same city,
competitor pricing and staffing is commercially sensitive on its own — and the
same pattern will disclose PHI the moment a domain using it gains a
patient-linked field.

### 2.4 The fix, stated precisely

The bug is inferring privilege from an *absence*. Replace it with an assertion:

```ts
// common/scoping.ts
const PLATFORM_ROLES = ['admin', 'super_admin'] as const;

export function isPlatformOperator(user: JwtPayload) {
  return user.roles?.some(r => PLATFORM_ROLES.includes(r as any)) ?? false;
}

// Returns a Prisma filter fragment. Never returns {} for a non-operator.
export function orgScope(user: JwtPayload, column = 'client_org_id') {
  if (isPlatformOperator(user)) return {};
  return { [column]: user.client_org_id ?? '__no_org__' };
}
```

Three properties matter. It lives in **one** file, so the next domain cannot
reintroduce the ternary. It fails **closed** for a non-operator with no org,
using the sentinel pattern this codebase already applies correctly in
`selfScope()`. And it makes the platform-operator case explicit and greppable
instead of implicit.

Then: add `@Auth()` to the catalogue queries that no patient needs, and add the
tenancy-matrix integration test from `F-25` so the property is asserted rather
than reasoned about.

## 3. The frontend bypass (F-02)

The backend is not fooled by this — but the product is.

```js
localStorage.setItem('medibook_token', 'mock_anything');
localStorage.setItem('medibook_user', JSON.stringify({
  id: 'x', name: 'X', email: 'x@x', roles: [{ name: 'super_admin' }]
}));
location.reload();
```

`getInitialState()` sees the `mock_` prefix, trusts the cached object wholesale,
and returns `isAuthenticated: true`. `ProtectedRoute` passes. `RoleGuard` calls
`hasRole('super_admin')` against the forged array and passes. Every admin route
renders.

Three compounding factors:

1. **The `meError` fallback.** For a *real* JWT, if `ME_QUERY` fails — expired
   token, revoked session, network blip — the handler falls back to the cached
   user rather than logging out. Session invalidation is therefore not enforced
   client-side.
2. **Shipped credentials.** `login.jsx` renders five demo accounts with
   plaintext passwords as one-click buttons, with no `import.meta.env.PROD`
   guard. Its offline path accepts `"password"` or `"demo"` universally, and the
   OTP path accepts a hardcoded `123456` that the UI itself displays.
3. **Mock fallbacks behind the bypass.** Any page still falling back to
   `mocks/store.js`, plus the fourteen pages of `F-18`, render fabricated data
   inside the forged admin session — so it does not look like a broken demo, it
   looks like a working product.

Remediation is deletion, not hardening: remove the `mock_` branch, remove the
`MOCK_USERS` login fallback, log out on `ME_QUERY` failure, and gate the demo
chips behind `DEV`. The Playwright `loginAs()` helper runs against the dev
server, so it keeps working unchanged.

## 4. Authorisation depth: RBAC is not wired (F-03)

`Permissions` and `RolePermissions` are populated, editable through
`admin/Roles.jsx`, and read by nothing that authorises anything. `RolesGuard`
matches role name strings. `hasPermission()` reads a `user.permissions` field the
API never returns, so it is constant `false`.

The consequence is worth stating in product terms: an operator who uses the
permission matrix to stop a receptionist from cancelling appointments has not
stopped anything. And because the matrix visibly persists, it reads as working.

`F-06` compounds it: `updateRolePermissions` lacks the `is_system` guard that
`updateRole`/`deleteRole` have, so an admin can strip every permission from the
`admin` role itself — a self-lockout that would matter a great deal once
permissions are actually enforced.

Sequence the fix as: populate effective permissions in the token → make
`hasPermission()` real in the UI → add `PermissionsGuard` +
`@RequirePermission()` → migrate resolvers domain by domain. Never big-bang.

## 5. PHI exposure paths

| Path | State |
|---|---|
| `patients` list / `patient(id)` | Correctly org-scoped, patient-self-scoped, and clinician-restricted to treated patients. Good. |
| `createPatient` | **No caller context, no org stamping.** Until a patient's first appointment, `orgScope`'s `{appointments:{none:{}}}` branch makes their DOB and medical notes readable by staff in any org (`F-04`). |
| `Patient.appointments` resolve-field | **Unscoped.** Full cross-org appointment history for a resolvable patient (`F-05`). |
| `testResults` | Patient-scoped in code, but `orderTest` never writes `patient_id`, so the control is inert and results carry no patient linkage at all (`F-08`). Values are correctly withheld until `status === 'completed'`, server-side. |
| `myDataExport` | Exists and is self-scoped — a good start on a DPDP subject-access right, but it is a raw JSON dump with no format guarantee or audit record of the export. |

## 6. Payments

Razorpay is integrated properly where it counts: HMAC-SHA256 over
`order_id|payment_id` compared with `timingSafeEqual`, against a secret held only
in the environment. Three gaps:

1. `createRazorpayOrder` is `@Public()` (`F-07`) — anonymous order creation
   against any known appointment id.
2. **No webhook.** A payment that succeeds at Razorpay but whose browser
   callback never fires leaves the row `pending` with no reconciliation path.
   This is a money-correctness gap, not a security one, and it will happen.
3. No GST fields on `AppointmentPayments` (`F-17`) — patient invoices cannot be
   statutorily compliant.

## 7. Audit and compliance posture

`AuditLogInterceptor` writes a row per mutation, gated on the org's
`audit_log_enabled` flag. It records `user_id`, `action`, `resource`, `ip`. It
does **not** record `resource_id` or `details` (both columns exist and sit
empty), does not record the outcome, and writes an identical row for a succeeded
and a rejected mutation — so the trail cannot answer "what was changed" or "did
it succeed", which are the only two questions an audit trail exists to answer
(`F-10`).

Against India's DPDP Act 2023, the current posture has: encryption at rest for
credentials (good), a self-service data export (partial), org-level retention
settings (persisted), and audit logging (shallow). It lacks: consent artefacts
and purpose limitation, a documented retention/erasure job, breach-notification
tooling, a processor/sub-processor register, and any data-residency assertion
beyond the intent to host in `ap-south-1`. None of that is unusual at this
stage; all of it is required before a paying clinic's legal review.

## 8. Infrastructure

- `docker-compose.yml` defaults both JWT secrets to `change-me-in-production`
  and never passes `SETTINGS_ENCRYPTION_KEY`. Any environment started without a
  root `.env` signs tokens with a publicly known key — forgeable JWTs for any
  role and any org. Combined with the root `.env.example` still describing the
  abandoned MySQL/Nginx/Pusher stack, that environment is the *likely* one
  (`F-11`).
- No `helmet`, no CSP, no HSTS. CORS is correctly restricted to `FRONTEND_URL`.
- Throttling is a single global 100/60s bucket; `register`, `requestOtp`, and
  `requestPasswordReset` have no tighter limit (`F-12`).
- Stack traces and introspection are production-gated, which is correct, but
  nothing asserts `NODE_ENV` is a known value at boot.

## 9. Remediation order

Cheapest-first, because these are all small relative to their blast radius:

1. **F-11** — remove the default secrets (minutes).
2. **F-02** — delete the mock-auth branch (hours).
3. **F-01** — the shared `orgScope`/`isPlatformOperator` helper plus `@Auth()` on
   catalogue queries (a day, mostly mechanical).
4. **F-25** — the tenancy-matrix integration test, so 1 and 3 stay fixed (2–3
   days; this is the highest-leverage single item in the whole plan).
5. **F-04, F-05, F-06, F-07, F-08** — the specific scoping holes (a few days).
6. **F-09, F-10, F-12** — headers, audit completeness, auth-family throttles.
7. **F-03** — permission enforcement, as its own requirement.
