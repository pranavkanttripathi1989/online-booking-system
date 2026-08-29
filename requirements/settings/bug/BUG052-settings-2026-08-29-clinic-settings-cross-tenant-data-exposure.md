---
id: BUG052
type: bug
feature: settings
created: 2026-08-29
updated: 2026-08-29
status: done
parent: BUG044
related: [PLAN220, TP240, TR240]
---

# BUG052 — Settings > Clinic silently exposed (and allowed editing) another tenant's clinic to an org-less admin

## How it was found

User screenshot of `/settings`'s Clinic tab, logged in as an
`admin`-role account: the "Clinic Information" section at the top
showed real, populated data ("MG Road Clinic", a real phone/email/
address), while the "Branding" section immediately below it — same
tab, same account, same page load — showed "Your account isn't
associated with an organisation, so branding can't be edited here."
Two sections on one page disagreeing about whether this account has
an organization was itself the tell.

## Root cause

`admin`/`super_admin` are deliberately platform-wide by design
(`client_org_id: null`, not just absent — see `backend/prisma/
seed.ts` and `common/scoping/tenant-scope.ts`'s `isPlatformOperator`).
`orgScope()` correctly returns `{}` (no filter) for these roles when
querying `clinics` — a legitimate, intentional design for genuine
cross-org tooling elsewhere (e.g. `/manager/clinics`-style screens).

`settings/index.jsx`'s "Clinic Settings" section reused this
deliberately-unscoped `clinics` query inside a single-org "my clinic"
convenience form, then picked whichever clinic happened to be flagged
`is_primary: true` client-side — with **no clinic picker, no org-name
disclosure**. For an org-less admin, this meant silently viewing (and,
via the same section's `updateClinic` save path, **actually being able
to save edits to**) an arbitrary, unrelated tenant's real clinic
record, under a form that visually implied "your own clinic."

The "Branding" section, immediately below on the same page, queries a
strictly `client_org_id`-gated resolver (`myOrgBranding`) with **no**
platform-operator carve-out — it correctly reported the account has no
organization. The inconsistency between the two sections was the only
visible symptom; the underlying issue was a real cross-tenant data
exposure and unintended write path.

## Fix

`loadClinic()` now also gates on `hasOrgForBranding` — the same
state Branding's own (already-correct) load already computes — before
calling the unscoped `clinics` query at all. An org-less caller now
sees the same class of "no organisation" message Branding already
shows, instead of an arbitrary other tenant's data. Sequenced via a
`useEffect` dependent on `brandingLoaded` so the check runs against a
real, resolved query result rather than `hasOrgForBranding`'s own
initial `false` default. The empty-state message distinguishes "your
org genuinely has no clinics yet" (unchanged) from "your account has
no organisation at all" (new).

Deliberately **not** touched: the backend's `clinics`/`updateClinic`
scoping itself, which is correct, intentional, and needed elsewhere
for legitimate platform-wide clinic-management tooling — the bug was
this one convenience form's reuse of it, not the backend contract.

## Verification

`npx eslint` clean; `settings/index.test.jsx` 12/12 (2 new regression
cases: an org-less admin sees the "no organisation" message with no
`GET_CLINICS_FOR_SETTINGS` mock provided — proving the query never
even fires — and a genuinely org-scoped caller still loads and shows
their real clinic correctly).

**Live-verified** (Chrome DevTools MCP, real dev stack): logged in as
`admin@medibook.dev` (real, `client_org_id: null`) — Clinic Information
and Branding now both correctly show the same "not associated with an
organisation" message; confirmed via `document.body.innerText` that
neither "MG Road" nor "City Heart" (the foreign tenant's clinic/org
names) appear anywhere on the page. Logged in as
`manager@medibook.dev` (real org member) — Clinic Information still
correctly loads and shows her own real clinic ("MG Road Clinic"),
confirming the fix doesn't regress the legitimate case.
