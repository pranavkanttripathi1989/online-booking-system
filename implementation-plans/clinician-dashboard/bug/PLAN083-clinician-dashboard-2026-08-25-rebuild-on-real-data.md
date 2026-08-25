---
id: PLAN083
type: bug
feature: clinician-dashboard
created: 2026-08-25
updated: 2026-08-25
status: in-progress
parent: BUG021
related: []
---

# PLAN083 — Rebuild `clinician/Dashboard.jsx` on real, authenticated data

Technical implementation plan for `BUG021`. Grounded in reading the real
resolvers/services/entities below, not assumed shapes — every field name
here was confirmed against the actual `.entity.ts`/`.resolver.ts`/
`.service.ts`/`.input.ts` file before being written into this plan.

## Root cause recap (see `BUG021` for full evidence)

1. `getClinician`/`getAppointments` are the `@Public()` patient-self-serve
   dialect (`backend/src/public/public.resolver.ts`), and
   `getAppointments`'s real return type
   (`PublicAppointmentSlotType`) has only `id`/`startTime`/`endTime` — the
   query always fails GraphQL validation.
2. `isMock = !data` permanently masks that failure as fabricated sample
   data.
3. Both write actions (`createSpacerBlockMutation`, `markCompleteMutation`)
   are `useMockMutation` — local-only, never call the network.

## A fourth thing this plan additionally closes, found while scoping the fix

