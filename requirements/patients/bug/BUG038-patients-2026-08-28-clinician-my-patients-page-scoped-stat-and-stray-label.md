---
id: BUG038
type: bug
feature: patients
created: 2026-08-28
updated: 2026-08-28
status: done
parent: null
related: [BUG029, BUG036]
---

## Resolution (2026-08-28, `PLAN204`)

Took the doc's own honest-label escape hatch rather than building new
backend aggregation for a single stat card: relabeled to "With Upcoming
(this page)" (was "With Upcoming (page)"). "Total Patients" was already
real (`data?.patients?.paginatorInfo?.total`) — only the stray label
text needed fixing. Live-verified as `clinician@medibook.dev`: the
stat card now reads "With Upcoming (this page)". See `TR224`.

# BUG038 — `/clinician/patients`: a stray developer label ("(page)") leaked into production, and the stat it's honestly describing is the wrong thing to show

## Source

Found live during a Chrome-DevTools-driven clinician-role QA sweep.
`frontend/src/pages/clinician/Patients.jsx` line 214:

```js
{ label: 'With Upcoming (page)', value: rows.filter((p) => p.nextAppt).length, color: '#E29578' },
```

The stat card literally renders **"With Upcoming (page)"** as its
label — a developer's own honest note-to-self that this count is
scoped to the current page's rows, not a real total, that was
apparently meant to stay a code comment and instead shipped as
user-facing copy.

## The same root cause this sweep has now found three times

This is the identical "a summary stat is computed from `rows`/the
current page's own fetched array, not a real total" shape as `BUG029`
(`/admin/users`'s "Total Users"/"Active Users") and `BUG036`
(`/manager/clinics`'s "Total Clinicians"/"Today's Bookings") — except
here the page's own author already knew and flagged it inline, which
is exactly why the label reads the way it does. Worth fixing this one
alongside those two rather than in isolation, since it's the same
underlying pattern recurring across at least three different pages/
features.

## Acceptance criteria

- The stat reflects a real total (patients with an upcoming
  appointment across all pages, not just the current page's rows) or,
  if a full aggregate genuinely isn't available without a new query,
  the label says something a real user would understand ("On this
  page" is honest and shippable; "(page)" appended to an otherwise
  clean label is not).
- When this is fixed, check whether `BUG029`/`BUG036` should be fixed
  in the same pass — same root cause, different files.
