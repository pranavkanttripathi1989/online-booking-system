# MediBook/HealthSync — Test Case Suite

Written before backend development begins, so the backend is built test-first against a concrete spec rather than tested after the fact. Grounded in `context/frontend-contract-analysis.md` (the actual frontend contract) and `schema.prisma` (the data model) — not written from scratch, derived from what's already been analyzed.

## Structure

One file per feature domain, each internally split into four test-type sections:

1. **Unit Test Cases** — pure logic, no I/O: a single service method, a validation rule, a scheduling algorithm, a resolver's input-shaping logic. Mocked dependencies. These are what the backend engineer runs on every save.
2. **Backend/API Test Cases** — GraphQL resolver + database integration, real Postgres (test DB), real Prisma. Verifies the actual contract: field names, types, error shapes, auth guards, row-level scoping.
3. **Functional/E2E Test Cases** — a full user journey across frontend + backend, the thing a human or Playwright script would actually do: log in, book an appointment, see it on the calendar.
4. **Frontend Test Cases** — component/page-level behavior against the existing mock store (`frontend/src/mocks/`), independent of whether a backend exists — these can and should run today.

## Feature domains (files)

| # | File | Domain |
|---|---|---|
| 01 | `01-authentication/test-cases.md` | Login, register, OTP, forgot-password, JWT, RBAC guards, session/inactivity |
| 02 | `02-organization-onboarding/test-cases.md` | Self-serve tenant signup wizard, plan selection, trial lifecycle, branding |
| 03 | `03-appointments-booking/test-cases.md` | Booking wizard, appointment CRUD, status transitions, cancellation rules, double-booking prevention |
| 04 | `04-availability-scheduling/test-cases.md` | Availability templates, lunch breaks, spacer/room blocks, slot generation algorithm |
| 05 | `05-patients/test-cases.md` | Patient CRUD, self-scoping, structured JSON fields (address/phones) |
| 06 | `06-clinicians/test-cases.md` | Clinician CRUD, clinician types, languages |
| 07 | `07-clinics-rooms/test-cases.md` | Clinic CRUD, room CRUD, room types |
| 08 | `08-products-services/test-cases.md` | Service/product catalog, categories, subcategories, variations |
| 09 | `09-billing-payments/test-cases.md` | Razorpay payment flow, GST invoicing, subscription plans, entitlements/feature-gating |
| 10 | `10-notifications/test-cases.md` | In-app notifications, email service, real-time subscription delivery |
| 11 | `11-reviews-messages/test-cases.md` | Patient reviews (+ clinician replies), patient↔clinician messaging threads |
| 12 | `12-admin-rbac/test-cases.md` | User management, roles/permissions, audit logs, email template management |
| 13 | `13-analytics-dashboard/test-cases.md` | Per-role dashboard KPI aggregation, revenue/utilisation reporting |
| 14 | `14-settings/test-cases.md` | Profile, account/security, appearance, clinic info, organization branding |
| 15 | `15-tasks/test-cases.md` | Internal staff follow-up tasks (`/tasks`) — new domain, no `schema.prisma` model exists yet |

## Test case format

Every test case follows this shape:

```
### TC-<DOMAIN>-<TYPE>-<NNN> — <short title>

- **Priority:** Critical / High / Medium / Low
- **Preconditions:** state required before the test can run
- **Steps:** numbered, unambiguous
- **Expected Result:** the single observable outcome that makes this pass/fail
- **Notes:** edge cases, why this matters, what it guards against (optional)
```

`<TYPE>` is one of `UNIT`, `API`, `E2E`, `FE`. IDs are stable — don't renumber when adding cases, append.

## Priority scheme

- **Critical** — breaks money, data integrity, or security if wrong (double-booking, payment amounts, auth bypass, cross-tenant data leaks).
- **High** — breaks a core user journey (can't book, can't log in, can't see your own appointments).
- **Medium** — degrades UX but has a workaround (a filter doesn't persist, a toast doesn't show).
- **Low** — cosmetic/polish.

## Updated for the Semble gap-analysis mockup wave (Phases 1/3/6)

`05-patients`, `12-admin-rbac`, and `03-appointments-booking` were extended with new cases covering the frontend mockups built against `requirements/semble-competitive-gap-analysis-requirements.md` this session (duplicate patient merging, Waiting Room/Patient Journey tracking, communication log, Custom Roles & Access Groups' `client_org_id`-scoped schema, Tasks). One new domain, `15-tasks`, was added since Tasks has no natural home in the original 14. Two stale cases were corrected rather than left wrong: `TC-ADMIN-FE-005` and its `TC-ADMIN-E2E-002/003` companions described a Permissions Matrix persistence bug that was fixed and live-browser-verified this session — they're now marked `STATUS: FIXED` and kept as regression guards, not left as open bugs. Several new API cases (`TC-PAT-API-013–020`, `TC-ADMIN-API-015–017`, `TC-APPT-API-014–016`) define contracts for mockups that currently have zero backend — same "spec ahead of implementation" methodology this suite was built with originally, not a departure from it.

## How this drives backend development

Each backend phase in `context/backend-implementation-plan.md` should be considered done only when its domain's Backend/API and Unit test cases pass — the Functional/E2E cases are the acceptance bar for the phase's frontend integration, not just the resolver existing. This suite is the spec; `context/backend-implementation-plan.md` is the build order.
