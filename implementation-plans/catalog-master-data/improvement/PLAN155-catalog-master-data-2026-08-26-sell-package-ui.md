---
id: PLAN155
type: improvement
feature: catalog-master-data
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ115
related: [TP175, TR175]
---

# PLAN155 — Implementation plan: Sell a Package UI

## Change

`frontend/src/pages/patients/detail.jsx` (Packages tab):

- New inline `GET_SELLABLE_PACKAGES` query (`packages { id name
  total_sittings price validity_days is_active }`) and `PURCHASE_PACKAGE`
  mutation (`{success, userErrors{message}}`), matching the existing
  `GET_PATIENT_PACKAGES`/`TRANSFER_PACKAGE` inline-gql convention already
  in this file.
- New state: `sellDialogOpen`, `sellPackageId`, `sellTenderType`
  (default `'cash'`), `sellReference`; `GET_SELLABLE_PACKAGES` fetched
  `network-only`, `skip: !sellDialogOpen` (no need to load the catalog
  until the dialog opens); filtered client-side to `is_active` packages
  only.
- "Sell Package" button added to the Packages tab header, next to
  "Purchased Packages", opening the dialog.
- Dialog: package `TextField select` (name, price, sitting count),
  tender `TextField select` (`cash`/`upi`/`card`/`cheque`, matching
  `appointments/detail.jsx`'s exact convention), optional reference
  field. On submit, calls `purchasePackage({package_id, patient_id: id,
  purchase_tender_type, purchase_reference})`; on success, snackbar +
  `refetchPackages()` (the existing Packages-tab refetch already used by
  the Transfer flow); on `userErrors`, shows the specific message.

No backend change — `purchasePackage` (REQ054) is already real and
tested; this is a frontend-only slice matching this session's
established "no GraphQL contract change → no backend commit" precedent.

## Testing

`frontend/src/pages/patients/detail.test.jsx`: new
`GET_SELLABLE_PACKAGES`/`PURCHASE_PACKAGE` gql (matched by AST equality
per `MockedProvider`'s own requirement) and one new test — opens the
Sell dialog, selects a package, types a reference, submits, and confirms
the Packages table shows the refetched row. Full file re-run to confirm
no regression to the existing 7 tests (Insurance tab + Packages tab
empty-state/list/transfer-disabled/transfer-success).

## Documentation

`REQ115` (this requirement), `PLAN155` (this plan), `TP175`/`TR175`
(verification), a context bundle, and index updates across all five doc
roots plus the `catalog-master-data` feature README.
