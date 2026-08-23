---
id: TR083
type: requirement
feature: prescriptions
created: 2026-08-24
updated: 2026-08-24
status: pass
parent: TP084
related: [REQ021, PLAN057]
---

# TR083 — Results for prescription builder, print view, and repeat-Rx

Executed 2026-08-24 against the running dev stack (`medibook_backend`,
`medibook_frontend`, real `medibook_db`), on `master`. Commit: see the
`feat(backend,frontend): prescription builder, print view, and repeat-Rx
(REQ021)` commit immediately following this file's own commit.

## Per-defect/feature contract

| Case | Result | Evidence |
|---|---|---|
| TC-01 qty auto-calc BD×5→10 | **pass** | `prescriptions.service.spec.ts` |
| TC-02 SOS never auto-calculates | **pass** | |
| TC-03 no duration → no qty | **pass** | |
| TC-04 non-clinician create rejected | **pass** | |
| TC-05 cross-org encounter rejected | **pass** | |
| TC-06 wrong clinician rejected | **pass** | |
| TC-07 repeat across patients rejected | **pass** | |
| TC-08 stamps ids from encounter, not input | **pass** | |
| TC-09 cross-org read rejected | **pass** | |
| TC-10 cross-patient read rejected | **pass** | |
| TC-11 cross-clinician read rejected | **pass** | |
| TC-12 org-less non-operator rejected outright | **pass** | |
| TC-13 clinician-never-treated rejected | **pass** | |
| TC-14 owning patient reads resolved drug names | **pass** | |
| TC-15 repeatPrescription returns unsaved draft | **pass** | |
| TC-16 cross-tenant repeat source rejected | **pass** | |
| TC-17 first print: is_reprint false, count→1 | **pass** | |
| TC-18 second+ print: is_reprint true, incremented | **pass** | |
| TC-19 cross-tenant print rejected | **pass** | |
| TC-20 org-less set-create rejected | **pass** | |
| TC-21 org-shared vs. personal set ownership | **pass** | |
| TC-22 unknown/cross-org set rejected | **pass** | |
| TC-23 applyPrescriptionSet computes qty | **pass** | |
| TC-24 tenancy matrix — prescriptions domain | **pass** | new `CASES` entry, `tenancy.int-spec.ts` |
| TC-25 tenancy matrix anti-rot gate | **pass** | `matrix-coverage.int-spec.ts` |
| TC-26 full backend suite | **pass** | 61 suites / 872 tests, 0 failures |
| TC-27 backend lint + typecheck | **pass** | both clean |
| TC-28 backend integration suite | **pass** | 4 suites / 225 tests, 0 failures |
| TC-29 full frontend suite | **pass** | 6 suites / 63 tests, 0 failures |
| TC-30 frontend lint (touched files) | **pass** | 0 warnings/errors in `PrescriptionBuilder.jsx`, `PrescriptionPrint.jsx`, `prescription-builder.spec.js` |
| TC-31 frontend build | **pass** | both new pages code-split into their own chunks |
| TC-32 responsive — builder table | **pass, after a real fix** | see narrative |
| TC-33 responsive — print table | **pass, after a real fix** | see narrative |
| TC-34 e2e full flow | **pass, after three real fixes — see narrative** | `prescription-builder.spec.js`, 1 test, real dev stack |

## Narrative

**TC-32/33 — missing `TableContainer`.** Found during this verification
pass (not the original build): `PrescriptionBuilder.jsx`'s 8-column
drug-line table and `PrescriptionPrint.jsx`'s 7-column drug table both
rendered a bare `<Table>` with no `<TableContainer>` wrapper — a direct
violation of `CLAUDE.md`'s Hard Rule 5 ("every `<Table>` needs a
`<TableContainer>`"), the same silent-truncation defect class that rule was
written from. Fixed by wrapping both; re-ran lint (clean) and the e2e spec
(still green) after the change to confirm no regression.

**TC-34 — three real bugs found while re-running the e2e spec, which the
original session never observed passing (killed mid-run by an
interruption):**

1. **`getByRole('combobox').first()` grabbed the wrong element.** The
   Frequency `<Select>` had no accessible name, so Playwright's `.first()`
   matched the Drug search Autocomplete instead (also `role="combobox"`,
   earlier in DOM order) — clicking it reopened the drug dropdown filtered
   by its own already-selected value, which matched nothing ("No options"),
   and the subsequent click on option "BD" timed out. First fix attempt
   (a bare `aria-label="Frequency"` prop on `<Select>`) didn't work either —
   MUI's `SelectInput` internals apply `aria-labelledby` to the same node,
   which wins over `aria-label` in accessible-name computation, so the name
   landed on the wrong DOM node. Correct fix:
   `inputProps={{ 'aria-label': 'Frequency' }}`, MUI's documented way to
   label a `Select` with no visible `<InputLabel>`. Verified via the ARIA
   snapshot in `error-context.md` before and after.
2. **Fixed-name collision on repeated runs.** The favourite-set name
   `'REQ021-E2E-PROBE Set'` is identical on every run; with no
   `deletePrescriptionSet` mutation to clean up early-exit failures, two
   real accumulating rows already existed in the dev DB from the original
   interrupted run plus this session's own diagnostic re-runs, breaking a
   `getByText(...).toBeVisible()` strict-mode assertion (2 matches). Fixed
   by scoping the assertion with `.first()`, and — the more durable fix —
   capturing `prescriptionSetId` directly from the `createPrescriptionSet`
   mutation response at the point of creation rather than a later
   name-based lookup after the print-view navigation, so `afterAll` cleans
   up even when a later step in the test fails.
3. **Leftover fixture rows from the original interrupted run.** One
   orphaned `Appointments`/`Encounters` pair (`notes: 'REQ021-E2E-PROBE'`,
   slot `2027-02-01T09:00:00.000Z`) blocked `beforeAll`'s own appointment
   creation with `"This time slot is no longer available"` on the first
   re-run attempt. Deleted directly, child-first
   (`Prescriptions` → `Encounters` → `Appointments`), per the migration's
   own `ON DELETE RESTRICT` chain — confirmed no `Prescriptions` row
   existed under that encounter first.

After all three fixes, the spec passes cleanly and repeatably (verified by
running it a second time after the `TableContainer` fix with zero leftover
state).

## Verdict

**Pass.** REQ021's scoped P0 subset (`US-RX-01`, `02`, `03` letterhead
subset, `05`) is real, tested, and verified end-to-end against the real
backend — not mocked. P1 items (`US-RX-04`, `06`, `07`, `08`, `09`) remain
explicitly deferred per `PLAN057`, not silently dropped.
