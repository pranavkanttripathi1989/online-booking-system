---
id: REQ159
type: improvement
feature: prescriptions
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ021
related: [PLAN201, TP221, TR221]
---

# REQ159 — Allergy hard-stop on prescribing (P2-07, scoped)

## Why this slice

`project-plans/phase-plans/02-phase2-win-the-midmarket.md`'s P2-07
slice: *"Drug interaction + allergy hard-stops. Safety. Allergy banner +
drug master already there."*

## A real scope decision, made before writing any code

Asked the user explicitly which half to build. The allergy half is
safely buildable today — patients already have structured allergy
records (`Diagnoses` rows, `type='allergy'`, reused via the existing
`patientAllergyBanner()` query, not re-derived). Drug-drug interaction
checking needs real interaction-pair data (e.g. Warfarin + Aspirin) this
codebase has none of, and the PRD's own open question (§19: "Drug
database licensing — build vs. license; what is the annual cost and
update cadence?") is unresolved. Fabricating interaction data for a
safety-critical hard-stop risks real harm if wrong or incomplete — the
same dishonesty class already refused for `ProcedureCodes`/`Icd10Codes`
("curated starter set, not a licensed vendor set"), but with much higher
stakes here.

**Decision: build the allergy hard-stop only this slice.** Drug-drug
interaction checking is a named, explicit follow-on, blocked on the
drug-database licensing decision — not silently dropped.

## User stories

**US-RX-09**: As a clinician, I cannot issue a prescription for a drug
that conflicts with a patient's own recorded allergy — no override.

- Given a patient has an active allergy record for "Amoxicillin"
- When a clinician tries to issue a prescription including Amoxicillin
- Then the mutation is rejected with a clear message naming both the
  drug and the conflicting allergy, and no prescription is created

**US-RX-10**: As a clinician, I see the conflict before I even try to
submit, not just as a rejected-mutation error.

- Given the same allergy record
- When the clinician picks Amoxicillin in the Rx builder
- Then that line is visibly flagged and "Issue Prescription" is disabled
  with an explanation, before any network call is made

## Matching honesty, explicitly stated

Matching is a deterministic, bidirectional substring check on the
patient's free-text allergy record against the drug's own name/
composition — the same "honestly non-exhaustive" ethic as
`column-mapping.ts`/`denial-classification.ts` elsewhere in this
codebase, not a drug-class ontology. It catches "Amoxicillin" allergy
vs. an Amoxicillin drug, or "Sulfa" vs. a Sulfamethoxazole composition.
It will **not** catch a drug-class-level allergy where neither string
contains the other (e.g. "Penicillin" allergy vs. an Amoxicillin drug,
even though Amoxicillin is penicillin-class) — a real, named limitation
requiring either a licensed drug-class ontology or manual admin
curation, not silently claimed as covered.

## Deliberately not built

- Drug-drug interaction checking — see the scope decision above.
- An override path with acknowledgment/reason — this is a genuine hard
  stop, no override, matching the existing TPG teleconsultation
  drug-list guard's own precedent (`assertTpgCompliant()`, REQ026).
- Drug-class-level allergy matching (see the honesty note above).

## Acceptance criteria

- `createPrescription` rejects any item conflicting with an active
  allergy record for that patient, before creating the row.
- The rejection message names the specific drug and allergy.
- The frontend shows an inline warning per conflicting line and blocks
  the Issue action, before a submit is even attempted.
- Reuses `EncountersService.patientAllergyBanner()` rather than
  re-deriving the same `Diagnoses` query.
