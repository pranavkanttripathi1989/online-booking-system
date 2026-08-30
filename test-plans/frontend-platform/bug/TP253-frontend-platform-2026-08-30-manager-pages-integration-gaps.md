---
id: TP253
type: bug
feature: frontend-platform
created: 2026-08-30
updated: 2026-08-30
status: done
parent: PLAN233
related: [BUG058, PLAN233, TR253]
---

# TP253 — test plan for BUG058 fixes

1. **`manager/clinics/edit.test.jsx`**
   - Real clinic query result → form fields show the real fetched
     values (`Real Clinic`, `1 Real Street`), never
     `DEFAULT_MOCK_CLINIC`'s placeholder text.
   - `clinic: null` (a real, successful "no such clinic" GraphQL
     result) → the "Clinic not found" state renders; `Unknown Clinic`
     never appears anywhere on the page.
2. **`manager/products/edit.test.jsx`**
   - Real product query result → form fields show the real fetched
     values (`Real Product`, `REAL-1`), never `DEFAULT_MOCK_PRODUCT`'s
     placeholder text.
   - `product: null` → the "Product not found" state renders;
     `Unknown Product` never appears anywhere on the page.
3. **Regression**: full `frontend/src/pages/manager` Jest suite
   (existing coverage for `Availability.jsx`/`Blocks.jsx`'s siblings
   and all other manager pages) must stay green.
4. **Static**: `eslint` on the 4 touched files (0 errors); `npm run
   build` succeeds.
