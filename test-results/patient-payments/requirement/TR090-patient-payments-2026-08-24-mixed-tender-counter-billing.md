---
id: TR090
type: requirement
feature: patient-payments
created: 2026-08-24
updated: 2026-08-24
status: pass
parent: TP091
related: [REQ023, PLAN064]
---

# TR090 — Results: mixed-tender counter billing

Executed 2026-08-24 as part of the consolidated five-slice verification
pass (see `TR087`'s own note).

| Case | Result | Evidence |
|---|---|---|
| TC-01 | pass | `rejects a nonexistent appointment` |
| TC-02 | pass | `rejects a cross-org appointment (never confirms cross-tenant existence)` |
| TC-03 | pass | `rejects an appointment with no priced product` |
| TC-04 | pass | `rejects tenders that sum to less than the amount due (no partial close in this slice)` |
| TC-05 | pass | `rejects tenders that sum to more than the amount due` |
| TC-06 | pass | `accepts a split across multiple tenders that sums exactly, and creates an audit trail row per tender` |
| TC-07 | pass | `resolves the walk-in-channel rate when a channel override exists` |
| TC-08 | pass | `npx prisma validate` |
| TC-09 | pass | `npx tsc --noEmit` — clean |
| TC-10 | pass | `npm test` — 64/64 suites, 983/983 tests (consolidated run) |
| TC-11 | pass | `npx eslint src/pages/appointments/detail.jsx` — 0 errors (2 pre-existing unrelated warnings) |
| TC-12 | pass | `npm run build` — succeeds |
| TC-13 | pass | Live curl round-trip as `manager@medibook.dev` against a real, real-seeded appointment: updated the real "GP Consultation" service with `corporate`/`walkin`/`online` overrides, confirmed `recordCounterPayment` resolved the `'walkin'` rate (₹450) — not the base ₹499 — and correctly rejected a ₹499 split before accepting a ₹300 cash + ₹150 UPI split that summed exactly, returning a real gapless invoice number (`INV/2026-27/7307C9D9/00001`) |
| TC-14 | pass | Same live round-trip's first attempt (tenders summing to ₹499 against a ₹450 amount due) — rejected with `"Tenders total ₹499.00 does not match the amount due ₹450.00"`, no row created |

## Live verification detail

Reused the real dev-seeded "GP Consultation" service and a real `scheduled`
appointment against it. Confirmed end-to-end, across Slices 4 and 5
together: `getServices`/`updateService` persist and read back
`category_pricing`/`channel_pricing` correctly; the appointment list's
display-mapping price correctly shows the *base* rate (₹499, no channel
applied at display time, no category override for this patient — matches
the deliberate design); `recordCounterPayment` correctly resolves the
`'walkin'` channel rate (₹450) as the amount due, rejects a mismatched
split, and accepts a correct multi-tender split.

**A real, non-bug design nuance confirmed live, not a defect**: updating a
service with `price` set but `category_pricing`/`channel_pricing` entirely
*omitted* from the input leaves existing overrides untouched (Prisma
`undefined` = "don't touch this field") — this is `PLAN063`'s own
documented, deliberate `ServiceInput` semantics, not a bug. To actually
*clear* stored overrides, the caller must pass an explicit empty object
(`{}`), which the shared pricing-JSON helper distinguishes from omission.
Confirmed both behaviors live before reverting the shared dev "GP
Consultation" service back to its pre-test state (no overrides), to avoid
confusing any other work using that same seeded fixture.

