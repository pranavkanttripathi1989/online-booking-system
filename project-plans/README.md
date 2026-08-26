---
id: PP000
type: index
feature: project-plans
created: 2026-08-22
updated: 2026-08-22
status: active
parent: null
related: [PP001, PP002, PP003, PP004, PP005, PP006, PP007, PP008]
---

# project-plans — MediBook / HealthSync

Full-codebase analysis and forward plan, produced 2026-08-22 by reading every
source, test, and requirement file in the repository and probing the running
stack (Docker: `medibook_backend`, `medibook_postgres`, `medibook_redis`,
`medibook_frontend`) live.

This root is **analysis and planning only**. It does not replace the five
existing roots (`requirements/`, `implementation-plans/`, `test-plans/`,
`test-results/`, `test-suggestions/`) — every actionable item here is written
to be promoted into those roots through the normal `CLAUDE.md` working loop,
and each finding carries the requirement/bug classification it should be filed
under.

## Documents

| Doc | What it is |
|---|---|
| [01-codebase-analysis.md](./01-codebase-analysis.md) | Verified inventory and architecture assessment: what exists, how it is wired, what is real versus decorative. Every number measured, not quoted from an index. |
| [02-findings-register.md](./02-findings-register.md) | The 33 findings, each with severity, hard evidence, blast radius, and a specific fix. This is the backlog. |
| [03-security-and-tenancy-audit.md](./03-security-and-tenancy-audit.md) | Security deep-dive, including a reproducible live proof of a cross-tenant data-disclosure path that the current 602-test suite passes clean. |
| [04-test-and-quality-strategy.md](./04-test-and-quality-strategy.md) | Measured test reality versus the documented claims, why the suite missed the findings above, and the target pyramid. |
| [05-competitive-analysis.md](./05-competitive-analysis.md) | Where MediBook stands against the real competitive set for the Indian market (Practo, Eka Care, Bajaj Finserv Health, Semble, Cliniko, Jane, SimplePractice, NexHealth, Zocdoc, Phreesia), and the ranked feature recommendations that follow. |
| [06-execution-plan.md](./06-execution-plan.md) | Phased delivery plan P0–P5 with per-phase Definition of Done, sequencing rationale, and the first ten commits. |
| [07-prd-gap-analysis-and-roadmap.md](./07-prd-gap-analysis-and-roadmap.md) | Maps `PRD-Healthcare-Booking-SaaS-India.md` ("CareOS") against the codebase module by module, and sequences the resulting 22 `requirements/REQ014`–`REQ035` documents into phases F–I on top of this directory's own P0–P1 foundation work. |
| [08-integration-gap-analysis.md](./08-integration-gap-analysis.md) | Fresh 2026-08-25 sweep: every backend operation cross-checked against real frontend usage, and every remaining `mocks/store`/`useMockData` import individually classified. 12 real findings (1 × S1 — the entire clinician dashboard is fabricated end to end), plus a confirmed false positive and a stale-CLAUDE.md correction. |
| [09-next-15-slice-roadmap.md](./09-next-15-slice-roadmap.md) | A 15-slice next-batch survey — superseded by `10` once a parallel session's own independent survey was discovered and reconciled. |
| [10-next-14-slice-batch-reconciled.md](./10-next-14-slice-batch-reconciled.md) | Reconciles `09` against a parallel session's own concurrent survey (`REQ080` Tasks work already in progress there); sequences the resulting 14 slices (`REQ100`–`REQ113`), all shipped. |
| [11-next-10-slice-batch.md](./11-next-10-slice-batch.md) | The next 10-slice selection after `10` shipped, verified against live code, no cross-session collision this round. |
| [technical-plans/](./technical-plans/README.md) | **Phase-wise engineering detail** for building the PRD scope: schema DDL, migration order, module layout, constraint decisions, and per-phase DoD. Six documents — `00-foundation-hardening` (the hard prerequisite), `01-phase1-mvp`, `02-phase2-v1-ga`, `03-phase3-v2`, `04-data-model-evolution`, `05-cross-cutting-conventions`. |

## How this was produced

- Static: full tree walk of `backend/src` (230 TypeScript files), `frontend/src`
  (122 JSX files across pages and components), `backend/prisma/schema.prisma`
  (1,071 lines, 41 models), all 23 migrations, all 49 backend spec files, all 31
  Playwright specs, and all 185 markdown documents across the five doc roots.
- Dynamic: backend Jest suite executed (49 suites / 602 tests, green, 140s);
  frontend Jest executed (1 suite / 4 tests); frontend ESLint executed; live
  PostgreSQL index and row-count inspection; live GraphQL probes against
  `http://localhost:4000/graphql` including an authenticated cross-tenant read
  performed with a freshly self-registered account.

## Headline conclusion

The backend is genuinely well-built at the level of individual resolvers: the
guard chain is correct and fail-closed, the tenant-scoping *pattern* is right,
DTO validation is real, secrets are encrypted with AES-256-GCM, and the domain
modules match the frontend contract. The problems are all at the **seams**:

1. A public self-registration path mints accounts with `client_org_id: null`,
   and roughly a dozen queries interpret "no org" as "see everything". This is
   live-reproducible today (see `03`).
2. The database has **zero declared indexes** across 41 models. It works at
   4 appointments; it will not work at 4,000.
3. The frontend still ships a client-side authentication bypass (`mock_` tokens
   plus a forgeable cached user object) and 14 routed pages of fabricated data.
4. The RBAC permission matrix — the headline of the competitive-gap requirement
   — stores permissions that nothing ever reads.
5. There is no CI, so the hard rule "verify before you commit" is unenforceable.

None of these are hard to fix. All five are cheap relative to their blast
radius, and all five block a real pilot. `06-execution-plan.md` sequences them
first, before any new feature work.
