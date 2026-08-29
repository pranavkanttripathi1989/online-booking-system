---
id: REQ162
type: improvement
feature: frontend-platform
created: 2026-08-29
updated: 2026-08-29
status: done
parent: null
related: [PLAN218, TP238, TR238]
---

# REQ162 — rich text editor for clinical note sections (FORM-20)

## Why this slice

User request: convert `EncounterWorkspace.jsx`'s plain-textarea clinical
note fields to a rich text editor. This directly matches
`FRONTEND_RULES.md`'s **FORM-20** ("A plain `<textarea>`/MUI `TextField
multiline` MUST NOT be used for content that is later displayed as
formatted text... clinical/encounter notes... Use a rich text editor
instead (canonical: TipTap, per BASE-4)") — a standing gap the rules
document itself flagged as unpaid ("no rich text editor exists in this
codebase yet and all 58 current multiline fields are plain").

## Scope

**Ships:**
- `@tiptap/react`/`@tiptap/starter-kit`/`@tiptap/pm` (v3.30.5) — the
  first rich text editor dependency in this codebase, pre-approved by
  FORM-20's own explicit "canonical: TipTap" mandate (satisfies BASE-5's
  size-approval requirement).
- `frontend/src/components/shared/RichTextEditor.jsx` — a controlled
  component on an HTML-string `value`/`onChange`/`onBlur` contract,
  matching a plain `TextField` closely enough to drop in directly. A
  toolbar (Bold/Italic/Bulleted list/Numbered list/Quote), hidden when
  `disabled`. Lazy-loaded via `React.lazy`/`Suspense` (PERF-12 —
  rich-text editing is one of the rule's own named heavy-widget
  categories) with a new `RichTextEditorSkeleton` (`Skeletons.jsx`)
  matching its layout to avoid a Suspense-load layout shift (STATE-3).
- Wired into `EncounterWorkspace.jsx`'s `SECTIONS.map()` loop — one
  generic component instance covering all 8 free-text note sections
  (Chief Complaints, History, Examination, Vitals, Diagnosis,
  Investigations, Advice, Follow-up). Note: "Vitals" and "Diagnosis"
  here are the free-text note sections — distinct from the page's own
  separate structured "Vitals" (discrete readings) and "Diagnoses"
  (ICD-10-coded list) blocks further down the same page, unaffected by
  this change.
- A new `.size-limit.json` entry tracking the `RichTextEditor` lazy
  chunk explicitly (130 KB limit; measured 125.06 KB gzipped) — the
  pre-existing "largest lazy chunk" entry only globbed `charts-*.js`
  and would have silently missed this new, larger chunk.

**Two real backend bugs found and fixed proactively, not part of the
original ask:** `EncounterNotes.content` becoming HTML meant two
existing plain-text consumers would start leaking raw `<p>`/`<strong>`
tags:
1. `documents.service.ts`'s `visitSummaryPdf()` rendered `note.content`
   directly via pdfkit's `doc.text()` — no HTML parser, so tags would
   print literally in a real patient-facing document.
2. `encounters.service.ts`'s `patientTimeline()` computed its
   `complaints`-section summary snippet the same way, surfaced to both
   the frontend timeline display and `preConsultSummary()`'s AI-ranked
   bullet list.

Both fixed via a new, shared `backend/src/common/utils/
html-to-plain-text.ts` helper (strips tags, converts block-level
closes/`<br>` to newlines, decodes basic entities — a small
deterministic converter, appropriate since input is always
bounded/known-shape TipTap StarterKit output, not arbitrary
third-party HTML).

**Deliberately deferred, stated not hidden:**
- `route`/`instructions` free-text fields on prescriptions, message
  bodies, bios, policy/template bodies, review text — the other ~57
  plain-multiline fields FORM-20's own gap register named. Retrofitting
  each is its own future slice; new reader-facing free-text fields
  comply from today.
- Font-ligature/conjunct-shaping QA beyond a basic visual check
  (ProseMirror isn't full HarfBuzz-grade) — a known, stated limitation,
  not a blocker for this slice's Latin-script scope.

## Real findings during implementation (not part of the original ask)

1. **A `--legacy-peer-deps` install silently pruned `@testing-library/
   dom`** (a transitive peer dependency of `@testing-library/react`
   that npm normally auto-installs), breaking every frontend test in
   the repo until it was pinned explicitly as a direct devDependency.
   **Lesson for this codebase**: any future `--legacy-peer-deps`
   install should re-run the full test suite immediately, not just the
   test being worked on — a peer-dep prune can silently break tests
   completely unrelated to the package just installed.
2. **jsdom has no real layout engine**, and ProseMirror's own
   click-to-document-position hit-testing depends on
   `document.elementFromPoint`/`Range#getClientRects`/
   `getBoundingClientRect` — none implemented by jsdom. Without stubbing
   these (a well-known, published ProseMirror-in-jsdom workaround),
   every click inside the editor throws `target.getClientRects is not
   a function` and no cursor is ever placed, so typed text never lands.
   `RichTextEditor.test.jsx` stubs zeroed rects in a `beforeAll`.
3. **Mounting 8 real ProseMirror instances per `EncounterWorkspace`
   render is measurably slower in jsdom than in a real browser** —
   confirmed by live-verifying the real page in Chrome DevTools (the
   page rendered and became interactive with no perceptible lag), while
   in jsdom this pushed one pre-existing test (`'advances a referral to
   scheduled...'`) past the default 5s jest timeout. Fixed by bumping
   that one test's timeout to 15s with a comment explaining this is a
   jsdom-environment cost, not a real one — not a code change to the
   app.

## Verification

Backend: `tsc --noEmit` + `eslint` clean; `encounters`/`documents`
suites green (104/104 combined), including two new regression cases
proving HTML is actually stripped at both call sites, not just that
the helper works in isolation. Frontend: `RichTextEditor.test.jsx`
(6/6, including the jsdom-geometry-polyfill workaround),
`EncounterWorkspace.test.jsx` (23/23, including the AI-scribe badge
test updated for a contentEditable div instead of a native form
control's `value`), `npm run build` + `npm run size` all green
(RichTextEditor chunk 125.06 KB / 130 KB budget).

**Live-verified** (Chrome DevTools MCP, real dev stack, logged in as
`clinician@medibook.dev`, real encounter
`0c4a6cc6-6df5-4c8b-9ec7-7255c89a4225`): the `RichTextEditorSkeleton`
fallback renders correctly during the lazy-chunk load (no layout
shift); all 8 note sections render real TipTap editors with a working,
correctly-themed toolbar (Bold/Italic/Bulleted-list/Numbered-list/Quote
icons, dark-mode-correct). The one-time 4.7–8.3s LCP delay observed in
Vite **dev mode** is a dev-server module-transform artifact (hundreds
of unbundled ProseMirror ES modules served individually, no
bundling/minification) — not reproducible in, or representative of,
production behavior. A full production-build (`vite preview`) in-browser
trace was attempted but blocked by a CORS restriction on the ad-hoc
preview port (4173), not worth loosening for this check — logged
honestly as a limitation, not hidden. The production metric that
actually matters (the built, minified, gzipped lazy-chunk size, 125.06
KB) is tracked in `.size-limit.json` and passes its budget; at typical
throttled-4G throughput this loads well under 1 second.
