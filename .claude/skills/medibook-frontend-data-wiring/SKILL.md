---
name: medibook-frontend-data-wiring
description: Wire a React page to the real GraphQL backend in this repo, and detect pages that render fabricated data — a bug class that four separate grep-based audits walked past. Use when building or reviewing any page that displays data, investigating why a screen shows wrong/empty/stale values, removing mock dependencies, or asked whether a page is "real". Triggers on "mock", "mocks/store", "fake data", "hardcoded array", "useState([])", "is this page real", "wire up", "Apollo", "useQuery", "cache-first", "stale data", "empty state".
metadata:
  origin: project-specific
  vetted: >-
    Written 2026-08-22 from this repository's own audit findings
    (project-plans/02-findings-register.md F-18 and F-21). The 14-page list
    was produced by checking every JSX file for any GraphQL reference at all,
    which is what the prior grep-for-an-import audits structurally could not
    see.
---

# MediBook frontend data wiring

`CLAUDE.md` Hard Rules 7 and 8.

## 1. The detection method that actually works

Four separate audits searched for a `mocks/store` **import** and pronounced the
sweep complete. Fourteen routed pages never had one — they hardcode arrays
inline or use `useState([])` — so they were structurally invisible to that check
and shipped fabricated data.

**Ask the right question:** not "does this file import the mock store?" but
**"does this page reference any GraphQL operation at all?"**

```bash
# Any page that renders data but references no GraphQL operation
for f in $(find src/pages -name "*.jsx"); do
  grep -qE "useQuery|useMutation|useLazyQuery|useSubscription|gql\`" "$f" || echo "$f"
done
```

Then cross-check the survivors against `ls backend/src/` — a page with no
GraphQL call *and* an existing backend module is a live bug, not a to-do.

## 2. Known-fabricated pages (F-18)

Eleven of these have a real, working backend module sitting unused:

| Page | Backend that exists |
|---|---|
| `pages/analytics/index.jsx` | `analytics` |
| `pages/patients/detail.jsx` (1,013 lines) | `patients` |
| `pages/clinician/Patients.jsx` (`MOCK_PATIENTS`) | `patients`, clinician-self-scoped |
| `pages/staff/Dashboard.jsx` | `dashboard` / `appointments` |
| `pages/staff/Appointments.jsx` (`MOCK_APPOINTMENTS`) | `appointments` |
| `pages/patient/Appointments.jsx` | `appointments`, self-scoped |
| `pages/patient/Profile.jsx` | `account` / `patients` |
| `pages/manager/Billing.jsx` | `appointment-payments` |
| `pages/auth/forgot-password.jsx` | `requestPasswordReset` |
| `components/Settings/NotificationTemplates.jsx` | `email-templates` |
| `pages/public/landing.jsx` | `public` (partly) |
| `components/GlobalSearch.jsx` (`MOCK_DATA`) | **none** — needs a search resolver |
| `pages/tasks/index.jsx` | **none** — no domain |
| `pages/waiting-room/index.jsx` | **none** — `REQ019` builds it |
| `pages/onboarding/index.jsx` | **none** — `REQ014` builds it |

`patients/detail.jsx` is the most serious: a 1,013-line clinical detail page —
documents, diagnoses, letters — driven entirely by `useState([])`. A clinician
opening a real patient sees an **empty but authoritative-looking** clinical
record. In a healthcare product that is the highest-trust-damage defect class
there is. Prefer an honest error or empty state over plausible fiction.

For the three with no backend: build the domain or remove the route. Do not
leave them reachable.

## 3. Read the contract before writing anything

Hard Rule 7. Two GraphQL dialects and three mutation-response conventions
coexist deliberately. Open the consuming page's `gql` **verbatim** first —
field names, nullability, argument shape, response shape.

- Admin/staff pages import `frontend/src/graphql/{queries,mutations}.js` — **snake_case**, `{data, paginatorInfo}` pagination.
- Patient-facing pages (`public/`, `booking/`, `video/`) use their own inline `gql` — **camelCase**, `getX`/`getXs` names.

Real bugs from skipping this: a returned `token` the frontend read as
`access_token`; a type that had to be named exactly `User` not `AuthUser` to
satisfy a fragment; `LOGOUT_MUTATION` expecting a bare scalar not an object.
Full detail: the `medibook-graphql-contracts` skill.

## 4. Never fall back to fabricated data on error

The pattern to avoid, which caused real live defects:

```jsx
// WRONG — an empty *successful* result renders fake rows
const rows = apiRows.length > 0 ? apiRows : MOCK_ROWS;
```

This was live-confirmed: filtering appointments by `status=no_show` (zero real
matches) rendered 3 fabricated patients. A real, correct, empty result is not an
error — it is the answer.

```jsx
// RIGHT
const { data, loading, error } = useQuery(APPOINTMENTS_QUERY, { variables });
if (loading) return <Skeleton />;
if (error)   return <ErrorFallback error={error} onRetry={refetch} />;
const rows = data?.appointments?.data ?? [];
if (!rows.length) return <EmptyState … />;   // honest empty state
```

Use the existing shared components — `Skeletons`, `EmptyState`,
`ErrorFallback` — rather than inventing per-page states.

## 5. Apollo defaults work against you (F-21)

`apollo/client.js` sets, globally:

- `fetchPolicy: 'cache-first'` — lists serve **stale** data after a mutation unless you refetch explicitly.
- `errorPolicy: 'all'` — partial errors resolve as **success**, so `error` is falsy while `data` is incomplete.

Consequences to handle per query:

- After any mutation, either `refetchQueries` or update the cache. Don't assume the list re-reads.
- For lists where freshness matters, pass `fetchPolicy: 'cache-and-network'` at the call site.
- Check `data?.field` is actually populated, not just that `error` is falsy.

There is also a `console.debug('[MediBook] Backend offline — using mock data.')`
in the error link. That message is now misleading — treat a network error as a
real error to surface, not a cue to fabricate.

## 6. Self-scoped data: an empty result is often correct

The backend fails closed by design. A `patient`/`clinician` account not linked
to a `Patients`/`Clinicians` row gets **empty**, never "everyone" — both seeded
demo accounts are in that unlinked state. After the F-01 fix, an org-less
non-platform account also correctly gets empty.

So when a page shows nothing: check whether the backend is *correctly* returning
nothing for that caller before assuming the wiring is broken.

## 7. Checklist

- [ ] Page references a real GraphQL operation (§1 command passes).
- [ ] Contract read verbatim from the consuming page before writing the resolver.
- [ ] Correct dialect and mutation-response convention for the domain.
- [ ] `loading` / `error` / empty states all handled with the shared components.
- [ ] **No** `x.length > 0 ? x : MOCK` fallback anywhere.
- [ ] Mutation invalidates or refetches what it changed.
- [ ] Verified against the real backend, not mocks — and at the screen's responsive tier (`medibook-responsive-mobile`).
