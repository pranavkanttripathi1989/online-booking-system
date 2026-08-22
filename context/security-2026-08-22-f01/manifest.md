---
feature: security
date: 2026-08-22
ids: [BUG004]
status: done
---

# security — 2026-08-22 (F-01: org-less caller sees every tenant)

Closed `project-plans/02-findings-register.md` F-01 — the last of the audit's three S1 findings, after `BUG002`/F-11 and `BUG003`/F-02.

The bug was inferring privilege from the *absence* of a field: ~12 call sites read `user.client_org_id ? { client_org_id: ... } : {}`, meaning "an org-less caller sees everything". Correct while only seeded platform operators had a null org; wrong the moment `@Public() register` began minting `patient` accounts with `client_org_id: null` on demand. Replaced with an explicit role allow-list (`isPlatformOperator`) plus fail-closed sentinel filters, centralised in one new module (`common/scoping/tenant-scope.ts`) so a sixth domain cannot reintroduce the ternary. Migrated `clinics`, `rooms`, `services`, `products`, `clinicians`.

Two things worth recording beyond the fix itself:

**A correction to the finding's own file list.** F-01 named `languages` and `lookups` alongside the five real domains. Checked against `schema.prisma`: `Languages`, `ClinicianTypeModel` and `RoomTypeModel` have no `client_org_id` column at all — they are deliberately global shared taxonomies (a clinician-type dropdown is the same list for every tenant), not tenant data with a missing filter. Fixing them would have been over-correcting; the finding was wrong, not the code.

**A latent defect the fix exposed.** `clinicians.service.ts`'s `create()` read the new record back with a synthetic `{ client_org_id: null } as JwtPayload`, which only worked *because* the old check short-circuited for a null org. With `findOne()` fail-closed, that bypass would have rejected the read immediately after a successful create. Replaced with the caller's real JWT.

## Bug

- [BUG004 — Public registration mints org-less accounts that read every tenant (F-01)](../../requirements/security/bug/BUG004-security-2026-08-22-tenant-scoping-org-less-caller-sees-everything.md) — done

## Testing

- New `common/scoping/tenant-scope.spec.ts` — 17 cases on the helper directly, including the org-less-non-operator shape that made the bug exploitable.
- F-01 regression cases added to each migrated domain's spec: list queries must produce a sentinel filter (never `{}`) for an org-less non-operator, and every single-record path must reject them — including against another org-less legacy record.
- `clinicians.service.spec.ts` gained `findAll`/`findOne`/`toggleActive` coverage, which did not exist before this slice at all.
- Backend suite: **641/641 green.** One `account.service.spec.ts` timeout under full parallel load was confirmed a pre-existing flake (30/30 in isolation; that file is untouched by this change).
- **Live re-run of the original exploit, verbatim:** a fresh `register()` still returns `client_org_id: null`, and `clinics`/`services`/`products`/`rooms` now return `[]` and `clinicians` returns `total: 0` — previously all leaked. Legitimate access cross-checked against the database: a real manager still sees their own org's 3 clinics and 8 clinicians; `admin` still sees all 4 clinics across both orgs.

## An e2e failure that was NOT this change

Three manager-facing specs failed after the fix. Investigated rather than assumed, because a tenant-scoping change returning empty lists is exactly what a scoping regression would look like:

- The page renders correctly in a real browser with a valid session (verified: both "MG Road Clinic" and "Koramangala Health Center" present, no spinner), and the two exact GraphQL queries the page issues return correct data in 70–220 ms.
- Real cause, confirmed by a network log showing the `Login` mutation **canceled**: `loginAs()` waited only for the post-login URL change, which is a client-side `navigate()` and can win the race against the login response being committed. The caller's subsequent hard `page.goto()` then cancelled the in-flight request, leaving no token — so every query on the destination page ran unauthenticated and returned empty.
- That empty result then hit the page's own `apiClinics.length === 0 → render CLINICS_DATA` fallback (the F-18/F-21 anti-pattern), so the page displayed **London mock clinics** while the spec waited for real seeded Indian ones.

Fixed at the harness level: `loginAs()` now also waits for the token to be durably in storage before returning. The underlying page-level mock fallback remains open as part of F-18.

## Related

- [security-2026-08-22-f02 bundle](../security-2026-08-22-f02/manifest.md) — `BUG003`/F-02, closed earlier the same session.
- [security-2026-08-22 bundle](../security-2026-08-22/manifest.md) — `REQ015`, the RBAC-enforcement requirement this fix is a prerequisite for.
- [project-plans/technical-plans/00-foundation-hardening.md](../../project-plans/technical-plans/00-foundation-hardening.md) §2 — specified this helper; F-13 (indexes) is the remaining Phase F blocker.
