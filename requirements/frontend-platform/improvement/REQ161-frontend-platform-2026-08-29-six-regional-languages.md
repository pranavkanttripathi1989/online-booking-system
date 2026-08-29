---
id: REQ161
type: improvement
feature: frontend-platform
created: 2026-08-29
updated: 2026-08-29
status: done
parent: REQ150
related: [PLAN214, TP234, TR234]
---

# REQ161 — six more regional languages (P2-09)

## Why this slice

Per `project-plans/phase-plans/02-phase2-win-the-midmarket.md`'s own `▶
CURRENT POSITION`, `P2-09` ("i18n: 3 more regional languages") was the
next unstarted, unblocked slice after `P2-08` (`REQ160`). The PRD's own
Open Question #8 ("Regional-language coverage at GA — which 6, based
on target-city sales priority?") means the specific language set was
genuinely unresolved — Hard Rule 10 territory, not a call to make
alone.

Asked the user directly (`AskUserQuestion`) which languages to add,
offering a reasoned default (Tamil/Bengali/Marathi — the three next-
largest speaker populations after Hindi, per `FR-RX-07`'s own 12-
language list) alongside an alternative set (Telugu/Kannada/Gujarati).
**The user selected both option sets** — an explicit instruction to
ship all 6 languages in this slice, not the phase-plan's narrower "3
more" framing.

## Scope

Extends `REQ150`'s (`P1-07`) i18n framework — no new mechanism, six
more locale bundles plumbed through the existing lazy-loaded-backend
pattern:

- New `frontend/src/i18n/locales/{ta,bn,mr,te,kn,gu}/common.json`, each
  a full translation of the current English source (64 keys:
  `languageSwitcher`, `layout` incl. `nav`/`footer` link arrays,
  `booking` incl. `steps`, `prescription` incl. `frequencyCode`).
- `frontend/src/i18n/config.js`'s `SUPPORTED_LANGUAGES` and
  `localeLoaders` extended with the 6 new codes (native labels: தமிழ்,
  বাংলা, मराठी, తెలుగు, ಕನ್ನಡ, ગુજરાતી). `supportedLngs` derives from
  `SUPPORTED_LANGUAGES` automatically — no separate edit needed there.
- `frontend/scripts/check-i18n-coverage.mjs`'s `TARGET_LANGUAGES` was
  hardcoded to `['hi']` only — a real gap found while implementing,
  since it meant CI would never have caught a missing key in any of
  the 6 new bundles. Extended to `['hi', 'ta', 'bn', 'mr', 'te', 'kn',
  'gu']`.
- Pseudo-locale regenerated (key set unchanged by this slice, but
  regenerating keeps the checked-in file's own staleness check honest).

## Explicitly NOT changed (deliberate, stated)

- **`PrescriptionBuilder.jsx`'s `PRESCRIPTION_LANGUAGES`** stays
  `en`/`hi` only. That list is a *separate* constant (confirmed not an
  aliased reference to `SUPPORTED_LANGUAGES` during this slice's own
  verification pass) scoped to what `backend/src/common/pdf/
  i18n-labels.ts`'s `PdfLanguage` type can actually render server-side
  (`REQ160`/`P2-08`'s own scope). Adding Tamil/Bengali/Marathi/Telugu/
  Kannada/Gujarati there would require new font-embedding work per
  script — a materially larger, separate slice, not something this
  purely-frontend `P2-09` track should absorb.
- No other file needed a change — a dedicated audit (see `TR234`)
  confirmed the language switcher, `PublicLayout.test.jsx`, and every
  other "languages a clinician speaks"-style list in the codebase
  (`ClinicianFormDrawer.jsx`, `BookingStep2Clinician.jsx`, etc.) are
  either generic over `SUPPORTED_LANGUAGES` already or are a wholly
  separate, backend-driven feature (the admin `Languages` directory)
  with no relationship to this UI i18n layer.

## Honesty caveat

The 6 new translations are a good-faith first pass, produced without a
native-speaker review pass for any of Tamil, Bengali, Marathi, Telugu,
Kannada, or Gujarati. They are structurally complete (100% key parity,
verified by `npm run i18n:coverage`) and use standard/expected
healthcare-booking terminology, but — matching this codebase's own
established pattern of stating limitations honestly rather than
silently presenting unreviewed work as production-certified — a native-
speaker QA pass is recommended before this ships to real users in
those languages, and is logged here as the natural next step, not
hidden.

## Acceptance criteria

- **Given** a user has never selected a language, **when** they open
  the app with a browser locale matching one of the 6 new codes,
  **then** the app renders in that language (matches the existing
  `detectInitialLanguage()` behaviour, unchanged by this slice).
- **Given** the language switcher, **when** opened, **then** all 8
  languages (English, Hindi, Tamil, Bengali, Marathi, Telugu, Kannada,
  Gujarati) appear with their native labels.
- **Given** any of the 6 new locale bundles, **when** `npm run
  i18n:coverage` runs, **then** it reports full key parity against the
  English source (64/64).
