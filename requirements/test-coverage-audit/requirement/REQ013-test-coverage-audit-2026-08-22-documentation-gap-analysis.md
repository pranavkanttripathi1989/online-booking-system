---
id: REQ013
type: requirement
feature: test-coverage-audit
created: 2026-08-22
updated: 2026-08-22
status: approved
parent: null
related: [PLAN023]
---

# Test documentation coverage — gap analysis & closure requirements

**Prepared as:** a ground-truth audit of the five-root documentation workflow (`requirements/`, `implementation-plans/`, `test-plans/`, `test-results/`, `test-suggestions/`) that `CLAUDE.md` itself mandates for every feature — not a re-statement of the root `README.md` summary tables, which are known to go stale. Every finding below was verified by listing actual directory contents and reading actual frontmatter/content, cross-checked against `backend/src/*` (the authoritative backend domain list) and `frontend/src/pages/**`.
**Scope note:** this is a documentation-coverage audit, not a code-test-coverage audit. `.spec.ts`/`.spec.js`/Playwright e2e files are tracked separately (see `CLAUDE.md` Priority 1, largely complete) and are **not** what's being measured here — a backend domain can have full unit-test coverage in code and still have zero entries in `test-plans/`/`test-suggestions/`, and that distinction is called out explicitly wherever it applies. This document proposes no code changes itself; it is the requirement that scopes the closure work.

---

## Executive summary

The five-root workflow has been followed inconsistently across the project's lifetime. Two generations of documentation coexist with no cross-link: an early "mock era" generation (TP001–TP038 / TS001–TS038 / TR001–TR037, written 2026-03-19 through 2026-04-02 against `MockStore` as the source of truth) and a later "real era" generation (REQ004 onward, written per-slice against the real backend from 2026-08-17 onward). The most serious finding is not a missing document — it's that **some mock-era test-plans document mock-fallback behavior as spec-correct, and that documented-as-correct behavior is exactly what the 2026-08-22 Priority 3 sweep found and fixed as real bugs** (see Finding 2). A stale test-plan that contradicts the current, fixed, real behavior is worse than no test-plan at all, because it reads as authoritative.

Beyond that, there are real, unambiguous coverage gaps (Finding 1), a scope-audit ID collision (Finding 3), and process drift from the documented workflow itself (Findings 4–6) that this requirement proposes to close in priority order.

---

## Finding 1 — Real coverage gaps (highest priority)

Code with zero test-plan or test-suggestion documentation anywhere in the doc tree:

