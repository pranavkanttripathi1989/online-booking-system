---
id: PLAN191
type: requirement
feature: ai-clinical
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ151
related: [REQ151, TP211, TR211]
---

# PLAN191 — Ambient AI scribe, voice-to-Rx, pre-consult summary

## Backend

New module `backend/src/ai-clinical/`, following `05-cross-cutting-
conventions.md`'s scaffolding: `ai-clinical.module.ts` (imports
`EncountersModule`, `EntitlementsModule`), `.resolver.ts`, `.service.ts`,
`dto/ai-clinical.input.ts`, `entities/ai-clinical.entity.ts`, plus two
pure algorithm modules (`transcript-structuring.ts`,
`prescription-extraction.ts`, `pre-consult-summary.ts`) and a provider
registry (`providers/{provider.interface,sarvam.provider,registry}.ts`)
mirroring `notifications/providers/` exactly.

**Schema** (`20260827060000_ai_clinical` migration, hand-written per the
standing `prisma migrate dev` non-interactivity constraint):
`AiProviderConfig` (per-org, `purpose` default `'transcription'`,
encrypted credentials), `AiTranscriptionSessions` (status machine:
`pending_consent → recording → transcribed → structured`/`failed`), and
two new nullable columns each on `EncounterNotes`/`Vitals`
(`ai_generated`, `ai_source_session_id`).

