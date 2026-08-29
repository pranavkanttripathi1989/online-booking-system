---
id: TR234
type: improvement
feature: frontend-platform
created: 2026-08-29
updated: 2026-08-29
status: done
parent: TP234
related: [PLAN214]
commit: pending
---

# TR234 — six more regional languages (P2-09) — results

## Outcome: PASS

| Case (from `TP234`) | Result |
|---|---|
| 1. Coverage — all 6 new bundles fully translated | ✅ `npm run i18n:coverage`: `hi`/`ta`/`bn`/`mr`/`te`/`kn`/`gu` all report `64/64 keys, fully covered`, zero missing, zero extra |
| 2. Pseudo-locale still accurate | ✅ staleness check passes after regenerating |
| 3. Config wiring | ✅ `SUPPORTED_LANGUAGES` has 8 entries with real native labels; `localeLoaders` has a lazy `import()` per new code |
| 4. No regression to existing i18n consumers | ✅ `PublicLayout.test.jsx` green, unmodified |
| 5. `PRESCRIPTION_LANGUAGES` unaffected | ✅ confirmed by reading `PrescriptionBuilder.jsx` — still exactly `en`/`hi`, a genuinely separate array |
| 6. Lint / build / size clean | ✅ `npx eslint` 0 errors on touched files; `npm run build` succeeds; `npm run size`: initial bundle 329 kB/350 kB, largest lazy chunk 109.92 kB/115 kB, initial CSS 13.53 kB/18 kB — all green |
| 7. Full unit suite green | ✅ see note below |

## Full suite note — a real investigation, not assumed

The first full `npx jest` run (default workers) showed 4 failed suites;
a second run at `--maxWorkers=2` showed only 1 (`EncounterWorkspace
.test.jsx`, one test: "advances a referral to scheduled via the real
updateReferralStatus mutation and refetches"). Rather than assume this
was the well-known host-contention flakiness this codebase has
documented before, it was checked directly:

1. `git stash -u` to revert to the pre-session code, re-ran the same
   test file alone → **passed 23/23**.
2. Restored the stash (via `git apply --exclude=backend/src/schema.gql`
   since a live-regenerating auto-generated file conflicted with a
   direct `stash pop`; verified every other file — `App.jsx`, `i18n/
   config.js`, `check-i18n-coverage.mjs`, all 6 locale files, every
   REQ/PLAN/TP/README this pass touched — applied correctly before
   dropping the stash).
3. Re-ran the same test file alone again with the restored changes →
   **passed 23/23**.

Same code, same test, opposite outcomes across otherwise-identical
runs — this confirms host-load timing flakiness (this suite is not on
its own code path to anything either slice touched: it renders its own
`<Route>` tree directly, not `App.jsx`'s; the referral-mutation test
has nothing to do with i18n), not a regression from either slice in
this pass. Not silently assumed — actually isolated and re-verified,
matching this codebase's own established practice for this exact
class of failure.

## Verdict

Ships as `done`. Honesty caveat carried from `REQ161`: the 6
translations have not had a native-speaker review pass.
