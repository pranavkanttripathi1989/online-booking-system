---
id: REQ115
type: improvement
feature: catalog-master-data
created: 2026-08-26
updated: 2026-08-26
status: done
parent: REQ054
related: [PLAN155, TP175, TR175]
---

# REQ115 — Sell a Package to a patient (frontend)

## Why this slice

`REQ054` (multi-sitting service packages, US-CAT-01) shipped a real,
tested `purchasePackage` mutation on day one, and `REQ110` later added
`transferPackage` plus a real "Purchased Packages" tab on
`patients/detail.jsx`. A grep sweep before scoping this batch
(`project-plans/11-next-10-slice-batch.md`) confirmed `purchasePackage`
has **zero** frontend callers anywhere in the app — a patient can never
actually buy a package through the UI, only via a raw GraphQL call. This
is the same "backend built, no frontend caller" gap class this session
has repeatedly found and closed (webhooks/api-keys nav, pharmacy CRUD,
etc.) — not a new architecture question, just a missing button.

Investigated where to put it: `manager/packages/index.jsx` is the
catalog/admin view (no patient in context — would need its own patient
search), while `patients/detail.jsx`'s existing Packages tab already
knows the patient and already has the read query
(`patientPackages`)/mutation (`transferPackage`) wiring pattern to copy.
Chose the patient page — smaller change, better UX (no need to search
for a patient that's already open).

## User story

As front-desk/manager staff viewing a patient's record, I can sell them
an active service package directly from their Packages tab, without
leaving the page or using a separate tool.

## Acceptance criteria

- **Given** a patient's detail page, Packages tab, **when** staff clicks
  "Sell Package", **then** a dialog lists every **active** package
  available for sale (inactive packages are excluded, matching the
  backend's own `purchase()` rejection of inactive packages).
- **Given** a package selected, a tender type, and an optional
  reference, **when** staff clicks "Sell", **then** `purchasePackage` is
  called with `patient_id` set to the currently-viewed patient, and on
  success the Packages table refetches and shows the new purchase.
- **Given** a mutation failure (e.g. the package went inactive between
  load and submit), **when** it returns `userErrors`, **then** the
  specific error message is shown, not a generic failure.
- **Given** no active packages exist for the org, **when** the dialog
  opens, **then** it shows an honest "No active packages available for
  sale" message instead of an empty, confusing dropdown.

## In scope

- A "Sell Package" button + dialog on `patients/detail.jsx`'s existing
  Packages tab, reusing the already-proven `purchasePackage` mutation
  and the tender-type `TextField select` convention from
  `appointments/detail.jsx`'s counter-payment dialog.

## Deliberately out of scope

- A parallel "sell" flow from `manager/packages/index.jsx`'s catalog
  view (would need its own patient-search UI — a separate, larger
  change, not needed once the patient-detail page covers the real
  front-desk workflow).
- Any change to `purchasePackage` itself — already real and tested.
