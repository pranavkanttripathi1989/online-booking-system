---
id: PLAN249
type: requirement
feature: ipd
created: 2026-09-02
updated: 2026-09-02
status: done
parent: REQ180
related: [TP269, TR269]
---

# PLAN249 — Implementation plan: IPD slice 2 (nursing charting, MAR, discharge summary)

Full design rationale for this slice and the two remaining after it lives
in the approved plan file
(`/Users/pranavkanttripathi/.claude/plans/starry-soaring-bunny.md`) — this
document is the as-built record of what that plan became, including the
deviations found during exploration before schema was written.

## Migrations (both hand-written, applied via `prisma migrate deploy`)

`20260902200000_ipd_nursing_vitals_extension`:

```sql
ALTER TABLE "Vitals" ALTER COLUMN "encounter_id" DROP NOT NULL;
ALTER TABLE "Vitals" ADD COLUMN "admission_id" TEXT;
ALTER TABLE "Vitals" ADD COLUMN "shift" TEXT;
ALTER TABLE "Vitals" ADD CONSTRAINT "vitals_exactly_one_parent"
  CHECK (num_nonnulls(encounter_id, admission_id) = 1);
ALTER TABLE "Vitals" ADD CONSTRAINT "Vitals_admission_id_fkey"
  FOREIGN KEY ("admission_id") REFERENCES "Admissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Vitals_admission_id_recorded_at_idx" ON "Vitals"("admission_id", "recorded_at");
```

Verified via `psql` before this migration was written: zero pre-existing
`Vitals` rows would violate the CHECK (every existing row has a non-null
`encounter_id` and no `admission_id`).

`20260902210000_ipd_nursing_charting` (272 lines) — `IpdMedicationOrders`,
`MedicationAdministrations` (`@@unique([order_id, scheduled_at])` →
`CREATE UNIQUE INDEX "MedicationAdministrations_order_id_scheduled_at_key"`,
the constraint that makes the materialisation sweep idempotent),
`IntakeOutputRecords`, `AdmissionNotes`, `AdmissionNoteAddenda`,
`ShiftHandovers`, `DischargeSummaryTemplates`, `DischargeSummaries`. New
reusable trigger function:

```sql
CREATE FUNCTION reject_write_if_locked() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."locked" THEN
      RAISE EXCEPTION 'Cannot delete a signed (locked) % %', TG_TABLE_NAME, OLD.id;
    END IF;
    RETURN OLD;
  END IF;
  IF OLD."locked" THEN
    RAISE EXCEPTION 'Cannot modify a signed (locked) % %; add an addendum instead', TG_TABLE_NAME, OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

applied to `AdmissionNotes` and `DischargeSummaries` via
`BEFORE UPDATE OR DELETE` triggers — simpler than slice 1's
`reject_write_if_encounter_locked()` since `locked` lives on the same row
here, no join needed.

## Two deviations from the original plan sketch, found before schema was written

Two parallel `Explore` forks were dispatched against the real code before
any schema line was written, specifically to de-risk this slice's riskiest
pieces:

1. **`AdmissionNoteAddenda` is a genuinely separate table**, not the
   self-relation (`parent_note_id`) the original plan sketch assumed.
   `EncounterAddenda` (`schema.prisma`, pre-existing) is itself a separate
   table with its own FK to `Encounters` and no trigger — append-only by
   construction, since the service only ever creates rows against it. This
   is the exact pattern copied.
2. **`DischargeSummaries.pdf_hash`**, not the `pdf_ref`/`pdf_sha256` pair
   the original sketch guessed at. No file-storage pattern exists anywhere
   in this codebase; `Prescriptions.pdf_hash` (SHA-256 over canonical
   clinical content, computed at the moment of signing, never over
   rendered PDF bytes — pdfkit stamps a non-deterministic wall-clock
   `CreationDate`) is the real, already-shipped precedent, replicated
   exactly in `discharge-summary.service.ts#computeContentHash`.

## Backend layout

