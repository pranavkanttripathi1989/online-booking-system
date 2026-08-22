# Claude Code — Feature-Scoped Docs Architecture: Setup & Enforcement Prompt (v4)

**How to use:** open `claude` in the repo root, then paste the prompt in the section below as one message. It's written to *conform to* the structure you've already built rather than recreate it — Step 0 makes Claude Code verify reality before changing anything.

---

## The architecture this enforces

```
requirements/                          implementation-plans/       (same shape)
├── README.md              ← index     test-plans/                 (same shape)
├── <feature-name>/                    test-suggestions/           (same shape)
│   ├── README.md          ← index     test-results/               (same shape + _archive/)
│   ├── requirement/  *.md
│   ├── improvement/  *.md
│   └── bug/          *.md
└── ...

context/
├── README.md                          ← ACTIVE bundles  (imported by CLAUDE.md)
├── <feature>-<yyyy-mm-dd>/
│   └── manifest.md                    ← links the full chain for one work item
└── archive/
    ├── README.md                      ← ARCHIVED bundles (read on demand only)
    └── <feature>-<yyyy-mm-dd>/manifest.md
```

**ID scheme** (deliberately collision-free): `REQ###` requirement · `IMPR###` improvement · `BUG###` bug · `PLAN###` implementation plan · `TP###` test plan · `TR###` test result · `TS###` test suggestion. Every downstream doc carries its parent `REQ###`/`BUG###`, which is what makes the chain traceable.

## Two design notes before you run it

**1. The archive rule, refined.** You picked logs-only archiving, which avoids the real trap: auto-archiving a requirement after 15 days would hide the *current spec* from Claude precisely when it's needed. So the sweep only touches `test-results/` and `context/` bundles. I've added two guardrails on top:

- **Never archive an open item.** A `context/` bundle only archives if its status is `done`/`wont-do` **and** it's 15+ days old. An in-progress bundle stays active at any age.
- **Always keep the latest result per requirement active.** Otherwise "is REQ057 actually tested?" becomes unanswerable without digging through archive. Older, superseded runs archive normally.

**2. The sweep is a script, not a judgment call.** You asked for it to run at session start. Having Claude eyeball file dates every session is slow, costs tokens, and is non-deterministic. So the prompt has Claude Code write a small deterministic script and CLAUDE.md just tells it to run that script first. Automatic every session, but reliable — and dry-run-first so it never silently moves things.

---

## The prompt to paste

````
This repo has a feature-scoped documentation architecture. My job for you is to VERIFY it, COMPLETE it, and then ENFORCE it on all future work. Follow the steps in order. Stop and show me your findings at each STOP point before continuing.

The intended architecture:

- Five doc roots: `requirements/`, `implementation-plans/`, `test-plans/`, `test-results/`, `test-suggestions/`.
  (If implementation plans currently live inside `documentations/` instead of a top-level `implementation-plans/`, tell me in Step 0 — do NOT move them until I confirm.)
- Inside each root: one directory per feature, `<feature-name>/` (kebab-case slug).
- Inside each feature directory: three category subdirectories — `requirement/`, `improvement/`, `bug/` — each containing markdown files.
- Plus `context/` at the repo root holding per-work-item bundles, and `context/archive/` for aged-out bundles.

=== STEP 0 — Discover and verify (STOP after this) ===
Do not create or move anything yet. Report:
a) The actual tree of all five roots to a depth of 3, plus `context/` if it exists.
b) Which feature directories exist in each root, and where the three category subdirectories are present vs missing.
c) The naming pattern actually used by existing markdown files, and whether files already carry YAML frontmatter.
d) Whether implementation plans live in `implementation-plans/` or `documentations/`.
e) Any file that does not fit the architecture (loose files at a root level, features present in one root but absent in others, inconsistent slugs like `billing_export` vs `billing-export`).
f) Whether `.claude/skills/` already contains a skill that overlaps with this workflow.
Present (e) as a proposal list — I will approve before you touch anything.

=== STEP 1 — Conform the structure ===
After I approve Step 0:
- Create only the MISSING feature directories and `requirement/` `improvement/` `bug/` subdirectories. Never delete or overwrite an existing file.
- Normalize feature slugs to kebab-case, but list every rename before doing it — renames break links and git history, so they need my explicit sign-off.
- Add a `.gitkeep` to any category subdirectory that is legitimately empty, so the structure survives git.
- Do not invent features or documents that aren't evidenced by existing files or code.

