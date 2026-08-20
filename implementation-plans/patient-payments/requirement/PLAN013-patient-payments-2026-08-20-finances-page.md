---
id: PLAN013
type: requirement
feature: patient-payments
created: 2026-08-20
updated: 2026-08-20
status: done
parent: REQ004
related: [PLAN012]
---

# Implementation plan — `finances/index.jsx` real data (REQ004 slice 2 of 2)

Closes out REQ004, following slice 1 (PLAN012 — real Razorpay capture). `finances/index.jsx` was 100% mock (`TRANSACTIONS`, `CARDS`, `ALL_MONTHLY_REVENUE`), no pre-existing contract to match.

## Three findings that redirected scope, neither guessed at

1. **The whole page formatted money as `$`, not `₹`.** Every other page in this app correctly uses ₹. Fixed throughout (KPI cards, table, chart, drawer).
2. **"Active Balance" / "Bonus Credits" KPI cards mapped to a patient wallet/credit-balance concept REQ004 itself explicitly scoped out** ("depends on memberships existing first, which don't exist yet"). Replaced with 4 KPIs actually computable from real `AppointmentPayments`: Revenue This Month, Pending (count + amount), Succeeded Payments, Failed Payments.
3. **Finances' "revenue" is a different metric than `analytics`' "revenue."** `analytics.service.ts` computes billable value of *completed appointments* — money that should be owed, not money actually collected. Finances' Revenue Chart is specifically real captured Razorpay payments. Built as a distinct query against `AppointmentPayments` (`status: 'succeeded'`), with an explanatory note on the page itself pointing out the distinction rather than silently conflating two different "revenue" numbers.

## Scope

**Built:** Payment History tab (real income transactions only — patient name, product, date, amount, status, method), Revenue Chart tab (real monthly succeeded-payment totals), 4 real KPI cards, CSV export (continues working client-side, no backend change needed), receipt drawer (real transaction detail).

**Explicitly left out, not guessed at:**
- Expense tracking (REQ004 open question #3, still unresolved) — Payment History shows income only; income/expense type filter removed entirely; an info banner explains expenses aren't tracked yet.
- Payment Methods tab (saved cards) — REQ004's own explicit exclusion (PCI-scoped tokenization, a distinct feature). Visibly disabled with an explanatory note (Hard Rule 8 — don't leave a mock fallback looking functional), matching the pattern already used for Communications' SMS card and Policies' cancellation sliders.
- Refunds / `overdue` status — no `refunded` status exists in `AppointmentPayments` (only `pending`/`succeeded`/`failed`); a checkout-time capture has no due-date/"overdue" concept either. Both dropped from the status filter.
- "Refill Balance"/"Add Card" actions — removed along with the wallet/saved-cards cards they belonged to.

## Backend (extends `backend/src/appointment-payments/`, no new module)

- `myFinanceTransactions(startDate, endDate)` — canonical (snake_case) dialect (no pre-existing contract to match, unlike `getTransactionsByDate`'s Dashboard camelCase contract from slice 1). Reuses the same org-scoping pattern. `method` is reported as `"Razorpay"` (the accurate processor name) rather than a fabricated card-brand breakdown Razorpay's basic checkout handler response doesn't provide without an extra API call this slice didn't need.
- `myFinanceSummary(startDate, endDate)` — one query backing both the KPI row and the chart: `revenue_this_month` (current calendar month, succeeded only), `pending_count`/`pending_amount`, `succeeded_count`, `failed_count`, `monthly: [{month, revenue}]` (succeeded payments in the requested range, grouped by month in JS — no raw SQL needed for this data volume).

## Frontend (`frontend/src/pages/finances/index.jsx`)

Full rewrite: mock arrays replaced with the two queries above (page-local `gql`, `useApolloClient`, matching how other now-real pages in this app are wired). Type filter removed (income-only now); status filter changed to `succeeded`/`pending`/`failed`. `InvoiceDrawer` reads the real transaction shape. All `$` → `₹`.

## An unrelated environment issue hit and resolved mid-verification

The 360/768/1280px responsive check hung reproducibly across 6 attempts — traced to Docker Desktop's networking proxy wedging (its daemon itself (`docker ps`) responded, but requests to `localhost:3000`/`:4000` did not), not a Recharts/MUI issue as initially suspected. A full Docker Desktop restart (`quit` + relaunch) resolved it; the responsive check then passed cleanly on the very next attempt with zero code changes. Logged here since it cost significant time to diagnose and future sessions should try a Docker Desktop restart early if `docker ps` succeeds but requests to a mapped port hang.

## Verification

See [TP043](../../../test-plans/patient-payments/requirement/TP043-patient-payments-2026-08-20-finances-page.md) and [TR042](../../../test-results/patient-payments/requirement/TR042-patient-payments-2026-08-20-finances-page.md).
