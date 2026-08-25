---
id: PLAN082
type: improvement
feature: platform-nfr
created: 2026-08-25
updated: 2026-08-25
status: done
parent: REQ051
related: [REQ052, REQ053, REQ054, REQ055, REQ056, REQ057, REQ058, PLAN074, PLAN075, PLAN076, PLAN077, PLAN078, PLAN079, PLAN080, PLAN081]
---

# PLAN082 — Implementation plan: Phase G+3 frontend completion

## Scope

Phase G+3 (PLAN074–081, 2026-08-25) shipped 8 backend-only domains —
`REQ051` (checklist), `REQ052` (intake-fields), `REQ053` (break-glass +
impersonation), `REQ054` (packages), `REQ055` (branch-overrides), `REQ056`
(discount-approval + cash-drawer close), `REQ057` (documents/PDF), `REQ058`
(messaging extensions) — each with its own "no frontend UI in this slice"
deferral, matching the exact precedent Phase G+2 set the day before
(`PLAN073`). This pass closes every one of those deferrals with real,
backend-verified UI, following that same precedent's own working pattern.

Classified as a cross-cutting `improvement` under `platform-nfr`, not a new
per-domain `requirement`, for the identical reason `PLAN073` was: it adds no
new backend capability, only real UI for an already-existing, already
unit-tested contract.

## Design

Two new pages, ten extended existing files, one new shared utility — per
the approved plan's own scope-discipline target, matching Phase G+2's
scale:

