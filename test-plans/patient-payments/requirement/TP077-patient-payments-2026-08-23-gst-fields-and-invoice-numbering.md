---
id: TP077
type: requirement
feature: patient-payments
created: 2026-08-23
updated: 2026-08-23
status: approved
parent: REQ047
related: [PLAN050]
---

# TP077 — Test plan: GST fields and invoice numbering

Direct test-plan against an already-proven pattern (a status-transition
side-effect on an existing, tested payment flow) — suggestion stage
skipped per `CLAUDE.md`'s working loop step 4.

## Unit

| Case | Given | When | Then |
|---|---|---|---|
| TC-01 | A payment's signature verifies correctly | `verifyRazorpayPayment` succeeds | The update call includes a real `invoice_number` matching `INV/<FY>/<CLINIC>/<00001>` |
| TC-02 | The appointment's linked product has `is_tax_exempt: true` and an `hsn` | Payment succeeds | `hsn_sac_code` copied from the product; `gst_rate`/`cgst_amount`/`sgst_amount`/`igst_amount` all real `0`, not null |
| TC-03 | The appointment's linked product has `is_tax_exempt: false` | Payment succeeds | `hsn_sac_code` still copied; `gst_rate`/`cgst_amount`/`sgst_amount`/`igst_amount` stay `undefined`/untouched — no guessed rate |
| TC-04 | Two payments for the same clinic in the same financial year | Both succeed in sequence | The invoice-sequence `upsert` is called with `update: { last_number: { increment: 1 } } }`; the second payment's number is one higher than the first's, never repeated or skipped |
| TC-05 | A `payment.captured` webhook delivery for a pending payment | `handleRazorpayWebhook` processes it | Same invoice-assignment behavior as TC-01, via the webhook path instead of client-side verification |
| TC-06 (regression) | Every pre-existing `appointment-payments.service.spec.ts` case | Suite run | Still green — two exact-match assertions updated to `objectContaining` to reflect the update payload now genuinely carrying more fields, not loosened to hide a behavior change |

## Static / build gates

| Case | Command | Expected |
|---|---|---|
| TC-07 | `npx prisma validate` | Schema valid with the new columns/table |
| TC-08 | `npx prisma migrate deploy` (against `postgres_test`) | Migration applies cleanly |
| TC-09 | `npx tsc --noEmit` | No new errors |
| TC-10 | `npx eslint src/appointment-payments` | 0 errors, 0 new warnings |
| TC-11 | `npx jest appointment-payments.service --maxWorkers=2` | All cases above pass |

## Deliberately not covered

No live end-to-end Razorpay sandbox run this session (would need real
sandbox credentials and a reachable webhook URL, per `REQ040`'s own
documented local-sandbox limitation) — the HMAC-verification and
webhook-idempotency paths this slice's logic sits inside were already
covered end-to-end by `REQ040`'s test suite; this slice only adds a
side-effect on the already-proven "payment just succeeded" transition.
