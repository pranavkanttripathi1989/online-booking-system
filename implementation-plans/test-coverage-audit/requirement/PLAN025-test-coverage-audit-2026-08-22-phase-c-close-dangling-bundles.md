---
id: PLAN025
type: requirement
feature: test-coverage-audit
created: 2026-08-22
updated: 2026-08-22
status: done
parent: REQ013
related: [REQ006]
---

# Implementation plan — Phase C: close or justify the dangling `in-progress` context bundles (`REQ013` Finding 4), resolve the archive-infrastructure question (Finding 5)

**Closed 2026-08-22.** Written and executed together this pass, same rationale as `PLAN024` — `REQ013` Finding 4 already named every bundle and the two closure outcomes available (close, or justify with a note); no separate up-front plan would have added anything a direct review of each bundle didn't already answer.

## What this phase actually did

### Finding 4 — 11 dangling `in-progress` bundles, reviewed one by one

1. **`communications-policies-2026-08-20` (`REQ006`)** — closed for real. `REQ006`'s own frontmatter was still `in-progress` with two explicit open questions (Notification Templates vs. `admin/EmailTemplates.jsx`; Policies' Security-settings tab vs. `REQ005`). Both were in fact resolved on 2026-08-21 as their own dedicated requirements — `REQ011` (Notification Templates rebuilt onto the real `email-templates` module) and `REQ012` (Security settings confirmed a distinct, non-duplicate scope and built for real) — plus the SMS-vendor and cancellation-slider blockers by `REQ008`/`REQ010`. Nobody had gone back to flip `REQ006` itself to `done` once its dependents landed. Fixed: `REQ006` and its bundle are now `status: done`, with a closing note naming each resolving requirement.

2. **Six mock-era bundles were `in-progress` purely because a `test-suggestions/` doc's own frontmatter `status` field was never flipped, not because any real work remained** — `auth-2026-08-18`, `phase4-5-increment3-2026-08-17`, `phase4-backend-integration-2026-08-17`, `analytics-finances-2026-04-02`, `calendar-2026-04-02`, `clinician-patients-2026-04-02`, `dashboard-2026-04-02` (7, not 6 — corrected count). In every one of these, the paired `test-plans`/`test-results` docs are already `approved`/`done`, proving the actual test cycle completed; only the `test-suggestions` doc sat un-promoted, exactly the pattern `REQ013` Finding 6 describes (suggestion/plan/result written together in one pass with no real review gate, so nothing ever flips the suggestion's own status). Flipped each bundle's `status` to `done` with a note citing Finding 6 as the reason, **without** rewriting the underlying `test-suggestions` doc's own status field — that field is Finding 6's/Phase D's decision to make (whether the suggestion stage gets retroactively promoted or the process itself changes), not something to quietly resolve as a side effect of a hygiene pass.

3. **Two bundles were reviewed and left `in-progress` on purpose, because they already carry the exact justification Finding 4(b) asks for** — `clinician-availability-2026-08-19` (already has a 2026-08-22 addendum noting `TP007` hasn't been rewritten to the real-backend standard `TP011` now has, flagged as real follow-up) and `organization-onboarding-2026-08-17` (already has a 2026-08-22 note from Phase B explaining `TS025` is deliberately not promoted, since no self-serve onboarding backend exists at all — a product-scope decision, not a doc gap). No edit needed; re-confirmed both notes still hold and nothing has changed since they were written.

4. **`appointments-2026-08-18` was already `done`** (closed in Phase A, `PLAN023`) and needed no action this phase.

Net: of the 11 originally-dangling bundles, 8 closed to `done` this phase (1 real requirement closure + 7 process-drift hygiene closures), 2 confirmed already correctly justified as still-open, 1 already closed in Phase A. Zero bundles are now `in-progress` without either a `done` status or an explicit standing justification.

### Finding 5 — archive infrastructure

Ran `node scripts/archive-sweep.mjs` (dry run) before making any change: it reported 2 bundles (`booking-wizard-2026-03-19`, `clinicians-2026-04-02`) already eligible to archive — both `done`, both well past the 15-day threshold (156 and 142 days respectively) — and had clearly never actually been applied in any prior session, despite `CLAUDE.md`'s session-resume protocol instructing exactly that at the start of every session. This answers Finding 5's open question directly: the sweep mechanism itself is correct and was never the problem; it simply hadn't been run with `--apply` in practice. Ran `node scripts/archive-sweep.mjs --apply`, which archived those 2 plus the 4 more that this phase's own bundle-status closures made newly eligible (`analytics-finances-2026-04-02`, `calendar-2026-04-02`, `clinician-patients-2026-04-02`, `dashboard-2026-04-02` — each `done` as of this phase and 142 days past their bundle date) — 6 bundles moved into `context/archive/` in one pass, and `scripts/rebuild-indexes.mjs` ran automatically afterward to keep every root README and `context/README.md` in sync.

For `test-results/_archive/` specifically: confirmed by reading the sweep script that a `test-results/` doc only archives when it is **both** superseded (not the newest in its group) **and** 15+ days old. Almost every feature in this repo has exactly one `test-results/` doc per group — superseding history has always happened by editing that file in place (e.g. Phase A's `TR003`/`TR010` rewrite) rather than by adding a second, dated file next to it — so the "superseded, not latest" condition has never had anything to fire on. This is expected behavior given how this repo's test-results docs are actually maintained, not a bug in the sweep and not evidence the directory should never exist. Created `test-results/_archive/README.md` as a real, structurally-consistent stub (matching `context/archive/README.md`'s existing pattern) so `CLAUDE.md`'s read-order rule, which names this path directly, resolves to a real location rather than a 404 — populated for real the first time the sweep actually has something superseded and old enough to move there.

## Verification

This phase changes documentation/process state, not application behavior, so there is no `test-results/` entry in the usual sense — the acceptance criteria (Finding 4: every dangling bundle closed-or-justified; Finding 5: a real decision recorded on the archive path) are self-evidencing in the state produced:
- `grep -c "in-progress" context/README.md` before this phase: 11 (10 dangling bundles + the `test-coverage-audit` meta-bundle itself). After: 3 (`test-coverage-audit` meta-bundle, still open pending Phase D; `clinician-availability-2026-08-19` and `organization-onboarding-2026-08-17`, both deliberately justified as open per point 3 above).
- `node scripts/archive-sweep.mjs` (dry run, re-run after `--apply`) reports 0 pending moves and 0 anomalies — confirms the apply left the tree in the state the script itself considers fully caught up.
- `node scripts/rebuild-indexes.mjs` ran clean as part of the `--apply` step (183 docs, 5 roots, no errors) — every root `README.md` and `context/README.md` reflect the post-closure state, not a manually-edited approximation of it.
- `test-results/_archive/README.md` exists and documents why it's currently empty, closing the literal "does this directory exist" question Finding 5 raised.
