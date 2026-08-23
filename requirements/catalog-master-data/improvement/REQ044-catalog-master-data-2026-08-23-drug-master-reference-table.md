---
id: REQ044
type: improvement
feature: catalog-master-data
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ016
related: []
---

# REQ044 — Drug master reference table

First vertical slice of `REQ016` (catalogue extensions: packages, drug
master, per-category pricing, tax depth) — the drug-master piece only, not
packages/per-category-pricing/tax depth.

## Why this slice, and its scope decision

`REQ016`'s "Non-functional notes" section is explicit that a real licensed
drug database is a sourcing/licensing decision, still unresolved (PRD §19
Open Question 4) — its own fallback recommendation is "ship the schema and
a small manually-curated seed set" for the interim. That is exactly this
slice's scope: a real `Drugs` table, real CRUD, real tenant-isolation, and
6 manually-curated common drugs (Paracetamol, Amoxicillin, Metformin,
Amlodipine, Cetirizine, Azithromycin) as platform-seeded reference data —
not a real pharmaceutical database.

**No frontend page was built for this slice**, on purpose: no existing page
needs a drug picker yet — `pharmacy` (`REQ022`) and `prescriptions`
(`REQ021`), the natural consumers, are themselves still unbuilt PRD
modules. Building a UI with no real consumer would be decorative. This is
a scope decision recorded here, not a silent gap — the backend contract
(entity/resolver/service) is complete and tested, ready for whichever of
those two modules reaches its own vertical slice first.

## What was built

- New `Drugs` model (migration `20260823050000_drugs`): `id`,
  `client_org_id` (nullable — null means platform-seeded, non-null means a
  tenant's own custom addition), `name`, `composition`, `strength`, `form`,
  `schedule_class` (India's Drugs and Cosmetics Rules schedule letters —
  H/H1/OTC), `hsn`, `gst_rate`, `manufacturer`, `is_deleted`.
- `backend/src/drugs/` — new module, following the standard scaffolding:
  `drugs.module.ts`, `drugs.service.ts`, `drugs.resolver.ts`,
  `dto/drug.input.ts`, `entities/drug.entity.ts`.
- **Hybrid tenant-scoping**, not directly expressible with the existing
  `orgScope()` helper: a normal caller must see BOTH the shared
  platform-seeded rows AND their own org's custom additions, but never
  another org's. `findAll()` builds this explicitly
  (`OR: [{client_org_id: null}, {client_org_id: user.client_org_id}]`) for
  a non-platform-operator; a platform operator sees everything, matching
  every other domain's convention. Writes use the existing
  `orgIdForWrite()` helper unchanged.
- **Write access is deliberately stricter than read access**: any tenant
  can *see* a platform-seeded drug, but only a platform operator can edit
  or delete one — a normal caller attempting to modify one gets a clean
  `ForbiddenException`, not a silent success or a leaked write.
- `DrugType.is_platform_seeded` — a derived boolean, not the raw
  `client_org_id` — the resolver boundary never exposes a caller's own
  (already-known-to-them) org id or, more importantly, never accidentally
  exposes shape that could hint at another org's id.
- `backend/prisma/seed.ts` — 6 manually-curated platform-seeded drugs,
  idempotent (`findFirst`-then-create, matching every other block in this
  seed script), confirmed safe to re-run against the already-seeded dev
  database without touching anything else.

## What this does not do

- No packages, per-category pricing, or tax-depth work — separate slices
  of the same `REQ016`.
- No real licensed drug database — a sourcing/licensing decision that
  remains genuinely unresolved (PRD Open Question 4).
- No frontend page — see the scope decision above.
