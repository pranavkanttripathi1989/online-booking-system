---
id: TR189
type: improvement
feature: prescriptions
created: 2026-08-26
updated: 2026-08-26
status: pass
parent: TP189
related: []
---

# TR189 — Test results: tamper-evident hash on printed prescriptions

All 12 `TP189` cases pass.

`npx jest src/prescriptions/prescriptions.service.spec.ts --maxWorkers=2`:
51/51 tests pass (10 new).

`npx jest src/documents/documents.service.spec.ts --maxWorkers=2`:
12/12 tests pass (2 new).

`npx jest src/pages/prescriptions/PrescriptionPrint.test.jsx --runInBand`:
6/6 tests pass (2 new).

Full backend unit suite: 92/92 suites, 1499/1499 tests. Integration
suite: 4/4 suites, 387/387 tests, unchanged — the new
`20260826200000_prescription_pdf_hash` migration applied cleanly via the
integration harness's own `global-setup.ts`. `tsc --noEmit`/`eslint`
clean on backend; `eslint` clean on frontend (2 pre-existing warnings on
`PrescriptionPrint.jsx`, unrelated lines, unchanged by this slice).

## Live verification

Not performed against the real dev stack — no browser tool available
this session. The unit + mocked-Apollo coverage above exercises the
exact hash computation, its determinism/content-sensitivity, the
integrity-check valid/invalid paths, and both rendering paths' display
of the same verification code from the same `pdf_hash`.
