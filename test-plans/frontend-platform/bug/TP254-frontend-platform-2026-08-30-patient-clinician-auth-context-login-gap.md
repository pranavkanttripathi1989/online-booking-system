---
id: TP254
type: bug
feature: frontend-platform
created: 2026-08-30
updated: 2026-08-30
status: done
parent: PLAN234
related: [BUG059, PLAN234, TR254]
---

# TP254 — test plan for BUG059 fixes

1. **Static/regression only this slice** (no new dedicated unit test for
   the fresh-login fallback path — logged as a follow-up in `PLAN234`):
   - `eslint` on the 3 touched files: 0 errors.
   - `clinician/Calendar.test.jsx` (pre-existing, 7 cases): must stay
     green — confirms the new `GET_MY_CLINICIAN_LINK` query's `skip`
     condition doesn't disturb the page's existing behavior when
     `user.clinician` is already present in the mocked auth context.
   - Full `frontend/src/pages/patient` + `frontend/src/pages/clinician`
     Jest suite (9 suites): must stay green.
   - `npm run build`: must succeed.
