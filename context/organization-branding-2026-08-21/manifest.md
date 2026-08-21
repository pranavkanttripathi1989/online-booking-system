---
feature: organization-branding
date: 2026-08-21
ids: [REQ002, PLAN022, TP051, TR050]
status: done
---

# organization-branding — 2026-08-21

Closes the last remaining Priority 2 item — organization Branding (`REQ002`, approved 2026-08-17, no backend at the time). Real logo upload, primary/secondary color pickers with server-side WCAG AA contrast validation, and propagation into `AppShell`'s sidebar/top-nav are now real and tested, following the same typed-column `org-settings` pattern (`myOrgX`/`updateMyOrgX`, `{success, userErrors, entity}`) every other org-level feature this session used — not `REQ002`'s original suggestion of a `Json` settings blob, for consistency with the rest of the domain.

Found and fixed one real bug live: the platform's own existing default `secondary_color` (`#00858F`, used widely in frontend gradients) failed WCAG AA contrast by a hair (4.42:1, needs 4.5:1) — fixed via a follow-up migration changing the column default to `#007680` (5.38:1) and backfilling any row still on the old value.

SVG logo uploads were deliberately excluded (PNG/JPEG only) — SVG is XML that can embed `<script>`/event-handler payloads, and this logo is served back to every booking-page visitor including unauthenticated patients; no SVG-sanitization library exists in this environment, so accepting it unsanitized would be a real stored-XSS vector. Logged as a real, separate follow-up requiring a sanitizer dependency, not a "just accept it" shortcut.

Booking-confirmation-email branding, invoice/receipt branding, favicon swap, and plan-tier gating (Starter/Pro/Enterprise) are explicitly not built this pass — no live email-sending pipeline, invoice/PDF module, dynamic-favicon infrastructure, or entitlements guard exists anywhere in this codebase yet. `primary_color`/`secondary_color` are fetched by `AppShell` but not wired into its ~40 hardcoded `TEAL`/`TEAL_LIGHT` references this pass — a separate, much larger retheming effort. All logged in `PLAN022`, not silently dropped.

A same-session host resource crisis (disk down to 1.1GB free, RAM as low as 17MB free under ~76 accumulated Chrome-related processes) forced a host restart mid-session, documented in `RESUME-NOTES.md`; this bundle's documentation trail (`PLAN022` draft, `TP051`, `TR050`, and every index update) was finished after resuming. One further, unrelated real bug was found and fixed while reconfirming test health post-restart: `AccountService.updateMyProfile()` collapsed both "clear the field" (`null`) and "leave it untouched" (omitted) into the same `undefined` branch for `date_of_birth`/`address`, via a `input.date_of_birth ? ... : undefined` ternary — meaning neither field could ever actually be cleared once set. Fixed to distinguish explicit `null` from omission (matching the established convention already used for `session_timeout_minutes` elsewhere this session), with 2 new unit tests.

## Requirement

- [REQ002 — Organization Branding & Management — Business Requirements](../../requirements/organization-branding/requirement/organization-branding-and-management-requirements.md) — done

## Implementation plan

- [PLAN022 — real backend + AppShell propagation for organization branding](../../implementation-plans/organization-branding/requirement/PLAN022-organization-branding-2026-08-21-real-backend-and-appshell-propagation.md) — done

## Test plan

- [TP051 — real backend + AppShell propagation for organization branding](../../test-plans/organization-branding/requirement/TP051-organization-branding-2026-08-21-real-backend-and-appshell-propagation.md) — approved

## Test results

- [TR050 — real backend + AppShell propagation for organization branding](../../test-results/organization-branding/requirement/TR050-organization-branding-2026-08-21-real-backend-and-appshell-propagation.md) — passed

## Related

- [security — 2026-08-21 bundle](../security-2026-08-21/manifest.md) — same `org-settings.service.ts` `myOrgX`/`updateMyOrgX` pattern this bundle's branding fields reuse.
- [settings — 2026-08-20 bundle](../settings-2026-08-20/manifest.md) — `AccountService.updateMyProfile()`, where this bundle's incidental `date_of_birth`/`address` null-clearing bug fix landed, was originally built there (REQ005/PLAN010/PLAN016).
- [organization-branding — 2026-08-17 bundle](../organization-branding-2026-08-17/manifest.md) — the original REQ002 business-requirements bundle, written before any backend existed.
