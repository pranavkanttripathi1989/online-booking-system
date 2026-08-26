---
id: CTX-security-2026-08-25-bug022
type: bug
feature: security
created: 2026-08-25
updated: 2026-08-25
status: done
parent: BUG022
related: [PLAN084, TP111, TR110, project-plans/analysis/08-integration-gap-analysis.md]
---

# security — BUG022, password-reset flow had no second step (2026-08-25, closed same day)

Found via `project-plans/analysis/08-integration-gap-analysis.md` (finding A-1) —
a real, already-tested backend mutation (`resetPassword`) with no
frontend page ever calling it. `forgot-password.jsx` only ever called the
first step (`forgotPassword`), so the flow dead-ended at "check your
inbox" for every account on the system.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | BUG022 | [password-reset flow has no second step](../../requirements/security/bug/BUG022-security-2026-08-25-password-reset-flow-has-no-second-step.md) |
| implementation-plans | PLAN084 | [add reset-password page](../../implementation-plans/security/bug/PLAN084-security-2026-08-25-add-reset-password-page.md) |
| test-plans | TP111 | [test plan](../../test-plans/security/bug/TP111-security-2026-08-25-add-reset-password-page.md) |
| test-results | TR110 | [results — all green](../../test-results/security/bug/TR110-security-2026-08-25-add-reset-password-page.md) |

## What shipped

- New `frontend/src/pages/auth/reset-password.jsx` — reads `token` from
  the URL query string, real `resetPassword` mutation, client-side
  length/confirm-match validation mirroring `settings/index.jsx`'s own
  "Change Password" tab, mirrors `forgot-password.jsx`'s exact visual
  structure (same `AuthLayout` parent route, same two-panel layout).
- New `/reset-password` route in `App.jsx`, nested under the same
  `AuthLayout` block `/login`/`/forgot-password` already use.
- No backend change — `resetPassword` was already correct and tested.
- New `reset-password.test.jsx` (5 cases) and
  `frontend/e2e/reset-password.spec.js` (3 cases, against the real
  backend — a genuine `forgotPassword` → real token extracted from the
  backend's own `[EMAIL STUB]` console log → real `resetPassword` → old
  password login fails, new password login succeeds).

## Verification

Frontend unit 90/92 (2 pre-existing unrelated `booking/index.test.jsx`
contention-flake failures, same as `TR109`'s own account), lint clean
(162 warnings, ratchet held), build clean, `check-page-data-wiring.mjs`
clean, new e2e spec 3/3 on first run, 360/768/1280px overflow check
clean. No backend changes in this slice.

## What this does not close

No real email delivery exists yet for the token (`[EMAIL STUB]` log
only) — a pre-existing, already-documented gap (no AWS SES pipeline
anywhere in this codebase yet), not something this fix builds. OTP/SMS
password recovery is out of scope — this is the email-token path only,
matching what the backend actually implements.

The remaining findings in `project-plans/analysis/08-integration-gap-analysis.md`
(A-2 through A-10, B-2 through B-4) are still open, per that document's
own "Fix sequencing" section.
