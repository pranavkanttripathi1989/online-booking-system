# Test Case Suite — Writing Log

Tracks the 4 parallel background agents writing `test-cases/` (see `test-cases/README.md` for methodology). Each is instructed to ground its domains in the real QA history under `test-plan/`, `test-result/`, `test-suggestion/` — not invent cases from scratch — following the format set by `test-cases/01-authentication/test-cases.md` (written directly, used as the quality template).

**Started:** 2026-08-17

## Status

| Cluster | Domains | Status |
|---|---|---|
| 01 — Authentication | `01-authentication` | ✅ Complete (written directly, not via agent) |
| A | `02-organization-onboarding`, `03-appointments-booking`, `04-availability-scheduling` | ✅ Complete |
| B | `05-patients`, `06-clinicians`, `07-clinics-rooms`, `08-products-services` | ✅ Complete |
| C | `09-billing-payments`, `10-notifications`, `11-reviews-messages` | ✅ Complete |
| D | `12-admin-rbac`, `13-analytics-dashboard`, `14-settings` | ✅ Complete |

**All 14 domain files complete — suite totals ~700+ test cases.** Backend development now begins against this suite as the acceptance spec.

---

## Cluster D — Admin-RBAC/Dashboard/Settings ✅ Complete

**Files:** `12-admin-rbac/test-cases.md` (55 cases), `13-analytics-dashboard/test-cases.md` (53 cases), `14-settings/test-cases.md` (51 cases) — 159 total.

**Real, currently-live bugs found (not hypothetical):**
- `frontend/src/pages/admin/RoomTypes.jsx` references an undeclared `defaultForm` variable — a live `ReferenceError` that crashes the entire `/admin/room-types` page, directly contradicting `test-result/admin-test-results.md`'s claim of "25/25 PASS." **Fixed this session** (see below).
- Dashboard contract mismatch: the documented `DASHBOARD_QUERY` shape (`bookings_by_service: {service_name, count}`) diverges from the Admin Dashboard's own mock fallback shape (`{name, value}`) — charts will silently break against a contractually-correct real backend.
- Clinician Dashboard KPIs use `x.length || fallback`, so a genuine zero-appointment day incorrectly shows the hardcoded fallback instead of 0 (falsy-zero bug).
- **Settings branding cross-tenant leak** (introduced this session, in the branding feature just built): `orgId = user?.organisation?.id ?? 'org-1'` means any mock user with no organization (admin, clinicians, patients) silently edits Meridian Health Group's real branding data. **Fixed**: fallback removed (`?? null`), branding query/save both guarded on `orgId`, UI shows an explicit "not associated with an organization" notice and disables the form instead of silently operating on someone else's data.

**Both bugs fixed this session:**
- `RoomTypes.jsx`: added the missing `const defaultForm = { name: '', description: '', is_active: true }` declaration.
- `settings/index.jsx`: removed the `'org-1'` fallback, guarded the branding query/mutation on `orgId` being present, added a visible notice + disabled state when absent.

---

## Cluster A — Onboarding/Appointments/Scheduling ✅ Complete

**Files:** `02-organization-onboarding/test-cases.md` (44 cases), `03-appointments-booking/test-cases.md` (49 cases), `04-availability-scheduling/test-cases.md` (48 cases) — 141 total.

**Notable grounded cases:**
- `TC-APPT-API-002` — fires two concurrent `createAppointment` calls for an overlapping slot and requires exactly one to win. No existing QA history ever tested this race condition (the frontend only greys out slots client-side) — this directly exercises the Postgres exclusion-constraint approach that was the deciding factor for Postgres over Mongo.
- `TC-AVAIL-UNIT-010`/`TC-AVAIL-API-003` — the actual slot-generation algorithm (lunch breaks/spacer/room blocks subtracting availability) was never exercised by prior QA at all; written fresh from `schema.prisma` + Phase 5 of the backend plan.
- `TC-APPT-FE-008`/`TC-AVAIL-FE-008` — expected-fail/known-gap cases pulled straight from still-PENDING suggestions, following the Auth file's "documents today's bug, flips to regression guard once fixed" pattern.
- `TC-ONBOARD-API-004` — enforces onboarding wizard step-ordering server-side, since self-serve onboarding has zero client-side gating today.

**Cross-cutting gap flagged**: no existing QA anywhere covers cross-tenant/cross-clinic conflicts, cancellation fees, or booking race conditions — these became the forward-looking backbone of the API/E2E sections.

---

## Cluster B — Patients/Clinicians/Clinics-Rooms/Products ✅ Complete

**Files:** `05-patients/test-cases.md` (65 cases), `06-clinicians/test-cases.md` (49 cases), `07-clinics-rooms/test-cases.md` (42 cases), `08-products-services/test-cases.md` (48 cases) — 204 total. This cluster fanned out into its own sub-research agents mid-task to parallelize reading the QA history; the research briefs (clinicians, clinics/rooms, products/services domains) landed as separate notifications earlier and were folded into these files.

**⚠️ Schema/frontend mismatches found — must be resolved before backend work on these domains:**
- **`Rooms` has no `capacity` field in `schema.prisma`**, yet the frontend's Create/Edit Room forms have a required Capacity field with real validation history (negative-capacity bug fix, `GAP-RM-002`). Flagged as an open decision, not silently patched.
- **`Products` has no `duration_minutes` field**, yet a bookable clinical service obviously needs one — the `/manager/services` module actually ships two incompatible data shapes for "a service" today (one with `duration_minutes`+free-text category, one matching the real `Products` schema with `product_type`/`sku`/`variations`). A deliberately-failing trip-wire unit test (`TC-PRDSVC-UNIT-002`) was added so backend work can't silently proceed without resolving this.
- **Patients — a recurring bug pattern**: list rows for most patient IDs fell through to a hardcoded "John Michael Doe" placeholder because the mock detail store only ever covered 1-2 real IDs; the identical root cause independently recurred in the clinician's-own-patients view. Both are now explicit regression cases, plus a new flagged gap: clinician-patient row-level scoping (a clinician should only see their own patients) is never actually tested anywhere today — the whole feature runs off one static array regardless of which clinician is logged in.

---

## Cluster C — Billing/Notifications/Reviews-Messages ✅ Complete

**Files:** `09-billing-payments/test-cases.md` (49 cases), `10-notifications/test-cases.md` (44 cases), `11-reviews-messages/test-cases.md` (46 cases) — 139 total.

**Notable grounded cases:**
- `TC-NOTIF-E2E-004` — regression-locks a real bug (`test-result/notifications-test-results.md` OBS-1) where the topbar bell badge and the `/notifications` page read from two different data sources and disagreed.
- `TC-REV-FE-004`/`005` — lock in three real fixed bugs: `created_at: undefined` rendering literally as "Invalid Date", delete-review only mutating local state (un-deletes on refresh), and a missing confirm dialog.
- `TC-MSG-FE-011` — a real race condition (`BUG-MSG-004`) where fast search typing left a stale match on screen because the filter wasn't memoized.
- Billing's Unit/API sections had zero prior QA to draw from (old docs assumed Stripe/GBP) — written fresh against `schema.prisma`'s GST fields and Razorpay columns per this session's India-specific decisions.

---
