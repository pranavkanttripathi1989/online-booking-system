---
id: PLAN190
type: improvement
feature: frontend-platform
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ150
related: [TP210, TR210]
---

# PLAN190 — i18n framework + English/Hindi extraction (P1-07)

## Design

**Library**: `react-i18next` + `i18next` (real deps, `BASE-4`'s "one of
each thing" — no second i18n library ever). No `i18next-http-backend`
and no `i18next-browser-languagedetector` — both would be redundant
third dependencies for what a ~15-line custom backend/detector already
does correctly for this app's actual shape (bundled Vite SPA, not a
server-fetched translation API; a `localStorage`-plus-`navigator
.language` detector, not a cookie/query-param cascade this app has no
use for).

**Lazy loading, without breaking the common case**: `i18next`'s
`partialBundledLanguages` option lets English be provided synchronously
via `resources` (a real, static `import` of `en/common.json`, bundled
into the entry chunk) while every OTHER language goes through a custom
lazy `backend` — a dynamic `import()` per language, which Vite
genuinely code-splits (confirmed in the build output: two separate
`common-*.js` chunks, one for `hi`, one for `pseudo` — English is not a
third chunk, it's inlined). This is the key design decision that kept
existing tests green: `useSuspense: true` only ever suspends when
switching to a language whose resources aren't loaded yet, and every
test in this codebase renders in English by default (jsdom's own
`navigator.language`), so no existing test ever hits that path.

**Persistence** (`I18N-3`): `localStorage`, read once at module-init
time (`detectInitialLanguage()`), written on every `setLanguage()` call.
Explicitly scoped as `localStorage`-only, not a server-side account
setting — a real per-device-synced preference needs a backend field and
an authenticated write path, additive future work.

**The lint gate** (`I18N-1`): a second `no-restricted-syntax` entry
alongside the existing hex-color one, in the exact same `eslint.config.js`
block, scoped to the same three directories. Two selectors — `JSXText`
with letter content, and a literal on one of six known user-facing
attribute names (`label`, `placeholder`, `title`, `helperText`, `alt`,
`aria-label`). Deliberately imprecise (will flag some non-string-content
false positives, symmetric with the hex rule's own known imprecision) —
read and dismiss individually as they're found, never mass-disabled.

**Pseudo-locale** (`I18N-4`): generated, not hand-written, from the real
English source (`scripts/generate-pseudo-locale.mjs`) — accented
look-alike characters (non-ASCII, catches a font/encoding assumption)
plus a bracketed `Ẋ`-filler padding to +40% length. A real bug caught
while writing the generator: the first draft accentified the *inside* of
`{{interpolation}}` placeholders too, silently breaking i18next's own
placeholder matching (`{{minutes}}` → `{{mïnůtės}}`) — fixed by
splitting the string into placeholder/non-placeholder segments before
transforming.

**CI coverage gate** (`I18N-10`, `CI-10`): `scripts/check-i18n-coverage.mjs`
does three things — missing-key detection (English key absent from
Hindi), dead-key detection (Hindi key absent from English, usually a
stale leftover), and pseudo-locale staleness (regenerates into `--stdout`
and diffs against the checked-in file, rather than mutating it — a CI
check stays read-only; regenerating is its own, human-reviewed commit).

## What got extracted, and why exactly these two

`PublicLayout.jsx` — every public route (`landing.jsx`, `doctor-profile
.jsx`, `booking/index.jsx`) shares this shell, and it's where the
language switcher itself had to live to satisfy `I18N-3`'s "before
login, reachable in one tap" — extracting the shell's own strings was
free once the switcher was there. `booking/index.jsx`'s "Select Time"
step — the literal first screen of `BOOK-*`'s own "the product," the
most-cited flow in the whole rules document. Both were verified with a
*real* language switch in a rendered test (not just asserting a
translation key resolves in isolation) — `PublicLayout.test.jsx`'s own
Hindi-switch test is the strongest proof available that the lazy-loading
pipeline genuinely works end to end.

The rest of `booking/index.jsx` (patient details, service selection,
payment) and every other page are untouched — see `REQ150`'s own
"Scope" section for why, verbatim from the tracker's own instruction.

## Testing

`src/i18n/pseudo-locale.test.js` — the pseudo-locale is measurably
≥40% longer than English, genuinely non-ASCII, preserves interpolation
placeholders (a regression test for the bug found above), and loads
through the real lazy backend. `src/layouts/PublicLayout.test.jsx` — the
real end-to-end proof: renders real English by default, the switcher is
reachable, switching to Hindi triggers a real `import()` and re-renders
real Hindi text, and the choice persists to `localStorage`.
`booking/index.test.jsx` — all 8 pre-existing cases re-confirmed
unaffected (English resolves synchronously, no ripple). New
`frontend/e2e/pseudo-locale-overflow.spec.js` — the real element-level
overflow probe from `06-frontend-architecture-and-mobile.md` §7, at
360/768/1280px, against both extracted surfaces, with the pseudo-locale
active via a `localStorage` write in `page.addInitScript()` — written,
not executed live (no browser-automation tool available this session).

## Outcome

Frontend: 32/32 suites green (2 new files, `PublicLayout.test.jsx` and
`pseudo-locale.test.js`, plus the pre-existing `booking/index.test.jsx`
and `patient/Appointments.test.jsx` reconfirmed unaffected); lint at a
newly-measured 4,779-warning baseline (up from 1,906 — the real, honest
size of the extraction debt this rule now surfaces); `i18n:coverage`
passes (35/35 Hindi keys covered, pseudo-locale current); build and
`size-limit` green at a newly-measured 350 KB initial-bundle budget (up
from 335 KB — the real, measured cost of the new dependency). See TR210
for the full run log.
