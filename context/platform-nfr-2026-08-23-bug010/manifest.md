---
id: CTX-platform-nfr-2026-08-23-bug010
type: bug
feature: platform-nfr
created: 2026-08-23
updated: 2026-08-23
status: done
parent: BUG010
related: [BUG009, F-18, REQ035]
---

# platform-nfr — BUG010, the live browser pass BUG009 couldn't run (2026-08-23)

Direct follow-on from `BUG009`'s own documented gap: six pages were wired to
real backends but never driven in a browser. This bundle is that pass.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | BUG010 | [three real defects](../../requirements/platform-nfr/bug/BUG010-platform-nfr-2026-08-23-live-browser-pass-found-three-real-defects.md) |
| implementation-plans | PLAN031 | [fix the three defects](../../implementation-plans/platform-nfr/bug/PLAN031-platform-nfr-2026-08-23-fix-three-live-browser-defects.md) |
| test-plans | TP058 | [verification plan](../../test-plans/platform-nfr/bug/TP058-platform-nfr-2026-08-23-live-browser-defect-fixes-verification.md) |
| test-results | TR057 | [verification results](../../test-results/platform-nfr/bug/TR057-platform-nfr-2026-08-23-live-browser-defect-fixes-verification.md) |
| test-suggestions | — | skipped — three small fixes against already-proven patterns |

## What changed in the code

| File | Change | Commit |
|---|---|---|
| `App.jsx` | `RootRoute` replaces the two competing "/" routes; removed the colliding `AppShell` index route | `c6ec756` |
| `layouts/AppShell.jsx` | `ROLE_COLORS`: `receptionist` → `staff` | `f92931c` |
| `pages/admin/users/index.jsx` | `ROLE_STYLES`: full stale key set → real seeded role names | `f92931c` |
| `pages/clinicians/index.jsx` | `isAdmin` check: added `staff`/`manager`, dropped dead `receptionist` | `f92931c` |
| `pages/patient/Appointments.jsx` | `EmptyState` call fixed to its real `icon`/`subtitle`/`actionLabel`/`onAction` contract | `c60fe7a` |
| `CLAUDE.md` | documents the seed-step setup gap and both architecture gotchas found here | `351f6da` |

## Outcome

The public landing page is reachable again for anonymous visitors — the
highest-severity finding, since it's the entire pre-login funnel for a
booking SaaS. Patients with no appointments no longer hit a blank white
screen. Staff/receptionist accounts show their real role everywhere checked,
instead of "Patient" or a grey "Unknown" chip.

## What this does not do

- Does not fix `e2e/manager-clinicians-patients.spec.js`'s fixture-data
  dependency on a longer-running dev database's accumulated clinician/patient
  records — a real gap, but a separate one (see `BUG010`'s own "what this does
  not close").
- Did not re-screenshot TC-05/TC-06 (`admin/users`, `/clinicians`) live —
  those fixes were outside this pass's original six target pages, verified by
  code reading only.
- Did not touch `components/Settings/UserManagement.jsx`'s identical dead-name
  bug — confirmed zero importers, so it's unreachable dead code, not a live
  defect.
