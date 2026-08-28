---
id: PLAN202
type: bug
feature: patients
created: 2026-08-28
updated: 2026-08-28
status: done
parent: BUG040
related: [PLAN101]
---

# PLAN202 — Implementation plan for BUG040 (e2e seed patients missing `client_org_id`)

## Root cause

`backend/prisma/schema.prisma`'s `Patients.client_org_id` column and its
enforcement in `patients.service.ts` were added by `BUG024`/`PLAN101`
(2026-08-26). `backend/prisma/seed-e2e.ts` predates that change and was
never updated: its bulk 199-patient `createMany` and its dedicated
"Anita Sharma" `create` fixture both omit `client_org_id`, so every
seeded patient lands with `client_org_id: null` — invisible to any
org-scoped caller (manager, staff, clinician, patient-role), visible
only to an org-less admin/super_admin.

Surfaced while adding realistic Indian patient names to the same bulk
generator (unrelated cosmetic change) and then live-testing the
reseeded stack as a real manager account, per explicit user request.

## Change

`backend/prisma/seed-e2e.ts`:
- Bulk `patientRows.push({...})`: added `client_org_id: primaryOrg.id`.
- Anita Sharma fixture `prisma.patients.create({...})`: added
  `client_org_id: primaryOrg.id`.

Matches every other tenant-scoped fixture row already in this file
(clinics, product categories, products all stamp `primaryOrg.id`
correctly) — this was a gap specific to the two patient-creation call
sites, not a systemic pattern in the file.

## Verification

- `npx tsc --noEmit` clean.
- Fresh reseed (cleared `postgres_e2e` tmpfs via `docker restart`,
  restarted `medibook_backend_e2e` to re-run `migrate deploy` +
  `seed-e2e.ts`).
- Live-verified via Chrome DevTools MCP against the real
  `medibook_frontend_e2e`/`medibook_backend_e2e` stack (ports
  3101/4001), logged in fresh as `manager@medibook.dev`:
  - `/patients`: "200 patients", real rows.
  - `/appointments`: "1,060 upcoming appointments" / "1–20 of 1060",
    real patient + clinician names throughout.
  - `/manager/dashboard`: Analytics Overview shows real non-zero
    figures (200 total appointments in the 30D window, ₹79,500 gross
    revenue, 121 active patients, populated trend chart).

See `TP222`/`TR222`.
