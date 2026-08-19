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

## 2. Products/ProductCategories/ProductSubcategories create paths never populate `clinic_id`, making the existing tenant-scoping filter inert

**Status:** Open — found while writing `products` module unit tests (Priority 1), not fixed. Logged rather than
patched because the correct fix depends on a product/contract decision, not a straightforward bug.

`backend/src/products/products.service.ts`'s `create()`/`createCategory()`/`createSubcategory()` never set
`clinic_id` on the row they insert — `CreateProductInput`/`CreateProductCategoryInput`/
`CreateProductSubcategoryInput` (`dto/product.input.ts`) don't even have a `clinic_id` field, matching
`manager/products/{create,edit}.jsx`'s real submitted fields exactly (per the DTO's own comment) — the frontend
never sends one either. So every product/category/subcategory created through the live UI ends up with
`clinic_id: null`.

`findAll()`/`categories()`/`subcategories()` scope by `clinic: user.client_org_id ? {client_org_id: user.client_org_id} : undefined`
— a relation filter requiring an attached clinic. A `clinic_id: null` row has no `clinic` relation, so it fails
this filter for every org-scoped caller and becomes invisible in list views to the very org that "created" it.
`findOne()`'s tenant check is `if (user.client_org_id && row.clinic && row.clinic.client_org_id !== user.client_org_id) throw NotFound`
— when `row.clinic` is null (no clinic attached), the check short-circuits to false and is skipped entirely, so
**any authenticated user, from any org, can read a clinic-less product directly via `product(id)`** once they
know or guess its id. `update()`/`remove()` call `findOne()` first, so they inherit the same gap.

Why this isn't the same bug pattern as the already-fixed `createAvailability`/`createSpacerBlock`/`createClinician`
cross-org creates (CLAUDE.md's Hard Rule 6 note): those took a caller-supplied `clinic_id` and simply never
validated it against the caller's org — a classic IDOR with an obvious fix (validate the supplied id). Here
there is no caller-supplied `clinic_id` to validate — the field doesn't exist on the DTO at all, so the fix
isn't "add a check," it's "decide how Products should be tenant-scoped in the first place": either (a) add
`clinic_id` to the create DTOs and require the frontend to supply/select one (a UI change, since none of
`manager/products/{index,create,edit}.jsx` currently expose clinic selection), or (b) give `Products`/
`ProductCategories`/`ProductSubcategories` their own direct `client_org_id` column and stamp it from the JWT at
create time the way `Clinics`/`Availability` etc. do, decoupled from any specific clinic. Both are real schema/
frontend-contract changes, not something to guess at inside a test-writing pass.

**Left as-is for now:** `products.service.spec.ts` tests the module's actual current behavior, including this
gap (a clinic-less product is readable cross-org via `findOne`), rather than an assumed "should" behavior.

**Decision needed from the user:** which of the two fixes above (org-column-on-Products vs. clinic-selection-in-UI),
or confirm this is acceptable as-is if Products are meant to be catalog-wide rather than clinic/tenant-scoped
(in which case the existing `clinic`-relation filters in `findAll`/`categories`/`subcategories` are themselves
the bug — they should either be removed or replaced with a real org column, since half-scoping is worse than none).

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
