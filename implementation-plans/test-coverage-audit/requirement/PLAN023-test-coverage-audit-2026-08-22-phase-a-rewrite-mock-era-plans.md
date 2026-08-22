---
id: PLAN023
type: requirement
feature: test-coverage-audit
created: 2026-08-22
updated: 2026-08-22
status: approved
parent: REQ013
related: []
---

# Implementation plan — Phase A: rewrite the mock-era test-plans that now endorse fixed bugs (REQ013)

## Why Phase A first

`REQ013` Finding 2 is the audit's single highest-risk item, not just a gap: `TP003` (appointments) and `TP011` (clinicians) currently document mock-fallback behavior as the *correct, expected* result, and that exact behavior — fabricating rows/events on an empty real result, and an unconditional mock-only write path — is what the 2026-08-22 Priority 3 mock-removal sweep found and fixed as real production bugs the same day. A stale test-plan that actively endorses since-fixed buggy behavior is worse than an absent one: it reads as authoritative to the next person (or agent) who opens it. This phase closes that specific risk before anything else in `REQ013`.

## Scope

Two documents, updated in place (same `id`, `updated:` date bumped, `status` kept `done` once re-verified) rather than superseded by fresh IDs — both are living feature-level test-plans, not one-off requirement slices, matching how `settings/index.jsx`'s original test-plan area has been treated elsewhere in this repo:

- `test-plans/appointments/requirement/appointments-test-plan.md` (TP003, 40 cases, 473 lines, written 2026-03-19–2026-04-02 against `MockStore`'s 35-record dataset with `appt-N`/`mock-N` ids)
- `test-plans/clinicians/requirement/clinicians-test-plan.md` (TP011, 23 cases, 276 lines, same era, `c1`/`c8` mock ids, GBP formatting)

Both corresponding test-results (`TR003`, `TR010`) get a fresh execution pass and a real `updated:`/re-verification note — not another timestamp bump with no underlying re-run, which is what happened to `TR003` on 2026-08-18 (flagged in `REQ013` Finding 2 itself).

## What's actually wrong vs. what's still valid (read before editing either file)

Not a blanket rewrite — most of both documents describes real, still-current UI behavior (tabs, filters, dialogs, validation) that just needs its *data source* description updated from "mock" to "real backend," not its assertions re-derived from scratch. Triage, by test case:

### TP003 (appointments) — 40 cases

- **Factually wrong, must be corrected, not just reworded:**
  - **TC-APPT-028** (sidebar pending-count badge) explicitly specs `MockStore.getAppointments({status:'pending'}).length` as the correct implementation. This exact `components/Layout/Sidebar.jsx` file was deleted in this session's Priority 3 sweep as dead/orphaned code (superseded by `AppShell.jsx`) — the badge, if it exists at all in the real `AppShell` sidebar, needs to be re-verified against the real UI, not assumed to still exist in this form. Confirm whether `AppShell.jsx` has an equivalent pending-count badge; if yes, respec it against a real `appointments` query; if no, mark this test case removed with a note why.
  - **TC-APPT-018** ("Save Changes" flow) describes the *pre-fix* offline-fallback path (`onError` detects network failure → updates `MockStore` in-memory → success snackbar) as the only tested path — `appointments/edit.jsx` is already correct (real-primary, mock only on genuine `networkError`), so this case needs its happy path (real `UPDATE_APPOINTMENT_MUTATION` success) added as the primary assertion, with the mock path kept only as the secondary "offline resilience" case it actually is.
  - **TC-APPT-039** (Reschedule dialog) asserts only the dialog UI and a snackbar — it never asserts the appointment's `start_datetime` actually persisted. This is precisely the gap that let the real bug (mock-only write, fixed this session in `appointments/detail.jsx`) go undetected. Must add a persistence assertion (reload or re-query and confirm the new datetime stuck), matching `manager-appointments.spec.js`'s `rescheduling a real appointment calls the real updateAppointment mutation` test already written and passing this session.
  - **TC-APPT-022** (contextual empty state on zero filter results) needs a persistence-of-realness assertion added: confirm the empty state is a *real* empty result (e.g. filter by a status with zero real matches, per `manager-appointments.spec.js`'s `a real filter with zero matches shows a real empty state, not fabricated mock rows`), not just that some empty-looking UI renders — the exact bug this session found was that this state *silently substituted 35 fake rows* instead of rendering empty, so the old assertion (some empty state appears) wouldn't have caught it.
  - **TC-APPT-010/011** reference `appt-1` and `mock-50` ids directly — real appointment ids are UUIDs from the seeded/live database, not `appt-N`/`mock-N`. Update to reference a real seeded id (or a lookup-by-name pattern, matching how `manager-appointments.spec.js` finds "Anita Sharma" rather than hardcoding a UUID that could change on reseed).
- **Still structurally valid, needs only a data-source description update** (mock ids → real seeded data, "MockStore" → the real `APPOINTMENTS_QUERY`/mutation names): TC-APPT-001 through 009, 012–017, 019–021, 023–027, 029–038, 040. No behavioral re-derivation needed — confirm each still matches the real page (spot-check against `frontend/src/pages/appointments/{index,detail,edit,create}.jsx` and `manager-appointments.spec.js`), then just update the "Mock data" references in the doc's frontmatter-adjacent summary block and any hardcoded mock ids.
- **Already covered by a real, passing e2e spec** — cite it in the test case instead of duplicating prose: TC-APPT-006, 018, 022, 039 all now have a direct `manager-appointments.spec.js` counterpart written this session.

### TP011 (clinicians) — 23 cases

- **Factually wrong, must be corrected:**
  - **TC-CLIN-006** ("Profile: all sections") lists star rating and education as expected visible sections. `clinicians/detail.jsx` was rewritten this session specifically to *drop* these fields — no real backend field exists for either (see `context/open-questions.md` #8). Must be corrected to list only what the real `CLINICIAN_DETAIL_QUERY`-backed page actually shows (name, specialty/clinician_type, status, assigned clinics, bio, languages, consultation fee), and should note the dropped fields explicitly (with a pointer to `open-questions.md` #8) rather than silently omitting them, so a future reader doesn't wonder if it's an oversight.
  - **TC-CLIN-007** ("Schedule tab: availability") describes "Weekend days show 'Unavailable'" — the real rewrite renders only `availability_templates` rows that actually exist (real `day_of_week`/`start_time`/`end_time` per clinic/room), with no synthetic "Unavailable" placeholder for days with no template. Correct to match the real, current rendering (`DAY_NAMES[t.day_of_week]` per real template, empty state "No availability templates configured" when there are none at all).
  - **TC-CLIN-008** through the create-form section references `/clinicians/new`'s 4 sections generically — must add an explicit assertion that clicking Save actually creates a real database row (the exact bug this session found: `const useMock = true` meant it never did), matching `manager-clinicians-patients.spec.js`'s `creating a clinician calls the real createClinician mutation and persists it`.
  - **TC-CLIN-011/012** ("Edit form pre-fills (offline)" / "Save updated clinician (offline fallback)") — `EditClinicianPage.jsx`'s submit path was independently re-verified this session as already correct (real mutation primary, mock fallback only on genuine failure, with a distinct "(offline mode)" toast so the two paths are never confused). These two cases are largely fine as written; just add the real-path happy case as primary (currently only the offline fallback is described) and reference the id-lookup fallback's confirmed-harmless status (real UUIDs never collide with `MockStore`'s `c1`/`c8`-style ids, so it never triggers on real navigation — no change needed there, just document why it's intentionally left alone).
  - **TC-CLIN-013** through **TC-CLIN-015** ("Clinician portal" pages) reference a literal "Offline — showing demo data" banner and hardcoded KPI numbers as expected — these three pages (`clinician/Dashboard.jsx`, `clinician/Calendar.jsx` or equivalent, `clinician/Availability.jsx`) were **not** touched by this session's sweep and their current real-vs-mock status is unverified. Do not assume correctness either way — re-audit these three specifically as part of this phase (same method as the rest of this session's sweep: grep for `mocks/store`/`useMockData` imports, check whether any fallback is error-gated or unconditional) before rewriting their test cases, since `clinician/Dashboard.jsx` was independently spot-checked this session and confirmed already correct (`isMock = !data`, not an array-length check) — the other two portal pages were not checked and should not be assumed to match.
  - **TC-CLIN-018** references a "£XX.XX" GBP consultation-fee badge — the real, current app uses ₹ (INR/paise), per this codebase's own India-market hard rules. Confirm the real card's currency formatting and correct the expected value.
- **Still structurally valid, needs only a data-source description update:** TC-CLIN-001–005, 009–010, 016–017, 019–023.
- **Already covered by a real, passing e2e spec:** TC-CLIN-005/006 (`manager-clinicians-patients.spec.js`'s `clinician detail page shows the real clinician, not the fake "Dr. Jane Smith"`), TC-CLIN-008 (`creating a clinician calls the real createClinician mutation and persists it`).

## Execution steps

1. Re-audit `clinician/Calendar.jsx`/equivalent and `clinician/Availability.jsx` for any unconditional (not error-gated) mock fallback, using the same grep-for-`mocks/store`-imports-then-read method as this session's Priority 3 sweep. Fix any found bug as its own small commit before touching the test-plan text that describes it (don't document a bug as intentional).
2. Rewrite `TP003` in place: correct the 4 factually-wrong cases above, update mock-id references across the rest to point at real seeded data (or a name-lookup pattern), bump `updated:`, add a one-line "Data source: real backend as of 2026-08-22 (previously MockStore)" note near the top so the provenance change is explicit, not silent.
3. Rewrite `TP011` in place, same treatment, including whatever the step-1 re-audit finds for the two unverified portal pages.
4. Re-execute both plans for real: for every case not already covered by an existing e2e spec, either extend `manager-appointments.spec.js`/`calendar.spec.js`/`manager-clinicians-patients.spec.js` with a new test, or do a live manual pass (Playwright MCP or a throwaway spec, cleaned up after) and record the result — matching this session's own established verification standard, not a rubber-stamp.
5. Re-issue `TR003` and `TR010`: real `updated:` date, a pass/fail count that reflects an actual fresh run (not a carried-forward "38/38 passed" from the mock era), and explicit notes on which cases moved, which were removed, and why — per `CLAUDE.md` hard rule 7, neither may claim `done`/`passed` without this.
6. Update `context/appointments-2026-08-18/manifest.md` and `context/clinician-availability-2026-08-19/manifest.md` (or open new dated bundles if the existing ones are already closed to something incompatible) to reflect the rewrite, and close out `REQ013`'s Phase A line item once both are real.

## Explicitly out of scope for this phase

- `appointments/create.jsx` (`BookingWizard` and its 5 step components) — checked during this planning pass and confirmed already fully real (`CREATE_APPOINTMENT_MUTATION`/`CREATE_PATIENT_MUTATION`, zero `mocks/store`/`useMockData` imports anywhere in the wizard). TC-APPT-014/015/016 need only the mock-data-reference cleanup already covered above, no behavioral correction.
- Phases B–D of `REQ013` (real coverage gaps, bundle/status hygiene, the suggestion-stage process decision) — separate implementation plans, not bundled here.

## Verification

`docker exec medibook_backend npm test` unaffected (this phase is documentation + possibly the two portal-page fixes from step 1, which would get their own backend-unaffected frontend verification same as the rest of this session's Priority 3 work). Frontend: every e2e spec referenced above green (`manager-appointments.spec.js`, `calendar.spec.js`, `manager-clinicians-patients.spec.js`, plus any new cases added in step 4). Both rewritten `.md` files reviewed against the actual current page source one section at a time, not written from memory of this session's earlier findings alone.
