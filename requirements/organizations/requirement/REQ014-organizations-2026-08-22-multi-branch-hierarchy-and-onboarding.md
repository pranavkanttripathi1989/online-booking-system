---
id: REQ014
type: requirement
feature: organizations
created: 2026-08-22
updated: 2026-08-24
status: in-progress
parent: null
related: [REQ013, PLAN060]
---

# Multi-branch org hierarchy, onboarding wizard, and data migration

## Source

`PRD-Healthcare-Booking-SaaS-India.md` §7.1 (entity hierarchy), §9 **M1 — Tenant Onboarding & Organization Management** (`FR-ORG-01`–`FR-ORG-10`). Cross-referenced against `project-plans/01-codebase-analysis.md` §2.4 and `CLAUDE.md`'s Architecture section.

## Current state vs. PRD ambition

The codebase already has a real `organizations`, `clinics`, and `rooms` backend module (`backend/src/organizations`, `backend/src/clinics`, `backend/src/rooms`), each tenant-scoped and tested. `ClientOrganizations` carries GSTIN/PAN/address fields and a real onboarding-status enum (`OnboardingStatus`, `owner_user_id`, `onboarding_step`, `trial_ends_at`). This is a solid foundation for **half** of what the PRD calls M1.

Three structural gaps against the PRD's entity hierarchy (`PLATFORM → ORGANIZATION → BRANCH → DEPARTMENT/ROOM/RESOURCE/PHARMACY STORE`):

1. **No `Department` entity.** Clinicians and services attach directly to a `Clinic`, with no intermediate department (Cardiology, Dental, Physio). The PRD's masters-cascade model (org-level definitions overridable per branch) has no department layer to cascade through.
2. **No generic `Resource` entity distinct from `Room`.** `Rooms` exists and is bookable, but the PRD needs bookable *equipment* (an ECG machine, a chair) independent of a room — the acceptance example under `FR-CAL-05` (Dr. A needs Room 2 *and* the ECG machine) has no second bookable dimension today.
3. **The onboarding wizard is entirely mock.** `frontend/src/pages/onboarding/index.jsx` drives its 4-step flow (org+owner → plan → first clinic → done) against `mocks/store.js` mutations (`startOrganizationOnboarding`, `selectOnboardingPlan`, `addOnboardingFirstClinic`, `completeOrganizationOnboarding`) — none of which exist on the real backend, despite `ClientOrganizations` already having the columns to back a real one (`context/README.md`, "Decisions made so far").

Two gaps that are simply unbuilt, with zero existing scaffolding:

4. **No self-serve trial signup path** (`FR-ORG-01`) — today an organization is created by an admin, not by a prospect. There is no 14-day trial with a wipeable demo dataset.
5. **No data-import tooling** (`FR-ORG-07`, `FR-ORG-08`) — no CSV/XLSX importer, no column-mapping UI, no vendor-specific mappers, no dry-run/rollback. This is the PRD's explicitly named #1 switching blocker (§2.3.7) and has no code today at all.

One gap that is a real requirement, not yet decided:

6. **HFR facility IDs and per-branch letterheads** (`FR-ORG-03`, `FR-ORG-04`) are not modelled. `organization-branding` (`REQ002`) built logo/colour branding at the org level; there is no per-branch letterhead concept.

## Gap classification

- **Extend existing:** Department entity and cascade rules on top of `organizations`/`clinics`; branch-level letterhead on top of the already-built `REQ002` branding work; real backend for the existing onboarding wizard UI.
- **Net-new:** generic `Resource` entity; self-serve trial signup; data-import/migration tooling (CSV mapper, dry-run, rollback); HFR facility ID capture.
- **Already satisfied:** org/branch CRUD, GSTIN/PAN capture, org suspension/reactivation via subscription status (`ClientOrganizations.onboarding_status` already exists as a real enum), holiday calendars are partially covered by existing availability-exception scaffolding (see `REQ017`).

## Phase assignment

PRD Phase: **1 (MVP)** for org/branch/department/resource masters and the real onboarding wizard; **1 (V1 GA / Phase 2)** for import tooling and self-serve trial signup, matching the PRD's own priority split (`FR-ORG-01/02` are P0; `FR-ORG-07/08` are P1). Recommended sequencing: after `project-plans/06-execution-plan.md` P0–P1 (tenant-isolation and index fixes) — a new `Department`/`Resource` layer inherits every existing tenant-scoping bug class (Hard Rule 6) and should not be built on an unverified `orgScope()`.

## Dependencies

- **Requires:** `project-plans` F-01 fix (central `orgScope()` helper) before any new tenant-scoped entity is added — every new `create*` mutation must use the corrected helper from day one, not the ternary pattern being retired.
- **Blocks:** `REQ017` (scheduling engine) needs `Department` for its per-specialty template library; `REQ022` (pharmacy) needs a per-branch `Store` concept that should follow the same cascade pattern as `Resource`.

## User stories

### Epic: Real onboarding wizard

**US-ORG-01** — As a prospective org owner, I want to sign up self-serve with just org name, type, contact, and city, so that I can start a trial without a sales call.
- PRD refs: FR-ORG-01
- Priority: P0
- Acceptance criteria:
  - Given no existing account, when I submit the signup form, then a new `ClientOrganizations` row is created with `onboarding_status: trial`, `trial_ends_at` = now + 14 days, and a demo dataset (1 branch, 2 clinicians, 5 sample appointments) is seeded and tagged `is_demo: true`.
  - Given a trial organization, when the owner clicks "reset demo data," then every row tagged `is_demo: true` is deleted and re-seeded in one transaction, with no effect on any real data created since signup.

