---
name: feature-lifecycle
description: Use when starting a new requirement, improvement, or bug; advancing an existing work item through plan/test/results; or reporting the status of a feature. Triggers on phrasing like "start bug: ...", "start requirement: ...", "advance REQ057 to testing", "status of billing-export", "what's the state of <feature>". Carries the full requirement -> plan -> test-suggestion -> test-plan -> test-result -> context bundle loop so this doesn't need re-explaining each session.
---

# Feature lifecycle

This repo uses a five-root, feature-scoped documentation architecture. This skill is the standalone operating manual for it — assume nothing else about the setup is in context when this runs. Full schema/ID reference: `REFERENCE.md` (sibling file).

## The architecture, in one picture

```
requirements/<feature>/{requirement,improvement,bug}/*.md
implementation-plans/<feature>/{requirement,improvement,bug}/*.md
test-suggestions/<feature>/{requirement,improvement,bug}/*.md   (unreviewed)
test-plans/<feature>/{requirement,improvement,bug}/*.md          (reviewed/approved)
test-results/<feature>/{requirement,improvement,bug}/*.md
context/<feature>-<date>/manifest.md    <- links the chain, doesn't duplicate it
context/archive/                        <- aged-out bundles (see archive-sweep.mjs)
test-results/_archive/                  <- superseded results (see archive-sweep.mjs)
```

Every `feature` slug is kebab-case and identical across all five roots. Every document opens with mandatory YAML frontmatter — see `REFERENCE.md` for the exact keys and the ID prefix table (`REQ###`/`IMPR###`/`BUG###`/`PLAN###`/`TP###`/`TR###`/`TS###`).

**Read order**: the five root `README.md` indexes and `context/README.md` are authoritative for "what exists / what's current." Only open `context/archive/README.md` or `test-results/_archive/` when the active tree doesn't answer the question — e.g. tracing why an old decision was made, or auditing a historical run. Never treat an archived doc as current, and never cite one as evidence a feature is "done" today.

Before anything else in a session, run `node scripts/archive-sweep.mjs`. It's a dry run by default (prints planned moves, changes nothing); re-run with `--apply` if it reports pending moves. It's a silent no-op when nothing has aged out — don't narrate a no-op to the user.

## Operating loop

### 1. Classify and slug
Decide: `requirement` (new capability), `improvement` (enhancement to something existing), or `bug` (defect). Then pick a `feature` slug — **reuse an existing one** if this work belongs to a feature already present in any of the five roots (check `<root>/README.md` first); only mint a new slug when the work genuinely doesn't fit anywhere existing. Never invent a feature that isn't evidenced by the request or the code.

### 2. Write the requirement
Create `requirements/<feature>/<category>/<ID>-<feature>-<yyyy-mm-dd>-<short-title>.md` with a fresh `REQ###`/`IMPR###`/`BUG###` id (next unused number for that prefix — scan existing frontmatter across `requirements/`, don't guess) and full frontmatter (`status: draft`, `parent: null`, `related: []`). Then regenerate indexes: `node scripts/rebuild-indexes.mjs`.

### 3. Plan before implementing
For anything non-trivial: enter plan mode, explore the actual code first, then record the plan in `implementation-plans/<feature>/<category>/` with a fresh `PLAN###` id and `parent` set to the requirement's id. Rebuild indexes.

### 4. Suggest, then promote tests
Draft candidate tests into `test-suggestions/<feature>/<category>/` (`TS###`, `parent` = the requirement id). These are **unreviewed** — never treat a test-suggestion as approved, never implement against one as if it were a spec. Only after a human reviews it does it get promoted into `test-plans/<feature>/<category>/` as a new `TP###` doc with `parent` set. Rebuild indexes after each write.

### 5. Implement and record results
Implement against the approved test-plan. Run it, then write `test-results/<feature>/<category>/` (`TR###`, `parent` = the requirement id) with pass/fail and the commit SHA. Rebuild indexes.

### 6. Keep the bundle honest
At every step above, create or update `context/<feature>-<date>/manifest.md` — frontmatter `feature`/`date`/`ids`/`status`, body links (never copies) to every doc in the chain that exists so far. The bundle should never describe a chain longer than what's actually written. `node scripts/rebuild-indexes.mjs` regenerates `context/README.md` and `context/archive/README.md` from whatever bundles exist — don't hand-edit those two files.

### 7. Gate "done" on a real passing result
Never set a requirement's `status` to `done` (or the bundle's) until a `test-results` doc exists, is linked from the bundle, and actually shows a passing outcome. An implementation without a recorded, passing test-result is `in-progress`, not `done`, no matter how confident the change looks.

### 8. Indexes are not optional
Every add or move gets `node scripts/rebuild-indexes.mjs` in the same turn. A stale index is worse than no index — don't defer this to "later in the session."

## Reporting status

"Status of `<feature>`" means: open `context/README.md`, find that feature's bundle(s), open the manifest, and summarize what exists (requirement? plan? suggestions reviewed into plans yet? results? passing?) and what's missing — state it plainly (e.g. "has a requirement and a plan, no tests written yet, so not done"). Don't infer completeness from the presence of a `context/` bundle alone — the bundle links what exists, it doesn't imply the chain is finished. If `parent: unknown` shows up on a downstream doc, say so rather than silently treating it as linked.

"Advance `<ID>` to testing" means: find that id via the relevant root README (grep frontmatter if the index is stale), move it along the loop step above appropriate to its current state (e.g. a `TS###` gets reviewed and promoted to a new `TP###`; a `TP###` with no result gets implemented and a `TR###` written), and update the bundle + indexes.

## Constraints, restated plainly

- Frontmatter is mandatory: `id`, `type`, `feature`, `created`, `updated`, `status`, `parent`, `related`. If any field can't be confidently inferred, write `unknown` (or `null` only where the schema says null is valid, e.g. a top-level requirement's `parent`) — never guess a status or fabricate an id to fill the field.
- `requirements/`, `implementation-plans/`, `test-plans/`, `test-suggestions/` are never touched by the archive sweep — they're living specs, age doesn't imply staleness.
- Only `context/` bundles (`done`/`wont-do` + 15+ days old) and `test-results/` (15+ days old + not the latest for its group) ever get archived, and only by running `scripts/archive-sweep.mjs`, never by hand-moving files.
- Don't rename an existing filename/slug without flagging it first — renames break links and git history.

## Usage examples

- "start bug: CSV export drops the last row" → classify as `bug`, find/confirm the feature slug (e.g. `billing-export`), write `requirements/billing-export/bug/BUG###-...md`, rebuild indexes.
- "advance REQ057 to testing" → locate REQ057, check its bundle for what already exists downstream, move it to the next unfinished step (write test-suggestions if none exist yet, or promote to a test-plan if suggestions are already reviewed).
- "status of billing-export" → open `context/README.md`, find the `billing-export-*` bundle(s), report what's done vs. missing per the chain, not just "it has a bundle."

See `REFERENCE.md` for the full frontmatter schema, ID-prefix table, and status enum.
