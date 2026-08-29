---
id: TP234
type: improvement
feature: frontend-platform
created: 2026-08-29
updated: 2026-08-29
status: approved
parent: PLAN214
related: [TR234]
---

# TP234 — six more regional languages (P2-09)

## Cases

1. **Coverage — all 6 new bundles fully translated.** `npm run
   i18n:coverage` reports `64/64 keys, fully covered` for `ta`, `bn`,
   `mr`, `te`, `kn`, `gu` (in addition to the pre-existing `hi`), with
   no missing and no extra ("dead translation debt") keys.
2. **Pseudo-locale still accurate.** The coverage script's own
   staleness check (diffing a freshly regenerated pseudo-locale
   against the checked-in one) passes — confirms this slice's changes
   didn't alter the English key set in a way the pseudo-locale missed.
3. **Config wiring.** `SUPPORTED_LANGUAGES` contains exactly 8 entries
   (en, hi, ta, bn, mr, te, kn, gu) each with a real native label;
   `localeLoaders` has a matching lazy `import()` for each of the 6
   new codes.
4. **No regression to existing i18n consumers.** `PublicLayout.test.jsx`
   (asserts specific option labels, e.g. Hindi's `हिन्दी`) stays green
   unmodified — the language switcher maps generically over
   `SUPPORTED_LANGUAGES` so a longer list doesn't break its existing
   assertions.
5. **`PRESCRIPTION_LANGUAGES` unaffected.** `PrescriptionBuilder.jsx`'s
   own narrower print-language list stays exactly `en`/`hi` — confirmed
   by reading the file, not merely by an unchanged diff.
6. **Lint / build / size clean.** `npx eslint` on every touched file:
   0 new errors. `npm run build` succeeds. `npm run size`: all three
   budgets (initial bundle, largest lazy chunk, initial CSS) still
   under their limits.
7. **Full unit suite green.** `npx jest` run once at the end, no new
   failures attributable to this slice (any full-parallel-contention
   flake isolated and re-run per this codebase's established practice
   before being treated as a regression).

## Out of scope for this test plan

Native-speaker linguistic review of the 6 new translations — logged as
an open follow-up in `REQ161`'s own honesty caveat, not silently
assumed correct.
