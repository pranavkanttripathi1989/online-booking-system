---
id: TP274
type: improvement
feature: clinical-records
created: 2026-09-03
updated: 2026-09-03
status: approved
parent: PLAN254
related: [REQ185]
---

# TP274 — Test plan: digital intake auto-populates the EMR (P2-14)

Suggestion stage skipped, same grounds as every prior slice this session: the
full technical design (reuse of `forBooking`, the callback-transaction
choice, the new `escapeHtml` utility, the allergy-banner exclusion) was
reviewed and approved via `ExitPlanMode` before any code was written.

## `escapeHtml`

| # | Case | Expected |
|---|---|---|
| 1 | `null`/`undefined`/`''` input | Returns `''` |
| 2 | Plain text with no special characters | Unchanged |
| 3 | A `<script>...</script>` payload | Entities escaped, no literal tag survives |
| 4 | Ampersand, double quote, apostrophe | Each escaped to its entity |
| 5 | Escaped text round-tripped through `htmlToPlainText` | Recovers the original text |

## `EncountersService#getOrCreateEncounter` — intake auto-population

| # | Case | Expected |
|---|---|---|
| 6 | `reason` and `intake_responses` both empty/blank | No note seeded; `IntakeFieldsService#forBooking` never called |
| 7 | Encounter already exists for the appointment | No note created or modified — existing content/edits untouched |
| 8 | Non-blank `reason`, no `intake_responses` | Note seeded with a "Reason for visit" line only |
| 9 | `intake_responses` with a key matching a real `ClinicIntakeFieldConfig` | Seeded line uses the config's real label, not the raw key |
| 10 | `intake_responses` with a key matching no config | Seeded line falls back to the raw key |
| 11 | A blank/whitespace-only intake response value | Skipped — no line seeded for that key |
| 12 | `reason` containing `<script>alert(1)</script>` | Seeded content contains `&lt;script&gt;...`, never the literal tag |

## Live-only checks (not unit-testable against a mocked Prisma client)

- Container boot after the module/service changes — confirms no
  `IntakeFieldsModule` wiring failure.
- A real `createAppointment` → `getOrCreateEncounter` round trip against the
  real dev stack with an XSS-shaped `reason`, confirming the seeded note's
  real content matches what the unit tests assert against a mock.
- Full integration suite, including the pre-existing `encounters`
  tenancy-matrix row in `matrix-coverage.int-spec.ts` — confirms this
  same-domain addition didn't regress the domain's already-proven
  cross-tenant guarantee.

## Frontend

No new frontend code ships in this slice. Confirmed, not assumed:
`EncounterWorkspace.jsx`'s existing generic per-section `RichTextEditor`
rendering (used for every `SECTIONS` entry including `'complaints'`) already
displays whatever `EncounterNotes.content` HTML exists — verified via the
live round trip above, which returned the seeded note in exactly the shape
the page's own `getOrCreateEncounter` query already expects.
