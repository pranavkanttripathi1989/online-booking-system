---
id: TP057
type: bug
feature: platform-nfr
created: 2026-08-22
updated: 2026-08-23
status: approved
parent: BUG009
related: [F-18, PLAN030, TR056]
---

# TP057 — Verification for wiring the seven fabricated pages

## Suggestion stage

Skipped per the `CLAUDE.md` conditional rule: each page is being wired to an
already-proven backend contract against an existing dialect. Nothing exploratory.

## The trap this plan has to avoid

"The page renders" is not evidence. The fabricated versions rendered beautifully
— that was the entire problem. Every case below therefore asserts something a
mock version would have **failed**: a real id, a real empty state, a server-side
filter, or the absence of a `MOCK_` symbol.

## Per-page contract

| ID | Case | Expected |
|---|---|---|
| TC-01 | No `MOCK_*` constant survives in any of the six wired pages | grep returns nothing |
| TC-02 | Each page's query names fields the real schema actually has | GraphQL validates; `tsc`/build clean |
| TC-03 | `analytics` uses `getAppointmentStats` + `getClinics` | KPI trends come from the resolver, not literals |
| TC-04 | `staff/Appointments` filters SERVER-side | `AppointmentFilters` sent; not a client filter over one page |
| TC-05 | `patient/Appointments` is self-scoped | no patient id passed by the page; backend narrows by JWT |
| TC-06 | `clinician/Patients` is self-scoped | relation check in the service, not a client filter |
| TC-07 | `public/landing` works logged-out | `@Public()` resolver; no auth header needed |
| TC-08 | `staff/Dashboard` reads `dashboard` | KPIs, queue and utilisation all from the query |
| TC-09 | `/manager/billing` redirects to `/finances` | route redirects; page file deleted; nav duplicate removed |

## Empty, loading and error are distinct

The regression this repo has already shipped twice (`appointments/index.jsx`,
`calendar/index.jsx`) is treating an **empty result** as a reason to show mock
rows. These cases exist specifically to prevent a third.

| ID | Case | Expected |
|---|---|---|
| TC-10 | Empty result renders an empty state | never fabricated rows, never another tenant's data |
| TC-11 | Loading is distinguishable from empty | skeletons while in flight; "none found" only after |
| TC-12 | Query error renders an error with Retry | not a silent fallback |
| TC-13 | Filtered-empty reads differently from no-data-at-all | different guidance to the user |

## Defects found while wiring

| ID | Case | Expected |
|---|---|---|
| TC-14 | `/staff/*` role guard matches the backend | patient/clinician cannot reach a staff console |
| TC-15 | `formatCurrency` default | INR, not GBP |
| TC-16 | `StatusChip` handles `no_show` | renders "No Show", not the raw string |
| TC-17 | `Appointments.type` exposed end to end | entity, mapper and fragment all carry it |

## Gate and regression

| ID | Case | Expected |
|---|---|---|
| TC-18 | Wiring gate allowlist shrinks | 10 → 3 (only the genuinely backend-less pages) |
| TC-19 | Gate's staleness check fires on all seven | proves they are no longer fabricated, rather than that the list was edited |
| TC-20 | Frontend lint ratchet lowered | 197 → 177; never raised |
| TC-21 | Frontend build + unit tests | pass |
| TC-22 | Backend unit + integration | unaffected by the entity change; both green |

## Explicitly out of scope

Live browser verification (tooling unavailable this slice — recorded as a gap in
`TR056`, not glossed), the three genuinely backend-less pages, and the possible
mixed-fallback cases in `patients/index.jsx` / `patients/detail.jsx`.
