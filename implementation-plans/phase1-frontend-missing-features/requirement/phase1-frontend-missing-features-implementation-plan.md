---
id: PLAN005
type: plan
feature: phase1-frontend-missing-features
created: 2026-08-17
updated: 2026-08-17
status: approved
parent: unknown
related: []
---

# Frontend Increment — Phase 1 Missing Features (Semble Gap Analysis) + Hard-Rules Compliance

## Status

| # | Feature | Code status | Verification |
|---|---|---|---|
| — | Test infra (jest.config.cjs, babel.config.cjs, playwright.config.js, eslint-plugin-jsx-a11y) | ✅ Done | ✅ `npx jest` run for real, 4/4 tests pass — infra genuinely works, not just configured |
| 1 | Custom Roles & Access Groups (`admin/Roles.jsx` + `PermissionMatrix.jsx` + store) | ✅ Done | ✅ **Fully browser-verified**: created a role, checked permissions, confirmed persistence, confirmed system-role lock icons and counts match seed data exactly, confirmed responsive at 375/768/1024/1440px (caught and fixed a real pre-existing `AdminLayout.jsx` mobile-nav bug in the process) |
| 2 | Clinician professional fields (qualifications, registration, locum, specialties) + RHF/zod migration | ✅ Done | ⚠️ Syntax-verified only (`babel.parse` clean). Live-browser check not yet done — an unrelated Vite HMR staleness issue in the dev container made the one attempt inconclusive (empty response, mid-restart), and further docker restarts were paused per instruction. **Needs a live check next session.** |
| 3 | Patient safety states (`on_hold`, `archived`, `labels`) | ✅ Done | ⚠️ Same as above — syntax-verified, not yet live-checked |
| 4 | Communication preferences + related accounts (family linking) | ✅ Done | ⚠️ Same as above — syntax-verified, not yet live-checked |
| 5, 6 | Billing party/payor split, patient number schemes | Deferred | Depends on the billing domain, which has no backend or mock model yet |

## Phase 2 (started) — Core Clinical Documentation

| Feature | Code status | Verification |
|---|---|---|
| Structured allergy records (`patients/detail.jsx`) — allergen/severity/reaction, distinct from generic notes per Semble's `createAllergyRecord` (a named clinical-safety record type, not folded into free text) | ✅ Done | ⚠️ Syntax-verified only, not yet live-checked |
| Consultation records — "Add Consultation Record" on the Medical History tab (encounter type, diagnosis/summary, notes), mirrors Semble's `Consultation` object shape | ✅ Done | ⚠️ Syntax-verified only, not yet live-checked |
| Document folders — scoped-down version of Semble's `PatientDocument` folder hierarchy: flat category tagging (General/Lab Reports/Prescriptions/Imaging/Consent Forms) + filter, not true nesting | ✅ Done | ⚠️ Syntax-verified only, not yet live-checked |

| Diagnoses — distinct ongoing-condition tracking (condition/status/diagnosed date), separate from a single consultation's notes, mirrors Semble's `WorkingDiagnosis` concept | ✅ Done | ⚠️ Syntax-verified only, not yet live-checked |
| Minimal intake questionnaire — fixed set of pre-consultation Yes/No + text questions, submit-once with an edit-responses path; scoped-down from Semble's full `Questionnaire` (sections/styling/conditional logic) per the requirements doc's explicit sequencing note | ✅ Done | ⚠️ Syntax-verified only, not yet live-checked |

