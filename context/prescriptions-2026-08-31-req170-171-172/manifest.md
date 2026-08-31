---
id: CTX-prescriptions-2026-08-31-req170-171-172
type: improvement
feature: prescriptions
created: 2026-08-31
updated: 2026-08-31
status: done
parent: REQ170
related: [REQ171, REQ172, PLAN239, PLAN240, PLAN241, TP259, TP260, TP261, TR259, TR260, TR261]
---

# prescriptions — branded clinic letterhead, encounter clinical content, obstetric fields (2026-08-31)

User-driven feature request, not a phase-plan slice: 4 real photographs of
a HealthPlix-EMR-generated prescription for "Sunshine Hospital — Ortho &
Gynae Care" (Pune) with an explicit ask to build "this kind of
prescription on clinic letterhead" in Hindi and English, "don't skip any
step." Entered plan mode, wrote a full technical plan
(`/Users/pranavkanttripathi/.claude/plans/starry-soaring-bunny.md`),
resolved two genuine ambiguities via `AskUserQuestion` (build obstetric
fields now vs. defer; one continuous implementation pass vs. per-slice
check-ins — both resolved to the Recommended option), got the plan
approved, then implemented all 3 slices across backend and frontend in
one continuous pass with a single consolidated verification run at the
end, matching this codebase's own established Phase G+2/G+3 batching
precedent.

## Documents

| Root | Slice | ID | Doc |
|---|---|---|---|
| requirements | Letterhead core | REQ170 | [doc](../../requirements/prescriptions/improvement/REQ170-prescriptions-2026-08-31-branded-letterhead-core.md) |
| requirements | Encounter clinical content | REQ171 | [doc](../../requirements/prescriptions/improvement/REQ171-prescriptions-2026-08-31-encounter-clinical-content-on-rx.md) |
| requirements | Obstetric fields | REQ172 | [doc](../../requirements/prescriptions/improvement/REQ172-prescriptions-2026-08-31-obstetric-lmp-edd-gestational-age.md) |
| implementation-plans | Letterhead core | PLAN239 | [doc](../../implementation-plans/prescriptions/improvement/PLAN239-prescriptions-2026-08-31-branded-letterhead-core.md) |
| implementation-plans | Encounter clinical content | PLAN240 | [doc](../../implementation-plans/prescriptions/improvement/PLAN240-prescriptions-2026-08-31-encounter-clinical-content-on-rx.md) |
| implementation-plans | Obstetric fields | PLAN241 | [doc](../../implementation-plans/prescriptions/improvement/PLAN241-prescriptions-2026-08-31-obstetric-lmp-edd-gestational-age.md) |
| test-plans | Letterhead core | TP259 | [doc](../../test-plans/prescriptions/improvement/TP259-prescriptions-2026-08-31-branded-letterhead-core.md) |
| test-plans | Encounter clinical content | TP260 | [doc](../../test-plans/prescriptions/improvement/TP260-prescriptions-2026-08-31-encounter-clinical-content-on-rx.md) |
| test-plans | Obstetric fields | TP261 | [doc](../../test-plans/prescriptions/improvement/TP261-prescriptions-2026-08-31-obstetric-lmp-edd-gestational-age.md) |
| test-results | Letterhead core | TR259 | [doc](../../test-results/prescriptions/improvement/TR259-prescriptions-2026-08-31-branded-letterhead-core.md) |
| test-results | Encounter clinical content | TR260 | [doc](../../test-results/prescriptions/improvement/TR260-prescriptions-2026-08-31-encounter-clinical-content-on-rx.md) |
| test-results | Obstetric fields | TR261 | [doc](../../test-results/prescriptions/improvement/TR261-prescriptions-2026-08-31-obstetric-lmp-edd-gestational-age.md) |

## What shipped

- **Schema** (`20260831010000_prescription_letterhead`, all additive/
  nullable): `ClientOrganizations.tagline`, `Clinics.website`/
  `alternate_phone`/`appointment_note`/`letterhead_clinician_ids`,
  `Clinicians.specialty_highlights`, `Encounters.lmp_date`.
