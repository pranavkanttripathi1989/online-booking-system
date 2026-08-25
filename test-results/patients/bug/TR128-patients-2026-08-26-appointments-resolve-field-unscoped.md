---
id: TR128
type: bug
feature: patients
created: 2026-08-26
updated: 2026-08-26
status: pass
parent: TP129
related: [BUG025, PLAN102]
---

# TR128 — Results for the `Patient.appointments` scoping fix (F-05)

Executed 2026-08-25/26 against `medibook_backend`/`medibook_postgres` on
`master`, in the same pass as `BUG024`/`TR127` (same file, same test
run: `patients.service.spec.ts` 38/38, full backend suite 84/84 suites
1317/1317 tests, integration 4/4 suites 369/369 tests, `eslint`/
`tsc --noEmit` clean).

## Live verification

`patient(id: <Anita Sharma>) { appointments(...) { paginatorInfo {
total } data { id status } } }` as `manager@medibook.dev` returned
`total: 2` with two real appointment rows (`confirmed`, `scheduled`) —
matches the real DB count for that patient exactly.

## Commits

See the commits immediately following this test-results doc in `git log`.
