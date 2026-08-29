---
id: CTX-frontend-platform-2026-08-29-req162
type: improvement
feature: frontend-platform
created: 2026-08-29
updated: 2026-08-29
status: done
parent: REQ162
related: [PLAN218, TP238, TR238]
---

# frontend-platform — rich text editor for clinical notes (FORM-20) (2026-08-29)

User request: convert `EncounterWorkspace.jsx`'s plain-textarea note
fields to a rich text editor — closing `FRONTEND_RULES.md`'s own
long-standing FORM-20 gap ("no rich text editor exists in this
codebase yet").

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ162 | [Rich text editor for clinical notes](../../requirements/frontend-platform/improvement/REQ162-frontend-platform-2026-08-29-rich-text-editor-for-clinical-notes.md) |
| implementation-plans | PLAN218 | [implementation plan](../../implementation-plans/frontend-platform/improvement/PLAN218-frontend-platform-2026-08-29-rich-text-editor-for-clinical-notes.md) |
| test-plans | TP238 | [test plan](../../test-plans/frontend-platform/improvement/TP238-frontend-platform-2026-08-29-rich-text-editor-for-clinical-notes.md) |
| test-results | TR238 | [results](../../test-results/frontend-platform/improvement/TR238-frontend-platform-2026-08-29-rich-text-editor-for-clinical-notes.md) |

## What shipped

TipTap (`@tiptap/react`/`starter-kit`/`pm` v3.30.5) — the first rich
text editor dependency in this codebase, pre-approved by FORM-20's own
"canonical: TipTap" mandate. A new, reusable, lazy-loaded
`components/shared/RichTextEditor.jsx` (controlled HTML-string value/
onChange/onBlur, toolbar, `RichTextEditorSkeleton` fallback), wired
into `EncounterWorkspace.jsx`'s 8 free-text note sections. A new
`.size-limit.json` entry (the pre-existing "largest lazy chunk" check
only tracked `charts-*.js` and would have silently missed this new,
larger chunk). Two real backend bugs found proactively and fixed via a
new `common/utils/html-to-plain-text.ts` helper: `visitSummaryPdf` and
`patientTimeline` both used to render `EncounterNotes.content` as
plain text — now that content is HTML, both would have leaked raw
markup without this fix.

## Real findings worth carrying forward

1. `--legacy-peer-deps` silently pruned `@testing-library/dom` (a
   transitive peer dep), breaking every frontend test until pinned
   explicitly — any future `--legacy-peer-deps` install should re-run
   the full suite immediately, not just the touched test.
2. ProseMirror needs jsdom geometry-API polyfills
   (`elementFromPoint`/`getClientRects`/`getBoundingClientRect`) to be
   testable at all — a documented, published limitation, not a gap in
   this component.
3. Mounting 8 real ProseMirror instances per page render is measurably
   slower in jsdom than a real browser (confirmed live) — one
   pre-existing test's timeout was bumped 5s→15s for this reason, not
   a code redesign.

## Verification

Backend 104/104 (documents+encounters+html-to-plain-text), frontend
`RichTextEditor.test.jsx` 6/6, `EncounterWorkspace.test.jsx` 23/23 in
isolation (a combined-run showed unrelated contention flakiness,
isolated and re-confirmed, not a regression — see `TR238`). `npm run
build`/`size` green. Live-verified via Chrome DevTools MCP against the
real dev stack.
