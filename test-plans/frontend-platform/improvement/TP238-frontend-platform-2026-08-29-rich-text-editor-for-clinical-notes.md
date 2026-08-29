---
id: TP238
type: improvement
feature: frontend-platform
created: 2026-08-29
updated: 2026-08-29
status: approved
parent: PLAN218
related: [TR238]
---

# TP238 — rich text editor for clinical note sections — test plan

## Cases

1. **`RichTextEditor` renders the initial value** as content.
2. **Exposes an editable region wired to an external label** via
   `ariaLabelledBy` (A11Y-6).
3. **`onChange` fires with the updated HTML** as the user types.
4. **`onBlur` fires with the current HTML** when focus leaves.
5. **Disabled mode hides the toolbar** and stays read-only
   (`contenteditable="false"`).
6. **Every toolbar button has a real accessible name and pressed-state**
   (A11Y-5).
7. **`EncounterWorkspace.jsx`'s existing 23-case suite stays green**,
   including the AI-scribe badge test updated for contentEditable
   rendering.
8. **Backend: `visitSummaryPdf` strips HTML tags** from a rich-text
   note before handing text to pdfkit, rather than leaking raw markup
   into a real patient-facing PDF.
9. **Backend: `patientTimeline`'s encounter-event summary strips HTML**
   from the complaints note the same way.
10. **`html-to-plain-text.ts`'s own unit contract**: empty/null-safe,
    plain text passes through unchanged (backward compatibility with
    pre-rich-text notes), inline tags stripped without losing text,
    block-level tags/`<br>` become newlines, a bullet list becomes one
    line per item, common HTML entities decoded, excessive blank lines
    collapsed.
11. **Bundle size**: the new `RichTextEditor` lazy chunk stays within
    its tracked `.size-limit.json` budget (130 KB gzipped).
12. **Live**: the real `EncounterWorkspace` page renders the skeleton
    fallback with no layout shift, then real TipTap editors with a
    working toolbar, for all 8 note sections.

## Out of scope

A real click-then-toggle-then-type flow asserting the Bold toolbar
button actually wraps subsequently-typed text in `<strong>` — not
reliably testable in jsdom (documented jsdom-environment artifact, see
`REQ162`'s own account); the accessibility-contract case (6 above) is
the reliable substitute. A full production-build in-browser
performance trace — blocked by a CORS restriction on the ad-hoc preview
port, not worth loosening; the tracked chunk-size budget is the
production metric that matters instead.
