---
id: CTX-frontend-platform-2026-08-30-bug061
type: bug
feature: frontend-platform
created: 2026-08-30
updated: 2026-08-30
status: done
parent: null
related: [BUG061, PLAN236, TP256, TR256]
---

# Remaining pages sweep — 7 integration gaps, audit complete (2026-08-30)

Fourth and final slice of the full-repo frontend/backend integration
audit ("check all fronend page and fix the backend and fronend
intgartionn gap"), covering every page directory not already swept by
`manager/` (`BUG058`), `admin/` (`BUG060`), or `patient/`+`clinician/`
(`BUG059`).

Found and fixed 7 real bugs: `profile/index.jsx` and `patients/
EditPatientPage.jsx` both fell back to mock/fabricated data on a real
null result rather than a genuine error (DATA-13) —
`EditPatientPage.jsx` additionally had no not-found guard, the most
severe finding of the whole audit (a save could silently overwrite the
wrong real patient's record); `clinicians/EditClinicianPage.jsx` had
the identical DATA-13 pattern on its clinics picker; `/test-results`'s
route was narrower than its backend auth check (SEC-18, the same
class already fixed twice before for `/queue`/`/waiting-room`); three
tables were missing `TableContainer` wraps; `patients/detail.jsx`'s
two already-known, already-logged demo-only tabs
(`context/open-questions.md #13`) had toasts that falsely claimed
unconditional success, now made honest to match what that open
question already asserts is the page's convention.

Commit: `cbac4bd`. Verification: 2 new tests pass, 29 existing tests
across 2 pre-existing suites re-confirmed with no regression,
eslint/build clean.

**This closes the full-repo audit.** All four slices
(`BUG058`/`BUG059`/`BUG060`/`BUG061`) together checked every page under
`frontend/src/pages/`. Total: 21 real integration bugs found and fixed across the four slices
(4 + 3 + 7 + 7), 12 new regression tests added, zero pages left with
an unaddressed confirmed finding.

See `BUG061`/`PLAN236`/`TP256`/`TR256`.
