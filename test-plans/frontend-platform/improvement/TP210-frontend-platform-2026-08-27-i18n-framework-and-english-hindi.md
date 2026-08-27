---
id: TP210
type: improvement
feature: frontend-platform
created: 2026-08-27
updated: 2026-08-27
status: done
parent: REQ150
related: [PLAN190, TR210]
---

# TP210 — Test plan: i18n framework + English/Hindi extraction (P1-07)

Well-scoped slice against a documented, if novel, requirement (no prior
i18n pattern existed to reuse, but the acceptance criteria are concrete
and testable) — suggestion stage skipped per `CLAUDE.md`'s conditional
rule given the framework choices themselves (library, lazy-loading
architecture) were resolved via direct investigation before writing any
code, test plan drafted directly.

## Unit — the framework itself

1. Pseudo-locale is measurably at least 40% longer than the real English
   source (`I18N-4`).
2. Pseudo-locale is genuinely non-ASCII throughout.
3. Pseudo-locale preserves `{{interpolation}}` placeholders exactly —
   regression coverage for the real bug the generator's first draft had.
4. The pseudo-locale loads through the real lazy i18next backend (the
   same code path a real language switch uses), not a special case.

## Unit — the two extracted surfaces

5. `PublicLayout` renders real English text by default, on every public
   route.
6. The language switcher is reachable before login, in one interaction
   (`I18N-3`).
7. Switching to Hindi triggers a real dynamic `import()` of the Hindi
   locale file and re-renders real Hindi text — not a mocked
   translation function.
8. The chosen language persists to `localStorage` (`I18N-3`).
9. Every pre-existing `booking/index.test.jsx` case (8) continues to
   pass unaffected — proves the Suspense/lazy-loading architecture
   doesn't regress the English-default path every existing test (and
   every real first-time visitor) actually takes.

## Static / build-time gates

10. `npx eslint .` reports the new `I18N-1` warning on a genuinely
    hardcoded JSX string, and reports zero such warnings on either
    fully-extracted file (`PublicLayout.jsx`, confirmed directly).
11. `npm run i18n:coverage` fails with a specific, actionable message
    when a real key is missing from the Hindi file (verified by
    temporarily removing one and restoring it) or when the pseudo-locale
    is stale relative to English; passes clean otherwise.
12. `npm run build` succeeds, and the build output shows the lazy
    Hindi/pseudo locale files as separate chunks, distinct from the
    entry chunk English is bundled into (confirmed directly in `dist/`).
13. `npx size-limit` passes at the newly-measured budget.

## Deliberately not covered (see REQ150's own scope note)

- The remaining ~90 unextracted pages, and the remaining steps of the
  booking wizard — explicitly out of scope for this slice.
- A live execution of `frontend/e2e/pseudo-locale-overflow.spec.js` — no
  browser-automation tool was available this session. The spec is
  written and will run the first time this environment has one.
- Translation quality review by a native Hindi speaker beyond the
  author's own — logged as a reasonable follow-up, not a blocker (the
  same bar every other AI-authored string in this codebase has been
  held to).
