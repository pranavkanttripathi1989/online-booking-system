---
id: CTX-clinicians-2026-08-27-bug028
type: bug
feature: clinicians
created: 2026-08-27
updated: 2026-08-27
status: done
parent: BUG028
related: [PLAN200, TP220, TR220]
---

# clinicians — email/phone never readable over GraphQL (BUG028)

Live-reported by the user mid-session while editing a real clinician
through the admin UI. Fixed the same session.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | BUG028 | [bug report](../../requirements/clinicians/bug/BUG028-clinicians-2026-08-27-email-phone-never-readable.md) |
| implementation-plans | PLAN200 | [fix plan](../../implementation-plans/clinicians/bug/PLAN200-clinicians-2026-08-27-email-phone-never-readable.md) |
| test-plans | TP220 | [test plan](../../test-plans/clinicians/bug/TP220-clinicians-2026-08-27-email-phone-never-readable.md) |
| test-results | TR220 | [results](../../test-results/clinicians/bug/TR220-clinicians-2026-08-27-email-phone-never-readable.md) |

## What shipped

- Root-caused via a direct `psql` read against the real dev DB before
  touching any code: the original save was already correct — the bug
  was entirely that `ClinicianType` never declared `email`/`phone` at
  all, so no page could ever read them back.
- Fixed as `@ResolveField()`s (not plain `@Field()`s) on
  `clinicians.resolver.ts`, gated to withhold from a `patient` caller —
  the `clinician`/`clinicians` queries have no `@Auth()` restriction at
  all, so a plain field would have introduced a new leak (a clinician's
  personal contact info visible to any logged-in patient) while fixing
  the reported one.
- Frontend `CLINICIAN_FIELDS` fragment and both create/update clinician
  mutations updated to select the new fields, so Apollo's cache picks
  up the saved value immediately without a manual refetch.
- Live-verified in both directions against the real dev backend: a
  manager sees the real email/phone; a patient sees `null` for both.

## A real environment gotcha hit again this pass

`docker exec medibook_backend npx prisma generate` was required before
the restart would compile — the container's `node_modules` is a
separate volume from the host's, so an earlier host-side `prisma
generate` (from this same session's `revenue-share` slice) never
reached the container. Matches the identical `web-vitals` gotcha this
session already hit once (`P1-18`).
