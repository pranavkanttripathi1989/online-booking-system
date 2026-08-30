---
id: TR250
type: requirement
feature: clinical-records
created: 2026-08-30
updated: 2026-08-30
status: pass
parent: TP250
related: [REQ167, PLAN230]
---

# TR250 — Results for immunisation schedule tracker (P2-11)

Executed 2026-08-30 against the running dev stack (`medibook_backend`,
`medibook_frontend`, real `medibook_db`), on `master`.

## Per-defect/feature contract

| Case | Result | Evidence |
|---|---|---|
| TC-01 immunizationSchedule active/ordered | **pass** | live: 25 seeded items confirmed via `prisma db seed` output + GraphQL introspection |
| TC-02 patient reads own records | **pass** | `immunizations.service.spec.ts` |
| TC-03 patient rejected outside own+dependants | **pass** | |
| TC-04 patient reads a dependant's records | **pass** | |
| TC-05 clinician who treated the patient | **pass** | |
| TC-06 clinician who never treated the patient | **pass** | |
| TC-07 staff/manager/admin, in-org appointment | **pass** | |
| TC-08 staff/manager/admin, only appointment elsewhere | **pass** | |
| TC-09 staff/manager/admin, patient has no appointments yet | **pass** | |
| TC-10 administered match via schedule_item_id | **pass** | |
| TC-11 administered match via vaccine+dose fallback | **pass** | |
| TC-12 overdue | **pass** | |
| TC-13 due_soon | **pass** | |
| TC-14 upcoming | **pass** | |
| TC-15 recordImmunization — unknown patient | **pass** | |
| TC-16 recordImmunization — cross-org patient | **pass** | |
| TC-17 recordImmunization — unknown schedule item | **pass** | |
| TC-18 recordImmunization — platform operator, org-less patient | **pass** | |
| TC-19 patientTimeline immunization branch | **pass** | `encounters.service.spec.ts`, one real bug found — see narrative |
| TC-20 sweep — nothing due | **pass** | `immunization-reminder-sweep.service.spec.ts` |
| TC-21 sweep — patient's own account | **pass** | |
| TC-22 sweep — guardian fallback | **pass** | the one design correction this slice makes — see narrative |
| TC-23 sweep — neither linked | **pass** | |
| TC-24 sweep — 7-day dedup | **pass** | |
| TC-25 sweep — one row throws, rest continues | **pass** | |
| TC-26 Immunizations tab empty state | **pass** | `patients/detail.test.jsx` |
| TC-27 Immunizations tab real rows/statuses | **pass** | |
| TC-28 Record dose dialog + refetch | **pass, after a real fix** | see narrative |
| TC-29 sidebar Drawer never rounds | **pass** | live DOM check: `.MuiDrawer-paper` computed `borderRadius: 0px` |

## Narrative

**TC-19** — adding `patientTimeline()`'s new `immunizationRecords` branch
broke every pre-existing test in `encounters.service.spec.ts` whose mocked
`prisma` object had no `immunizationRecords` key at all (`Cannot read
properties of undefined`). Caught immediately by the full backend unit
suite (not live), fixed by adding the missing mock — the same "a new
`Promise.all` branch needs a matching mock everywhere the object is
constructed" lesson this codebase has hit before with other cross-domain
aggregation additions.

**TC-22** — a plain copy of `appointment-reminder-sweep.service.ts`'s own
`resolvePatientUserId()` would have silently never notified anyone for a
child patient (the primary population this feature targets), since a
dependant has no login account of its own by this codebase's own
documented design. Found during research, before any sweep code was
written, not live. Fixed with `resolveNotifiableUserId()`, falling back
through `PatientRelations` to the guardian's own linked account — verified
with a dedicated unit test, the one most worth writing in this slice.

**TC-28** — the frontend's first draft of `submitRecordDose()` always sent
`batch_no`/`site`/`notes` as explicit `undefined`-valued keys when the
form field was empty. This hung the record-dose test indefinitely:
Apollo's `MockedProvider` never matched the mutation request, `onCompleted`
never ran, and the UI sat in a permanent "Saving…" state with no visible
error. Root-caused by removing an added debug sleep + `screen.debug()`
dump rather than guessing, then fixed by conditionally spreading the
optional fields in (omitting the key entirely when empty) — also the
technically correct shape for a genuinely optional GraphQL input field.

**TC-29** — not part of this slice's own scope; found live while
verifying the feature end-to-end, reported directly by the user via
screenshot against `appointments/edit.jsx` and the sidebar. Two rounds of
narrowing: first a too-large `borderRadius: 1.5` on the sidebar's own
logo/icon swatch (a red herring — fixed, but not the actual complaint);
then a direct DOM inspection (`getComputedStyle` on `.MuiDrawer-paper`)
found the real cause — the sidebar's outer `Paper` silently inheriting the
theme's global `MuiPaper` default (`borderRadius: 12`). Fixed at the theme
level (`MuiDrawer.styleOverrides.paper`), which is app-wide, not a
per-page patch. The Notes field's own `borderRadius` was iterated per
direct user feedback (`2 → 0 → 1.5`), landing on `1.5` as the final value.

## Full suite verification

- Backend: 132 suites / 2101 tests (26 new). Integration: 9/9 suites /
  432 tests (`matrix-coverage.int-spec.ts` passes with the new
  `immunizations` `EXEMPT` entry). `tsc --noEmit` clean. `eslint` clean
  (0 errors) on every touched backend file.
- Frontend: `patients/detail.test.jsx` 21/21 (3 new). Full frontend suite
  (`--maxWorkers=2`): 355/365 passing; the 10 failures are pre-existing
  resource-contention flakiness under full-parallel Jest workers on this
  host (confirmed: every flagged suite, including
  `patients/detail.test.jsx` and `context/ThemeContext.test.jsx`, passes
  cleanly when run in isolation or in a small batch — none import a file
  this slice touched beyond the ones already re-verified isolated).
  `eslint` clean (0 errors, 3361 warnings project-wide, under the 4908
  ratchet ceiling). Production build clean.
- Live: schedule seeded (25 items, `prisma db seed` output);
  `docker restart medibook_backend` → clean `Found 0 errors` compile →
  `Nest application successfully started` → GraphQL introspection
  confirmed all three new queries + the mutation on the live schema
  before any test was trusted.
