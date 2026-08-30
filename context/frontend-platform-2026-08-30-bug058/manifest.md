---
id: CTX-frontend-platform-2026-08-30-bug058
type: bug
feature: frontend-platform
created: 2026-08-30
updated: 2026-08-30
status: done
parent: null
related: [BUG058, PLAN233, TP253, TR253]
---

# manager/* pages — DATA-13 + not-found-guard fixes (2026-08-30)

First slice of a full-repo frontend/backend integration audit
("check all fronend page and fix the backend and fronend intgartionn
gap"), scoped to `frontend/src/pages/manager/`.

Found and fixed 4 real bugs: `Availability.jsx`/`Blocks.jsx` fabricated
demo data on any genuine empty query result (`DATA-13`); `clinics/
edit.jsx`/`products/edit.jsx` had no not-found guard at all, silently
editing a fabricated default record for a bad/deleted id. Also
confirmed (no fix needed) that the frontend `RoleGuard` for `/manager/
reports`, `/manager/revenue-share`, `/manager/imports` exactly matches
each domain's backend `@Auth()` gate, and that 9 other manager pages
(`claims`, `clinic-forms`, `memberships`, `packages`, `pharmacy`,
`registries`, `rooms/*`, `services/*`, `products/index`,
`rooms/index`, `services/index`, `Dashboard`, `clinics/detail`) have
no integration gap of the six classes checked.

Commit: `b7983cd`. Verification: 4 new tests pass, full manager Jest
suite unaffected (49/49), eslint/build clean.

**Audit continues** across the remaining page groups
(`admin/*`, `patient/*`, `clinician/*`, `public/*`, and remaining
top-level pages) as separate slices.

See `BUG058`/`PLAN233`/`TP253`/`TR253`.
