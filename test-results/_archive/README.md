# test-results/_archive — superseded test-results docs

Populated by `scripts/archive-sweep.mjs`. A `test-results/<feature>/<category>/*.md` file moves here when it is
**both** (a) 15+ days past its own `updated` date **and** (b) not the newest result for its group (grouping key:
`parent` when it's a real `REQ###`/`IMPR###`/`BUG###` id, otherwise `feature` — see the script's header comment).
The single newest result per group is never archived, regardless of age, so the active tree always has a current
answer for "what does the last real test run for this feature say."

**Why this directory was empty until 2026-08-22 (`REQ013` Finding 5, closed in `PLAN025`):** most features in this
repo have exactly one `test-results/` doc per group — a single canonical result, superseded in place by editing
the same file rather than by adding a second file next to it (see, e.g., `TR003`/`TR010`'s Phase A rewrite, which
replaced their content rather than adding `TR003b`). The sweep's "superseded, not the latest" condition genuinely
never fired, because there was never a second, older file in the same group to become superseded — not because
the sweep was broken or never run. `context/archive/` (bundle-level archiving) had the opposite, real bug: it had
never actually been run/applied despite eligible bundles existing, fixed the same session (`archive-sweep.mjs
--apply` archived `booking-wizard-2026-03-19`, `clinicians-2026-04-02`, and four more once `REQ013` Phase C closed
their bundles to `done`). This directory stays real infrastructure, created ahead of the first file that actually
needs it, so `CLAUDE.md`'s read-order rule pointing here resolves to a real path rather than a 404.

| File | Feature | Superseded by | Archived |
|---|---|---|---|
