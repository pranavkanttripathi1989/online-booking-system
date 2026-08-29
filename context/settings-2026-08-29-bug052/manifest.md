---
id: CTX-settings-2026-08-29-bug052
type: bug
feature: settings
created: 2026-08-29
updated: 2026-08-29
status: done
parent: BUG052
related: [PLAN220, TP240, TR240]
---

# settings — Clinic Settings cross-tenant data exposure (2026-08-29)

User-reported via screenshot: on the same `/settings` Clinic tab, one
section ("Clinic Information") showed real, populated clinic data for
an `admin`-role account, while the section immediately below it
("Branding") correctly said the account has no organization —
suggesting a real inconsistency.

## Documents

| Root | ID | Doc |
|---|---|---|
| requirements | BUG052 | [Cross-tenant data exposure](../../requirements/settings/bug/BUG052-settings-2026-08-29-clinic-settings-cross-tenant-data-exposure.md) |
| implementation-plans | PLAN220 | [implementation plan](../../implementation-plans/settings/bug/PLAN220-settings-2026-08-29-clinic-settings-cross-tenant-data-exposure.md) |
| test-plans | TP240 | [test plan](../../test-plans/settings/bug/TP240-settings-2026-08-29-clinic-settings-cross-tenant-data-exposure.md) |
| test-results | TR240 | [results](../../test-results/settings/bug/TR240-settings-2026-08-29-clinic-settings-cross-tenant-data-exposure.md) |

## What shipped

Confirmed a real bug via investigation before touching anything:
`admin`/`super_admin` are deliberately platform-wide
(`client_org_id: null`), and the backend's `clinics` query is
deliberately unscoped for them (a legitimate need for genuine
cross-org tooling elsewhere). `settings/index.jsx`'s "Clinic Settings"
section reused that unscoped query inside a single-org "my clinic"
form, picking an arbitrary tenant's clinic client-side via an
`is_primary` fallback — with no picker, no org-name disclosure. An
org-less admin could silently view, and via the same section's save
path actually edit, another tenant's real clinic record.

Fixed entirely on the frontend by reusing Branding's own already-correct
`hasOrgForBranding` signal to gate `loadClinic()` — an org-less caller
now sees the same "no organisation" message Branding already showed,
instead of someone else's data. The backend's own `clinics` scoping
(correct, intentional, needed elsewhere) was deliberately left
untouched.

## Verification

`settings/index.test.jsx` 12/12 (2 new regression cases). **Live-verified**
both directions: `admin@medibook.dev` (org-less) now sees a consistent
"no organisation" message on both Clinic Information and Branding, with
no foreign-tenant data anywhere on the page; `manager@medibook.dev` (a
real org member) still correctly loads and shows her own clinic.
