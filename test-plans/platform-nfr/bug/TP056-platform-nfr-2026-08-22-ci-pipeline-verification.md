---
id: TP056
type: bug
feature: platform-nfr
created: 2026-08-22
updated: 2026-08-22
status: approved
parent: BUG008
related: [F-26, F-22, F-29, PLAN029, TR055]
---

# TP056 — CI pipeline and prerequisite verification

## Suggestion stage

Skipped, per the `CLAUDE.md` conditional rule. `00-foundation-hardening.md` §6
prescribes the job list and both prerequisites explicitly; nothing here is
exploratory.

## The honesty constraint on this plan

CI cannot be proven from a developer machine. It can only be proven that **every
command the workflow runs passes locally** and that the workflow file is
structurally valid. TC-16 records what remains unproven rather than implying a
green pipeline that has never executed.

## F-22 — frontend lint

| ID | Case | Expected |
|---|---|---|
| TC-01 | `npm run lint` before the fix | fails immediately on `Invalid option '--ext'` — reproduces the defect |
| TC-02 | after registering `eslint-plugin-react` | the false-positive `no-unused-vars` count collapses (a real drop, not a rule disable) |
| TC-03 | remaining errors after the plugin fix | exactly 12, all `jsx-a11y` |
| TC-04 | each `no-autofocus` site inspected individually | every one is legitimate focus management; recorded per site |
| TC-05 | `npm run lint` after the fix | **exit 0** |
| TC-06 | unused `eslint-disable` directives | surfaced and removed — they existed only because the script never ran |
| TC-07 | frontend still builds and tests | `npm run build` and `npm test` pass |

TC-02 matters: a drop in warnings is only meaningful if it comes from correcting
the analysis rather than from switching a rule off.

## F-29 — backend suite safe to run unattended

| ID | Case | Expected |
|---|---|---|
| TC-08 | bare `npm test` before the fix | OOM-killed, exit 137 |
| TC-09 | integration suite without `--forceExit`, after the Redis hook | completes and exits |
| TC-10 | **direct handle probe** after `app.close()` | only stdout and stderr remain — proves no leak, and justifies `forceExit` as evidence-backed rather than a shrug |
| TC-11 | `account`/`staff` in the full run | no timeout |
| TC-12 | production bcrypt cost | default 12; **throws** if `NODE_ENV=production` and cost < 12; rejects malformed values |
| TC-13 | `npm test` after the fix | green, and measurably faster than the multi-worker run |

TC-10 is the one that keeps this honest. `--forceExit` is only defensible if
there is nothing left to exit for, and that has to be shown, not asserted.

## CI

| ID | Case | Expected |
|---|---|---|
| TC-14 | workflow YAML parses | 5 jobs, correct steps and `runs-on` |
| TC-15 | every workflow command runs locally | each passes with the same invocation the workflow uses |
| TC-16 | commands that CANNOT be verified locally | listed explicitly in `TR055`, not silently assumed |

## The structural gate

| ID | Case | Expected |
|---|---|---|
| TC-17 | gate detects fabricated pages | finds pages rendering data with no route to real data |
| TC-18 | gate is conservative | no false positives from presentational components taking props/context |
| TC-19 | gate passes on the current tree | exit 0 with every finding allowlisted and annotated |
| TC-20 | gate fails on a NEW fabricated page | non-zero exit — the actual regression guard |
| TC-21 | allowlist cannot go stale | prints a note when an entry no longer looks fabricated |

## Regression

| ID | Case | Expected |
|---|---|---|
| TC-22 | full backend unit suite | green, including the new bcrypt-cost tests |
| TC-23 | tenancy matrix still green | 120/120 — the Redis lifecycle change touches app shutdown |
| TC-24 | backend eslint + `tsc --noEmit` + `prisma validate` | clean |

## Out of scope

e2e in CI (F-27/F-28), wiring the 10 fabricated pages, the 197 frontend
warnings, the 33 lines of schema drift.
