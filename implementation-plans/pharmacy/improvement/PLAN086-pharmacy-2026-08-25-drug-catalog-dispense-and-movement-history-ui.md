---
id: PLAN086
type: improvement
feature: pharmacy
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ059
related: []
---

# PLAN086 — Implementation plan for the pharmacy UI completion

Technical implementation plan for `REQ059`. No backend change — all three
mutations/queries (`createDrug`/`updateDrug`/`deleteDrug`,
`dispensePrescriptionItem`, `stockMovements`) already exist and are
already tested.

## Backend facts confirmed before designing the UI

- `DrugType.is_platform_seeded` (`drugs.entity.ts`) — `true` when
  `client_org_id` is null. `drugs.service.ts`'s `assertWritable` rejects
  edit/delete on a platform-seeded row for a non-platform-operator caller
  — the UI must hide/disable those actions for such rows, not just rely
  on the mutation to reject (a real error toast is the correct fallback,
  not the primary UX).
- `DispensePrescriptionItemInput` needs `prescription_item_id` +
  `batch_id` + `quantity`. `pharmacy.service.ts`'s own
  `dispensePrescriptionItem` rejects if `batch.drug_id !== item.drug_id`
  — the UI restricts the batch picker to matching-drug batches client-side
  so a mismatched pick is caught before the network round trip, not just
  after.
- `PrescriptionType.items` (via `patientPrescriptions(patient_id)`)
  already carries real `id`/`drug_id` per item — confirmed distinct from
  `PrescriptionPrint.jsx`'s own `PRINT_QUERY`, which deliberately omits
  both (a print view has no need for them). `patientPrescriptions` is
  gated `@Auth('patient','clinician','manager','admin','super_admin',
  'staff')` — already includes `staff`, the role this page's own route is
  gated to.
- No "is this item already dispensed" field exists anywhere
  (`PrescriptionItems` has none, and no aggregate query surfaces it) —
  the UI cannot show a per-item dispensed/pending badge without a new
  backend field, so it doesn't attempt to; every item is always offered
  for dispensing, same as the backend allows (a real, standing gap, not
  hidden — logged in "what this does not close" below).

## Frontend — `frontend/src/pages/manager/pharmacy/index.jsx`

Converted from a single flat page to three MUI `Tabs`: **Stock**
(existing content, unchanged), **Drug Catalog** (new), **Dispense**
(new). One file, matching this page's existing scope rather than
splitting into new route files — the gap analysis's own alternative
suggestion (`pharmacy/drugs.jsx`) was considered and rejected in favor of
keeping the whole pharmacy domain in one place under tabs, the same
pattern `clinic-forms/index.jsx` already established for this codebase.

### Drug Catalog tab

```graphql
query GetDrugsFull { drugs { id name composition strength form schedule_class hsn gst_rate manufacturer is_platform_seeded } }
mutation CreateDrug($input: DrugInput!) { createDrug(input: $input) { id } }
mutation UpdateDrug($id: ID!, $input: DrugInput!) { updateDrug(id: $id, input: $input) { id } }
mutation DeleteDrug($id: ID!) { deleteDrug(id: $id) }
```

Table (name/composition/strength/form/schedule/manufacturer/GST, a
"Platform" chip for `is_platform_seeded` rows), create/edit form
(re-using the Stock tab's own Card-form visual convention), Edit/Delete
icons hidden for `is_platform_seeded` rows rather than shown-then-erroring.

### Dispense tab

```graphql
query SearchPatientsForDispense($search: String) { patients(search: $search, first: 10) { data { id full_name phone email } } }
query GetPatientPrescriptionsForDispense($patient_id: ID!) {
  patientPrescriptions(patient_id: $patient_id) {
    id issued_at
    items { id drug_id drug_name dose frequency duration_days qty }
  }
}
mutation DispensePrescriptionItem($input: DispensePrescriptionItemInput!) {
  dispensePrescriptionItem(input: $input) { id quantity_remaining }
}
```

Flow: a debounced search TextField (matching `patients/index.jsx`'s own
`debouncedSearch` convention, not a new Autocomplete paradigm) → pick a
patient from the returned list → `patientPrescriptions(patient_id)`
loads their real prescriptions/items → each item gets a "Dispense"
button → a small form: batch `<TextField select>` restricted to
`batches.filter(b => b.drug_id === item.drug_id)` (reusing the Stock
tab's already-loaded `batches` state, itself already clinic-filtered by
the page's existing clinic selector) + quantity → submit.

### Movement History

A "History" `IconButton` added to each Stock-tab batch row (next to the
existing "Adjust" action) opens a `Dialog` driven by:

```graphql
query GetStockMovements($batch_id: ID!) { stockMovements(batch_id: $batch_id) { id movement_type quantity_delta reference_type reference_id notes created_at } }
```

Newest-first list, `movement_type` chip-colored (receipt/adjustment/
dispense), quantity delta signed (`+120` / `-5`).

## A real routing/navigation gap found while implementing, not in the original scope

`App.jsx`'s `/manager/pharmacy` route sat under the manager-only
`RoleGuard roles={['admin','super_admin','manager']}` block, and
`AppShell.jsx`'s sidebar only ever listed "Pharmacy" inside
`MANAGER_CHILDREN` — a section that only renders for `isManager`
(`admin`/`super_admin`/`manager`). `pharmacy.resolver.ts` has always
gated every query/mutation `@Auth('staff', 'manager', 'admin',
'super_admin')` — real pharmacy staff had no route access and no way to
even discover this page existed. Fixed by moving the route into the
existing staff-inclusive `RoleGuard roles={['admin','super_admin',
'staff','manager']}` block (the same one `/staff/dashboard`/
`/staff/appointments` already use), and promoting "Pharmacy" to a
top-level `NAV_CONFIG` entry with the matching role array — mirroring how
"Patients"/"Clinicians"/"Live Queue" already sit at the top level rather
than nested under the manager-only section, for the identical reason.
Verified live for both a manager and a staff login before writing the
formal test suite.

## Testing (see `TP113`)

- New `frontend/src/pages/manager/pharmacy/index.test.jsx`: Drug Catalog
  CRUD (including platform-seeded rows hiding edit/delete), Dispense
  flow's batch-picker restriction to matching-drug batches, Movement
  History dialog rendering real movement rows.
- New `frontend/e2e/pharmacy-completion.spec.js` against the real
  backend: create a drug via the UI and confirm it appears in the Stock
  tab's receive-stock dropdown; dispense a real prescription item against
  a real batch and confirm the batch's remaining count decrements and a
  real `dispense` movement appears in its History dialog.

## What this does not close

No per-item "already dispensed" indicator (no backend field exists to
back one — a real, standing gap, not hidden by this slice). Purchase
orders, FEFO suggestions, and GST purchase invoicing remain out of scope,
same as `REQ022`'s own P1 designation for all three.
