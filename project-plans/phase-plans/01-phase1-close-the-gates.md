---
id: PP-PHASE1
type: phase-plan
feature: project-plans
created: 2026-08-27
updated: 2026-08-27
status: current
parent: PRD-v2-CareOS.md §9
---

# Phase 1 — Close the two gates

**Theme: we already run the OPD day. We cannot currently sell it.**

15 of 22 module rows are solid on both tracks
(`00-implementation-status.md`). Phase 1 is deliberately *not* more breadth. It
closes the two things that gate a sale (ABDM certification, AI documentation),
the three that gate revenue or security, and the platform debt that makes
`FRONTEND_RULES.md` unenforceable.

**Exit criteria for the phase**

- ABDM M1 + M2 certified — the product is sellable to certified facilities
- Median consult recordable in **≤30 s of clinician effort, no mandatory typing**
- Voice agent booking against real availability in a live clinic
- Plan tiers actually enforced (tier revenue unblocked)
- WhatsApp margin protected **before 1 Oct 2026** (dated, external)
- `SEC-2` closed — auth tokens out of `localStorage`
- Frontend CI gates wired so the rules bind

---

## Slice tracker

Work top to bottom. `Track` shows which halves the slice has — **BE+FE** is the
default and a slice is not done until both ship (`README.md` § parallel-track
rule). Update `Status` in the same change that ships the slice.

