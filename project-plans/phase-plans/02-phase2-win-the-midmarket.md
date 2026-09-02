---
id: PP-PHASE2
type: phase-plan
feature: project-plans
created: 2026-08-27
updated: 2026-08-30
status: in-progress
parent: PRD-v2-CareOS.md §9
---

# Phase 2 — Win the mid-market

**Theme: be the obvious choice for a 2–15 branch chain.**

Phase 1 made the product sellable. Phase 2 makes it *preferred* — by joining AI
to the money (nobody in the Indian mid-market has), by attacking the #1
switching blocker, and by closing the depth gaps a chain actually evaluates.

**Do not start Phase 2 until Phase 1's exit criteria are met.** In particular:
ABDM M1+M2 certified, and the AI scribe hitting its ≤30 s / ≥98 % drug-precision
gates. Phase 2's claim work depends on both.

**Exit criteria**

- ABDM M3 (HIU) certified — records flow both directions
- A coded claim goes out and a denial comes back with a drafted appeal
- A clinic migrates off Practo/MocDoc/HealthPlix in ≤2 business days, self-serve
- Doctor revenue-share runs a real monthly payout
- Patient surface ships in Hindi + 3 regional languages
- Offline: a patient standing outside a clinic with no signal can see their booking

---

## Slice tracker

