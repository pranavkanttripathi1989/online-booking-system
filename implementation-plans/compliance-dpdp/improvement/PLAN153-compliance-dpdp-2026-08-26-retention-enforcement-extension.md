---
id: PLAN153
type: improvement
feature: compliance-dpdp
created: 2026-08-26
updated: 2026-08-26
status: in-progress
parent: REQ113
related: []
---

# PLAN153 — Extend automated retention enforcement to `consents`

Implementation plan for `REQ113`.

## Schema change

**`backend/prisma/schema.prisma`** — `Consents` model gains one column:

```prisma
model Consents {
  id            String    @id @default(uuid())
  patient_id    String
  client_org_id String
  purpose       String
  granted       Boolean
  granted_at    DateTime  @default(now())
  revoked_at    DateTime?
  notice_version String
  is_deleted    Boolean   @default(false) // REQ113 — soft-delete target for RetentionPurgeService

  patient             Patients             @relation(fields: [patient_id], references: [id])
  client_organization ClientOrganizations  @relation(fields: [client_org_id], references: [id])

  @@index([patient_id])
  @@index([client_org_id])
}
```

**New hand-written migration**
`backend/prisma/migrations/20260826150000_consents_is_deleted/migration.sql`
(this repo cannot run `prisma migrate dev` non-interactively — every
schema change ships as hand-written SQL per the established convention):

```sql
ALTER TABLE "Consents" ADD COLUMN "is_deleted" BOOLEAN NOT NULL DEFAULT false;
```

No backfill needed beyond the column default — every existing row is
correctly `false` (nothing has ever been purged).

After writing the migration: `npx prisma migrate deploy`, then
`npx prisma generate` on **both** the host and inside
`medibook_backend` (its own separate `node_modules` anonymous volume —
a host-only generate leaves the container's `tsc` watch on stale
types), then `docker restart medibook_backend`.

## Service change

**`backend/src/consent/retention-purge.service.ts`**:

```ts
const SUPPORTED_DATA_CLASSES = ['test_results', 'consents'] as const;
```

Add a second branch in the `for (const policy of policies)` loop's
`try`:

```ts
if (policy.data_class === 'consents') {
  const { count } = await this.prisma.consents.updateMany({
    where: {
      is_deleted: false,
      client_org_id: policy.client_org_id,
      OR: [
        { revoked_at: { not: null, lt: cutoff } },
        { revoked_at: null, granted_at: { lt: cutoff } },
      ],
    },
    data: { is_deleted: true },
  });
  if (count > 0) {
    this.logger.log(`Retention purge: soft-deleted ${count} consents row(s) for org ${policy.client_org_id} (older than ${policy.retention_years}y)`);
  }
}
```

Note the `OR` shape: a revoked consent's clock runs from `revoked_at`;
an active (never-revoked) consent's clock runs from `granted_at` — per
`REQ113`'s own design decision. `Consents` is scoped directly via its
own `client_org_id` column (no relation traversal needed, unlike
`test_results`' `ordered_by: {client_org_id}`).

Update the module-level comment block above `SUPPORTED_DATA_CLASSES` to
drop `consents` from the "not yet enforced" list and note it's now
live, keeping `clinical_records`/`messages`' own blockers documented
(don't silently delete the historical reasoning — future readers need
to know why those two specifically are still excluded).

## Testing

**`backend/src/consent/retention-purge.service.spec.ts`** — extend the
existing `prisma` mock with `consents: { updateMany: jest.fn() }`, and
add:

1. `findMany` where clause now includes `consents` in
   `data_class: { in: [...] }` — update the existing "only queries
   policies with legal_hold: false and a supported data class" test's
   expected array.
2. New case: a `consents` policy with an active (never-revoked) row
   older than the cutoff — soft-deleted, clock measured from
   `granted_at`.
3. New case: a `consents` policy with a revoked row — clock measured
   from `revoked_at`, not `granted_at`, even if `granted_at` alone would
   not yet be past the cutoff (proves the revoked-takes-priority design
   decision is actually implemented, not just documented).
4. New case: `legal_hold: true` for a `consents` policy — `consents
   .updateMany` never called, matching the existing `test_results`
   legal-hold case.
5. New case: `clinical_records` policy still never calls any purge
   (both `testResults.updateMany` and `consents.updateMany` stay
   untouched) — confirms the two still-blocked classes remain inert
   after this change, not just before it.
6. Existing "continues to the next policy if one purge fails" case —
   confirm it still passes unchanged (a `consents` purge failure
   shouldn't be able to break this either).

## Live verification

Temporarily insert one `RetentionPolicies` row for a real org with
`data_class: 'consents'`, `retention_years: 0` (or a `granted_at`
backdated via direct SQL on a temporary test `Consents` row), manually
invoke the service (or wait for the `@Cron` — more practically, call
`retentionPurgeService.sweep()` directly via a one-off script or by
temporarily changing the cron expression is unnecessary; instead
directly verify via a mocked-Prisma unit test plus a direct-SQL
before/after check: insert a backdated test `Consents` row, run the
service method directly via a small NestJS context bootstrap or by
checking the row is untouched pre-purge and correctly flagged
`is_deleted: true` after manually invoking the already-tested method),
then revert all inserted rows via direct SQL. Given this is an
automated data-destruction job, mocked-Prisma unit coverage is the
primary verification method — matching `REQ073`'s own precedent of
deliberately not live-firing the purge cron itself.

## Documentation

`REQ113` (requirement), this document (`PLAN153`), `TP152`/`TR151`
(test plan/results), a context bundle, and index updates to
`requirements/compliance-dpdp/README.md`,
`implementation-plans/compliance-dpdp/README.md`,
`test-plans/compliance-dpdp/README.md`,
`test-results/compliance-dpdp/README.md`, plus the five root README
index tables.

## Commit

One commit (schema + migration + service + tests are small enough to
land together for this slice, unlike the larger slices in this batch
which split backend/frontend/docs into three).
