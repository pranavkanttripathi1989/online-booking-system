---
id: BUG028
type: bug
feature: clinicians
created: 2026-08-27
updated: 2026-08-27
status: done
parent: null
related: []
---

# BUG028 — a clinician's `email`/`phone` could be saved but never read back over GraphQL

## Source

Live-reported by the user while editing a real clinician (Sarah Mitchell)
through the admin UI: "why is clinician email not updating". The
browser's own network tab, shared directly, showed a real
`UpdateClinician` mutation firing with `email: "Sarah@medibook.com"` in
its input — but its response selection set never asked for `email`
back, so nothing in the payload could confirm whether the save actually
worked.

## Root cause

Confirmed the backend write was correct first, via a direct read
against the live dev database (`psql`) — the row's `email` column really
did hold the new value. The bug is entirely on the read side:
`ClinicianType` (`backend/src/clinicians/entities/clinician.entity.ts`),
the GraphQL-exposed `Clinician` type, had **no `email` or `phone` field
declared at all** — even though `Clinicians.email`/`.phone` are real
columns, `ClinicianInput` requires `email` on every create/update, and
`CliniciansService#toGraphQL()`'s `...rest` spread already carries both
values through to the resolver. Because NestJS GraphQL is code-first,
an undeclared field simply doesn't exist on the schema — no page could
ever request `email`/`phone` back, regardless of what the frontend's own
query asked for. The edit form's email field was therefore **always
blank on load**, not stale — every save looked like it silently failed,
even though it never did.

## The fix introduces a real access-control question, closed deliberately

`clinician`/`clinicians` (`clinicians.resolver.ts`) carry **no `@Auth()`
gate at all** — any authenticated role, including `patient`, can already
read a clinician's public profile fields. A plain `@Field()` for
`email`/`phone` would have hand a clinician's personal contact
information to every logged-in patient for free — a new leak this fix
must not introduce while closing the real one. Fixed by declaring both
as `@ResolveField()` methods on the resolver (not plain `@Field()`s on
the entity), each explicitly returning `null` for a `patient` caller and
the real value for everyone else (manager/admin/super_admin/clinician/
staff) — live-verified in both directions against the real dev backend.

## Acceptance criteria

- `email`/`phone` are part of the `Clinician` GraphQL type and resolve
  to real, current DB values for a staff/manager/admin/clinician caller.
- A `patient`-role caller reading the identical query gets `null` for
  both fields, not the real value.
- The frontend's `ClinicianFields` fragment and the create/update
  clinician mutations all select `email`/`phone`, so Apollo's own cache
  normalization keeps them current after a save without a manual
  refetch.
