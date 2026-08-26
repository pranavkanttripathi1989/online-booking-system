---
name: medibook-frontend-rules
description: Apply this repo's FRONTEND_RULES.md — ~190 numbered hard rules for the React/JSX + MUI + Apollo frontend, written for the Indian healthcare market. Use before writing or reviewing ANY frontend code, when adding a page/component/form/route, wiring a mutation, styling anything, or completing a frontend Definition of Done. Carries the JS-not-TypeScript bargain (BASE-3 and its mandatory compensating controls), the rules with live shipped-bug provenance, and the honest compliance state so you don't claim compliance the codebase doesn't have. Triggers on "frontend rule", "FRONTEND_RULES", "BASE-", "PERF-", "UI-", "RES-", "WV-", "NAV-", "BOOK-", "FORM-", "PAY-", "DATA-", "STATE-", "A11Y-", "I18N-", "SEC-", "SURF-", "ARCH-", "CI-", "definition of done", "DoD", "is this frontend code ok", "review this component".
metadata:
  origin: project-specific
  vetted: >-
    Written 2026-08-27 from FRONTEND_RULES.md v2.0 (rewritten the same day for
    the real JS/JSX stack) plus a measured compliance audit of the codebase
    recorded in project-plans/technical-plans/07-frontend-rules-compliance.md.
    Every "shipped once" note below is a real, traced defect from this repo's
    own history, not a hypothetical.
---

# MediBook frontend hard rules

`FRONTEND_RULES.md` (repo root) is authoritative and has ~190 numbered rules.
**Read it for the full text.** This skill carries what you need in-context to
avoid the mistakes this codebase has actually made.

## First: the language bargain (BASE-3)

**This frontend is JavaScript + JSX. 170 `.jsx` files, zero TypeScript. That is
a deliberate, permanent decision — not debt, not a migration in progress.**

Never propose a TypeScript migration. But the decision is only safe because it
comes with **mandatory compensating controls**, and skipping them means the
codebase has no type system at all:

| Control | Rule | State |
|---|---|---|
| Runtime validation at every API boundary, with zod | **ARCH-7** | 🔴 **unpaid** — zod is used for forms only, never for API responses |
| Prop/return contracts on shared code (JSDoc or propTypes) | **BASE-10** | 🔴 **unpaid** |
| ESLint zero errors + a ratchet that only decreases | CI-2 | ✅ working |
| No implicit truthiness where `0`/`''` is valid — compare explicitly | BASE-3(d) | discipline |
| `?.` / `??` by default across boundaries; `a \|\| b` on a number or string is a bug | BASE-3(e) | discipline |

**When you write new frontend code that consumes the API, add the zod boundary
schema.** That is the single highest-value thing this skill can get you to do.

## Rules with live provenance — each one shipped a real bug

Do not re-learn these:

| Rule | What actually happened |
|---|---|
| **ARCH-15** match the existing contract | `redeemPackageSitting` was called with two scalars instead of a wrapped `input`. **The feature was non-functional from the day it shipped.** Also: `appointments/edit.jsx` sent an `end_datetime` that `AppointmentUpdateInput` does not have — *every* "Save Changes" failed, always |
| **SEC-18** FE gate must match BE `@Auth` | **Three shipped instances** of a route gated narrower than its own resolver. Managers hit a 403 before reaching pages their backend allowed |
| **DATA-9** invalidate after mutation | Missing `refetchQueries` shipped repeatedly. The single most common wiring defect in this repo |
| **DATA-13** no mock fallback on empty | `rows.length > 0 ? apiRows : mockRows` rendered **fake patients** whenever a real filter legitimately matched nothing. Live on two pages |
| **FORM-7** validation timing | react-hook-form defaults to `mode: 'onSubmit'`; a step with no submit button had `error`/`helperText` wired to errors that could never populate. **Dead validation UI in a live front-desk form** |
| **A11Y-5** icon buttons need `aria-label` | Three real gaps, each with a `Tooltip` and no label. **A Tooltip is not an accessible name** |
| **A11Y-12** MUI `Select` targeting | Its accessible name concatenates label + selected value once one is set, so `getByLabel(exact)` silently stops matching. Use `data-testid`. A `Select` with no visible `InputLabel` needs `inputProps={{ 'aria-label': ... }}` — a bare `aria-label` prop lands on the wrong DOM node |
| **RES-3** no body h-scroll | Fixed three times. **`document.scrollWidth > clientWidth` provably misses it** — reported clean on two live-confirmed truncations. Use the element-level probe in `technical-plans/06-frontend-architecture-and-mobile.md` §7. Every `<Table>` needs a `<TableContainer>` |
| **STATE-8** error boundaries | A missing import white-screened an entire 7-tab page with no visible error text. Catch with `page.on('pageerror')` in e2e, not by eye |
| **NAV-12** URL-addressable | A pathless layout `<Route element={...}>` silently claimed `/` and made the public landing page unreachable for *everyone*. No test caught it because every e2e spec logs in first |
| **BOOK-9** UTC wire / IST display | A fixed local-clock-hour `Date#setHours()` fixture is timezone-ambiguous on an IST host — an early-morning hour lands on the previous UTC day. Anchor "today" to `Date.now()` minus hours |
| Role vocabulary | **`receptionist` is not a real role — it's `staff`** (`backend/prisma/seed.ts`'s `ROLES`). Reintroduced three times because it reads plausible; caused a wrong sidebar badge, a grey "Unknown" chip, and a missing button. Key new role maps from `seed.ts`, never from an existing frontend map |

