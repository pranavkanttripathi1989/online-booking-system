---
id: CTX-prescriptions-2026-08-29-req160
type: improvement
feature: prescriptions
created: 2026-08-29
updated: 2026-08-29
status: done
parent: REQ160
related: [PLAN213, TP233, TR233]
---

# prescriptions — regional-language Rx print (P2-08) (2026-08-29)

Phase 2 slice **P2-08** (`project-plans/phase-plans/02-phase2-win-the-midmarket.md`),
picked up on the phase-plan's own `▶ CURRENT POSITION`. Research
(two parallel Explore passes) reshaped scope before any code was
written — see `REQ160`'s own account.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ160 | [Regional-language Rx print](../../requirements/prescriptions/improvement/REQ160-prescriptions-2026-08-29-regional-language-print.md) |
| implementation-plans | PLAN213 | [implementation plan](../../implementation-plans/prescriptions/improvement/PLAN213-prescriptions-2026-08-29-regional-language-print.md) |
| test-plans | TP233 | [test plan](../../test-plans/prescriptions/improvement/TP233-prescriptions-2026-08-29-regional-language-print.md) |
| test-results | TR233 | [results](../../test-results/prescriptions/improvement/TR233-prescriptions-2026-08-29-regional-language-print.md) |

## What shipped

- **Backend**: `common/pdf/fonts/NotoSansDevanagari-Regular.ttf` (a
  real, licensed — OFL-1.1 — TrueType font, checked in after a raw
  `.woff2` build of the same font crashed pdfkit's own font-embedding),
  `common/pdf/i18n-labels.ts` (a small server-side label/frequency
  dictionary), and `common/pdf/render-pdf.ts`'s new `pdfFontName()`
  helper. `documents.service.ts#drawPrescriptionPdf()` now renders in
  the prescription's own `language` — no schema/DTO change, since
  `Prescriptions.language` already existed (`REQ021`) and was already
  flowing through, just never read.
- **Frontend**: `i18n/useScopedTranslation.js` (a new, standalone
  per-document-language hook — not built on i18next's own
  `cloneInstance()`, see below), a new `prescription` key in both
  locale bundles, `PrescriptionPrint.jsx`'s document content locked to
  `prescription.language` (toolbar/toasts stay in the viewer's own
  language), and a "Print Language" picker on
  `PrescriptionBuilder.jsx` — the actual missing link, since nothing
  ever wrote to the already-existing `language` field before this.

## Two real technical findings, not just a routine feature build

1. **pdfkit 0.20's font embedding is genuinely format-sensitive.** A
   direct Node script confirmed `@fontsource/noto-sans-devanagari`'s
   own `.woff2` build throws `RangeError: Offset is outside the bounds
   of the DataView` inside `fontkit`'s glyph-encoding path; the
   identical upstream font as a raw `.ttf` (via
   `@expo-google-fonts/noto-sans-devanagari`) embeds and subsets
   correctly. Confirmed via a direct `/FontFile2`/`/CIDFontType2` check
   on the rendered PDF's own objects — this is now also
   `documents.service.spec.ts`'s own test assertion, not just "a PDF
   came out."
2. **A dead end while building the frontend's document-language lock,
   worth recording for any future per-component-language need in this
   codebase.** An early draft used i18next's own
   `cloneInstance()`/`getFixedT()`. It was hard to reason about
   alongside the shared instance's own `react: { useSuspense: true }`
   wiring while testing it, so the shipped version is a small
   standalone loader instead — it reuses `config.js`'s own
   per-language dynamic import (`localeLoaders`, now exported) and
   never touches the shared i18next instance at all.

## Deliberately deferred (stated, not hidden)

- `route`/`instructions` translation — free text, clinician-authored;
  auto-translating a dosage instruction is a real clinical-safety risk,
  not a cosmetic gap. Would need a controlled-vocabulary UI redesign of
  `PrescriptionBuilder.jsx` — a separate slice.
- Tamil/Bengali/other languages — `P2-09`, its own tracked phase-plan
  slice.
- Live browser verification — no browser-automation tool was available
  this session; logged as the explicit next step, not silently
  skipped.

## Verification

Backend: 127/127 suites, 2032/2032 tests; `test:int` 9/9 suites,
414/414 tests; `tsc --noEmit` + `eslint` clean. Frontend: both touched
test files fully green (7/7, 8/8) and not among the suites that failed
under full-parallel contention; `lint` 0 errors (warning ratchet
decreased); `i18n:coverage` passes; `build` + `size-limit` clean. See
`TR233` for the full account.
