---
id: TR237
type: bug
feature: ai-clinical
created: 2026-08-29
updated: 2026-08-29
status: done
parent: TP237
related: []
---

# TR237 — expose `ai_generated` on `EncounterNote`/`Vital` — results

## Outcome: PASS

| Case (from `TP237`) | Result |
|---|---|
| 1. Type-check and lint clean | ✅ `tsc --noEmit` and `eslint` both 0 errors |
| 2. Existing unit suite unaffected | ✅ `encounters` suite 69/69 green |
| 3. Live: GraphQL introspection confirms the field | ✅ both `EncounterNote` and `Vital` list `ai_generated` in their live `__type` fields |
| 4. Live: the exact originally-failing query now succeeds | ✅ replayed the user's byte-for-byte `Encounter` query (real clinician JWT for `clinician@medibook.dev`, real `getOrCreateEncounter` call to mint a fresh encounter) — returns clean data, zero errors |

Live-verified against the real running dev backend, not assumed from
a passing type-check alone.

## Verdict

Ships as `done`.
