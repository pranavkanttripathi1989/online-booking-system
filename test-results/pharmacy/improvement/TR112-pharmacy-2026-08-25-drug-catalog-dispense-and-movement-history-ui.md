---
id: TR112
type: improvement
feature: pharmacy
created: 2026-08-25
updated: 2026-08-25
status: pass
parent: TP113
related: [REQ059, PLAN086]
---

# TR112 — Results for the pharmacy UI completion (REQ059)

Executed 2026-08-25 against `medibook_backend`/`medibook_frontend` (the
shared dev stack) on `master`. No backend change in this slice.

## Frontend unit — `index.test.jsx` (new)

| Case | Result |
|---|---|
| Real drugs render; platform-seeded rows hide edit/delete | **pass** |
| Creating a drug calls the real mutation and refreshes the list | **pass** |
| Dispense batch picker restricted to the matching drug | **pass** |
| A real dispense call with the right variables | **pass** |
| Movement History shows real movements | **pass** |

5/5. Full frontend unit suite: 104 tests / 14 suites, 102 passing. The 2
failures are the same pre-existing, unrelated `booking/index.test.jsx`
full-suite-contention flake documented in `TR109`–`TR111`. `eslint`: 0
errors, 162 warnings (ratchet held, unchanged — the 4 pre-existing
`AppShell.jsx` unused-import warnings surfaced by a per-file
`--max-warnings 0` check are already counted in this total, confirmed
present before this slice's own edits). `npm run build`: clean.
`scripts/check-page-data-wiring.mjs`: 0 new fabricated pages.

## e2e — `pharmacy-completion.spec.js` (new), against the real backend

| Case | Result |
|---|---|
| Staff can reach the pharmacy page via the sidebar nav | **pass** |
| A drug created through the UI appears in the receive-stock dropdown | **pass** |
| A real dispense decrements the batch and appears in its movement history | **pass** |

3/3, confirmed on a full run after fixing three real test-authoring
issues found along the way (documented for anyone extending this spec):
a MUI Dialog marks the rest of the page `aria-hidden` while open, so a
background "Dispense" button drops out of the accessibility tree —
scope the dialog's own submit button via `getByRole('dialog')...`, not
`.nth(1)`; `patients()`'s own search matches `first_name`/`last_name`/
`email`/`phone` individually via `contains`, not a combined "first last"
substring; and the demo `clinician@medibook.dev` account needed the same
temporary-link-then-revert pattern already established in
`clinician-portal.spec.js`/`clinician-dashboard.spec.js` to mint a real
prescription fixture (`createPrescription` is clinician-only).

## Responsive check

360/768/1280/1440px: no page-level overflow at any width; a 360px
screenshot of the 8-column Drug Catalog table confirms it scrolls
horizontally within its own `TableContainer` rather than clipping —
correct desktop-dense-tier behavior (scrolling at 360px is fine,
truncation is not).

## Commits

See the commits immediately following this test-results doc in `git log`.
