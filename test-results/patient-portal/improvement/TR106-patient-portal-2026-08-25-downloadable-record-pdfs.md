---
id: TR106
type: improvement
feature: patient-portal
created: 2026-08-25
updated: 2026-08-25
status: done
parent: TP107
related: [PLAN080]
---

# TR106 — Test results: downloadable PDFs for prescriptions, invoices, and visit summaries

Commit: (recorded at commit time, see the `context/` manifest for this
bundle for the final SHA)

## TP107 case outcomes

All 14 cases pass. `appointment-payments.service.spec.ts` gained a
6-case `invoiceForDownload` describe block; `documents.service.spec.ts`
is new (8 cases, each PDF method's real output asserted by its own
`%PDF` magic bytes, not a mocked Buffer).

## Full verification suite (Hard Rule 3)

| Check | Result |
|---|---|
| New dependency | `pdfkit` (+ `@types/pdfkit` dev), installed on both host and container (the container's `node_modules` is a separate anonymous Docker volume — `docker exec medibook_backend npm install` needed alongside the host install) |
| `npx prisma validate` | N/A — no schema change this slice |
| `backend: npx jest --maxWorkers=2` | 80/80 suites, 1198/1198 tests (was 79/1184 after REQ056) |
| `backend: eslint` | Clean |
| `backend: tsc --noEmit` | Clean |
| Container compile (`docker restart` + `docker logs`) | "Found 0 errors. Watching for file changes." (a genuinely slow restart under host load — confirmed active via `docker stats`, 130%+ CPU throughout, not a wedge) |

No `npm run test:int` change needed or run against a new domain — the
new `documents` module is a plain REST controller with no `.resolver.ts`
file, structurally invisible to `matrix-coverage.int-spec.ts`'s own
directory scan (confirmed by reading `resolverDomains()` directly), the
same way `AttachmentsController`/`OrgBrandingController` already are.
Cross-tenant isolation is proven at the unit level instead, via the three
underlying assembly methods' own already-established test coverage plus
this slice's new `invoiceForDownload` cases.

## One real bug found and fixed before commit

`import PDFDocument from 'pdfkit'` type-checked but threw `TypeError:
pdfkit_1.default is not a constructor` at runtime — this project's
`tsconfig.json` sets `allowSyntheticDefaultImports` (type-checking only)
but not `esModuleInterop` (the flag that actually generates the runtime
wrapper populating `.default` on a CommonJS module's export). Caught
immediately by the first real unit test run (`tsc --noEmit` has no
runtime component and could not have caught this), fixed with
TypeScript's `import PDFDocument = require('pdfkit')` form. Worth
remembering for any *other* future default-imported CJS-only package in
this codebase — the same interop gap will bite again identically.

## Verification

Real, not just unit-tested: pdfkit genuinely renders real PDF byte
streams (asserted via `%PDF` magic bytes, not mocked), the container
restarted with a clean "Found 0 errors" compile log after the new
dependency was installed in both the host and the container's own
separate node_modules volume, and the full verification suite above.
