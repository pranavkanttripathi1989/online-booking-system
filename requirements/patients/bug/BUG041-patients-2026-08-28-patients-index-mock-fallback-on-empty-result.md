---
id: BUG041
type: bug
feature: patients
created: 2026-08-28
updated: 2026-08-28
status: done
parent: null
related: [BUG040]
---

## Resolution (2026-08-28, `PLAN208`)

`useMock` changed from `apiPatients.length === 0 && !loading` to `!!error`
— matching the established `appointments/index.jsx`/`calendar/index.jsx`
fix precedent exactly. The page already had a real, contextual empty
state (`No patients match "..."` / `No patients starting with "..."` /
`No patients found`) that simply never rendered before, since the mock
fallback always intercepted a genuine empty result first. The
merge-duplicates real-vs-mock branch (`handleConfirmMerge`) needed no
separate change — it already reads the same `useMock` flag.

Not touched, a separate pre-existing gap: for real data, the
gender/archived/letter filters are client-side-only in mock mode —
`PATIENTS_QUERY` has no server-side args for them at all, so they
already had no effect on real results before this fix either. Out of
this bug's scope; logged here for whoever picks that up next.

Live-verified as `admin@medibook.dev`: real data still shows correctly
("137 patients"); searching for a string matching nothing now shows the
real `No patients match "..."` empty state, not the fabricated "Alice
Johnson"/"Bob Smith" mock list.

# BUG041 — `/patients` falls back to hardcoded mock patients on any genuine empty result, not just a real query error

## Source

Found live while diagnosing `BUG040` (the e2e seed's patients were
invisible to any org-scoped account because of a missing
`client_org_id`). Before that fix, `manager@medibook.dev`'s `/patients`
page showed "14 patients" — Alice Johnson, Bob Smith, Carlos Reyes, Diana
Prince, etc. — while the real backend genuinely, correctly, and
error-free returned zero rows for that org.

## What's wrong, exactly

`frontend/src/pages/patients/index.jsx` line 463:

```js
const { data, loading, error, refetch } = useQuery(PATIENTS_QUERY, {
  variables: { search: debouncedSearch || undefined, first: rowsPerPage, page: page + 1 },
  fetchPolicy: 'cache-and-network',
  errorPolicy: 'all',
})

const apiPatients = data?.patients?.data ?? []
const apiTotal = data?.patients?.paginatorInfo?.total ?? 0

// Fall back to mock if backend unavailable
const useMock = apiPatients.length === 0 && !loading
```

`error` is destructured from `useQuery` but never consulted in the
`useMock` condition — the comment ("Fall back to mock if backend
unavailable") describes intent, not what the code actually does. The
real condition is "the real query returned zero rows and isn't still
loading," which is exactly as true for a genuine, correct, empty result
(a brand-new org with no patients yet, a search that legitimately
matches nothing, or — as confirmed live via `BUG040` — a real backend
returning `total: 0` for a real org) as it is for a real outage.

This is the same bug class `FRONTEND_RULES.md` DATA-13 names directly
("`rows.length > 0 ? apiRows : mockRows` is a defect — it renders fake
patients whenever a real filter legitimately matches nothing. This
shipped live on two pages.") and that CLAUDE.md's own Priority 3 sweep
already fixed on `appointments/index.jsx` and `calendar/index.jsx` by
gating on `error` only — `patients/index.jsx` was evidently missed by
that pass, or regressed since.

The merge-duplicates flow (`handleConfirmMerge`, same file) branches on
this same `useMock` flag to decide between a real `mergePatients`
mutation and a purely local-state simulation — so the same false
"backend unavailable" misclassification also silently routes merge
actions into the fake, non-persisted code path whenever a real search
or filter happens to match zero patients.

## Acceptance criteria

- `useMock` (or its replacement) is gated on `error` only, matching the
  established fix pattern from `appointments/index.jsx`/
  `calendar/index.jsx` — a genuine empty result renders the page's real
  empty state (with a next action, per `FRONTEND_RULES.md` STATE-4), not
  fabricated patients.
- The merge-duplicates flow's real-vs-mock branch is re-verified against
  the corrected condition, so a legitimate empty search result can no
  longer route a merge into the non-persisted local-state simulation.
- Live-verified: a search that legitimately matches zero real patients
  renders an honest empty state, not `MOCK_PATIENTS`.
