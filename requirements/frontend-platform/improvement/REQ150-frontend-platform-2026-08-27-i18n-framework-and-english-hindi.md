---
id: REQ150
type: improvement
feature: frontend-platform
created: 2026-08-27
updated: 2026-08-27
status: done
parent: null
related: [PLAN190, TP210, TR210]
---

# REQ150 — i18n framework + English/Hindi extraction (P1-07)

## Why this slice

Phase 1 slice `P1-07` (`project-plans/phase-plans/01-phase1-close-the-gates.md`).
`FRONTEND_RULES.md` §14 states plainly: "**Status: no i18n layer exists
today**" and names `I18N-1` as "the most expensive rule in this document
to retrofit — see §20.1." §20.1 itself: "We'll add i18n later... You
won't, cheaply... This is now the single largest latent cost in the
frontend — the layer does not exist and every new hardcoded string
raises the price." Confirmed by grep before starting: zero references to
any i18n library, zero `locales/` directory, zero translation key
anywhere in `frontend/src`.

## User story

As a patient more comfortable in Hindi than English (the majority of
this product's real user base per §1's own market context), I want to
choose my language before logging in, have it persist across visits,
and see the core booking experience in that language — and as a future
contributor, I want every new hardcoded string to be caught by lint
before it ships, so the cost of this gap stops growing from today
onward.

## Acceptance criteria

- **Given** any public page, **when** a visitor looks for a language
  choice, **then** it is reachable in one tap/click, without logging in
  (`I18N-3`).
- **Given** a chosen language, **when** the visitor returns later,
  **then** their choice is remembered (`I18N-3`'s "persist across
  sessions" — persisted to `localStorage`; see `PLAN190`'s own note on
  what this does and doesn't cover).
- **Given** a non-default language is selected, **when** its
  translation file has not yet loaded, **then** only that language's
  data is fetched — English (or whichever language is active) is never
  downloaded for a visitor who never needs it (`I18N-8`).
- **Given** a translation key exists in English but is missing from
  Hindi, **when** it renders, **then** the visitor sees the real English
  string, never a blank space or a raw key (`i18next`'s own fallback
  behavior) — **and** CI fails on the missing key, so the gap is caught
  before it ships, not discovered by a user (`I18N-10`, `CI-10`).
- **Given** any new JSX text or a handful of known user-facing props
  (`label`, `placeholder`, `title`, `helperText`, `alt`, `aria-label`)
  written from this point forward, **when** it is a literal string,
  **then** ESLint warns (`I18N-1`) — matching the exact ratchet
  discipline `no-hardcoded-colors` already established for hex literals.
- **Given** a layout built for English string lengths, **when** every
  string is ~40% longer and non-ASCII (a generated pseudo-locale),
  **then** nothing is silently clipped — the real element-level probe is
  written (`I18N-4`), though not executed live this session (no
  browser-automation tool was available — see `TR210`'s own honest
  account, not a silent skip).

## Scope, stated explicitly (this is the load-bearing decision in this slice)

The tracker's own instruction: **"Extract incrementally, gate
immediately. Turning the lint rule on for new code from day one is what
stops the debt growing; extracting 93 existing pages is its own
ratchet."** This slice:

1. Builds the complete framework (library, lazy loading, persistence,
   the language switcher, the lint gate, the pseudo-locale generator,
   the CI coverage gate) — genuinely finished, not a partial scaffold.
2. Fully extracts and translates exactly two real, load-bearing
   surfaces: `PublicLayout.jsx` (the shell wrapping every public route —
   nav, footer, and where the language switcher itself lives, satisfying
   `I18N-3` directly) and the "Select Time" step of the public booking
   wizard (`booking/index.jsx` — step labels, the consultation-type
   toggle, the date/time heading, the hold countdown, Next/Back). Both
   verified with a real, live Hindi switch in a Jest+RTL test — not
   just that the keys exist.
3. Does **not** touch the other ~90 pages, or the remaining steps of the
   booking wizard itself (patient details, service selection, payment).
   The new `no-restricted-syntax` rule now reports **4,779** warnings
   (up from 1,906) — this is the real, measured size of that debt,
   surfaced honestly rather than left invisible, matching how
   `no-hardcoded-colors` itself was ratcheted in `REQ077`.

## Non-functional

- `react-i18next` + `i18next` (~17.6 kB gzipped added to the initial
  bundle, measured) — a deliberate `BASE-5` dependency addition: no
  smaller library gives real ICU-style plural rules, which `I18N-5`
  explicitly requires ("Indian languages have plural rules English does
  not"). `.size-limit.json`'s initial-bundle budget raised from 335 KB
  to 350 KB to match the new measured reality (327.86 KB actual before
  this slice's own JS, 345.42 KB after) — the same "measure first, then
  ratchet down" discipline `P1-03` already established for this budget.

## Deliberately NOT built

- Extraction of the remaining ~90 pages, or the rest of the booking
  wizard — see "Scope" above.
- A server-side, per-account language preference — `localStorage` only.
  A real account-level setting (synced across devices) is additive,
  future work, not silently dropped — noted in `PLAN190`.
- A third language beyond English/Hindi — `SUPPORTED_LANGUAGES` is a
  short, real array; adding a language is one locale file plus one array
  entry, not an architecture change.
- Live execution of the Playwright pseudo-locale overflow probe — no
  browser-automation tool was available this session; the spec is
  written and ready (`frontend/e2e/pseudo-locale-overflow.spec.js`).
