---
id: REQ021
type: requirement
feature: prescriptions
created: 2026-08-22
updated: 2026-08-27
status: in-progress
parent: REQ020
related: [REQ020, REQ016, REQ026, REQ022, PLAN057, TP084, TR083, PLAN192, TP212, TR212]
---

## Status (2026-08-27)

**`US-RX-06` (TPG drug-list enforcement) now closed**, alongside `REQ026`
itself (`PLAN192`/`TP212`/`TR212`) — the P1-24-ago note below marking it
"gated behind REQ026's not-yet-built consultation_mode column" is now
stale, kept for its own historical context rather than rewritten. One
real design deviation from this doc's own §"Data model impact": a single
`Drugs.tpg_list` column replaced the originally-sketched separate
`TpgDrugLists` reference table — a 1:1 classification per drug has no
need for a join table, and the simpler column keeps `updateDrug`'s
existing single-row-write shape unchanged. This note's own two other
"still open" items (`US-RX-04`/`US-RX-08`, both actually closed by
`REQ109`/`REQ129` since this note was last touched) were left as
originally written below — see those requirements' own docs for current
state, not this stale mention.

## Status (2026-08-24)

**P0 shipped** (`PLAN057`/`TP084`/`TR083`): drug search with auto-calculated
quantity from frequency × duration (`US-RX-01`), saved favourite drug-sets
(`US-RX-02`), a print view with clinic letterhead/clinician/patient
demographics and the drug table, one rendering path shared by preview and
`window.print()` (`US-RX-03` subset), and repeat-from-history with a
server-side reprint counter that watermarks every view after the first as
"DUPLICATE" (`US-RX-05`). New `backend/src/prescriptions/` module,
`frontend/src/pages/clinician/PrescriptionBuilder.jsx`,
`frontend/src/pages/prescriptions/PrescriptionPrint.jsx`.

**P1 still open**, per this requirement's own phase assignment below — not
silently dropped: WhatsApp/OTP-gated sharing (`US-RX-04`), Telemedicine
Practice Guidelines drug-list enforcement (`US-RX-06`, correctly gated
behind `REQ026`'s not-yet-built `consultation_mode` column — a hard blocker
for that requirement's own GA), regional-language PDF rendering
(`US-RX-07`), digital signature + tamper-evident hash (`US-RX-08`), and the
pharmacy dispense-queue handoff (`US-RX-09`, blocked on `REQ022` not
existing yet). A5/thermal print formats are also deferred with `US-RX-03`'s
remainder. Each gets its own future `PLAN###` when picked up.

**One architectural decision recorded, not guessed at** (see `PLAN057`):
the print view uses a single browser-print rendering path (no server-side
PDF pipeline) — this codebase's only two prior print precedents
(`appointments/detail.jsx`, `finances/index.jsx`) both do the same, and a
real PDF pipeline is a multi-day investment that belongs with the deferred
`US-RX-07`/`08` (which need font embedding and a hash respectively) rather
than this P0 slice.

# Prescription builder, print/share, and Telemedicine Practice Guidelines enforcement

## Source

`PRD-Healthcare-Booking-SaaS-India.md` §9 **M8 — Prescriptions: Creation, Printing & Sharing** (`FR-RX-01`–`FR-RX-14`). Cross-referenced against `REQ020` (this module issues from within an encounter) and `REQ016` (drug master dependency).

## Current state vs. PRD ambition

No prescription domain exists anywhere in the codebase — no `Prescription`/`PrescriptionItem` model, no Rx builder UI, no print layout. This is entirely net-new, and it sits at the centre of the PRD's own stated wedge (§1.3): *"The Rx a clinician signs is the same object the in-house pharmacy dispenses, decrements stock against, and bills with GST."* That closed loop cannot exist until this module, `REQ020` (the encounter it's issued from), and `REQ022` (the pharmacy that consumes it) all exist together — this requirement should not be built in isolation from those two.

Given the module's genuine size (14 FR items spanning drug search, print layout, regional-language rendering, digital signatures, and Telemedicine Practice Guidelines drug-list enforcement), this requirement scopes MVP-critical items (`FR-RX-01`, `02`, `05`, `06`, `08`, `12`) as the primary deliverable, with generic substitution, quantity mapping, regional languages, digital signatures, TPG enforcement, and ABDM linkage sequenced as immediate follow-ons in the same phase — they are P1 in the PRD but tightly coupled to the P0 core and should not drift far behind it.

## Gap classification

- **Net-new, entirely.** No partial credit exists anywhere in the current schema or frontend.

## Phase assignment

PRD Phase: `FR-RX-01`, `02`, `05`, `06`, `08`, `12` are **MVP (P0)**. `FR-RX-03`, `04`, `07`, `09`, `10`, `11`, `13`, `14` are **V1 GA (P1)** — notably `FR-RX-10`/`11` (TPG drug-list enforcement) are P1 but must ship *before* `REQ026` (telemedicine) goes live, since teleconsultation prescribing without List O/A/B enforcement is a direct regulatory violation, not a nice-to-have.

## Dependencies

- **Requires:** `REQ020` (an encounter must exist to issue a prescription from); `REQ016` (drug master — the Rx builder has nothing to search without it).
- **Blocks:** `REQ022` (pharmacy) — the dispense queue is fed by signed prescriptions and cannot be built or tested without this module existing first; `REQ026` (telemedicine) cannot legally launch without `FR-RX-10`/`11`.

## User stories

### Epic: Rx builder