1. **`backend/src/public/**`** (landing, doctor-profile, booking, video — the entire unauthenticated, patient-facing booking surface, confirmed real per `CLAUDE.md`'s "public/patient-self-serve dialect") has **no test-plan at all**. The only doc that touches this surface, `test-plans/booking-wizard/requirement/booking-wizard-test-plan.md` (TP005, 2026-03-19), predates the real `public` module entirely — it specs `MockStore` service/clinician/slot data, not the real GraphQL contract (`bookPatientAppointment`/`BookPatientAppointmentInput`, camelCase fields) this module actually exposes. TP005 also has **no `test-results/booking-wizard/` entry at all** — it was never executed even against the mock version it was written for.
2. **`organizations`** (the core Client-Organization CRUD backend behind `admin/Organizations.jsx` — create/edit/list a tenant) has no dedicated feature slug in any of the five roots. `admin-test-plan.md` (TP001) touches `/admin/organizations` in two mock-era test cases; that's the entirety of its coverage.
3. **`organization-onboarding`** (`test-suggestions/organization-onboarding/requirement/organization-onboarding-test-suggestion.md`, TS025, `status: in-progress`, 2026-08-17) — the SaaS tenant self-serve sign-up flow — was written and never promoted. No `test-plans/organization-onboarding/` or `test-results/organization-onboarding/` directory exists. This is the platform's own customer-acquisition entry point, undocumented past an unreviewed suggestion for over a month of project activity.
4. **`pages/tasks/index.jsx`, `pages/waiting-room/index.jsx`** — no feature slug either. Both are still 100%-mock pages with no backend (`CLAUDE.md` Priority 3 tracking) — there is genuinely nothing real to test yet, so this is lower urgency than 1–3, but should be opened as a `test-suggestions/` entry once either gets a backend, not discovered fresh at that point.

## Finding 2 — Mock-era test-plans document now-fixed bugs as correct behavior (highest risk)

`TP003` (`test-plans/appointments/requirement/appointments-test-plan.md`) and `TP011` (`test-plans/clinicians/requirement/clinicians-test-plan.md`) were written against `MockStore` as the documented expected behavior — e.g. TP003 specs the sidebar pending-count badge as `MockStore.getAppointments({status:'pending'}).length`, and TP011 specs `MockStore.updateClinician()` as the correct "offline fallback" write path. The 2026-08-22 Priority 3 mock-removal sweep found and fixed the real-code equivalents of exactly these patterns as bugs: `appointments/index.jsx` and `calendar/index.jsx` were fabricating rows/events on any real empty result (not just a real error), and `clinicians/CreateClinicianPage.jsx` had a literal `const useMock = true` that meant no clinician creation ever reached the real database. `TR003`'s `updated:` frontmatter was bumped to 2026-08-18 without the underlying TP003 being rewritten — the timestamp implies a re-verification that didn't happen against the plan's actual assertions.

**Risk:** a future contributor (human or agent) treating TP003/TP011 as the authoritative spec for these pages would be reading a document that currently endorses the exact behavior just classified and fixed as a bug. This is the single highest-risk item in this audit — worse than a gap, because it's actively misleading.

## Finding 3 — Duplicate test-plan/test-result IDs across features

`TP045` exists in two places with unrelated content: `test-plans/products/bug/TP045-products-2026-08-21-cross-tenant-idor.md` and `test-plans/settings/requirement/TP045-settings-2026-08-21-profile-fields-avatar-2fa.md`. Same collision for `TR044` (`test-results/products/bug/TR044-...` vs `test-results/settings/requirement/TR044-...`). The ID sequence is not globally unique in practice, despite every doc's frontmatter treating `id` as if it were. Not safe to renumber retroactively (both are already linked from committed `context/` bundles and cross-references) — the fix here is forward-looking: the "highest existing ID + 1" lookup used when minting a new TP/TR must scan **all** feature directories, not assume a single global counter was maintained.

## Finding 4 — 11 dangling in-progress context bundles

`context/README.md`'s bundle table lists 11 bundles still `in-progress`, several dating back to 2026-04-02 (nearly five months of project time as tracked in this repo's own dates):

| Bundle | IDs |
|---|---|
| `communications-policies-2026-08-20` | REQ006, PLAN009, TP039, TR038, PLAN011, TP041, TR040 |
| `clinician-availability-2026-08-19` | TP007, TR006, TS006 |
| `appointments-2026-08-18` | TP003, TR003, TS003 |
| `auth-2026-08-18` | TP004, TR004, TS004 |
| `organization-onboarding-2026-08-17` | TS025 |
| `phase4-5-increment3-2026-08-17` | TP038, TR037, TS038, PLAN006 |
| `phase4-backend-integration-2026-08-17` | TP037, TR036, TS037 |
| `analytics-finances-2026-04-02` | TP002, TR002, TS002 |
| `calendar-2026-04-02` | TP006, TR005, TS005 |
| `clinician-patients-2026-04-02` | TP010, TR009, TS009 |
| `dashboard-2026-04-02` | TP012, TR011, TS011 |

`requirements/communications-policies/requirement/REQ006-*.md` is itself still `status: in-progress` — the only requirement doc anywhere in the tree not marked `done`/`approved`. Each of these needs either (a) closure to `done`/`approved` with the reason it's now settled, or (b) an explicit note on why it's legitimately still open, so "in-progress" stops being the default resting state for anything nobody revisits.

## Finding 5 — Archive infrastructure exists in name only

