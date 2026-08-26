---
id: BUG021
type: bug
feature: clinician-dashboard
created: 2026-08-25
updated: 2026-08-25
status: open
parent: null
related: []
---

# BUG021 — The clinician role's own dashboard is fabricated end to end

## Severity

S1. `pages/clinician/Dashboard.jsx` is the first screen a `clinician`-role
user sees after logging in. It has never actually worked: its read query
is guaranteed to fail GraphQL validation on every request, its fallback
hides that failure behind a fully-rendered, plausible-looking fake
dashboard instead of an error, and its two write actions ("Save Block",
"Mark Complete") only ever mutate local React state — nothing a clinician
does on their own dashboard today reaches the database.

## How this was found

`project-plans/analysis/08-integration-gap-analysis.md` (finding B-1), a fresh
sweep cross-checking every backend operation against real frontend usage
and re-classifying every remaining `mocks/store`/`useMockData` import
under `frontend/src/pages`. `clinician/Dashboard.jsx` still importing
`useMockMutation` warranted opening the file, which led to reading its
own GraphQL query field-by-field against the real schema.

## The three compounding defects

### 1. The read query targets the wrong (public, unauthenticated) dialect, with fields that don't exist on the real return type

`Dashboard.jsx:23-42`:

```graphql
query GetClinicianDashboardData($clinicianId: ID!, $today: String!) {
  getClinician(id: $clinicianId) { id name clinicianType clinic { id name } }
  getAppointments(clinicianId: $clinicianId, date: $today) {
    id startTime endTime duration status type
    patient { id firstName lastName }
    product { id name }
  }
  getSpacerBlocks(clinicianId: $clinicianId, date: $today) { id startTime endTime duration reason }
  getLunchBreaks(clinicianId: $clinicianId) { id startTime endTime duration }
}
```

`getClinician`/`getAppointments` are **not** authenticated internal
queries — they are `backend/src/public/public.resolver.ts:29-45`'s
`@Public()`, zero-authentication, patient-self-serve booking-availability
surface, meant for an anonymous visitor browsing a doctor's public
profile before logging in. Worse, the real return type for
`getAppointments`, `PublicAppointmentSlotType`
(`backend/src/public/entities/public.entity.ts:93-97`), has **only**
`id`, `startTime`, `endTime` — none of `duration`, `status`, `type`,
`patient`, or `product` exist on it. Requesting fields that don't exist
on the resolved type is a GraphQL validation error, on every single
request, in every environment, unconditionally.

`getSpacerBlocks`/`getLunchBreaks` are, by contrast, **already correct**
— `backend/src/blocks/blocks.resolver.ts:30-41`'s own comment confirms
this exact page was the intended, already-fixed, properly self-scoped
caller (`@Auth('manager', 'admin', 'super_admin', 'clinician')`, scoped
to the caller's own `clinician_id`). Only the two `public` dialect fields
need replacing.

### 2. The fallback hides the failure instead of surfacing it

`Dashboard.jsx:203`: `const isMock = !data`. Because defect #1 guarantees
`data` is never populated (the query always fails validation), and
because `useQuery` is additionally `skip: !user?.id` (true for any
clinician account not yet linked to a real `Clinicians` row —
`CLAUDE.md`'s own documented current state for the seeded demo account),
`isMock` is permanently `true`. The page renders `MOCK_APPOINTMENTS`,
`MOCK_SPACERS`, `MOCK_LUNCH` — fully-formed, plausible sample data — with
no error banner, no stuck spinner, nothing to signal anything is wrong.

### 3. Both write actions are local-only, not degraded reads — fabricated writes

`Dashboard.jsx:159-166`:

```js
const [createSpacerBlockMutation, { loading: savingBlock }] = useMockMutation(
  async (block) => ({ id: `local-${Date.now()}`, ...block })
);
const [markCompleteMutation, { loading: markingComplete }] = useMockMutation(
  async (id) => ({ id, status: 'completed' })
);
```

Both resolve to a synthetic object built entirely in-memory. The code's
own comment ("same `createSpacerBlock` shape the real mutation would
have **once a backend endpoint exists**") is stale: real, tested,
already-correctly-used-elsewhere mutations already exist —
`backend/src/blocks/blocks.resolver.ts:44` (`createSpacerBlock`, used
correctly by `manager/Blocks.jsx`) and
`backend/src/appointments/appointments.resolver.ts` (`completeAppointment`,
used correctly by the appointment-detail/queue complete flow). A
clinician clicking "Save Block" or "Mark Complete" on their own dashboard
today sees a success toast and a state update that silently reverts on
the next refresh or `refetch()` — nothing was ever written.

## Why this survived every prior audit

Every earlier "is this page real" sweep (`BUG009`,
`scripts/check-page-data-wiring.mjs`, the Priority-3 mock-removal passes)
correctly asks "does this page have *any* GraphQL reference at all" —
and this page does; it has four `useQuery` field references and two
mutation hooks, so no prior grep-based or structural check ever flagged
it. None of those checks validate *whether the referenced fields exist
on the schema the query is actually validated against*, which is
specifically how this page is broken — a defect class distinct from
every previously-found instance of this bug family.

## Fix (see `PLAN083` for the implementation detail)

Rebuild the dashboard's data layer against real, already-authenticated,
already-correctly-self-scoping primitives this role already uses
correctly elsewhere in the app:

- Replace `getClinician`/`getAppointments` with the real `appointments(...)`
  query (self-scoped via the JWT's own `clinician_id`), the same
  primitive `clinician/Calendar.jsx`'s `GET_WEEK_APPOINTMENTS` already
  calls correctly, filtered to today's date.
- Keep `getSpacerBlocks`/`getLunchBreaks` — they are the correct, real,
  already-fixed resolvers for this exact caller.
- Replace both `useMockMutation` calls with the real
  `createSpacerBlock`/`completeAppointment` mutations.
- Remove the `isMock`/`MOCK_APPOINTMENTS`/`MOCK_SPACERS`/`MOCK_LUNCH`
  fallback path entirely — a genuine query error or an unlinked
  clinician account should show a real empty/error state, not fabricated
  data, matching this codebase's own established convention everywhere
  else.

## What this does not close

- The seeded `clinician@medibook.dev` demo account is still unlinked to a
  real `Clinicians` row by default (a separate, already-documented,
  pre-existing state) — this fix makes the page behave *correctly* for
  that state (a real empty/prompt state) rather than *silently faking
  data* for it; it does not link the demo account.
- No other role's dashboard shares this defect (`staff`, `manager`,
  `patient` were each individually re-verified during this analysis to
  use real, correctly-named, authenticated queries) — this is scoped to
  `clinician/Dashboard.jsx` alone.
