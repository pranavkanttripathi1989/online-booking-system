---
id: TR082
type: requirement
feature: clinical-records
created: 2026-08-24
updated: 2026-08-24
status: pass
parent: TP083
related: [REQ020, PLAN056]
---

# TR082 — Results for consultation workspace and clinical records (EMR)

Executed 2026-08-24 against the running dev stack (`medibook_backend`,
`medibook_frontend`, real `medibook_db`), on `master`.

## Per-defect/feature contract

| Case | Result | Evidence |
|---|---|---|
| TC-01 first getOrCreateEncounter creates | **pass** | `encounters.service.spec.ts` |
| TC-02 second call returns existing | **pass** | |
| TC-03 concurrent-create race resolves to winner | **pass, after a real fix** | see narrative below |
| TC-04 cross-org appointment rejected | **pass** | |
| TC-05 wrong clinician rejected | **pass** | |
| TC-06 encounter() cross-tenant/self-scope rejections | **pass** | 7 cases |
| TC-07 saveEncounterNote — locked | **pass** | |
| TC-08 saveEncounterNote — open, upsert+version | **pass** | |
| TC-09 signEncounter — already signed | **pass** | |
| TC-10 signEncounter — non-clinician rejected | **pass** | |
| TC-11 signEncounter — treating clinician | **pass** | |
| TC-12 addAddendum on signed encounter | **pass** | |
| TC-13 allergy banner/timeline cross-patient access | **pass** | 4 cases |
| TC-14 applyTemplate | **pass** | 3 cases |
| TC-15 createEncounterTemplate org write-path | **pass** | 4 cases |
| TC-16 DB trigger rejects direct UPDATE/DELETE while locked | **pass** | `encounter-lock-trigger.int-spec.ts`, real Postgres, bypasses the service layer entirely |
| TC-17 DB trigger allows the same ops while unlocked | **pass** | |
| TC-18 EncounterAddenda insert allowed while locked | **pass** | |
| TC-19 tenancy matrix — encounters domain | **pass** | new `CASES` entry, `tenancy.int-spec.ts` |
| TC-20 tenancy matrix anti-rot gate | **pass, after closing 2 pre-existing gaps** | see narrative below |
| TC-21 full backend suite | **pass** | 60 suites / 842 tests, 0 failures |
| TC-22 backend lint + typecheck | **pass** | both clean (one pre-existing unrelated lint error in `drugs.service.spec.ts` fixed in passing — an unused `orgBUser` var, blocking the lint gate for every slice, not something this slice's diff introduced) |
| TC-23 full frontend suite | **pass** | 6 suites / 63 tests, 0 failures |
| TC-24 frontend lint | **pass** | 166 warnings (was 168 before REQ017, 167 after — net -1 again), 0 errors, 0 new warnings in any touched file |
| TC-25 frontend build | **pass** | `EncounterWorkspace-f9_sMTz1.js` code-splits into its own ~11 KB chunk |
| TC-26 page-data-wiring gate | **pass** | 0 new fabricated pages |
| TC-27 e2e: save note, survives reload | **pass, after a real fix — see narrative** | |
| TC-28 e2e: apply template | **pass** | |
| TC-29 e2e: sign off, read-only, addendum | **pass** | |

## Live-verification narrative — two real, pre-automation bugs found

Before writing the automated e2e spec, a manual live-browser pass (per
`CLAUDE.md`'s "6 wired pages have had no live browser pass" lesson from
`BUG010` — a new page gets the same treatment before being trusted) drove the
real flow end-to-end and found two genuine defects no unit test could catch:

1. **Every `saveEncounterNote` call 400'd** ("property content should not
   exist") — `SaveEncounterNoteInput.content` had no `class-validator`
   decorator, and the global `ValidationPipe`'s `forbidNonWhitelisted`
   rejects any undecorated property. Worse: the frontend's `onBlur` handler
   had no `.catch`, so the failure was invisible — a clinician could type a
   full note, see nothing wrong, and find it gone on reload. This is a real
   clinical-safety data-loss defect, not a cosmetic bug. Fixed with
   `@IsString()` on `content`, plus every mutation handler in
   `EncounterWorkspace.jsx` now reports its own failure via a snackbar.
2. **`getOrCreateEncounter` double-fired and sometimes threw** — React 18
   StrictMode's dev-only double-effect invocation raced two real calls to
   the mutation; the loser's `P2002` unique-constraint violation on
   `appointment_id` propagated as a raw, unhandled 500. Confirmed this is
   not merely a StrictMode artifact but a genuine concurrency bug reachable
   in production (a double-click, or two browser tabs open to the same
   appointment) — fixed by catching `P2002` and fetching the winning row
   instead of throwing, matching the `e.code === 'P2002'` idiom already used
   in `products.service.ts`. Reproduced live during the automated e2e run
   before the fix (visible in `docker logs medibook_backend` as repeated
   `Unique constraint failed on the fields: (appointment_id)`), and did not
   recur after.

Both fixes are covered by new unit tests (`encounters.service.spec.ts`'s
"resolves a concurrent-create race" and "re-throws a create failure that is
not a unique-constraint race") and the e2e spec's own reload assertion.

## Tenancy-matrix anti-rot gate — two pre-existing gaps closed

Classifying the new `encounters` resolver domain in
`matrix-coverage.int-spec.ts` (per the anti-rot gate's own design — a new
domain fails the suite until classified) surfaced that `test:int` was
**already red** before this slice touched anything: REQ017's own `resources`
domain had shipped without ever being added, and a fresh run also flagged
`drugs` (REQ016/REQ044) and `organization-onboarding` (REQ013) as
unclassified. All three closed in this pass:

- `resources` — real `CASES` entry (org-owned resource, genuine isolation).
- `drugs` — real `CASES` entry. `drugs()` also returns platform-seeded
  (`client_org_id: null`) rows visible to every org, but the fixture's
  `drugA`/`drugB` are org-owned, so isolation is still real to assert.
- `organization-onboarding` — `EXEMPT`, honestly: every operation on this
  resolver is `@Public()` (anonymous SaaS signup), so there is no
  authenticated tenant-scoped read to isolate at all — same shape as `auth`.

## e2e verification narrative (TC-03/27)

The automated spec needed several real fixes, in addition to the two
production bugs above, before it passed cleanly:

1. **`Clinician.clinic` doesn't exist** — the real GraphQL field is `clinics`
   (plural), a 0-or-1-element array wrapping the singular `clinic_id` column
   (documented in `clinician.entity.ts`'s own comment). Fixed the spec's
   fixture-setup query.
2. **`services(clinic_id: ...)` returned nothing for the seeded clinic** —
   `appointments.service.ts`'s `create()` never actually validates the
   service belongs to the same clinic, so the filter wasn't needed at all;
   removed it and used any org service.
3. **Cleanup order** — `Encounters_appointment_id_fkey` is `ON DELETE
   RESTRICT`, not `CASCADE` (a clinical record must not silently vanish
   because its appointment was deleted), so `afterAll` must delete the
   `Encounters` row (unlocking it first, past the sign-off trigger) *before*
   deleting the `Appointments` row — the reverse order left orphaned test
   data behind on the first two runs, cleaned up manually via direct SQL.
4. **Positional `locator('textarea').nth(N)` silently indexed the wrong
   field** — found because the assertion consistently read `""` while the
   final DOM snapshot (captured after the failure) showed the correct value
   present. Root cause: the `NotesPane` fields had no accessible name at all
   (a real, independent accessibility bug — a visual `Typography` heading
   with no `label`/`aria-labelledby` wiring), and MUI's multiline
   `TextareaAutosize` renders a second, hidden "shadow" `<textarea>` per
   field for auto-sizing — which the accessibility-tree-based error snapshot
   correctly excludes (`aria-hidden`) but a raw `locator('textarea')` does
   not. Fixed both problems together: added `id`/`aria-labelledby` wiring in
   the component (closing the accessibility gap) and rewrote the spec to use
   `getByLabel`/`getByRole('textbox', {name})` instead of position.
5. **Two strict-mode violations** — `getByText('Signed', {exact: true})`
   matched both the header Chip and the now-relabeled disabled "Sign
   Encounter" button; scoped to `.MuiChip-label`. `getByLabel('Addendum')`
   substring-matched the addendum dialog's own accessible name ("Add
   Addendum"); scoped to `getByRole('textbox', {name: 'Addendum'})`.

Final clean run: `1 passed (23.7s)`. Confirmed via direct SQL before and
after that the spec's own fixture data (disposable appointment, encounter,
template, the temporary `clinician_id` link) was fully torn down — zero
residue.

## Static checks

New files: `backend/src/encounters/{encounters.module,encounters.resolver,
encounters.service,attachments.controller,dto/encounter.input,
entities/encounter.entity}.ts` + `encounters.service.spec.ts`;
`backend/test/integration/encounter-lock-trigger.int-spec.ts`;
`frontend/src/pages/clinician/EncounterWorkspace.jsx`;
`frontend/e2e/encounter-workspace.spec.js`. Touched files: `schema.prisma`,
one hand-written migration (six new models, two triggers), `app.module.ts`,
`App.jsx`, `layouts/AppShell.jsx` (header-title fix for the new route),
`pages/appointments/detail.jsx` (Start Consultation entry point),
`backend/test/integration/setup/{fixture,domain-cases}.ts`,
`matrix-coverage.int-spec.ts`, and `drugs/drugs.service.spec.ts` (unrelated
pre-existing lint fix, see TC-22).

## Commits

See the commit immediately following this test-results doc —
`feat(backend,frontend): consultation workspace and clinical records (REQ020)`.
