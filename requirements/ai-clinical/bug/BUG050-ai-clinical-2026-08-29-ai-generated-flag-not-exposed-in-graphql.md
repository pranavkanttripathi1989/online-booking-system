---
id: BUG050
type: bug
feature: ai-clinical
created: 2026-08-29
updated: 2026-08-29
status: done
parent: REQ151
related: [PLAN217, TP237, TR237]
---

# BUG050 — `ai_generated` written to `EncounterNotes`/`Vitals` but unreadable via GraphQL

## How it was found

User pasted a live GraphQL error hit in the browser: the `Encounter`
query (`frontend/src/pages/clinician/EncounterWorkspace.jsx`'s
`ENCOUNTER_QUERY`) failed validation with `"Cannot query field
\"ai_generated\" on type \"EncounterNote\""` and the identical error
for `"Vital"`.

## Root cause

`Prisma.EncounterNotes.ai_generated` and `Prisma.Vitals.ai_generated`
(both `Boolean @default(false)`, added for `REQ151`'s ambient AI-
scribe feature) are real columns, and
`ai-clinical.service.ts#structureAndSaveNotes()` **already writes
`ai_generated: true`** to both tables when the scribe pipeline
extracts a note section or a vital reading. But this codebase's
GraphQL layer is code-first — the exposed schema is generated purely
from `@ObjectType()`/`@Field()` decorators, and
`backend/src/encounters/entities/encounter.entity.ts`'s
`EncounterNoteType` and `VitalType` never declared an `ai_generated`
`@Field()`. `EncountersService#withRelations()` already passes the
raw Prisma row (including `ai_generated`) straight through with no
field-stripping mapper — Apollo's own serializer is what silently
drops any property not declared on the resolved `@ObjectType()`.

**Net effect: the AI scribe's own provenance flag was being written
correctly to Postgres the whole time, but no GraphQL client could
ever read it back** — not a cosmetic query-validation nuisance, but
real, silently invisible AI-provenance data. The frontend already had
UI logic depending on this field once it works (`EncounterWorkspace
.jsx` lines ~431, ~877-880 — a note badge and an `AutoAwesomeRounded
Icon`/badge-variant on vitals chips), so this bug meant that UI could
never have rendered correctly since the day it shipped.

## Fix

Added `@Field() ai_generated: boolean;` to both `EncounterNoteType`
and `VitalType` in `encounter.entity.ts`. No Prisma migration needed
(the columns already existed); no service-layer change needed (the
data was already flowing through, just silently discarded at the
GraphQL serialization boundary).

## Verification

- `npx tsc --noEmit` + `npx eslint` on the touched file — both clean.
- `npx jest encounters` — 69/69 green, unaffected (confirmed via a
  separate audit that none of the existing tests implicitly required
  `ai_generated` — this bug class is invisible to mocked-Prisma unit
  tests by construction, only a real GraphQL request against the real
  schema can catch it, matching this codebase's own documented
  history with this exact bug class, e.g. `REQ020`'s missing-
  validator finding).
- **Live-verified against the real running server**, not assumed:
  introspected `EncounterNote`/`Vital` types directly (`__type(name:
  ...) { fields { name } }`) confirming `ai_generated` now appears on
  both; then replayed the user's exact original failing query,
  byte-for-byte, against a real freshly-created encounter (logged in
  as `clinician@medibook.dev`, real JWT, real
  `getOrCreateEncounter` call) — it now returns clean data with zero
  errors.