`CLAUDE.md` references `test-results/_archive/` directly (the read-order rule: "Consult ... `test-results/_archive/` ONLY when the active tree does not answer the question") — **this directory does not exist anywhere in the repository.** `context/archive/` does exist but contains only its own `README.md`, zero archived bundles. `scripts/archive-sweep.mjs`, which `CLAUDE.md` instructs to run at the start of every session, has evidently never archived anything despite the 11 stale bundles in Finding 4 being old enough (some nearly five months by this repo's internal dates) to plausibly qualify. Either the sweep's aging threshold has never been met by design (in which case `test-results/_archive/`'s mention in `CLAUDE.md` is aspirational, not descriptive, and should say so), or the sweep isn't actually catching what it should.

## Finding 6 — Process drift from the documented 5-step loop

`CLAUDE.md`'s working loop is: write a `test-suggestions/` entry → human review → promote to a new `test-plans/` doc with a fresh ID and `parent` link. In practice:
- The mock-era generation (TP001–TP038) paired a suggestion, plan, and result under the *same* number, written together in one pass — not a genuine review gate between suggestion and plan.
- Every "real era" feature (`communications-policies`, `organization-branding`, `patient-payments`, `products`, `security`) has `test-plans`/`test-results` but **zero** `test-suggestions` entries — the actual workflow now goes straight from a requirement to an already-`approved` test plan, skipping the unreviewed-suggestion stage the process document still describes as step 4.

This isn't necessarily wrong — an experienced reviewer synthesizing plan and suggestion in one pass may be a reasonable simplification — but it's a real drift from what `CLAUDE.md` says happens, and one of the two should change: either restore the intermediate suggestion step for real-era features, or update `CLAUDE.md`'s working loop to describe what's actually being done.

## Finding 7 — Other structural notes (lower priority, informational)

- `requirements/security/` holds two unrelated documents under one feature slug: `REQ001` (a standing OWASP checklist referenced cross-cuttingly, with no dedicated plan/test of its own) and `REQ012` (a real, closed, single-slice requirement). Not a bug, but worth knowing before assuming "security" means one thing in that directory.
- `requirements/semble-competitive-gap/requirement/REQ003-*.md` (`status: approved`) has no implementation-plan, test-plan, or test-suggestion anywhere — it's a pure competitive-analysis/roadmap document, not a build slice, and was likely never meant to have one. Flagged only so it isn't mistaken for an abandoned requirement during a future audit like this one.

---

## Acceptance criteria (Definition of Done for closing this requirement)

Given the size of the gap, this requirement is scoped to be closed in phases rather than one slice — each phase gets its own implementation-plan (`PLAN###`) against this requirement's `parent`, per `CLAUDE.md`'s normal workflow, not bundled into a single mega-PR:

1. **Phase A (Finding 2 — correctness risk):** TP003 and TP011 rewritten to match the real, current backend/frontend contract (post-Priority-3-sweep), with the previously-mock-endorsed behaviors explicitly called out as the bug they turned out to be, not silently swapped. `TR003`/`TR010` re-issued against the rewritten plans with real live verification, not just a timestamp bump.
2. **Phase B (Finding 1 — real gaps):** a real `test-plans/public/` entry covering the actual `backend/src/public/**` contract (superseding TP005, which should be marked superseded/archived rather than left as the only doc pointing at this surface under the wrong name); a `test-plans/organizations/` entry for admin org CRUD; TS025 either promoted to a real `test-plans/organization-onboarding/` entry or explicitly re-scoped if the onboarding flow itself is being reconsidered.
3. **Phase C (Findings 4–5 — hygiene):** every dangling `in-progress` bundle in Finding 4 reviewed and closed or justified; `REQ006` resolved to a real status; a decision made on whether `test-results/_archive/` should exist for real or `CLAUDE.md`'s reference to it should be corrected.
4. **Phase D (Finding 6 — process):** an explicit decision recorded (in `context/open-questions.md` if not resolved immediately) on whether the suggestion-stage is still required for new features going forward, and `CLAUDE.md` updated to match whichever way that's decided.

No phase's requirement item may be marked `done` without a corresponding `test-results/` entry proving it, per `CLAUDE.md` hard rule 7 — this requirement is itself subject to the same rule it's auditing everyone else against.
