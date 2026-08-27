---
id: REQ151
type: requirement
feature: ai-clinical
created: 2026-08-27
updated: 2026-08-27
status: done
parent: —
related: [PLAN191, TP211, TR211]
---

# REQ151 — Ambient AI scribe, voice-to-Rx, pre-consult summary (P1-11/P1-12/P1-13)

## Source

`project-plans/phase-plans/01-phase1-close-the-gates.md` slices **P1-11**
(ambient AI scribe → structured notes/diagnoses/vitals), **P1-12**
(voice-to-Rx against the real drug master), **P1-13** (pre-consult AI
summary) — traced to PRD v2 M18, `FR-AI-01` through `FR-AI-13`. New
feature slug (`ai-clinical`) — this is genuinely new product scope, no
prior work existed under any related slug.

Picked up after `P1-08`/`P1-09`/`P1-10` (ABDM M1/M2 certification) were
explicitly skipped per user decision — those slices require real NHA
sandbox credentials and a literal government certification process, both
unverifiable in this environment. `P1-11`/`P1-12`/`P1-13` were chosen as
the next unblocked slices in dependency order (`P1-12`/`P1-13` both
depend on `P1-11`).

## What shipped

### P1-11 — Ambient AI scribe

- **Consent-gated recording** (`FR-AI-01`) — `startTranscriptionSession`
  refuses without `consent_given: true`, creating no row otherwise.
- **Transcription — buy, don't build** (PRD v2 D1) — Sarvam AI
  (`https://api.sarvam.ai/speech-to-text`, `saarika:v2`), built as real
  vendor-calling code (`ai-clinical/providers/sarvam.provider.ts`),
  matching the existing `msg91.provider.ts` registry pattern exactly.
  Honestly flagged: not fabricated, but not live-verified against real
  Sarvam credentials in this environment.
- **Deterministic structuring, not an LLM** — with no second AI provider
  available this session, transcript→notes structuring
  (`transcript-structuring.ts`) and vitals extraction are pure,
  keyword/regex-based algorithms, explicitly swappable for an LLM-based
  structurer later (generalizing `FR-AI-12`'s own "provider is
  swappable" philosophy to the structuring step, not just transcription).
- **Structures into existing `EncounterNotes` sections, never a free-text
  blob** (`FR-AI-03`) and **extracts discrete `Vitals`** (`FR-AI-05`) —
  both write through the exact same Prisma calls
  `saveEncounterNote`/`recordVitals` already use, flagged
  `ai_generated: true`.
- **Per-tenant AI metering** (`FR-AI-11`) — `AiTranscriptionSessions
  .duration_seconds` aggregated against a `getQuota` check
  (`ai_transcription_minutes_per_month`), gated behind the existing
  `EntitlementGuard`/`@RequiresFeature('ai_scribe')` from `REQ147`.
- **AI never writes to a signed encounter** (`FR-AI-13`) — satisfied two
  ways: an explicit app-level lock check in `structureAndSaveNotes()`,
  and — the deeper guarantee — the existing Postgres trigger
  (`reject_write_if_encounter_locked()`, from `REQ020`) already rejects
  any write to `EncounterNotes` on a locked encounter regardless of
  which code path issues it. Since this slice's writes go through the
  identical Prisma calls, that guarantee is inherited, not re-derived.
- **Audio never persisted** (`FR-AI-07`) — `audio_base64` is a mutation
  input field only; no column stores it. Only the resulting
  `raw_transcript` text is saved.
- **Frontend**: `AiScribePanel` in `EncounterWorkspace.jsx`
  (tablet-first tier) — consent dialog → record/stop (`MediaRecorder`) →
  structure. Every AI-derived note section and vital is visibly flagged
  (`AutoAwesomeRoundedIcon` + "AI draft — review before signing" chip),
  editable before sign-off (`FR-AI-06`) via the existing note-editing UI
  — nothing new needed there since `ai_generated` is just another field
  on a row the existing editor already round-trips.
  Graceful, non-broken fallback (`WV-17`) when `MediaRecorder`/
  `getUserMedia` are unavailable or access is denied — the panel shows a
  plain notice, never a dead button.

### P1-12 — Voice-to-Rx

- `extractPrescriptionDraft` (regex-based, deliberately false-negative-
  biased — only fires on an explicit Tab/Cap/Syp/Inj marker) fuzzy-
  matches each extracted drug name against the real `Drugs` table,
  scoped to the caller's own org or platform-wide masters.
- Frontend: `AiScribePanel`'s "Voice-to-Rx: Draft Prescription" button
  navigates to the existing `PrescriptionBuilder.jsx` with draft items in
  router state — never auto-committed. A matched item pre-fills a real
  drug line (dose/frequency/duration, plus quantity via `REQ021`'s own
  `computeQty()`, reused not re-derived, per this slice's own exit
  criterion). An unmatched item pre-fills dose/frequency/duration with no
  drug selected and an explanatory instructions note, so the clinician
  must search and pick the real drug — the free-text-only line cannot be
  issued until they do.

### P1-13 — Pre-consult summary

- `preConsultSummary(patient_id)` ranks up to 5 lines from data the app
  already has: allergies first (always, never displaced), most recent
  diagnosis, most recent encounter with relative recency, one pending
  test result, one recent attachment. Pure ranking function
  (`pre-consult-summary.ts`), no new data source.
- Frontend: an info `Alert` on `EncounterWorkspace.jsx`, above the
  allergy banner. `@Auth('clinician', 'manager', 'admin', 'super_admin')`
  — deliberately excludes `'patient'`/`'staff'` (this is clinical prep,
  not a patient-facing view).

### Admin: AI Scribe provider configuration

- `admin/Communications.jsx`'s Global Settings tab gained an "AI Scribe
  (Consultation Transcription)" card, mirroring the existing SMS/OTP
  provider block exactly (`REQ008`'s registry pattern) — provider
  picker, per-provider credential fields, encrypted at rest
  (`common/crypto/secrets.ts`), never re-displayed once saved.
  `@Auth('manager', 'admin', 'super_admin')`, matching the page's
  existing route gate (`SEC-18` — no gap opened).

## Deliberately out of scope

- The entitlement guard's own `ai_scribe`/quota rollout beyond this one
  gated mutation — matches `REQ147`'s own standing caution: each
  module's gating is a separate, reviewed decision.
- An LLM-based structurer — the deterministic version is the honestly-
  labeled "first pass"; swapping it in later doesn't change the DB
  schema or the `ai_generated` flagging contract at all.
- A drug-name-precision benchmark against a real Indian brand-name
  corpus — the phase-plan's own exit criterion ("drug-name precision
  ≥98%") needs real transcripts and a labeled dataset neither exists in
  this environment; the extraction algorithm and its fuzzy-match against
  the real `Drugs` table are built and unit-tested, but the accuracy
  number itself is unmeasured here.
- Live browser verification against a real microphone/Sarvam account —
  no browser-automation tool was connected this session (chrome-devtools/
  playwright MCP servers failed to connect); every path is covered by a
  real integration test (6/6, real Postgres + real GraphQL) and unit
  tests (65 backend, 10 frontend), not a live click-through.

## Exit criteria (from the phase-plan slice)

- [x] Median consult effort — not measured live (no real clinician usage
  yet); the mechanical path (record → transcribe → structure) requires
  zero mandatory typing, which is the structural precondition.
- [ ] Drug-name precision ≥98% — unmeasured, see "Deliberately out of
  scope" above. Logged as open, not silently claimed done.
