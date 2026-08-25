---
id: TR111
type: bug
feature: appointments
created: 2026-08-25
updated: 2026-08-25
status: pass
parent: TP112
related: [BUG023, PLAN085]
---

# TR111 — Results for the `appointments/edit.jsx` fix (BUG023)

Executed 2026-08-25 against `medibook_backend`/`medibook_frontend` (the
shared dev stack) on `master`. No backend change in this slice.

## Frontend unit — `edit.test.jsx` (new)

| Case | Result |
|---|---|
| Real fetched data renders | **pass** |
| Empty clinicians/rooms → real empty dropdown, not mock rows | **pass** |
| Genuine `appointment: null`, no error → real not-found state | **pass** |
| Real "Appointment not found" GraphQL error → real not-found state | **pass** |
| Save round trip excludes `end_datetime` (defect #5 regression guard) | **pass** |
| End Date & Time field is `disabled` | **pass** |
| Genuine non-not-found error → degraded MockStore fallback (unchanged) | **pass** |

7/7. Full frontend unit suite: 99 tests / 13 suites, 97 passing. The 2
failures are the same pre-existing, unrelated `booking/index.test.jsx`
full-suite-contention flake documented in `TR109`/`TR110`. `eslint`: 0
errors, 162 warnings (ratchet held, unchanged). `npm run build`: clean.
`scripts/check-page-data-wiring.mjs`: 0 new fabricated pages.

## e2e — `appointments-edit.spec.js` (new), against the real backend

| Case | Result |
|---|---|
| Real fetched appointment data, never fabricated mock names | **pass** |
| A real edit (Notes field) survives a page reload | **pass** |
| A genuinely nonexistent appointment id shows the real not-found state | **pass** |

3/3, confirmed clean after the defect #5/#6 fixes. Before those fixes,
this same "real edit persists" scenario reproduced defect #5 live and
consistently (two separate runs, including one with `force: true` on the
click to rule out an unrelated click-interception cause) — the browser
console captured the exact GraphQL variable-coercion rejection quoted in
`BUG023`, and a direct `appointment(id) { notes }` query after each
attempt confirmed nothing had persisted. This is the strongest possible
evidence available that defect #5 was a real, live, previously-shipped
production defect and not a test-authoring artifact.

## Commits

See the commits immediately following this test-results doc in `git log`.
