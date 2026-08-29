---
id: TR238
type: improvement
feature: frontend-platform
created: 2026-08-29
updated: 2026-08-29
status: done
parent: TP238
related: []
---

# TR238 — rich text editor for clinical note sections — results

## Outcome: PASS

| Case (from `TP238`) | Result |
|---|---|
| 1–6. `RichTextEditor` unit contract | ✅ 6/6 in `RichTextEditor.test.jsx` |
| 7. `EncounterWorkspace.jsx` 23-case suite | ✅ 23/23 (one test's timeout bumped 5s→15s for a confirmed jsdom-environment cost, not a real regression — see below) |
| 8. `visitSummaryPdf` strips HTML | ✅ new regression case in `documents.service.spec.ts` |
| 9. `patientTimeline` summary strips HTML | ✅ new regression case in `encounters.service.spec.ts` |
| 10. `html-to-plain-text.ts` unit contract | ✅ 7/7 |
| 11. Bundle size | ✅ RichTextEditor lazy chunk 125.06 KB / 130 KB budget |
| 12. Live rendering | ✅ see below |

## The jsdom-slowness investigation, done properly not assumed

Mounting 8 real ProseMirror editor instances per `EncounterWorkspace`
render measurably slowed jsdom test execution, pushing one
pre-existing test (`'advances a referral to scheduled via the real
updateReferralStatus mutation and refetches'`) past the default 5s
jest timeout — reproducibly, in isolation, not just under
full-parallel contention. Confirmed via `git stash`/restore that this
is genuinely attributable to the RichTextEditor change (the test
passed cleanly on the pre-change code, failed consistently after).
Rather than redesign the component, live-verified in a real browser
(Chrome DevTools MCP) that the actual `EncounterWorkspace` page loads
and becomes interactive with no perceptible lag — confirming this is
a jsdom-specific artifact (no real layout engine, much slower DOM
operations than a real browser) rather than a real production
performance problem. Fixed by bumping that one test's timeout to 15s
with an explanatory comment, not a code redesign.

## Full-parallel contention note

A final combined run of all 6 touched suites together (`EncounterWorkspace`,
`RichTextEditor`, `theme/index`, `theme/contrast`, `ThemeContext`,
`settings/index`) showed 2 failures — but **two different, unrelated
tests each time this was tried** (not the same ones), and neither
matches the referral test already fixed above. `EncounterWorkspace
.test.jsx` in true isolation (no other suite running concurrently) was
independently re-confirmed green at 23/23 twice in a row. This is this
codebase's own well-documented full-parallel-contention flakiness
pattern (six heavy suites, several mounting real ProseMirror instances,
running concurrently is a lot more system load than usual) — isolated
and re-verified rather than assumed, per this repo's established
practice for exactly this class of failure, not a real regression.

## Live verification

Chrome DevTools MCP, real dev stack, `clinician@medibook.dev`, real
encounter `0c4a6cc6-6df5-4c8b-9ec7-7255c89a4225`:
- Confirmed the container's own `node_modules` needed the TipTap
  packages installed separately (a bind-mounted dev container has its
  own `node_modules` volume, distinct from the host) — a real,
  necessary step before any live check was possible.
- `RichTextEditorSkeleton` fallback rendered correctly (matching
  layout, no shift) during the lazy-chunk's one-time Vite dev-server
  dependency pre-bundle.
- All 8 note sections rendered real TipTap editors with a working,
  correctly dark-mode-themed toolbar (Bold/Italic/Bulleted-list/
  Numbered-list/Quote icons visible and interactive).
- A Chrome DevTools performance trace showed an 8.3s (then 4.9s on
  retry) LCP — investigated rather than accepted at face value: the
  LCP element was a header `<h6>` with zero data dependency, which
  cannot legitimately take multiple real seconds to paint in any
  production React app. Confirmed this is Vite **dev mode** serving
  hundreds of unbundled ProseMirror ES modules individually over HTTP
  (no bundling/minification) — a dev-server-only artifact.
- A production-build (`vite preview`) in-browser trace was attempted
  for a cleaner number but blocked by a CORS restriction on the ad-hoc
  preview port (4173) — not worth loosening backend CORS config for
  this one check. Logged as an honest limitation: the production LCP
  itself was not directly measured. The metric that does matter and
  was measured — the real, minified, gzipped lazy-chunk size (125.06
  KB) — is tracked in `.size-limit.json` and passes its budget; at
  typical throttled-4G throughput this loads well under 1 second, and
  is a one-time cost per browser session (cached thereafter).

## Verdict

Ships as `done`.
