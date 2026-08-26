---
id: TR204
type: improvement
feature: notifications
created: 2026-08-27
updated: 2026-08-27
status: pass
parent: TP204
related: [REQ144, PLAN184]
---

# TR204 — Results for WhatsApp template-category routing + conversation metering (REQ144)

Executed 2026-08-27 against the real Prisma-generated client and a real
`npm run build`, on `master`, as slice P1-01 of Phase 1.

## Backend unit

`notification-trigger.service.spec.ts`: pass (includes all 7 P1-01
cases in TP204). `notification-billing.service.spec.ts`: pass, 9/9 (new
file). `notifications.resolver.spec.ts`: pass, includes the 2 new
role-gate cases and the 2 new `whatsappConversationSpend` cases.
`org-settings.service.spec.ts`: pass, 37/37 including the 5 new cap
cases.

Full backend suite: **94 suites / 1586 tests, all passing**
(`npx jest --maxWorkers=2`, 51.8s). `npx tsc --noEmit`: clean.
`npx eslint "{src,apps,libs,test}/**/*.ts"`: clean, 0 problems.

## Frontend

`admin/Communications.test.jsx`: **6/6 passing** (new file). `npm run
lint`: **1,906 warnings**, matching the documented ratchet baseline in
`.claude/skills/medibook-frontend-rules/SKILL.md` exactly — confirmed
zero new warnings introduced by this slice's own additions (checked the
new code's own file in isolation before the full-repo run: 0 errors, 6
pre-existing warnings in `Communications.jsx`, none on the lines this
slice touched). `npm run build`: succeeds
(`Communications-CuYrizIf.js` bundled at 17.62 kB gzip 5.74 kB — no
bundle-budget concern). `node scripts/check-page-data-wiring.mjs`:
"1 known-fabricated, 0 new" — unchanged.

## Live verification — honestly scoped

**Not performed against a real WhatsApp send.** No org in this dev
environment has a configured WhatsApp provider — `REQ144`'s own
"deliberately not built" section documents that no frontend UI exists
yet to configure one (only SMS is configurable today), a real,
separate, logged gap found while scoping this slice, not fabricated
around. The category-resolution, cost-computation, tenant-scoping, and
IST-month-boundary logic that actually carry this slice's risk are
covered directly and deterministically by the mocked-Prisma unit suite
above (in particular the IST-month-rollover boundary case, which a live
check on any single day could not exercise either). Flagged plainly
rather than claimed as end-to-end verified.

The Communications page's new card was rendered and interacted with
under `@testing-library/react` + `MockedProvider` (empty state, a
populated multi-category breakdown, a configured cap with both
under-cap and over-cap displays, a successful save, and a rejected
negative-cap save) — this is real DOM rendering and real user-event
simulation against the real component and its real GraphQL documents,
not a hand-inspection of the JSX.

## Commits

See the commits immediately following this test-results doc in `git log`.
