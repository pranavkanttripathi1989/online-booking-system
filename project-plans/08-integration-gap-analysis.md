---
id: PP008
type: analysis
feature: project-plans
created: 2026-08-25
updated: 2026-08-25
status: active
parent: PP000
related: [PP002, PP007]
---

# 08 — Backend/frontend integration gap analysis

A fresh, code-verified sweep of every backend domain module against every
frontend page, run 2026-08-25 immediately after the Phase G+3
frontend-completion pass closed. Two directions, matching what was asked:

- **A. Backend created, frontend not there or not integrated** — a real,
  tested resolver exists with no UI action calling it anywhere.
- **B. Frontend created, backend not there or not integrated** — a page
  renders data-shaped UI with no real route to it, or calls the *wrong*
  backend surface so it silently runs on fabricated data.

Severity: **S1** ship-blocker (a role's core workflow is fake or broken) ·
**S2** must fix soon (a documented requirement's own P0 story is
incomplete) · **S3** should fix (a real but lower-traffic gap) · **S4**
cleanup/documentation only.

**Summary: 1 × S1, 3 × S2, 6 × S3, 2 × S4 across 12 real findings**, plus one
confirmed false positive and one stale-documentation correction, both
recorded below so they don't get re-discovered.

## Methodology

1. **Backend → frontend direction.** Every `@Query`/`@Mutation` name across
   all 47 `*.resolver.ts` files (46 domain modules) was extracted, then
   grepped against the full text of every file under `frontend/src`. A
   module with *zero* frontend references would mean an entire domain has
   no UI at all — none were found; every domain has at least partial UI.
   Modules with *some* unused operations were individually opened and
   read, not trusted from the grep alone, to rule out dialect-naming
   coincidences (see the `queue` false positive below).
2. **Frontend → backend direction.** Every remaining `mocks/store`/
   `useMockData`/`useMockMutation` import under `frontend/src/pages` and
   `frontend/src/components` (15 files) was individually opened and
   classified: a live, reachable fallback vs. a dead comment referencing
   the old pre-wiring history. `scripts/check-page-data-wiring.mjs` (the
   existing structural gate for *fully* fabricated pages) was also run
   fresh to confirm its current `ALLOWED` list is accurate.
3. Every finding below was traced to the exact file/line evidence, not
   inferred from a comment or a stale doc — several of the codebase's own
   existing notes turned out to be wrong (see §C).

## A. Backend created, frontend not there or not integrated

### A-1 · S2 · `auth.resetPassword` — the password-reset flow has no second step

**Fixed 2026-08-25 — `BUG022`/`PLAN084`/`TP111`/`TR110`,
`context/security-2026-08-25-bug022/manifest.md`.** New
`pages/auth/reset-password.jsx` (token from the URL query string —
confirmed the delivery mechanism is a `[EMAIL STUB]` console-log token,
no real AWS SES send exists yet, a pre-existing separate gap) + a new
`/reset-password` route under the same `AuthLayout` block `/login`/
`/forgot-password` already use. Verified end-to-end against the real
backend (new `frontend/e2e/reset-password.spec.js`, 3/3): a real
`forgotPassword` call, the real token read straight from the backend's
own stub log, a real `resetPassword` completion, and a real subsequent
login proving the new password was actually persisted (and the old one
rejected) — not just a UI success message.

**Backend:** `backend/src/auth/auth.resolver.ts:116` — `resetPassword(input:
ResetPasswordInput!)`, consumes a reset token + sets a new password. Real,
tested (`auth.resolver.spec.ts`/`auth.service.spec.ts`).
**Frontend:** `pages/auth/forgot-password.jsx` only calls the *first* step
(`forgotPassword`, which emails/OTPs a reset token) — confirmed via
`grep -n "gql\`\|useMutation" pages/auth/forgot-password.jsx`. There is no
`pages/auth/reset-password.jsx` and no matching route in `App.jsx`
(`find frontend/src/pages -iname "*reset*"` returns nothing).
**Blast radius:** a user who requests a password reset has no page to
actually complete it — the flow dead-ends at "check your email," and
whatever token they receive has nowhere to be entered. This is a genuine
account-recovery gap, not a cosmetic one.
**Fix:** a new `pages/auth/reset-password.jsx` (token from the URL query
string, matching whatever channel `forgotPassword` actually delivers it
through — check `auth.service.ts`'s `forgotPassword` implementation for the
delivery mechanism before assuming email vs. SMS/OTP) + a route, following
`AuthLayout`'s existing pattern from `login.jsx`/`forgot-password.jsx`.

### A-2 · S2 · `drugs.createDrug` / `updateDrug` / `deleteDrug` — no drug master catalog UI
**Backend:** `backend/src/drugs/drugs.resolver.ts` — full CRUD exists and is
tested.
**Frontend:** `pages/manager/pharmacy/index.jsx:16` only *reads* the drug
list (`query GetDrugs { drugs { id name } }`) to populate the
receive-stock dropdown. No page anywhere creates, edits, or deletes a
`Drugs` master row.
**Blast radius:** a pharmacy's drug catalog can currently only be
populated via direct DB seed — there is no way, through the app, for a
real org to add a new drug their clinic starts stocking. This blocks
`REQ022`'s own stock-ledger feature from being usable end-to-end for any
org whose drug list isn't already seeded.
**Fix:** a "Drug Catalog" tab or standalone page (likely
`pages/manager/pharmacy/drugs.jsx` or a tab on the existing pharmacy
page) with a create/edit/delete form. Gate matching `drugs.resolver.ts`'s
own `@Auth()`.

### A-3 · S2 · `pharmacy.dispensePrescriptionItem` + `stockMovements` — the ledger's own "dispense" step and history view are both missing
**Backend:** `backend/src/pharmacy/pharmacy.resolver.ts` — `dispensePrescriptionItem`
(consumes stock against a real `PrescriptionItems` row) and `stockMovements`
(the append-only ledger's read-side history) both exist and are tested.
**Frontend:** `pages/manager/pharmacy/index.jsx` wires *receive* and
*adjust* only (confirmed: zero matches for `dispensePrescriptionItem` or
`stockMovements` anywhere under `frontend/src`).
**Blast radius:** `REQ022`'s own three-step design — "receive → dispense
(linked to a real PrescriptionItems row) → adjust" — is two-thirds built
on the frontend. A pharmacy can log stock coming in and make manual
corrections, but can never record dispensing against an actual
prescription through the UI, and nobody can see the ledger's own
transaction history (only the current running quantity).
**Fix:** on the same pharmacy page (or from `PrescriptionPrint.jsx`/the
clinician's prescription view, which already knows the relevant
`PrescriptionItems` rows) — a "Dispense" action, and a "Movement History"
table/tab driven by `stockMovements`.

### A-4 · S3 · `clinicians.updateClinicianVerification` — no admin action to verify a clinician
**Backend:** `backend/src/clinicians/clinicians.resolver.ts:58` —
`updateClinicianVerification(id, status)`. Real, tested.
**Frontend:** `registration_number`/`qualifications` are editable
self-attested fields on `CreateClinicianPage.jsx`/`EditClinicianPage.jsx`,
but `verification_status` (`clinician.entity.ts:40`) is never displayed
or actioned anywhere in the frontend — confirmed zero matches for
`updateClinicianVerification` or `verification_status` outside the
backend.
**Blast radius:** `REQ015`'s own "admin-attested interim path" for
clinician verification has a field and a mutation, but no button anywhere
for an admin to actually move a clinician from whatever their default
status is to "verified" (or reject them). The field exists in the schema
and is presumably shown somewhere as read-only text at best.
**Fix:** a verification-status chip + Verify/Reject action on
`clinicians/detail.jsx` (or the admin clinician list), gated to
`admin`/`super_admin` matching the resolver's own gate.

### A-5 · S3 · `encounters.createDiagnosis` — no structured diagnosis entry
**Backend:** `backend/src/encounters/encounters.resolver.ts:71` —
`createDiagnosis(input: CreateDiagnosisInput!)`, producing a real
`Diagnosis` row (`type`, `icd10_code`, `text`, `status`). Tested.
**Frontend:** `pages/clinician/EncounterWorkspace.jsx:39` *displays*
`diagnoses { id type icd10_code text status created_at }` and has a
free-text "Diagnosis" note-section key (`{ key: 'diagnosis', label:
'Diagnosis' }`, line 90) — but the free-text note section and the
structured `Diagnosis` entity are two different things, and there is no
UI path that ever calls `createDiagnosis`.
**Blast radius:** a clinician's diagnosis ends up as unstructured prose
inside a SOAP note, never as a queryable, ICD-10-codeable structured
record — meaning any future feature depending on structured diagnosis
data (reporting, clinical decision support, referrals) has nothing to
read from yet, even though the write path already exists.
**Fix:** a small "Add Diagnosis" form (type/ICD-10 code/text) alongside
the existing diagnoses display panel in `EncounterWorkspace.jsx`.

### A-6 · S3 · `encounters.createEncounterTemplate` — clinicians can apply templates but never create one
**Backend:** `backend/src/encounters/encounters.resolver.ts:92` —
`createEncounterTemplate`. Tested.
**Frontend:** `EncounterWorkspace.jsx:216-243` reads `encounterTemplates`
and applies an existing one (`applyTemplate`), showing "No templates yet."
when the list is empty — but nothing ever calls
`createEncounterTemplate`, so that empty state can never resolve itself
through the app.
**Blast radius:** the one-click-template feature `REQ020` shipped
(`PLAN056`) is genuinely unusable for any org until someone seeds
templates directly in the database — a real chicken-and-egg gap in an
already-shipped, already-tested feature.
**Fix:** a "Save as template" action from an existing note, or a small
standalone template-management dialog, reusing the same pattern
`messages/index.jsx`'s canned-reply management (`REQ058`) already
established for an identical "empty list, no way to seed it" shape.

### A-7 · S3 · `insurance.patientInsurancePolicies` + `createPatientInsurancePolicy` — no patient policy capture UI
**Backend:** `backend/src/insurance/insurance.resolver.ts` — both exist,
tested.
**Frontend:** `admin/Payers.jsx` covers the payer master + branch
empanelment half of `REQ031`; nothing under `frontend/src` references
`patientInsurancePolicies` or `createPatientInsurancePolicy` — confirmed
zero matches, including on `patients/detail.jsx`.
**Blast radius:** `REQ031`'s own "manual patient policy capture" P0 user
story is unbuilt on the frontend — front desk has no way to record which
payer/policy a specific patient is covered under, which the eventual
cashless-claims workflow (`REQ031`'s own deferred insurance-claims scope)
will need real data for.
**Fix:** a "Insurance" section on `patients/detail.jsx` — payer picker
(from the existing payer master) + policy number/notes, matching this
codebase's established "detail page tab/section" convention.

### A-8 · S3 · `webhooks.webhookDeliveryLog` — no delivery history view
**Backend:** `backend/src/webhooks/webhooks.resolver.ts` — real, tested.
**Frontend:** `settings/index.jsx`'s Integrations tab manages webhook
*endpoints* (create/deactivate, reveals the signing secret once) but
never queries `webhookDeliveryLog` — confirmed zero matches.
**Blast radius:** lower severity than the others — this is an
operator-debugging view (did a webhook fire, did it succeed), not a
blocking workflow. An org integrator has no way to see *why* their
integration isn't receiving events without direct DB access.
**Fix:** a "Delivery Log" expand/tab per endpoint on the same
Integrations tab.

### A-9 · S4 · `booking-widget.updateBookingWidgetConfig` — create/deactivate only, no edit
**Backend:** `backend/src/booking-widget/booking-widget.resolver.ts` — a
real `updateBookingWidgetConfig` mutation exists alongside `create`/
`deactivate`.
**Frontend:** `settings/index.jsx`'s Integrations tab only calls
`createBookingWidgetConfig`/`deactivateBookingWidgetConfig` — confirmed
zero matches for `updateBookingWidgetConfig`.
**Blast radius:** small — the only way to change an existing widget's
allowed origins today is deactivate-and-recreate (which mints a new
`short_link_slug`, breaking anything already embedded on the org's real
site). Annoying, not blocking.
**Fix:** an "Edit" action next to the existing widget-config row.

### A-10 · S4 (already logged, re-confirmed) · `packages.purchasePackage` — no "sell a package" UI
**Backend:** `backend/src/packages/packages.resolver.ts:45` — real, tested.
**Frontend:** `manager/packages/index.jsx` has full package CRUD and
`redeemPackageSitting` (a purchased package's sitting redemption), but no
"Sell to patient" action.
**Note:** this is **not a new discovery** — `PLAN077`/`REQ054` and
`PLAN082` both already logged this as a deliberate scope cut ("Partial-
sitting packages, package transfer/refund/renewal" / a "Sell a Package"
UI). Listed here only so this gap analysis is complete, not to imply it
was missed before.

## B. Frontend created, backend not there or not integrated

### B-1 · S1 · `pages/clinician/Dashboard.jsx` — the entire clinician home screen is fabricated end to end

**Fixed 2026-08-25 — `BUG021`/`PLAN083`/`TP110`/`TR109`,
`context/clinician-dashboard-2026-08-25-bug021/manifest.md`.** Rebuilt
exactly per this finding's own "Fix" note below, plus one additional real
gap found while scoping the implementation: `createSpacerBlock`'s
`@Auth` gate excluded `'clinician'` entirely (manager/admin/super_admin
only), so the sibling read query (`getSpacerBlocks`, already correctly
widened) had no matching write-side counterpart — without also widening
that gate (plus a service-level self-scope check, mirroring
`getSpacerBlocks`'s own), the rebuilt page's "Save Block" action would
have 403'd for every real clinician. Verified end-to-end against the real
backend (new `frontend/e2e/clinician-dashboard.spec.js`, 3/3), including
a reload-survives check on both write actions — not just an in-memory
state read. This is the single most severe finding in this analysis: **the clinician
role's own dashboard — the first thing a clinician sees after logging in
— has never actually worked**, disguised because it fails silently
instead of erroring.

**The read side is broken by construction.** `GET_CLINICIAN_DASHBOARD_DATA`
(`Dashboard.jsx:23`) queries `getClinician`, `getAppointments`,
`getSpacerBlocks`, `getLunchBreaks` — but `getClinician`/`getAppointments`
are the **`@Public()`, zero-authentication, patient-self-serve booking
dialect** (`backend/src/public/public.resolver.ts:29-45`), not any
authenticated internal query. Worse: the query asks `getAppointments` for
`duration status type patient { id firstName lastName } product { id
name }`, but the real return type, `PublicAppointmentSlotType`
(`backend/src/public/entities/public.entity.ts:93-97`), has **only** `id`,
`startTime`, `endTime` — none of the other requested fields exist on that
type at all. This is a GraphQL validation error on every single request,
guaranteed, in every environment, since the day this page shipped.

**The fallback hides the failure instead of surfacing it.**
`Dashboard.jsx:203`: `const isMock = !data` — any query failure (which is
always, per above) or even a `skip: !user?.id` (true for any clinician
account not yet linked to a `Clinicians` row — CLAUDE.md's own documented
current state for the seeded demo account) means `data` is `undefined`
forever, so `isMock` is `true` forever, so the page renders
`MOCK_APPOINTMENTS`/`MOCK_SPACERS`/`MOCK_LUNCH` permanently. No error
banner, no loading-forever spinner — a fully-rendered, plausible-looking,
100% fake dashboard.

**Both write actions are local-only, not fake reads — fake writes.**
`Dashboard.jsx:159-166`: `createSpacerBlockMutation`/`markCompleteMutation`
are built with `useMockMutation`, resolving to a synthetic
`{id: `local-${Date.now()}`, ...}` object that only ever touches React
state — confirmed via the code's own comment ("mutation... same
createSpacerBlock shape the real mutation would have **once a backend
endpoint exists**"), which is now stale: `backend/src/blocks/blocks.resolver.ts:44`
(`createSpacerBlock`) and `backend/src/appointments/appointments.resolver.ts`
(`completeAppointment`) both already exist and are already used correctly
elsewhere (`manager/Blocks.jsx`, the queue/appointment-detail complete
flow). A clinician clicking "Save Block" or "Mark Complete" on their own
dashboard today writes nothing to the database — the change appears to
succeed, then silently reverts on the next refresh.

**Why this survived every prior audit:** every earlier "is this page
real" sweep (BUG009, the mock-removal Priority-3 passes,
`check-page-data-wiring.mjs`) correctly asks "does this page have *any*
GraphQL reference" — and `Dashboard.jsx` does; it has four `useQuery`
field references and two mutation hooks. None of those passes checked
*whether the referenced fields exist on the schema the query is actually
validated against*, which is the specific way this page is broken.

**Fix:** rebuild the query against real, already-authenticated,
already-self-scoping primitives this exact role already uses correctly
elsewhere in the app — `appointments(...)` (self-scoped via the JWT's own
`clinician_id`, matching `clinician/Calendar.jsx`'s own
`GET_WEEK_APPOINTMENTS`), the real `getSpacerBlocks`/`getLunchBreaks`
(these two genuinely *are* the correct, already-fixed, clinician-scoped
resolvers — `blocks.resolver.ts:37`'s own comment confirms this page was
the intended caller — only `getClinician`/`getAppointments` need
replacing), and wire both write actions to the real
`createSpacerBlock`/`completeAppointment` mutations. See the
implementation plan this analysis feeds into.

### B-2 · S2 · `pages/appointments/edit.jsx` — clinician/room dropdowns fall back to mock data on a genuine empty result, not just an error

**Fixed 2026-08-25 — `BUG023`/`PLAN085`/`TP112`/`TR111`,
`context/appointments-2026-08-25-bug023/manifest.md`.** Reading the whole
file to fix this narrow finding surfaced four more real defects in the
same file, the worst found only by live-testing: `AppointmentUpdateInput`
has no `end_datetime` field, and `edit.jsx` sent one unconditionally,
rejecting **every save this page has ever attempted** at the GraphQL
variable-coercion layer, since the day it shipped. Filed as one bug
(`BUG023`) covering all six defects, under a dedicated `appointments`
slug rather than the `platform-nfr` slug originally suggested below — see
`BUG023`'s own account for the full defect list and `TR111` for the live
reproduction evidence. Verified against the real backend (new
`frontend/e2e/appointments-edit.spec.js`, 3/3), including a real edit
surviving a page reload — the exact path that was silently broken end to
end before this fix.

**Evidence:** `edit.jsx:31-38`:
```js
const clinicians = cliniciansData?.clinicians?.data?.length
  ? cliniciansData.clinicians.data
  : MockStore.getClinicians()
const rooms = roomsData?.rooms?.length
  ? roomsData.rooms
  : MockStore.getAppointments().reduce(...)
```
This is exactly the anti-pattern CLAUDE.md's own Priority-3 history
already found and fixed twice (`appointments/index.jsx`,
`calendar/index.jsx`: "gate on `error` only") — but `appointments/edit.jsx`
was never included in either fix pass. A `.length` check is truthy-empty,
not error-gated: on first render (before the query resolves) *and* for
any org that genuinely has zero active clinicians matching the filter,
this silently shows fabricated clinicians/rooms in the reschedule form
instead of the real (possibly empty) list.
**Blast radius:** a staff member rescheduling an appointment could
assign it to a clinician or room that doesn't exist in the real
organization at all, and the mutation would then fail (or worse, if IDs
happen to collide) — this is the exact live-empty-result bug class this
codebase has already paid to find and fix twice; this is the third
instance.
**Fix:** change both to the same `error ? MockStore... : real` pattern
already established in the two sibling files.

### B-3 · S4 (known, correctly deferred) · `pages/onboarding/index.jsx`
Fully mock-driven, no backend domain exists (`organization-onboarding`
covers the *org-admin-side* self-serve signup wizard, not this page).
Already in `scripts/check-page-data-wiring.mjs`'s `ALLOWED` list with the
correct reasoning; re-confirmed current, not re-flagging as new.

### B-4 · S4 (known, correctly deferred) · `pages/tasks/index.jsx`
Fully mock-driven (`useMockData`/`useMockMutation` throughout), no
`Tasks`-shaped backend domain exists at all. Already in `ALLOWED`;
re-confirmed current.

## Confirmed false positive (recorded so it isn't re-investigated)

**`queue.queueEntries` / `queue.clinicQueue`** initially looked unused by
the same grep that found A-1 through A-10. Both are real, but
`pages/queue/{index,display}.jsx` correctly call the higher-level
`queueBoard` aggregate query instead, which already returns everything
either raw query would — not a gap, just two ways to ask for the same
data.

## C. Documentation drift found during this analysis

**CLAUDE.md's own Priority-1 section says**: `"admin-roles.spec.js
(pre-existing) doesn't count toward this — it exercises admin/Roles.jsx,
which is still 100% mocks/store.js-driven."` This is now **stale**.
`admin/Roles.jsx` has real `useQuery`/`useMutation` calls
(`GET_ROLES_DATA`, `CREATE_ROLE`, `UPDATE_ROLE`, `DELETE_ROLE`) and no
live `MockStore`/`useMockData` usage — only a historical comment remains.
Whoever wired it did not update this specific CLAUDE.md sentence.
Recorded here per the "verify CLAUDE.md counts before trusting them"
discipline this project already established; the correction itself
belongs in a small doc-only commit alongside whichever gap-fix slice
touches CLAUDE.md next, not a separate slice on its own.

## Fix sequencing

Following this repo's own working loop (`requirements/` →
`implementation-plans/` → `test-plans/` → implement → `test-results/` →
`context/` bundle), one requirement/slice per finding above, in this
order:

1. **B-1** (clinician dashboard) — S1, fixes first. The highest blast
   radius by far: an entire role's home screen and its two core write
   actions. **Done 2026-08-25** — see the status note under B-1 above.
   Filed under a new `clinician-dashboard` feature slug rather than
   `platform-nfr` as suggested below — this fix turned out scoped
   entirely to one pre-existing page's own defect, not a follow-on to a
   just-shipped cross-cutting backend batch the way B-2 still is.
2. **A-1** (password reset) — S2, a broken core-auth flow. **Done
   2026-08-25** — see the status note under A-1 above. The §C CLAUDE.md
   correction was folded into this same slice's docs commit, per §C's own
   note.
3. **B-2** (appointments/edit.jsx mock fallback) — S2, a real live-data
   bug, small fix. **Done 2026-08-25** — see the status note under B-2
   above; turned out to be five more real defects in the same file, not a
   small fix in the end.
4. **A-2/A-3** (drugs + pharmacy dispense/history) — S2, closes REQ022's
   own P0 story properly.
5. **A-4 through A-8** — S3, smaller additive UI slices, can be batched
   the way Phase G+1/G+2/G+3 batched similarly-scoped work.
6. **A-9, A-10** — S4, opportunistic, low urgency.
7. **§C** — a one-line CLAUDE.md correction. **Done 2026-08-25**, folded
   into the A-1 slice's docs commit (the next slice that touched
   CLAUDE.md after this document was written).

Each slice gets its own `REQ`/`PLAN`/`TP`/`TR` under the feature slug
matching its domain (`security` for A-1, `pharmacy` for A-2/A-3,
`clinical-records` for A-5/A-6, `insurance-claims` for A-7,
`platform-integrations` for A-8/A-9, `catalog-master-data` for A-10,
`clinician-dashboard` for B-1 (done — see above), and `appointments` for
B-2 (done — see above; used `appointments` rather than the `platform-nfr`
originally suggested here, matching B-1's own single-domain reasoning),
per `CLAUDE.md`'s own classification rule.
