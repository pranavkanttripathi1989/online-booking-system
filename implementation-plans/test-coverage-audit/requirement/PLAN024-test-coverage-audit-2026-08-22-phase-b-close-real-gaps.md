---
id: PLAN024
type: requirement
feature: test-coverage-audit
created: 2026-08-22
updated: 2026-08-22
status: done
parent: REQ013
related: [TP052, TR051, TP053, TR052]
---

**Closed 2026-08-22.** Written and executed together this pass rather than planned-then-executed separately, since `REQ013` Finding 1 already scoped the three closure targets precisely enough that a separate up-front plan document would have just repeated it — the exploration (reading `admin/Organizations.jsx`, `backend/src/organizations/**`, `backend/src/public/**`, and every consuming frontend page) happened live, before any doc was written, matching the spirit of `CLAUDE.md`'s "explore before implementing" rule even without a separate intermediate artifact.

# Implementation plan — Phase B: close the real documentation-coverage gaps (`REQ013`)

## Scope (from `REQ013` Finding 1)

1. A real `test-plans/organizations/` entry for admin org CRUD.
2. A real `test-plans/public/` entry covering the actual `backend/src/public/**` contract, superseding `TP005` (which stays on disk, marked superseded, not deleted).
3. `TS025` (organization-onboarding) either promoted to a real test-plan or explicitly re-scoped.

## What was found and done

- **`organizations`:** `admin/Organizations.jsx` and `backend/src/organizations/**` were read in full and found already correctly implemented — real GraphQL throughout, a structurally-correct `try/catch` mock fallback (not the empty-result-fakes-as-mock bug class found elsewhere this session), correct `admin`/`super_admin`-only role scoping, correct code normalization/uniqueness/soft-delete. Full CRUD lifecycle (create → duplicate-code rejection → update → soft-delete) live-verified via direct GraphQL calls. `TP052`/`TR051` written; new `context/organizations-2026-08-22/` bundle.
- **`public`:** `backend/src/public/**` and its four consuming frontend pages were read in full. Found already correctly implemented, including a real, previously-fixed IDOR on `getAppointment` (video-join links) — live re-verified this pass: an unrelated, unlinked clinician account correctly gets a real 404 for another clinician's appointment, while the real participant/org-staff/platform-admin paths all correctly succeed. `landing.jsx`'s existing mock status (not touched, real and separate gap) confirmed unchanged and explicitly scoped out. `TP053`/`TR052` written; `TP005` marked superseded in place; new `context/public-2026-08-22/` bundle; `booking-wizard`'s bundle updated to point at the successor.
- **`organization-onboarding`:** re-checked and confirmed no self-serve-signup backend exists anywhere (no `startOrganizationOnboarding`/etc. resolver). Deliberately **not promoted** — `TS025` updated with a closing note explaining why (a product-scope decision, not a doc gap), left `in-progress`.

## Environment note

Live browser (Playwright) and `docker exec`-driven backend unit-test re-verification were both blocked for a sustained period this pass by a genuine host resource issue — `com.docker.hyperkit` observed consuming 5.6GB of this machine's 8GB total RAM, causing every heavy process (headless Chromium launches, `npx jest` inside the backend container) to hang indefinitely across repeated attempts. `curl`-based direct GraphQL verification remained reliable throughout and is the primary live evidence in `TR051`/`TR052`, which say so explicitly rather than presenting curl checks as equivalent to a full browser/unit-test re-run.

## Verification

`TP052`/`TR051` (organizations) and `TP053`/`TR052` (public) written and cross-checked against real, live GraphQL responses this session. No code changes in this phase — both domains were already correct; this phase closes a documentation gap, not a bug.
