---
id: TR050
type: requirement
feature: organization-branding
created: 2026-08-21
updated: 2026-08-21
status: passed
parent: REQ002
related: [PLAN022, TP051]
---

# Test result — real backend + AppShell propagation for organization branding (REQ002/PLAN022/TP051)

**Outcome: PASS.** Backend + frontend + e2e spec committed together as `464ffdd` (a `git restore` typo meant the planned backend/frontend split into two commits didn't happen this pass — harmless, noted for the record).

## Unit tests

`docker exec medibook_backend npx jest org-settings.service.spec.ts contrast.spec.ts` — **2 suites / 27 tests, all green** (`contrast.spec.ts`: 5 new cases; `org-settings.service.spec.ts`: 8 new cases in the `myBranding`/`updateMyBranding` block, plus the file's pre-existing cases). Confirmed in a dedicated, isolated run (not sharing the host with any other test process) after an initial attempt run concurrently with the full backend suite made both runs unreliable to read cleanly under this host's resource constraints — see the note below.

Full backend `npm test` (run earlier this session, before this feature's own isolated re-run): 596/600 passing; the 4 failures were all bcrypt-hashing timeouts in `account.service.spec.ts`'s TOTP/password tests, unrelated to this feature — re-ran `account.service.spec.ts` alone immediately after and got 30/30, confirming host-load-induced flake, not a regression (same pattern already established in `TR049`).

No dedicated `org-branding.controller.spec.ts` exists — `account.controller.ts` (the endpoint this REST upload mirrors) has no controller-level spec in this codebase either; this follows that existing precedent rather than introducing a new, inconsistent one. The upload endpoint's real behavior (magic-byte validation, 2MB limit, org-linked-only gate) is covered by live e2e/curl verification instead.

## Browser e2e (Playwright)

`npx playwright test e2e/organization-branding.spec.js --workers=1` — **3/3 passing** when run in isolation (54.0s / 46.4s / 23.4s). An earlier attempt to run this spec concurrently with the backend's `org-settings.service.spec.ts`/`contrast.spec.ts` jest run on the same host hit a hard `page.goto` `net::ERR_ABORTED` failure at the 60s test timeout — not a real defect, reproduced as a direct consequence of running two heavy test processes (a Docker-hosted Jest suite plus a separate headless-Chromium Playwright run) at once on this machine's 8GB of RAM; re-running the same spec alone immediately after passed cleanly 3/3. This session independently hit and root-caused the same class of host resource exhaustion earlier (see `RESUME-NOTES.md`, since resolved via cache cleanup and a host restart) — the lesson carried forward here is to not run concurrent heavy test processes on this machine, not a code fix.

Covers: real multipart logo upload persisting as `/uploads/branding/...` and rendering in both the Settings preview and `AppShell`'s sidebar after a reload; the org's real name (`City Heart Clinic Group`) replacing "HealthSync" in the sidebar; a too-light color rejected with a clear message and no false success state; an admin (no organization) seeing the disabled-branding notice on Settings and the default HealthSync shell in `AppShell`, confirming platform-wide callers are unaffected by any tenant's branding.

## Live verification (real backend)

Confirmed during initial implementation (prior to this documentation pass, same session): a real PNG upload via `POST /org-branding/logo` resolved to a real file; `updateMyOrgBranding` with a passing color persisted and round-tripped through `myOrgBranding`; the platform's own prior default `secondary_color` (`#00858F`) failed WCAG AA contrast by a hair (4.42:1 vs. the required 4.5:1) — this was a real bug in the platform's own shipped default, fixed via a follow-up migration changing the column default to `#007680` (5.38:1) and backfilling any row still on the old value.

## Responsive check

360px/768px/1280px — Settings → Clinic → Branding section and both `AppShell` variants (sidebar, top-nav) verified against the same breakpoints established for every other slice this session; zero horizontal overflow.

## Scope notes (see PLAN022)

Booking-email/invoice/favicon branding propagation and plan-tier gating are not built and not tested — no live email pipeline, invoice module, dynamic-favicon infrastructure, or entitlements guard exists yet in this codebase. `primary_color`/`secondary_color` are fetched by `AppShell` but not wired into its hardcoded `TEAL`/`TEAL_LIGHT` gradient constants this pass (a separate, larger retheming effort). Both logged in `PLAN022` as deliberate scope decisions, not silent gaps.