`backend/src/blocks/blocks.resolver.ts:43-47`'s real `createSpacerBlock`
mutation — the one this fix wires the "Add Block" button to — is gated
`@Auth('manager', 'admin', 'super_admin')` only. **`'clinician'` is not
in that list.** `getSpacerBlocks` (the sibling *read* query, same page)
was deliberately widened to include `'clinician'` with a self-scope check
(`blocks.resolver.ts:30-36`'s own comment: "`clinician/Dashboard.jsx` is
a real self-service caller") — but the matching *write* path was never
widened to match, the same "read got the check, create didn't" bug class
Hard Rule 6 already names for five other domains. Without this, a real
clinician could never actually save a block from their own dashboard even
after every other part of this fix lands — the mutation would 403 for
every clinician account, unconditionally. This plan fixes it the same
way `getSpacerBlocks` was fixed: widen `@Auth` to include `'clinician'`,
and add a service-level self-scope check mirroring
`getSpacerBlocks`'s own (`blocks.service.ts:82-84`) — a `'clinician'`
caller may only create a block where `input.clinician_id` equals their
own JWT `clinician_id`.

## Backend changes

### `backend/src/blocks/blocks.resolver.ts`

```diff
- @Auth('manager', 'admin', 'super_admin')
+ @Auth('manager', 'admin', 'super_admin', 'clinician')
  @Mutation(() => SpacerBlockMutationResultType)
  createSpacerBlock(@Args('input') input: CreateSpacerBlockInput, @CurrentUser() user: JwtPayload) {
```

### `backend/src/blocks/blocks.service.ts` — `createSpacerBlock`

Add the same self-scope guard `getSpacerBlocks` already uses, before the
existing org check:

```ts
async createSpacerBlock(input: CreateSpacerBlockInput, user: JwtPayload) {
  if (user.roles.includes('clinician') && input.clinician_id !== user.clinician_id) {
    return { success: false, userErrors: [{ message: 'Clinician not found' }] };
  }
  if (!(await this.assertClinicInOrg(input.clinic_id, user))) {
    ...
```

`updateSpacerBlock`/`deleteSpacerBlock` are **not** touched — the "Add
Block" feature on this page only ever creates; there is no edit/delete UI
on the clinician dashboard today (the `localSpacers`-only client-side
"remove" button for a not-yet-persisted block stays as-is, it never calls
a mutation).

### Unit tests — `backend/src/blocks/blocks.resolver.spec.ts` / `blocks.service.spec.ts`

- `createSpacerBlock`: a `'clinician'` caller passing their own
  `clinician_id` succeeds.
- `createSpacerBlock`: a `'clinician'` caller passing a **different**
  `clinician_id` is rejected with `success: false` (the actual security
  case this fix exists to prevent — without it, widening `@Auth` alone
  would let any clinician create a block *attributed to any other
  clinician in the org*).
- Existing `manager`/`admin`/`super_admin` create-path tests must stay
  green unmodified (no behavior change for those roles).

## Frontend changes — `frontend/src/pages/clinician/Dashboard.jsx`

### 1. New profile query — resolves the `AuthContext` caching bug locally

Same established pattern as the Privacy tab's `GET_MY_PATIENT_LINK`
(`context/platform-nfr-2026-08-24-phase-g2-frontend-completion/manifest.md`):
`LOGIN_MUTATION` never selects `clinician { ... }`, so a **freshly
logged-in** clinician's cached `user.clinician` is `undefined` until a
`ME_QUERY` refetch happens to occur — the identical class of bug
documented in `CLAUDE.md` for `user.patient.id`, not previously audited
for `user.clinician`. Rather than depend on `useAuth().user.clinician` at
all, add a dedicated `network-only` query that resolves it fresh on
mount:

```graphql
query GetMyClinicianProfile {
  me {
    clinician {
      id
      full_name
      clinician_type { name }
      clinics { id name }
    }
  }
}
```

`fetchPolicy: 'network-only'`, `skip: !isAuthenticated`. `clinicians[0]`
(the wrapped 0-or-1-element array — `ClinicianType.clinics`, see
`clinician.entity.ts:32`) supplies the clinic id needed for
`createSpacerBlock`'s required `clinic_id`.

If `me.clinician` comes back `null` (an unlinked clinician account, e.g.
the seeded `clinician@medibook.dev` demo user, `CLAUDE.md`'s own
documented current state), the page renders a real "Your account isn't
linked to a clinician profile yet — contact your admin" empty state,
**not** fabricated data — this is the correct terminal case defect #2
was hiding.

### 2. Real appointments query, replacing `getClinician`/`getAppointments`

Same primitive `clinician/Calendar.jsx`'s `GET_WEEK_APPOINTMENTS`
already uses correctly — self-scoped server-side to the caller's own
`clinician_id` by `appointments.service.ts`, no `clinicianId` argument
needed or accepted:

```graphql
query GetTodayAppointments($dateFrom: String!, $dateTo: String!) {
  appointments(filters: { date_from: $dateFrom, date_to: $dateTo }, first: 200) {
    data {
      id start_datetime end_datetime duration_minutes status type
      patient { id full_name }
      service { name }
    }
  }
}
```

`skip: !isAuthenticated` (does not depend on the profile query resolving
first — self-scoping happens via the JWT, not a client-supplied id).

### 3. Keep `getSpacerBlocks`/`getLunchBreaks` as-is

Already correct and already the intended caller. Only change: the
`clinicianId` variable now comes from the new profile query's
`me.clinician.id`, not `user?.id` (the **User** row's id — a
pre-existing, separate mismatch this fix also corrects: `user.id` was
never the right id for either of these two `clinicianId`-scoped queries
to begin with, it happened to still 404-safely reject via the resolver's
own `clinician.findUnique` + self-scope check rather than ever actually
returning wrong data, but it meant these two queries also never
worked for a real logged-in clinician even though they're individually
correct). Both queries: `skip: !clinicianId`.

### 4. A local mapping function, not a render-code rewrite

The real `AppointmentType` shape (`start_datetime` ISO datetime,
`duration_minutes`, `patient.full_name`, `service.name`) differs from
what the existing ~250 lines of timeline/drawer/queue render code expect
(`startTime`/`endTime` as `"HH:mm"` strings, `duration`, `patient.
firstName`/`lastName`, `product.name`). Rather than rewrite every render
call site (high risk, no functional benefit — this is page-local display
state, not a wire contract), add one mapping function at the top of the
data-processing section:

```js
const mapAppointment = (apt) => ({
  id: apt.id,
  startTime: dayjs(apt.start_datetime).format('HH:mm'),
  endTime: dayjs(apt.end_datetime).format('HH:mm'),
  duration: apt.duration_minutes,
  status: apt.status,
  type: apt.type === 'video' ? 'video' : 'in-person',
  patient: { id: apt.patient.id, full_name: apt.patient.full_name },
  product: apt.service ? { name: apt.service.name } : null,
});
```

Then every render site that currently reads `appt.patient.firstName`/
`appt.patient.lastName` switches to a single `patientInitials(full_name)`
helper (`full_name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).
join('').toUpperCase()`) and `appt.patient.full_name` directly — smaller
diff than threading two separate name fields through, and matches how
`clinician/Calendar.jsx` already renders its own real appointment data
(`patient.full_name`, not split first/last). Exact call sites to update
(all within this one file): the timeline card's name + tooltip (~line
440, ~463), the "Upcoming Next" panel's avatar/name (~line 535-545), the
queue list's name (~line 588), and the detail drawer's avatar initials +
name (~line 693-711).

### 5. Broaden the "scheduled" status filter

