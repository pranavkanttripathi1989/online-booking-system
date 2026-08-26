---
id: PLAN142
type: improvement
feature: messaging
created: 2026-08-26
updated: 2026-08-26
status: in-progress
parent: REQ102
related: []
---

# PLAN142 — Non-clinician staff department membership (REQ102)

## Schema change

`backend/prisma/schema.prisma` — `UserProfiles` model, add alongside the
existing `department String?` field (do not touch it):

```prisma
// REQ102 — a separate, real FK to the clinical Departments entity, used
// for message-thread auto-participant-add. Distinct from the free-text
// `department` column above (an administrative label, e.g. "Front
// Desk") — a staff member's administrative team and their clinical
// department assignment are independent by design; see REQ102's own doc.
department_id_ref String?
departmentRef      Departments? @relation(fields: [department_id_ref], references: [id])
```

Naming note: `department_id_ref`/`departmentRef` (not the more obvious
`department_id`/`department`) deliberately avoids colliding with the
existing free-text `department` field's name space at the Prisma-model
level, where relation and scalar field names must be unique and
`department` is already taken. The GraphQL-facing field name (below) is
`departmentId`, which reads cleanly to a frontend consumer and does not
collide with the existing `department: String` GraphQL field either.

New index: `@@index([department_id_ref])`, matching `Clinicians`' and
`Products`' own `@@index([department_id])` precedent.

Migration file: `backend/prisma/migrations/<timestamp>_userprofiles_department_ref/migration.sql`
— hand-written (this repo cannot run `prisma migrate dev`
non-interactively):

```sql
ALTER TABLE "UserProfiles" ADD COLUMN "department_id_ref" TEXT;
ALTER TABLE "UserProfiles" ADD CONSTRAINT "UserProfiles_department_id_ref_fkey"
  FOREIGN KEY ("department_id_ref") REFERENCES "Departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "UserProfiles_department_id_ref_idx" ON "UserProfiles"("department_id_ref");
```

`ON DELETE SET NULL` matches this schema's existing convention for an
optional grouping FK (a deleted department shouldn't cascade-delete the
staff member, just unlink them).

## Backend changes

**`backend/src/staff/entities/staff.entity.ts`** — add
`@Field(() => ID, { nullable: true }) departmentId?: string;`

**`backend/src/staff/dto/staff.input.ts`** — add
`@Field(() => ID, { nullable: true }) @IsOptional() departmentId?: string;`
to both the create and update input classes (matching the existing
`department?: string` field's placement).

**`backend/src/staff/staff.service.ts`**:
- `toGraphQL()`: map `department_id_ref` → `departmentId`.
- `create()`/`update()`: if `input.departmentId` is provided, validate it
  via a new `assertDepartmentInScope(input.departmentId, user)` call
  (reuse `DepartmentsService`'s existing method — the exact one
  `messages.service.ts#createThread` already calls for the identical
  cross-org check) before writing `department_id_ref: input.departmentId`.
  `staff.module.ts` needs `DepartmentsModule` imported (matching how
  `messages.module.ts` already imports it).

**`backend/src/messages/messages.service.ts#resolveScopedMemberUserIds`**
— extend the `departmentId` branch to union both sources:

```ts
private async resolveScopedMemberUserIds(departmentId: string | undefined, clinicId: string | undefined) {
  if (departmentId) {
    const clinicians = await this.prisma.clinicians.findMany({ where: { department_id: departmentId }, select: { id: true } });
    const clinicianIds = clinicians.map((c) => c.id);
    const [clinicianProfiles, staffProfiles] = await Promise.all([
      clinicianIds.length
        ? this.prisma.userProfiles.findMany({ where: { clinician_id: { in: clinicianIds }, is_deleted: false }, select: { id: true } })
        : Promise.resolve([]),
      this.prisma.userProfiles.findMany({ where: { department_id_ref: departmentId, is_deleted: false }, select: { id: true } }),
    ]);
    const ids = new Set([...clinicianProfiles.map((p) => p.id), ...staffProfiles.map((p) => p.id)]);
    return [...ids];
  }
  if (clinicId) {
    const profiles = await this.prisma.userProfiles.findMany({ where: { clinic_id: clinicId, is_deleted: false }, select: { id: true } });
    return profiles.map((p) => p.id);
  }
  return [];
}
```

The `Set` dedupes the edge case where a `UserProfiles` row happens to be
reachable via both paths (shouldn't occur in practice since a clinician
account's own `UserProfiles.department_id_ref` would be independently
nullable, but the union must not double-add the same participant id — a
duplicate-participant insert would violate `MessageParticipants`' own
unique constraint if one exists, or just be sloppy if it doesn't; dedupe
defensively either way).

## Frontend changes

**`frontend/src/pages/staff/edit.jsx` and `new.jsx`**:
- New query `DEPARTMENTS_QUERY` (or reuse an existing one if
  `admin/departments`'s page already exports a shared query — check
  before adding a duplicate) fetching real `departments { id name }`.
- New `Autocomplete` (not a hardcoded `Select`, since departments are
  real org data, not a fixed list) labeled "Clinical Department"
  distinctly from the existing "Department *" `Select` (which stays
  exactly as-is, unchanged, still backed by the free-text `DEPARTMENTS`
  constant) — placed in the same form section, with helper text
  clarifying the distinction (e.g. "Used to auto-include this staff
  member in that department's message threads").
- `handleSubmit`: include `departmentId: selectedDepartment?.id ?? null`
  in the mutation variables.

**`frontend/src/pages/staff/index.jsx`**: no change required — the
existing department **filter** chips are explicitly about the
free-text field per REQ102's own scope; leave them alone.

## Testing

`staff.service.spec.ts` — new cases: `create`/`update` with a valid
`departmentId` writes `department_id_ref`; `create`/`update` with a
cross-org `departmentId` is rejected via `assertDepartmentInScope`;
`findOne`/`findAll` correctly map `department_id_ref` → `departmentId`.

`messages.service.spec.ts` — extend the existing "department/clinic
scoping" describe block: a new case asserting a staff member whose
`department_id_ref` matches the thread's department is included as a
participant even when they have zero linked clinicians; a case asserting
no duplicate participant when a hypothetical profile is reachable via
both the clinician path and the direct staff path; the existing
"auto-adds every department member as a participant" test's mock needs
`userProfiles.findMany` to be called twice now (once per source) —
update the assertion to match the new call shape rather than leaving a
stale single-call assertion in place.

`departments.service.spec.ts` — no change expected;
`assertDepartmentInScope` is reused as-is.

Live verification: assign a real seeded staff account to a real
department via the new UI, create a department-scoped thread, confirm
the staff account appears as a participant over real GraphQL — then
revert the assignment.

## Commits

Two commits: backend (schema/migration/service/resolver/tests), frontend
(staff edit/new UI) — matching this batch's per-slice convention.
