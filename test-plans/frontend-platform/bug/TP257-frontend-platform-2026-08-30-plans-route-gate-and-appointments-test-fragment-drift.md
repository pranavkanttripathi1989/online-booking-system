---
id: TP257
type: bug
feature: frontend-platform
created: 2026-08-30
updated: 2026-08-30
status: done
parent: PLAN237
related: [BUG062, PLAN237, TR257]
---

# TP257 — test plan for BUG062 fixes

1. **`patient/Appointments.test.jsx`** (existing file, previously all
   failing) — re-run in isolation (`npx jest patient/Appointments
   --maxWorkers=1`) after the fragment-import fix:
   - Shows "Leave a Review" for a completed appointment without one,
     and opens the dialog.
   - Shows a "Review submitted" chip, not a button, once `has_review`
     is true.
   - Keeps Submit Review disabled until both a star rating and a
     comment are given (UI-11).
   - The open review dialog has zero `axe-core` violations.
   - Submits the review with the right mutation variables and shows
     success feedback, including the post-submit refetch.
2. **Static**: `eslint` on `App.jsx` and `Appointments.test.jsx` (0
   errors); a Babel transform confirms `App.jsx`'s JSX is syntactically
   valid; `npm run build` succeeds.
3. **Full-suite regression, this slice's own reason for existing**:
   backend unit (`npx jest --maxWorkers=2` from `backend/`), backend
   `tsc --noEmit`, backend `eslint`, backend `test:int`, frontend
   `lint`, frontend `build`, and a full frontend `jest` run — all
   re-confirmed green (or, where flaky, confirmed pre-existing and
   unrelated by re-running the specific suite alone) as the closing
   verification of the whole `BUG058`–`BUG062` change set.
