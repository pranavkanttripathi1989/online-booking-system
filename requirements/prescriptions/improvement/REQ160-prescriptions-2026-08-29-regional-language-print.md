---
id: REQ160
type: improvement
feature: prescriptions
created: 2026-08-29
updated: 2026-08-29
status: done
parent: REQ021
related: [PLAN213, TP233, TR233]
---

# REQ160 — Regional-language Rx print (P2-08)

## Why this slice

`project-plans/phase-plans/02-phase2-win-the-midmarket.md`'s P2-08
slice, next unstarted/unblocked row in the tracker (depends on `P1-07`,
which shipped 2026-08-27). `REQ021` (`US-RX-07`) already asked for this
and deferred it: *"drug instructions render in that language with the
correct script embedded in the PDF... not a font-substitution failure
showing boxes."*

## Research reshaped scope before writing any code

Two parallel Explore passes (backend PDF pipeline, frontend i18n
framework) found the real state, which reshaped the naive "translate
the Rx" ask:

1. **Two independent rendering paths already exist** for a
   prescription: the on-screen preview/`window.print()` path
   (`PrescriptionPrint.jsx`, browser-rendered, any Unicode script works
   natively) and the server-side PDF path
   (`documents.service.ts`'s `drawPrescriptionPdf`, `pdfkit`, shared by
   Download PDF and OTP-gated WhatsApp share). Only the second needed
   real font-embedding work — every `.font()` call in that module used
   only `'Helvetica'`/`'Helvetica-Bold'`, pdfkit's built-in Latin-only
   AFM fonts.
2. **The translation surface splits into three tiers, only two safely
   automatable**: static app-chrome labels (translate), the closed
   6-value `PrescriptionItems.frequency` enum (translate via lookup),
   and free text — `drug_name`/`route`/`instructions` — which is
   clinician-authored and **not machine-translated**: a mistranslated
   dosage instruction is a patient-safety hazard, not a cosmetic bug.
3. **No "preferred language" capture existed anywhere.**
   `Prescriptions.language` already existed in the schema/DTO
   (`@default("en")`, `REQ021`) and was even fetched by
   `PrescriptionPrint.jsx`'s own query — but was fully dead end-to-end:
   `PrescriptionBuilder.jsx`'s create call never sent it, so every real
   prescription silently got `'en'`. The actual missing link was a UI
   write path, not a new column.
4. **The frontend i18n framework (`P1-07`) cannot drive the server-side
   PDF at all** — it's browser-only; `pdfkit` runs in Node. The
   server-side label set needed its own small dictionary, not a reuse
   of `frontend/src/i18n/locales/`.

## Scope shipped

- A "Print Language" picker (English/Hindi) on `PrescriptionBuilder.jsx`
  at issue time, wired to the already-existing `Prescriptions.language`
  field.
- `documents.service.ts`'s `drawPrescriptionPdf()`: registers a bundled
  Devanagari TrueType font (Noto Sans Devanagari, OFL-1.1) when
  `language === 'hi'`, renders the static label set + translated
  frequency from a new `common/pdf/i18n-labels.ts` dictionary.
- `PrescriptionPrint.jsx`'s client-side preview/print path: its own
  document-content labels follow `prescription.language` (via a new
  `useScopedTranslation` hook), independent of the viewer's own app UI
  language; the toolbar/toasts stay in the viewer's own language.
- `drug_name`/`route`/`instructions`/patient/clinician names: never
  translated, on both rendering paths, stated not hidden.

## Deliberately deferred

- `route`/`instructions` translation — needs a controlled-vocabulary
  redesign of `PrescriptionBuilder.jsx`, a separate slice.
- Tamil/Bengali/other languages — `P2-09`, its own tracked slice.
- Font ligature/conjunct-shaping QA beyond a basic visual + structural
  check — `fontkit` isn't full HarfBuzz-grade; a known limitation, not
  a blocker for this slice's own P1 scope.

## Real findings during implementation

- pdfkit 0.20's `fontkit`-based embedding throws
  `RangeError: Offset is outside the bounds of the DataView` subsetting
  the `@fontsource/noto-sans-devanagari` npm package's own `.woff2`
  build. A raw `.ttf` of the same upstream font (sourced from
  `@expo-google-fonts/noto-sans-devanagari`, same OFL-1.1 licence)
  embeds and subsets correctly — confirmed via a direct
  `/FontFile2`/`/CIDFontType2` check on the rendered PDF's own objects,
  not just "a PDF came out."
- An early implementation of the frontend's document-language lock used
  i18next's own `cloneInstance()`/`getFixedT()`. It was hard to reason
  about alongside the shared instance's `react: { useSuspense: true }`
  wiring during testing, so the shipped version is a small standalone
  loader instead (reusing `config.js`'s own per-language dynamic
  import), which never touches the shared i18next instance.

## Acceptance criteria (traced to `REQ021` `US-RX-07`)

- Given a clinician sets Print Language to Hindi and issues a
  prescription, when the patient (or clinician) views/prints/downloads
  it, then the document's own labels and frequency values render in
  Hindi with correctly embedded Devanagari glyphs (no tofu/boxes), on
  both the on-screen preview and the downloaded PDF.
- Given the same prescription, when a different, English-UI clinician
  views it later, then the page's own toolbar and toast messages stay
  in English — only the document content is locked to the issuing
  language.
- Given `drug_name`/`route`/`instructions` were typed in any language,
  when the document renders, then that text appears exactly as typed,
  never auto-translated.
