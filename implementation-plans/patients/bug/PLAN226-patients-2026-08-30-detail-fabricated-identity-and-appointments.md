---
id: PLAN226
type: bug
feature: patients
created: 2026-08-30
updated: 2026-08-30
status: done
parent: BUG055
related: [TP246, TR246]
---

# PLAN226 — Wire `patients/detail.jsx` Overview + Appointments to real data

## The proven pattern already existed — adopted, not invented

`frontend/src/graphql/queries.js` `PATIENT_DETAIL_QUERY` was already used
correctly by two real, shipped consumers (`components/Patients/
PatientDetailDrawer.jsx`, `pages/patients/EditPatientPage.jsx`) and
already selects everything this fix needed: `PatientFields` (id,
first_name, last_name, full_name, email, phone, date_of_birth, gender,
address, notes, created_at) plus a nested `appointments(first:20,page:1)`
with `clinician.full_name`/`service.name`/`clinic.name`/`start_datetime`/
`end_datetime`/`status` and `paginatorInfo.total`. Backend
`patients.resolver.ts`'s `patient(id)` + its `appointments` resolve-field
already tenant/self-scope correctly for a clinician viewing their own
patient (`treated` check) or a manager/staff/admin in the same org
(`assertSameOrg`) — confirmed by direct code read. **No backend change.**

## What changed

- `detail.jsx:732` (old): `const p = MOCK_PATIENTS_DETAIL[id] ??
  MOCK_PATIENT_DEFAULT`. Replaced with `useQuery(PATIENT_DETAIL_QUERY,
  {variables:{id}, skip:!id, fetchPolicy:'cache-and-network'})`; `p =
  patient ?? {}` keeps every existing `p.<field>` reference in this
  2000+-line file working unmodified (resolves to `undefined`, not a
  crash) during loading, while three explicit early-return states
  (loading skeleton, error+retry, not-found) — placed after every hook
  in the component, matching `appointments/detail.jsx`'s own established
  pattern for this exact page shape — gate the user from ever seeing
  that intermediate state.
- `realAppointments` = `[...patient.appointments.data].sort(desc by
  start_datetime)` (mirrors `PatientDetailDrawer.jsx`'s own
  `sortedAppts`); `totalVisits` = `paginatorInfo.total` (the true count,
  not just the fetched page); `lastVisit` = `realAppointments[0]?.start_datetime`.
- Appointments tab (`TabPanel index={2}`): replaced `MOCK_APPOINTMENTS.map`
  with `realAppointments.map`, mapping `clinician.full_name`/`service?.name`/
  `start_datetime`/`status` into the unchanged table structure, reusing
  `statusChipSx`/`STATUS_ICONS` (`BUG054`). Added an empty state ("No
  appointments on record.") — none existed before since mock data was
  never empty.
- Six fields with zero real backing on `Patients` (confirmed via
  `backend/src/patients/entities/patient.entity.ts` — no `status`,
  `blood_type`, `outstanding_balance`, or `primary_clinician` field
  exists at all) — dropped, not faked: the header status chip + badge
  dot, the inline "Blood type: X" segment, the Overview "Blood Type"
  `InfoRow`, the header balance chip (`BUG054`'s own fix, now removed
  entirely rather than left dead), and the entire "Primary Clinician"
  card (Overview tab) including its now-unused `clinicianInitials`
  derivation. `p.status` was already a logged, unresolved question
  (`context/open-questions.md #11(b)`) — this fix doesn't resolve it,
  just stops rendering a fabricated value for it.
- Test Results tab: left `MOCK_TESTS` in place (confirmed via direct
  backend code read: `TestResultType.patient` is free text, no FK, no
  resolver filter arg — a real per-patient join doesn't exist to wire to,
  and a name-matching join would be a silent-failure risk, not a fix) —
  added an honest `Typography variant="caption"` disclosure above the
  list. Logged as `context/open-questions.md #20`.
- Dead code removed: `MOCK_PATIENTS_DETAIL` (~365 lines) and
  `MOCK_PATIENT_DEFAULT`, both now fully superseded and referenced
  nowhere; `MOCK_APPOINTMENTS`, same. `MOCK_RELATED_ACCOUNTS`/
  `MOCK_HISTORY`/`MOCK_TESTS` are untouched (still power the 5
  explicitly out-of-scope tabs / the still-mock Test Results tab).
- `formatCurrency` import (from `BUG054`) became unused once the balance
  chip it fed was removed — removed.

## Follow-up polish from live testing (same session, same fix)

- Header stat chips ("Visits"/"Last visit"/membership) restyled from
  MUI's flat default `variant="outlined"` to theme-token soft-tint pills
  (`alpha(primary/info.main, 0.1)` backgrounds, matching text colors,
  `statusChipSx`'s own convention), with `spacing={1.25}` instead of `1`.
  Found live: MUI's `.MuiChip-icon` class does not automatically inherit
  a custom `sx.color` on the Chip root — fixed with an explicit `color:
  'inherit !important'` on each icon element itself.
- Header `ID: #{p.id}` (a full UUID) shortened to `#{p.id?.slice(-6)}`,
  matching `appointments/detail.jsx`'s own existing title convention.
- Test Results disclosure caption's first draft read "...(see
  context/open-questions.md)" — an internal repo file path leaking into
  user-facing text. Fixed to plain language with no internal reference.

## Files changed

```
frontend/src/pages/patients/detail.jsx        — real useQuery, drop 6 unbacked fields,
                                                  derive 2, wire real Appointments tab,
                                                  Test Results disclosure caption,
                                                  restyled header chips, delete ~380
                                                  lines of now-dead mock data
frontend/src/pages/patients/detail.test.jsx   — patientDetailMock() helper (auto-prepended
                                                  by renderPage()) so the 8 pre-existing
                                                  Insurance/Packages tests keep passing;
                                                  openInsuranceTab/openPackagesTab switched
                                                  getByRole -> findByRole (async gate);
                                                  5 new BUG055 test cases
context/open-questions.md                     — new #20 (Test Results per-patient backend gap)
```

## Verification

- Unit: `detail.test.jsx` 13/13 pass (8 pre-existing + 5 new).
- `npx eslint` on both touched files: 0 errors (158 pre-existing i18n
  warnings, unchanged in kind).
- Live (Chrome DevTools MCP + the user's own live testing, real dev
  stack, `clinician@medibook.dev`, real patient
  `7ea9442e-e2c6-42a4-85b0-268e59fcb51d` / "Priya Patient"): real
  identity, real 5-appointment history (all "Alex Clinician" / "GP
  Consultation", correctly sorted, correctly status-styled), accurate
  derived Visits/Last-visit stats, all six unbacked fields confirmed
  absent, Test Results shows the honest disclosure with no internal
  file-path leak, header chips render with correct theme-token colors
  including icon color.

See `TR246` for the full recorded outcome.
