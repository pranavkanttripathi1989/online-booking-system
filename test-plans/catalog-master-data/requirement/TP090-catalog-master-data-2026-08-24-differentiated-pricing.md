---
id: TP090
type: requirement
feature: catalog-master-data
created: 2026-08-24
updated: 2026-08-24
status: approved
parent: REQ016
related: [PLAN063]
---

# TP090 — Test plan: differentiated pricing by patient category and channel

Direct test-plan against a well-scoped extension (a new shared pure
function plus two known call sites) — suggestion stage skipped per
`CLAUDE.md`'s working loop step 4.

## Unit — `resolve-price.spec.ts` (pure function)

| Case | Given | When | Then |
|---|---|---|---|
| TC-01 | No overrides | resolve | Base price |
| TC-02 | Null/undefined product | resolve | `null` |
| TC-03 | Matching patient-category override | resolve | The category rate |
| TC-04 | No matching category, no channel passed | resolve | Base price |
| TC-05 | Matching channel override, no category match | resolve | The channel rate |
| TC-06 | No channel passed at all | resolve | Base price (channel override never considered) |
| TC-07 | Both category and channel overrides apply | resolve | Category wins |
| TC-08 | Malformed (non-object) pricing JSON | resolve | Falls through to base price, doesn't throw |
| TC-09 | Base price itself `null`, no override | resolve | `null` |

## Unit — `appointment-payments.service.spec.ts` (the charge-determining call site)

| Case | Given | When | Then |
|---|---|---|---|
| TC-10 | Existing fixture, no overrides | `createRazorpayOrder` | Unchanged behavior (base price), regression check |
| TC-11 | Patient tagged `corporate`, a matching category override | `createRazorpayOrder` | Charges the corporate rate |
| TC-12 | No category match, a channel override present | `createRazorpayOrder` | Charges the `'online'` rate, never `'walkin'` |
| TC-13 | Any call | `createRazorpayOrder` | `appointments.findUnique`'s `include` now requests `patient: true` |

## Unit — `appointments.service.spec.ts` (the display call site)

| Case | Given | When | Then |
|---|---|---|---|
| TC-14 | Patient tagged `corporate`, matching category override | `findOne` | `service.price` reflects the corporate rate |
| TC-15 | No matching category override | `findOne` | `service.price` is the base price |

## Unit — `services.service.spec.ts`

| Case | Given | When | Then |
|---|---|---|---|
| TC-16 | `category_pricing`/`channel_pricing` input | `create` | Converted rupees→paise-keyed JSON |
| TC-17 | Overrides omitted entirely | `create` | `category_pricing_json`/`channel_pricing_json` left `undefined` (untouched), not cleared |
| TC-18 | Stored paise-keyed JSON | `findAll` | Converted back to rupees on read |
| TC-19 | No stored overrides | `findAll` | `category_pricing`/`channel_pricing` omitted (`undefined`), not `{}` |

## Static / build gates

| Case | Command | Expected |
|---|---|---|
| TC-20 | `npx prisma validate` | Schema valid |
| TC-21 | `npx tsc --noEmit` | No new errors |
| TC-22 | `npm test` (full suite) | All suites green |
| TC-23 | Frontend `npx eslint src/pages/manager/services/create.jsx src/pages/manager/services/edit.jsx` | 0 errors |
| TC-24 | Frontend `npm run build` | Succeeds |

## Live verification against the real dev stack

| Case | Given | When | Then |
|---|---|---|---|
| TC-25 | A corporate-tagged real patient, a service with a corporate category override | Book via the app, then pay via the real Razorpay flow | Both the booking-time display price and the actual Razorpay charge amount agree — the specific regression this design prevents |
