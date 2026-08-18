# Open Questions

Unresolved ambiguities logged per CLAUDE.md Hard Rule 10. Each entry: the question, why it's genuinely ambiguous (not just unimplemented), and current status.

## 1. manager/Dashboard.jsx "Recent Transactions" table has no backing data model

**Status:** Open — backend NOT built for this piece; everything else on the page now is (see below).

`manager/Dashboard.jsx`'s `getTransactionsByDate(startDate, endDate, limit, offset)` query expects a list of
per-appointment *patient payment* records — `{id, createdAt, amount, status: succeeded|pending|failed, appointment{clinician{name}, patient{firstName,lastName}, product{name}}}`.

No model in `schema.prisma` backs this. The only payment-shaped model is `PaymentTransactions`, which is explicitly
scoped to `ClientOrganizations` (tenant **SaaS-subscription** billing via Stripe — see CLAUDE.md's India-vendor
rules) and has no relation to `Appointments`/`Patients` at all. Patient-facing payments (Razorpay, per
CLAUDE.md's vendor rules) have no schema, no order/payment-intent tracking, no webhook handling — this is the
not-yet-built Finances/Billing domain (CLAUDE.md Priority 2).

Why this stopped me rather than being a normal "write the resolver" task: building a plausible-looking
`AppointmentPayments`-style table and a resolver against it right now, without real Razorpay sandbox
credentials or a decision on the order/capture/webhook flow, would produce exactly the kind of fabricated,
un-integration-tested "payments" feature the project's Role instructions (production-grade, not prototype)
and Hard Rule 9 (build/test against the real vendor, sandbox credentials) rule out. This needs a deliberate
Finances/Billing slice (schema + Razorpay integration + webhook handling + tests), not a bolt-on to a
dashboard fix.

**Left as-is for now:** the transactions table still reads `data?.getTransactionsByDate` with its existing
mock-array fallback (`manager/Dashboard.jsx`). Per Priority 3 point 3 ("leave the fallback but make it visible
in dev, not silent") this should get a console warning the next time this file is touched, until the real
Finances/Billing domain exists.

**Decision needed from the user:** build the real Finances/Billing/Razorpay domain now as its own dedicated
slice (needs sandbox API keys), or continue deferring it to Priority 2 and leave this one table on mock data
in the meantime.

---

## Resolved

### manager/Dashboard.jsx KPIs, charts, and clinic filter (resolved 2026-08-18)

`getClinics` and `getAppointmentStats` (totals, revenue, active patients, cancellation rate, utilization,
trends, time series, status distribution, revenue-by-clinic, top clinicians) are now real, backed by
`backend/src/analytics/` querying `Appointments`/`Clinicians`/`Products`/`Clinics` directly — no per-appointment
payment ledger needed for these, since "revenue" here is defined as the billable value (`Products.price`) of
`completed` appointments, not captured payments. One assumption worth flagging (not a blocker, just a
documented judgment call): "utilization" is defined as a completion-rate proxy
(`completed / total appointments * 100`), not true slot-capacity utilization (which would require walking
`ClinicianAvailability` windows minus `Blocks`) — see the comment in
`backend/src/analytics/entities/analytics.entity.ts`.
