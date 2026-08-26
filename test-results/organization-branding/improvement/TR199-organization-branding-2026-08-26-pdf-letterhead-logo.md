---
id: TR199
type: improvement
feature: organization-branding
created: 2026-08-26
updated: 2026-08-26
status: pass
parent: TP199
related: []
---

# TR199 — Test results: org logo propagated into PDF letterheads

All 11 `TP199` cases pass.

`npx jest src/common/pdf/render-pdf.spec.ts
src/documents/documents.service.spec.ts
src/appointment-payments/appointment-payments.service.spec.ts
--maxWorkers=2`: 114/114 tests pass (10 new: 6 in `render-pdf.spec.ts`
(new file), 3 in `documents.service.spec.ts`, 1 in
`appointment-payments.service.spec.ts`).

Full backend unit suite: 93/93 suites (1 new), 1559/1559 tests.
Integration suite: 4/4 suites, 387/387 tests, unchanged — no schema
change. `tsc --noEmit` clean. `npx eslint "src/common/pdf/**/*.ts"
"src/documents/**/*.ts" "src/appointment-payments/**/*.ts"`: 0 errors.

The real-image-embedding test (`render-pdf.spec.ts`) writes a genuine
1×1 PNG to `backend/uploads/branding/` — the same on-disk path
`org-branding.controller.ts` uses for a real upload — and removes it in
`afterAll`; confirmed via a post-run `ls` that no residue file remained.

## Live verification

Not performed against the real dev stack — no browser/CLI GraphQL
client available this session. The mocked-Prisma + real-filesystem
coverage above exercises the actual `doc.image()` embedding path (not
just a mocked stand-in), the text-only fallback for a missing/invalid
logo, and all three in-scope call sites still rendering successfully
with a logo present.
