---
id: TR108
type: improvement
feature: platform-nfr
created: 2026-08-25
updated: 2026-08-25
status: done
parent: TP109
related: [PLAN082]
---

# TR108 — Test results: Phase G+3 frontend completion

Commit: (recorded at commit time — see the `context/` manifest for this
bundle for the final SHA)

## TP109 case outcomes

All 10 cases from TP109 passed against the real backend, `frontend/e2e/
phase-g3-frontend-completion.spec.js`, `npx playwright test ... --workers=1`:

| # | Case | Result | Notes |
|---|---|---|---|
| 1 | Checklist blocks/clears Call Next | PASS | Failed repeatedly before three real fixes: `.check()` verifying too early, a `data-testid` needed on the Clinic select (MUI accessible-name bug), and a real backend bug (missing `NotificationEventType` enum value) — see PLAN082 |
| 2 | Intake Fields enforced + round-trips | PASS | Failed on the same Clinic-select issue as #1 before the `data-testid` fix |
| 3 | Break-glass request/revoke | PASS | |
| 4 | Impersonation start/exit | PASS | Failed repeatedly before the `AuthContext.jsx` `isLoading` race fix (PLAN082 bug #2) — a real app bug, not a test issue |
| 5 | Packages create/sell/redeem | PASS | Failed repeatedly across three separate real bugs before passing clean: the client-side `productsForClinic` filter, the backend `packages.service.ts` clinic_id validation, and the `redeemPackageSitting` GraphQL contract mismatch — see PLAN082 bugs #4–6 |
| 6 | Branch Overrides persist | PASS | |
| 7 | Discount Approval queued/approved | PASS | Failed once on a wrong assumption (row disappears after approval — it doesn't, matching every other status-badged table); once on residue from a fixed, non-unique fixture reason string colliding with prior runs |
| 8 | Cash Drawer Close | PASS | Failed once on the once-per-clinic-per-date server rule colliding with the dialog's own today-default business date across repeated runs |
| 9 | Documents PDF download | PASS | Failed once before the "Download Invoice" reachability bug fix (PLAN082 bug #3) |
| 10 | Messages department/attachment/canned-reply | PASS | Failed once on a strict-mode locator collision (two "New message"-labeled controls); once on a wrong button label ("Save" vs the real "Add reply") |

Final full-suite run: **10 passed (5.6m)**, zero failures, zero skips.

## Full verification suite (Hard Rule 3)

| Check | Result |
|---|---|
| `frontend: npm run lint` | Clean — 165 warnings (down from the 177 baseline; ratchet respected) |
| `frontend: npm test` | 82/82 tests, 10/10 suites passed |
| `frontend: npm run build` | Clean, `built in 1m 20s` |
| `node scripts/check-page-data-wiring.mjs` | 0 new fabricated pages |
| `backend: npx jest --maxWorkers=2` | 1215/1215 tests, 80/80 suites passed (up from 1213 — 2 new `packages.service.spec.ts` cases for the master-product fix) |
| `backend: npm run test:int` | 369/369 tests, 4/4 suites passed — run from the host per the established gotcha |
| `backend: eslint` | Clean |
| `backend: npx tsc --noEmit` | Clean |

## Bugs found and fixed during this pass (see PLAN082 for full detail)

1. Backend: `break-glass.service.ts`'s notification dispatch used an
   event-type value never added to the `NotificationEventType` enum —
   failed the entire `requestBreakGlassAccess` mutation for any org with
   an admin/manager to notify. Fixed with a migration + a `DEFAULTS`
   entry.
2. Frontend: a real impersonation race — `AuthContext.jsx`'s `LOGIN`
   reducer case unconditionally cleared `isLoading`, so a null-user
   dispatch during impersonation start let `RootRoute` flash-redirect to
   `/dashboard` before the real role loaded, which `RoleGuard` then
   rejected. Fixed with an explicit `SET_LOADING: true`.
3. Frontend: the "Download Invoice" button was unreachable — the Take
   Payment dialog closed on success at the exact moment the condition
   that reveals the button became true. Fixed by not closing the dialog on
   a successful payment.
4. Frontend: `redeemPackageSitting`'s mutation call used the wrong
   GraphQL argument shape (two scalars instead of a wrapped `input`) — the
   entire redeem-a-sitting feature was non-functional from when it
   shipped. Fixed to match the real resolver contract.
5. Backend: `packages.service.ts` rejected every real product, since
   `createProduct` never sets a `clinic_id` (every real product is an
   org-level master) while the validation required strict equality. Fixed
   to accept a master product gated on matching org instead.
6. Frontend: the identical bug, client-side, in the packages page's own
   product-filter — found first, before its backend counterpart.
7. Frontend: three real accessibility gaps (checklist checkbox, admin
   users' Impersonate button, finances' Approve/Reject buttons) — each had
   a `Tooltip` but no `aria-label`, leaving no accessible name at all, not
   just a test-locator inconvenience. Fixed with explicit `aria-label`s.
8. Frontend: documented a genuine MUI `Select` testability finding — its
   accessible name concatenates the label with the selected value once
   one is set, so `getByLabel` stops matching after the first selection.
   Resolved with stable `data-testid`s on the three affected selects.

## Environment note

Not a defect in this slice — recorded for continuity, matching `PLAN073`'s
own precedent. Both `medibook_backend` and `medibook_frontend` wedged into
an "Up but unresponsive" state more than once mid-pass (confirmed via
`docker exec ... wget localhost` timing out from inside each container),
on top of a real host load spike (1-minute load average past 47, driven by
`com.docker.hyperkit` plus an unrelated macOS Storage-usage scan). Resolved
each time via the established recovery pattern: quit Docker Desktop
entirely, relaunch, then `docker rm -f`/`docker compose up -d` the specific
wedged container once the daemon was back. A targeted `docker rm -f` alone
(without first quitting Docker Desktop) hung more than once with `docker
ps` itself still responsive — confirming the full relaunch, not more
targeted retries, is the right first move when that happens.