| # | Slice | Track | Status | Depends on | Notes |
|---|---|---|:--:|---|---|
| **P2-01** | ABDM M3 (HIU) — consent-based fetch of external records | BE+FE | not started | P1-10 | Completes the interop story |
| **P2-02** | AI coding assist — ICD-10 + procedure codes from the note | BE+FE | **done** (`REQ154`) | P1-11 | `REQ020` P1 named ICD-10; now AI-driven |
| **P2-03** | Agentic claim lifecycle — auto-code → submit → track → draft appeal | BE+FE | **done** (`REQ155`) | P2-02 | The differentiator. Claim state machine + evidence attach already built |
| **P2-04** | Denial analytics + payer scorecards | BE+FE | **done** (`REQ156`) | P2-03 | `Claims` data model already there |
| **P2-05** | AI-assisted migration importer (Practo / MocDoc / HealthPlix mappers) | BE+FE | **done** (`REQ157`) | P1-11 | #1 switching blocker. AI *structures* imported free-text notes — rivals can't |
| **P2-06** | Doctor revenue-share & payouts engine | BE+FE | **done** (`REQ158`) | — | Named chain-ICP need; branch overrides already built |
| **P2-07** | Drug interaction + allergy hard-stops | BE+FE | **done, scoped** (`REQ159`) | P1-12 | Allergy-only — drug-drug interaction deferred, see the slice's own doc |
| **P2-08** | Regional-language Rx print (i18n for documents) | BE+FE | **done** (`REQ160`) | P1-07 | English/Hindi shipped; route/instructions translation and other languages (`P2-09`) deferred, see `REQ160`'s own account |
| **P2-09** | i18n: 3 more regional languages | FE | **done, expanded to 6** (`REQ161`) | P1-07 | User selected both offered language sets — Tamil, Bengali, Marathi, Telugu, Kannada, Gujarati all shipped, not just 3. `PrescriptionBuilder.jsx`'s print-language picker stays en/hi only (backend font support, `REQ160`'s scope) |
| **P2-10** | Recurring/series appointments + treatment-plan scheduling | BE+FE | **done** (`REQ163`) | — | New `AppointmentSeries` domain, eagerly materialized via reused `AppointmentsService.create()` per occurrence; `pages/appointments/series/{new,detail}.jsx`. Patient-portal access and a calendar-popover badge deliberately deferred, see `REQ163`'s own account |
| **P2-11** | Immunisation schedule tracker | BE+FE | **done** (`REQ167`) | — | New `ImmunizationScheduleItems`/`ImmunizationRecords` domain, mirroring `TestResults`' own patient-direct-fact shape; a guardian-fallback reminder sweep (a plain copy of the appointment-reminder pattern would have silently never notified a child patient's own account) |
| **P2-12** | Chronic-disease registries (diabetes/HTN) + recall | BE+FE | **done** (`REQ168`) | P2-11 | New `ChronicRegistryEnrollments` domain (`diabetes`/`hypertension` fixed pair); suggestions off ICD-10-prefix-matched diagnoses, never auto-enrolled; recall sweep notifies clinic staff, not the patient (the reverse of `REQ167`'s own patient-facing reminder) |
| **P2-13** | ~~Investigation orders +~~ results inbox (lab loop) | BE+FE | **done** (`REQ184`) | — | `REQ020` P1. **Scope corrected again 2026-09-03** — verifying the 2026-08-30 correction against the real code found something more fundamental: no mutation anywhere could ever move a `TestResults` row past `pending` or attach a value (`orderTest`/`orderInvestigation` only ever create). Shipped `recordTestResult` (the real gap) and extended the existing `test-results/index.jsx` list with status-conditional actions + click-to-filter KPIs rather than a separate inbox page — no Kanban/worklist pattern exists anywhere in this app; `manager/claims/index.jsx` is the real precedent for this shape. See `REQ184`'s own account |
| **P2-14** | Digital intake → auto-populate EMR | BE only (no user-facing surface — see `REQ185`) | **done** (`REQ185`) | — | `intake-fields` built; the EMR write-through wasn't. Shipped: `getOrCreateEncounter()` now seeds a new encounter's `complaints` note from the appointment's `reason`/`intake_responses`, labels resolved via the pre-existing `IntakeFieldsService#forBooking()`, inside a new callback-style `$transaction`. New `escapeHtml()` utility closes a stored-XSS gap on the first-ever write of raw patient text into an HTML column. Zero frontend change needed — confirmed live, not assumed: `EncounterWorkspace.jsx`'s existing generic `RichTextEditor` already renders the seeded note. Allergy-banner auto-population deliberately deferred (coding a diagnosis from free text is a patient-safety risk). See `REQ185`'s own account |
| **P2-15** | Kiosk check-in mode | FE | not started | — | QR flow exists (`REQ107`); kiosk UI doesn't |
| **P2-16** | Self-serve reschedule link in every reminder | BE+FE | not started | P1-01 | Deflects front-desk calls cheaply |
| **P2-17** | GST e-invoicing (IRP) | BE+FE | not started | — | Statutory for registered providers |
| **P2-18** | Tally / Zoho Books sync | BE+FE | not started | P2-17 | PRD v1 §6.4: integrate, don't build accounting |
| **P2-19** | Offline-first PWA (DATA-8) | FE | not started | P1-03 | Cached upcoming bookings + address + booking ID |
| **P2-20** | `UI-2` colour sweep, round 2 → ratchet down | FE | not started | — | Unblocks per-tenant branding + dark mode |
| **P2-21** | `UI-14` file-size sweep — the 10 largest files | FE | not started | — | Start with `settings/index.jsx` (1,641 lines) |

---

## Slice detail — the three that carry the phase

### P2-03 — Agentic claim lifecycle *(the differentiator)*

Every competitor's AI stops at the note. This continues into the money, and the
2026 platform trend is exactly this (agentic RCM).

- **BE** — consume P2-02's codes; auto-populate and submit the claim; poll/track
  status; on denial, classify the reason and **draft an appeal** with the
  evidence already auto-attached (`REQ137` built the evidence linkage,
  `REQ138` the reimbursement pack). Respect the existing `CLAIM_TRANSITIONS`
  state machine — do not let an agent skip states. Every agent action audited
  and reversible.
- **FE** — claims desk gains an agent column: what the agent did, what it
  proposes, one-click accept/override. **Never auto-submit without a human
  decision point** for the first release — the same discipline `FR-AI-06` applies
  to clinical sign-off.
- ⚖️ Get sign-off before any automated submission to a payer.
- **Exit:** a denial produces a drafted appeal a human approves in one click.

**Shipped 2026-08-27** (`REQ155`/`PLAN196`/`TP216`/`TR216`) — both
tracks. Scoped, before any code was written, against a hard constraint:
no live payer API exists anywhere in this codebase (confirmed again by
grep). "Auto-populate and submit"/"poll/track status" therefore map to
human-reviewed code suggestions at submission time plus the existing,
unchanged manual state machine — not fabricated external connectivity.
The genuinely new agentic surface, needing no external system at all,
is denial classification (`denial-classification.ts`, deterministic
keyword rules, honestly not true NLU) and drafted appeals
(`appeal-draft.ts`, templated from real claim/evidence data). A
rejection auto-drafts a `ClaimAppeals` row inside the existing
`updateClaimStatus` transition; the claims desk reviews, edits, and
approves in one click via a new "Appeal" action — never auto-submitted
anywhere, matching this section's own ⚖️ constraint and this
environment's honest lack of a payer API to submit to. `ClaimAppeals`
itself is the audit trail ("every agent action audited and
reversible") — created unattributed, `approved_by_user_id`/
`approved_at` populated only once a real human approves; a
re-rejection regenerates the draft in place rather than accumulating
stale ones. Full verification: backend 117/117 suites (1885/1885
tests, 29 new), integration 9/9 suites (414/414 tests, confirming the
new migration and no new tenancy-matrix domain needed), frontend 7/7 in
`manager/claims/index.test.jsx` (2 new). See
`context/insurance-claims-2026-08-27-req155/manifest.md` for the full
account, including a real bug class check (none found this slice —
all new tests passed on first implementation, matching the pattern this
codebase's own history calls out when a batch front-loads a prior
slice's lessons).

This is the first of the three slices this document names as "carrying
the phase" (`P2-03`/`P2-05`/`P2-06`) to ship — `P2-05`/`P2-06` remain
their own future slices. `P2-04` (denial analytics + payer scorecards)
depends on this slice and can now proceed.

### P2-05 — AI-assisted migration importer

`FRONTEND_RULES` §1 and PRD v1 §2.3.7 both name data migration as the #1
switching blocker. Rivals win on "free migration, 1-day go-live."

- **BE** — CSV/Excel importer plus per-vendor export mappers. The AI part is the
  wedge: competitor exports contain **unstructured free-text notes**, and the
  scribe pipeline (P1-11) can *structure* them into `EncounterNotes` sections on
  import. A rival's own export becomes better data inside our product than it
  was inside theirs.
- **FE** — upload → column mapping preview → dry-run diff → commit, with a
  clear per-row error report. Never a silent partial import.
- **Exit:** a real Practo export lands as structured patients, appointments and
  encounters in ≤2 business days, self-serve.

**Shipped 2026-08-27** (`REQ157`/`PLAN198`/`TP218`/`TR218`, new feature
slug `data-migration`) — both tracks, with a real scope correction made
before any code was written: this codebase has no verified knowledge
of Practo/MocDoc/HealthPlix's actual export column layouts, so a
"per-vendor mapper" claiming fidelity to any of them would have been
fabricating a capability with no evidence behind it. Built instead as a
generic, deterministic column-mapping suggester (real header-name
matching, honest about being a starting point a human reviews and can
override, not a guaranteed match) — genuinely usable against a real
competitor export the moment one exists to test against. Also scoped
to **patients only** this slice, not the full "patients, appointments
and encounters" the bullet above names — synthesizing valid
`Appointments` rows (which `Encounters` requires) from CSV-only source
data would mean inventing clinics/clinicians/services the file never
specified; logged as a named follow-on, not silently dropped. The AI
wedge itself shipped as scoped: `Patients.medical_notes` (already a
real, existing field) is where a mapped notes/history column lands,
structured via P1-11's own `structureTranscript()` classifier reused
verbatim — a rival's free-text export becomes labeled, sectioned data
inside this product, exactly the framing this slice exists to prove
out, without needing to fabricate the appointment/encounter chain to
do it. A real 4-step wizard (Upload → Map columns → Dry run → Commit)
ships on `manager/imports`, and `commitImport` never trusts an earlier
dry run — both re-validate the same submitted content fresh every
time. Full verification: backend 122/122 suites (1961/1961 tests, 65
new), integration 9/9 suites (414/414 tests — the tenancy matrix's own
gate correctly caught the new domain as unclassified before a proper
`EXEMPT` entry closed it), frontend 5/5 in the wizard's first-ever test
file. See `context/data-migration-2026-08-27-req157/manifest.md` for
the full account, including a real jsdom `File.text()` gap found and
worked around (extending `TR215`'s own `Blob.text()` finding from
earlier this session).

### P2-06 — Doctor revenue-share & payouts

- **BE** — per-clinician, per-branch share rules (visiting consultants have
  different rates at different branches — PRD v1 §2.3.2); monthly computation
  from real `AppointmentPayments`; payout records with an approval step.
- **FE** — manager surface: share rules editor, monthly payout run, per-doctor
  statement export (`SURF-8`: CSV export non-negotiable). `SURF-14`: persistent
  branch scope indicator.
- **Exit:** a real month closes and produces per-doctor statements.

**Shipped 2026-08-27** (`REQ158`/`PLAN199`/`TP219`/`TR219`, new feature
slug `revenue-share`) — both tracks. A real scope correction made before
any code was written: this bullet's own "per-branch" framing assumes a
clinician can have different rates at different branches
simultaneously, but `Clinicians.clinic_id` is a single scalar field, not
a many-to-many relation (confirmed via a full-schema grep — no
clinician↔clinic join table exists). Reinterpreted as a rate-resolution
hierarchy instead, mirroring `resolveServicePrice()`'s own
most-specific-wins cascade (`common/pricing/resolve-price.ts`,
REQ055/REQ100): a clinician-level rule beats a clinic-level rule beats
the org-level default. Two new models (`RevenueShareRules`, `Payouts`);
`computeMonthlyPayouts()` sums succeeded `AppointmentPayments` per
clinician for the given clinic/month and never overwrites an
already-`approved` payout on recomputation (US-REV-03's own invariant).
Frontend ships a Clinic-scoped (`SURF-14`) manager page with a share-
rules editor, a monthly payout run, per-row Approve, and a CSV statement
export (`SURF-8`). Full verification: backend unit 1989/1991 (2
pre-existing, unrelated `queue.service.spec.ts` failures — a midnight-
IST timing edge in a file this slice never touched), integration 9/9
suites / 414/414 tests (a new, honest tenancy-matrix `EXEMPT` entry —
unlike prior exemptions, this domain does have a real id-keyed shape a
matrix case could exercise, deferred to `setup/domain-cases.ts` for a
future slice since that file was concurrently owned by other in-flight
work this session), frontend 4/4 new tests, full frontend suite
279/284 (2 pre-existing flaky suites, neither touched by this slice).
See `context/revenue-share-2026-08-27-req158/manifest.md` for the full
account, including an unrelated live `web-vitals` container issue found
and fixed mid-slice.

This closes out P2-03/P2-05/P2-06, the three slices this document names
as "carrying the phase." Every other unblocked Phase 2 row (`P2-07`
onward) remains not started; `P2-01` stays blocked on `P1-10`.

### P2-07 — Drug interaction + allergy hard-stops (scoped)

**Shipped 2026-08-27, allergy-only** (`REQ159`/`PLAN201`/`TP221`/`TR221`).
Asked the user explicitly which half of this slice's own title to
build: drug-drug interaction checking needs real interaction-pair data
this codebase has none of, and the PRD's own drug-database licensing
question (build vs. license) is unresolved — fabricating it for a
safety-critical hard stop was declined. The allergy half shipped in
full: `assertNoAllergyConflict()` in `prescriptions.service.ts`, called
from `createPrescription()` alongside the existing
`assertTpgCompliant()` (same hard-stop shape, no override), reusing
`EncountersService.patientAllergyBanner()` rather than re-deriving it.
A deterministic, bidirectional substring matcher
(`allergy-check.ts`) — the same "honestly non-exhaustive" ethic as
`column-mapping.ts`/`denial-classification.ts` — catches an allergy
recorded by drug name against the prescribed drug's own name/
composition, with a named limitation (no drug-class-level matching,
e.g. "Penicillin" allergy vs. an Amoxicillin drug) stated plainly rather
than silently claimed as covered. Frontend mirrors the same check
client-side for a live inline warning before submit. Full verification:
backend 126/126 suites / 2011/2011 tests, frontend 6/6 new+existing
`PrescriptionBuilder` tests (2 new). Drug-drug interaction checking
remains a named, explicit follow-on, blocked on the licensing decision
above — see `REQ159`'s own doc.

---

## Deliberately not in Phase 2

| Item | Why | Where |
|---|---|---|
| NHCX / ABDM M4 | Needs M3 landed and certified first | Phase 3 |
| Speciality packs | Highest ARPA, but wants the lab loop + series scheduling underneath | Phase 3 |
| IPD-lite, lab module | Adjacent product surface, not mid-market-defining | Phase 3 |
| Native apps / Capacitor shell | PWA (P2-19) first; measure whether native is still needed | Phase 3 |
| Partner marketplace, reseller portal, UHI | Platform plays; need a stable public API story first | Phase 3 |
| `ARCH-1` wholesale reorganisation | Documented deviation | — |