=== STEP 2 — Establish the document contract ===
Every markdown document under the five roots must open with YAML frontmatter. Use exactly these keys:

---
id: REQ057                    # REQ### | IMPR### | BUG### | PLAN### | TP### | TR### | TS###
type: requirement             # requirement | improvement | bug | plan | test-plan | test-result | test-suggestion
feature: billing-export       # kebab-case slug, identical across all five roots
created: 2026-08-20
updated: 2026-08-20
status: draft                 # draft | approved | in-progress | blocked | done | wont-do
parent: null                  # downstream docs: the REQ###/IMPR###/BUG### they serve
related: []                   # ids of linked docs (plan, test plans, results)
---

Filename convention: `<ID>-<feature-slug>-<yyyy-mm-dd>-<short-title>.md`
(e.g. `REQ057-billing-export-2026-08-20-csv-export.md`)

Backfill frontmatter into existing documents by inferring values from filename, git history (`git log --diff-filter=A --format=%as -1 -- <file>` for the created date), and content. Where you cannot infer a field confidently, set it to `unknown` and list it for me to fill in — do not guess a status or invent an ID.

=== STEP 3 — Build two levels of index ===
For each of the five roots:
- `<root>/README.md` — a table of every feature in that root: feature, counts by category (requirement / improvement / bug), open vs done, most recent activity date, and a relative link to the feature's own README. Sorted by most recent activity descending.
- `<root>/<feature>/README.md` — a table of every document in that feature: ID, type, title, status, created, updated, parent, and a relative link. Group by category, sort by date descending within each group.

Root READMEs are what CLAUDE.md loads every session, so keep them tight — counts and links, not prose summaries.

=== STEP 4 — Build the context/ bundles ===
- `context/<feature>-<yyyy-mm-dd>/manifest.md` — one bundle per work item (normally one per REQ/IMPR/BUG). Frontmatter carries `feature`, `date`, `ids` (every doc ID in the chain), and `status`. Body holds a one-paragraph status summary plus relative LINKS (never copies) to: the requirement/improvement/bug doc, its implementation plan, its test-suggestions, its approved test-plans, and its test-results.
- `context/README.md` — index of ACTIVE bundles only: bundle path, feature, date, IDs, status. Grouped by feature, date descending.
- `context/archive/README.md` — same table shape, for archived bundles.
- Backfill bundles for existing work only where you can confidently link the chain. Anything ambiguous goes in `context/README.md` under an "Incomplete — needs review" section rather than being guessed at.

=== STEP 5 — Write the archive sweep ===
Create `scripts/archive-sweep.mjs` (Node, no external dependencies). Rules, exactly:

ARCHIVE a `context/<feature>-<date>/` bundle when BOTH hold:
  - its frontmatter `status` is `done` or `wont-do`, AND
  - `date` is 15 or more days before today.
  Move it to `context/archive/<feature>-<date>/`.
  NEVER archive a bundle whose status is draft, approved, in-progress, blocked, or unknown — regardless of age.

ARCHIVE a `test-results/` document when BOTH hold:
  - it is 15 or more days old, AND
  - it is NOT the most recent result for its `parent` requirement ID.
  Move it to `test-results/_archive/<feature>/<category>/`, preserving the category subdirectory.
  ALWAYS keep the latest result per parent ID in the active tree, whatever its age — otherwise current test coverage becomes invisible.

NEVER touch `requirements/`, `implementation-plans/`, `test-plans/`, or `test-suggestions/`. Those are living specs; age says nothing about whether they're current.

Script requirements:
  - Default to DRY RUN, printing the planned moves. Only move files when passed `--apply`.
  - Use `git mv` when the repo is clean so history follows the file; fall back to a plain move otherwise.
  - After moving, update every affected index (root READMEs, feature READMEs, `context/README.md`, `context/archive/README.md`) so no index ever points at a stale path.
  - Print a one-line summary: counts moved, counts skipped, and any anomaly (missing frontmatter, unparseable date, unknown status).
  - Exit 0 when there is nothing to do, and print nothing noisy in that case.
  - Derive "today" from the system clock; never hardcode a date.

