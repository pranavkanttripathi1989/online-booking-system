---
id: TR233
type: improvement
feature: prescriptions
created: 2026-08-29
updated: 2026-08-29
status: pass
parent: TP233
related: [REQ160, PLAN213]
---

# TR233 — Results: regional-language Rx print (P2-08)

## Backend

- `npx jest src/common/pdf/i18n-labels.spec.ts --maxWorkers=1`:
  **8/8 green**.
- `npx jest src/documents/documents.service.spec.ts src/common/pdf/
  --maxWorkers=2`: **40/40 green** (31 pre-existing + 9 new, including
  the 3 new Hindi/English/unrecognised-language cases).
- `npx jest --maxWorkers=2` (full backend suite): **127/127 suites,
  2032/2032 tests, green**.
- `npm run test:int`: **9/9 suites, 414/414 tests, green** (from the
  host, `postgres_test` already up). Unrelated pre-existing
  `WebhookDispatchService` decrypt error-log noise in the output —
  a deliberately-invalid-encrypted-secret test fixture logging loudly
  by this codebase's own convention, not a failure.
- `npx tsc --noEmit`: clean.
- `npx eslint "{src,apps,libs,test}/**/*.ts" --quiet`: clean.

## Frontend

- `npx jest src/pages/prescriptions/PrescriptionPrint.test.jsx
  --maxWorkers=1`: **7/7 green** (6 pre-existing + 1 new Hindi-document
  case).
- `npx jest src/pages/clinician/PrescriptionBuilder.test.jsx
  --maxWorkers=1`: **8/8 green** (6 pre-existing + 2 new print-language
  cases).
- `npx jest --maxWorkers=4` (full frontend suite): **304 tests, 286
  green**; 9 suites failed under full-parallel contention — all 9
  confirmed pre-existing/unrelated (`admin/Communications`,
  `booking/index`, `clinician/EncounterWorkspace`,
  `clinicians/CreateClinicianPage`, `manager/claims/index`,
  `manager/pharmacy/index`, `patient/Appointments`,
  `patients/detail`, `settings/index`) by isolation re-runs, each
  passing clean alone. Neither `PrescriptionPrint.test.jsx` nor
  `PrescriptionBuilder.test.jsx` appear in that failure list — both
  passed even under full-parallel contention.
- `npm run lint`: **0 errors**, warning ratchet **decreased** (3276 →
  3261 — several previously-hardcoded strings in `PrescriptionPrint
  .jsx` now route through `t()`/`tDoc()`).
- `npm run i18n:coverage`: **passes** — `hi/common.json` 64/64 keys
  fully covered, pseudo locale regenerated and in sync.
- `npm run build`: succeeds.
- `npm run size`: within budget — initial bundle 328.68 kB / 350 kB,
  largest lazy chunk 109.92 kB / 115 kB, initial CSS 13.53 kB / 18 kB.

## A real technical finding during test-writing, not just a passing test

Confirmed live (not assumed) that pdfkit 0.20's font embedding
genuinely differs by source format for the same upstream font: a
direct Node script embedding `@fontsource/noto-sans-devanagari`'s own
`.woff2` build threw `RangeError: Offset is outside the bounds of the
DataView` inside `fontkit`'s glyph-encoding path; the same script
against a `.ttf` of the identical Noto Sans Devanagari (OFL-1.1, via
`@expo-google-fonts/noto-sans-devanagari`) produced a valid PDF whose
own `/FontFile2`/`/CIDFontType2`/`/BaseFont` objects confirm a real,
correctly-subsetted embedded font — this is the evidence
`documents.service.spec.ts`'s new Hindi-path test now asserts directly,
not just "a PDF came out."

## Not executed this pass

Live browser verification (issuing a real Hindi prescription against
the dev stack and visually confirming glyph rendering) — no
browser-automation tool was available this session. Logged as the
explicit next step in `TP233`, not silently skipped.
