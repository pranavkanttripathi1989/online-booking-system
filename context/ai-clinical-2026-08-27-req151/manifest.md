# ai-clinical-2026-08-27-req151

| Field | Value |
|---|---|
| Feature | ai-clinical (new slug) |
| Date | 2026-08-27 |
| IDs | REQ151, PLAN191, TP211, TR211 |
| Status | done |
| Phase-plan slices | P1-11, P1-12, P1-13 |

## What this bundle covers

Ambient AI scribe (consent-gated recording → real Sarvam-provider
transcription → deterministic structuring into existing `EncounterNotes`
sections + `Vitals`, all flagged `ai_generated`), voice-to-Rx (extracted
drug drafts fuzzy-matched against the real `Drugs` table, imported into
the existing `PrescriptionBuilder` as editable, never-auto-committed
lines), and a pre-consult summary (a ranked ≤5-line digest of
`patientTimeline`/allergies). New backend module
`backend/src/ai-clinical/`, new migration
`20260827060000_ai_clinical`, new frontend `AiScribePanel` inside
`EncounterWorkspace.jsx`, an AI-draft-import path on
`PrescriptionBuilder.jsx`, and an AI Scribe provider-config card on
`admin/Communications.jsx`.

## Links

- Requirement: [REQ151](../../requirements/ai-clinical/requirement/REQ151-ai-clinical-2026-08-27-ambient-scribe-voice-to-rx-preconsult.md)
- Plan: [PLAN191](../../implementation-plans/ai-clinical/requirement/PLAN191-ai-clinical-2026-08-27-ambient-scribe-voice-to-rx-preconsult.md)
- Test plan: [TP211](../../test-plans/ai-clinical/requirement/TP211-ai-clinical-2026-08-27-ambient-scribe-voice-to-rx-preconsult.md)
- Test results: [TR211](../../test-results/ai-clinical/requirement/TR211-ai-clinical-2026-08-27-ambient-scribe-voice-to-rx-preconsult.md)

## Real bugs found and fixed this slice

1. Own integration-test GraphQL argument-name guesses, both wrong
   (`appointmentId`/`id` instead of the real `appointment_id`/
   `encounter_id`) — caught by reading the resolver source directly.
2. A near-miss data-safety bug in that same test's own cleanup code: an
   unconditional `deleteMany` degraded to "match everything" when a
   setup step left `encounterId` unset — the exact tenant-scoping bug
   class this codebase warns about elsewhere, stopped only by a real
   Postgres FK constraint. Fixed with explicit guards.
3. `orgIdForWrite()` was the wrong tool for deriving a session's org —
   the correct scope is the target *encounter's* org, not the caller's.
4. Pre-existing, unrelated: the running `medibook_backend` container's
   generated Prisma Client was stale since 2026-08-22 (predating
   `REQ145`), because `backend/node_modules` is an anonymous Docker
   volume `npx prisma generate` on the host never reaches — found while
   restarting to verify this slice's own new resolver fields, fixed with
   `docker exec ... npx prisma generate` + restart.
5. Two jsdom/MUI-testing artifacts (not app bugs): a fake `Blob`/
   `FileReader` round-trip needed stubbing for a deterministic base64
   payload; MUI's `Dialog` exit transition never resolves under jsdom,
   requiring `{hidden: true}` on `getByRole` queries issued right after
   a dialog-driven action.

## Deliberately out of scope

- Rolling `ai_scribe` entitlement gating to any other resolver.
- An LLM-based structurer (the deterministic version is the honestly-
  labeled swappable first pass).
- Drug-name-extraction precision benchmarking (no labeled corpus in this
  environment) — logged as an open item in `REQ151`/`TR211`, not
  silently dropped.
- A real-browser/microphone live pass — no browser-automation MCP server
  connected this session.

## Next in the phase-plan tracker

`P1-14`/`P1-15` (AI front desk — inbound voice agent, booking against
real slots) are the next unstarted slices in
`project-plans/phase-plans/01-phase1-close-the-gates.md`.
