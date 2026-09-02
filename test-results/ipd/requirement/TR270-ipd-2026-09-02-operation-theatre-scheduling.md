---
id: TR270
type: requirement
feature: ipd
created: 2026-09-02
updated: 2026-09-02
status: done
parent: TP270
related: [REQ181, PLAN250]
---

# TR270 — Test results: IPD slice 3 (operation theatre scheduling)

## Outcome

All 59 unit-level cases in `TP270` pass. 57 new unit tests written across
5 spec files (`operation-theatres.service.spec.ts` 10,
`ot-bookings.service.spec.ts` 22, `ot-checklists.service.spec.ts` 4,
`ot-notes.service.spec.ts` 12, `ot-consumables.service.spec.ts` 9), plus 2
new `drugs.service.spec.ts` cases for the `item_type` default (58-59).

Full backend unit suite: **162 suites / 2537 tests** (up from 157/2478),
all passing. `npx tsc --noEmit` and `npx eslint
"{src,apps,libs,test}/**/*.ts"` clean.

## Live-only checks

Container restarted after `docker exec medibook_backend npx prisma
generate` + schema regeneration. Booted cleanly on the **first** attempt —
the `@Args` union-type reflection lesson from `TR269` was applied
proactively to every new resolver argument in this slice, and it held: no
`UndefinedTypeError` this time. Live GraphQL introspection confirmed every
new operation:

Queries: `operationTheatres`, `operationTheatre`, `otBooking`,
`admissionOtBookings`, `otSchedule`, `otNote` — all FOUND.

Mutations: `createOperationTheatre`, `updateOperationTheatre`,
`deleteOperationTheatre`, `createOtBooking`, `startOtBooking`,
`completeOtBooking`, `cancelOtBooking`, `assignOtBookingStaff`,
`removeOtBookingStaff`, `completeOtChecklist`, `createOtNote`,
`updateOtNote`, `signOtNote`, `recordOtConsumable`, `removeOtConsumable`
— all FOUND.

## Integration

New `ipd-ot.int-spec.ts`, 6/6 gates pass against real Postgres:

1. 5 concurrent `createOtBooking` calls into one theatre with 5 distinct
   surgeons (isolating the theatre-overlap constraint from the
   surgeon-overlap one) — exactly 1 succeeded, the other 4 rejected with
   a message matching `/already booked/i`.
2. A booking starting exactly at another's `end_at` (turnaround not
   elapsed) — rejected.
3. A booking starting `end_at` + 31 minutes later (turnaround elapsed) —
   succeeded.
4. The same surgeon booked into two different theatres for an overlapping
   window — rejected, message matching `/already has another OT
   booking/i`.
5. `completeOtBooking` rejected with 0/3 checklist phases done (message
   naming `time_out` as missing after only `sign_in` was recorded),
   succeeded once all 3 phases were completed via `completeOtChecklist`.
6. A signed `OtNotes` row attacked directly with
   `prisma.otNotes.update(...)`, bypassing every service-layer check —
   rejected by the database trigger with a message matching `/signed
   \(locked\)/i`. Test cleanup required `TRUNCATE TABLE "OtNotes" CASCADE`
   rather than `deleteMany` — the identical `MlcRegisters`/
   `AdmissionNotes`-class finding from prior slices: a signed row
   genuinely cannot be `DELETE`d by any path, including test teardown.

Full integration suite: **11 suites / 488 tests** (up from 439), all
passing. `matrix-coverage.int-spec.ts` — confirmed genuinely red before
this slice's own classification work (`unclassified: ["nursing",
"operation-theatre"]`, both failing assertions), then green after adding
`nursing` to `EXEMPT` and `operation-theatre` as a real `CASES` entry
(with new `IDS.theatreA`/`theatreB` fixture rows). The `operation-theatre:
operationTheatres` tenancy-matrix row itself passed all 9 role/org
combinations against real Postgres (super_admin/admin see all; manager/
clinician/staff see only their own org; patient forbidden; unauthenticated
rejected).

## Frontend

`npx eslint` on the touched files: 0 errors (only the pre-existing,
accepted `I18N-1` warning class on `OperationTheatre.jsx`; `AppShell.jsx`'s
own warnings are all pre-existing chrome exemptions untouched by this
slice's one-line nav addition). `npm run build` succeeded;
`OperationTheatre` received its own lazy chunk (24.30kB / 6.55kB gzipped).
`npm run size` green on all four budgets. 15/15 tests across the 4
IPD-domain frontend suites (`BedBoard` 4, `Admissions` 6, `OperationTheatre`
3 new, `NursingChart` 2 new/retroactive — closing a real slice-2 gap found
while writing this slice's own tests, since `NursingChart.jsx` had shipped
with no test file at all).

## Commits

- `31fbb1d` feat(backend): IPD slice 3 -- operation theatre scheduling
- `dd5847f` test(backend): IPD slice 3 unit + integration coverage
- `d95fe54` feat(frontend): IPD slice 3 -- operation theatre scheduling UI
