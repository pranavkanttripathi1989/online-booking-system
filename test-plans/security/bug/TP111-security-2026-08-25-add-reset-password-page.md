---
id: TP111
type: bug
feature: security
created: 2026-08-25
updated: 2026-08-25
status: approved
parent: PLAN084
related: [BUG022]
---

# TP111 — Test plan for the new reset-password page

## Frontend unit — `frontend/src/pages/auth/reset-password.test.jsx` (new)

| # | Case | Expected |
|---|---|---|
| 1 | No `token` query param | Renders the "invalid link" state; the password form never renders |
| 2 | `token` present, valid new password submitted | `resetPassword` called with `{input: {token, new_password}}`; on `{success: true}` a confirmation state renders with a link to `/login` |
| 3 | Password shorter than 8 characters | Inline validation error; mutation never called |
| 4 | Password/confirm mismatch | Inline validation error; mutation never called |
| 5 | Backend returns `{success: false, message: 'Invalid or expired reset token'}` | That exact message renders inline, not a generic fallback |
| 6 | Mutation throws (network/GraphQL error) | `err.message` renders inline |

## e2e — `frontend/e2e/reset-password.spec.js` (new), against the real backend

| # | Scenario | Assertion |
|---|---|---|
| 1 | Call `forgotPassword` for a real seeded account, extract the raw token from `docker logs medibook_backend`'s `[EMAIL STUB]` line, navigate to `/reset-password?token=...`, submit a new password | Success state renders; a subsequent real login with the new password succeeds — proves the change was actually persisted, not just a UI success message. Account's password reverted in `afterAll`. |
| 2 | Navigate to `/reset-password` with no token | Invalid-link state renders |
| 3 | Navigate to `/reset-password?token=garbage` and submit a valid new password | The real backend message "Invalid or expired reset token" renders inline |

## Full-suite gate before commit (Hard Rule 3)

```
cd frontend && npm run lint && npm test && npm run build
npx playwright test reset-password.spec.js
```

No backend changes in this slice — the backend unit/integration/lint/
typecheck suites are re-run only as a sanity check that nothing else in
flight regressed, not because this slice touches backend code.
