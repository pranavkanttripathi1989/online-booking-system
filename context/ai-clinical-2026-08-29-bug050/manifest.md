---
id: CTX-ai-clinical-2026-08-29-bug050
type: bug
feature: ai-clinical
created: 2026-08-29
updated: 2026-08-29
status: done
parent: BUG050
related: [PLAN217, TP237, TR237]
---

# ai-clinical — `ai_generated` written but unreadable via GraphQL (2026-08-29)

User pasted a live GraphQL validation error hit in the browser while
loading a consultation workspace: `"Cannot query field \"ai_generated\"
on type \"EncounterNote\""` / `"...on type \"Vital\""`.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | BUG050 | [ai_generated flag not exposed](../../requirements/ai-clinical/bug/BUG050-ai-clinical-2026-08-29-ai-generated-flag-not-exposed-in-graphql.md) |
| implementation-plans | PLAN217 | [implementation plan](../../implementation-plans/ai-clinical/bug/PLAN217-ai-clinical-2026-08-29-ai-generated-flag-not-exposed-in-graphql.md) |
| test-plans | TP237 | [test plan](../../test-plans/ai-clinical/bug/TP237-ai-clinical-2026-08-29-ai-generated-flag-not-exposed-in-graphql.md) |
| test-results | TR237 | [results](../../test-results/ai-clinical/bug/TR237-ai-clinical-2026-08-29-ai-generated-flag-not-exposed-in-graphql.md) |

## What shipped

Added the missing `@Field() ai_generated: boolean;` to both
`EncounterNoteType` and `VitalType` in `backend/src/encounters/
entities/encounter.entity.ts`. The Prisma columns already existed and
`REQ151`'s AI-scribe pipeline was already writing `ai_generated: true`
correctly on both tables — this was a pure GraphQL-schema-exposure
gap (code-first entity class missing a decorator), not a data or
write-path bug. No migration, no service-layer change needed.

## Why this matters beyond the one query

The AI scribe's own provenance flag (which note/vital came from
ambient AI extraction vs. manual clinician entry) had been silently
unreadable via GraphQL since `REQ151` shipped — the frontend's own
UI logic for a note badge and a vitals-chip AI icon
(`EncounterWorkspace.jsx`) could never have worked. This is the same
"undecorated/missing `@Field()` silently drops real data" bug class
this codebase has hit multiple times before (`REQ020`'s missing-
validator finding, the `REQ022`/`Plans`/`ScheduledReportInput` finds
in Phase G+2) — confirmed here to also apply on the *read* side, not
just input validation.

## Verification

`tsc --noEmit` + `eslint` clean; `encounters` unit suite 69/69
(unaffected, since this bug class is invisible to mocked-Prisma unit
tests by construction). **Live-verified** against the real running
dev backend: GraphQL introspection confirms both types now expose
`ai_generated`, and the user's exact original failing query — replayed
byte-for-byte with a real clinician JWT against a freshly-created real
encounter — now returns clean data with zero errors.
