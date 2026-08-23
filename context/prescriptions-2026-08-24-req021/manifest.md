---
id: CTX-prescriptions-2026-08-24-req021
type: requirement
feature: prescriptions
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ021
related: [REQ020, PLAN057, TP084, TR083]
---

# prescriptions — REQ021 P0 slice: Rx builder, print view, repeat-Rx (2026-08-24)

Slice 3 of a 6-requirement Phase 1 MVP pass (REQ017 → REQ020 → **REQ021** →
REQ019 → REQ018 → REQ032, dependency order). Requires REQ020 (an encounter
must exist to issue a prescription from) and REQ016 (drug master) — both
already real. Blocks REQ022 (pharmacy); a hard prerequisite for REQ026
(telemedicine) GA once `US-RX-06`'s TPG guardrails are picked up.

REQ021 itself splits into P0 (this slice) and P1 (explicitly deferred, per
the requirement's own phase assignment — not silently dropped). This bundle
covers the P0 slice only; REQ021 stays `in-progress` until the later items
are picked up in a future slice.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ021 | [prescription builder, print/share, TPG enforcement](../../requirements/prescriptions/requirement/REQ021-prescriptions-2026-08-22-rx-builder-print-and-tpg-guardrails.md) |
| implementation-plans | PLAN057 | [Rx builder, print view, repeat-Rx (P0 slice)](../../implementation-plans/prescriptions/requirement/PLAN057-prescriptions-2026-08-24-rx-builder-p0.md) |
| test-plans | TP084 | [verification plan](../../test-plans/prescriptions/requirement/TP084-prescriptions-2026-08-24-rx-builder-verification.md) |
| test-results | TR083 | [verification results — pass](../../test-results/prescriptions/requirement/TR083-prescriptions-2026-08-24-rx-builder-verification.md) |

## What shipped

- Schema: `Prescriptions`, `PrescriptionItems`, `PrescriptionSets`,
  `PrescriptionSetItems`, plus `registration_number`/`qualifications` on
  `Clinicians` for the print letterhead.
- Backend: new `backend/src/prescriptions/` module — qty auto-calculated
  from frequency × duration, tenant/self-scoped reads, clinician-only
  issuance, an unsaved-draft shape for repeat/apply-set (never a silent
  persisted copy), and a reprint-count state machine driving the print
  view's "DUPLICATE" watermark.
- Frontend: new `pages/clinician/PrescriptionBuilder.jsx` (drug-line table,
  favourites panel, repeat-from-history dialog) at
  `/clinician/prescriptions/new`, and `pages/prescriptions/PrescriptionPrint.jsx`
  at `/prescriptions/:id/print` — one rendering path for on-screen preview
  and `window.print()`, mirroring the `/video/:id` bare-route precedent.
  Entered via a new "New Prescription" button on `EncounterWorkspace.jsx`.
- Tests: 25 new backend unit tests (`prescriptions.service.spec.ts`), a new
  tenancy-matrix `prescriptions` domain classification, and a new Playwright
  e2e spec covering the full build→save-set→issue→print-watermark→repeat
  flow against the real dev stack.

## Real bugs found and fixed during this slice

1. **Missing refetch after saving a favourite set** — found via a live
   manual browser pass (per REQ020's own lesson). A saved set persisted
   correctly but never appeared on screen without a manual reload. Fixed
   with `refetchQueries`-equivalent `await refetchSets()`.
2. **Two tables with no `TableContainer` wrapper** — `PrescriptionBuilder`'s
   8-column drug-line table and `PrescriptionPrint`'s 7-column drug table
   both violated `CLAUDE.md`'s Hard Rule 5 (silent truncation). Found during
   this documentation/verification pass, not the original build. Fixed by
   wrapping both.
3. **The e2e spec itself had two real bugs**, found while re-running it
   after the prior session was killed mid-test without ever observing a
   green result: `getByRole('combobox').first()` matched the Drug
   Autocomplete instead of the unlabeled Frequency `<Select>` (fixed by
   adding `inputProps={{ 'aria-label': 'Frequency' }}` — MUI's documented
   way to label a `Select` with no visible `InputLabel`, since a bare
   `aria-label` prop lands on the wrong DOM node); and a fixed favourite-set
   name collided with itself across repeated runs against the real,
   accumulating dev DB (fixed by scoping the assertion and capturing the
   set id from the mutation response instead of a later name-based lookup,
   so cleanup runs even on a non-happy-path exit).
4. **Leftover fixture rows from the original interrupted run** — one
   orphaned `Appointments`/`Encounters` pair blocked the fixture's own
   appointment creation on the first re-run ("This time slot is no longer
   available"). Deleted directly, child-first, per the migration's
   `ON DELETE RESTRICT` chain.

## What's deliberately not built yet (P1, REQ021's own phase assignment)

WhatsApp/OTP-gated sharing (`US-RX-04`), Telemedicine Practice Guidelines
drug-list enforcement (`US-RX-06`, blocked on REQ026's not-yet-built
`consultation_mode` column), regional-language PDF rendering (`US-RX-07`),
digital signature + tamper-evident hash (`US-RX-08`), pharmacy dispense-
queue handoff (`US-RX-09`, blocked on REQ022 not existing yet), and
A5/thermal print formats. Each gets its own future `PLAN###` under REQ021
when picked up — not silently dropped.
