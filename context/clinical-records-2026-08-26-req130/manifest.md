---
id: CTX-clinical-records-2026-08-26-req130
type: improvement
feature: clinical-records
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ130
related: [PLAN170, TP190, TR190]
---

# clinical-records — REQ130: discrete vitals and growth chart (2026-08-26)

Seventh slice of the next 10-slice batch (`project-plans/12-next-10-slice-batch.md`).

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ130 | [Discrete vitals / growth chart](../../requirements/clinical-records/improvement/REQ130-clinical-records-2026-08-26-discrete-vitals-growth-chart.md) |
| implementation-plans | PLAN170 | [implementation plan](../../implementation-plans/clinical-records/improvement/PLAN170-clinical-records-2026-08-26-discrete-vitals-growth-chart.md) |
| test-plans | TP190 | [verification plan](../../test-plans/clinical-records/improvement/TP190-clinical-records-2026-08-26-discrete-vitals-growth-chart.md) |
| test-results | TR190 | [verification results — pass](../../test-results/clinical-records/improvement/TR190-clinical-records-2026-08-26-discrete-vitals-growth-chart.md) |

## What shipped

`REQ020`'s own recorded scoping decision put "vitals" as a free-text note
section at P0 and explicitly deferred structured/trendable vitals to P1
— the actual "growth charts" half of `FR-EMR-05`. A new `Vitals` table
(code/value/unit, matching the requirement's own Data Model Impact
section), `recordVitals`/`patientVitals` on the `encounters` domain, and
a "Vitals" section + "Growth Chart" dialog (real `recharts` line charts)
on `EncounterWorkspace.jsx`. Deliberately scoped to the clinician's own
workspace rather than `patients/detail.jsx`, which has several tabs
still paused on a separate product decision (`context/open-questions.md`
#13).

## Verification

Backend: 92/92 unit suites, 1505/1505 tests (6 new); integration 4/4
suites, 387/387 unchanged (new migration applied cleanly via the
integration harness's own `global-setup.ts`). `tsc --noEmit`/`eslint`
clean. Frontend: `EncounterWorkspace.test.jsx` 12/12 (3 new, including a
real `recharts` render exercised via a jsdom `ResizeObserver` stub),
`eslint` clean, 3 warnings unchanged from baseline (chart lines use
`theme.palette` colors, not hex literals).
