# feature-lifecycle — schema reference

Full detail backing `SKILL.md`. Load this when you need the exact field/ID rules, not for the operating loop itself.

## Frontmatter schema

Every document under the five roots (`requirements/`, `implementation-plans/`, `test-plans/`, `test-results/`, `test-suggestions/`) opens with:

```yaml
---
id: REQ057                    # REQ### | IMPR### | BUG### | PLAN### | TP### | TR### | TS###
type: requirement             # requirement | improvement | bug | plan | test-plan | test-result | test-suggestion
feature: billing-export       # kebab-case slug, identical across all five roots
created: 2026-08-20
updated: 2026-08-20
status: draft                 # draft | approved | in-progress | blocked | done | wont-do
parent: null                  # the REQ###/IMPR###/BUG### this doc serves; null only for a top-level requirement doc, otherwise unknown until resolvable
related: []                   # ids of linked docs (plan, test plans, results) in the same feature
---
```

## ID prefixes

| Root | `type` value | ID prefix | Notes |
|---|---|---|---|
| `requirements/` | `requirement` / `improvement` / `bug` | `REQ###` / `IMPR###` / `BUG###` | prefix follows the category subfolder the doc lives in |
| `implementation-plans/` | `plan` | `PLAN###` | |
| `test-plans/` | `test-plan` | `TP###` | reviewed/approved only |
| `test-results/` | `test-result` | `TR###` | |
| `test-suggestions/` | `test-suggestion` | `TS###` | unreviewed by definition |

IDs are sequential per prefix, repo-wide, never reused. Before minting a new one, scan existing frontmatter for the highest number under that prefix (e.g. `grep -rhoE '^id: TP[0-9]+' test-plans/` ) rather than guessing — the root README's document count is a hint, not authoritative, since it doesn't reflect archived docs.

## Filename convention

`<ID>-<feature-slug>-<yyyy-mm-dd>-<short-title>.md`, e.g. `REQ057-billing-export-2026-08-20-csv-export.md`. Existing pre-migration files may not follow this exactly (they were backfilled, not renamed, to avoid breaking links/history) — match it for anything new.

## Status enum

`draft` → `approved` → `in-progress` → `done`, with `blocked` and `wont-do` as off-ramps at any point. A `test-suggestion` starts and often stays `draft`/`in-progress` until promoted — promotion creates a *new* `TP###` doc, it doesn't flip the suggestion's own status to `approved`.

## Directory contract

```
<root>/<feature-name>/{requirement,improvement,bug}/*.md
```

Every feature directory has all three category subdirectories, even when empty (`.gitkeep` keeps empty ones tracked). The category a document lives in reflects what kind of downstream work item it's testing/planning/documenting, not what root it's in — a `test-plan` sitting in `test-plans/billing-export/bug/` is specifically about a bug fix for `billing-export`, not the feature's base build.

## context/ bundles

`context/<feature>-<date>/manifest.md`:

```yaml
---
feature: billing-export
date: 2026-08-20
ids: [REQ057, PLAN012, TS040, TP041, TR039]
status: in-progress
---
```

Body: a one-paragraph status summary, then relative links (never copied content) grouped by root, to every doc that exists so far in the chain for that feature. One bundle per feature is normal; if a `date` in the frontmatter needs to change because the bundle's most-recent doc changed, rename the directory (`context/<feature>-<new-date>/`) rather than leaving a stale date — then rebuild indexes.

## Scripts

- `node scripts/rebuild-indexes.mjs` — regenerates every `README.md` (root-level and per-feature) plus `context/README.md`/`context/archive/README.md`, purely from frontmatter it scans off disk. Safe to run any time; run it after every write.
- `node scripts/archive-sweep.mjs [--apply]` — dry run by default. Moves `context/` bundles to `context/archive/` (status `done`/`wont-do` + 15d+ old) and superseded `test-results/` docs to `test-results/_archive/<feature>/<category>/` (15d+ old + not the latest for its group — grouped by real `parent` id when one exists, else by `feature`). Never touches `requirements/`, `implementation-plans/`, `test-plans/`, `test-suggestions/`. Calls `rebuild-indexes.mjs` automatically after `--apply` moves anything.
