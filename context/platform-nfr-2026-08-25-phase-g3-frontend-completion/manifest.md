---
id: CTX-platform-nfr-2026-08-25-phase-g3-frontend-completion
type: improvement
feature: platform-nfr
created: 2026-08-25
updated: 2026-08-25
status: done
parent: PLAN082
related: [REQ051, REQ052, REQ053, REQ054, REQ055, REQ056, REQ057, REQ058, PLAN074, PLAN075, PLAN076, PLAN077, PLAN078, PLAN079, PLAN080, PLAN081]
---

# platform-nfr — Phase G+3 frontend completion (2026-08-25)

Closes the "no frontend UI in this slice" deferral on all 8 domains shipped
backend-only the same day (`REQ051`–`REQ058` — see each domain's own
`context/<feature>-2026-08-25-reqXXX/manifest.md`), matching the exact
precedent Phase G+2's own frontend-completion pass set the day before.

## Documents

| Root | ID | Doc |
|---|---|---|
| implementation-plans | PLAN082 | [Phase G+3 frontend completion](../../implementation-plans/platform-nfr/improvement/PLAN082-platform-nfr-2026-08-25-phase-g3-frontend-completion.md) |
| test-plans | TP109 | [verification plan](../../test-plans/platform-nfr/improvement/TP109-platform-nfr-2026-08-25-phase-g3-frontend-completion.md) |
| test-results | TR108 | [verification results — pass, 10/10](../../test-results/platform-nfr/improvement/TR108-platform-nfr-2026-08-25-phase-g3-frontend-completion.md) |

## What shipped

Two new pages (`pages/manager/clinic-forms/index.jsx`,
`pages/manager/packages/index.jsx`), real UI extensions to ten existing
files (`appointments/{detail,index}.jsx`, the internal `BookingWizard`
step components, `settings/index.jsx`, `admin/users/index.jsx`,
`manager/services/edit.jsx`, `finances/index.jsx`,
`prescriptions/PrescriptionPrint.jsx`, `clinician/EncounterWorkspace.jsx`,
`messages/index.jsx`, `AuthContext.jsx`, `AppShell.jsx`), and one new
shared utility (`utils/documents.js`). New e2e spec
`frontend/e2e/phase-g3-frontend-completion.spec.js` — 10 tests, one per
domain, all against the real backend.

## Eight real bugs found, spanning both the backend and the frontend

1. **Backend** — `break-glass.service.ts`'s own notification dispatch used
   an event-type value (`'break_glass_requested'`) never added to the
   `NotificationEventType` Prisma enum, failing the *entire*
   `requestBreakGlassAccess` mutation for any org with a real admin/manager
   to notify. Fixed with a hand-written migration adding the enum value
   plus a `DEFAULTS` entry in `notification-trigger.service.ts`.
2. **Frontend** — a real impersonation race: `AuthContext.jsx`'s `LOGIN`
   reducer case unconditionally set `isLoading: false`, even for the
   deliberately-null-user dispatch `startImpersonating()` uses while the
   target's real identity is still loading. The caller's own immediate
   `navigate('/')` hit `RootRoute` before that resolved, and
   `getPostLoginRedirect`'s null-user fallback (`/dashboard`) sent every
   impersonation start through a flash-redirect that `RoleGuard` then
   rejected the instant the real, non-admin role loaded. Fixed with an
   explicit `SET_LOADING: true` dispatch.
3. **Frontend** — the "Download Invoice" button, built in this same pass,
   was unreachable through its own intended flow: `recordCounterPayment`'s
   success handler closed the Take Payment dialog at the exact moment
   `lastPaymentId` (which reveals that button) became set. Fixed by
   keeping the dialog open on success.
4. **Frontend** — `redeemPackageSitting`'s mutation call sent two
   top-level scalar arguments where the real resolver requires a single
   wrapped `input` object — a genuine Hard Rule 7 contract mismatch that
   left the entire "redeem a package sitting" feature non-functional from
   the day it shipped, surfaced only via a real HTTP round trip. Fixed to
   match the resolver's actual shape.
5. **Backend** — `packages.service.ts`'s `create()` rejected every real
   product a package could ever be built from, since `createProduct`
   never sets a `clinic_id` (every real product is an org-level master)
   while the validation demanded strict clinic_id equality. Fixed to
   accept a master product gated on matching org instead, matching
   `REQ055`'s own branch-overrides precedent for the identical convention.
6. **Frontend** — the identical bug, client-side, in
   `manager/packages/index.jsx`'s own product-clinic filter — found first,
   before its backend counterpart was discovered.
7. **Frontend** — three real accessibility gaps: the checklist-completion
   checkbox, `admin/users/index.jsx`'s "Impersonate" icon button, and
   `finances/index.jsx`'s Approve/Reject icon buttons each had a
   `Tooltip` title but no `aria-label` on the control itself, leaving no
   accessible name at all for a screen reader — not merely a test-locator
   inconvenience. Fixed with explicit `aria-label`s on each.
8. **A genuine, previously-undocumented MUI `Select` testability finding**,
   worth carrying into future work: its accessible name concatenates the
   `InputLabel` text with the control's own selected-value text once a
   value is set (both ids are in its own `aria-labelledby`), so
   `getByLabel('X', {exact: true})` matches only in the instant before any
   value is ever set and never again afterward. Resolved with stable
   `data-testid`s on the three affected `Select`s, the correct fix rather
   than a test-only workaround.

## Environment: repeated Docker/host instability, not a code defect

Both `medibook_backend` and `medibook_frontend` wedged into an "Up but
unresponsive" state more than once mid-pass (confirmed via `docker exec
... wget localhost` timing out from *inside* each container, ruling out a
port-mapping explanation), against a real host load spike (1-minute load
average past 47, driven by `com.docker.hyperkit` plus an unrelated macOS
Storage-usage background scan). Recovered each time via the established
pattern — quit Docker Desktop entirely, relaunch, then `docker rm -f`/
`docker compose up -d` the specific wedged container. A targeted `docker
rm -f` attempted *without* first quitting Docker Desktop hung more than
once with `docker ps` itself still responsive throughout — confirming (again)
that the full relaunch, not more targeted retries, is the right first move
once that pattern appears.

## Verification

Full Hard-Rule-3 suite green: frontend lint (165 warnings, down from the
177 baseline — ratchet respected), frontend unit tests (82/82, 10/10
suites), frontend build (clean), page-data-wiring gate (0 new fabricated
pages), backend unit tests (1215/1215, 80/80 suites — up from 1213 with 2
new test cases for the `packages.service.ts` fix), backend integration
tests (369/369, 4/4 suites — run from the host per the established
gotcha), backend eslint (clean), backend `tsc --noEmit` (clean). e2e:
10/10 passed (5.6m clean run).
