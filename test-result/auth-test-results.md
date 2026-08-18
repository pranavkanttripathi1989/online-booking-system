# Auth Test Results (v4 — Post NEW-AUTH-006/007/008 Implementation)

**Feature:** Authentication  
**Test Plan:** [auth-test-plan.md](../test-plan/auth-test-plan.md)  
**First Executed:** 2026-03-16 · **Last Re-test:** 2026-03-27 (v4)  
**Tester:** Antigravity AI (Code analysis + Build verification)  
**Environment:** `http://localhost:3001` (Vite dev server, mock data mode, backend offline)  
**Total Cases:** 35 | **Executed:** 35 | **Passed:** 34 ✅ | **Partial:** 1 ⚠️ | **Failed:** 0 ❌

---

## Summary

| Status | Session 1 (2026-03-16) | Session 2 (2026-03-18) | Session 3 (2026-03-19) | **v4 (2026-03-27)** |
|--------|------------------------|------------------------|------------------------|---------------------|
| ✅ PASS | 13 | 23 | 31 | **34** |
| ⚠️ PASS* | 0 | 1 | 1 | **1** |
| ❌ FAIL | 0 | 0 | 0 | **0** |
| ⏭ SKIP | 1 | 0 | 0 | **0** |

> **v4 Overall Result: ✅ 34 PASS + 1 partial — 0 hard failures, 0 skipped. 3 new TCs added (TC-AUTH-033/034/035). TC-AUTH-016 remains partial (cross-session sessionStorage verification requires manual browser DevTools check).**

---

## Improvements Implemented (All Sessions)

| SUG ID | Suggestion | Status | File |
|--------|-----------|--------|------|
| SUG-AUTH-004 | Password strength meter on Register tab | ✅ Done | `auth/login.jsx` |
| SUG-AUTH-006 | "Remember Me" checkbox (localStorage/sessionStorage) | ✅ Done | `auth/login.jsx`, `AuthContext.jsx` |
| SUG-AUTH-008 | Last Login timestamp stored + sidebar display | ✅ Done | `AuthContext.jsx`, `Sidebar.jsx` |
| SUG-AUTH-009 | Forgot password: 60s cooldown + Resend button | ✅ Done | `auth/login.jsx` |
| SUG-AUTH-011 | Demo chip tooltips with role descriptions | ✅ Done | `auth/login.jsx` |
| SUG-AUTH-012 | Richer 403 page (role chip + path + Request Access) | ✅ Done | `RoleGuard.jsx` |
| SUG-AUTH-013 | Forgot password error for unrecognised emails | ✅ Done | `auth/login.jsx` |
| SUG-AUTH-015 | Keyboard accessibility (WCAG 2.1) | ✅ Done | `auth/login.jsx` |
| SUG-AUTH-001 | Client-side failed attempt counter + 60s lockout | ✅ Done | `auth/login.jsx` |
| SUG-AUTH-003 | Inactivity auto-logout (15 min idle + 60s warning) | ✅ Done | `useInactivityLogout.js`, `AppShell.jsx` |
| SUG-AUTH-010 | Register: optional phone field + T&C required | ✅ Done | `auth/login.jsx` |
| NEW-AUTH-001 | "Last signed in" in sidebar footer | ✅ Done | `Sidebar.jsx` |
| NEW-AUTH-002 | Failed attempt counter with lockout | ✅ Done | `auth/login.jsx` |
| NEW-AUTH-003 | Email provider quick-link in forgot password success | ✅ Done | `auth/login.jsx` |
| NEW-AUTH-004 | OTP / Passwordless login | ✅ Done | `auth/login.jsx` |
| NEW-AUTH-005 | Sign up from Mobile (phone-first 3-step flow) | ✅ Done | `auth/login.jsx` |
| **NEW-AUTH-006 (v4)** | Session-expired banner (`?reason=session_expired`) | ✅ Done | `auth/login.jsx` |
| **NEW-AUTH-007 (v4)** | Caps Lock warning on password field | ✅ Done | `auth/login.jsx` |
| **NEW-AUTH-008 (v4)** | Inline email format validation (onBlur + regex) | ✅ Done | `auth/login.jsx` |

---

## v4 New Test Cases

### TC-AUTH-033 — Session expired banner (NEW-AUTH-006)
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS (code-verified) |
| **Input** | Navigate to `/login?reason=session_expired` |
| **Expected** | Amber warning alert: "Your session expired due to inactivity. Please sign in again." Dismissable with × button. |
| **Actual** | `useSearchParams().get('reason') === 'session_expired'` → `sessionExpired = true` → MUI `<Alert severity="warning">` renders with `WarningAmberRoundedIcon`. Alert has `onClose` prop for dismissal. |
| **Implementation** | `useSearchParams` imported from react-router-dom; `sessionExpired` computed at component top; renders above HealthSync logo in auth panel. `useInactivityLogout` already calls `navigate('/login?reason=session_expired')` on expiry. |

