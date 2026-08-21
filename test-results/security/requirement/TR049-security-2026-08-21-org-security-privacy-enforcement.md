---
id: TR049
type: requirement
feature: security
created: 2026-08-21
updated: 2026-08-21
status: passed
parent: REQ012
related: [PLAN021, TP050]
---

# Test result — org Security & Privacy real enforcement (REQ012/PLAN021/TP050)

**Outcome: PASS.** Backend committed as `f933951`, frontend as `879a4e1`.

## Unit tests

`docker exec medibook_backend npm test` — full backend suite green: **48 suites / 587 tests**. New/extended this pass: `org-settings.service.spec.ts` (6 new cases for `mySecuritySettings`/`updateMySecuritySettings`), `auth.service.spec.ts` (extended for `mfa_setup_required`/`session_timeout_minutes`), `audit-log.interceptor.spec.ts` (new, 7 cases), `ip-whitelist.guard.spec.ts` (new, 11 cases), `account.service.spec.ts` (extended, `myDataExport` describe block, 5 cases). One isolated re-run of `staff.service.spec.ts` hit a 5000ms bcrypt-hashing timeout during the full-suite run under heavy concurrent system load (backend tests + lint + Playwright + a live Chrome DevTools session all running at once) — re-ran in isolation immediately after and passed 20/20 in 1761ms, confirming it as load-induced flake, not a regression (`staff` module is untouched by this slice).

`docker exec medibook_backend npm run lint` — clean.

`npm run lint` (frontend) — the project's `package.json` `lint` script (`eslint . --ext js,jsx ...`) is broken against the installed ESLint version independent of this change (confirmed by running the identical broken command against `git stash`'d pre-change code, and by running `npx eslint` directly against the touched files, which produces the same "unused import" false-positive pattern even on unmodified files like `admin/Communications.jsx` — a pre-existing environment issue, not introduced here). `npx eslint` run directly against every touched file found zero errors introduced by this change (the three `jsx-a11y/no-autofocus` errors reported in `login.jsx` are on pre-existing lines this slice didn't touch).

`npm test` (frontend) — 1 suite / 4 tests green (`PermissionMatrix.test.jsx`, unrelated to this slice — the frontend has no other unit-test suites).

## Live e2e verification (real backend, curl + Chrome DevTools MCP)

1. MFA-redirect: toggled `mfa_required` on for the manager's org, logged in as the real (unenrolled) `manager@medibook.dev` through the actual UI — confirmed redirect to `/settings` with the Account & Security tab pre-selected and the warning banner visible, instead of `/manager/dashboard`. Logged in as `patient@medibook.dev` (same org, same setting still on) — confirmed normal `/patient/dashboard` landing, proving the MFA requirement correctly excludes patients per `auth.service.ts`'s `loadSecurityFields`.
2. Self-lockout exemption (verified in an earlier pass this session, backend already committed at the time): whitelisting a CIDR that excluded the test caller's IP correctly blocked a normal manager mutation with 403 while `updateMyOrgSecuritySettings` itself kept succeeding from the same excluded IP; whitelisting the real network restored normal access.
3. Patient data export: temporarily linked the demo patient account's `patient_id` to a real `Patients` row with real appointments (`UPDATE "UserProfiles" SET patient_id=... WHERE email='patient@medibook.dev'`, reverted to `NULL` immediately after), enabled `patient_data_export_enabled`, clicked "Download My Data" in the real UI — network trace confirmed a real `myDataExport` GraphQL response containing the linked patient's actual appointment rows (dates, statuses, notes), not fabricated data.
4. Audit logging: confirmed `AuditLogInterceptor` writes to the same `AuditLogs` table `admin/users/index.jsx`'s pre-existing Audit Logs tab reads via `getAuditLogs` (`grep` cross-check of both call sites against `prisma.auditLogs`), so the new toggle's help text ("viewable on the Audit Log tab") is accurate, not aspirational.
5. Manager org security settings correctly reset to a clean baseline (`mfa_required: false`, `session_timeout_minutes: null`, `audit_log_enabled: false`, `patient_data_export_enabled: false`, `ip_whitelist_enabled: false`, `ip_whitelist: ""`) after every round of manual verification, confirmed via a follow-up `myOrgSecuritySettings` query each time.

**No real backend bugs found this pass** (unlike several prior slices this session) — the one apparent anomaly during manual testing (a sidebar drawer appearing to open on every click at 360px) was investigated and confirmed to be a stale-DOM-reference artifact of the browser-automation tooling used for testing (backdrop elements MUI keeps mounted-but-hidden after a drawer closes were misread as "open" by a naive `.MuiBackdrop-root` presence check), not a real application defect — re-verified clean via screenshots using real UI interactions afterward.

## Browser e2e (Playwright)

`npx playwright test e2e/security-privacy.spec.js --workers=1` — 4/4 passing. Required bumping the file's test timeout to 60s (`test.setTimeout(60_000)`) — the default 30s was tight against this file's multiple real `page.reload()`s hitting the Vite dev server's on-demand compile, consistent with (not caused by) the same day's general system load; matches the precedent other reload-heavy specs in this suite already needed.

Also re-ran the adjacent specs this slice's changes could affect (`auth-login.spec.js`, `settings-account.spec.js`, `settings-2fa.spec.js`, `admin-policies-communications.spec.js`) serially — all green (13/13). An initial 2-worker parallel run of the same group produced several failures; re-running `--workers=1` confirmed these were resource contention (shared-account test-data races under parallel load, e.g. `settings-account.spec.js` briefly leaving `manager@medibook.dev`'s `first_name` as "Sarah E2E" between runs), not regressions — reverted the leftover test data via the real `updateMyProfile` mutation before the final clean serial run.

## Responsive check

360px/768px/1280px, live Chrome DevTools MCP screenshots: `admin/Policies.jsx`'s Security & Privacy tab (5 switches + conditional IP-whitelist card, confirmed the "Audit Log" sidebar nav item is visible at 1280px matching the help copy) and `settings/index.jsx`'s new "Your Data" section (patient role, between Active Sessions and Danger Zone) — zero horizontal overflow at any breakpoint.
