---
id: CTX-catalog-master-data-2026-08-23-req044
type: improvement
feature: catalog-master-data
created: 2026-08-23
updated: 2026-08-23
status: done
parent: REQ044
related: [REQ016, PLAN047, TP074, TR073]
---

# catalog-master-data — REQ044, drug master reference table (2026-08-23)

First vertical slice of `REQ016`'s drug-master piece — a real `Drugs`
table, real hybrid tenant-scoping, and a small manually-curated
platform-seeded set, matching `REQ016`'s own explicit interim
recommendation while the real drug-database sourcing/licensing decision
(PRD Open Question 4) stays unresolved.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ044 | [drug master reference table](../../requirements/catalog-master-data/improvement/REQ044-catalog-master-data-2026-08-23-drug-master-reference-table.md) |
| implementation-plans | PLAN047 | [implementation](../../implementation-plans/catalog-master-data/improvement/PLAN047-catalog-master-data-2026-08-23-drug-master-reference-table.md) |
| test-plans | TP074 | [verification plan](../../test-plans/catalog-master-data/improvement/TP074-catalog-master-data-2026-08-23-drug-master-verification.md) |
| test-results | TR073 | [verification results](../../test-results/catalog-master-data/improvement/TR073-catalog-master-data-2026-08-23-drug-master-verification.md) |
| test-suggestions | — | skipped — a well-scoped new-domain slice following an established structural pattern (`products`) |

## What this closes

The drug-master piece of `REQ016` only. Packages, per-category pricing,
and tax depth remain unbuilt.

## Deliberate scope decision — no frontend page

No existing page needs a drug picker; `pharmacy`/`prescriptions`, the
natural consumers, are themselves still unbuilt PRD modules. Backend
contract is complete and tested, ready for whichever reaches its own
vertical slice first.

## Notable design note

`orgScope()` (the shared tenant-scoping helper) assumes exact-match-or-
nothing and doesn't fit this domain's "see platform-seeded rows AND my own
org's rows, never another org's" requirement — `findAll()` builds an
explicit `OR` clause instead. Write access is deliberately stricter than
read access: any tenant can see a platform-seeded drug, but only a
platform operator can edit or delete one.