**Tenant scoping**: `AiTranscriptionSessions.client_org_id` is derived
from the target *encounter*'s org (a direct `prisma.encounters
.findUniqueOrThrow` lookup after `EncountersService.encounter()` already
proved access — its own `toGraphQL()` strips `client_org_id` from the
returned shape, so a second, cheap lookup is needed, not a re-derivation
of the access check). `loadSessionForUser()` then compares that stored
org against the caller's own `client_org_id` for every subsequent
session-keyed call — never a client-supplied org argument.

**Entitlement gate**: only `startTranscriptionSession` carries
`@UseGuards(EntitlementGuard) @RequiresFeature('ai_scribe')` — every
other handler is `@Auth(...CLINICAL_ROLES)` only, matching `REQ147`'s own
"opt-in per resolver" design (nothing here widens the guard's blast
radius).

## Frontend

- `frontend/src/pages/clinician/EncounterWorkspace.jsx` — new
  `AiScribePanel` component (consent dialog, record/stop via
  `MediaRecorder`, structure, Voice-to-Rx), an `sectionAiGenerated()`
  badge helper wired into the existing note-section labels and vitals
  chips, and a pre-consult-summary `Alert` fed by the new
  `preConsultSummary` query.
- `frontend/src/pages/clinician/PrescriptionBuilder.jsx` — reads
  `location.state.aiDraftItems` once (a `useState` lazy initializer,
  not a `useEffect`, so a later in-page navigation can't silently
  re-import), maps matched/unmatched draft items onto the existing line
  shape, reuses `computeQty()` verbatim.
- `frontend/src/pages/admin/Communications.jsx` — new "AI Scribe" card
  on the Global Settings tab, byte-for-byte structural mirror of the
  existing SMS/OTP provider block (`GET_AI_PROVIDERS`/
  `GET_MY_AI_PROVIDER_CONFIG`/`UPDATE_AI_PROVIDER_CONFIG`).

## Contract fidelity (Hard Rule 7 / ARCH-15)

Every new GraphQL operation was defined fresh (no prior contract to
match, `ai-clinical` is a brand-new domain) — argument names/shapes
checked against the resolver source before writing frontend queries, not
assumed. `getOrCreateEncounter(appointment_id:)`/`signEncounter
(encounter_id:)`'s own argument names were double-checked while writing
the integration test (see "Errors found" below) — a live example of
why this check matters even for pre-existing resolvers this slice reuses.

## Testing

- **Backend unit**: 65 new tests — `transcript-structuring.spec.ts` (15),
  `prescription-extraction.spec.ts` (8), `pre-consult-summary.spec.ts`
  (9), `ai-clinical.service.spec.ts` (27, mocked Prisma +
  `EncountersService`/`EntitlementsService`), `ai-clinical.resolver.spec.ts`
  (6, `@RequiresFeature`/`@Auth` metadata assertions matching
  `pharmacy.resolver.spec.ts`'s own pattern).
- **Backend integration**: `ai-clinical.int-spec.ts`, 6 tests against
  real Postgres + the real GraphQL guard chain — consent rejection,
  role-gate rejection, real session creation, a clean "no provider
  configured" failure (this environment's own honest state), a real
  `structureTranscriptSession` write proven via direct Postgres reads
  (`ai_generated: true`, `ai_source_session_id` set) plus real usage
  metering, and `FR-AI-13` proven end-to-end (sign → attempt structure →
  rejected) — the app-level check, not a re-proof of the deeper trigger
  (already proven once in `encounter-lock-trigger.int-spec.ts`).
- **Frontend unit**: `EncounterWorkspace.test.jsx` (+6: AI badges from
  data, browser-unsupported notice, a graceful mic-permission-denied
  path, and a full record→submit→structure→Voice-to-Rx flow through the
  real mutations with a stubbed `MediaRecorder`/`FileReader`),
  `PrescriptionBuilder.test.jsx` (new file, 4 tests: matched-drug
  pre-fill, unmatched-drug manual-review note, the free-text line
  staying un-issuable, no banner on a normal visit),
  `Communications.test.jsx` (+3: real provider list, no-secret-echo on
  an already-configured provider, real save mutation).
- **Tenancy matrix**: `ai-clinical` added to `EXEMPT` in
  `matrix-coverage.int-spec.ts` — no list query exists to build a
  cross-org matrix case from (global catalog + two self-scoped-off-JWT
  queries + session/patient-keyed single-record ops), matching
  `entitlements`'s own prior exemption shape. Cross-org isolation is
  real and covered directly in `ai-clinical.service.spec.ts`.

## Errors found and fixed during this slice (not pre-existing)

1. **Own integration-test contract guesses, both wrong the same way**:
   guessed `getOrCreateEncounter(appointmentId:)` and
   `signEncounter(id:)` — the real arguments are `appointment_id`/
   `encounter_id`. Caught by reading the resolver source directly before
   trusting a passing-looking test, per Hard Rule 7's own standard.
2. **A near-miss data-safety bug in the test's own cleanup**: an
   unconditional `deleteMany({where: {id: encounterId}})` with
   `encounterId` still `undefined` (from the first bug above) degraded
   to "match everything" — the exact `client_org_id: undefined`
   tenant-scoping bug class this codebase warns about elsewhere, hit
   here in test fixture code. Stopped only by a real Postgres FK
   constraint on `Prescriptions`, not by the test's own guard. Fixed
   with explicit `if (encounterId)` guards.
3. **Cleanup ordering vs. the lock trigger**: the last test signs
   (locks) the encounter on purpose, which then made the suite's own
   `afterAll` cleanup's plain `EncounterNotes` delete fail against the
   same trigger it had just proven correct. Fixed by unlocking first —
   documented inline as legitimate test-fixture teardown, not a
   real-feature code path.
4. **`orgIdForWrite()` was the wrong tool** for deriving a session's org
   — it derives from the *caller*, but the correct scope here is the
   *target encounter's* org (a platform operator reviewing a real org's
   encounter must still meter/gate against that org, not their own
   absent one). Fixed with a direct `encounters.findUniqueOrThrow`
   lookup instead.
5. **Stale Prisma Client in the running dev container** (pre-existing,
   unrelated to this slice's own code, discovered while restarting to
   verify) — `medibook_backend`'s generated Prisma types were dated
   Aug 22, predating even `REQ145`'s (P1-06) own schema changes, because
   `backend/node_modules` is an anonymous Docker volume `npx prisma
   generate` on the host never reaches. Fixed with `docker exec
   medibook_backend npx prisma generate` + restart; confirmed via live
   GraphQL introspection that every new operation in this slice reaches
   the running server.
6. **Two jsdom/MUI-testing artifacts, not real bugs** — a fake
   `Blob`/`FileReader` round-trip through jsdom's own stringification
   produced a non-deterministic base64 payload for the mocked
   `submitTranscription` variables; fixed by stubbing `global.FileReader`
   for a fixed, assertable output. Separately, MUI's `Dialog` exit
   transition never resolves under jsdom (no real `transitionend`),
   permanently leaving its `aria-hidden` wrapper on the rest of the page
   after closing it — `getByRole` queries after a dialog-driven action
   need `{hidden: true}` to see past it; every other dialog test in this
   file avoids the issue only because it asserts via `getByText`, which
   isn't `aria-hidden`-aware.

## Live verification

Not performed against a real browser/microphone this session (no
browser-automation MCP server connected — `chrome-devtools`/`playwright`
both failed with `ENOENT`, reported to the user as a connection failure
rather than silently skipped). Live-verified instead via direct GraphQL
introspection against the running `medibook_backend` container,
confirming every new operation (`startTranscriptionSession`,
`submitTranscription`, `structureTranscriptSession`,
`aiExtractedPrescriptionDraft`, `preConsultSummary`,
`updateMyAiProviderConfig`, `myAiProviderConfig`, `myAiUsage`,
`aiTranscriptionProviders`) is genuinely live, and via the real-Postgres
integration suite for the end-to-end write path.
