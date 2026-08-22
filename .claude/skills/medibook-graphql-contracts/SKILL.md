---
name: medibook-graphql-contracts
description: Match the existing GraphQL contract when writing or changing any resolver in this repo, where two naming dialects and three mutation-response conventions coexist on purpose. Use before writing a resolver, entity, or DTO; when a frontend page reports a field mismatch; or when deciding a new operation's shape. Triggers on "new resolver", "add a query", "add a mutation", "GraphQL type", "field name", "camelCase or snake_case", "why is this field null", "contract mismatch", "@ObjectType", "@InputType".
metadata:
  origin: project-specific
  vetted: >-
    Written 2026-08-22 from this repository's own architecture notes in
    CLAUDE.md and verified against backend/src/*/entities and
    frontend/src/graphql/*.js during the 2026-08-22 audit. The listed bugs
    (token vs access_token, User vs AuthUser, LOGOUT_MUTATION shape) are real
    incidents recorded in the repo, not hypothetical examples.
---

# MediBook GraphQL contracts

`CLAUDE.md` Hard Rule 7: **match the existing contract, don't invent a
"reasonable" one.** Skipping this has caused a real bug every time.

## Step zero, always

Before writing or changing a resolver, open the consuming page and read its
GraphQL **verbatim** — field names, nullability, argument shape, response shape:

- Canonical/admin pages: `frontend/src/graphql/queries.js`, `mutations.js`, `subscriptions.js`
- Patient-facing pages: the page's own inline `gql` (`pages/public/*`, `pages/booking/*`, `pages/video/*`)

Real bugs from skipping this: a returned `token` field the frontend actually read
as `access_token`; a GraphQL type that had to be named exactly `User` (not
`AuthUser`) to satisfy a fragment's type condition; `LOGOUT_MUTATION` expecting a
bare scalar, not an object.

## Two dialects, deliberately

| | Canonical / admin | Public / patient self-serve |
|---|---|---|
| **Fields** | `snake_case` (`first_name`, `start_datetime`, `client_org_id`) | `camelCase` (`firstName`, `startTime`, `clinicianType`) |
| **Query names** | plain (`appointments`, `clinics`) | `getX` / `getXs` prefix |
| **Pagination** | `{data, paginatorInfo}` | varies per page |
| **Lives in** | `backend/src/<most domains>` | `backend/src/public/**` |
| **Consumed by** | pages importing `graphql/{queries,mutations}.js` | `public/landing.jsx`, `public/doctor-profile.jsx`, `booking/index.jsx`, `video/index.jsx` |

**Never unify them.** GraphQL can't register two resolvers or input types under
one name, and the public pages had no live backend to preserve. Where a genuine
collision existed, the **public-dialect** side was renamed
(`createAppointment` → `bookPatientAppointment`, `AppointmentInput` →
`BookPatientAppointmentInput`) — never the already-live canonical one. Follow
that precedent.

### Choosing for a brand-new operation

Patient-facing surface → public dialect, matching neighbouring pages.
Everything else → canonical.

## Three mutation-response conventions

| Convention | Domains using it |
|---|---|
| `{success, userErrors[, entity]}` | `Languages`, `RoomTypes`, `ClinicianTypes`, `EmailTemplates`, `Organizations`, `Availability`, `Blocks`, some `Rooms`/`Products` pages |
| Return the entity directly | Everything importing canonical `graphql/mutations.js`, plus `Staff`, `Reviews`, `Messages`, `Public` |
| `{success}` only | `Notifications` |

**Do not "fix" this into one convention.** Each domain's choice matches its real,
already-exercised frontend contract. Changing one breaks its page.

For a new domain with no consumer yet: `{success, userErrors}` when partial
failure is meaningful (bulk ops, field-level validation the UI must render);
return-the-entity otherwise.

## GraphQL type names may differ from Prisma model names

Deliberately. `Products` (Prisma) surfaces as both `Product` and `Service`
because two pages consume the same table with different field expectations.

Before registering a new `@ObjectType()`, check the name isn't already taken —
a collision is a startup crash, and this codebase has hit it.

## Guards, not annotations, are the default

Three global `APP_GUARD`s plus an interceptor apply automatically to every
resolver (`app.module.ts`): `GqlThrottlerGuard` → `GqlAuthGuard` → `RolesGuard`
→ `IpWhitelistGuard`, then `AuditLogInterceptor`. **Do not re-register them
per-resolver** — that ordering is load-bearing and global registration is what
guarantees `req.user` is populated before `RolesGuard` reads it.

So:

- **Authenticated-any-role**: no annotation needed. This is the default.
- **Role-gated**: `@Auth('manager', 'admin', 'super_admin')`.
- **Genuinely anonymous**: `@Public()` — verify it's actually true. It removes a security guarantee. There are exactly 16 legitimate uses (8 `auth`, 5 `public`, 2 `appointment-payments`, 1 `availability`).

Tenant scoping is a separate concern — see the `medibook-tenant-scoping` skill.

## Pagination

Canonical shape:

```graphql
{ data { ... } paginatorInfo { count currentPage hasMorePages lastPage perPage total } }
```

**No new resolver may return an unbounded array.** Several existing ones do
(`clinics`, `rooms`, `services`, `products`, `testResults`, `notifications`,
`threads`) and it's a logged finding (F-14). Either adopt `{data, paginatorInfo}`
or enforce a server-side default and maximum `take`.

## DTO and entity conventions

```ts
// dto/thing.input.ts — validation is real; ValidationPipe runs with
// whitelist: true, forbidNonWhitelisted: true, transform: true
@InputType()
export class CreateThingInput {
  @Field()
  @IsNotEmpty()
  name: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  price?: number;          // paise — always Int, never Float
}
```

Money is paise (`Int`) in the schema, converted to rupees only at the resolver
boundary. A `Float` money field is a bug.

## Subscriptions

`appointmentUpdated` and `messageReceived` run over `graphql-ws`, sharing the
same passport-jwt auth as HTTP (the WS `connectionParams.authorization` is
synthesised into a fake `req.headers.authorization` in `app.module.ts`'s context
factory). New real-time features should **reuse this transport and the existing
`PubSub`** (`common/pubsub.module.ts`), not add a second one.

`GqlThrottlerGuard` deliberately exempts subscriptions — its HTTP-shaped
`res.header()` call throws against the WS connection's synthetic response.

## Checklist

- [ ] Read the consuming page's `gql` verbatim before writing anything.
- [ ] Correct dialect for the consumer (canonical vs. public).
- [ ] Correct mutation-response convention for that domain.
- [ ] New `@ObjectType()` name doesn't collide with an existing registration.
- [ ] No unbounded list return.
- [ ] `@Public()` only where genuinely anonymous; `@Auth()` where role-gated.
- [ ] Money as `Int` paise.