**Phase 2 is now fully built** (5/5 items from the roadmap; true nested document folders were deliberately kept flat per the requirements doc's own scope note, not a gap).

**All Phase 1 (4/6, 2 deferred) + all of Phase 2 need one consolidated live-browser verification pass next session** — everything past Feature #1 (Custom Roles) has only been syntax-checked, not run in a browser, per the pause on docker restarts this session. This is the single most important next action — a lot of code has accumulated without a live check.

## Phase 3 — Clinical/Operational Depth

| Feature | Code status | Notes |
|---|---|---|
| Tasks — new standalone page (`pages/tasks/index.jsx`, `mocks/data/tasks.js`, store CRUD), nav item + route added | ✅ Done, new capability | Subject/type/priority/status/due date/assignee/patient link, matches Semble's `Task` object. Syntax-verified only. |
| Letters with review/approval workflow (`patients/detail.jsx` new tab) | ✅ Done, new capability | Draft → Pending Review → Approved gate before a "Share with Patient" action unlocks — matches Semble's explicit `reviewStatus` gate. Syntax-verified only. |
| Labs | ⚪ Not built as new work — **substantially already covered**. The existing "Test Results" tab (`patients/detail.jsx` `MOCK_TESTS`) already tracks `ordered_by` (ordering clinician) and status. The only real gap vs. Semble is structured reference-range/result-value fields, which is a data-shape refinement, not a missing capability. |
| Generic reusable `Label` primitive | ⚪ Deliberately skipped | Per-domain label patterns (patient labels from Phase 1) already work. Extracting a shared `Label` component now would be a refactor of working code, not new capability — low value relative to everything else still open. |

**Phase 3 net-new capability: 2/2 built** (Tasks, Letters). The other two roadmap items turned out to be "already there" or "not worth doing yet" on closer inspection, not gaps.

## Phase 4 — Financial Maturity

| Feature | Code status | Notes |
|---|---|---|
| Patient memberships (`patients/detail.jsx`) | ✅ Done, new capability | A real monetization lever per the requirements doc — recurring per-patient plans (Wellness Basic/Premium), distinct from the tenant's own `SubscriptionPlans`. Clickable chip on the hero header opens a plan-picker dialog. Syntax-verified only. |
| Invoice line items + partial payments + patient-level snapshotting | ❌ Not built — **deliberately** | `finances/index.jsx` (567 lines) and `manager/Billing.jsx` (436 lines) are large, already-complex pages — `Billing.jsx` was independently modified by another background agent earlier this session (Drawer view, receipt download, currency formatting). Restructuring their core Invoice data model without the ability to live-verify in a browser right now is exactly the kind of risky change to avoid per this session's constraints. This is genuinely tractable — just needs a session where docker verification is available. |
| Insurance/TPA claim-submission tracking | ❌ Not built | Same reasoning — depends on the Invoice restructuring above landing safely first. |
| Price-rule/adjustment layer (even a simplified version of Semble's Price Profile engine) | ❌ Not built | Deferred behind membership pricing (built) actually needing real price rules to apply — sequencing note from the requirements doc itself. |
| Payment terminal integration | ❌ Out of scope for a frontend mockup | Requires real hardware/SDK integration to mean anything — a fake "connect terminal" button would be theater, not a mockup with value. Explicitly named in the requirements doc's "what NOT to chase" section. |

## Phase 5 — Platform & Integration Maturity

| Feature | Code status | Notes |
|---|---|---|
| Webhooks + integration tokens | ❌ Not built | A settings-page mockup (form fields, a fake "tokens" list) is achievable but has near-zero value without real delivery infrastructure behind it — building the UI shell without the backend teaches nothing and risks looking "done" when it isn't. Better sequenced once the actual backend has webhook dispatch. |
| Practice-level document templates | ❌ Not built | Reasonably tractable (similar shape to the Email Templates admin page that already exists) but lower priority than everything above — no client demand signal yet. |
| Full ICD-10 diagnosis coding | ❌ Out of scope | Needs a real coding database/lookup service; the basic diagnosis capture built in Phase 2 (free-text condition + status) is the correct v1 per the requirements doc's own phasing. |
| Clinical Pathways / Episodes | ❌ Out of scope, by design | **Semble itself gates this as "Future/Limited Access"** in its own public API — direct competitor validation that this is not baseline functionality. Correctly last in the roadmap. |
| Per-patient access-group scoping | ❌ Not built | Real feature (confirmed via Semble's live `addPatientAccessGroup`/`removePatientAccessGroup` mutations, not just a read field) but depends on the Custom Roles/Access Groups foundation (Phase 1, built) maturing further first — assigning individual patient records to access groups needs the groups to be a first-class, well-tested concept before layering record-level scoping on top. |

## Phase 6 — New findings from the live Semble docs cross-check (this increment)

Triggered by an updated `requirements/semble-competitive-gap-analysis-requirements.md` (user-supplied screenshots of Semble's full Mutations and Queries index pages, plus a direct fetch of the `Journey` object page, surfaced several findings the earlier WebFetch-only pass had missed). Three of the highest-value new findings were built as mockups this increment:

| Feature | Code status | Files | Notes |
|---|---|---|---|
| **Duplicate patient merging** (mirrors Semble's `createMergeRecord`/`updateMergeRecord`) | ✅ Done, new capability | `pages/patients/index.jsx` | "Merge Duplicates" toggle enables checkbox row-selection (max 2); `MergePatientsDialog` shows a side-by-side field comparison, lets staff pick the surviving record, unions labels onto it, and archives the other with a `merged_into` pointer + audit trail (`merge_history`) on the survivor. Kept fully local to this page's existing `mockPatients` state (not routed through `mocks/store.js`) to match this file's pre-existing pattern — `patients/index.jsx` already reimplements on_hold/archive locally rather than calling the store equivalents, so merge follows the same convention rather than introducing a third pattern. Scoped deliberately: real merge semantics (repointing appointments/invoices to the survivor) are called out as a real, harder follow-on requirement in the requirements doc itself, since Semble's own `MergeRecord` field-level docs couldn't be retrieved. Syntax-verified only. |
| **Waiting Room / Patient Journey tracking** (mirrors Semble's `Journey` object — `arrived`/`consultation`/`departed`/`dna`, nested on `Booking`) | ✅ Done, new capability, new page | `pages/waiting-room/index.jsx` (new), `mocks/store.js` (`checkInPatient`, `markConsultationStarted`, `checkOutPatient`, `markPatientDidNotAttend`, `resetPatientJourney`), `App.jsx` (`/waiting-room` route), `components/Layout/Sidebar.jsx` (nav item, roles: admin/super_admin/receptionist/clinician) | Front-desk queue view driven by the real `MockStore.getAppointments()` (not a separate local mock array, unlike the dashboard's existing static queue) so it's reactive to store mutations. Defaults to whichever date has the most seeded appointments rather than literal "today," since the seed data is anchored around March 2026, not the real system date — documented inline as a code comment so a future reader isn't confused by the date-picker default. Distinct terminal states for "departed" (completed visit) vs "dna" (did-not-attend), matching Semble's explicit split rather than folding no-shows into a generic cancelled status. |
| **Patient communication log** (mirrors Semble's `patientCommunication`/`patientCommunications` — a sent-message *history*, confirmed as a distinct object from communication *preferences*) | ✅ Done, new capability | `pages/patients/detail.jsx` (new "Communication Log" tab, index 7; `Send Message` dialog) | Deliberately built as a separate tab from the existing "Communication Preferences" section on Overview (built in Phase 1) rather than merged into it, mirroring Semble's own object split. Seeded with 2 demo entries per patient; "Send Message" appends a new entry instantly (simulated send), channel icons for email/SMS/WhatsApp. |

**Not built this increment** (confirmed-to-exist per the live docs but deliberately deferred, consistent with this doc's existing "what NOT to chase" discipline):
- `paymentOnAccount`/`paymentsOnAccount` (standing patient credit balance) — depends on the Invoice restructuring already deferred in Phase 4; building a credit-balance concept before line-item invoices exist would be building on an incomplete foundation.
- `ClinicalReport` (governance-gated report tier above `Consultation`) — the requirements doc itself sequences this behind Consultations + Letters both existing, which they now do, but it's a genuinely new governance workflow (not just a UI tweak) and deserves its own increment rather than being squeezed in here.
- `forms` (Semble's "hospital booking forms") — only a one-line description was ever confirmed (dedicated object page didn't resolve); not enough is known about how this differs from the already-built intake `Questionnaire` to justify building a second, possibly-redundant form concept.

**Verification status**: all three features syntax-verified only (`babel.parse`, `configFile:false`), consistent with every increment since the mid-session Vite HMR staleness issue — no live-browser check performed. This needs to be folded into the same consolidated live-browser verification pass already flagged as outstanding for Phase 1 items #2-4 and all of Phase 2-4.

## Overall session summary

**9 net-new features built** across Phases 1-4 (Custom Roles & Access Groups, Clinician professional fields, Patient safety states, Communication preferences + related accounts, Allergy records, Consultation records, Document folders, Diagnoses, Intake questionnaire, Tasks, Letters, Patient memberships — 12 if counted individually). Test infrastructure stood up from nothing to working (4/4 Jest tests passing for real). One pre-existing responsive bug found and fixed (`AdminLayout.jsx`).

**What's honestly not done, and why that's the right call, not a shortfall**: large-file financial restructuring was deferred for risk reasons (needs live verification), and several Phase 4/5 items were correctly identified as not meaningful to build as unverifiable mockups (payment terminals, ICD-10 coding, webhook delivery) — building fake UI shells for these would look like progress while adding negative value (something that looks done but isn't, and will mislead whoever picks this up next). This mirrors the original requirements doc's own "what NOT to chase" discipline, applied consistently rather than abandoned once implementation started.

**One test file exists for Feature #1** (`PermissionMatrix.test.jsx`, 4/4 passing) satisfying Hard Rule 5.2; one Playwright e2e spec exists (`e2e/admin-roles.spec.js`) satisfying Rule 5.3, not yet run against a live server.


**Source requirements:** `requirements/semble-competitive-gap-analysis-requirements.md` Part 1 + Phase 1. **Rules this must comply with:** `context/frontend-hard-rules.md`. **Backend status:** none of these domains have a real backend yet except Auth — everything here is built mock-first (`useMockData`/`useMockMutation`/`MockStore`, `// BACKEND SWAP:` comments), per Hard Rule 7.1.

## Prerequisite (Hard Rule 5.1) — stand up test infra first

No `jest.config.*`/`playwright.config.*` exist and zero test files exist anywhere in `frontend/`. Every rule below that requires a test is unverifiable until this exists. Done once, first, before any of the feature work.

## Phase 1 scope, mapped to current code, in build order

| # | Feature | Current state | Files touched |
|---|---|---|---|
| 1 | **Custom Roles & Access Groups** (permission matrix) | `admin/Roles.jsx` only sets name/description/active — zero permission UI, despite `Permissions`/`RolePermissions` existing in the backend schema | `admin/Roles.jsx` (rewrite with RHF+zod), new `components/Roles/PermissionMatrix.jsx`, `mocks/data/permissions.js` (new), `mocks/store.js` (add permission taxonomy + role-permission mutators) |
| 2 | Clinician professional fields (qualifications, registration_number, locum, multi-specialty) | `CreateClinicianPage.jsx`/`EditClinicianPage.jsx` have none of these; form uses manual validation, not RHF+zod | Both pages, migrate to RHF+zod while touched (Hard Rule 2.2) |
| 3 | Patient safety states (`on_hold`, `archived`, `labels`) | `Patients` mock/schema has no such states, only implicit soft-delete | `patients/index.jsx`, `patients/detail.jsx`, `mocks/store.js` |
| 4 | Communication preferences + related accounts (family linking) | Missing entirely | `patients/detail.jsx`, new component |
| 5 | Billing party/payor split | Missing entirely | Deferred — depends on billing domain, which has no backend or real mock model yet; sequence after 1-4 |
| 6 | Patient number schemes | Missing entirely | Deferred with #5 |

**This increment builds #1 fully** (highest business priority — it's been the single most-requested feature across this whole engagement) **and stops there**, rather than spreading thin across all six shallowly. #2-6 are scoped and ready to pick up next in the same order.

## Feature #1 build spec — Custom Roles & Access Groups

- **Permission taxonomy** (mock data, mirrors `Permissions.resource`/`.action` in `schema.prisma`): resources = `appointments, patients, clinicians, clinics, rooms, products, billing, reviews, messages, roles, settings, reports`; actions = `view, create, edit, delete, export`.
- **UI**: role form gains a "Permissions" section below name/description — a matrix (resource rows × action columns), grouped visually, each cell a checkbox. "Clone from existing role" dropdown pre-fills the matrix from another role's current grant set (Zendesk pattern, cited in the requirements doc).
- **Guardrails** (client-side approximation of the backend rules already documented in the requirements doc): system roles (`is_system`) render read-only with a tooltip explaining why; a role can't be saved with zero permissions granted (empty-role warning, not a hard block — some roles legitimately start empty).
- **Hard-rules compliance built in from the start, not bolted on**:
  - RHF + zod (Rule 2.1/2.2 — this form was pure manual state before).
  - `aria-label` on every checkbox cell naming the exact permission ("Grant Appointments — Create"), matrix rows/columns get proper table semantics (Rule 3.2/3.3).
  - Wrapped in `ErrorBoundary` (Rule 4.1 — this page had none).
  - Responsive matrix: table scrolls horizontally on narrow viewports rather than clipping (Rule 1.1/1.4), verified at 375/768/1024/1440px via Playwright screenshots.
  - Testing-Library render test + Playwright smoke test (Rule 5.2/5.3).
