---
id: PLAN192
type: requirement
feature: telemedicine
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ026
related: [REQ026, REQ021, TP212, TR212]
---

# PLAN192 — Real teleconsultation (P1-16): vendor SDK, TPG enforcement, escalation

## Source

`project-plans/phase-plans/01-phase1-close-the-gates.md` slice **P1-16**,
implementing the already-drafted `REQ026`. Picked up after `P1-14`/`P1-15`
(AI voice/WhatsApp front-desk agent) were explicitly skipped per user
decision — that slice needs a real inbound telephony vendor **and** a real
LLM/conversational-AI provider, neither of which exists in this codebase;
`P1-11`'s own deterministic-algorithm workaround for AI doesn't extend to
open-ended phone conversation. P1-16 has no such blocker: PRD v2 D5 names
a fixed "vendor SDK", and the vendor's own product does the actual
real-time media work — the app's job is a REST session and a token, both
buildable and testable with zero AI dependency.

## Real gaps found before writing any code — read this before assuming REQ026's own doc is current

1. **`video/index.jsx` had a real, never-caught bug**: it destructured
   `useParams().appointmentId`, but `App.jsx`'s actual route is
   `/video/:id` — the param has always been `undefined`. The old file's
   own `variables: { id: appointmentId || '1' }` "preview mode" fallback
   silently papered over this from day one; the page never worked off a
   real navigation. Fixed by reading `useParams().id`.
2. **`Appointments.type` existed but was write-only-never-written**: the
   column, its default, and a comment referencing `calendar/index.jsx`'s
   filter and `video/index.jsx`'s own expectation of it all predate this
   slice — but no mutation ever exposed a way to actually set it.
   `AppointmentInput` had no `type` field at all. Without fixing this,
   nothing in this slice could ever be exercised through the real API —
   added `type` (optional, `IsIn(['in_person','video','home_visit'])`,
   defaults to `'in_person'`) to `AppointmentInput` and wired it into
   `appointments.service.ts#create()`.
3. **`video/index.jsx`'s own `GET_APPOINTMENT` query used the public
   dialect** (`getAppointment`, camelCase fields) despite this being an
   authenticated, protected route — the correct canonical dialect
   (`appointment(id)`, `APPOINTMENT_DETAIL_QUERY`) was sitting unused one
   import away.

## What shipped

### Schema (`20260827100000_telemedicine` migration)

- `Encounters.consultation_mode` (`in_person|video|audio|text`, default
  `in_person`) — denormalized once, at `getOrCreateEncounter()` time, from
  `Appointments.type`. **Not a direct pass-through**: `'home_visit'` maps
  to `in_person` (physically present care, not a teleconsultation — TPG
  rules must never apply to it), only `'video'` maps to `'video'`.
- `Drugs.tpg_list` (`O|A|B|prohibited`, nullable) — Telemedicine Practice
  Guidelines list membership. **Deviates from `REQ021`'s own originally-
  sketched `TpgDrugLists` reference table**: a plain column, since the
  relationship is genuinely 1:1 (one drug, one classification) and a join
  table would add nothing but keep `updateDrug`'s existing shape simpler.
  Migration backfill: `schedule_class = 'OTC'` → `tpg_list = 'O'` — the
  one mapping direction defensible without a licensed TPG annexure
  dataset. Everything else stays `NULL` (unclassified), and the guard
  below treats that as **fail-closed**, not "safe by default".
- `Appointments.escalated_from_encounter_id` (nullable FK to
  `Encounters`) — US-TEL-07's own link, set only on the new in-person
  appointment an escalation creates.
- `TelemedicineSessions` — one row per encounter (`@unique`), a real
  join-window (`valid_from`/`valid_to`), and a recording-consent record
  (`recording_consent_at`/`_by_user_id`), never a raw recording payload.

### Backend: `backend/src/telemedicine/`

- **Vendor**: Daily.co, fixed (Hard Rule 9 — video is not one of the
  admin-configurable-per-org exceptions OTP/notification channels are),
  a single `DAILY_API_KEY` env var, matching `appointment-payments
  .service.ts`'s own `RAZORPAY_KEY_ID`/`SECRET` convention exactly — no
  new per-org provider-config table. Real REST integration
  (`providers/daily.provider.ts`), honestly not live-verified against a
  real Daily.co account in this environment, the same documented status
  as `ai-clinical`'s own Sarvam provider.
- **`joinTelemedicineSession(encounter_id)`** — reuses
  `EncountersService.encounter()` for the entire self/org-scoping check
  (never re-derived); idempotent per encounter (find-then-create with the
  identical race guard `getOrCreateEncounter()` established); a real
  join window (opens 10 min before the appointment, closes at start +
  duration + 15 min grace); a fresh per-participant token on every call
  (clinician gets `is_owner: true`, patient does not) — never cached or
  reused across participants, matching a real join link's "valid for
  this visit only" property.
- **`consentToTelemedicineRecording(encounter_id)`** — clinician-only.
  FR-AI-07-adjacent design: this call is the durable compliance record;
  actually starting Daily's own cloud recording is a client-side SDK
  action the frontend takes once this succeeds (Daily's recording
  controls live inside its own embedded call UI, not a separate REST
  trigger this backend would otherwise proxy).