`backend/src/nursing/` — `nursing.service.ts` (vitals, intake/output,
admission notes + addenda, shift handover), `medication-orders.service.ts`
(create/hold/resume/stop a standing order), `mar.service.ts` (administer a
scheduled dose, record a PRN dose, both sharing a private `consumeStock()`
helper replicating `pharmacy.service.ts`'s transaction shape),
`mar-schedule-sweep.service.ts` (`@Cron('*/30 * * * *')`, a rolling 24h
forward window, per-order `try/catch`), `nursing.resolver.ts`,
`nursing.module.ts` (self-registers `ScheduleModule.forRoot()`, idempotent,
matching `admissions.module.ts`'s own convention).
`backend/src/admissions/discharge-summary.service.ts` lives in the
existing `admissions/` module per the plan's own stated layout (discharge
summary is conceptually part of the admission lifecycle, not nursing
charting), with its resolver methods added directly to the existing
`AdmissionsResolver`.

## A real bug found and fixed: GraphQL `@Args` with a union TS type

Four `@Args()` declarations across `nursing.resolver.ts` (`note_kind`,
`active_only`, `from`, `to`) were typed `string | undefined` /
`boolean | undefined` with no explicit `type:` option, matching a pattern
that works fine for a plain `string`/`boolean` parameter elsewhere in this
codebase (e.g. `mlcRegisters`'s `pending_intimation_only: boolean`).
TypeScript's `emitDecoratorMetadata` cannot emit a runtime type for a union
— it emits `Object`, which `@nestjs/graphql`'s reflection cannot resolve to
a GraphQL scalar, crashing schema generation with `UndefinedTypeError` at
container boot (caught live, not by `tsc --noEmit` or any unit test — the
container had to actually boot to hit it, since GraphQL schema generation
is a runtime step). Fixed by adding an explicit `type: () => String` /
`type: () => Boolean` to each. The `from`/`to` date-range pair was also
retyped from `Date | undefined` to `string | undefined` to match this
codebase's own established convention for bare date-range `@Args`
(`appointment-payments.resolver.ts`, `analytics.resolver.ts`: always plain
ISO strings, parsed server-side via `new Date(...)`, never a `Date`-typed
GraphQL arg) — `mar.service.ts#admissionMar` updated to match.

## Frontend

`frontend/src/pages/ipd/NursingChart.jsx` — tablet-first tier (verified
768/1024/1280), page-local `gql` (a brand-new domain, no prior contract to
match). Six tabs, each lazily loaded on first visit rather than all at
once. Reader-facing free text (discharge summary sections) uses the
existing `RichTextEditor` (FORM-20), lazy-loaded per its own established
convention. Reached via a new "Chart" action on
`pages/ipd/Admissions.jsx`'s detail dialog, visible for `admitted`/
`discharge_initiated` admissions — no new top-level nav entry, matching how
transfer/discharge/cancel already surface only from that same dialog.
Route added to `App.jsx`'s existing IPD `RoleGuard` block
(`/ipd/chart/:admissionId`).

## Verification

Backend: `npx tsc --noEmit` and `npx eslint "{src,apps,libs,test}/**/*.ts"`
clean throughout. Full unit suite 157 suites/2478 tests. Live schema
introspection against the running container (after `prisma generate` +
`docker restart medibook_backend`) confirmed all 11 new queries and 17 new
mutations genuinely served, not lost to the documented silent
module-recompile race. Frontend: `eslint` clean of real findings (only the
pre-existing, accepted I18N-1 warning class — no i18n layer exists yet, see
`FRONTEND_RULES.md` §22), `npm run build` and `npm run size` green
(`NursingChart`'s own lazy chunk 37.99kB / 9.35kB gzipped, well under the
100kB lazy-route budget), full frontend suite 55/64 suites clean on a
parallel run — the 9 failures (`Calendar`, `PrescriptionBuilder`,
`patients/detail`, `manager/claims`, `EncounterWorkspace`, `booking/index`,
`admin/Communications`, `manager/imports`, `manager/revenue-share`) touch
nothing this slice changed and are this codebase's own documented
full-parallel-run contention flakiness — two spot-checked in isolation
(`revenue-share`, `Communications`) both passed clean.
