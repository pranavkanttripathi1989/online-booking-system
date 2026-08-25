---
id: TR110
type: bug
feature: security
created: 2026-08-25
updated: 2026-08-25
status: pass
parent: TP111
related: [BUG022, PLAN084]
---

# TR110 — Results for the new reset-password page (BUG022)

Executed 2026-08-25 against `medibook_backend`/`medibook_frontend` (the
shared dev stack) on `master`. No backend change in this slice.

## Frontend unit — `reset-password.test.jsx` (new)

| Case | Result |
|---|---|
| No `token` → invalid-link state, no form | **pass** |
| Valid token + valid password → real mutation called, success state | **pass** |
| Password shorter than 8 chars → blocked client-side | **pass** |
| Password/confirm mismatch → blocked client-side | **pass** |
| Backend `{success: false, message: 'Invalid or expired reset token'}` → that exact message renders | **pass** |

5/5. Full frontend unit suite: 92 tests / 12 suites, 90 passing. The 2
failures are the same pre-existing, unrelated `booking/index.test.jsx`
full-suite-contention flake documented in `TR109` — confirmed by file
name, not re-investigated. `eslint`: 0 errors, 162 warnings (ratchet
held, unchanged). `npm run build`: clean.
`scripts/check-page-data-wiring.mjs`: 0 new fabricated pages.

## e2e — `reset-password.spec.js` (new), against the real backend

| Case | Result |
|---|---|
| Real `forgotPassword` → real token extracted from the backend's own `[EMAIL STUB]` log → real `resetPassword` via the new page → old password login fails, new password login succeeds | **pass** |
| No token → invalid-link state | **pass** |
| Garbage token → real "Invalid or expired reset token" backend message | **pass** |

3/3, first run. Uses a freshly-registered disposable account
(`registerDisposableAccount`, the same helper `settings-2fa.spec.js`
already uses for the identical reason) rather than a shared demo
account — no revert/cleanup needed, and no risk to other specs'
`loginAs()` calls.

## Responsive check

`document.scrollWidth`/`clientWidth` probe at 360/768/1280px: no overflow
at any width. The page is a structural clone of the already-verified
`forgot-password.jsx` (same two-panel layout, same breakpoints), which
carries a low residual risk for this simple form page — no tables or
dense data where CLAUDE.md's own documented `scrollWidth` blind spot
would matter.

## Commits

See the commits immediately following this test-results doc in `git log`.
