---
id: TR099
type: improvement
feature: platform-nfr
created: 2026-08-24
updated: 2026-08-24
status: done
parent: TP100
related: [PLAN073]
---

# TR099 — Test results: Phase G+2 frontend completion

Commit: (recorded at commit time — see the `context/` manifest for this
bundle for the final SHA)

## TP100 case outcomes

All 7 cases from TP100 passed against the real backend, `frontend/e2e/
phase-g2-frontend-completion.spec.js`, `npx playwright test ... --workers=1`:

| # | Case | Result | Notes |
|---|---|---|---|
| 1 | Admin Plans permission message | PASS | 14–28s across runs |
| 2 | Admin Payers directory + empanelment | PASS | Failed twice before the `/admin/payers` route-gating fix (PLAN073); real bug, not flaky |
| 3 | Admin Rights Requests resolve | PASS | Failed twice for the same route-gating reason as #2 |
| 4 | Manager Pharmacy receive stock | PASS | One iteration failed on a test-authoring bug (selected "All clinics" instead of a real clinic) — fixed in the spec, not the app |
| 5 | Manager Reports stats + schedule | PASS | |
| 6 | Settings Integrations (widget/webhook/API key) | PASS | One iteration failed on a strict-mode locator collision (`payment.succeeded` chip text matched both the create-form's selector chip and a residual prior-run webhook row's read-only chip) — fixed by switching to `getByRole('button', ...)`, which only the clickable selector chip renders as |
| 7 | Settings Privacy consent + rights request | PASS | Failed repeatedly before the `AuthContext`/`GET_MY_PATIENT_LINK` fix in PLAN073 — a real, pre-existing app bug, not a test issue (see PLAN073's bug #3) |

Final full-suite run: **7 passed (3.3m)**, zero failures, zero skips.

## Full verification suite (Hard Rule 3)

| Check | Result |
|---|---|
| `frontend: npm run lint` | Clean — 167 warnings, exactly matching the pre-session baseline (verified by stashing every touched file individually and re-linting the original committed version) |
| `frontend: npm test` | 68/68 tests, 8/8 suites passed |
| `frontend: npm run build` | Clean, `built in 1m 12s` |
| `node scripts/check-page-data-wiring.mjs` | 0 new fabricated pages (1 pre-existing allowlist note, unrelated to this pass) |
| `backend: npx jest --maxWorkers=2` | 1053/1053 tests, 73/73 suites passed (unaffected — no backend files touched this pass, run per Hard Rule 3 regardless) |
| `backend: npm run test:int` | 315/315 tests, 4/4 suites passed — **must run from the host**, not `docker exec medibook_backend`: its `postgres_test` connection is hardcoded to `localhost:5433`, which only resolves inside the container's own network namespace to the container itself, not the host-mapped `postgres_test` service |
| `backend: eslint` | Clean |
| `backend: npx tsc --noEmit` | Clean |

## Bugs found and fixed during this pass (see PLAN073 for full detail)

1. `settings/index.jsx` missing `CircularProgress` import — crashed the
   entire Settings page for every visitor, not just the new Privacy tab.
2. `/admin/payers` and `/admin/rights-requests` routed behind the
   `admin`/`super_admin`-only `RoleGuard`, while their backend resolvers
   allow `manager` — real managers were locked out of features meant for
   them.
3. A genuine, pre-existing `AuthContext.jsx` bug: `user.patient.id` is
   permanently `undefined` for a freshly-logged-in patient session,
   because `LOGIN_MUTATION`'s cached response has no `patient` field and
   the mount effect only calls the fuller `ME_QUERY` when no cached user
   exists. Worked around locally in the Privacy tab; the real fix is
   logged as an open question in PLAN073, not fixed here (out of scope).
4. Test-only: 5 genuine `no-unused-vars` warnings in the new e2e spec
   itself (unused GraphQL fixture setup the UI-driven test bodies never
   consumed) — caught by the lint ratchet, fixed by deleting the dead
   fixture code.

## Environment note

Not a defect in this slice — recorded for continuity. Mid-pass, the host
machine rebooted and entered a severe post-boot load spike (load average
peaking at 116.53), which repeatedly wedged Docker Desktop's daemon and
individual containers (`medibook_backend`, then `medibook_frontend` for
the first time this session) into an "Up but unresponsive" state. Resolved
each time with the established recovery pattern: quit Docker Desktop
entirely, relaunch, `docker rm -f` the wedged container, `docker compose
up -d` it fresh. See PLAN073's own Environment note for the full account.
