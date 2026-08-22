---
id: TP053
type: test-plan
feature: public
created: 2026-08-22
updated: 2026-08-22
status: approved
parent: REQ013
related: [TR052]
---

# Public patient self-serve surface — Test Plan

**`REQ013` Phase B** — closes Finding 1's real documentation-coverage gap: `backend/src/public/**` (the entire unauthenticated, patient-facing doctor-discovery/booking surface) had no test-plan at all. The only prior doc touching this surface, `test-plans/booking-wizard/requirement/booking-wizard-test-plan.md` (`TP005`), predates this backend module entirely, specs `MockStore` data under the wrong name, and was never executed even against the mock version it was written for — logged as superseded, not deleted (see `context/booking-wizard-2026-03-19/manifest.md`).

**Files:** `frontend/src/pages/public/{landing,doctor-profile}.jsx`, `frontend/src/pages/booking/index.jsx`, `frontend/src/pages/video/index.jsx`
**Routes:** `/` (landing — **still mock, see scope note**), `/doctor/:id`, `/appointments/book`, `/video/:appointmentId` (auth-gated)
**GraphQL (camelCase "public/patient-self-serve dialect" — deliberately separate from the canonical snake_case dialect, see `CLAUDE.md`):** `getClinicians`, `getClinician`, `getProducts`, `getAppointments` (available slots for a day), `getAppointment` (single detail, auth-gated), `bookPatientAppointment`. All but `getAppointment` are `@Public()` — no login required, by design, since a prospective patient must be able to browse and book before creating an account.

## Scope note: `landing.jsx` is real-adjacent, not real

The backend's own `PublicClinicianSummaryType` (`getClinicians`) exists specifically to back a real landing/search page (its own code comment: *"public/landing.jsx's search/discovery result... comment in that file names the intended real query as `getClinicians`"*) — but `landing.jsx` itself still runs entirely on its own `MOCK_DOCTORS` array and a client-side "Simulate GraphQL getClinicians" comment, never actually calling the real query. This plan tests the real query directly (it's a working, real, `@Public()` endpoint) but does not claim `landing.jsx` uses it — that remains a real, separate, already-logged gap (`CLAUDE.md`'s Priority 1 notes: *"pages/public/landing.jsx itself is still mock, so its specs go straight to `/doctor/:id`/`/appointments/book` with a real clinician id instead"*).

## Test cases

### TC-PUB-001 — Anonymous visitor sees a real clinician profile with real availability
**Steps:** As an anonymous (logged-out) visitor, navigate to `/doctor/<real-clinician-id>`.
**Expected:** Real `getClinician` + `getClinicianAvailability` data renders (name, specialty, real calendar). A real seeded clinician with slots only on specific days correctly shows "No slots available on this date." on a day with none, and real slot buttons on a day with some — proof the calendar is driven by real data, not a stub that always shows the same thing. Covered live: `public-booking.spec.js` › `anonymous visitor sees a real clinician profile with real availability`.

---

### TC-PUB-002 — Anonymous visitor reaches the real booking wizard without a login redirect
**Steps:** As an anonymous visitor, navigate to `/appointments/book?doctor=<real-clinician-id>`.
**Expected:** Renders the real booking wizard directly — no redirect to `/login` (this route uses `App.jsx`'s `OptionalAuthShell`, not `ProtectedRoute`; fixed in an earlier session per this spec's own header comment). Covered live: `public-booking.spec.js` › `anonymous visitor can reach the real booking wizard without being redirected to login`.

---

### TC-PUB-003 — `getClinicians` search/discovery query is real (even though `landing.jsx` doesn't call it yet)
**Steps:** Call `getClinicians` directly (with and without `search: {city/specialty/language}`).
**Expected:** Real, active, non-deleted clinicians matching the filter; `rating`/`reviews` are real aggregates from the `Reviews` table (not fabricated); `price` is the real minimum linked-service price in rupees (converted from paise); `nextAvailable` is deliberately not returned at all — computing real next-available-slot per clinician per search request was judged too expensive for a listing endpoint and was never built, a documented decision, not an oversight.

