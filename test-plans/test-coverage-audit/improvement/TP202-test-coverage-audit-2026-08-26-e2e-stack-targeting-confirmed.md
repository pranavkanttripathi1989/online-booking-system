---
id: TP202
type: improvement
feature: test-coverage-audit
created: 2026-08-26
updated: 2026-08-26
status: approved
parent: PLAN182
related: []
---

# TP202 — Test plan: F-28 residue investigation

| # | Case | Steps | Expected |
|---|---|---|---|
| 1 | Playwright default target | Read `playwright.config.js` | `baseURL`/`webServer.url` default to `http://localhost:3000` (dev) when `E2E_BASE_URL` unset |
| 2 | Default command | Read `package.json`'s `e2e` script | `"playwright test"`, no env var set |
| 3 | Historical usage | Grep `test-results`/`context` for `e2e:isolated`/isolated stack mentions | A small minority of documents (confirmed: 5) |
| 4 | Fixture-name reasoning corrected | Compare `seed-e2e.ts`'s own fixture names against dev's | Deliberately identical — a name match is not stack evidence |
| 5 | DB-aware specs' own default | Read `E2E_DB_CONTAINER`/`E2E_DB_NAME` fallbacks in specs that use them | Default to `medibook_postgres`/`medibook_db` (dev) |
| 6 | Isolated backend health, before | `curl` `backend_e2e`'s GraphQL endpoint; check its logs | Empty reply; logs show 357 TS compile errors |
| 7 | Isolated backend repair | `prisma generate` + `npm install` + restart inside the container | Clean compile ("Found 0 errors"), "Nest application successfully started" |
| 8 | Isolated backend health, after | `curl` the GraphQL endpoint again | Real `{"data":{"__typename":"Query"}}` response |
| 9 | Cold-start reproduction | `npm run e2e:isolated -- auth-login.spec.js`, freshly-repaired stack | 1 of 2 tests times out waiting for the login form |
| 10 | Warm-server confirmation | Re-run the same spec immediately after | 2 of 2 pass, well under budget |
| 11 | Own-code regression fix | `tsc --noEmit` / `npx jest appointments.service.spec.ts` after the strictness fix | 0 errors; 87/87 tests pass |
| 12 | Full suite regression | Backend unit suite | 93/93 suites, 1565/1565 tests unchanged |
