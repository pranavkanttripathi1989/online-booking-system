---
id: TR089
type: requirement
feature: catalog-master-data
created: 2026-08-24
updated: 2026-08-24
status: pass
parent: TP090
related: [REQ016, PLAN063]
---

# TR089 — Results: differentiated pricing by patient category and channel

Executed 2026-08-24 as part of the consolidated five-slice verification
pass (see `TR087`'s own note).

| Case | Result | Evidence |
|---|---|---|
| TC-01–TC-09 | pass | `resolve-price.spec.ts` — all 9 pure-function cases (base price, null product, category override, no-match fallthrough, channel override, no-channel-passed fallthrough, category-wins-over-channel, malformed JSON, null base price) |
| TC-10 | pass | Existing `createRazorpayOrder` fixture (no overrides) — unchanged behavior confirmed |
| TC-11 | pass | `charges the patient-category rate when the caller is tagged with a matching category` |
| TC-12 | pass | `charges the online-channel rate when no category override applies` |
| TC-13 | pass | `includes the patient relation so category overrides can be resolved` |
| TC-14 | pass | `shows the patient-category-adjusted price on the appointment's linked service` (display mapping) |
| TC-15 | pass | `shows the base price when the patient has no matching category override` |
| TC-16 | pass | `converts category/channel pricing overrides from rupees to paise-keyed JSON` |
| TC-17 | pass | `leaves pricing overrides untouched (undefined, not cleared) when omitted entirely` |
| TC-18 | pass | `converts stored pricing-override JSON from paise to rupees on read` |
| TC-19 | pass | `omits pricing-override fields entirely when none are stored` |
| TC-20 | pass | `npx prisma validate` |
| TC-21 | pass | `npx tsc --noEmit` — clean |
| TC-22 | pass | `npm test` — 64/64 suites, 983/983 tests (consolidated run) |
| TC-23 | pass | `npx eslint src/pages/manager/services/create.jsx src/pages/manager/services/edit.jsx` — 0 errors (1 pre-existing unrelated warning) |
| TC-24 | pass | `npm run build` — succeeds |
| TC-25 | pass (partial) | Live curl round-trip as `manager@medibook.dev` against the real dev-seeded "GP Consultation" service: set corporate-category and online/walk-in channel overrides via `updateService`, confirmed they persist and read back correctly (`category_pricing`/`channel_pricing`), and confirmed the display-mapping call site (`appointments` list) shows the correct base price (no channel applied pre-payment, matching the deliberate design). The charge-side confirmation (that `createRazorpayOrder`/`recordCounterPayment` resolve the *same* stored override to the *same* value) was done live via `recordCounterPayment` specifically — see `TR090`'s TC-13 for the full round-trip, since a real Razorpay checkout wasn't exercised this session. Reverted the shared dev service back to no overrides afterward. |

## Deliberately not covered

A live Razorpay checkout (as opposed to the counter-payment path) was not
exercised this session — no real Razorpay sandbox flow was driven through
the browser. The charge-consistency claim was instead confirmed live via
`recordCounterPayment` (see `TR090`), which resolves through the exact
same shared `resolveServicePrice()` helper as `createRazorpayOrder`, and
at the unit level for both call sites independently (TC-11/TC-12/TC-14).
