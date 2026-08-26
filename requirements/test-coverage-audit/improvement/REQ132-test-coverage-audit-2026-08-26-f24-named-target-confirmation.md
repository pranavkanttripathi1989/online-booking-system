---
id: REQ132
type: improvement
feature: test-coverage-audit
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ013
related: [PLAN172, TP192, TR192]
---

# REQ132 — F-24's named highest-risk targets, confirmed file-by-file

## Why this slice

`project-plans/02-findings-register.md` F-24's own status line: *"The
named highest-risk targets (`AuthContext`, `ProtectedRoute`/`RoleGuard`,
booking-wizard step validation, currency/date utils, zod schemas) have
not been specifically confirmed covered — not re-investigated
file-by-file, so still logged open rather than closed on an assumption."*
This slice does exactly that investigation, one target at a time, and
records what was actually found rather than assuming coverage exists.

## What was investigated, and what was found

| Target | Finding |
|---|---|
| `AuthContext.jsx` | Already thoroughly covered — `AuthContext.test.jsx`, 18 tests: hydration (cached-user optimistic render, ME_QUERY fetch, F-02's own "reject on ME_QUERY failure" case), login/logout across both storage modes, `hasRole`/`hasPermission`, idle-timeout auto-logout, and REQ053's impersonation flow. No gap. |
| `ProtectedRoute.jsx`/`RoleGuard.jsx` | Already thoroughly covered — `ProtectedRoute.test.jsx` (loading/redirect/authenticated-render) and `RoleGuard.test.jsx` (default-allow, role match, `Forbidden403`'s own edge cases). No gap. |
| Booking-wizard step validation | **A real, previously-complete gap.** There are two entirely separate booking wizards in this codebase: `pages/booking/index.jsx` (the public wizard, already well-covered by `index.test.jsx`'s own step-validation-gate tests) and `components/BookingWizard/*` (the internal staff/patient wizard used by `pages/appointments/create.jsx`, per `REQ027`'s own "internal booking wizard" language) — the second had **zero test files** across all 6 of its component files. Closed with new `BookingWizard.test.jsx`. |
| Currency/date utils | `dateTime.js` (the live, actually-imported utility) is already well-covered by `dateTime.test.js`. But `dateUtils.js` — a second, separate file with an overlapping name and its own `formatCurrency` — turned out to be dead code with two real defects (see below), not merely untested. |
| Zod schemas | `BookingStep4Patient.jsx`'s `newPatientSchema` (part of the newly-found internal-wizard gap above) had a real, live bug — see below. The other ~7 zod-schema-using files in the codebase were identified but not individually audited this slice (see "Deliberately out of scope"). |

## Two real bugs found and fixed, not just gaps in coverage

1. **`BookingStep4Patient.jsx`'s new-patient form validation never actually
   ran.** `useForm()` had no explicit `mode`, and nothing in the component
   ever calls `handleSubmit` — there's no submit button in this step; the
   wizard's own "Review Booking" button is what advances past it. RHF's
   default `mode: 'onSubmit'` means `formState.errors` can only populate
   via a `handleSubmit`-wrapped submission, so the `error`/`helperText`
   props already wired into every `Controller` (First Name, Last Name,
   Email) were dead code — a blank required field showed no validation
   message at all, in a live, used, front-desk-facing form. Fixed with
   `mode: 'onChange'`.
2. **`utils/dateUtils.js` was dead, and broken if it had ever been
   called.** Confirmed zero importers anywhere in the repo (matching its
   own docstring's claim). It was also missing its own `import dayjs from
   'dayjs'` — every exported function would have thrown `ReferenceError:
   dayjs is not defined` the moment anything actually called it — and its
   `formatCurrency` defaulted to `'GBP'`, the exact wrong-currency bug
   `dateTime.js`'s own live `formatCurrency` already carries a comment
   documenting as fixed. Deleted rather than tested, matching this
   codebase's own Priority-3-sweep precedent for confirmed zero-importer
   dead files.

## Deliberately out of scope

- The remaining ~7 zod-schema-using files (`ClinicProfileForm.jsx`,
  `ClinicianFormDrawer.jsx`, `patients/index.jsx`, `tasks/index.jsx`,
  `admin/Roles.jsx`, `CreateClinicianPage.jsx`, `EditClinicianPage.jsx`)
  were identified (none have a dedicated test file) but not individually
  audited this slice — auditing all of them at the same depth as the
  internal booking wizard would be its own, larger slice. Logged here
  rather than silently left unmentioned.
- No change to `BookingWizard.jsx`'s own step-3 `canProceed()` gate,
  which treats `wizardData.newPatient` as valid the moment *any* field is
  truthy (not that the zod-required fields specifically are filled) —
  fixing the display bug (this slice) is a strict improvement with no
  behavior-change risk; changing the gate's own truthiness logic is a
  separate, riskier behavioral change not attempted here.
