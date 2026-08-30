---
id: TP247
type: bug
feature: prescriptions
created: 2026-08-30
updated: 2026-08-30
status: approved
parent: PLAN227
related: [TR247]
---

# TP247 — Consultation/prescription visibility fix verification

Test-suggestion stage skipped per Hard Rule 4 — a well-precedented fix
reusing already-proven routes and queries.

## Frontend unit tests

`appointments/detail.test.jsx` (new file):
1. A clinician sees "View Consultation" on a completed appointment;
   clicking it navigates to `/clinician/encounters/:id`.
2. A non-clinician role never sees "View Consultation".
3. A non-completed (e.g. `confirmed`) appointment never sees "View
   Consultation" — its non-terminal "Start Consultation" shows instead.

`EncounterWorkspace.test.jsx` (extended):
1. A real prescription belonging to this encounter renders in the new
   Prescriptions section; a different encounter's own prescription (same
   patient) does not.
2. An encounter with no prescriptions shows a real empty state.

Full suite must otherwise remain green (the 1 pre-existing,
already-documented contention-flaky voice-to-Rx test aside — confirmed
passing in isolation before and after this change).

## Static checks

`npx eslint` on all 4 touched files — 0 new errors.

## Live verification (manual + Chrome DevTools MCP, real dev stack)

As `clinician@medibook.dev`, open the real completed appointment the
user reported (`/appointments/0c4a6cc6-6df5-4c8b-9ec7-7255c89a4225`);
click "View Consultation"; confirm it lands on the real, signed,
read-only encounter; confirm the Prescriptions section shows the real
prescription; click "View" and confirm the real prescription print page
renders correctly.