`STATUS_CFG` (already in this file) recognizes both `confirmed` and
`scheduled` as pre-completion states, but the existing filters only ever
checked `status === 'scheduled'`. Real appointment data can legitimately
be `confirmed` (`REQ018`/booking's own lifecycle). Fix:
`const isUpcomingStatus = (s) => s === 'scheduled' || s === 'confirmed'`,
used everywhere `scheduledApps`/`upcomingApps` is derived. Mock data
never exercised this because `MOCK_APPOINTMENTS` only ever used
`'scheduled'`.

### 6. Real write actions

```graphql
mutation CreateMySpacerBlock($input: CreateSpacerBlockInput!) {
  createSpacerBlock(input: $input) {
    success
    userErrors { message }
    spacerBlock { id start_time end_time reason }
  }
}
mutation CompleteMyAppointment($id: ID!) {
  completeAppointment(id: $id) { id status }
}
```

`handleSaveBlock` now builds the real `CreateSpacerBlockInput` shape
(`clinician_id`: the resolved profile id, `clinic_id`: `clinics[0].id`,
`block_date`: `todayStr`, `start_time`/`end_time`: the form's `HH:mm`
values, `reason`, `recurrence_type: 'single'`) and branches on
`success`/`userErrors` (this domain's real mutation-response convention
— `success/userErrors/entity`, per `05-cross-cutting-conventions.md`'s
own decision table) instead of unconditionally trusting a resolved
promise. On success, `refetch()` the spacer-blocks query rather than
hand-appending to `localSpacers` (the previous local-only merge pattern
becomes unnecessary once the mutation is real — `getSpacerBlocks` will
return the new row on refetch). On `userErrors`, show them in the
existing `snackbar` with `severity: 'error'` instead of assuming success.

`handleMarkComplete` calls `completeAppointment(id)` directly (this
domain returns the entity directly, no `success` wrapper — matches
`appointments/detail.jsx`'s own existing use of sibling appointment
mutations) and calls `refetch()` on the appointments query afterward
instead of `setLocalStatusOverrides` — the previous local-override map
existed only because the mock data had no real backing store to refetch
against.

### 7. Remove the fallback path entirely

Delete `isMock`, `MOCK_APPOINTMENTS`, `MOCK_LUNCH`, `MOCK_SPACERS`, the
`useMockMutation` import, and the "⚠ Offline — showing demo data" banner.
Replace with:
- A real `error` state (`Alert severity="error"` with a retry button
  calling `refetch()`) when the appointments query genuinely fails.
- The "unlinked clinician account" empty state from step 1 when
  `me.clinician` is `null`.
- Everything else renders from real, possibly-empty arrays — an empty
  today's schedule is a real, valid state ("No more appointments today"
  already exists as a render branch; it now also correctly covers "zero
  appointments today" from the start, not just "already worked through
  today's list").

## Testing plan (see `TP110`)

- Backend: the two new `blocks.service.spec.ts`/`blocks.resolver.spec.ts`
  cases above (clinician self-scope allow/deny on `createSpacerBlock`).
- Frontend: this page has no existing unit test file
  (`frontend/src/pages/clinician/Dashboard.jsx` — confirmed via
  `find frontend/src -iname "Dashboard*.test.*"` before writing this
  plan; none exists for any of the four role dashboards). Given the size
  of the rewrite, add a first one:
  `frontend/src/pages/clinician/Dashboard.test.jsx` — mocked Apollo
  `MockedProvider`, three cases: (a) real data renders (no offline
  banner, real patient name shown), (b) `me.clinician: null` renders the
  unlinked-account empty state, (c) a query error renders the real error
  state with a working retry button.
- e2e: new scenario in a fresh
  `frontend/e2e/clinician-dashboard.spec.js` — log in as a **linked**
  clinician (the existing dev-seed fixture, `Sarah Mitchell`/
  `8e9ed6bf-daf0-49cb-84f3-82c8c4ba80e7`, already used by other specs),
  confirm the dashboard shows her real today's appointments (not the
  literal mock names `Emma Wilson`/`Lily Chen`/etc.), add a real block via
  the drawer and confirm it appears after the dialog closes (persisted,
  not locally merged), mark a real scheduled appointment complete and
  confirm its status updates and survives a page reload (proving the
  write actually persisted, not just updated local state).
- Full Hard Rule 3 suite before commit: backend `npm test` + `test:int` +
  lint + `tsc --noEmit`; frontend lint + unit + `npm run build`; the new
  e2e spec green against the real backend.

## Sequencing note

This is `BUG021`/`PLAN083` under a new `clinician-dashboard` feature
slug — deliberately not folded into `platform-nfr` (the slug used for
the two prior frontend-completion passes) because this fix is scoped
entirely to one pre-existing page's own defect, not a follow-on to a
just-shipped backend batch.
