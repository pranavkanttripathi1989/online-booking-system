# Phase 4/5 Increment 3 — Languages, EmailTemplates, Clinicians, Services — Test Suggestions

**Found via:** Building and live-testing this increment, 2026-08-17.

---

## 🟡 Medium Priority

### SUG-P45-001 — `manager/products/*` and `manager/services/index.jsx` remain unimplemented (deliberate scope cut, see implementation plan)
**Status:** ⏳ PENDING
**Issue:** This increment only built the canonical `service`/`services`/`createService`/`updateService` contract (3 dedicated pages). `manager/products/create.jsx`/`edit.jsx` (`product`/`createProduct`/`updateProduct`, physical-inventory shape) and `manager/services/index.jsx` (`getProducts`/`getProductCategories`, the richest shape — `sku`, `product_type`, `cancellation_rules`, `variations`) are both still unbacked.
**Recommendation:** Since these are different operation names (not a naming collision like `rooms/index.jsx`), both could be added as additional resolvers on the same `Products` table without conflicting with what's built now. Worth its own increment — `manager/services/index.jsx`'s shape in particular is the most schema-complete of the three and probably deserves to become the long-term canonical one, with the simpler `service`/`createService` contract this increment built kept as a compatibility layer for the 3 pages that already depend on it.

### SUG-P45-002 — Clinicians can only be assigned to one clinic, but the UI offers a multi-select
**Status:** ⏳ PENDING (documented deliberate scope cut, not a bug)
**Issue:** `CreateClinicianPage.jsx`'s "Clinics" field is a multi-select (`clinic_ids: string[]`), but `Clinicians.clinic_id` is a singular FK in the schema — only the first selected clinic is actually used; any additional selections are silently dropped.
**Recommendation:** Either add a `ClinicianClinics` join table (mirroring the new `ClinicianServices` one built this increment) for genuine multi-clinic support, or simplify the frontend's Clinics field to a single-select to match reality. The current silent-drop behavior should not ship to a real user without one or the other — a manager selecting 2 clinics and having the second silently ignored is a real, confusing gap.

### SUG-P45-003 — `manager/services/create.jsx`'s Category field is collected but never submitted
**Status:** ⏳ PENDING (pre-existing frontend bug, not introduced this increment, just newly visible now that the backend exists to notice it against)
**Issue:** The create form has a `category` field in local state with a UI control, but `onSubmit`'s mutation variables never include it — confirmed by reading the actual submit handler, not assumed. `Products.category_id` exists and works server-side (the resolver would happily accept it); the frontend just never sends it.
**Recommendation:** Add `category_id` to `ServiceInput`'s actual submission once the category picker is wired to real category data (currently there's no `ProductCategories` resolver either — bundle with SUG-P45-001).

## 🟢 Low Priority

### SUG-P45-004 — Consultation fee displays with a £ symbol, not ₹
**Status:** ⏳ PENDING
**Issue:** `/clinicians`'s clinician card shows "£800.00 per consultation" — a hardcoded currency symbol in the frontend, unrelated to this increment's backend work (the backend correctly stores/returns the numeric rupee value; the frontend just formats it with the wrong symbol). Consistent with other pre-existing UK-centric leftovers found earlier this session (Clinics' `Europe/London` timezone default).
**Recommendation:** Low-cost, high-visibility fix for the India-market positioning — grep the frontend for hardcoded `£`/`$` currency symbols and replace with `₹`, ideally via a shared currency-formatting utility rather than per-component literals.
