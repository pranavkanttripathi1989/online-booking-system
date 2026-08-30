---
id: TP258
type: bug
feature: frontend-platform
created: 2026-08-30
updated: 2026-08-30
status: done
parent: PLAN238
related: [BUG063, PLAN238, TR258]
---

# TP258 — test plan for BUG063 fixes

1. **`manager/clinics/index.test.jsx`** (new)
   - A real, successful zero-clinics result shows a real empty state —
     never `CLINICS_DATA`'s fabricated "City Heart Clinic" et al., and
     never the "Backend unavailable" banner.
   - A genuine query error falls back to sample data, with the
     disclosure banner visible.
   - A real fetched clinic renders correctly, never a fabricated one.
2. **`manager/resources/index.test.jsx`** (new)
   - A manager sees the resource plus Add/Edit/Delete controls.
   - A staff caller sees the same resource but none of those controls.
3. **`manager/packages/index.test.jsx`** (existing, extended)
   - A staff caller sees the package but not New/Edit/Delete.
4. **`manager/memberships/index.test.jsx`** (existing, extended)
   - A staff caller sees the plan but not New/Edit/Delete.
5. **Regression**: full `src/pages/manager` + `src/layouts/AppShell`
   suite must stay green (57 tests across 14 suites before this
   slice's own 5 new/extended tests).
6. **Static**: `eslint` on every touched file (0 errors); `npm run
   build` succeeds; `npm run lint` stays under the 4908 warning
   ratchet.
