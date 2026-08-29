---
id: PLAN218
type: improvement
feature: frontend-platform
created: 2026-08-29
updated: 2026-08-29
status: done
parent: REQ162
related: [TP238, TR238]
---

# PLAN218 — rich text editor for clinical note sections

## Approach

1. Grounded the exact `SECTIONS.map()` loop in `EncounterWorkspace.jsx`
   before writing anything (one generic `<TextField multiline>` renders
   all 8 sections, not 8 separate fields — confirmed via a targeted
   Explore pass, including confirming the free-text "Vitals"/"Diagnosis"
   sections are distinct from the page's own structured Vitals-chips/
   Diagnoses-list blocks).
2. Added `@tiptap/react@3.30.5`, `@tiptap/starter-kit@3.30.5`,
   `@tiptap/pm@3.30.5` (`--legacy-peer-deps` for an unrelated
   `@types/react-dom` conflict on this JS-only, no-TypeScript codebase —
   safe since `@types/*` are pure type declarations never loaded at
   runtime). Found and fixed a real side effect: this silently pruned
   `@testing-library/dom`, breaking every frontend test until pinned as
   an explicit direct devDependency.
3. Built `frontend/src/components/shared/RichTextEditor.jsx` — TipTap
   `useEditor`/`EditorContent`, a `value`/`onChange`/`onBlur`/`disabled`/
   `ariaLabelledBy` contract matching the plain `TextField` it replaces,
   theme-token-styled toolbar (UI-2), keeps content synced from outside
   without fighting in-progress typing (only re-`setContent` when not
   focused).
4. Added `RichTextEditorSkeleton` to `Skeletons.jsx` matching the real
   component's border/toolbar-row/content-area shape for a
   layout-shift-free `Suspense` fallback.
5. Wired `React.lazy(() => import('.../RichTextEditor'))` +
   `<Suspense>` into `EncounterWorkspace.jsx`'s note-section loop —
   confirmed via `Explore` that no existing sub-component-level lazy
   pattern exists in this codebase (DataGrid/charts are only
   route-lazy-loaded), so this establishes the first one, per PERF-12's
   own explicit "rich text editing" callout.
6. Added the `.size-limit.json` `RichTextEditor` entry after discovering
   the pre-existing "largest lazy chunk" check only globbed
   `charts-*.js` and would have silently missed this new, larger
   (125.06 KB) chunk.
7. Backend: added `common/utils/html-to-plain-text.ts` and applied it
   at the two real consumers of `EncounterNotes.content` as plain text
   (`documents.service.ts`'s `visitSummaryPdf`, `encounters.service.ts`'s
   `patientTimeline` summary) — found via a dedicated
   cross-surface-consumer audit before shipping the HTML-content
   change, not after a bug report.
8. Updated `EncounterWorkspace.test.jsx`'s AI-scribe badge test (a
   `getByDisplayValue` assertion breaks once content renders in a
   contentEditable div, not a native form control) and bumped the one
   test whose own timeout was genuinely exceeded by jsdom's slower
   8-ProseMirror-instance mount cost (not a real regression — confirmed
   live in a real browser).

## Testing

- `npx tsc --noEmit` + `npx eslint` (backend and frontend) — clean.
- Backend: `documents.service.spec.ts` (new HTML-stripping regression
  case), `encounters.service.spec.ts` (new HTML-stripping regression
  case), `html-to-plain-text.spec.ts` (7 cases) — all green.
- Frontend: `RichTextEditor.test.jsx` (6 cases, including the
  jsdom-ProseMirror geometry-API polyfill), `EncounterWorkspace
  .test.jsx` (23/23), `npm run build` + `npm run size` (RichTextEditor
  chunk 125.06 KB / 130 KB).
- Live Chrome DevTools MCP verification against the real dev stack (see
  `TR238` for the full account).

## Commit

Code commit: `backend/src/common/utils/html-to-plain-text.ts`+`.spec.ts`,
`backend/src/documents/documents.service.ts`+`.spec.ts`,
`backend/src/encounters/encounters.service.ts`+`.spec.ts`,
`frontend/src/components/shared/RichTextEditor.jsx`+`.test.jsx`,
`frontend/src/components/shared/Skeletons.jsx`,
`frontend/src/components/shared/index.js`,
`frontend/src/pages/clinician/EncounterWorkspace.jsx`+`.test.jsx`,
`frontend/package.json`, `frontend/package-lock.json`,
`frontend/.size-limit.json`. Docs commit separately.
