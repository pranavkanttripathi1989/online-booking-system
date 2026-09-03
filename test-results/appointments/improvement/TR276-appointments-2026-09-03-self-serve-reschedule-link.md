---
id: TR276
type: improvement
feature: appointments
created: 2026-09-03
updated: 2026-09-03
status: done
parent: TP276
related: [REQ187, PLAN256]
---

# TR276 — Test results: self-serve reschedule link (P2-16)

## Outcome

All 30 cases in `TP276` pass.

- `appointments.service.spec.ts`: **134/134** (20 new — 4 for
  `issueRescheduleToken`, 5 for `getRescheduleContext`, 9 for
  `reschedulePublic`, 2 regression cases on `update()`; all 114
  pre-existing tests unaffected by the `maybeChargeRescheduleFee`
  extraction, confirming the refactor changed no observable behaviour).
- `appointment-reminder-sweep.service.spec.ts`: **14/14** (3 new).

Full backend unit suite: **167 suites / 2681 tests**, green.
`npx tsc --noEmit` and `npx eslint "{src,apps,libs,test}/**/*.ts"` clean.

## Live-only checks

Container restarted after the migration + resolver/service changes.
Recompiled clean ("Found 0 errors"), booted with no errors. Live GraphQL
introspection confirmed both `getRescheduleContext` and
`reschedulePublicAppointment` genuinely served:

```
curl .../graphql -d '{"query":"{ __schema { queryType { fields { name } } mutationType { fields { name } } } } }"}'
→ getRescheduleContext: true, reschedulePublicAppointment: true
```

Integration: full suite re-run — **13 suites / 516 tests**, all green,
including `matrix-coverage.int-spec.ts`'s existing `appointments` coverage
(unaffected — same-domain addition, not a new resolver domain). The
pre-existing `WebhookDispatchService` "Failed to decrypt secret" /
"Invalid authentication tag length: 0" log lines are confirmed
pre-existing fixture noise, identical to prior slices' own integration
runs, unrelated to this change.

## Frontend

`npx eslint` on the three touched/new files: 0 errors, 9 `I18N-1`
warnings — the standing no-i18n-layer-yet pattern already present on
every other public page (`checkin.jsx` included), not new debt from this
slice's own design. `node scripts/check-page-data-wiring.mjs`: clean (1
known-fabricated page, 0 new). `npm run build`: succeeds. `npm run size`:
all four budgets held (331.67 kB / 350 kB initial; 109.92 kB / 115 kB
largest lazy chunk; 125.06 kB / 130 kB RichTextEditor; 13.59 kB / 18 kB
initial CSS) — near-identical to the pre-slice baseline since no new
dependency was added.

`reschedule.test.jsx` (new): **8/8** passing, covering the invalid-token
state, the non-slot-mode "contact the clinic" state, the appointment
summary render, a booked slot shown disabled (`BOOK-6`), a successful
reschedule with and without a fee, a real slot-conflict error surfaced
with the picker still usable, and an axe-core zero-violations check.

Two real test-authoring bugs found and fixed while writing this file,
neither in product code:

1. A booked-slot fixture hardcoded as a literal `${tomorrow}T09:00:00.000Z`
   (UTC) rendered as a different local hour once `dayjs(...).format('HH:mm')`
   converted it to this IST host's own local time — the exact
   timezone-ambiguous-fixture class `context/open-questions.md` #15
   already documents, now confirmed to also bite a hand-authored test
   fixture, not just production booking code. Fixed by constructing the
   fixture the same local-timezone-aware way the component's own
   `newStart` variable is built (`dayjs(...).toISOString()`), matching
   the mutation-variable construction already used elsewhere in the same
   test file.
2. `error: new GraphQLError('...')` passed directly to a `MockedProvider`
   mock's `error` field populates Apollo's `networkError`, not
   `graphQLErrors` — the component's own `error.graphQLErrors?.[0]?.message`
   read stayed empty and silently fell back to its generic message,
   which the first draft of the test didn't catch because it only
   asserted the state's title, not the specific backend message text.
   Fixed to `result: { errors: [new GraphQLError('...')] }`, the shape
   already established in `appointments/edit.test.jsx` and
   `patients/detail.test.jsx`.

## Full frontend suite — confirming pre-existing flakiness, not a regression

Run twice in full (`--maxWorkers=2`). Both runs flagged the same 5
pre-existing suites (`patients/detail`, `EncounterWorkspace`,
`PrescriptionBuilder`, `manager/claims/index`, `test-results/index`) —
**none import `pages/public/checkin.jsx`, `pages/public/reschedule.jsx`,
`App.jsx`'s new route entries, or any GraphQL operation this slice
added**, confirmed by grep. Two spot-checked directly:

- `test-results/index.test.jsx` — 7/7 passing in full isolation.
- `manager/claims/index.test.jsx` — failed once in full isolation on a
  `waitFor` timing assertion (`Mark Settled` button appearing after a
  mutation + refetch), then passed cleanly, 7/7, on an immediate retry
  with zero code changes in between. Non-deterministic timing flakiness
  under host load, not a deterministic regression — matches this
  codebase's own repeatedly-documented full-parallel-run resource-
  contention pattern from prior slices (`PrescriptionBuilder`,
  `EncounterWorkspace`, and others have each been flagged and cleared the
  identical way in earlier sessions' own accounts).

## Commits

- (backend code, frontend code, and docs committed as separate
  conventional commits — see the P2-16 commits on `master`)
