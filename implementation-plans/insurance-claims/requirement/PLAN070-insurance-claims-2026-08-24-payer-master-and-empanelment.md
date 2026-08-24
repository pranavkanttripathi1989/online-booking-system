---
id: PLAN070
type: requirement
feature: insurance-claims
created: 2026-08-24
updated: 2026-08-24
status: done
parent: REQ031
related: []
---

# PLAN070 — Implementation plan: payer/TPA master + empanelment + patient policy capture

## Scope

`US-INS-01` scoped down to pure master-data/CRUD: a payer/TPA directory,
per-branch empanelment status, and manual patient insurance-policy
capture. Explicitly NOT built: `US-INS-02` (payer-specific tariffs),
`US-INS-03`'s OCR health-card pre-fill (kept manual entry only),
`US-INS-04` (pre-visit eligibility badges), `US-INS-05` (the
benefit-wallet bill-split adjudication engine) — the requirement doc's own
`§17.2–17.4` P1 scope beyond payer master, correctly sequenced as
follow-on work once this foundation and `REQ023`'s bill-splitting
mechanism it's meant to sit on both exist.

## Design

Confirmed via schema read before designing: zero insurance/payer concept
anywhere. `Payers` (name, payer_type: `insurer|tpa|corporate|
government_scheme`) is **global reference data**, no `client_org_id` —
insurers/TPAs are shared across every tenant, not owned by one, the same
shape as `Languages`/other global lookups (confirmed by checking how
`Languages` is scoped before deciding). `PayerEmpanelments` (payer_id,
clinic_id, client_org_id, status: `active|de_empanelled|blacklisted`,
start/end/renewal-reminder dates) and `PatientInsurancePolicies`
(patient_id, client_org_id, payer_id, policy_number, policy_holder_name,
valid_from/until) are the genuinely tenant-scoped half — a
`@@unique([payer_id, clinic_id])` constraint on empanelments (one status
per payer per clinic, matching the requirement doc's own "per branch"
framing).

Policy capture reuses `REQ018`'s dependant-aware patient self-scope
pattern (same as `REQ034`'s consent module, built the same day) — a
`'patient'`-role caller may capture/read only their own or a genuine
dependant's policy.

`createEmpanelment` follows Hard Rule 6 exactly: validates the
caller-supplied `clinic_id` against the caller's own org before writing,
and stamps `client_org_id` from the validated clinic (not the caller's
own org), matching `departments.service.ts`'s corrected pattern from
earlier this session rather than the original, buggier `resources.service.ts`
precedent.

## Files touched

- `backend/prisma/schema.prisma` — new `Payers`, `PayerEmpanelments`,
  `PatientInsurancePolicies` models.
- `backend/src/insurance/` (new module) — `module/resolver/service`,
  `dto/insurance.input.ts`, `entities/insurance.entity.ts`.
- No frontend UI in this slice — the GraphQL surface (`payers`,
  `createPayer`, `payerEmpanelments`, `createPayerEmpanelment`,
  `updatePayerEmpanelmentStatus`, `patientInsurancePolicies`,
  `createPatientInsurancePolicy`) is real and tested; an Insurance Desk
  admin console (payer directory management, empanelment tracking with
  renewal reminders, a policy-capture panel on the patient profile) is
  deliberately deferred — this is master-data foundation for a much larger
  P1 claims-workflow module, not a standalone feature with its own UI need
  yet, logged as open.

## GraphQL contract

`payers(is_active)` — any authenticated staff role; `createPayer` —
`super_admin` only (a genuinely global directory edit). `payerEmpanelments
(clinic_id)`, `createPayerEmpanelment`, `updatePayerEmpanelmentStatus` —
`manager, admin, super_admin` (front-desk-adjacent staff can read but not
manage empanelment). `patientInsurancePolicies(patient_id)`,
`createPatientInsurancePolicy` — `patient, staff, manager, admin,
super_admin` (self-scoped for a patient caller).

## Test plan

See `TP097`.

## Test results

See `TR096`.