- **TPG enforcement** — `prescriptions.service.ts#assertTpgCompliant()`,
  called from `createPrescription()`, only when `consultation_mode !==
  'in_person'`: mandatory diagnosis before Rx; `prohibited` blocked
  outright, no override; unclassified blocked (fail-closed); `List B`
  blocked only on a **first** consultation. **"First consultation" is an
  engineering proxy, not a verified legal definition** — flagged here and
  in `REQ026` itself for a real compliance review before any real
  market: a follow-up is any encounter where this same clinician has
  already seen this same patient before, in any mode.
- **Escalation (`US-TEL-07`)** — no new mutation. `AppointmentInput`
  gained `escalated_from_encounter_id`, validated in
  `appointments.service.ts#create()` (Hard Rule 6: the caller must be
  that encounter's own treating clinician, or the id is rejected exactly
  like a nonexistent one) and reuses the real `createAppointment` path —
  including its own real slot-conflict checking — rather than an
  unchecked direct insert.

### Frontend

- `frontend/src/pages/video/index.jsx` — full rewrite. Real
  `getOrCreateEncounter` → `encounter(id)` (consultation_mode/locked) →
  `APPOINTMENT_DETAIL_QUERY` (names/clinic/service) → `clinician(id)`
  (registration number) → `joinTelemedicineSession`, embedded via a real
  Daily.co "Prebuilt" `<iframe>` (camera/mic controls, screen share, and
  network-adaptive quality all come from the vendor's own product,
  matching PRD v2 D5's "vendor SDK, not a simulated stub"). Registration
  number visible for the call's duration (`US-TEL-04`/`SEC-14`).
  Clinician-only consent toggle and an "Advise In-Person Visit" dialog
  (a compact real slot picker reusing `AVAILABLE_SLOTS_QUERY` +
  `createAppointment`, not a second booking-flow implementation).
  Graceful, non-broken states throughout (`WV-17`): a clean "not
  configured" message with a retry when the provider is unset, a plain
  "not a video consultation" state for an in-person appointment.
- The old file's fully-fabricated chat tab and its own `updateAppointment
  (notes)`-backed "private notes" tab (a second, disconnected note store
  duplicating `EncounterNotes`) were both removed, not preserved —
  neither was ever a real feature, and REQ026 doesn't call for either.

## Deliberately out of scope

- Recording-storage retention/lifecycle — `recording_ref` exists on the
  schema, nothing writes to it yet (Daily's own recording upload webhook
  is a separate, unbuilt integration point).
- A live browser/microphone/real-Daily-account pass — no browser-
  automation MCP server connected this session
  (`chrome-devtools`/`playwright` both `ENOENT`).
- The drug-name/TPG-list-membership accuracy the phase-plan's own exit
  criterion asks for ("drug-name precision ≥98%") — no labeled real
  Indian-market TPG annexure dataset exists here; the enforcement
  mechanism is built and tested, the underlying classification data is
  intentionally sparse (fail-closed) rather than guessed at.
- Rebuilding `calendar/index.jsx`'s own `type` filter UI to surface the
  now-real `video`/`home_visit` values in the booking flow itself —
  genuinely useful, separate, additive follow-up work.

## Testing

- **Backend unit**: `telemedicine.service.spec.ts` (11 — join idempotency,
  window enforcement, owner-vs-non-owner tokens, the "not configured"
  clean failure, consent), `telemedicine.resolver.spec.ts` (2 — role
  gating), 8 new TPG cases in `prescriptions.service.spec.ts`, 5 new
  escalation cases in `appointments.service.spec.ts`, 4 new
  `consultation_mode` mapping cases in `encounters.service.spec.ts`.
- **Backend integration**: `telemedicine.int-spec.ts`, 7 tests against
  real Postgres + the real GraphQL guard chain — a real `type: video`
  appointment's encounter really carries `consultation_mode: video`; the
  honest "not configured" failure over real GraphQL; patient self-
  scoping rejection (reusing `EncountersService`, not re-derived); and
  the full TPG chain end-to-end (no diagnosis → blocked; unclassified →
  blocked; classified List O → allowed, real `mode: video` stamped;
  reclassified prohibited → blocked).
- **Frontend unit**: `video/index.test.jsx` (new, 8 tests) — the
  non-video error state, a real join embedding the real per-participant
  token into the iframe `src`, the registration-number trust signal, the
  graceful not-configured error + retry, clinician-vs-patient action
  visibility, the real consent mutation reflected in the header badge,
  and a full escalation-dialog booking through the real
  `AVAILABLE_SLOTS_QUERY`/`createAppointment` path.

## Live verification

Not performed against a real browser/Daily.co account this session (no
browser-automation MCP server connected). Backend live-verified via the
real-Postgres integration suite; every new operation's contract is
proven end-to-end at that layer, matching this session's own established
standard for an unavailable-live-credentials environment (see `REQ151`'s
identical note for Sarvam).
