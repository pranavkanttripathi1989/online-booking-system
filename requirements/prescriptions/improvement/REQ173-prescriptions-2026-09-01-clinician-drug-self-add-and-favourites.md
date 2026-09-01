---
id: REQ173
type: improvement
feature: prescriptions
created: 2026-09-01
updated: 2026-09-01
status: done
parent: REQ021
related: [PLAN242, TP262, TR262]
---

# REQ173 — Clinician drug self-add + personal single-drug favourites

## Why this slice

A follow-on request from the same Rx builder surface as `REQ170`–`REQ172`.
`Drugs` is a hybrid-scoped catalog (`client_org_id: null` = a small
platform-seeded reference set, ~6 rows; non-null = a tenant's own custom
addition) and `PrescriptionItems.drug_id` is a **hard-required FK** — a
clinician who needs a drug outside that small seeded/admin-curated list
had no way to add it themselves: `createDrug` was gated
`@Auth('manager','admin','super_admin')` only.

Separately, the user wanted a "don't make me remember/retype this every
time" personal quick-pick list. This codebase already has
`PrescriptionSets` (a named **multi-drug bundle/preset**, personal-or-
org-shared via a nullable `clinician_id`) — but no **single-drug**
favourites list existed.

## Competitor analysis

Same HealthPlix-class Indian clinic EMR pattern referenced in `REQ170`,
plus Practo Ray/DocEngage-style solo-clinic tools: near-universally ship
a "frequently prescribed"/starred-drug quick list per doctor, distinct
from any saved multi-drug regimen preset. This is an established,
well-understood UX pattern in this vertical, not a novel ask.

## Options considered (resolved via `AskUserQuestion`, both to the recommended choice)

1. **Drug sourcing** — clinician self-add (chosen) vs. licensing a real
   external Indian drug database (a much bigger, vendor-dependent
   decision this codebase's `REQ016`/`REQ044` docs already flagged as
   unresolved — PRD §19 Open Question 4) vs. a free-text-only fallback
   (would drop `drug_id` linkage entirely, breaking pharmacy dispensing
   and composition/schedule-class/GST tracking for that item).
2. **Favourites scope** — a new single-drug personal list (chosen),
   complementing rather than replacing the existing multi-drug
   `PrescriptionSets`.

## Scope shipped

- `createDrug`'s `@Auth()` widened to include `'clinician'` — a
  clinician can now add a drug directly to their own org's catalog from
  the Rx builder. `updateDrug`/`deleteDrug` stay manager/admin/
  super_admin-only (deliberate, unchanged) — a clinician who makes a
  typo flags it to their admin rather than mutating catalog data other
  clinicians may already depend on.
- New `ClinicianFavouriteDrugs` model + `myFavouriteDrugs`/
  `addFavouriteDrug`/`removeFavouriteDrug` on the existing `DrugsResolver`/
  `DrugsService` — self-scoped via the JWT `clinician_id`, idempotent
  add/remove, re-validates drug visibility before favouriting.
- `PrescriptionBuilder.jsx`: a quick-add dialog (name/composition/
  strength/form/schedule_class — the clinically relevant subset of
  `DrugInput`); a star toggle on every drug-search result; an empty
  search now shows the clinician's own favourites first instead of
  nothing.

## Deliberately deferred (recorded honestly)

- **Licensing a real external Indian drug database** — the user's own
  explicit choice this pass. `REQ016`/`REQ044` both said this tradeoff
  would be logged in `context/open-questions.md` and never was (grep
  confirmed zero prior "drug" mentions); this slice adds the missing
  entry as a real, larger, separately-scoped future decision.
- A drug-catalog "merge duplicates" admin tool (mirroring the existing
  patient-merge tool) — natural future follow-on if near-duplicate
  clinician-added entries become a real problem at scale.
- Drug-drug interaction checking / dosage-limit warnings — not asked for.

## Acceptance criteria

- Given a clinician can't find a drug while building a prescription,
  when they use the quick-add flow, then the new drug is created in
  their own org's catalog and selected directly into the current line.
- Given a clinician stars a drug, when they return to the Rx builder
  with an empty search, then that drug appears in the results
  immediately, without retyping.
- Given a `drug_id` belongs to another org's private (non-platform-
  seeded) drug, when a clinician attempts to favourite it, then the
  mutation is rejected — a clinician cannot use id-guessing to infer
  another org's private catalog.
- Given `updateDrug`/`deleteDrug` are attempted by a clinician, then
  they are still rejected (regression check — only `createDrug` was
  widened).
