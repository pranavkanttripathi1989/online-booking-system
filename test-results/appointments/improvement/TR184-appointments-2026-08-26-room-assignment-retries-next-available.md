---
id: TR184
type: improvement
feature: appointments
created: 2026-08-26
updated: 2026-08-26
status: pass
parent: TP184
related: []
---

# TR184 — Test results: room assignment retries the next available room

All 7 `TP184` cases pass.

`npx jest src/appointments/appointments.service.spec.ts --maxWorkers=2`:
84/84 tests pass (4 new).

Full backend unit suite: 92/92 suites, 1474/1474 tests. Integration
suite: 4/4 suites, 387/387 tests, unchanged. `tsc --noEmit`/`eslint`
clean.

## No frontend change

This slice is a backend-internal refinement to `create()`'s existing
room-assignment logic — no new GraphQL field, argument, or response
shape. The frontend booking flows already handle a
`BadRequestException` from `createAppointment`/`bookPatientAppointment`
the same way regardless of the specific message text.

## Live verification

Not performed against the real dev stack — no browser tool available
this session. The unit coverage above exercises the exact query
sequence (clinician conflict check → per-room conflict check, in the
same order `create()` calls them) a live booking would use.
