---
id: REQ166
type: improvement
feature: patients
created: 2026-08-30
updated: 2026-08-30
status: done
parent: —
related: [PLAN229, TP249, TR249]
---

# REQ166 — Patient Membership Plans, built for real

## Why this slice

`patients/detail.jsx`'s membership chip/dialog was one of five features
`context/open-questions.md #13` already logged as deferred pending a
user decision — confirmed by direct code read: `MEMBERSHIP_PLANS` was a
hardcoded local array, `membershipId` a plain `useState('none')` never
persisted anywhere, with zero backend model, resolver, or GraphQL
operation. Shown this finding, the user explicitly chose **"Build it for
real."**

## User story

As a manager, I can define recurring monthly membership plans for my
organization's clinics. As a clinician (or manager/staff), viewing a
patient's detail page, I can enroll them in one of those real plans or
cancel their current membership — and the change is real, persisting
across reloads and visible to anyone else viewing that patient.

## Acceptance criteria (Given/When/Then)

- **AC1**: Given a manager on `/manager/memberships`, when they create a
  plan (name + monthly price), then it's a real, persisted
  `MembershipPlans` row scoped to their org and clinic.
- **AC2**: Given a clinician viewing a patient with no active membership,
  when they open the membership dialog, then it lists every real active
  plan for their org (plus a "No membership" option) — never a
  hardcoded set.
- **AC3**: Given a clinician enrolling a patient in a real plan, when the
  enrollment completes, then the header chip updates to show that real
  plan + price, and **the enrollment survives a page reload**.
- **AC4**: Given a patient with an active membership, when a clinician
  cancels it via the dialog, then the chip reverts to "No membership"
  and **that too survives a page reload**.
- **AC5**: Given a patient enrolled in Plan A, when they're enrolled in
  Plan B, then Plan A is automatically cancelled first (one active
  membership per patient, enforced at the DB level via a partial unique
  index, not just application logic).
- **AC6**: Given a cross-tenant caller, when they attempt to read or
  write another org's membership plans or a patient's membership, then
  the request is rejected (tenant scoping matches this repo's own
  established `orgScopeVia`/`isPlatformOperator`/`isSameOrg` conventions
  throughout).

## Data model impact

Two new models: `MembershipPlans` (org+clinic-scoped catalog, mirrors
`Packages`/REQ054) and `PatientMemberships` (per-patient enrollment,
mirrors `PatientPackages`, denormalizing price at enroll time). See
`PLAN229` for the full schema.

## Deliberately NOT built this slice

- No member-discount pricing integration — `resolveServicePrice()` has
  no membership parameter, and where a membership discount would rank
  against payer-tariff/branch-override/category/channel pricing is a
  genuine, separate open design question (the same class of deferred
  decision as `REQ068`'s own payer-tariff note). The schema carries no
  discount field this pass.
- No plan versioning — a plan's price can be edited in place;
  `PatientMemberships.price_monthly_paise` is denormalized at enroll
  time, so an existing member's price is unaffected by a later catalog
  change.
- No recurring billing/payment collection for the monthly fee — this is
  enrollment/status tracking only, matching the mock's own original
  scope.

See `PLAN229` for the full technical account and `TR249` for
verification, including a full live create → enroll → reload → cancel →
reload round trip against the real dev stack.