## Before you write

1. **Declare the surface tier** — this determines which widths you owe:

   | Tier | Surfaces | Design for | Verify at |
   |---|---|---|---|
   | Mobile-first | patient app, public booking, QR check-in, portal | 360px | 360 / 414 / 768 |
   | Tablet-first | clinician consult, Rx builder, clinician calendar | 1024px | 768 / 1024 / 1280 |
   | Desktop-dense | front desk, billing, admin, reports, pharmacy POS | density | 1280 / 1440 |

   Desktop-dense may scroll at 360px. **It may never truncate data.**

2. **Pin the contract** (`ARCH-15`) — read `src/graphql/{queries,mutations}.js`
   or the page's inline `gql` **verbatim**. Two dialects coexist deliberately
   (canonical snake_case; public camelCase) and **three** mutation-response
   conventions. Match; don't harmonise.

3. **Check the auth gate** — the resolver's `@Auth(...)` list *is* the route's
   allowed roles, and `AppShell.jsx`'s `NAV_CONFIG` must agree.

## Non-negotiables in any review

```
[ ] Tier declared, verified at that tier's widths
[ ] All five states: loading / empty / error / stale / success
[ ] Theme tokens only — no hex literals (UI-2)
[ ] Icon-only buttons have aria-label (A11Y-5)
[ ] <Table> inside <TableContainer> (RES-3)
[ ] Touch targets >= 48px, >= 8px apart (RES-5)
[ ] Mutation invalidates its lists (DATA-9)
[ ] No mock fallback on empty result (DATA-13)
[ ] Contract checked verbatim (ARCH-15)
[ ] Route gate == backend @Auth (SEC-18)
[ ] zod boundary schema for new API consumption (ARCH-7)
[ ] Shared component/hook declares its contract (BASE-10)
[ ] Lint ratchet not increased
```

## Honest compliance state — don't claim what isn't true

Measured 27 Aug 2026. Full audit:
`project-plans/technical-plans/07-frontend-rules-compliance.md`.

| | State |
|---|---|
| **Waived** | BASE-3 (no TypeScript — permanent) |
| **Ratcheted debt** | UI-2 **1,906** hex-literal warnings · UI-14 **68** files >250 lines (largest **1,641**) · DATA-7 pagination migrating · FORM-19 4 zod files untested |
| **Open gaps** | **SEC-2 auth token in `localStorage`** · **ARCH-7 + BASE-10 (the BASE-3 bargain, unpaid)** · **entire §14 i18n — no layer exists** · BOOK-2 no slot hold · BOOK-3 no idempotency key · BOOK-20 no paid-but-unconfirmed recovery state · PERF-1…4 no `size-limit`, largest chunk 441 KB · A11Y-1 no `axe-core` · CI-3,5,6,7,8,10,11,12 unwired · CI-9 e2e not gated |
| **Conditional 🔜** | All `WV-*` except 5, 6, 13, 16, 17 — **no Capacitor shell exists.** Activated by `phase-plans` P3-11 |

**Two framing rules that follow from this table:**

- **New code complies even where old code does not.** The ratchets exist so work
  can continue without the debt growing. Never add to a 🟠 row.
- **Never claim compliance with an unenforced rule.** Most `FRONTEND_RULES`
  rules have no CI gate yet (`phase-plans` P1-03 wires them). "Follows PERF-1"
  is unverifiable today — `size-limit` isn't running.

## Where things live

| Need | Path |
|---|---|
| Full rule text | `FRONTEND_RULES.md` |
| Per-rule compliance audit | `project-plans/technical-plans/07-frontend-rules-compliance.md` |
| Tiering, overflow probe, PWA | `project-plans/technical-plans/06-frontend-architecture-and-mobile.md` |
| FE↔BE contract + shipped-bug table | `project-plans/technical-plans/08-frontend-backend-integration.md` |
| What to build next | `project-plans/phase-plans/README.md` |
| Theme tokens | `frontend/src/theme/` |
| Canonical GraphQL | `frontend/src/graphql/{queries,mutations}.js` |
| Apollo client + timeout | `frontend/src/apollo/client.js` |
| Authenticated PDF download (the one documented `fetch` exception) | `frontend/src/utils/documents.js` |

## Related skills

`medibook-frontend-data-wiring` (is this page real?) ·
`medibook-design-system` (tokens, why branding is inert) ·
`medibook-responsive-mobile` (tiering, the overflow probe) ·
`medibook-graphql-contracts` (the two dialects, three response conventions)
