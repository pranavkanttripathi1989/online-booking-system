# telemedicine-2026-08-27-req026

| Field | Value |
|---|---|
| Feature | telemedicine |
| Date | 2026-08-27 |
| IDs | REQ026, PLAN192, TP212, TR212 |
| Status | done |
| Phase-plan slice | P1-16 |

## What this bundle covers

Real teleconsultation, implementing the already-drafted `REQ026`: a fixed
vendor SDK (Daily.co, PRD v2 D5), `Encounters.consultation_mode`
denormalized from a newly write-enabled `Appointments.type`,
`REQ021`'s own Telemedicine Practice Guidelines drug-list enforcement
(`US-RX-06`, previously deferred pending exactly this requirement), and
the "advise in-person visit" escalation (`US-TEL-07`) reusing the real
booking path. New backend module `backend/src/telemedicine/`, new
migration `20260827100000_telemedicine`, full rewrite of
`frontend/src/pages/video/index.jsx`.

Picked up after P1-14/P1-15 (AI voice/WhatsApp front-desk agent) were
explicitly skipped per user decision — that slice needs a real inbound
telephony vendor and a real LLM/conversational-AI provider, neither of
which exists in this codebase.

## Links

- Requirement: [REQ026](../../requirements/telemedicine/requirement/REQ026-telemedicine-2026-08-22-webrtc-consultation-and-tpg-compliance.md) (now `done`, originally `draft`)
- Plan: [PLAN192](../../implementation-plans/telemedicine/requirement/PLAN192-telemedicine-2026-08-27-real-teleconsultation-and-tpg-enforcement.md)
- Test plan: [TP212](../../test-plans/telemedicine/requirement/TP212-telemedicine-2026-08-27-real-teleconsultation-and-tpg-enforcement.md)
- Test results: [TR212](../../test-results/telemedicine/requirement/TR212-telemedicine-2026-08-27-real-teleconsultation-and-tpg-enforcement.md)
- Also updated: [REQ021](../../requirements/prescriptions/requirement/REQ021-prescriptions-2026-08-22-rx-builder-print-and-tpg-guardrails.md) (`US-RX-06` closed)

## Real bugs found and fixed this slice

1. `video/index.jsx` read `useParams().appointmentId` against a route
   declared `/video/:id` — always `undefined`, silently masked by an
   `|| '1'` "preview mode" fallback since the page first shipped.
2. `Appointments.type` existed (with a comment naming this exact use
   case) but no mutation ever exposed it — `AppointmentInput` had no
   `type` field at all before this slice.
3. `video/index.jsx` used the public/patient-self-serve GraphQL dialect
   on an authenticated route instead of the already-available canonical
   query.

## Deliberately out of scope

- Recording-storage retention/lifecycle (schema exists, no pipeline).
- A live browser/microphone/real-Daily-account pass — no browser-
  automation MCP server connected this session.
- Drug-name/TPG-list-membership accuracy benchmarking — no labeled real
  corpus in this environment; the enforcement mechanism is built and
  tested, fail-closed on unclassified data by design.
- Rebuilding `calendar/index.jsx`'s own type filter to surface the newly
  real `video`/`home_visit` appointment types in the booking flow.

## Next in the phase-plan tracker

`P1-17` (no-show risk score → deposit/reminder/overbook policy) is the
next unstarted, unblocked slice in
`project-plans/phase-plans/01-phase1-close-the-gates.md`.
