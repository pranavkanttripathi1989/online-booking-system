---
feature: booking-wizard
date: 2026-03-19
ids: [TP005, REQ013]
status: done
---

# booking-wizard — 2026-03-19 (superseded 2026-08-22)

`TP005` was written against `MockStore` before `backend/src/public/**` existed and was never executed even against that mock version. `REQ013`'s Phase B audit found it as the only doc pointing at this surface under the wrong (pre-backend) name and superseded it with a real test-plan under the `public` feature slug — see [`public — 2026-08-22 bundle`](../public-2026-08-22/manifest.md). This bundle is kept as historical record; the `booking-wizard` feature slug is not reused going forward.

## Test plan

- [TP005 — Booking Wizard — Test Plan](../../test-plans/booking-wizard/requirement/booking-wizard-test-plan.md) — superseded, updated 2026-08-22