**US-ORG-02** — As an org owner mid-signup, I want the guided wizard (branch → doctors → availability → services/fees → publish booking page) to persist my progress against real mutations, so that closing the tab doesn't lose my work.
- PRD refs: FR-ORG-02
- Priority: P0
- Acceptance criteria:
  - Given I complete step 2 (add doctors) and close the browser, when I return to `/get-started`, then I resume at step 3, not step 1.
  - Given I reach the final step, when I click "Publish," then `onboarding_status` transitions to `active` and the org's public booking page becomes reachable at its slug.
  - This replaces the current `mocks/store.js`-backed `startOrganizationOnboarding`/`selectOnboardingPlan`/`addOnboardingFirstClinic`/`completeOrganizationOnboarding` calls in `pages/onboarding/index.jsx` with real GraphQL mutations against `ClientOrganizations`' existing onboarding columns.

### Epic: Department and Resource masters

**US-ORG-03** — As an Org Admin, I want to create departments (Cardiology, Dental, Physio) and assign clinicians and services to them, so that reporting and templates can be organized by specialty.
- PRD refs: FR-ORG-05
- Priority: P0
- Acceptance criteria:
  - Given a branch, when I create a department, then it is scoped to that branch's `client_org_id` via the corrected `orgScope()` helper (not a client-supplied argument).
  - Given a clinician assigned to a department, when a service is created under that department, then the service inherits the department as its default grouping in reports (`REQ029`).

**US-ORG-04** — As a Branch Manager, I want to register bookable equipment (ECG machine, procedure chair) separately from rooms, so that a booking can require both a room and a specific machine.
- PRD refs: FR-ORG-06
- Priority: P0
- Acceptance criteria:
  - Given Room 2 has the ECG machine, when a "TMT" service requires clinician + room + the ECG machine, and the ECG machine is already booked elsewhere (even in a different room) at 11:00, then the 11:00 slot is not offered — matching the PRD's own acceptance example under `FR-CAL-05`.
  - Resource CRUD follows the same tenant-scoping pattern as `Room` (`rooms.service.ts`), including the create-path org-validation Hard Rule 6 already calls out by name.

### Epic: Masters cascade

**US-ORG-05** — As an Org Admin managing a chain, I want to define a service at the org level and let each branch either inherit it, override its price, or skip it, so that I don't re-enter the same catalogue five times.
- PRD refs: §7.1 "Masters cascade"
- Priority: P1
- Acceptance criteria:
  - Given an org-level service with `inherit_mode: inherit`, when a branch has no override row, then the branch's booking page shows the org-level price.
  - Given the same service with a branch-level override row, then the branch's booking page shows the override price and the org-level report attributes revenue to the correct price actually charged.

### Epic: Data migration

**US-ORG-06** — As an org owner switching from a competitor, I want to upload a CSV of my existing patients and past appointments with a column-mapping UI, so that I don't lose my patient history.
- PRD refs: FR-ORG-07
- Priority: P1
- Acceptance criteria:
  - Given a CSV with arbitrary column headers, when I map them to `first_name`/`last_name`/`phone`/`dob`, then a validation preview shows row-level errors (duplicate phone, invalid date) before any write.
  - Given a validated mapping, when I confirm the import, then it runs as a dry-run first (counts only), and only a second explicit confirmation commits the write.
  - Given a committed import, when I click "rollback" within 24 hours, then every row created by that import batch (tagged with an `import_batch_id`) is reversibly deleted.

## Data model impact

- New `Departments` table: `id`, `client_org_id`, `branch_id`, `name`, `is_deleted`, standard timestamps — indexed on `(client_org_id, branch_id)` per the indexing gap already flagged in `project-plans` F-13.
- New `Resources` table: `id`, `client_org_id`, `branch_id`, `name`, `type`, `is_bookable`, `is_deleted` — the multi-resource intersection check in `REQ017` depends on this existing.
- `Clinics` gains `hfr_facility_id` (nullable string) and a `letterhead_asset_id` FK into the existing branding-asset storage from `REQ002`.
- New `ImportBatches` table: `id`, `client_org_id`, `entity_type`, `status` (`dry_run|committed|rolled_back`), `row_count`, `error_count`, `created_by`, `created_at` — every imported row across `Patients`/`Appointments`/etc. carries `import_batch_id` for rollback.
- `ClientOrganizations.onboarding_status`/`onboarding_step`/`trial_ends_at` already exist — reuse rather than duplicate.

## Non-functional notes

Self-serve signup is an anonymous, `@Public()` mutation — it must not reuse the same broken "org-less caller sees everything" pattern that `project-plans` F-01 found on `register`. A freshly created trial organization must be immediately and provably isolated from every other tenant; extend the tenancy-matrix integration test (`project-plans/04`, F-25) to cover organization creation itself, not just read access afterward.

## Open questions

- PRD §19.3: on-premise/private-cloud option for hospitals — affects whether `Departments`/`Resources` need a schema-per-tenant escape hatch. Not resolved here; log in `context/open-questions.md` if it becomes blocking.
