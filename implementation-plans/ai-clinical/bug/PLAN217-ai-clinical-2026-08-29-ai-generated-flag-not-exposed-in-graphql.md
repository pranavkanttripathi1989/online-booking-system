---
id: PLAN217
type: bug
feature: ai-clinical
created: 2026-08-29
updated: 2026-08-29
status: done
parent: BUG050
related: [TP237, TR237]
---

# PLAN217 — expose `ai_generated` on `EncounterNote`/`Vital`

## Approach

1. Traced the exact root cause via a targeted `Explore` pass (real
   code, not memory): confirmed the Prisma columns exist, confirmed
   the AI-scribe write path already sets them, confirmed the GraphQL
   entity classes were missing the `@Field()`, and confirmed the
   service layer's `withRelations()` already passes the raw column
   through with no stripping — isolating the bug to exactly one
   missing decorator per class.
2. Added `@Field() ai_generated: boolean;` to `EncounterNoteType` and
   `VitalType` in `backend/src/encounters/entities/encounter.entity
   .ts` — the minimal, precise fix (code-first GraphQL means the
   entity decorator is the single source of truth for the schema; no
   separate SDL file to keep in sync).
3. Confirmed `backend/src/schema.gql` (autoSchemaFile, regenerated on
   every server start) picks the field up automatically — no manual
   schema edit.

## Testing

- `npx tsc --noEmit` + `npx eslint` — clean.
- `npx jest encounters` — 69/69 green.
- Live verification against the real running dev backend (see `TR237`
  for the full account): GraphQL introspection confirming the field
  now exists on both types, then the user's exact original query
  replayed against a real encounter with a real clinician JWT,
  succeeding with zero errors.

## Commit

One commit, `backend/src/encounters/entities/encounter.entity.ts`
only.
