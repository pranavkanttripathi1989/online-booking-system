---
id: TR052
type: test-result
feature: public
created: 2026-08-22
updated: 2026-08-22
status: passed
parent: REQ013
related: [TP053]
---

# Public patient self-serve surface — Test Result

**Outcome: PASS.** No bugs found this pass — `backend/src/public/**` was already correctly implemented, including a real, previously-fixed IDOR (`getAppointment`'s participant/staff/admin ownership check). This is a documentation-coverage closure (`REQ013` Phase B, Finding 1), not a bug-fix pass.

## Verification method (environment note)

Same host-environment issue as `TR051` (see that document for detail — `com.docker.hyperkit` observed consuming 5.6GB of this machine's 8GB total RAM, causing every heavy process — headless Chromium launches, `docker exec`-driven `npx jest` runs — to hang for minutes with no progress across repeated attempts this session). Live browser re-verification of `public-booking.spec.js`/`booking-payment.spec.js` was not possible this pass for the same reason; neither is known or suspected to be broken. `curl`-based direct GraphQL verification remained reliable throughout (a lightweight request/response cycle, not a new heavy process) and is the primary evidence for this pass.

## Per-case verification

**Live API verification (real backend, `curl`, this session):**

- TC-PUB-003 — `getClinicians` (no auth header, confirming `@Public()`) returned real clinicians including Sarah Mitchell (real rating `null`/reviews `0` — no real reviews exist yet, not fabricated; real price ₹499, converted from paise) and the accumulated real "E2E TestClinician" test debris from earlier sessions (`specialty: ""`, `price: null` — correctly reflecting clinicians created without a `clinician_type`/linked service, not a crash).
- TC-PUB-004 — `getClinician` for Sarah Mitchell returned real name/clinicianType/bio; `education: []` confirmed as always-empty (no backing model), matching the documented gap, not re-derived as a bug.
- TC-PUB-008 — the core finding of this pass's live verification: an admin (platform-wide) and a manager (same-org staff) both correctly received the real appointment's detail via `getAppointment`; a real, authenticated but *unrelated* clinician (the demo `clinician@medibook.dev` account, deliberately left unlinked to any real `Clinicians` row) received a real `404 NotFoundException('Appointment not found')` for the exact same appointment id — confirming the participant/staff/admin ownership check closes the IDOR its own code comment describes, not just in theory.
- Unauthenticated `getAppointment` call (no token at all) — real `401 Unauthorized`, confirming this one field is correctly *not* `@Public()` unlike its four siblings in the same resolver.

**Live e2e (Playwright, real backend) — not re-executed this pass, but not newly at risk:**

- `public-booking.spec.js` (2 tests: real clinician profile + availability; anonymous reach of the real booking wizard) and `booking-payment.spec.js` (real Razorpay Checkout widget opening against a real order) were both written and passing in earlier sessions, per their own header comments and this session's broader regression history. Neither touches code changed this pass (no code was changed — this is a doc-only closure).

**Structural/code verification (source read, not a runtime test):**

- TC-PUB-001, 002, 005, 006, 007 — confirmed by reading `public.service.ts` directly against the real Prisma schema and the resolver's `@Public()` annotations: the slot-availability exclusion of `cancelled`/`no_show`, the find-or-create-by-email patient logic, the double-booking conflict check, and the no-active-room rejection are all real, unambiguous logic with no mock/fallback path of any kind in this file.

**Not run this pass:** a live, driven re-run of `public-booking.spec.js`/`booking-payment.spec.js`, and no committed e2e spec exists yet for TC-PUB-008's cross-user-rejection case specifically (verified via `curl` this pass, not as a permanent regression test) — both are real follow-up work, not claimed as done here.

## Backend health

`docker exec medibook_backend npx jest` for this domain could not be completed this pass due to the host resource issue described above (the process was started multiple times and never produced output before being killed to free resources for other verification). No backend code was changed this pass, so this is a re-confirmation gap, not a new risk — recommended once the host environment is stable.