Run it in dry-run mode and show me the output before we wire it into CLAUDE.md.

=== STEP 6 — Wire CLAUDE.md ===
Add or update this section. Do not paste document content into CLAUDE.md — only these pointers and rules.

## Project context

At the start of a session, run `node scripts/archive-sweep.mjs` (add `--apply` when it reports pending moves). It is a no-op when nothing has aged out.

Read these indexes before planning or implementing anything, then open the specific feature README and documents you need:
@requirements/README.md
@implementation-plans/README.md
@test-plans/README.md
@test-results/README.md
@test-suggestions/README.md
@context/README.md

Read-order rule: ACTIVE documents are authoritative. Consult `context/archive/README.md` and `test-results/_archive/` ONLY when the active tree does not answer the question (e.g. tracing why a decision was made, or auditing a historical test run). Never treat an archived document as current.

Directory contract:
- `<root>/<feature-name>/{requirement,improvement,bug}/*.md` across all five roots.
- The same `feature` slug and the same parent ID thread a work item through every root and its `context/` bundle.
- Frontmatter (`id`, `type`, `feature`, `created`, `updated`, `status`, `parent`, `related`) is mandatory on every document.

Working loop for all future work in this repo:
1. Classify the incoming work as requirement, improvement, or bug, and identify its feature slug (reuse an existing slug; only create a new feature directory when the work genuinely belongs to no existing feature).
2. Write the doc into `requirements/<feature>/<category>/` with a fresh ID and full frontmatter, then update that feature's README and the root README.
3. Enter plan mode and explore the code BEFORE writing any implementation. Record the plan in `implementation-plans/<feature>/<category>/` with `parent` set to the requirement ID.
4. Draft candidate tests into `test-suggestions/<feature>/<category>/`. These are UNREVIEWED — never treat a test-suggestion as an approved test. Promote to `test-plans/<feature>/<category>/` (new TP### ID, `parent` set) only after human review.
5. Implement, then run the approved test-plans and record outcomes in `test-results/<feature>/<category>/` with pass/fail and the commit SHA.
6. Create or update `context/<feature>-<date>/manifest.md` at every step above so the bundle never drifts from reality.
7. Do not set a requirement's status to `done` until a `test-results` document with a passing outcome exists and is linked from the bundle.
8. Keep every index current in the same change that adds or moves a document — a stale index is worse than no index.

=== STEP 7 — Package as a skill ===
Create `.claude/skills/feature-lifecycle/SKILL.md` (if Step 0 found an overlapping skill, tell me and propose merging rather than creating a duplicate). It must:
- Describe its triggers clearly: starting a new requirement/improvement/bug, advancing an existing item to plan/test/results, or reporting the status of a feature.
- Restate the full working loop from Step 6 as standalone operating instructions — assume this setup prompt is NOT in context when the skill runs.
- Encode the directory contract, ID scheme, frontmatter schema, and the active-before-archive read order.
- Include usage examples: "start bug: CSV export drops the last row", "advance REQ057 to testing", "status of billing-export".
- Stay under roughly 200 lines; move any long reference material into a sibling file the skill links to rather than inlining it.

=== STEP 8 — Verify, then summarize (STOP) ===
Before declaring this done, actually verify — do not assert it:
- Every document under the five roots has complete, valid frontmatter (list any that don't).
- Every ID is unique repo-wide.
- Every `parent` and `related` ID resolves to a real document.
- Every relative link in every index and manifest resolves to an existing file (check them, don't assume).
- Every feature slug is identical across the roots where it appears.
- `node scripts/archive-sweep.mjs` runs clean and its dry-run output matches the rules in Step 5.
Then show me: the CLAUDE.md diff, the new/changed indexes, the sweep script and its dry-run output, the skill file, and a list of everything you flagged as `unknown` or ambiguous for me to resolve.
````

---

## After it's set up

You won't paste this again. Say things like *"start bug: CSV export drops the last row"* or *"status of billing-export"* and the `feature-lifecycle` skill carries the loop — correct feature directory, correct category, frontmatter, indexes, bundle, all of it.

Two habits worth keeping: skim the Step 8 "unknown/ambiguous" list when it first appears (those are inference gaps only you can close), and glance at the sweep's dry-run output occasionally — if it ever proposes moving something you consider current, that's a status field that needs correcting, not a rule that needs loosening.
