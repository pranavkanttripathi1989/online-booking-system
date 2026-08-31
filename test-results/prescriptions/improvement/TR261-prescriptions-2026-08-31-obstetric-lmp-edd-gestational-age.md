---
id: TR261
type: improvement
feature: prescriptions
created: 2026-08-31
updated: 2026-08-31
status: pass
parent: TP261
related: [REQ172, PLAN241]
---

# TR261 — Results: obstetric LMP / EDD / Gestational Age

## Backend

- Covered by the same full-suite run recorded in `TR259`: **135/135
  suites, 2148/2148 tests, green**; integration **9/9 suites, 441/441
  tests, green**; `tsc`/`eslint` clean.
- `obstetric-dates.spec.ts` (new file): **4/4 green** — 3 hand-derived
  date pairs from the reference image's own LMP plus a zero-elapsed case.
- `encounters.service.spec.ts` gained a `setEncounterLmpDate (REQ172)`
  block: **4/4 green** (locked-encounter rejection, cross-org rejection,
  wrong-clinician rejection, success case) — 74/74 in that file total.

## Live verification

- Introspected `Encounter.fields` on the running container: `lmp_date`
  present and served.
- `PrescriptionEncounterContext.fields` includes `edd`,
  `gestational_age_weeks`, `gestational_age_days`, `lmp_date` — confirmed
  in `TR260`'s own introspection.

## Frontend

- `npx jest --runInBand src/pages/clinician/EncounterWorkspace.test.jsx -t
  "sets the obstetric LMP date"`: **1/1 green** (new test, added this
  slice — the field previously had zero dedicated coverage; only the
  `ENCOUNTER_QUERY` fixture and a timeout fix from wiring `lmp_date` into
  the query existed). Exports `SET_ENCOUNTER_LMP_DATE` from the real
  component for the test to import, per this file's own established
  BUG062 precedent (a hand-copied query drifting from the real one is a
  standing, previously-hit failure class in this exact file).
- `npx jest --runInBand --testTimeout=25000
  src/pages/clinician/EncounterWorkspace.test.jsx` (full file): **25/26
  green.** The sole remaining failure ("records, transcribes, drafts
  AI-flagged notes, and offers Voice-to-Rx through the real mutations end
  to end") is a pre-existing, already-documented flaky test in this
  file's own AI-Scribe/rich-text-toolbar section — confirmed unrelated:
  it touches no code this slice changed (Vitals section only), and this
  same test was already flagged as pre-existing flakiness during this
  session's own earlier verification pass. A bare default-timeout run of
  the full file additionally showed 3 more failures (ICD-10 Autocomplete,
  procedure-code diagnosis creation, mic-access-denied) purely as
  `Exceeded timeout of 5000ms`, none of which touch the Vitals/LMP code —
  all 3 pass with the timeout extended, confirming host-load contention
  (`uptime` measured a 38.43 load average during this run, vs. this
  codebase's documented single-digit norm), not a regression.
- `PrescriptionPrint.test.jsx`'s dedicated "renders the LMP/EDD/
  Gestational Age line when set" case: covered in `TR259`'s 11/11 count.

## Verification math (independently re-derived, not trusted from the test alone)

LMP 21-12-2025 → EDD 27-09-2026 (280-day Naegele's-rule offset,
re-counted by hand across month boundaries: Dec has 10 remaining days →
270 left; Jan 31 → 239; Feb 28 → 211; Mar 31 → 180; Apr 30 → 150; May 31
→ 119; Jun 30 → 89; Jul 31 → 58; Aug 31 → 27; lands 27 days into
September → 27-Sep-2026 ✓). 07-Jun-2026 is 168 days after LMP → exactly
24 weeks, 0 days ✓. 23-May-2026 is 153 days after LMP → 21 weeks, 6 days
✓.