**US-RX-01** — As a clinician, I want to search for a drug and specify dose, frequency, route, and duration with auto-calculated quantity, so that I can write a complete, unambiguous prescription in seconds.
- PRD refs: FR-RX-01
- Priority: P0
- Acceptance criteria:
  - Given a drug is selected with frequency "BD" (twice daily) and duration "5 days," when the line is added, then quantity auto-calculates to 10 units without the clinician doing arithmetic.
  - Regional shorthand (BD/TDS/HS/SOS) is recognised and rendered in full on the printed output, not left as an abbreviation the patient can't interpret.

**US-RX-02** — As a clinician, I want to apply a saved drug-set favourite ("URI adult set") in one click, so that a common presentation doesn't require re-entering the same three drugs every time.
- PRD refs: FR-RX-02
- Priority: P0
- Acceptance criteria: given a saved favourite set, applying it adds all its lines to the current prescription in one action, each independently editable afterward.

### Epic: Print and share

**US-RX-03** — As a clinician, I want the printed prescription to include branch letterhead, my name/qualifications/registration number, patient demographics, diagnosis, the drug table, advice, follow-up date, and a signature, so that it is complete and professionally presentable without manual formatting.
- PRD refs: FR-RX-05, FR-RX-06
- Priority: P0
- Acceptance criteria:
  - Given a configured A4 letterhead with defined margins, when printed, then the print preview matches the physical output exactly — the PRD is explicit that preview-vs-output mismatch is unacceptable.
  - A5 and thermal-summary formats are also available and correctly laid out for their format, not a naive scale-down of the A4 layout.

**US-RX-04** — As a patient, I want to receive my prescription over WhatsApp with a secure, time-bound link, so that I don't have to keep a paper copy.
- PRD refs: FR-RX-08
- Priority: P0
- Acceptance criteria: given a signed prescription, when shared, then the link is OTP-gated and expires after a configured window; the same prescription is also visible in the patient portal (`REQ027`) without needing the link.

**US-RX-05** — As a patient needing the same medication again, I want a one-click "repeat prescription" from my history, so that a routine refill doesn't require a full re-consultation.
- PRD refs: FR-RX-12
- Priority: P0
- Acceptance criteria: given a prior prescription, when a clinician creates a repeat from it, then all lines pre-populate for review and adjustment; any reprint of the original is watermarked "duplicate" so it can never be mistaken for a fresh authorisation.

### Epic: Regulatory guardrails

**US-RX-06** — As the system, I want to enforce Telemedicine Practice Guidelines drug lists during a teleconsultation, so that a clinician cannot accidentally prescribe a prohibited or mode-inappropriate drug over video.
- PRD refs: FR-RX-10, FR-RX-11
- Priority: P1 (hard blocker for `REQ026` GA)
- Acceptance criteria:
  - Given a video first-consultation, when a List B drug (follow-up-only) is added, then the system blocks it with a clear reason citing the applicable list.
  - Given any teleconsultation mode, when an NDPS/Schedule X drug is added, then it is blocked outright with no override path.
  - Given a teleconsultation prescription is being issued, when no diagnosis has been recorded on the encounter, then issuance is blocked — mandatory diagnosis before Rx in tele mode, per `FR-RX-11`.

### Epic: Regional language and signature

**US-RX-07** — As a patient who reads Hindi more comfortably than English, I want my prescription's instructions rendered in Hindi with correctly embedded fonts, so that I actually understand how to take my medication.
- PRD refs: FR-RX-07
- Priority: P1
- Acceptance criteria: given a patient's preferred language is set, when the prescription PDF is generated, then drug instructions render in that language with the correct script embedded in the PDF (not a font-substitution failure showing boxes).

**US-RX-08** — As a clinician, I want to sign a prescription with my saved signature image and have the resulting PDF be tamper-evident, so that a prescription can't be altered after I've signed it.
- PRD refs: FR-RX-09
- Priority: P1
- Acceptance criteria: given a signed prescription, the stored PDF's hash is recorded; any later modification of the file is detectable by hash mismatch.

### Epic: Pharmacy handoff

**US-RX-09** — As a pharmacist at an in-house pharmacy, I want a signed prescription to appear in my dispense queue automatically, so that I don't have to be told a patient is coming.
- PRD refs: FR-RX-13
- Priority: P1
- Acceptance criteria: given a branch has a pharmacy store (`REQ022`), when a prescription is signed, then it appears in that store's dispense queue within the same transaction — this is the specific mechanism that realises the PRD's "closed-loop Rx → Pharmacy" wedge claim, and should be tested as an integration test spanning both modules, not just unit-tested per module.

## Data model impact

- `Prescriptions`: `id`, `encounter_id`, `patient_id`, `clinician_id`, `mode` (`in_person|video|audio|text`), `issued_at`, `signature_id`, `pdf_hash`, `language`.
- `PrescriptionItems`: `id`, `prescription_id`, `drug_id` (FK to `REQ016`'s `Drugs`), `dose`, `frequency`, `route`, `duration`, `qty`, `instructions`, `substitutable`.
- `TpgDrugLists` reference table: `drug_id`, `list` (`O|A|B|prohibited`), used by the guard in `US-RX-06`.

## Non-functional notes

The print-preview-matches-output requirement (`FR-RX-06`) is a real engineering constraint, not a cosmetic one — it typically requires generating the PDF server-side (not relying on browser print CSS) so preview and output share one rendering path. Decide this architecturally before implementation, since retrofitting it after a browser-print-based MVP would mean rebuilding the feature.

## Open questions

None raised in PRD §19 specific to this module beyond the drug-database licensing question already logged under `REQ016`.
