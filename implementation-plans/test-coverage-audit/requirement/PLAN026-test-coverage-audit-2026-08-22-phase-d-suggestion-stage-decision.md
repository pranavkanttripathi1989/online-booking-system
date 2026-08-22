---
id: PLAN026
type: requirement
feature: test-coverage-audit
created: 2026-08-22
updated: 2026-08-22
status: done
parent: REQ013
related: [REQ006]
---

# Implementation plan — Phase D: decide and record whether the test-suggestions stage is still required for new features (`REQ013` Finding 6)

**Closed 2026-08-22.** This phase is a single process decision, not a code change — per `CLAUDE.md` Hard Rule 10 ("genuine ambiguity → stop and ask"), the choice between the two resolutions Finding 6 proposed was put to the user directly rather than picked unilaterally.

## What this phase actually did

Finding 6 found that the mock-era generation (`TP001`–`TP038`) paired a `test-suggestions`/`test-plans`/`test-results` doc under one ID in a single pass with no real review gate, and every real-era feature since (`communications-policies`, `organization-branding`, `patient-payments`, `products`, `security`) has zero `test-suggestions/` entries at all — going straight from a requirement to an already-`approved` test-plan. This contradicts `CLAUDE.md`'s documented working loop, which still describes the suggestion stage as a universal step 4 for every feature.

Presented the user with three resolutions:
1. Restore the suggestion stage as mandatory for all new features (treat the drift as a mistake to correct).
2. Make it conditional — required only for genuinely exploratory/ambiguous features, skippable for well-scoped slices against an already-proven pattern.
3. Remove the suggestion stage from the working loop entirely.

**Decision (explicit user choice): option 2, conditional.** Recorded in `context/open-questions.md` #9 and codified into `CLAUDE.md`'s working loop step 4: a genuinely exploratory or ambiguous feature (a new domain, an unclear contract, first-of-its-kind UX) still needs a `test-suggestions/` doc drafted and human-reviewed before a `test-plans/` doc is promoted from it; a well-scoped slice against an already-proven pattern (a routine CRUD domain matching an existing contract, a bug fix, a small additive change) may skip straight to a test-plan — the human-review gate before treating any test-plan as approved is unaffected either way, only the intermediate unreviewed-suggestion artifact becomes optional.

This retroactively validates every real-era feature's actual practice (`communications-policies` onward) as having been the right call under the now-explicit rule, rather than process drift to correct — none of those slices were genuinely exploratory; each matched an already-proven contract/domain pattern.

## Verification

Like Phase C, this phase changes documentation/process state, not application behavior — there is no `test-results/` entry in the usual sense. The acceptance criterion (Finding 6: an explicit decision recorded, `CLAUDE.md` updated to match) is self-evidencing in the state produced:
- `context/open-questions.md` #9 exists, documents the three options presented, and records the explicit user choice with the date.
- `CLAUDE.md`'s working loop step 4 now states the conditional rule directly (grep for "Suggestion stage is conditional" confirms it's present) and cross-references `REQ013` Phase D / open-questions #9 rather than leaving the old universal-mandatory wording in place unqualified.
- `REQ013`'s acceptance criteria list Phase D as done, closing the requirement's final open phase — `REQ013` itself moves to `done` in the same change.
