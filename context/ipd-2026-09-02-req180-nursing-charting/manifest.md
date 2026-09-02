---
id: CTX-ipd-2026-09-02-req180-nursing-charting
type: requirement
feature: ipd
created: 2026-09-02
updated: 2026-09-02
status: done
parent: REQ180
related: [PLAN249, TP269, TR269, REQ179]
---

# ipd — slice 2: nursing charting, medication orders, MAR, discharge summary (2026-09-02)

Slice 2 of the 5-slice IPD plan approved alongside slice 1 (`REQ179`,
`context/ipd-2026-09-02-req179/manifest.md`) — core-first sequencing, this
slice reviewed and built directly on slice 1's `Admissions` aggregate root.
Triggered by a bare `continue` / "push and continue" after slice 1 shipped,
tested, and was pushed, per the working loop's own resumption protocol.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | REQ180 | [doc](../../requirements/ipd/requirement/REQ180-ipd-2026-09-02-nursing-charting-mar-discharge-summary.md) |
| implementation-plans | PLAN249 | [doc](../../implementation-plans/ipd/requirement/PLAN249-ipd-2026-09-02-nursing-charting-mar-discharge-summary.md) |
| test-plans | TP269 | [doc](../../test-plans/ipd/requirement/TP269-ipd-2026-09-02-nursing-charting-mar-discharge-summary.md) |
| test-results | TR269 | [doc](../../test-results/ipd/requirement/TR269-ipd-2026-09-02-nursing-charting-mar-discharge-summary.md) |

## What shipped

- **`Vitals` extended, not forked** — nullable `encounter_id`, new
  `admission_id`/`shift`, `CHECK vitals_exactly_one_parent`. A BP trend is
  one series across a patient's OPD and IPD history.
- **New `backend/src/nursing/` module**: vitals, intake/output (balance
  derived at read time), admission notes (nursing/doctor SOAP split, one
  table with a `note_kind` discriminator, per-note lock, append-only
  addenda regardless of lock state), SBAR shift handover, standing
  medication orders + their MAR (real stock consumption mirroring
  `pharmacy.service.ts`'s dispense transaction, high-alert witness gate, a
  30-min idempotent materialisation sweep).
- **`backend/src/admissions/discharge-summary.service.ts`** (existing
  module, per the plan's own layout): create pre-fills server-side from
  the admission's real `AdmissionEvents`/active orders, lock + SHA-256
  content-hash at sign time exactly like `Prescriptions.pdf_hash`.
- **Frontend**: `pages/ipd/NursingChart.jsx`, tablet-first, six tabs,
  reached via a new "Chart" action on the admissions detail dialog.

## Two real deviations from the original plan sketch, found by exploration before schema was written

Two `Explore` forks were dispatched before writing a single schema line,
specifically to de-risk this slice's own named highest-risk items:

1. `AdmissionNoteAddenda` needed to be a genuinely separate table (the
   `EncounterAddenda` precedent), not the self-relation the sketch assumed.
2. `DischargeSummaries` needed `pdf_hash` (the `Prescriptions` precedent),
   not the `pdf_ref`/`pdf_sha256` pair the sketch guessed at — no
   file-storage pattern exists anywhere in this codebase.

## A real bug found and fixed: GraphQL reflection on a TS union type

`nursing.resolver.ts` had four `@Args()` parameters typed as a TypeScript
union (`string | undefined`, `boolean | undefined`) with no explicit
`type:` option. TypeScript's `emitDecoratorMetadata` can't emit a runtime
type for a union — it emits bare `Object`, and `@nestjs/graphql`'s
reflection has nothing to resolve to a GraphQL scalar from, crashing
schema generation with `UndefinedTypeError` at container boot. Caught only
by actually booting the container (not `tsc --noEmit`, not any unit test —
GraphQL schema generation is a runtime step). Fixed by adding an explicit
`type: () => String`/`type: () => Boolean` to each, and retyping the
`from`/`to` MAR date-range args from `Date | undefined` to
`string | undefined` to match this codebase's own established bare-date-
range convention (`new Date(...)` parsed server-side, never a `Date`-typed
GraphQL arg directly).

## An environment interruption mid-session, resolved the same session

Docker Desktop's daemon was found unreachable
(`dial unix docker.raw.sock: connect: connection refused`) with no Docker
Desktop process running at all — not the previously-documented "container
wedged but daemon responsive" pattern, a full daemon exit. Resolved with
`open -a Docker`, a ~5s wait for the daemon socket, after which every
`medibook_*` container came back up automatically (compose's own restart
policy) with no data loss and no manual `docker compose up` needed.

## Deliberately NOT built in this slice (recorded, not silently dropped)

ICU ventilator/infusion flowsheets (per the user's own confirmed "standard
ward charting" decision at plan time). Discharge-summary PDF rendering —
the content-hash-at-sign-time design is in place; a `documents.service.ts`
export is additive future work. A discharge-summary addendum path for a
post-signing correction — no such table exists yet. Operation theatre, IPD
billing, TPA cashless insurance — slices 3-5, per the confirmed core-first
sequencing.

## Verification

Backend: 57 new unit tests across 5 spec files, full suite 157
suites/2478 tests, `tsc`/`eslint` clean. Live schema introspection
confirmed all 11 new queries and 17 new mutations genuinely served after
fixing the `@Args` union-type bug above. Frontend: build/lint/size-limit
green, `NursingChart`'s own lazy chunk 9.35kB gzipped; full suite 55/64
clean on a parallel run, all 9 failures confirmed as this codebase's own
documented contention flakiness (none import anything this slice touched;
two spot-checked in isolation both passed clean).

## Commits

`e10a380` (backend), `71adee8` (backend tests), `f3c7c0d` (frontend).