---

### TC-AUTH-034 — Caps Lock warning on password field (NEW-AUTH-007)
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS (code-verified) |
| **Input** | Enable Caps Lock, click into password field, type any character |
| **Expected** | Amber warning below password field: "Caps Lock is on" |
| **Actual** | `onKeyUp={(e) => setCapsLock(e.getModifierState('CapsLock'))}` on password TextField. `capsLock && <Stack>...<WarningAmberRoundedIcon> "Caps Lock is on"</Stack>` renders conditionally. Clears when Caps Lock turned off. |
| **Note** | Browser automation cannot programmatically set Caps Lock state — code correctness confirmed via source inspection |

---

### TC-AUTH-035 — Inline email format validation (NEW-AUTH-008)
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS (code-verified) |
| **Input** | Sign In tab: type "notanemail", click outside (blur) |
| **Expected** | Red error border on email field, helper text "Please enter a valid email address" |
| **Actual** | `emailTouched` state set on blur/change. `emailInvalid = emailTouched && email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)`. TextField `error={emailInvalid}` and `helperText` drive red border + message. Error clears when valid email typed. |
| **Edge cases** | Empty field shows no error (not triggered until touched). Valid email immediately clears error. |

---

## Existing Test Case Results (Sessions 1-3, unchanged at PASS)

All 32 previous TCs (TC-AUTH-001 through TC-AUTH-032) remain **PASS** — no regressions introduced by v4 changes. Build verified `EXIT:0`.

**TC-AUTH-016** remains ⚠️ PASS* — sessionStorage-only persistence requires cross-session manual browser DevTools verification. Code path confirmed correct in `AuthContext.login()`.

---

## Fix Summary (v4)

```
Total Issues (v4):  0 (no open bugs from previous sessions)
Fixed Issues (v4):  0 bugs — 3 new improvements implemented
New Features (v4):  3 (NEW-AUTH-006, NEW-AUTH-007, NEW-AUTH-008)
Test Cases Passed:  34 ✅
Test Cases Failed:  0 ❌
Test Cases Partial: 1 ⚠️ (TC-AUTH-016 — manual DevTools required)
```

---

## Backend-API Verification Pass — 2026-08-18

**Scope:** First-ever execution of the Backend-API row-level-scoping test cases from `test-cases/01-authentication/test-cases.md` (distinct doc/numbering from the frontend-mock-mode `TC-AUTH-0XX` cases above — see `CLAUDE.md`'s note that `test-cases/` and `test-plan/`/`test-result/`/`test-suggestion/` are two parallel documentation systems). These test cases existed since the pre-backend spec-writing phase but had never been run against a real backend until now, per the QA execution prompt (`QA-TESTING-EXECUTION-PROMPT.md`) Phase 1 inventory sweep.
**Environment:** Real running stack (`docker compose up -d`), real Postgres, real seeded accounts, GraphQL requests via `curl` with real JWTs.
**Tester:** Claude (Sonnet 5), code + live-request verification.

| TC ID | Description | First-run result | Fix | Re-verified |
|---|---|---|---|---|
| TC-AUTH-API-008 | Patient cannot fetch another patient's record by ID | ❌ **FAIL** — `patient(id)` had no row-level check at all; any patient JWT could read any patient record. Described in the spec as "the single most important test in the whole suite." | `backend/src/patients/patients.service.ts` `findOne`: reject if `id !== user.patient_id` for a `patient`-role caller. `patient_id` newly embedded in the JWT (`auth/strategies/jwt.strategy.ts`, `auth.service.ts`). | ✅ PASS — `patients.service.spec.ts` (2 cases) + live curl against `patient@medibook.dev`. |
| TC-AUTH-API-009 | Clinician cannot fetch a patient who isn't theirs | ❌ **FAIL** — no relationship check; any clinician JWT could read any patient in the org. | `patients.service.ts` `findOne`/`findAll`: restrict a `clinician`-role caller to patients with ≥1 shared appointment (`appointments: {some: {clinician_id}}`). | ✅ PASS — `patients.service.spec.ts` (4 cases) + live curl against `clinician@medibook.dev`. |
| TC-AUTH-API-010 | Cross-tenant isolation (Org 1 cannot see Org 2's clinics/patients) | ✅ **PASS on first run** — `orgScope()` (`client_org_id` join) was already implemented in `clinics.service.ts`/`patients.service.ts` before this pass. | N/A | N/A |

**Result: 2 of 3 Critical cases were failing on first real execution, both now fixed and re-verified. See `test-suggestion/patients-test-suggestion.md` and `test-suggestion/appointments-test-suggestion.md` for the full writeup (the same underlying gap-class also affected `appointments`/`testResults`, tracked there since those are domain-specific, not auth-specific).**
