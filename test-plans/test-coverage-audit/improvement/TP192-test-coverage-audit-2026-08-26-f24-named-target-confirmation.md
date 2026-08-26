---
id: TP192
type: improvement
feature: test-coverage-audit
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN172
related: []
---

# TP192 — Test plan: F-24 named-target confirmation

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | AuthContext already covered | Read `AuthContext.test.jsx` | 18 tests span hydration, login/logout, roles/permissions, idle-timeout, impersonation — no gap |
| 2 | ProtectedRoute/RoleGuard already covered | Read both test files | Loading/redirect/allow/deny/Forbidden403 all present — no gap |
| 3 | Public booking wizard already covered | Read `pages/booking/index.test.jsx` | Step 0/1/2 validation gates already tested — no gap |
| 4 | Internal booking wizard step-gating (real gap) | `BookingWizard.test.jsx` | All 5 `canProceed()` branches exercised via mocked sub-steps |
| 5 | New-patient zod validation now surfaces errors | `BookingStep4Patient.test.jsx` | First name blank → "First name is required" shown after the fix |
| 6 | Invalid/valid email both handled | Same file | "Invalid email" shown then cleared on correction |
| 7 | Form values sync to wizard state | Same file | `updateWizard` called with `newPatient` reflecting typed values |
| 8 | `dateUtils.js` confirmed dead | Full-repo grep | Zero importers; deleted |
| 9 | `dateTime.js` unaffected | `dateTime.test.js` | Still green after the comment/JSDoc correction |
| 10 | Full suite regression | `npx jest` (frontend) | 24/24 suites green (2 confirmed pre-existing-flaky under parallel contention, pass in isolation) |
| 11 | Lint clean, ratchet improved | `npm run lint` | 0 errors; 1909 warnings (down from 1911), ceiling lowered to match |