---

### TC-PUB-004 — `getClinician` detail query
**Steps:** Call `getClinician(id)` for a real clinician.
**Expected:** Real name/email/clinicianType/bio/clinic/languages/products. `education` always returns `[]` — no backing model exists anywhere in the schema for clinician education, a documented gap (`public.entity.ts`'s own comment: *"entirely new model needed if real"*), not a bug to fix as part of this plan.

---

### TC-PUB-005 — `getAppointments` (available slots for a day) excludes cancelled/no-show
**Steps:** Call `getAppointments(clinicianId, date)` for a real date with a mix of real appointment statuses.
**Expected:** Only `scheduled`/`confirmed`/`completed`/etc. appointments block a slot — `cancelled`/`no_show` appointments do **not** occupy the slot (real `status: {notIn: ['cancelled','no_show']}` filter), so a cancelled slot is correctly offered again.

---

### TC-PUB-006 — `bookPatientAppointment` creates a real appointment end-to-end
**Steps:** Complete the real booking wizard for a real clinician/service/slot as a new patient (no existing account).
**Expected:** A real `Patients` row is found-or-created by email (`existing` lookup before `create`, so the same email never creates a duplicate patient across repeat bookings), a real `Appointments` row is created with `status: 'scheduled'`, a real active room at the clinician's real clinic is assigned (`BadRequestException('No active room available at this clinic')` if none exist — a real, surfaced failure, not a silent booking into a null room). Covered live: `booking-payment.spec.js` (which drives this same mutation as a setup step before reaching the real Razorpay Checkout widget).

---

### TC-PUB-007 — Double-booking the same clinician/slot is rejected
**Steps:** Attempt to book a real clinician for a `date`/`startTime` that already has a real non-cancelled appointment.
**Expected:** Real `BadRequestException('This time slot is no longer available')` — checked at booking time, not just at slot-listing time (closes the race between "slot shown as available" and "another patient books it first").

---

### TC-PUB-008 — `video/index.jsx`'s `getAppointment` requires real participant/staff/admin access
**Steps:** As a real patient or clinician who is genuinely a participant in a real appointment, call `getAppointment(id)` — expect success. As a different, unrelated authenticated patient/clinician, call the same id — expect rejection.
**Expected:** Real `isParticipant` (`patient_id`/`clinician_id` match) OR `isOrgStaff` (non-clinician role, same real `client_org_id`) OR `isPlatformAdmin` (org-less admin/super_admin) — anyone else gets `NotFoundException('Appointment not found')`, not the real appointment's patient name/clinician/timing. This closes a real, previously-fixed IDOR (`public.service.ts`'s own comment: the resolver used to require login but never checked the caller's identity at all, letting any authenticated user view any appointment via a guessed/shared video-join link) — not re-verified live this pass (no committed e2e spec drives this specific cross-user-rejection case yet; recommended as a real follow-up, matching the honesty standard the rest of this document holds itself to).

---

## Edge cases

| # | Edge case | Expected |
|---|-----------|----------|
| E1 | Clinician has no linked services/products | `price` on `getClinicians` is `undefined`, not `0` or a crash |
| E2 | Booking with an existing patient email | Reuses the existing real `Patients` row, doesn't create a duplicate |
| E3 | Booking a product with no `variationId` | Falls back to the product's own `duration_minutes`, then a hardcoded 30-minute default if neither exists |
| E4 | Clinic has zero active rooms | Real `BadRequestException`, booking fails cleanly rather than assigning a null/invalid room |
| E5 | `getAppointment` called by an unrelated authenticated user | Rejected as "not found" (TC-PUB-008) — never leaks whose appointment it actually is |

## Not tested by this plan (real, deliberate exclusions, not silent gaps)

- `landing.jsx` itself (still 100% mock — see scope note above; tracked separately, not superseded by this plan closing).
- `education` field's real backing (no model exists — `public.entity.ts`'s own documented gap).
- `getClinicians`' `nextAvailable` (never built — documented cost/scope decision, not a bug).
