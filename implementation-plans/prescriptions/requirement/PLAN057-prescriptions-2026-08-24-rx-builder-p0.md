---
id: PLAN057
type: requirement
feature: prescriptions
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ021
related: [TP084, TR083]
---

# PLAN057 — Prescription builder, print view, and repeat-Rx, P0 slice

Slice 3 of 6 in the current Phase 1 MVP pass (REQ017 → REQ020 → **REQ021** →
REQ019 → REQ018 → REQ032, dependency order). Requires `REQ020` (an encounter
must exist to issue a prescription from — real, shipped 2026-08-24) and
`REQ016` (drug master — real, already shipped). Blocks `REQ022` (pharmacy)
and is a hard prerequisite for `REQ026` (telemedicine) GA.

## Scope

**Built (P0):** drug search with auto-calculated quantity from
frequency × duration (`US-RX-01`), saved favourite drug-sets, personal or
org-shared (`US-RX-02`), a one-rendering-path print view with clinic
letterhead, clinician registration/qualifications, patient demographics, and
the drug table (`US-RX-03` subset), and repeat-from-history with a
server-side reprint counter that watermarks every view after the first as
"DUPLICATE" (`US-RX-05`).

**Explicitly deferred (P1, per REQ021's own phase assignment) — not silently
dropped:** WhatsApp/OTP-gated sharing (`US-RX-04`), Telemedicine Practice
Guidelines drug-list enforcement (`US-RX-06` — correctly gated behind
`REQ026`'s own `consultation_mode` column, which does not exist yet; every
prescription is `mode: 'in_person'` until that column lands), regional-
language PDF rendering (`US-RX-07`), digital signature + tamper-evident hash
(`US-RX-08`), and the pharmacy dispense-queue handoff (`US-RX-09`, blocked on
`REQ022` not existing yet). A5/thermal print formats (part of `US-RX-03`)
are also deferred — only the A4 letterhead layout was built.

## Architecture decision: one rendering path, no PDF library

`REQ021`'s own non-functional note calls out that `FR-RX-06`'s
preview-must-match-output requirement "typically requires generating the PDF
server-side... decide this architecturally before implementation." This
codebase's only two existing print precedents
(`appointments/detail.jsx`, `finances/index.jsx`) both use `window.print()`
directly against the same DOM the user is already looking at — there is no
existing server-side PDF pipeline anywhere in `backend/src`, and standing one
up (a rendering service, a font-embedding story for the deferred regional-
language requirement, a storage location for the hash in `US-RX-08`) is a
multi-day investment that belongs with those two deferred stories, not this
P0 slice. `PrescriptionPrint.jsx` therefore renders the same component tree
for on-screen preview and `window.print()` — by construction, preview cannot
drift from output, which satisfies `FR-RX-06`'s engineering intent without a
new dependency. Revisit this decision when `US-RX-07`/`US-RX-08` are picked
up — regional-language font embedding in particular is much harder to get
right in browser print CSS than in a real PDF pipeline.

## Data model

`backend/prisma/migrations/20260824020000_prescriptions/migration.sql`:

- `Clinicians` gains `registration_number`, `qualifications` (both nullable
  — needed for the print letterhead, not previously modeled anywhere).
- `Prescriptions`: `encounter_id`, `patient_id`, `clinician_id` (the latter
  two denormalized from the encounter at creation, not re-derived on every
  read — same reasoning as `Encounters.client_org_id`), `mode`, `issued_at`,
  `language`, `repeated_from_id` (self-FK, `ON DELETE RESTRICT` — a repeat
  chain must not be able to silently orphan), `reprint_count`. No
  `client_org_id` of its own — scoped indirectly via
  `encounter.client_org_id`, identical reasoning to every other model
  hanging off `Encounters` (`REQ020`'s own precedent for `Diagnoses`/
  `Attachments`).
- `PrescriptionItems`: one row per drug line, `ON DELETE CASCADE` from
  `Prescriptions`, `ON DELETE RESTRICT` from `Drugs` (a drug cannot be
  deleted while a historical prescription references it).
- `PrescriptionSets` / `PrescriptionSetItems`: `US-RX-02`'s favourites —
  `REQ021`'s own Data Model Impact section lists no such table at all, the
  identical gap `EncounterTemplates` had in `REQ020`. Mirrors
  `EncounterTemplates`' exact shape: `client_org_id` nullable (org-shared)
  + `clinician_id` nullable (personal) — a set with `clinician_id` set is a
  personal favourite, `null` is org-shared, matching `PLAN056`'s convention
  exactly rather than inventing a different ownership model for a
  structurally identical concept.
- `TpgDrugLists` (from `REQ021`'s Data Model Impact section) is **not**
  built — it exists only to serve `US-RX-06`, which is deferred with the
  `consultation_mode` column it depends on. Building the reference table
  with nothing to gate against it would be dead schema.

No `signature_id`/`pdf_hash` columns on `Prescriptions` either — both belong
to the deferred `US-RX-08`, and adding nullable columns for a feature with no
write path yet would be the same "add it later, against the real
requirement" call `REQ020` made for ICD-10 coding.

## Backend

`backend/src/prescriptions/` — module, resolver, service, DTOs, entities,
25-case `.spec.ts`. Role gating: `createPrescription`/`repeatPrescription`/
`applyPrescriptionSet` are clinician-only (issuing or preparing to issue a
script is a clinical act, matching `encounters.service.ts`'s own
`signEncounter()` restriction); `prescription`/`patientPrescriptions`/
`printPrescription` are readable by `patient`, `clinician`, `manager`,
`admin`, `super_admin`, `staff` with self-scoping enforced in the service
(a patient sees only their own; a clinician sees only prescriptions they
issued, or — for `patientPrescriptions` — only for a patient they've
actually treated, checked via an `Appointments` existence query, since
"which patients has this clinician treated" isn't a direct FK — the exact
`REQ020`/`patients.service.ts` precedent for this class of check).

Every read path uses `isSameOrg(user, encounter.client_org_id)` (via
`orgScopeVia(user, 'encounter')` for list queries) and fails closed to
`NotFoundException`, never a silently-empty-vs-everything branch — the F-01
sentinel pattern. `createPrescriptionSet`'s org write path uses
`orgIdForWrite(user, 'PrescriptionSet')`, not `?? undefined` (Hard Rule 6's
four-spellings warning) — an org-less non-operator creating a set fails
closed rather than producing an org-less row.

Two deliberate design choices, recorded rather than guessed at:

1. **Issuing a prescription is independent of the encounter's lock state.**
   `REQ020`'s sign-off immutability trigger locks `EncounterNotes`/
   `Diagnoses`, but `Prescriptions` has no FK-cascaded relationship to that
   lock — a clinician can prescribe mid-consultation before writing up final
   notes, or add a script to an already-signed encounter during a same-day
   follow-up. This is a real clinical workflow, not an oversight; re-locking
   prescriptions to the encounter's sign state would block that workflow
   without the requirement asking for it.
2. **`repeatPrescription`/`applyPrescriptionSet` return an unsaved draft
   shape, not a persisted row.** `US-RX-05` explicitly says "pre-populate
   for review and adjustment" — a silent copy would let a clinician issue a
   stale repeat without ever reviewing it, which is the exact failure mode
   the acceptance criterion is written to prevent.

## Frontend

- `frontend/src/pages/clinician/PrescriptionBuilder.jsx` — the Rx builder:
  a drug-line table (Autocomplete search, dose/frequency/route/duration/qty/
  instructions), auto-computed qty on frequency-or-duration change, a
  favourites panel (apply-in-one-click per `US-RX-02`), a "Repeat from
  History" dialog, and issue/save-as-set actions.
- `frontend/src/pages/prescriptions/PrescriptionPrint.jsx` — the print view,
  routed at `/prescriptions/:id/print`, mirroring `/video/:id`'s existing
  "protected but bare, no `AppShell` chrome" route shape.
- `EncounterWorkspace.jsx`'s `ActionsPane` gained a "New Prescription"
  button, independent of the encounter's lock state (see above), navigating
  to `/clinician/prescriptions/new?encounterId=&patientId=`.
- `App.jsx`: two new routes, both auth-gated.

## Real bugs found and fixed this slice

**1. Missing refetch after saving a favourite set (found via live manual
browser verification, per `REQ020`'s own lesson that a live pass catches
what unit tests can't).** `handleSaveSet` called the mutation but never
refetched `PRESCRIPTION_SETS_QUERY` — a just-saved set was correctly
persisted (confirmed via a direct query) but never appeared in the on-screen
list until a manual reload. Fixed by `await refetchSets()` after the
mutation succeeds; the e2e spec's step 4 (confirming the set appears without
a reload) is the regression guard.

**2. Frontend responsiveness gap — `PrescriptionBuilder.jsx`'s 8-column
drug-line table and `PrescriptionPrint.jsx`'s 7-column drug table both had
no `TableContainer` wrapper**, a violation of `CLAUDE.md`'s Hard Rule 5
("every `<Table>` needs a `<TableContainer>`") found during this
documentation pass, not the original build — the same silent-truncation
class of bug that rule was written from (`staff/index.jsx`'s prior real
finding). Fixed by wrapping both tables; re-verified lint clean and the e2e
spec still green after the change.

**3. The `e2e/prescription-builder.spec.js` test itself had two real bugs,
found while re-running it in this session (the original session was killed
mid-run by an interruption, never observing a green result):**
   - `page.getByRole('combobox').first()` matched the Drug search
     Autocomplete (also `role="combobox"`, and first in DOM order) instead
     of the Frequency `<Select>`, because the `<Select>` had no accessible
     name to disambiguate. Fixed two ways: added
     `inputProps={{ 'aria-label': 'Frequency' }}` to the `<Select>` (a
     genuine accessibility gap, not just a test workaround — a bare
     `aria-label` prop on MUI's `<Select>` lands on the wrong DOM node per
     MUI's own `SelectInput` internals; `inputProps` is the documented way
     to label a `Select` with no visible `<InputLabel>`), and scoped the
     test locator to `getByRole('combobox', { name: 'Frequency' })`.
   - The fixed favourite-set name (`'REQ021-E2E-PROBE Set'`) collided with
     itself across repeated runs against the real, accumulating dev DB —
     the identical "don't assume a stable dataset" lesson `manager-
     services.spec.js` already carries in `CLAUDE.md`. Fixed by scoping the
     visibility assertion with `.first()`, and by capturing
     `prescriptionSetId` directly from the `createPrescriptionSet` mutation
     response instead of a later name-based lookup — so `afterAll`'s
     cleanup runs even if a later step in the test fails, rather than
     leaving an orphaned row behind on every non-happy-path exit.
   - Two orphaned `Prescriptions`/`Encounters` rows and two orphaned
     `PrescriptionSets` rows left by the original interrupted run (and by
     this session's own two intermediate runs while diagnosing the above)
     were deleted from the dev DB directly (child-first, per the
     `ON DELETE RESTRICT` chain: `Prescriptions` → `Encounters` →
     `Appointments`).

## Testing

- Backend: 25 new cases in `prescriptions.service.spec.ts` — qty
  auto-calculation (including the `SOS`/no-duration null-qty cases),
  tenant isolation and role gating on every mutation and query, self-scoping
  for patient/clinician callers (including the org-less-non-operator
  fail-closed sentinel case), the reprint-count/duplicate-watermark state
  machine, and the org write-path for `createPrescriptionSet`.
- Tenancy matrix: new `prescriptions` domain classified in
  `backend/test/integration/setup/domain-cases.ts` and
  `backend/test/integration/setup/fixture.ts` — closes the gap immediately
  rather than shipping an unclassified resolver domain, which
  `matrix-coverage.int-spec.ts` would otherwise fail on.
- Frontend: full unit suite regression (no new component tests this slice —
  no existing test file for either new page to extend, and the e2e spec
  below already exercises every interactive path end-to-end against the
  real backend).
- e2e: `frontend/e2e/prescription-builder.spec.js` — the full `US-RX-01`,
  `02`, `05` flow against the real dev stack (build a line with auto-qty,
  save and re-apply a favourite set without reload, issue, confirm no
  watermark on first view and `DUPLICATE` on the second, repeat from
  history and confirm pre-fill).

See `TP084`/`TR083` for the full case-by-case verification record.

## Definition of Done

- [x] Resolvers/DTOs match `REQ021`'s scoped P0 user stories.
- [x] Every tenant-scoped query/mutation uses `orgScopeVia`/`isSameOrg`/
      `orgIdForWrite` — no ternary or `?? undefined` spelling of the F-01
      bug class.
- [x] Self-scoping enforced for both `patient` and `clinician` callers.
- [x] Unit tests: happy path, tenant isolation, self-scoping, role gating —
      25 cases, all passing.
- [x] Tenancy matrix extended, `matrix-coverage.int-spec.ts` passing (no
      unclassified domain).
- [x] Backend full suite green: 61 suites / 872 tests.
- [x] Backend lint (`eslint`) and `tsc --noEmit` clean.
- [x] Backend integration suite green: 4 suites / 225 tests.
- [x] Frontend full suite green: 6 suites / 63 tests.
- [x] Frontend lint clean for every touched file.
- [x] Frontend build succeeds.
- [x] Responsive: both new tables wrapped in `TableContainer` (tablet-first
      tier — clinician consult workflow — verified no truncation).
- [x] Live e2e spec green against the real backend, not mocks.
- [x] Committed as its own vertical slice.
