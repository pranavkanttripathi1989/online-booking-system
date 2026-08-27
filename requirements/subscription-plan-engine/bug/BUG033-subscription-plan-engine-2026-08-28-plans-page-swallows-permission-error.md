---
id: BUG033
type: bug
feature: subscription-plan-engine
created: 2026-08-28
updated: 2026-08-28
status: open
parent: null
related: []
---

# BUG033 — `/admin/plans` silently swallows its own real permission error and shows an empty, fully-usable page instead

## Source

Found live during a Chrome-DevTools-driven admin-role QA sweep, logged
in as `admin@medibook.dev` (not `super_admin`) — `plans`/`createPlan`/
etc. are all correctly `@Auth('super_admin')`-only
(`backend/src/plans/plans.resolver.ts`).

## What's wrong, exactly

The page (`frontend/src/pages/admin/Plans.jsx`) **does** have real,
intentional permission-denied handling built in:

```
const insufficientPermission = loadError && /permission/i.test(loadError)
...
{insufficientPermission && (
  <Alert severity="info">Your account doesn't have <code>super_admin</code> access...</Alert>
)}
```

This code path never fires. Confirmed via the real network response:
`GetPlans` returns exactly the error this check is designed to catch —

```json
{"errors":[{"message":"You do not have permission to perform this action", ...}], "data": null}
```

— yet the page rendered "No plans yet" (an ordinary empty state) with
**no alert at all**, and the "New Plan" button stayed fully clickable.
Root cause: `load()`'s `client.query({...})` call sits inside a
`try/catch`, assuming a GraphQL error throws — but this app's Apollo
Client (`frontend/src/apollo/client.js` lines 140–144) sets
`errorPolicy: 'all'` as the **global default** for every `query`/
`watchQuery`. Under `errorPolicy: 'all'`, Apollo never rejects on a
GraphQL error; it resolves normally with `{ data: null, errors: [...] }`
and expects the caller to check `result.errors` explicitly. `Plans.jsx`
never does — `catch (err) { setLoadError(err.message) }` is unreachable
dead code for this query, and `setPlans(data?.plans ?? [])` silently
becomes `setPlans([])`, exactly the `DATA-13` shape ("never fall back
to an empty/fabricated state on a genuine error").

Downstream effect confirmed live: since `loadError` never gets set, the
"New Plan" button (never gated on permission at all — a second,
independent gap) opens a full create form for an account that can never
successfully submit it; clicking "Create Plan" only then surfaces the
real error ("You do not have permission to perform this action"),
after the admin has already filled out the whole form.

**Worth a wider look, not scoped into this bug**: any other page in
this codebase using the identical `client.query(...)` + `try/catch`
pattern, assuming a GraphQL error throws, has the same dead-code
problem given this app's own global `errorPolicy: 'all'` default — this
was only confirmed on this one page during this pass.

## Acceptance criteria

- `load()` checks the query result's own `errors`/`data` explicitly
  (not a `try/catch` around `client.query`), so `insufficientPermission`
  actually fires when the real backend rejection it's designed to
  detect occurs.
- The "New Plan" button (and any per-row action) is hidden or disabled
  — not just eventually rejected on submit — for a caller who isn't
  `super_admin`, matching `/admin/payers`'s own correct precedent for
  the identical "this whole page is one role's job" scenario.
- Recommended, separate follow-up: audit other `client.query(...)` +
  `try/catch` call sites for the same dead-error-path shape, given the
  app-wide `errorPolicy: 'all'` default.
