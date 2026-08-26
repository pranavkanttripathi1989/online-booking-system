---
id: PLAN176
type: improvement
feature: prescriptions
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ136
related: [TP196, TR196]
---

# PLAN176 — Implementation plan: a real frontend surface for prescription-integrity verification

## Change

No backend change — `verifyPrescriptionIntegrity` already exists,
tested, and live-verified from `REQ129`. This slice is frontend-only.

**`frontend/src/pages/prescriptions/Verify.jsx`** (new): a standalone
page — a `Prescription ID` text field pre-filled from a `?id=` query
param (`useSearchParams`), a `Verify` button that runs
`VERIFY_PRESCRIPTION` via `useLazyQuery({fetchPolicy: 'network-only'})`
(so a second lookup after navigating in with a different id always hits
the network, not a stale cache entry), and a result `Alert`:

- `valid: true` — green success `Alert`, "This prescription is
  authentic", plus the formatted verification code when `stored_hash` is
  present.
- `valid: false` — red error `Alert`, a warning not to rely on the copy.
- `stored_hash: null` (legacy prescription, issued before `REQ129`) — an
  honest "no verification code on file" caption instead of a formatted
  code, distinct from a tamper warning.

A local `formatVerificationCode(hash)` mirrors
`documents.service.ts`'s and `PrescriptionPrint.jsx`'s own copies
verbatim (first 12 hex chars, uppercased, grouped in 4s with dashes) —
this codebase's established precedent (from `REQ129`) for keeping
independent rendering paths' display logic in sync via a small
duplicated pure function with a cross-referencing comment, rather than
sharing a module across page/PDF boundaries.

**`frontend/src/App.jsx`**: lazy-imports `VerifyPrescription`, adds
`<Route path="/prescriptions/verify" ...>` inside the shared
`<Route element={<AppShell />}>` block (same "any authenticated role, no
`RoleGuard`" pattern as `/calendar`/`/messages`/`/settings`/
`/notifications`/`/profile`) — matches
`verifyPrescriptionIntegrity`'s own broad `@Auth('patient', 'clinician',
'manager', 'admin', 'super_admin', 'staff')` gate; no role is excluded
on either side.

**`frontend/src/pages/prescriptions/PrescriptionPrint.jsx`**: adds a
`Verify` outlined button (matching the existing `Print`/`Download PDF`/
`Share via WhatsApp` `Button` row in the screen-only toolbar,
`@media print: display none`) that navigates to
`/prescriptions/verify?id=<this prescription's id>` — closes the
discoverability gap for the real target use case (a pharmacist or
patient starting from a printed copy has no way to guess the standalone
route exists otherwise).

## Testing

`frontend/src/pages/prescriptions/Verify.test.jsx` (new, 5 tests):
`?id=` query-param pre-fill without auto-running the query; a valid
result renders the success state and the correctly-formatted
verification code; an invalid result renders the tamper-warning state;
a `stored_hash: null` legacy result renders the honest "no verification
code on file" caption, not a code or a tamper warning; the `Verify`
button is disabled while the id field is empty. Mirrors
`pages/auth/reset-password.test.jsx`'s own `HelmetProvider` +
`MemoryRouter` + `MockedProvider` pattern (query-param-driven page,
`useSearchParams`), with the `VERIFY_PRESCRIPTION` gql document
re-declared verbatim to match `Verify.jsx`'s own AST for
`MockedProvider`'s exact-match requirement.

`frontend/src/pages/prescriptions/PrescriptionPrint.test.jsx`: existing
6/6 suite re-confirmed unaffected by the new `Verify` button (no new
GraphQL operation added to that page — pure client-side navigation).

Full frontend unit suite unaffected outside the two files above.
`eslint` clean on all three touched/new files — the 2 warnings
`PrescriptionPrint.jsx` already carried (a pre-existing literal hex
color on its own `sx` prop, untouched by this diff) are unchanged; lint
ratchet held at 1909 (confirmed via full `npm run lint` before and
after). `npm run build` succeeds.

## Documentation

`REQ136` (this requirement), `PLAN176` (this plan), `TP196`/`TR196`
(verification), a context bundle, and index updates across all five doc
roots plus the `prescriptions` feature README.
