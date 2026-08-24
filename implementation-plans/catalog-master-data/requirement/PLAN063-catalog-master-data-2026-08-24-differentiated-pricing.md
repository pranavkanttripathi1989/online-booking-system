---
id: PLAN063
type: requirement
feature: catalog-master-data
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ016
related: [REQ044, REQ046]
---

# PLAN063 — Implementation plan: differentiated pricing by patient category and channel

## Scope

`US-CAT-04` only. `REQ016`'s other stories are already closed by earlier
sessions (`REQ044` drug master, `REQ046` tax depth) or by `REQ021`'s own
favourite-drug-sets — confirmed against the real code before scoping this
slice. Packages (`US-CAT-01`) and price-list audit (`US-CAT-05`) are P1,
untouched.

## Design — the consistency risk, and how it's closed

Research before planning found price was read from two independent call
sites: `appointments.service.ts`'s display mapping and
`appointment-payments.service.ts`'s `createRazorpayOrder` (the actual
charge-determining site). Having each re-derive "the right price"
independently is exactly the bug shape that lets a patient see one price
and be charged another. Fix: one shared `resolveServicePrice()`
(`backend/src/common/pricing/resolve-price.ts`), imported by both — neither
reads `Products.price`/`category_pricing_json`/`channel_pricing_json`
directly anymore.

Resolution order: patient-category override wins over channel override,
which wins over the base price — category represents a standing commercial
agreement (a corporate contract, a staff discount) that should hold
regardless of how the visit happened to be booked or paid; channel is a
lighter-weight, situational adjustment.

**`channel` is tied to the payment mechanism, not the booking mechanism.**
An online Razorpay checkout IS the `'online'` channel by definition; the
new counter/mixed-tender payment mutation (`REQ023`, this pass's Slice 5)
is `'walkin'`. This was a genuine design decision, not an obvious default —
inferring channel from which *booking* mutation created the appointment
(`createAppointment` vs. the public `bookPatientAppointment`) was
considered and rejected: a walk-in-booked patient can still pay online,
and vice versa, so that signal doesn't actually mean what it sounds like it
means. Tying channel to payment also cleanly resolves the one place price
is read before a payment channel is even known —
`appointments.service.ts`'s display mapping — which omits `channel`
entirely and applies only the patient-category override, rather than
guessing.

## Files touched

- `backend/prisma/schema.prisma` — `Patients.patient_category` (free-text,
  validated at the DTO layer via `@IsIn`, matching this model's existing
  loose-string convention rather than a hard Prisma enum);
  `Products.category_pricing_json`/`channel_pricing_json`.
- `backend/prisma/migrations/20260824070000_differentiated_pricing/` (new).
- `backend/src/common/pricing/resolve-price.ts` (new) +
  `resolve-price.spec.ts` — the shared helper, pure-function unit tests.
- `backend/src/appointments/appointments.service.ts` — display mapping
  routes through the helper (no channel).
- `backend/src/appointment-payments/appointment-payments.service.ts` —
  `createRazorpayOrder` routes through the helper (`channel: 'online'`);
  `include` gains `patient: true`.
- `backend/src/patients/{dto/patient.input.ts,entities/patient.entity.ts,
  patients.service.ts}` — `patient_category` (`PATIENT_CATEGORIES` =
  general/corporate/staff/camp, the requirement doc's own named examples).
- `backend/src/services/{dto/service.input.ts,entities/service.entity.ts,
  services.service.ts}` — `category_pricing`/`channel_pricing` modeled as
  structured GraphQL types with one field per known category/channel
  (`CategoryPricingInput`/`ChannelPricingInput`), not a raw JSON scalar —
  matches this codebase's existing convention of flattening a `Json` column
  into explicit typed fields rather than introducing a custom JSON scalar
  for the first time. Rupees at the GraphQL boundary, paise at rest, same
  as every other money field.
- `frontend/src/graphql/{queries,mutations}.js` — `SERVICE_DETAIL_QUERY`/
  `CREATE_SERVICE_MUTATION`/`UPDATE_SERVICE_MUTATION` gain the new fields.
- `frontend/src/pages/manager/services/{create,edit}.jsx` — a "Pricing
  Overrides" section (corporate/staff/camp category fields, online/walk-in
  channel fields; `'general'` deliberately omitted from the UI since the
  base Price field already IS the general rate).

## Test plan

See `TP090`.

## Test results

Deferred to the end-of-pass consolidated verification run across all five
slices — see `TR089` once that run completes.