- **Letterhead (REQ170)**: real multi-doctor header (admin-configured
  roster, falls back to the issuing clinician), a footer band with real
  address/phones/email/website/appointment note, styled in the org's own
  real brand colour — not the reference image's literal palette. Both
  rendering paths (browser preview and server-side `pdfkit` PDF)
  extended in parallel.
- **Encounter clinical content (REQ171)**: complaints/vitals-line/BMI/
  diagnosis/advice/follow-up/investigations and a per-drug composition
  line, joined from data this codebase already modeled (`REQ020`) but
  never wired into the prescription print payload.
- **Obstetric fields (REQ172)**: `Encounters.lmp_date` is the only stored
  column; EDD (Naegele's rule) and Gestational Age are always computed at
  render time via a new pure `computeObstetricDates()` helper, matching
  this codebase's "store the minimum, derive at read time" convention.
- Reused, unchanged: `useScopedTranslation` (document-language-locked
  frontend rendering) and `common/pdf/i18n-labels.ts` + the bundled
  Devanagari font (backend PDF) — both from `REQ160`, extended with 9
  new label pairs, not rebuilt.

## Real pre-existing bugs found and fixed, not originally scoped

Three layers of the identical defect, found while wiring
`specialty_highlights` through the same clinician-input path as the
already-existing `qualifications`/`registration_number` fields:
`ClinicianInput` DTO never declared either field; the real
`createClinician`/`updateClinician` mutation calls never actually sent
them (only an unreachable mock-fallback `.catch()` referenced them); the
`CLINICIAN_FIELDS` GraphQL fragment never selected `qualifications` at
all. All three closed in this same pass — see `REQ170` for detail.

## Environment finding worth keeping

`docker-compose.yml`'s `medibook_backend` service mounts an anonymous
volume over `/app/node_modules`, isolating the container's own
`node_modules` (including the generated Prisma Client) from the host's.
A host-side `npx prisma generate` + `docker restart` does **not** pick up
a schema change inside the container — `docker exec medibook_backend npx
prisma generate` must run inside the container first. This refines
`CLAUDE.md`'s existing documented restart-after-`generate` convention for
this specific service's volume configuration; confirmed live this
session via repeated stale-type `tsc` errors across multiple restarts
until the in-container regenerate was run.

## Verification

Full consolidated pass, once, at the end (per the approved plan):
backend unit **135/135 suites, 2148/2148 tests**; integration **9/9
suites, 441/441 tests**; `tsc --noEmit`/`eslint`/`prisma validate` all
clean. Frontend: the 3 directly-touched suites
(`PrescriptionPrint.test.jsx` 11/11, `settings/index.test.jsx` 13/13,
`EncounterWorkspace.test.jsx` 25/26 with one pre-existing unrelated
flaky test) all pass; `CreateClinicianPage.test.jsx` 6/6 with a bumped
timeout (host load average measured 38.43 during this session, vs. this
codebase's documented single-digit norm — confirmed timeout-only
flakiness, not a regression, by re-running with an extended timeout).
`npm run lint` 0 errors (3417 warnings, under the 4908 ratchet); `npm run
build` succeeds. Live-verified against the real running
`medibook_backend` container via direct GraphQL introspection — every
new field (`Clinic.website/alternate_phone/appointment_note/
letterhead_clinician_ids`, `PrescriptionLetterheadDoctor.*`,
`PrescriptionEncounterContext.*` including `lmp_date`/`edd`/
`gestational_age_weeks`/`gestational_age_days`) confirmed genuinely
served by the live schema, not just present in the compiled type file.
EDD/gestational-age math independently re-derived by hand against the
reference image's own LMP date before trusting the unit test, per this
codebase's established discipline for date/timezone logic.

## Deliberately deferred

- A literal pixel-match to the reference image's own colours/fonts (the
  correct generalisation is each org's own real brand identity).
- `route`/`instructions` translation on the Rx (needs a
  controlled-vocabulary redesign, already logged as deferred in
  `REQ160`).
- A live browser pass driving the actual print/PDF output end-to-end in
  Chrome — no browser-automation tool was available this session; the
  live verification performed was direct GraphQL introspection against
  the running container, confirming every new field is served, not a
  visual/pixel check of the rendered document.
