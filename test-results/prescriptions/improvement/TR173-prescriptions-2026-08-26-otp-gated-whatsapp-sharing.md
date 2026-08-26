---
id: TR173
type: improvement
feature: prescriptions
created: 2026-08-26
updated: 2026-08-26
status: done
parent: TP173
related: [PLAN149]
---

# TR173 — Test results: OTP-gated WhatsApp sharing of a prescription PDF

## TP173 case outcomes

Cases 1-11 and 15 are unit-tested and pass. Cases 12-14 and 18 are
**built but not automated-test-covered** — honestly reported below, not
silently claimed. Case 16 confirmed via a real integration-suite run.
Case 17 is frontend-unit-tested.

```
PASS src/prescriptions/prescriptions.service.spec.ts   (45 tests — 11 new: cases 1-11)
PASS src/documents/documents.service.spec.ts            (10 tests — 2 new: case 15)

Test Suites: 90 passed, 90 total (full backend unit suite)
Tests:       1437 passed, 1437 total
```

`npx tsc --noEmit` — clean. `npx eslint "{src,apps,libs,test}/**/*.ts"` —
exits 0, 0 warnings.

Integration (case 16, real Postgres via `npm run test:int` from the
host):

```
Test Suites: 4 passed, 4 total
Tests:       387 passed, 387 total
```

387 — unchanged from `REQ108`'s own run, confirming `documents/`'s
lack of a `.resolver.ts` keeps it structurally outside
`matrix-coverage.int-spec.ts`'s discovery, the same shape as
`AttachmentsController`/`OrgBrandingController`.

Frontend (case 17): `npx eslint src/App.jsx
src/pages/prescriptions/PrescriptionPrint.jsx
src/pages/share/prescription-otp.jsx src/utils/documents.js` — 0
errors (2 pre-existing hex-color warnings on `PrescriptionPrint.jsx`,
none new).

```
PASS src/pages/prescriptions/PrescriptionPrint.test.jsx

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total (2 new)
```

Full frontend suite: `npm run lint` exits 0 (1955 warnings, unchanged
ceiling); `npm run build` succeeds; `npm test` — 144/145 passing, the
1 failure (`booking/index.test.jsx`) is the same already-documented
full-parallel-only flake from `REQ107`/`REQ108` — passes 7/7 in
isolation, unrelated to this slice.

## Honest gaps — built, not automated-test-covered (cases 12-14, 18)

- **Cases 12-14** (`documents.controller.ts`'s `share-verify` — missing
  body fields, invalid/expired token, wrong `purpose` claim): no
  automated test exists. `PLAN149`'s own Outcome section explains why —
  no controller in this codebase has ever had its own spec file, and
  writing one only for this endpoint would introduce a testing shape
  found nowhere else here. Verified by code inspection only: the
  `try/catch` around `jwtService.verifyAsync` rejects an invalid/expired/
  tampered token before `claims` is ever read, and the `claims.purpose
  !== 'rx_share'` check runs before `prescriptionPdfForShare` is called.
- **Case 18** (`/share/rx/:token` public page): built per `PLAN149`'s
  own spec, but genuinely untested — no unit test was written for this
  component (a real gap, not silently dropped: this page's only logic
  is "read `:token` from the route, POST `{token, otp}`, trigger a
  download on success," thin enough that the plan's own testing section
  scoped it out in favor of a live-verification pass this session could
  not perform).

## No browser-automation tool available this session

No e2e Playwright spec, and no live verification against a real
WhatsApp/SMS provider account (none exists in this dev environment) —
both honestly logged, matching this batch's own established pattern
for every prior slice (`REQ106`/`REQ107`/`REQ108`/`REQ110`). The closest
available substitute is the mocked-provider unit coverage on
`sharePrescriptionViaWhatsapp` (cases 1-6), which exercises the exact
two-channel call shape (`getActiveConfigForOrg` then `provider.send`)
the real providers would receive.

## Real design corrections found and fixed before any code was written

See `PLAN149`'s own Outcome section for the full account — most
notably: `printPrescription()` was NOT reused for access control (it
increments `reprint_count` as a side effect, which would have
mismarked the clinic's own original print as a "reprint" purely
because a share happened); `loadPrescriptionForUser()` was used
instead, with a new `assemblePrintPayload()` helper shared between the
two paths so the actual PDF content stays byte-identical without
duplicating the assembly logic.
