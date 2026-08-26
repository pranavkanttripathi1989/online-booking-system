---
id: REQ135
type: improvement
feature: clinical-records
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ128
related: [PLAN175, TP195, TR195]
---

# REQ135 — Referral status-transition mutation

## Why this slice

`REQ128`'s own doc, under "Deliberately out of scope": *"Referral status
transitions beyond creation... `scheduled`/`completed`/`declined` exist
as valid `status` values on the schema... but no mutation to advance
them was built this slice."* Confirmed still true before starting —
zero hits for `updateReferralStatus` anywhere in the codebase.

## User story

As a clinician (or front-desk/manager staff following up), I can record
what actually happened to a referral I made — scheduled, completed, or
declined — so the referral's status reflects reality, not just "still
pending" forever.

## Acceptance criteria

- **Given** a `pending` referral, **when** its status is updated,
  **then** `scheduled`, `completed`, or `declined` are all legal next
  states — a referral is often only confirmed after the fact, with no
  separate "we scheduled it" step ever recorded, so `pending` is not
  forced through `scheduled` first.
- **Given** a `scheduled` referral, **then** only `completed` or
  `declined` are legal next states.
- **Given** a `completed` or `declined` referral, **then** no further
  transition is legal — both are terminal.
- **Given** an illegal transition (including moving backward), **then**
  it is rejected with a clear message naming both states.
- **Given** the caller's own org, **then** the update is scoped via the
  referral's own parent encounter's `client_org_id` — no cross-tenant
  writes.

## In scope

- `updateReferralStatus` mutation on the existing `encounters` domain
  (`Referrals` has no client_org_id of its own, scoped via
  `referral.encounter.client_org_id`, one join deep — same reasoning as
  `Diagnoses`).
- Gated broader than `createReferral`'s own clinician-only gate
  (`clinician`, `manager`, `admin`, `super_admin`, `staff`) — recording
  a referral's real-world outcome is administrative follow-up, not new
  clinical content.
- `EncounterWorkspace.jsx`'s own Referrals list now shows the legal
  next-status action buttons per referral.

## Deliberately out of scope

- No decline-reason capture — `Referrals` has no dedicated field for
  it, and adding one would need its own migration; a real, small,
  logged follow-on if this becomes a genuine need, not built here to
  keep this slice's own schema footprint at zero.
- No dedicated front-desk/manager "Referrals Tracking" page —
  `EncounterWorkspace.jsx` itself is gated to clinicians only at the
  page level (`isClinician` check), so the new broader `@Auth` gate on
  the backend currently has no matching frontend surface for a
  staff/manager caller outside the consultation workspace. A real,
  separate tracking page for follow-up staff is a genuine future slice,
  not built here — logged as an open gap, not silently dropped.
