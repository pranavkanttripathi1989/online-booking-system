---
id: BUG040
type: bug
feature: patients
created: 2026-08-28
updated: 2026-08-28
status: done
parent: null
related: [BUG024]
---

# BUG040 — e2e seed's ~200 bulk patients (and the "Anita Sharma" fixture) never set `client_org_id`, so every org-scoped account saw an empty patient list

## Source

Found live while adding realistic Indian names to `backend/prisma/
seed-e2e.ts`'s bulk patient generator (replacing the old "E2E
PatientNNNN" placeholder naming) and then doing a manual QA pass against
the reseeded `medibook_frontend_e2e`/`medibook_backend_e2e` stack, per
explicit user request ("medibook_frontend_e2e add proper seedres and do
QA here" / "should look like real data in seeders").

## What's wrong, exactly

`BUG024` (2026-08-26) added a real `client_org_id` column to `Patients`
and made every patient query filter by it — a hard prerequisite for
tenant isolation. `backend/prisma/seed-e2e.ts`'s bulk 199-patient
`createMany` and its dedicated "Anita Sharma" fixture `create` both
predate that change and were never updated afterward: neither call set
`client_org_id`, so every one of the ~200 seeded patients landed with
`client_org_id: null`.

Live-reproduced: logging in as `manager@medibook.dev` (a real,
org-scoped account, JWT `client_org_id` correctly populated) and opening
`/patients` returned a genuine, error-free, **empty** GraphQL result —
`{"data":{"patients":{"data":[],"paginatorInfo":{"total":0,...}}}}`
— against a database that genuinely held 200 real patient rows. Every
downstream screen that depends on real patient linkage (the manager
dashboard's "Active Patients"/revenue tiles, the appointments list join)
also read as empty or zeroed for the same reason.

This uncovered a second, independent, real bug while diagnosing the
first: `frontend/src/pages/patients/index.jsx` silently rendered a
hardcoded mock list ("Alice Johnson", "Bob Smith", "Carlos Reyes", "Diana
Prince", 14 rows) instead of an honest empty state on that genuine empty
result — a live DATA-13 violation (`FRONTEND_RULES.md`: "Never fall back
to mock or fabricated data on an empty result... permitted only on a
genuine query `error`"). That page-level defect is **not** fixed by this
bug — it's logged separately, see `related` — but this seed fix was the
only way to notice it live, since previously the seed's own missing
`client_org_id` masked it as "the mock never shows because there's
always real data".

## Fix

`backend/prisma/seed-e2e.ts`: added `client_org_id: primaryOrg.id` to
both the bulk `patientRows` generator and the Anita Sharma fixture
`create` call, matching every other tenant-scoped fixture row in the
same file (clinics, products, categories all already did this
correctly).

## Verification

Reseeded the e2e stack fresh (cleared `postgres_e2e`'s tmpfs, restarted
`medibook_backend_e2e` to re-run `migrate deploy` + `seed-e2e.ts`).
Live-verified via Chrome DevTools MCP against the real
`medibook_frontend_e2e`/`medibook_backend_e2e` stack, logged in as
`manager@medibook.dev`:

- `/patients` — "200 patients", real rows (Anita Sharma, Riya Kumar,
  Kavya Rao, Aadhya Menon, ...), no mock fallback.
- `/appointments` — "1,060 upcoming appointments" / "1–20 of 1060" total,
  real patient + clinician names on every row.
- `/manager/dashboard` — Analytics Overview now shows real, non-zero
  figures: 200 total appointments (30D window), ₹79,500 gross revenue,
  121 active patients, a populated trend chart and status distribution.

## Acceptance criteria

- [x] `seed-e2e.ts`'s bulk patient rows and the Anita Sharma fixture both
      set `client_org_id: primaryOrg.id`.
- [x] A fresh reseed produces patients visible to an org-scoped manager
      account, not just an org-less admin/super_admin.
- [x] Live-verified against the real e2e stack (not just a direct SQL
      query) — `/patients`, `/appointments`, and the manager dashboard
      all show real, correctly-scoped, non-zero data.
