---
id: TECH006
type: technical-plan
feature: technical-plans
created: 2026-08-22
updated: 2026-08-22
status: active
parent: TECH000
related: [TECH000, TECH005]
---

# 05 — Cross-cutting conventions

Read this before any phase document. Everything below is derived from
conventions this codebase already established and paid for — not new proposals.

## 1. Module scaffolding template

Every new backend domain follows the existing file layout exactly (verified
against all 29 current modules):

```
backend/src/<domain>/
  <domain>.module.ts
  <domain>.resolver.ts
  <domain>.service.ts
  <domain>.service.spec.ts        # mandatory, not optional
  <domain>.resolver.spec.ts       # where the resolver has real logic beyond delegation
  dto/<thing>.input.ts            # @InputType(), class-validator decorators
  entities/<thing>.entity.ts      # @ObjectType()
```

Then register in `backend/src/app.module.ts`'s `imports` array. Nothing else is
needed — the three global `APP_GUARD`s and the `AuditLogInterceptor` apply
automatically to every new resolver. That is the whole point of them being
global; do not re-register guards per-resolver.

### Naming: GraphQL type names may differ from Prisma model names

Deliberately. `Products` (Prisma) surfaces as both `Product` and `Service`
GraphQL types because two different frontend pages consume the same table with
different field expectations. When adding an entity, check whether an existing
GraphQL type name is already taken before registering — a collision is a
startup crash, and the codebase has hit it before (`User` vs `AuthUser`).

## 2. Which GraphQL dialect — decision table

Two dialects coexist on purpose (`CLAUDE.md` Architecture). Pick by consumer,
never by preference:

| If the consumer is… | Use | Shape |
|---|---|---|
| An admin/staff page importing `frontend/src/graphql/{queries,mutations}.js` | **Canonical dialect** | `snake_case` fields, `{data, paginatorInfo}` pagination, mutations return the entity |
| A patient-facing page with its own inline `gql` (`public/`, `booking/`, `video/`) | **Public dialect** | `camelCase` fields, `getX`/`getXs` query names |
| A brand-new surface with no existing consumer | **Canonical** | …unless it is patient-facing, in which case match the neighbouring public-dialect pages |

**Never unify these.** A collision between the two gets resolved by renaming the
*public-dialect* side (precedent: `createAppointment` → `bookPatientAppointment`),
never the already-live canonical one.

## 3. Which mutation-response convention

Three coexist. Match the consuming page verbatim (`CLAUDE.md` Hard Rule 7):

| Convention | Used by |
|---|---|
| `{success, userErrors[, entity]}` | `Languages`, `RoomTypes`, `ClinicianTypes`, `EmailTemplates`, `Organizations`, `Availability`, `Blocks`, some `Rooms`/`Products` pages |
| Return the entity directly | Everything importing canonical `graphql/mutations.js`, plus `Staff`, `Reviews`, `Messages`, `Public` |
| `{success}` only | `Notifications` |

For a new domain with no consumer yet: use `{success, userErrors}` for anything
with meaningful partial-failure semantics (bulk operations, validations the UI
must render field-by-field), and return-the-entity otherwise.

## 4. Tenant scoping — the non-negotiable pattern

After Phase F lands the shared helper (`00-foundation-hardening.md` §2), every
tenant-scoped query uses it. Until then, and as the target shape afterward:

```ts
// Reads: scope the query
const where = { is_deleted: false, ...orgScope(user) };

// Writes that accept a foreign id (clinic_id, branch_id, clinician_id…):
// validate ownership BEFORE the write. This is Hard Rule 6 and the single
// most-repeated bug class in this codebase (5 domains so far).
if (user.client_org_id) {
  const parent = await this.prisma.clinics.findUnique({ where: { id: input.clinic_id } });
  if (!parent || parent.client_org_id !== user.client_org_id) {
    throw new BadRequestException('Clinic not found');   // not "Forbidden" — don't confirm existence
  }
}
```

Plus **self-scoping** where the role demands it — org scoping answers "which
tenant", never "which patient/clinician within it". Use a sentinel, never a
skipped filter, so an unlinked account fails closed:

```ts
private selfScope(user: JwtPayload) {
  if (user.roles.includes('patient'))   return { id: user.patient_id ?? '__no_patient_link__' };
  if (user.roles.includes('clinician')) return { appointments: { some: { clinician_id: user.clinician_id ?? '__no_clinician_link__' } } };
  return undefined;
}
```

## 5. Money, dates, addresses

- **Money is `Int` paise.** Convert to rupees only at the resolver boundary, never in the schema. A `Float` money column is a bug.
- **Dates**: store UTC, render local. IST (`Asia/Kolkata`) is the default timezone on `Clinics`. Phase 1 introduces a real timezone model for appointments (`01-phase1-mvp.md` §3.4) — until then, be aware `appointment_date` + `appointment_time` are two independent zone-less timestamps.
- **Addresses**: India structured shape `{line1, line2, city, state, pincode, country}` for new entities. `Clinics` still uses the older flat Western shape (`address`/`city`/`postcode`) — a known, documented inconsistency; don't silently "fix" it in an unrelated slice.

## 6. Testing obligations per slice

Non-negotiable per `CLAUDE.md` Hard Rules 2–3. A slice is not done without:

1. **Unit tests** on the service: happy path, validation failure, **cross-tenant rejection**, **self-scoping** (where the role applies), role gating.
2. **A tenancy-matrix entry** once Phase F's integration harness exists (`00-foundation-hardening.md` §4). A new domain without a matrix row fails CI by design.
3. **At least one e2e path** against the real backend (Playwright, `frontend/`) for any user-facing flow.
4. **Responsive check** at 360/768/1280px for any touched screen.
5. **Lint + typecheck + full suite green** before commit.

Note the measured reality when planning test effort: the backend suite is 602
tests across 49 suites and runs in ~140s **on the host** — a single spec file
exceeded 400s inside `medibook_backend`, so run tests host-side in the normal
loop (`project-plans/02-findings-register.md` F-32).

## 7. Definition of done (per slice, all phases)

- Resolvers match the consuming page's contract verbatim (§2, §3).
- Tenant isolation and self-scoping proven by test, not by inspection.
- New tables carry indexes in the *same* migration that creates them (`04-data-model-evolution.md` §5).
- No unbounded list resolver — pagination or an enforced server-side `take`.
- No page ships rendering data it didn't fetch.
- Mock dependency removed for the domain's operations.
- Committed as its own vertical slice with a conventional-commit message.

## 8. What to do when the PRD and this codebase disagree

The PRD describes a greenfield product; this is a real codebase with paid-for
decisions. When they conflict:

- **PRD wins on product behaviour** (what the feature does, what the user sees).
- **Codebase wins on convention** (naming, dialect, response shape, tenancy pattern, money representation).
- **Neither wins silently on architecture.** If the PRD's data model contradicts an established table (e.g. its abridged `Appointment` vs. the real `Appointments`), adapt the PRD's intent onto the existing shape and note the deviation in the slice's `PLAN###` doc.
- **Genuine ambiguity → stop and ask** (Hard Rule 10), logging it in `context/open-questions.md`.
