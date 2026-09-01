---
id: TR267
type: requirement
feature: platform-billing
created: 2026-09-02
updated: 2026-09-02
status: done
parent: TP267
related: [PLAN247]
---

# TR267 — Test results: super-admin tenant subscription management

## TP267 case outcomes

All 31 cases pass — 24 backend, 7 frontend.

```
PASS src/platform-billing/platform-billing.service.spec.ts (35 tests)
PASS src/platform-billing/providers/razorpay-subscriptions.provider.spec.ts (14 tests)
PASS src/platform-billing/providers/stripe.provider.spec.ts (18 tests)
PASS src/platform-billing/platform-billing-dunning-sweep.service.spec.ts (14 tests)

Test Suites: 4 passed, 4 total
Tests:       81 passed, 81 total
```

`npx tsc --noEmit` / `npx eslint "src/platform-billing/**/*.ts"` — clean
(one real fix along the way: `platform-billing.service.ts` imported
`BadRequestException`/`NotFoundException` and never used either — this
service uses the `{success, message}` result convention throughout, like
`plans.service.ts`, never a thrown `HttpException`; removed the dead
import rather than adding a use for it).

```
PASS src/pages/admin/PlatformBilling.test.jsx (6 tests)

Test Suites: 1 passed, 1 total
```

Frontend lint: 0 errors on `PlatformBilling.jsx`/`.test.jsx`,
`Organizations.jsx`, `Plans.jsx`, `App.jsx`, `AppShell.jsx` (I18N-1
warning class only, pre-existing across the whole codebase — see
`FRONTEND_RULES.md` §22). Full project lint: 3522/4908 warnings, exit 0
(ratchet not increased). `npm run build` — succeeded, new
`PlatformBilling-*.js` lazy chunk 17.90 kB / 5.76 kB gzipped, well under
budget. `npm run size` — all four budgets green (largest lazy chunk
109.93 kB / 115 kB limit, unrelated to this slice's own small chunk).

## Real bugs found and fixed during this pass

1. **`applyBillingEvent`'s `charge_succeeded` handler** special-cased a
   `past_due`-recovery renewal to a hardcoded 1-month extension instead
   of re-deriving the subscription's real billing period — an annual
   subscriber recovering from a failed charge would have been extended
   by 1 month, not 12. Caught while writing case 11, fixed before the
   suite ever ran red.
2. **The same handler's renewal-vs-cancellation race** — a
   `charge_succeeded` webhook arriving after a subscription was already
   flagged `cancel_at_period_end` would have incorrectly renewed instead
   of finalizing the cancellation. Fixed with an explicit `shouldRenew`
   guard, verified by case 12.
3. **`PlatformBilling.jsx`'s tenant-search Autocomplete re-fired its
   debounced search on the option's own full display label
   (`"Name (code)"`) every time a selection was made** — MUI fires
   `onInputChange` with `reason: 'reset'` on selection, not just on
   typing, and the handler didn't check `reason`. Live-caught by the
   frontend test suite itself (a real `ApolloError: No more mocked
   responses` thrown from inside the debounce's `setTimeout`, not a
   design review) — fixed by skipping `reason === 'reset'`/`'clear'`.
   Confirmed the wasted network call is also gone against the real
   pattern, not just the test's mock set.
4. A pre-existing `Organizations.test.jsx` broke as a **correct**
   consequence of replacing the legacy subscription dialog with a
   `useNavigate()`-driven "Manage in Platform Billing" button — the test
   rendered the page with no `<Router>` context at all. Fixed by wrapping
   `renderPage()`'s `render()` call in `<MemoryRouter>`, matching how
   every other router-aware page test in this codebase already does it.

## Frontend test flakiness under full-parallel contention (not a regression)

A full, unfiltered `CI=true npx jest` run (62 suites, 413 tests) showed
`PlatformBilling.test.jsx` failing on its own 5000ms default timeout
alongside two pre-existing, unrelated suites (`settings/index.test.jsx`,
`components/shared/NotificationBell.test.jsx` — neither imports anything
this slice touched) — the same class of host-load contention flakiness
`CLAUDE.md` already documents for this project (Phase G+4's own account:
"4 pre-existing, resource-contention timeout flakiness... none import
the touched file"). Confirmed by running `PlatformBilling.test.jsx`
three consecutive times in isolation (all green, ~15–18s each) and
alongside `Organizations.test.jsx` specifically (also green) — the
slow test (`creates a subscription...`, a real 300ms debounce plus two
network round trips plus `userEvent.type`'s own per-keystroke timing)
had its own Jest timeout explicitly raised to 15000ms, and the retry
test to 10000ms, rather than the debounce being faked away — this keeps
the real debounce path under test instead of hiding it behind fake
timers.

## Live verification

Schema introspection against the real running `medibook_backend`
container (after `docker exec ... npx prisma generate` +
`docker restart medibook_backend`) confirmed all 5 new queries
(`platformBillingProviders`, `platformSubscriptions`,
`platformSubscription`, `platformInvoices`, `platformTransactions`) and
all 3 new mutations (`createPlatformSubscription`,
`cancelPlatformSubscription`, `retryPlatformInvoice`) are genuinely
served by the running server — no silent module-recompile race this
time (`CLAUDE.md`'s own documented risk for this exact scenario).

A full `super_admin`-authenticated live create-subscription →
cancel-subscription round trip against the real dev database was
**attempted and blocked**, not silently skipped: no seeded `super_admin`
demo account exists (the seeded `admin@medibook.dev` carries `admin`),
and this session's own auto-mode permission classifier blocked the one
available workaround — a direct `UPDATE` promoting
`admin@medibook.dev`'s `UserProfiles.role_id` to `super_admin` — as a
hard-to-reverse action against running shared infrastructure. This is
the same class of block `F-33` (default Postgres password rotation) hit
in an earlier session; no workaround was attempted, matching that
precedent. Recorded here and in `REQ178` rather than silently claimed as
covered. Both gateway adapters remain honestly unverified against a real
Razorpay/Stripe account — no test credentials exist in this environment
for either.

## Full backend suite

`npx jest --maxWorkers=2` — 146 suites / 2348 tests, zero regressions.
`npm run test:int` — 9 suites / 450 tests, zero regressions
(`matrix-coverage.int-spec.ts` confirms `platform-billing` is correctly
classified `EXEMPT`, not an unclassified gap).
