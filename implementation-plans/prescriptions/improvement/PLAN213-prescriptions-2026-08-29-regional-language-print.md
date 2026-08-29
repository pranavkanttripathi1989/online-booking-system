---
id: PLAN213
type: improvement
feature: prescriptions
created: 2026-08-29
updated: 2026-08-29
status: done
parent: REQ160
related: [TP233, TR233]
---

# PLAN213 — Implementation plan: regional-language Rx print (P2-08)

## Backend

1. `backend/src/common/pdf/fonts/NotoSansDevanagari-Regular.ttf` +
   `NotoSansDevanagari-OFL.txt` (the required licence text) checked in
   — sourced from `@expo-google-fonts/noto-sans-devanagari` (a real
   `.ttf`, not the `@fontsource` package's `.woff2`, which crashes
   pdfkit's font embedding — see `REQ160`'s own account).
2. `common/pdf/render-pdf.ts`: new `pdfFontName(doc, language, bold)`
   — registers the Devanagari font on `doc` the first time it's needed
   (a module-level `Set` tracks which logical font names have already
   been registered, so repeated calls within the same render are
   cheap) and returns the logical name to pass to `.font(...)`, falling
   back to `'Helvetica'`/`'Helvetica-Bold'` for English or any
   unrecognised language.
3. `common/pdf/i18n-labels.ts`: `pdfLabel(key, language)` (the ~10
   static labels) and `frequencyLabel(code, language)` (the closed
   OD/BD/TDS/QID/HS/SOS enum). Both fall back to English/the raw code
   on a miss, never throwing.
4. `documents.service.ts#drawPrescriptionPdf()`: every `.font()` call
   touching translated content now goes through `pdfFontName`; every
   translated string goes through `pdfLabel`/`frequencyLabel`. The `℞`
   symbol stays on `'Helvetica-Bold'` unconditionally — Noto Sans
   Devanagari doesn't include that glyph, and it's a universal pharmacy
   symbol, not translated text. `drug_name`/`route`/`instructions`
   render exactly as stored, on whichever font the rest of the
   (possibly Hindi) body uses — Noto Sans Devanagari also covers full
   Latin/₹, so English free text is unaffected either way.
5. No DTO/schema change — `Prescriptions.language` and
   `CreatePrescriptionInput.language` already existed (`REQ021`); the
   Prisma `include` in `printPrescription()`/`assembleForShare()`
   already returns all scalar columns, so `data.prescription.language`
   was already reachable, just never read.

## Frontend

1. `i18n/config.js`: export `localeLoaders` and `enCommon` (both
   already existed internally) for reuse by the new hook — no change
   to the shared instance's own behaviour.
2. `i18n/useScopedTranslation.js`: a standalone per-language bundle
   loader + cache (module-level, shared across every call site), with
   `useEffect`/`useState` tracking load completion. Not built on
   `i18next.cloneInstance()` — see `REQ160`'s own account for why.
3. `i18n/locales/{en,hi}/common.json`: new `prescription` key, ~20
   labels including a `frequencyCode` sub-object. Pseudo locale
   regenerated (`scripts/generate-pseudo-locale.mjs`) to stay in sync
   with `i18n:coverage`'s own gate.
4. `pages/prescriptions/PrescriptionPrint.jsx`: `useTranslation()`
   (global, for toolbar/toasts) + `useScopedTranslation(prescription
   .language)` (document content only). `℞` stays literal.
5. `pages/clinician/PrescriptionBuilder.jsx`: a `PRESCRIPTION_LANGUAGES`
   constant (`en`/`hi` — deliberately narrower than and separate from
   `SUPPORTED_LANGUAGES`, which governs the app's own UI language and
   may grow ahead of what the PDF renderer supports), a `language`
   state defaulting to `'en'`, a "Print Language" `Select` near the
   page title, and `language` added to the `createPrescription`
   mutation's variables.

## Testing

- Backend: `i18n-labels.spec.ts` (new, direct label/frequency lookup
  unit tests) + `documents.service.spec.ts` (new cases: Hindi path
  embeds `/FontFile2`+`NotoSansDevanagari`, English path embeds
  neither, an unrecognised language value defensively falls back to
  English). Full suite + `test:int` + `tsc --noEmit` + `eslint` re-run
  clean.
- Frontend: `PrescriptionPrint.test.jsx` (new case — Hindi document
  labels render, toolbar stays English) + `PrescriptionBuilder
  .test.jsx` (new cases — default English vs. selected Hindi both
  reach `createPrescription` with the right `language`, proven via
  Apollo's own exact-variable mock matching + navigation to a marker
  route). Full suite + lint + build + `size-limit` + `i18n:coverage`
  re-run clean.

## Documentation

This `REQ160`/`PLAN213`/`TP233`/`TR233` set, plus the `prescriptions`
feature README and all five root indexes.
