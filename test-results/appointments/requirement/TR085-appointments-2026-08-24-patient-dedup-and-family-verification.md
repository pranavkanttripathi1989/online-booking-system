---
id: TR085
type: requirement
feature: appointments
created: 2026-08-24
updated: 2026-08-24
status: pass
parent: TP086
related: [REQ018, PLAN059]
---

# TR085 — Results for patient dedup + merge, and family/dependant profiles

Executed 2026-08-24 against the running dev stack (`medibook_backend`,
`medibook_frontend`, real `medibook_db`), on `master`.

## Per-defect/feature contract

| Case | Result | Evidence |
|---|---|---|
| TC-01 dedup — unfiltered exact-phone match | **pass** | `patients.service.spec.ts` |
| TC-02 dedup — name/DOB filtering | **pass** | |
| TC-03 merge into self rejected | **pass** | |
| TC-04 merge moves every FK reference | **pass** | 6 tables asserted |
| TC-05 merge remaps PatientRelations both sides | **pass** | |
| TC-06 merge relinks login when survivor has none | **pass** | |
| TC-07 merge does not relink when survivor has a login | **pass** | |
| TC-08 merge soft-deletes + audit row | **pass** | |
| TC-09 myDependants — unlinked account | **pass** | |
| TC-10 myDependants — scoped to caller | **pass** | |
| TC-11 addDependant — rejected for non-patient/unlinked | **pass** | 2 cases |
| TC-12 addDependant creates + links | **pass** | |
| TC-13 findAll/findOne — own id only, no dependants | **pass** | |
| TC-14 findAll/findOne — includes dependant id | **pass** | |
| TC-15 findAll/findOne — non-dependant rejected, NotFound | **pass** | |
| TC-16 appointments.create() — non-dependant patient_id rejected | **pass** | the pre-existing gap this slice closed |
| TC-17 appointments.create() — dependant patient_id allowed | **pass** | |
| TC-18 AppointmentsService existing suite unaffected | **pass** | 46/46 |
| TC-19 full backend suite | **pass** | 62 suites / 920 tests, 0 failures |
| TC-20 backend lint + typecheck | **pass** | both clean |
| TC-21 backend integration suite | **pass** | 4 suites / 234 tests, 0 failures |
| TC-22 full frontend suite + coverage threshold | **pass, after adding 2 real test files — see narrative** | 8 suites / 68 tests, 0 failures |
| TC-23 frontend lint | **pass** | 167 warnings total (down from 177), 0 new from this slice |
| TC-24 frontend build | **pass** | |
| TC-25 e2e dedup prompt | **pass, after a field-fill fix — see narrative** | |
| TC-26 e2e real merge | **pass, after two locator fixes — see narrative** | |
| TC-27 e2e add dependant | **pass** | |

## Narrative

**TC-22 — the frontend coverage-threshold floor started failing.**
`jest.config.cjs`'s global `functions` threshold (`1.7%`) is explicitly
commented "a floor against regression... raise it as more of the tree
gains coverage, never lower it." Today's three slices (`REQ021`, `REQ019`,
this one) added several new pages with no unit tests each (following this
codebase's established "e2e covers it instead" convention for new pages),
diluting the ratio to a measured `1.69%` — a real self-caused regression,
by the thinnest possible margin. Per the config's own explicit rule, the
fix was to add real coverage, not lower the number: added
`PrescriptionPrint.test.jsx` (2 cases) and `Family.test.jsx` (3 cases),
which recovered the ratio to `2.47%` — comfortably clear, and genuinely
useful smoke tests, not padding.

**TC-25 — the e2e dedup-prompt spec initially never showed the dialog at
all.** `CreatePatientPage.jsx`'s own client-side `validate()` requires a
non-empty email before `handleSubmit` ever calls the dedup-check query;
the spec's first draft filled name/phone but not email, so validation
failed silently and the dedup check was never reached. Fixed by filling
email too.

**TC-26 — two real fixes, both in the e2e spec, found while writing it
(not left latent):**
1. The search field matches per-field substrings (`first_name` OR
   `last_name` OR ... independently) — searching the literal string
   `"Merge Probe"` (with a space, as one token) matched neither
   `first_name: "Merge"` nor `last_name: "ProbeA"` alone, so the merge-mode
   table showed zero rows. Fixed by searching `"Merge"` alone.
2. `patients/index.jsx`'s merge-mode table rows carry an explicit
   `role="button"` (a clickable-row accessibility pattern), not a
   `<TableRow>`'s implicit `role="row"` — `getByRole('row', {name:
   /Merge ProbeA/}).getByRole('checkbox')` never matched anything and
   silently timed out. Fixed by targeting the checkbox's own accessible
   name (`"Select Merge ProbeA for merge"`) directly, without nesting
   inside a non-matching row locator.

**Also hit during verification, environment-level, not a code defect
(see `PLAN059` for the fuller account): the same `nest start --watch`
module-recompile race documented in `PLAN058`, plus one new distinct
transient failure** (`Error: Cannot find module './prisma/prisma.module'`
on restart) that this container's logs show recurring independently of
this slice's own changes. Both resolved with a clean `docker restart`;
confirmed via direct GraphQL schema introspection before proceeding, not
by trusting a clean startup log alone.

## Verdict

**Pass.** REQ018's two scoped P0 stories (`US-BOOK-01`, `US-BOOK-02`) are
real, tested, and verified end-to-end against the real backend — not
mocked, and a previously fully-built-but-unreachable merge UI is now
actually wired to real data. `US-BOOK-03` (prepayment policy), `US-BOOK-05`
(embeddable widget), and REQ018's own P1 items remain explicitly deferred
per `PLAN059`, not silently dropped.
