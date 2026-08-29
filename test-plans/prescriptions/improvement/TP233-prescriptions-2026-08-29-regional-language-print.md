---
id: TP233
type: improvement
feature: prescriptions
created: 2026-08-29
updated: 2026-08-29
status: done
parent: PLAN213
related: [REQ160, TR233]
---

# TP233 — Test plan: regional-language Rx print (P2-08)

A well-scoped slice against already-proven patterns (an existing PDF
renderer, an existing i18n framework) — suggestion stage skipped per
`CLAUDE.md`'s conditional rule, drafted directly.

## Backend unit

- `i18n-labels.spec.ts`: `pdfLabel`/`frequencyLabel` return the correct
  Hindi string for every known key/code, the correct English string for
  the default language, fall back to the raw code for an unrecognised
  frequency, and return `''` (not `"undefined"`) for a missing
  frequency.
- `documents.service.spec.ts` (`prescriptionPdf`):
  - a Hindi-language prescription's rendered PDF embeds `/FontFile2`
    and a `NotoSansDevanagari`-named font resource.
  - the existing English-default case's rendered PDF embeds neither
    (proves the font-registration path is genuinely conditional, not
    always-on).
  - an unrecognised `language` value (e.g. `'ta'`) still renders a
    valid PDF with no custom font embedded (defensive default to
    English, not a crash).

## Backend integration / regression

- Full `npx jest --maxWorkers=2`: every pre-existing suite stays green
  (no regression to the English-default rendering path any other
  domain's tests may exercise via `documents.service`).
- `npm run test:int`: unaffected (this slice adds no new resolver/
  tenant-scoping surface — `createPrescription`'s existing `@Auth`/
  scoping is untouched).
- `tsc --noEmit` / `eslint`: clean.

## Frontend unit

- `PrescriptionPrint.test.jsx`: a Hindi-language payload renders the
  document's own labels (patient/DOB/date/signature) and the
  frequency-code cell in Hindi, while the toolbar buttons (Print/Share
  via WhatsApp) stay in English; drug/clinician/patient free text is
  never translated. All 6 pre-existing English-path assertions stay
  green unchanged.
- `PrescriptionBuilder.test.jsx`: issuing without touching Print
  Language sends `language: 'en'`; selecting Hindi and issuing sends
  `language: 'hi'` — both proven via Apollo's own exact-variable mock
  matching (a mismatched `language` value simply wouldn't match either
  mock) plus real navigation to a marker route as the success signal.

## Frontend regression / gates

- Full `npx jest`: no regression elsewhere (isolate-rerun any suite
  that fails only under full-parallel contention, per this codebase's
  own established pattern, before treating it as real).
- `npm run lint`: 0 errors, warning ratchet decreases (several
  previously-hardcoded strings in `PrescriptionPrint.jsx` now route
  through `t()`/`tDoc()`).
- `npm run i18n:coverage`: passes with the new `prescription` keys
  present and fully covered in `hi`, pseudo locale regenerated and in
  sync.
- `npm run build` + `npm run size`: succeeds, within the existing
  bundle budgets (no new dependency added).

## Live verification (deferred)

No browser-automation tool was available in this session (matching
`P1-07`'s own honest note on the same gap) — not executed live this
pass. A future session should confirm, against the real dev stack:
issuing a Hindi-language prescription, viewing/printing/downloading it,
and visually confirming correct Devanagari glyph rendering (no tofu)
on both the on-screen preview and the downloaded PDF.
