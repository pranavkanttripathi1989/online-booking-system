---
id: TP237
type: bug
feature: ai-clinical
created: 2026-08-29
updated: 2026-08-29
status: approved
parent: PLAN217
related: [TR237]
---

# TP237 — expose `ai_generated` on `EncounterNote`/`Vital` — test plan

## Cases

1. **Type-check and lint clean.** `npx tsc --noEmit` and `npx eslint`
   on the touched entity file — 0 errors.
2. **Existing unit suite unaffected.** `npx jest encounters` — all 69
   pre-existing tests still pass (this bug class is not visible to
   mocked-Prisma unit tests, so no new failure is expected, but no
   regression either).
3. **Live: GraphQL introspection confirms the field exists.**
   `__type(name: "EncounterNote") { fields { name } }` and the same
   for `"Vital"` both list `ai_generated`.
4. **Live: the exact originally-failing query now succeeds.** The
   user's real, byte-for-byte `Encounter` query (including
   `ai_generated` under both `notes` and `vitals`) returns data with
   zero GraphQL errors against a real encounter.

## Out of scope

Adding a resolver-level or e2e test asserting `ai_generated` renders
correctly end-to-end in the frontend UI (the note badge / vitals chip
icon) — not exercised this pass (no browser-automation tool used for
a full clinician workflow walkthrough); the live GraphQL-layer
verification in case 4 is the direct proof for the reported error.
