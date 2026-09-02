---
id: PLAN254
type: improvement
feature: clinical-records
created: 2026-09-03
updated: 2026-09-03
status: done
parent: REQ185
related: [TP274, TR274]
---

# PLAN254 — Implementation plan: digital intake auto-populates the EMR (P2-14)

## Backend

`backend/src/common/utils/escape-html.ts` (new) — `escapeHtml(text)` replaces
`&<>"'` with their HTML entities, returns `''` for null/undefined/empty
input. No such utility existed anywhere in this codebase before this slice —
confirmed via grep. Needed because this is the first place raw
patient-supplied free text is interpolated directly into an HTML-typed
column (`EncounterNotes.content`, TipTap-authored HTML per `FORM-20`)
without first passing through a rich-text editor's own sanitization.

`backend/src/encounters/encounters.module.ts` — added `IntakeFieldsModule` to
`imports`, so `EncountersService` can inject `IntakeFieldsService`.

`backend/src/encounters/encounters.service.ts`:
- New private `buildIntakeSeedContent(appointment)` — builds an HTML string:
  a `<p><strong>Reason for visit:</strong> ...</p>` line when `reason` is
  non-blank, then one `<p><strong>{label}:</strong> {value}</p>` line per
  non-blank `intake_responses` entry, with the key resolved to its real
  label via `IntakeFieldsService#forBooking(clinic_id, product_id)` — the
  exact method `appointments.service.ts#create()` already uses to validate
  required-field completeness at booking time, reused directly rather than
  re-deriving a parallel lookup. Falls back to the raw key when no matching
  `ClinicIntakeFieldConfig` exists. Every interpolated value and label passes
  through `escapeHtml()`. Returns `null` when there is nothing to seed (so
  `forBooking` is never called on an appointment with no intake data at
  all — confirmed by a unit test asserting the mock is never invoked in that
  case).
- `getOrCreateEncounter()` restructured: `seedContent` is computed once,
  read-only, before the existing try block. The encounter `create()` call
  now runs inside `this.prisma.$transaction(async (tx) => {...})` — the
  **first callback-style/interactive transaction in this file** (the
  existing `applyTemplate()` uses the array-style `$transaction([...])`
  form, which cannot express a write depending on another write's own
  generated id). Inside the transaction: `tx.encounters.create(...)`, then,
  only if `seedContent` is non-null, `tx.encounterNotes.create({data:
  {encounter_id: created.id, section: 'complaints', content: seedContent}})`.
  The pre-existing `P2002` race-handling `catch` (re-fetch the winner on a
  concurrent double-create) is unchanged.

## Why not a new schema flag for provenance

Considered and rejected: an `is_patient_reported` boolean on `EncounterNotes`
parallel to the existing `ai_generated`. Reusing `ai_generated` would be
semantically wrong ("AI produced this" vs. "patient self-reported this"), a
new column is a schema change for a one-time seed value with no read-side
consumer built yet, and a plain-language header inside the seeded content
itself ("Patient-reported at booking:") is a simpler, zero-schema-change way
to keep provenance visible — the clinician can still edit or delete it via
the pre-existing `saveEncounterNote()` path exactly like any other note.

## Why not the allergy banner too

`US-EMR-04`'s allergy banner is backed by *structured, coded* `Diagnoses`
rows (`type: 'allergy'`). Auto-generating a structured clinical diagnosis
from unstructured patient-typed intake text would mean guessing/matching a
clinical code from free text — a genuine patient-safety risk needing its own
design review, not a silent side effect of this slice. Explicitly deferred,
not silently dropped.

## Frontend: confirmed zero-change, not assumed

`EncounterWorkspace.jsx`'s `SECTIONS` config already includes `{key:
'complaints', label: 'Chief Complaints'}`, rendered through the same generic
per-section `RichTextEditor` every other section uses — there is no
per-section rendering branch that would need updating for seeded content to
show up. Confirmed by a live GraphQL round trip (below) returning the
seeded note content in exactly the shape the page already queries and
renders, not just by reading the code.

## Test mock changes

`backend/src/encounters/encounters.service.spec.ts`:
- `$transaction` mock changed from array-only
  (`jest.fn((ops: any[]) => Promise.all(ops))`) to dual-mode:
  `jest.fn((arg: any) => (typeof arg === 'function' ? arg(prisma) :
  Promise.all(arg)))` — matching the exact precedent already established in
  `admissions.service.spec.ts` (`$transaction: jest.fn((cb) => cb(prisma))`)
  for its own real callback-transaction usage.
- Added `IntakeFieldsService` as a mocked provider (`forBooking:
  jest.fn().mockResolvedValue([])` by default, overridden per test) and
  `encounterNotes.create: jest.fn()` to the mocked Prisma client.
- New `describe('intake auto-population (P2-14)', ...)` block, 7 tests: no
  seed + `forBooking` never called when `reason`/`intake_responses` are both
  empty; no re-seed on an already-existing encounter; seeds from `reason`
  alone; resolves intake keys to real labels via a mocked `forBooking`
  config; falls back to the raw key when no config matches; skips
  blank/whitespace-only intake values; HTML-escapes an XSS-shaped `reason`.

## Verification

Backend: `npx tsc --noEmit`, `npx eslint "{src,apps,libs,test}/**/*.ts"`
clean on all touched files and the full tree. `escape-html.spec.ts` — 5 new
tests, all passing. `encounters.service.spec.ts` — 81/81 passing (7 new).
Full backend unit suite: 167 suites/2658 tests, all green. Docker container
restarted, recompiled clean ("Found 0 errors"), no boot errors. Full
integration suite (`npm run test:int`, host): 13 suites/516 tests, all
green, including `matrix-coverage.int-spec.ts`'s existing `encounters`
coverage — unaffected by this same-domain addition. The pre-existing
`WebhookDispatchService` "Failed to decrypt secret" integration-log noise is
confirmed pre-existing fixture noise, identical to prior slices' own runs,
unrelated to this change.

Live verification against the real dev stack (supplementary, beyond the
already-complete unit+integration coverage, since this slice ships zero new
frontend surface): authenticated as `receptionist@medibook.dev`, created a
real appointment (real patient/clinician/clinic/service ids from the dev
seed) via a direct `createAppointment` GraphQL call with an XSS-shaped
`notes` value, then called `getOrCreateEncounter` on it. The returned
encounter's `notes` array contained exactly one `'complaints'` entry:

```
<p><em>Patient-reported at booking:</em></p><p><strong>Reason for visit:</strong> Fever and cough &lt;script&gt;alert(1)&lt;/script&gt; for 3 days</p>
```

— confirming the seed fires on real data, the reason is correctly labelled
and wrapped, and the injected `<script>` tag is HTML-escaped rather than
passed through raw. No frontend code was touched for this slice.
