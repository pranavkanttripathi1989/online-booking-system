---
id: TP008
type: technical-plan
feature: project-plans
created: 2026-08-27
updated: 2026-08-27
status: active
---

# 08 — Front-end ↔ back-end integration contract

How the two tracks of a slice stay joined. Read alongside
`05-cross-cutting-conventions.md` (backend module scaffolding) and
`FRONTEND_RULES.md` (frontend rules).

**Why this document exists.** This codebase has shipped backend-only batches
twice. Both needed a frontend catch-up pass, and both catch-up passes found real
bugs that existed *only* because the halves shipped apart:

| Real defect | Root cause | Cost |
|---|---|---|
| `redeemPackageSitting` called with two scalars instead of a wrapped `input` | Frontend guessed the argument shape | **Feature never once functional** from the day it shipped |
| `AppointmentUpdateInput` had no `end_datetime`; the page sent one unconditionally | Frontend assumed a field | **Every "Save Changes" on `appointments/edit.jsx` failed, always** |
| `/admin/payers`, `/admin/rights-requests` gated `admin`-only | Frontend gate narrower than the resolver's `@Auth` | Real managers got a 403 before reaching the route |
| `createSpacerBlock` excluded `'clinician'` while its sibling read query allowed it | Backend widened the read, never the write | Rebuilt page would have 403'd for every clinician |
| Missing `refetchQueries` after saving a favourite drug-set | No cache invalidation | Stale UI after a successful mutation |

Every one of these is a **contract** failure, not a coding failure. None would
have survived a slice where both halves were written together.

---

## 1. The contract-first rule

> **Before writing either half, write down the contract. Then check it against
> the code that already exists.**

`FRONTEND_RULES.md` **ARCH-15** states the frontend half; `CLAUDE.md` hard rule 7
states the backend half. They are the same rule from two directions.

### The five things to pin, in order

| # | Decide | Where the answer lives | Failure if skipped |
|---|---|---|---|
| 1 | **Which dialect** | `src/graphql/{queries,mutations}.js` = canonical **snake_case**, page-based `{data, paginatorInfo}` · `backend/src/public/**` = **camelCase**, `getX`-prefixed | Field names silently don't match; `undefined` three components deep |
| 2 | **Response convention** | Three coexist deliberately: entity-direct · `{success, userErrors}` · `{success}` only. Match what the consuming page already expects | Error handling reads the wrong shape |
| 3 | **Argument shape** | Wrapped `input` object vs. positional scalars — read the resolver verbatim | The `redeemPackageSitting` bug above |
| 4 | **Auth gate** | The resolver's `@Auth(...)` list **is** the frontend route's allowed roles | The `/admin/payers` bug above |
| 5 | **Invalidation** | Which lists this mutation changes | Stale UI after success |

**Do not invent a "reasonable" contract.** Both dialects and all three response
conventions are deliberate and matched to already-live consumers. There is no
prize for consistency here — only for matching.

---

## 2. Slice shape: how the two tracks interleave

```
1. CONTRACT      Both     Write the 5 decisions above into the PLAN### doc.
                          Read the real resolver / real src/graphql file. Do not
                          proceed on memory.
2. SCHEMA        BE       Prisma model + hand-written migration. Indexes from the
                          real where/orderBy — selective column first, never lead
                          a composite with client_org_id.
3. SERVICE       BE       orgScope/orgScopeVia/orgIdForWrite. Never a ternary.
                          Cross-tenant rejection test that would fail against
                          wrong code.
4. RESOLVER      BE       DTO with >=1 class-validator decorator per @Field.
                          @Auth list = the frontend's allowed roles (step 1.4).
5. INTROSPECT    BE       Confirm the field reached the RUNNING schema:
                          curl .../graphql -d '{"query":"{ __type(name:\"Query\")
                          { fields { name } } }"}'
                          A clean tsc and a correct schema.gql on disk do NOT
                          prove this — a watch-mode race can silently drop it.
6. WIRE          FE       Page/component against the contract from step 1.
                          Five states. Tier declared. Invalidation from 1.5.
7. VERIFY        Both     BE: unit + integration. FE: unit + e2e round trip.
                          The e2e is the only thing that proves the contract.
8. DOCS          Both     REQ/PLAN/TP/TR + context bundle + five root indexes.
```

**Step 5 is not optional ceremony.** A silent module-recompile race has been hit
twice in this repo: `tsc --noEmit` clean, `schema.gql` on disk correct, startup
log says "successfully started" — and the new field is absent from the running
schema, with zero error signal anywhere. The only detection is introspecting the
live server.

**Step 7's e2e requirement is what actually catches contract drift.** Unit tests
on both sides can pass with mutually incompatible assumptions — mocked-Prisma
backend tests and MockedProvider frontend tests each verify their own half's
belief about the contract. Only a real HTTP round trip verifies the contract
itself. Every defect in the table above was found by a real round trip, and none
by a unit test.

---

## 3. Pagination contract

Established by `AppointmentPaginatedType`, extended by `REQ133` (testResults) and
`REQ134` (notifications).

**Backend** — each domain gets its **own** dedicated paginator type, not a shared
generic:

```ts
$transaction([count, findMany({ skip: (page-1)*first, take: first })])
lastPage  = Math.max(1, Math.ceil(total / first))
firstItem = total === 0 ? 0 : (page - 1) * first + 1
```

**Frontend** — `{ data { ... } paginatorInfo { ... } }`, and `first` always
supplied explicitly.

