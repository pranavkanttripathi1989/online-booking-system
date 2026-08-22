---
id: TR010
type: test-result
feature: clinicians
created: 2026-03-19
updated: 2026-08-22
status: passed
parent: REQ013
related: [TP011, PLAN023]
---

# Clinicians — Test Result (re-executed against the real backend, `REQ013`/`PLAN023` Phase A)

**Outcome: PASS**, with 4 real bugs found and fixed as part of this execution (not carried forward from a prior "passing" run — see below). Supersedes the 2026-03-30 mock-era result, which recorded "23/23 passed" against `MOCK_CLINICIANS`/hardcoded arrays, not the real backend.

## Bugs found and fixed during this execution

All four committed this session, cited here rather than re-described (full detail in each commit message):

1. `clinicians/CreateClinicianPage.jsx` — `const useMock = true // always use mock in dev for now` unconditionally routed clinician creation to `MockStore.createClinician()`, leaving the real `createClinician` mutation as dead code. Every "created" clinician never existed in the real database.
2. `clinician/Availability.jsx` — used `user?.id` (UserProfiles id) instead of `user?.clinician?.id` (the real Clinicians PK) as `clinicianId`, both for reads and for the `saveClinicianAvailability`/`saveLunchBreak` mutations. A real clinician's own availability page always showed empty, and every save always failed (`assertClinicianAccess` correctly rejects the mismatched id).
3. `clinician/Availability.jsx` and `clinician/Calendar.jsx` — compared the real, numeric `dayOfWeek` (Monday=0) against a stringified digit or the literal `'daily'` sentinel, both of which only exist on the *write*-side input types, never on what the API actually returns. Real weekly slots never appeared in their day column; a "daily" lunch break rendered on one wrong day instead of all seven; the overlap-conflict check never fired.
4. `clinician/Calendar.jsx` — `GET_CLINICIAN_SCHEDULE`'s `getClinicianSchedule` field doesn't exist anywhere in the real schema; the page ran on 100% fabricated mock events for every real clinician.
5. `clinicians/index.jsx` — `allClinicians = apiClinicians.length > 0 ? apiClinicians : MOCK_CLINICIANS` fell back to 8 fabricated clinicians on any real empty result, not just a real error (same bug class already fixed this session in `appointments/index.jsx`/`calendar/index.jsx`).

## Per-case verification

**Live e2e (Playwright, real backend, no mocks in the assertion path):**

- TC-CLIN-001, 008, 006 — `manager-clinicians-patients.spec.js`: `manager sees real seeded clinicians with real availability data`, `creating a clinician calls the real createClinician mutation and persists it`, `clinician detail page shows the real clinician, not the fake "Dr. Jane Smith"` — all 3 passing.
- TC-CLIN-017 — `manager-clinicians-patients.spec.js` › `a search matching zero real clinicians shows a real empty state, not 8 fabricated ones` — passing.
- TC-CLIN-014, 015 — `clinician-portal.spec.js` › `calendar page shows real appointments and lunch breaks, never the fabricated mock schedule`, `availability page places a weekly slot in its own real day column, and a specific-day lunch break on only that day` — both passing, using disposable real fixtures (a temporarily-linked clinician account, a real test availability slot, a real test lunch break, all torn down in `afterAll`).

**Live manual verification (real backend, Playwright screenshots, not committed as automated specs):**

- TC-CLIN-015's underlying bug — before the fix: a real linked clinician's weekly slots (Tue 9–5, Wed 10–4) were entirely absent from the grid, and a "daily" lunch break appeared only on Sunday. After the fix: both slots render in their correct columns, the lunch break renders on all seven days. Screenshots taken during the fix, not retained as committed artifacts (matching this session's established practice of using screenshots for live confirmation, not as permanent doc assets).
- TC-CLIN-018 — confirmed via direct source read of `components/Clinicians/ClinicianCard.jsx` (`₹{Number(clinician.consultation_fee).toFixed(2)} per consultation`) and a real `clinicians` query showing Sarah Mitchell's `consultation_fee: 800` — not a live rendered-page screenshot this pass, but both the real data and the real rendering code are confirmed, not assumed.

**Code-reviewed only this pass (logic read against the real GraphQL contract and confirmed correct; not re-driven through a live browser click-through this session):**

- TC-CLIN-002, 003, 004, 005, 016, 019, 020, 021, 022, 023 — all real-query-backed (`CLINICIANS_QUERY`/`CLINICS_QUERY`), `useMemo`-filtered client-side over real data with no mock involvement in the filtering logic itself. Not re-verified live this pass because the filtering code itself was untouched by this session's fixes (only the *fallback-on-empty* logic was, which TC-CLIN-017 does cover live). Flagged here rather than silently presented as live-verified.
- TC-CLIN-007 — `clinicians/detail.jsx`'s Schedule tab was fully rewritten this session (real `availability_templates`, no synthetic "Unavailable"); the same rendering pattern is live-verified working correctly in `ClinicianProfileDrawer.jsx`'s Availability tab (a near-identical real data shape, per `manager-clinicians-patients.spec.js`'s clinician-list test), and the `detail.jsx` code was written against and matches that same proven pattern, but the full-page Schedule tab specifically was not independently click-tested this pass.
- TC-CLIN-009, 010, 011, 012, 013 — validation logic and `Dashboard.jsx`'s `isMock = !data` pattern were read and confirmed correct against the real contract; none were touched by this session's fixes, and none were re-run live this pass.

**Not run this pass:** none of the above "code-reviewed only" cases are known or suspected to be broken — they're simply outside what this session's live-testing time covered. A future pass should close this gap with committed e2e coverage rather than repeated manual review, per the same standard `PLAN023` held the fixed bugs to.

## Backend/frontend health

`docker exec medibook_backend npm test` — unaffected by this pass (all four fixes were frontend-only; the backend's `assertClinicianAccess`/self-scoping was already correct and is what caught bug #2 above in the first place, live-confirmed via direct GraphQL calls with both the wrong and the correct id).

`npx eslint` on every touched file — 0 errors (only the pre-existing, already-documented bare-`eslint`-invocation false-positive "unused" warnings that also fire on untouched files like `AppShell.jsx`, confirmed earlier this session).
