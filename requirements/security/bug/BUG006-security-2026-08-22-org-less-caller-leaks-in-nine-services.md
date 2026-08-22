---
id: BUG006
type: bug
feature: security
created: 2026-08-22
updated: 2026-08-22
status: done
parent: BUG004
related: [F-01, BUG007, PLAN028, TP055, TR054]
---

# BUG006 — The F-01 "org-less caller sees everything" pattern survived in twelve more services

## Severity

**S1.** Two of the twelve were live-exploitable by an account that anyone on the
public internet can create in a single unauthenticated GraphQL call. One of the
two discloses medical data.

## Summary

`BUG004` fixed F-01 by introducing `backend/src/common/scoping/tenant-scope.ts`
and migrating the services that had been found by hand. It did not, and could
not, find every instance — the search was manual, and the defect has three
different spellings that a single grep does not catch:

| Spelling | Why it leaks |
|---|---|
| `user.client_org_id ? { client_org_id: … } : {}` | spreads to nothing — no filter |
| `client_org_id: user.client_org_id ?? undefined` | Prisma treats `undefined` as "key not supplied" — no filter |
| `clinic: user.client_org_id ? { … } : undefined` | same, on a relation filter |
| `if (user.client_org_id && …) { throw }` | the guard itself is skipped when the org is null |

All four read "this caller has no organisation" as "this caller may see every
organisation". That inference is F-01 exactly. It was safe only while the sole
way to hold a null org was to be seeded as a platform operator, and
`auth.service.ts` `register()` ended that: it creates a `UserProfiles` row with
the `patient` role and **no `client_org_id`**, for anyone who asks.

## The two live leaks

Both were reproduced over real HTTP against a real PostgreSQL by the tenancy
matrix built in `BUG007`/`PLAN028`, before any fix was applied — not by
inspection. Raw output in `TR054`.

### 1. `messageableContacts` — the full user directory of every tenant

`messages.resolver.ts` carries **no `@Auth()` and no `@Public()` on any of its
six operations**, so any authenticated caller reaches it.
`messages.service.ts:74` used the ternary spelling. A self-registered account
received the name and role of every user on the platform:

```
● tenancy matrix › messages: messageableContacts
    › patient (self-registered — NO org, NO patient link) -> empty

  Expected value: not "…u04"
  Received array: ["…u01","…u02","…u03","…u04","…u05","…u06","…u07"]
```

Seven of seven fixture users returned, spanning both tenants. Not a subset — the
whole directory.

### 2. `testResult(id)` — lab results across tenants

`test-results.resolver.ts:23` is also ungated. `findOne` failed twice over:

- `if (user.client_org_id && row.ordered_by && …)` — the **org check is skipped
  entirely** when the caller has no org. Fail-open.
- the patient self-scope beneath it compares `row.patient_id !== user.patient_id`.
  A self-registered patient has `patient_id: null`; a free-text result has
  `patient_id: null`; `null !== null` is `false`, so the check passes.

`CLAUDE.md` records that `TestResults.patient` is free text and `patient_id` an
optional FK, so null-`patient_id` is the *common* shape, not an edge case.

```
● tenancy matrix › single-record cross-tenant reads
    › test-results: testResult(id) with NULL patient_id,
      read by a self-registered account is not readable

  expect(received).toBeFalsy()
  Received: {"id": "…b12"}     ← org B's lab result
```

## The ten latent instances

Same defect, currently unreachable only because a role gate stands in front of
it. Recorded honestly: the matrix does **not** prove these, because a null-org
caller cannot reach them today. They are one `@Auth()` edit from live, and the
PRD adds ~40 more tenant-scoped tables that would copy whichever pattern they
find.

| Service | Sites | What it would expose |
|---|---|---|
| `appointment-payments` | 152, 175, 205 | every tenant's payment records |
| `analytics` | 28, 33 | cross-tenant aggregates and clinic list |
| `reviews` | 27 | patient names and free-text comments |
| `dashboard` | 27, 31, 47 | four separate scopes, all fail-open |
| `users` | 33, 70, 151, 214, 227 | user directory; **and two write paths** |
| `staff` | 35, 109 | staff directory; **and one write path** |
| `products` | 73, 135, 180 | three write paths |
| `services` | 82 | one write path |
| `cancellation-rules` | 47 | every tenant's cancellation policy |
| `appointments` | 102 | private `orgScope()` duplicating the ternary |

### The write-path variant is a different bug wearing the same clothes

`client_org_id: user.client_org_id ?? undefined` on a `create` is not a filter,
so it never leaks on read. It silently writes an **org-less row** — a record
belonging to no tenant, which (before `orgScope` landed) every tenant could then
see. `createRole` was the sharpest case: an org admin creating a custom role
produced a *global* role visible platform-wide.

This needed a helper that did not exist, so `tenant-scope.ts` gained one:

```ts
orgIdForWrite(user, entityLabel)   // platform operator → undefined (global row is legitimate)
                                   // anyone else with no org → ForbiddenException
```

## Why the existing suite could not catch any of this

All 641 unit tests mock `PrismaService` and assert the **shape of the `where`
object the service built**. That design cannot fail an isolation test — it never
runs a query. Worse, three specs had positively encoded the defect:

```ts
// users.service.spec.ts — before
expect(where).toEqual(expect.objectContaining({ client_org_id: undefined }));
//                                                            ^^^^^^^^^ the bug, asserted as correct
```

`reviews.service.spec.ts` did the same with `clinic: undefined`. Those
assertions would have failed on a *correct* implementation. They are rewritten
here to assert the real contract in both directions: the key is **absent** for a
platform operator, and **`'__no_org__'`** for a non-operator with no org.

## Fix

Every site migrated onto `orgScope` / `orgScopeVia` / `orgIdForWrite` /
`isPlatformOperator`. `test-results.findOne` was restructured rather than
swapped, because its two defects are independent.

A grep sweep now returns only two matches for the old spellings, both of which
are output-mapping rather than filters and are correct as they stand:
`appointments.service.ts:46` (`tenant_id` on the GraphQL response) and
`auth.service.ts:98` (building the JWT payload).

## Verification

- Tenancy matrix: **2 failed → 0 failed**, 115 assertions, real HTTP, real PostgreSQL.
- Backend unit suite: **645/645, 50 suites** (up from 641 — four new regression cases).
- `npx eslint` clean; `npx tsc --noEmit` clean.

## What this does not close

- The ten latent instances are fixed but **not matrix-proven**, because their
  role gates make them unreachable by the only null-org archetype that exists.
- `messages` and `test-results` still have **no `@Auth()` decorators at all**.
  This bug fixed the scoping; whether those resolvers should also be role-gated
  is a separate question and is not answered here.
- No CI, so none of this is enforced on the default branch yet (F-26).