- **`pages/manager/clinic-forms/index.jsx`** (new) — tabbed page (Pre-Visit
  Checklist / Intake Form Fields) per clinic, full CRUD. `data-testid=
  "clinic-select"` added to its Clinic `Select` (see Real bugs #7 below).
- **`pages/manager/packages/index.jsx`** (new) — package CRUD, card-grid
  layout. `data-testid="clinic-select"` and `data-testid=
  "redeemable-against-select"` added for the same reason.
- **`pages/appointments/detail.jsx`** — new "Pre-Consultation Checklist"
  card (staff-facing completion checkboxes, `aria-label`led per item); Take
  Payment dialog gains a mode toggle (tender / redeem-package-sitting),
  discount fields, and a "Download Invoice" button; `data-testid=
  "patient-package-select"` on the redeem picker.
- **`pages/appointments/index.jsx`** — "Close Cash Drawer" header button +
  dialog.
- **`components/BookingWizard/{BookingStep4Patient,BookingStep5Confirm,
  BookingWizard}.jsx`** — dynamic intake-field capture, gating `Next` on
  required fields, submitted as `intake_responses` on `createAppointment`.
- **`pages/settings/index.jsx`** — "Emergency Access" (break-glass) section
  in the existing Account & Security tab.
- **`pages/admin/users/index.jsx`** + **`context/AuthContext.jsx`** —
  admin impersonation: an "Impersonate" icon action, a reason-prompt
  dialog, and real client-side token-swap/restore logic.
- **`pages/manager/services/edit.jsx`** — "Branch Pricing Overrides" table.
- **`pages/finances/index.jsx`** — "Discount Approvals" and "Cash Drawer"
  tabs.
- **`pages/prescriptions/PrescriptionPrint.jsx`**,
  **`pages/clinician/EncounterWorkspace.jsx`** — "Download PDF" buttons.
- **`utils/documents.js`** (new) — `downloadAuthenticatedPdf()`, shared by
  all three PDF-download call sites (invoices, prescriptions, visit
  summaries): authenticated `fetch()` + Blob + synthetic `<a download>`
  click, since a bare `<a href>` can't carry a Bearer header.
- **`pages/messages/index.jsx`** — department/clinic scoping on compose,
  file attachments, canned replies (insert + manage), and a manager-only
  department-oversight filter.
- **`layouts/AppShell.jsx`** — a persistent red "Impersonating `<name>` —
  Exit" banner, with `bannerOffset` threaded through the app bar, both
  drawer variants, and the top-nav layout so it never overlaps existing
  chrome.

## Real bugs found and fixed

Eight, spanning both the backend and the frontend — every one found via
the real, backend-verified Playwright pass this slice's own testing
required, not by unit tests, matching this codebase's now-repeated finding
that live/e2e testing surfaces a different bug class than mocked-Prisma
unit tests ever can:

1. **Backend — `break-glass.service.ts`'s own notification dispatch was
   dead-on-arrival.** `BreakGlassService.request()` called
   `notificationTrigger.dispatch(admin.id, 'break_glass_requested', ...)`,
   but `'break_glass_requested'` had never been added to the
   `NotificationEventType` Prisma enum. Prisma's runtime enum validation
   rejected it inside the awaited `Promise.all`, failing the *entire*
   `requestBreakGlassAccess` mutation for any org with a real admin/manager
   to notify — reachable in production, not just in this test. Fixed with
   a hand-written migration (`ALTER TYPE ... ADD VALUE`) adding the enum
   value, plus a `DEFAULTS` entry in `notification-trigger.service.ts`
   (app+email, no SMS/WhatsApp — an internal ops alert).
2. **Frontend — a real impersonation race condition.**
   `AuthContext.jsx`'s `startImpersonating()` dispatches `{type: 'LOGIN',
   payload: {token, user: null}}` (deliberately null — a fresh `ME_QUERY`
   for the *target's* identity is still in flight), but the `LOGIN` reducer
   case unconditionally sets `isLoading: false`. The caller's own
   `navigate('/')` then hit `RootRoute` with `isAuthenticated: true` but
   `user: null`, and `getPostLoginRedirect`'s null-user fallback
   (`/dashboard`) fired before the impersonated user's real role was known
   — sending *every* impersonation start through a flash-redirect to
   `/dashboard`, which `RoleGuard` then correctly rejected the instant the
   real (non-admin) role loaded a moment later. Fixed by dispatching an
   explicit `SET_LOADING: true` immediately after the null-user `LOGIN`
   dispatch in both `startImpersonating()` and (defensively)
   `endImpersonating()`.
3. **Frontend — the "Download Invoice" button was unreachable in
   practice.** `recordCounterPayment`'s `onCompleted` handler called
   `setPaymentDialogOpen(false)` on success — but `lastPaymentId` (which
   the Download Invoice button's own render condition depends on) is set
   in that *same* handler, meaning the dialog closed at the exact moment
   the condition that reveals the button became true. `REQ057`'s own
   invoice-download feature could never actually be seen or clicked
   through the normal successful-payment flow. Fixed by no longer closing
   the dialog on success — it shows a "Payment recorded." message instead
   and the user closes it themselves via the existing Close button.
4. **Frontend — `redeemPackageSitting` had a real GraphQL contract
   mismatch.** The mutation string declared two top-level scalar arguments
   (`appointment_id`, `patient_package_id`), but the real resolver
   (`appointment-payments.resolver.ts`) requires a single wrapped `input:
   RedeemPackageSittingInput!`. This is exactly the Hard Rule 7 class of
   bug ("match the existing contract, don't invent a reasonable one") —
   the entire "redeem a package sitting" feature was non-functional from
   the moment it shipped, surfaced only now via a real HTTP round trip
   returning Apollo's own generic "Response not successful: Received
   status code 400" (no parseable `graphQLErrors`, since the request never
   passed GraphQL argument validation). Fixed by wrapping both the query
   string and the call site's variables in `input: {...}`.
5. **Backend — `packages.service.ts` rejected every real product.**
   `createProduct` never accepts a `clinic_id` (confirmed in
   `products.resolver.ts` — every real product is an org-level master,
   `clinic_id: null`, the same convention `REQ055`'s branch-overrides
   feature already established), but `createPackage`'s own validation
   required `product.clinic_id === input.clinic_id` exactly — a master
   product can never satisfy that, so package creation was completely
   broken against any product creatable through the real app. Fixed to
   accept a null-`clinic_id` master too, gated on matching
   `client_org_id` instead (a master product has no clinic to derive an
   org from, so this needed an explicit org check, not just a relaxed
   clinic check). Two new unit tests cover both the accept and the
   cross-org-reject paths.
6. **Frontend — the identical bug, client-side, in
   `manager/packages/index.jsx`.** `productsForClinic`'s own filter had
   the same strict `clinic_id` equality, found and fixed first (before the
   backend copy of the same bug was discovered) — the "Redeemable
   against" picker would otherwise never show a real product at all.
7. **Frontend — three real accessibility gaps, not just test-locator
   problems.** The checklist-completion checkbox, `admin/users/index.jsx`'s
   "Impersonate" icon button, and `finances/index.jsx`'s Approve/Reject
   icon buttons each had a `Tooltip` title but no `aria-label` on the
   control itself — meaning a screen reader announces nothing useful for
   any of the three, not just that Playwright's `getByRole(..., {name})`
   couldn't find them. Fixed with explicit `aria-label`s on each.
8. **Frontend — MUI's own `Select` accessible-name computation is
   unreliable once a value is set**, a genuine, previously-undocumented
   finding worth carrying into future work on this codebase: a `Select`'s
   `aria-labelledby` lists both its `InputLabel`'s id and the control's
   *own* id, so once any value is selected the computed accessible name
   becomes `"<label> <selected display text>"`, not the plain label —
   `getByLabel('Clinic', {exact: true})` matches only in the instant
   before a value is auto-selected and never again. Confirmed by noticing
   the "Clinic" select's own auto-select-first-clinic effect always won
   the race, in every run, with the DOM snapshot always showing it already
   correctly selected. Resolved (not just worked around in the test) with
   stable `data-testid`s on the three affected `Select`s, which is the
   correct fix for any future MUI `Select` this codebase needs to target
   reliably once it can carry a real value.

## Testing

Real-backend Playwright spec, `frontend/e2e/phase-g3-frontend-completion.
spec.js` — one `test.describe` per domain, 10 tests total (Cash Drawer
Close split out of Discount Approval once both needed independent
fixtures), all against the real `medibook_backend`/`medibook_postgres`, no
mocks. A shared `switchLoginAs()` helper clears storage before a second
`loginAs()` call within one test — `/login` itself redirects an
already-authenticated visitor away before the demo-account buttons ever
render, and no prior spec in this suite had needed a same-test role
handoff before (several of these domains genuinely need one: staff
records something, a manager decides it).

Several test-authoring lessons, distinct from the app bugs above, worth
recording since they'll recur: a fixed (non-unique) fixture string
(discount reason, checklist label, cash-drawer business date) collides
with the same spec's own prior-run residue, since this suite's convention
is not to clean up every fixture; a checked-in appointment's real
`QueueEntries` row stays `'waiting'` forever unless the test's own
`afterAll` cancels the appointment, and `callNextInQueue`'s FIFO pick
surfaces the oldest stale entry, not the current run's fresh one, if nobody
does; a decided (approved/rejected) table row is designed to *stay*
visible with an updated status chip, not disappear, matching every other
status-badged table in this app; Playwright's `.check()` verifies the
checked state only once, immediately after its own click — too early for
a real mutation-round-trip-then-refetch cycle a checkbox's `onChange`
kicks off, needing a plain `.click()` plus a separately-polling
`expect(...).toBeChecked()` instead.

Full verification: `npx playwright test ... --workers=1` — **10 passed
(5.6m)**, zero failures. Frontend: `npm run lint` (165 warnings, down from
the 177 baseline — ratchet respected), `npm test` (82/82, 10/10 suites),
`npm run build` (clean), `node scripts/check-page-data-wiring.mjs` (0 new
fabricated pages). Backend (touched this pass —
`packages.service.ts`, `notification-trigger.service.ts`, the new
migration): `npx jest --maxWorkers=2` (1215/1215, 80/80 suites — up from
1213 with the 2 new `packages.service.spec.ts` cases), `npm run test:int`
(369/369, 4/4 suites, run from the host per the established gotcha),
`eslint` (clean), `tsc --noEmit` (clean).

## Environment note

This pass hit the same class of Docker/host instability documented
repeatedly in `CLAUDE.md` and in Phase G+2's own `PLAN073` — both
`medibook_backend` and `medibook_frontend` wedged into an "Up but
unresponsive" state (confirmed via `docker exec ... wget localhost` timing
out from *inside* each container, ruling out a port-mapping explanation)
more than once mid-session, on top of a real host load spike (1-minute
load average peaking past 47, driven by `com.docker.hyperkit` plus an
unrelated macOS Storage-usage background scan). Recovered each time with
the established pattern: quit Docker Desktop entirely, relaunch, and where
a targeted `docker rm -f`/`docker compose up -d` on the specific wedged
container itself then hung (`docker ps` still responsive throughout), that
confirmed it needed the full Docker Desktop relaunch rather than more
targeted retries. Cost significant wall-clock time across this pass but is
not a defect in this slice's own code.

## Open questions / deferred

1. **A patient-facing "My Documents"/"My Packages" browse view** — deferred
   per the approved plan, matching `REQ057`'s own deferral: no patient-safe
   list query exists yet for any of prescriptions/invoices/visit
   summaries or a patient's own purchased packages.
2. **Re-downloading a historical invoice after a page reload** — still not
   possible; the `Appointment` GraphQL type has no `payment_id`/`payments`
   field to look one up by. A real backend gap, flagged in the original
   plan, not fixed here (out of scope for a frontend-completion pass).
3. **Whether any other domain's own create-mutation validation has the same
   "master row can never satisfy a strict-equality clinic check" class as
   Real bug #5** was not audited beyond `packages.service.ts` itself — the
   org-level-master convention (`clinic_id: null`) is now established
   across services, branch-overrides, and packages, but a full sweep for
   other call sites comparing a nullable `clinic_id` by strict equality
   wasn't done this pass.
