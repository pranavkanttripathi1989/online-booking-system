---
id: TP211
type: requirement
feature: ai-clinical
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ151
related: [REQ151, PLAN191, TR211]
---

# TP211 — Test plan: ambient AI scribe, voice-to-Rx, pre-consult summary

Well-scoped slice against already-proven patterns (provider registry,
entitlement guard, tenant-scoped session model) — per `CLAUDE.md`'s
working loop, the suggestion stage was skipped and this plan drafted
directly.

## Backend unit

| # | Case | Module |
|---|---|---|
| 1–15 | Section-keyword classification (all 5 sections, priority collisions, Hindi/Devanagari sentence splitting), vital-reading regex extraction (BP, pulse, temp, SpO2, weight, height) | `transcript-structuring.spec.ts` |
| 16–23 | Drug-line marker detection (Tab/Cap/Syp/Inj), false-negative bias on non-marked lines, dose/frequency/duration parsing | `prescription-extraction.spec.ts` |
| 24–32 | Allergy-first ranking, recency labels, 5-item cap, pending-test/attachment inclusion | `pre-consult-summary.spec.ts` |
| 33–59 | Consent enforcement, org derivation from the encounter (not the caller), quota check, session self/org-scoping, structuring writes `ai_generated: true`, locked-encounter rejection, provider config save/read (encrypted, never echoed), usage aggregation | `ai-clinical.service.spec.ts` |
| 60–65 | `@RequiresFeature` only on `startTranscriptionSession`; every clinical handler excludes `'patient'`; provider-config mutations manager+ only; the public catalog query is ungated | `ai-clinical.resolver.spec.ts` |

## Backend integration (real Postgres + real GraphQL guard chain)

| # | Case |
|---|---|
| 1 | Refuses a session without explicit consent — no row created |
| 2 | A patient-role caller is rejected by the role gate |
| 3 | Consent given → a real, logged session (org, consent actor, timestamp) |
| 4 | `submitTranscription` with no provider configured fails cleanly, not a raw error |
| 5 | `structureTranscriptSession` writes real `EncounterNotes`/`Vitals` flagged `ai_generated`, reflected in real usage metering |
| 6 | `FR-AI-13` — a signed encounter rejects a structuring write, end-to-end over GraphQL |

## Frontend unit

| # | Case | File |
|---|---|---|
| 1 | Badges an AI-generated note section, leaves a human one unbadged | `EncounterWorkspace.test.jsx` |
| 2 | Badges an AI-generated vital reading | same |
| 3 | Shows the backend-ranked pre-consult summary | same |
| 4 | Hides recording controls with a graceful notice when unsupported | same |
| 5 | Graceful error, not a crash, on denied microphone access | same |
| 6 | Full record → transcribe → structure → Voice-to-Rx flow through the real mutations | same |
| 7 | Pre-fills a matched drug line and shows the import banner | `PrescriptionBuilder.test.jsx` |
| 8 | Leaves an unmatched drug for manual search with an explanatory note | same |
| 9 | The free-text-only line stays un-issuable until a real drug is picked | same |
| 10 | No import banner on a normal, non-AI visit | same |
| 11 | Lists real registered providers | `Communications.test.jsx` |
| 12 | No secret echoed back once a provider is configured | same |
| 13 | Saves provider + credentials via the real mutation | same |

## Out of scope for this test plan

- A live-browser pass with a real microphone (no browser-automation tool
  connected this session).
- A drug-name-precision benchmark against a labeled Indian-brand-name
  transcript corpus (no such corpus exists in this environment).