**The decoupled-count trap.** When a list becomes paginated, any UI element
needing a *true total* — an unread badge, a "N pending" chip — must get its own
dedicated `count()` query. A client-side `.filter().length` over a now-bounded
list silently under-reports. This was a real bug in `NotificationBell.jsx`: the
badge showed only what the dropdown had fetched. `REQ134` fixed it with a
separate `unreadNotificationCount` query.

---

## 4. Auth-gate parity

The most repeated cross-track defect: **three shipped instances** of a frontend
route gated narrower than its own resolver.

**The rule:** the resolver's `@Auth(...)` list is the authoritative role set.
The frontend route gate must equal it — not be a subset "to be safe". A narrower
frontend gate is not defence in depth; it is a silent lockout of legitimate
users, and it always presents as "the app is broken for managers".

```bash
# Do this in every slice that adds or changes a route:
grep -n "@Auth" backend/src/<domain>/<domain>.resolver.ts
grep -n "<route-path>" frontend/src/App.jsx        # and the RoleGuard block it sits in
grep -n "<label>" frontend/src/layouts/AppShell.jsx   # NAV_CONFIG must match too
```

Two related traps:

- **`SEC-18`** — a frontend gate is UX, never security. The server must enforce
  independently. Both are required; neither substitutes.
- **`isPlatformOperator()` semantics** — `admin`/`super_admin` are treated as
  platform-wide *unconditionally*. So a resolver gated to only those two roles
  makes its own `isSameOrg()` rejection **unreachable dead code**, and a
  "rejects cross-org X" test passes vacuously. If a mutation has a cross-org
  check, its gate must include a genuinely org-scoped role (`manager`) — or the
  check should not exist. This shipped on two domains before being caught.

---

## 5. Role vocabulary

`receptionist` **is not a real role.** The seeded role is `staff`
(`backend/prisma/seed.ts`'s `ROLES`). `receptionist` keeps getting reintroduced
because it reads plausible, and has caused three separate live bugs — a sidebar
badge showing "Patient" for staff, a grey "Unknown" chip, and a missing "Add
Clinician" button.

**Key every new role-keyed map from `seed.ts`, never from an existing frontend
map** — several existing maps are themselves wrong.

---

## 6. Money, dates, addresses

| Concern | At rest / on the wire | At the display boundary |
|---|---|---|
| Money | **paise, `Int`** | rupees, ₹ + Indian grouping (`FORM-18`) |
| Time | **UTC ISO-8601** | IST, 12-hour for patients / 24-hour for dashboards (`BOOK-8`, `BOOK-9`) |
| Date display | — | `Wed, 26 Aug` — never `26/08` (`BOOK-10`) |
| Address | `{line1, line2, city, state, pincode, country}` | pincode-first entry (`FORM-11`) |

Two known inconsistencies, documented not silently patched: `Clinics` still uses
the older flat Western shape (`address`/`city`/`postcode`), unlike
`ClientOrganizations`/`Patients`. And the backend splits names into
`first_name`/`last_name`, which `FORM-12` bans — a real rules-vs-schema conflict
needing a product decision.

---

## 7. Test-layer division of labour

| Layer | Proves | Cannot prove |
|---|---|---|
| BE unit (mocked Prisma) | The `where` a service *built* | That the DB accepts it, or that the frontend sends a matching shape |
| BE integration (real PG, real HTTP, real guards) | Tenancy isolation for real | Anything about the UI |
| FE unit (MockedProvider) | Component behaviour given an *assumed* response | That the assumption matches the server |
| **FE e2e (real backend)** | **The contract** | Fine-grained edge cases cheaply |

**Two documented consequences:**

1. A mocked-Prisma test asserting the built `where` **can never fail an isolation
   check** — which is exactly how `F-01` and all twelve `BUG006` instances
   shipped green. Tenancy needs a `domain-cases.ts` row, not a unit test.
2. An undecorated `@InputType` field is **silently deleted** by the global
   `ValidationPipe` (`whitelist: true`) then rejected by
   `forbidNonWhitelisted: true` — invisible to any mocked test, only reachable
   through a real HTTP request. Four instances found this way.

**Therefore:** every slice touching a contract needs at least one real round trip.

---

## 8. Slice-completion checklist

```
CONTRACT
[ ] Dialect chosen and matches the consuming page
[ ] Response convention matches what the page expects
[ ] Argument shape read verbatim from the resolver (not assumed)
[ ] Resolver @Auth list == frontend route gate == AppShell NAV_CONFIG
[ ] Invalidation targets identified

BACKEND
[ ] orgScope/orgScopeVia/orgIdForWrite — never a ternary
[ ] Cross-tenant rejection test that would fail against wrong code
[ ] Every new @Field has >=1 class-validator decorator
[ ] Migration read end-to-end against the schema diff
[ ] Indexes from real where/orderBy; selective column first
[ ] tenancy-matrix row added if a new tenant-scoped domain
[ ] New field confirmed present in the RUNNING schema by introspection

FRONTEND
[ ] Tier declared; verified at that tier's widths
[ ] Five states: loading / empty / error / stale / success
[ ] Mutation invalidates its lists (DATA-9)
[ ] No mock fallback on an empty result (DATA-13)
[ ] Theme tokens only (UI-2); icon buttons have aria-label (A11Y-5)
[ ] Lint ratchet not increased

JOINT
[ ] One real e2e round trip through the new contract
[ ] REQ/PLAN/TP/TR + context bundle + five root indexes
[ ] Committed code-then-docs, conventional message
```