| # | Slice | Track | Status | Depends on | Why now |
|---|---|---|:--:|---|---|
| **P1-01** | WhatsApp template-category routing + conversation metering | BE+FE | **done** (`REQ144`) | — | **Dated deadline: 1 Oct 2026.** Utility ₹0.115 vs marketing ₹0.863 — 7.5×. Margin work, not plumbing |
| **P1-02** | Auth tokens out of `localStorage` (SEC-2) | BE+FE | **done** (`REQ145`) | — | Open security gap. Cheapest security win available |
| **P1-03** | Frontend CI gates: prettier, size-limit, axe-core, secret scanning | FE | **done** (`REQ146`) | — | Until these run, most of `FRONTEND_RULES.md` is advisory |
| **P1-04** | Entitlement guard (plan limits enforced) | BE+FE | **done** (`REQ147`) | — | Tiers are unmonetisable without it. Build the guard integration as its own reviewed step (`CLAUDE.md`'s standing caution on `REQ032`) |
| **P1-05** | Server-side slot hold + booking idempotency key (BOOK-2, BOOK-3) | BE+FE | **done** (`REQ148`) | — | Double bookings. The rules doc calls this the fastest way to destroy clinic trust |
| **P1-06** | Review submission + request loop | BE+FE | **done** (`REQ149`) | P1-01 | Reputation flywheel has no first step. Flagged 2026-08-22, still open |
| **P1-07** | i18n framework + English/Hindi extraction | FE | **done** (`REQ150`) | P1-03 | Cost grows with every commit. `FRONTEND_RULES` §20.1 |
| **P1-08** | ABDM M1 — ABHA create/verify, patient discovery, QR at reception | BE+FE | **blocked** — needs real NHA sandbox credentials + literal government certification, unverifiable in this environment. Skipped per explicit user decision 2026-08-27, not silently dropped | — | **Gate.** Parallel workstream, own owner, starts day 1 |
| **P1-09** | FHIR R4 projection of clinical resources | BE | **blocked** (depends on P1-08) | P1-08 | Required output format for M2. BE-only: no user surface |
| **P1-10** | ABDM M2 (HIP) — care-context linking, consent-gated sharing | BE+FE | **blocked** (depends on P1-08/09) | P1-08, P1-09 | **Gate** |
| **P1-11** | Ambient AI scribe → structured notes/diagnoses/vitals | BE+FE | **done** (`REQ151`) | — | Table stakes. Highest leverage in the whole plan |
| **P1-12** | Voice-to-Rx against the real drug master | BE+FE | **done** (`REQ151`) | P1-11 | Reuses `REQ021` auto-quantity arithmetic |
| **P1-13** | Pre-consult AI summary (patient in 5 bullets) | BE+FE | **done** (`REQ151`) | P1-11 | Small; `patientTimeline` already built |
| **P1-14** | AI voice front-desk agent (inbound booking/reschedule/status) | BE+FE | **blocked** — needs a real inbound telephony vendor (Twilio Voice/Exotel) *and* a real LLM/conversational-AI provider, neither of which exists in this codebase; P1-11's deterministic-algorithm workaround doesn't extend to open-ended phone conversation. Skipped per explicit user decision 2026-08-27, not silently dropped | P1-05 | Needs the slot hold to be safe |
| **P1-15** | WhatsApp AI agent (same brain, chat channel) | BE+FE | **blocked** (depends on P1-14) | P1-14, P1-01 | Reuses `REQ025` dispatch |
| **P1-16** | Real telemedicine (WebRTC/vendor) + TPG drug list | BE+FE | **done** (`REQ026`) | — | Replaces the simulated stub. A stub in a demo is worse than an honest gap |
| **P1-17** | No-show risk score → deposit / reminder / overbook policy | BE+FE | **done** (`REQ152`) | P1-01 | All three levers already shipped; this joins them |
| **P1-18** | Observability — traces, error tracking, SLO dashboards | BE+FE | **done** (`REQ153`) | — | Cannot currently answer "was it down" |

**Sequencing note.** P1-08/09/10 (ABDM) is a *parallel workstream with its own
owner*, not a queue position. It starts on day 1 and runs alongside everything
else, because certification is externally gated and cannot be compressed by
adding engineers late. Everything else runs roughly in tracker order.

---

## Slice detail

Each slice below states both tracks explicitly. Read the slice before planning
it, then still read the real code (`README.md` step 4) — several batch-13 slices
turned out already-closed.

### P1-01 — WhatsApp template-category routing + conversation metering

**Why now:** from **1 Oct 2026** utility/service messages inside the 24-hour
service window become chargeable at ₹0.115 (free today). Marketing is ₹0.8631 —
**7.5× utility**. A reminder mis-classified as marketing costs 7.5× what it
should, at volume, silently.

- **BE** — pin a template category (`utility` | `marketing` | `authentication`)
  per notification event type in the dispatch layer; **refuse** to send a
  reminder/confirmation/receipt as `marketing`. Per-tenant conversation counters
  with a period window, exposed to the plan engine (P1-04 consumes this).
  Extend `NotificationSendLog` with category + billable flag.
- **FE** — surface live conversation spend per tenant on the org settings
  → Communications tab: count by category, cost to date, cap remaining. Manager
  surface (desktop-dense tier). Five states; `DATA-9` invalidation after any cap
  change.
- **Exit:** a reminder cannot be sent as marketing even deliberately; a manager
  can see spend before the October change lands.
- **Shipped 2026-08-27** (`REQ144`/`PLAN184`/`TP204`/`TR204`,
  `context/notifications-2026-08-27-req144/manifest.md`). Real gap found
  while scoping, not fixed here: no frontend UI configures the org's
  WhatsApp provider credentials at all (`REQ048` registered
  `gupshup_whatsapp` in the backend registry; only SMS has a config card
  on `admin/Communications.jsx`) — logged in `REQ144`'s own doc, a
  candidate for its own future slice.

### P1-02 — Auth tokens out of `localStorage` (SEC-2)

- **BE** — issue short-lived access tokens with a refresh path; set
  httpOnly + Secure + SameSite cookies for the web surface. Keep the Bearer
  path working for the REST document endpoints (`documents.controller.ts`
  authenticates its own bearer) or migrate those too — decide explicitly.
- **FE** — remove `localStorage.getItem('medibook_token')` from
  `AuthContext.jsx` and the `documents.js` download helper. Silent refresh on
  401. **`DATA-11`:** logout must clear everything — verify by logging in as a
  second user and confirming no leak.
- **Watch:** `AuthContext.jsx` has a known login-time caching defect
  (`user.patient.id` and `user.clinician` are permanently undefined after a
  fresh login because `LOGIN_MUTATION` selects neither and the fuller `ME_QUERY`
  then never runs). This slice touches exactly that code — fix it here rather
  than adding a third local workaround.
- **Exit:** no auth token in web storage; the `AuthContext` caching defect closed.

### P1-03 — Frontend CI gates

- **FE only.** Wire: `prettier --check` (CI-3), `size-limit` with the PERF-1…4
  budgets (CI-5), `axe-core` in the unit suite (CI-7), secret scanning (CI-11),
  dependency size check (CI-12).
- **Set budgets to today's measured reality first, then ratchet down** — the
  same mechanism the 1,906-warning lint ratchet already uses successfully. A
  budget set to the aspiration fails on day one and gets disabled.
- **Exit:** every gate in `FRONTEND_RULES.md` §18 marked ⛔ is either green or
  has a dated waiver in §22.

### P1-04 — Entitlement guard

- **BE** — a guard consulted on feature-gated resolvers, resolving the caller's
  org → active `PlanVersion` → entitlement set, Redis-cached per tenant with
  explicit invalidation on plan change. **Heed `CLAUDE.md`'s standing caution:**
  do not start with the guard. Start with the entitlement data model, ship the
  read path, then integrate into the shared `APP_GUARD` chain as its own
  reviewed step. Getting this wrong over- or under-gates every module at once.
- **FE** — upgrade prompts where a gate blocks an action (never a dead button —
  `UI-11`); usage-vs-quota display on the plan/billing surface; `SURF-20`
  (absent, not disabled) for entitlements the org does not have.
- **Exit:** a tier limit actually blocks; a blocked user is told why and how to upgrade.

### P1-05 — Server-side slot hold + idempotency

- **BE** — hold a slot on selection with a TTL, released on expiry/cancel;
  reject a booking whose hold expired with a distinct, catchable error. Accept a
  client-generated idempotency key on every booking mutation and make a repeat
  key a no-op returning the original appointment. Must interact correctly with
  the existing no-overlap EXCLUDE constraint and session/token capacity logic.
- **FE** — visible countdown ("Slot held for 9:45" — `BOOK-2`); on expiry return
  to the picker with other choices intact; generate and persist the idempotency
  key across an app kill (`BOOK-18` resumability); disable submit + loading state
  on first tap (`BOOK-4`).
- **Exit:** two browsers cannot book the same slot; a double-tap cannot create
  two appointments.

### P1-06 — Review submission + request loop

- **BE** — a creation mutation (`ReviewsService` currently has **no creation
  path at all** — 1 query, 2 mutations, none create). Post-visit review request
  dispatched via P1-01's channel, honouring quiet hours and frequency caps.
  ⚖️ **`SEC-13`:** patient reviews for named doctors carry advertising-regulation
  risk in India — get sign-off before shipping publicly.
- **FE** — submission form (patient surface, mobile-first tier); rating on the
  public doctor profile and booking page.
- **Exit:** a patient can leave a review and it appears on the profile.

### P1-07 — i18n framework + English/Hindi

- **FE only** (backend strings are not user-facing here).
- Introduce the i18n layer, the ESLint rule flagging JSX string literals
  (`I18N-1`), lazy per-language bundles (`I18N-8`), pseudo-locale +40% length
  test (`I18N-4`), and translation-coverage CI (`CI-10`).
- **Extract incrementally, gate immediately.** Turning the lint rule on for new
  code from day one is what stops the debt growing; extracting 93 existing pages
  is its own ratchet.
- **Exit:** the rule is on, new strings cannot be hardcoded, patient surface
  ships English + Hindi.

### P1-08 / P1-09 / P1-10 — ABDM M1, FHIR R4, M2

**Own owner, parallel, starts day 1.** Certification is external and gated;
it cannot be compressed late.

- **P1-08 BE** — ABHA create/verify, patient discovery; HFR facility + HPR
  professional registry entries; consent artefact storage with revocation.
  **FE** — ABHA field on the patient record, and a **QR scan-and-share path at
  reception** (Eka Care ships this; registration needs a scan path, not just a
  form). Front-desk surface, keyboard-first (`SURF-6`).
- **P1-09 BE only** (no user surface) — FHIR R4 projection of
  `Encounters`/`Prescriptions`/`Diagnoses`/`TestResults`. **Assess the delta
  first:** `REQ020`'s note schema was not designed against FHIR. Also assess
  EHR Standards 2016 conformance — it is named in the certification requirement
  and has never been checked against this schema.
- **P1-10 BE** — HIP: care-context linking, consent-gated record sharing.
  **FE** — consent status and linked-record visibility on the patient record;
  ⚖️ `SEC-15` — follow ABDM's UI and branding requirements exactly.
- **Exit:** M1 + M2 certified; certification status published per milestone.

### P1-11 / P1-12 / P1-13 — AI clinical

**The highest-leverage work in this plan**, because it is a new input path into
schemas that already exist and are already tested.

- **P1-11 BE** — audio capture with explicit logged consent (`FR-AI-01`);
  transcription (buy, don't build — Sarvam or equivalent Indian provider, per
  PRD v2 D1); structure the transcript into existing `EncounterNotes` sections,
  never a free-text blob (`FR-AI-03`); extract discrete `Vitals`; per-tenant AI
  metering (`FR-AI-11`); **AI must never write to a signed encounter** — the
  existing DB trigger must hold (`FR-AI-13`); audio not persisted beyond
  transcription unless the org opts in (`FR-AI-07`, DPDP).
- **P1-11 FE** — record/stop in `EncounterWorkspace` (tablet-first tier);
  **every AI-derived field visibly flagged, diff-able and editable before
  sign-off** (`FR-AI-06`) — sign-off stays a human act; graceful fallback to
  the existing template path when transcription fails (`WV-17` spirit: never a
  broken button).
- **P1-12** — voice-to-Rx: extract items against the real drug master resolving
  Indian brand names, reusing `REQ021`'s auto-quantity arithmetic. FE shows
  extracted items as editable rows, never auto-committed.
- **P1-13** — pre-consult summary: condense `patientTimeline` to ≤5 bullets.
- **Exit:** median consult ≤30 s clinician effort, no mandatory typing; drug-name
  precision ≥98% gate before any market goes live.

**Shipped 2026-08-27** (`REQ151`/`PLAN191`/`TP211`/`TR211`, new feature slug
`ai-clinical`) — all three BE+FE tracks. Real Sarvam-provider transcription
(buy-not-build), deterministic (not LLM) structuring/vitals-extraction as an
honestly-labeled swappable first pass, `FR-AI-13` satisfied via the existing
`REQ020` Postgres lock trigger (inherited, not re-derived), per-tenant
metering gated behind `REQ147`'s `EntitlementGuard`. Voice-to-Rx imports
draft items into the existing `PrescriptionBuilder.jsx` via router state,
reusing `REQ021`'s `computeQty()` verbatim; an unmatched drug stays
un-issuable until the clinician picks a real one. Pre-consult summary is a
pure ranking function over already-real data. **Not done**: the drug-name
precision ≥98% exit gate (no labeled Indian-brand-name transcript corpus
exists in this environment — logged open in `REQ151`, not claimed) and a
live browser/microphone pass (no browser-automation MCP server connected
this session). See `context/ai-clinical-2026-08-27-req151/manifest.md` for
the full account, including 6 real bugs found (two in this slice's own
integration test, one a stale-Prisma-Client environment gap pre-dating this
slice, two jsdom/MUI-testing artifacts).

### P1-14 / P1-15 — AI front desk

- **P1-14 BE** — inbound voice agent identifying the caller against `Patients`,
  booking/rescheduling/cancelling against **real** `availableSlots` (hence the
  P1-05 dependency — an agent booking without a hold is worse than a human
  doing it). Urgency detection with human escalation (`FR-AGENT-05`); hard
  refusal on clinical advice (`FR-AGENT-06`); every action audited and
  reversible (`FR-AGENT-07`); per-minute metering (`FR-AGENT-08`); **never drop
  a call** (`FR-AGENT-12`).
- **P1-14 FE** — agent transcript and action log on the front-desk surface so
  staff can see and undo what the agent did; escalation queue.
- **P1-15** — same brain on WhatsApp via the existing dispatch layer.
- **Exit:** a real call books a real appointment; staff can audit and reverse it.

### P1-16 — Real telemedicine

- **BE** — session records linked to the appointment; ⚖️ consent capture;
  TPG drug-list enforcement on prescriptions issued in a video consult.
- **FE** — replace the simulated WebRTC in `video/index.jsx` (491 lines) with a
  real vendor SDK (PRD v2 D5). ⚖️ `SEC-14`: patient identity confirmation,
  doctor identity + registration display, compliant Rx format. Do not ship
  without a compliance review.
- **Exit:** two real devices complete a consult; a prescription issued in it is
  TPG-compliant.

**Shipped 2026-08-27** (`REQ026`/`PLAN192`/`TP212`/`TR212`) — both tracks.
Daily.co as the fixed vendor SDK (a single env-var credential, matching
Razorpay's own convention — video is not one of Hard Rule 9's admin-
configurable exceptions); `Encounters.consultation_mode` denormalized
from a newly write-enabled `Appointments.type` (found and closed a real
gap: the column and its own comment predated this slice, but no mutation
ever let a caller set it); `REQ021`'s own `US-RX-06` TPG guard finally
built (prohibited/unclassified fail-closed, List B blocked on a first
consult only); "advise in-person visit" reuses the real
`createAppointment` path, never an unchecked direct insert. **Two real,
previously-shipped bugs found and fixed in the old `video/index.jsx`**:
its `useParams()` destructured the wrong key against the real route
(`/video/:id`, not `:appointmentId`) — the page never worked off a real
navigation, silently masked by its own `|| '1'` "preview mode" fallback
since the day it shipped — and it queried the public/patient-self-serve
GraphQL dialect on an authenticated route instead of the canonical one
already available. **Not done**: recording-storage retention (schema
exists, no pipeline), a live browser/microphone/real-vendor-account pass
(no browser-automation MCP server connected this session), and the
drug-name/TPG-list accuracy the exit criterion names (no labeled real
corpus in this environment — logged open, not claimed). See
`context/telemedicine-2026-08-27-req026/manifest.md` for the full
account.

### P1-17 — No-show risk score

- **BE** — score per appointment from history (prior no-shows, lead time,
  channel, service). Drive: whether prepayment is required, reminder intensity,
  and session overbook allowance. All three levers already exist — this joins them.
- **FE** — risk indicator on the front-desk appointment list (`A11Y-3`: not
  colour alone); explain the deposit requirement to the patient at booking
  (`BOOK-14` spirit — never a surprise).
- **Exit:** a high-risk booking demands prepayment and says why.

**Shipped 2026-08-27** (`REQ152`/`PLAN193`/`TP213`/`TR213`) — both tracks.
Two research forks investigated "all three levers already exist" before
any code was written and found it only partly true: prepayment (real,
joined — the flat `no_show_count` threshold compare became one input
into a real `computeNoShowRisk()` score); reminder intensity (**not
real** — `appointment_reminder` was a fully registered notification
event type nothing ever dispatched, per the codebase's own "needs a
scheduled job, not an event hook" comment; built from scratch as
`AppointmentReminderSweepService`, mirroring `NoShowSweepService`'s own
shape); overbook allowance (real but static — **deliberately left
that way**, a considered scheduling-safety scope cut, not an oversight).
**Two real bugs found**: the risk function's own first-draft weighting
would have silently broken REQ052's pre-existing "threshold reached ==
forced prepayment" guarantee for a same-day booking, caught by that
exact pre-existing regression test before it shipped; and a real,
separate, pre-existing gap — the internal booking wizard
(`BookingStep5Confirm.jsx`) showed "Booked! 🎉" unconditionally
regardless of the real returned status, so a booking already landing
`awaiting_payment` under the *existing* REQ052 mechanism was always
shown as confirmed, with no frontend surface anywhere handling that
status before this fix. See
`context/appointments-2026-08-27-req152/manifest.md` for the full
account.

### P1-18 — Observability

- **BE** — OpenTelemetry traces, error tracking, SLO dashboards, uptime evidence.
- **FE** — client error reporting with **PII/PHI scrubbing** (`SEC-5`: health
  data must never reach a third-party tool); Web Vitals reporting feeding PERF-5.
- **Exit:** "was it down" is answerable with data, and no PHI is in the answer.

**Shipped 2026-08-27** (`REQ153`/`PLAN194`/`TP214`/`TR214`) — both
tracks. Entirely greenfield: no health endpoint, error tracking,
tracing, or RUM existed anywhere in the codebase before this slice. A
hand-rolled `/health` (not `@nestjs/terminus` — an unused peer-dep
surface for two checks), `@sentry/node`/`@sentry/react` with an
**allowlist, not blocklist** scrub (rebuilds each event from scratch
keeping only error type + stack trace, discarding message/request/user/
extra/contexts/breadcrumbs unconditionally — the only design that
satisfies SEC-5's hard "never" language against a future error message
that happens to interpolate PHI), a real `NodeSDK` OpenTelemetry
bootstrap gated on `OTEL_ENABLED`, and `web-vitals` reporting to a new
`POST /observability/web-vitals` with a route *pattern* only. Frontend
Sentry is loaded via a **dynamic import**, never static — the initial
bundle sits at 344.7/350 KB, almost no headroom against the
`size-limit` gate, and the SDK is only needed in the rare case an error
boundary fires.

**A self-caught near-miss before shipping**: the GraphQL `formatError`
hook's first draft reported *every* error to Sentry, including routine
`BadRequestException`/`NotFoundException` business rejections — would
have exhausted a real quota instantly and buried genuine incidents in
noise. Fixed by gating on Apollo's own `INTERNAL_SERVER_ERROR`
classification, which a recognized `HttpException` never carries.

**Live-verified, not just unit-tested**: `OTEL_ENABLED=true` on a real
container recreate produced a real exported span (`graphql.parseSchema`,
correct `service.name`, a real `traceId`, a real duration) via the
console exporter, confirming the first-line-import wiring (`tracing.ts`
imported before even `'reflect-metadata'` in `main.ts`) correctly beats
the require-order race auto-instrumentation depends on — the exact
failure mode the file's own header comment warns is otherwise silent
(SDK reports a clean start, zero spans ever created). Reverted to the
default off state afterward; `/health` and the Web Vitals endpoint were
also both live-curled successfully.

**A previously-undocumented Docker gotcha found this slice**: unlike a
plain `docker restart` (which only needs a Prisma-Client regenerate if
`schema.prisma` changed), a container **recreate** (`docker compose up
-d <service>`, needed here to pick up new `SENTRY_DSN`/`OTEL_ENABLED`
env vars) resets the anonymous `/app/node_modules` volume back to the
image's build-time state — silently discarding every package installed
via `docker exec ... npm install` in any earlier session, not just the
regenerated client. Hit live (632 stale-type errors, not the usual
~24), fixed with a full `npm install && prisma generate && restart`.
Worth folding into `CLAUDE.md`'s existing Docker-recovery documentation.

**One genuine, previously-undocumented frontend test-environment
constraint found while writing tests, not a code bug**: this repo's
shared `babel.config.cjs` statically replaces every `import.meta`
occurrence with a fresh, disconnected object literal at Jest transform
time (already noted in passing in `documents.test.js`'s own comment),
which makes a test that mutates `import.meta.env.VITE_SENTRY_DSN` at
runtime silently ineffective — the source module never observes the
write. This is the first slice to actually hit it while trying to drive
a *configured* vendor code path rather than only relying on the
always-empty fallback. Resolved by exporting the pure `scrubEvent`
redaction function for direct unit coverage instead of trying to drive
it through the full DSN-gated `reportError` flow. See
`context/platform-nfr-2026-08-27-req153/manifest.md` for the full
account.

---

## Deliberately not in Phase 1

| Item | Why not | Where |
|---|---|---|
| Speciality packs (dental, derma, physio, IVF, ayurveda) | Primary ARPA lever, but needs the AI + ABDM base first | Phase 3 |
| NHCX / ABDM M4 | Depends on M1–M3 certification landing | Phase 3 |
| Agentic claim lifecycle, denial analytics | Depends on AI coding assist | Phase 2 |
| AI migration importer | High value (switching blocker) but not a gate | Phase 2 |
| Offline-first PWA, native apps, Capacitor shell | Large; unblocks the 18 🔜 `WV-*` rules | Phase 2 / 3 |
| `UI-14` file-size sweep, `UI-2` colour sweep | Ratcheted debt — new code complies; sweeps are their own slices | continuous |
| `ARCH-1` feature-folder reorganisation of 170 files | Documented deviation, not planned wholesale | — |
| `clinical_records` / `messages` retention purge | Blocked on a legal question and open-q #18 | blocked |
