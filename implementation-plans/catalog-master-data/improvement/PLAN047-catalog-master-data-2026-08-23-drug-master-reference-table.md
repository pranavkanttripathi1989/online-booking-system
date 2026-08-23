---
id: PLAN047
type: improvement
feature: catalog-master-data
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ044
related: [REQ016]
---

# PLAN047 — Drug master reference table

## Design

Grounded in a real-code exploration pass: no `Drugs`-shaped model existed
anywhere (`technical-plans/04-data-model-evolution.md` only names `Drugs`
in a phase-1 table list, no fields specified); `products` module is the
closest structural template for a domain needing hybrid platform/tenant
visibility (`languages`/`lookups` are fully platform-global, no
`client_org_id` at all, so not a fit here).

- Migration `20260823050000_drugs` — new table, standard shape matching
  this schema's other reference tables (`is_deleted` soft-delete,
  `created_at`/`updated_at`), FK to `ClientOrganizations` with `ON DELETE
  SET NULL` (matching `Clinics`/`Products`' own nullable-org FK behavior).
- `DrugsService.findAll()` builds an explicit `OR` clause for hybrid
  visibility — `orgScope()` alone assumes exact-match-or-nothing, not
  "shared plus mine," so this domain needed its own inline scoping logic
  rather than reusing the shared helper unchanged.
- `assertWritable()` (private, service-internal) — read visibility
  (`findOne`) and write eligibility are genuinely different checks here,
  unlike every other domain in this codebase where they coincide. Kept as
  a separate private method rather than overloading `findOne` with an
  extra parameter, so the distinction stays visible at each call site.
- Response convention: return-the-entity directly (`05-cross-cutting-
  conventions.md`'s own guidance for "a new domain with no consumer yet"
  and no meaningful partial-failure semantics).
- Seed data added to `backend/prisma/seed.ts` (not a one-off script) so a
  fresh environment's `npx prisma db seed` includes it going forward;
  re-run against the already-seeded dev database to populate it live,
  confirmed every other seed block still skips correctly (idempotent).

## Verification

Unit: 13 new tests in `drugs.service.spec.ts` (hybrid visibility, tenant
isolation on read, stricter write-eligibility, soft-delete). Full backend
suite 732/732 green (56 suites, up from 55), `tsc --noEmit`/`eslint` clean.
Live, against the real dev database: `npx prisma db seed` created exactly
the 6 new drug rows and skipped every pre-existing seed block; a real
manager account saw all 6 platform-seeded drugs, created a real custom
org-scoped drug, was correctly rejected (`ForbiddenException`) attempting
to edit a platform-seeded one, and a platform admin account confirmed it
could see the manager's custom drug (platform operators see everything).
Test drug deleted afterward. See `TR073`.
