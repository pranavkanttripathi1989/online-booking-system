---
id: TP212
type: requirement
feature: telemedicine
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ026
related: [REQ026, PLAN192, TR212]
---

# TP212 — Test plan: real teleconsultation, TPG enforcement, escalation

Well-scoped against already-proven patterns (the entitlement-gated
provider registry from `REQ151`/`REQ008`, the self-scoping reuse pattern
from `ai-clinical`/`documents`, the real-slot-picker + `createAppointment`
reuse from booking). Suggestion stage skipped per `CLAUDE.md`'s own
conditional rule; drafted directly.

## Backend unit

| # | Case | Module |
|---|---|---|
| 1–4 | `Appointments.type` → `Encounters.consultation_mode` mapping: video→video, home_visit→in_person, in_person→in_person, omitted→in_person | `encounters.service.spec.ts` |
| 5–15 | Session idempotency (no double room-create), join-window open/closed rejection, owner vs non-owner token, "not configured" clean failure, access-control reuse (not re-derived), consent recording | `telemedicine.service.spec.ts` |
| 16–17 | Role gating: join reachable by patient+clinician+staff, consent clinician-only | `telemedicine.resolver.spec.ts` |
| 18–25 | TPG guard: prohibited blocked, unclassified blocked (fail-closed), List B blocked on first consult, List B allowed on follow-up, List O/A allowed, missing-diagnosis blocked, in-person never gated, real mode stamped on the created row | `prescriptions.service.spec.ts` |
| 26–30 | Escalation: correct treating clinician links it, wrong clinician rejected, cross-org rejected, nonexistent id rejected, omitted field never queries at all | `appointments.service.spec.ts` |

## Backend integration (real Postgres + real GraphQL guard chain)

| # | Case |
|---|---|
| 1 | A real `type: video` appointment's encounter carries `consultation_mode: video` end-to-end |
| 2 | `joinTelemedicineSession` fails cleanly, not a raw error, with no video provider configured |
| 3 | A different patient calling on this encounter is rejected via `EncountersService`'s own self-scoping |
| 4 | No diagnosis recorded → prescription blocked in tele mode |
| 5 | Diagnosis recorded, drug still unclassified → blocked, fail-closed |
| 6 | Drug classified List O → prescription succeeds, real `mode: video` stamped |
| 7 | Drug reclassified prohibited → blocked outright |

## Frontend unit

| # | Case |
|---|---|
| 1 | Non-video appointment shows an honest error state, no join attempt |
| 2 | A real join embeds the real per-participant token into the iframe `src` |
| 3 | Clinician registration number visible as a trust signal (US-TEL-04) |
| 4 | Graceful "not configured" error with a working retry, not a crash |
| 5 | Clinician-only actions (consent, escalate) hidden from a patient caller |
| 6 | Recording consent: real mutation, reflected in the header badge, toggle disables after |
| 7 | Escalation dialog books a real slot via the real `AVAILABLE_SLOTS_QUERY`/`createAppointment` path |

## Out of scope for this test plan

- A live-browser/microphone/real-Daily-account pass (no browser-
  automation tool connected this session).
- Drug-name/TPG-list accuracy benchmarking (no labeled real corpus).
