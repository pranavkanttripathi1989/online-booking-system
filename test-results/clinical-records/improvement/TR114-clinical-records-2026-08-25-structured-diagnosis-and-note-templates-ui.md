---
id: TR114
type: improvement
feature: clinical-records
created: 2026-08-25
updated: 2026-08-25
status: pass
parent: TP115
related: [REQ061, PLAN088]
---

# TR114 — Results for structured diagnosis + note-template creation UI (REQ061)

Executed 2026-08-25 against `medibook_backend`/`medibook_postgres` (the
shared dev stack) on `master`. No backend change in this slice.

## Frontend unit — `EncounterWorkspace.test.jsx` (new)

| Case | Result |
|---|---|
| Real recorded diagnoses render | **pass** |
| Adding a diagnosis calls the real mutation and refetches | **pass** |
| Saving the current note as a template calls the real mutation with the correct `sections_json` | **pass** |

3/3. The "adds a diagnosis" case needed an explicit 20s test timeout —
the default 5s was tight under this host's own documented resource
contention across two sequential real Apollo mutation round trips plus a
refetch; confirmed not flaky at the longer timeout across repeated runs.
Full frontend unit suite re-run at the end of the whole A-4–A-8 batch: 18
suites / 116 tests, all passing (`--runInBand`). `eslint`: 0 errors, 162
warnings (ratchet held). `npm run build`: clean.
`scripts/check-page-data-wiring.mjs`: 0 new fabricated pages.

## e2e — `gap-analysis-a4-a8.spec.js` (new, shared A-4–A-8 fixture file)

| Case | Result |
|---|---|
| Clinician adds a diagnosis on a real disposable encounter; appears in the list | **pass** |
| Clinician saves the current note as a template; appears in the previously-empty Templates list | **pass** |

2/2 (covered by one combined e2e test in the shared spec file, per its
own fixture-reuse design).

## Commits

See the commits immediately following this test-results doc in `git log`.
