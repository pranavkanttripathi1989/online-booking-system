---
id: PLAN200
type: bug
feature: clinicians
created: 2026-08-27
updated: 2026-08-27
status: done
parent: BUG028
related: [BUG028, TP220, TR220]
---

# PLAN200 — Fix: clinician `email`/`phone` never readable over GraphQL

## Backend

- `backend/src/clinicians/clinicians.resolver.ts` — new `@ResolveField()`
  methods `email(@Parent() clinician, @CurrentUser() user)` and
  `phone(...)`, each returning `null` for `user.roles.includes('patient')`
  and the real `clinician.email`/`.phone` (already present on the
  resolved object via `CliniciansService#toGraphQL()`'s `...rest`
  spread) otherwise. Deliberately NOT a plain `@Field()` on
  `ClinicianType` — the `clinician`/`clinicians` queries have no
  `@Auth()` restriction at all, so a plain field would leak a
  clinician's personal contact info to every logged-in patient.
- `backend/src/clinicians/clinicians.resolver.spec.ts` — new file (none
  existed before; every other handler on this resolver is a pure
  delegation, so this covers exactly the new gating logic, not a full
  re-test of the service).

## Frontend

- `frontend/src/graphql/queries.js` — `CLINICIAN_FIELDS` fragment gains
  `email`/`phone`.
- `frontend/src/graphql/mutations.js` — `CREATE_CLINICIAN_MUTATION` and
  `UPDATE_CLINICIAN_MUTATION` both gain `email`/`phone` in their
  response selection, so Apollo's normalized cache picks up the new
  value immediately after a save (the missing piece that made the bug
  look like "not updating" even after this resolver fix alone) without
  a manual `refetchQueries`.

## Live verification (not just unit tests)

Against the real dev backend, `manager@medibook.dev`:
`clinician(id: "8e9ed6bf-...")  { email phone }` returned the real,
currently-saved value (`Sarah@medibook.com`, `+919876000001`) —
confirming both the original save (already correct, root-caused via a
direct `psql` read before writing any fix) and the new read path.
Against `patient@medibook.dev`, the identical query returned `email:
null, phone: null` — confirming the new access gate actually withholds
the field rather than merely intending to.

## Documentation

`BUG028`, this `PLAN200`, `TP220`/`TR220`, a context bundle, and the
`requirements`/`implementation-plans`/`test-plans`/`test-results` root
indexes — a new `clinicians` feature slug across all four (no prior
docs existed under it despite the domain being long-shipped).
