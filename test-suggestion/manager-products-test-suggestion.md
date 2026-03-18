# Manager Products — Test Suggestions

**Derived from:** [manager-products-test-results.md](../test-result/manager-products-test-results.md)  
**Source Files:** `frontend/src/pages/manager/products/` (index, create, edit)  
**Date:** 2026-03-17

---

## 🔴 High Priority — Critical Gaps

### SUG-PRD-001 — Add Mock Data for Offline Testing

**Problem:** Products module has **no mock data fallback**. All CRUD TCs (03, 04, 07–10, 14, 16–18, 21–23, 26–28, 32–38, 40–43) cannot be browser-tested without a live backend.

**Fix — Add mock fallback in `index.jsx`:**
```js
// After loadData catch block, or replace with:
const loadData = async () => {
  setLoading(true)
  try {
    const { data } = await client.query({ query: GET_PRODUCTS_DATA, fetchPolicy: 'network-only' })
    setProducts(data?.products || MOCK_PRODUCTS)
    setCategories(data?.productCategories || MOCK_CATEGORIES)
    setSubcategories(data?.productSubcategories || MOCK_SUBCATEGORIES)
  } catch (err) {
    // Fallback to mock on network error
    setProducts(MOCK_PRODUCTS)
    setCategories(MOCK_CATEGORIES)
    setSubcategories(MOCK_SUBCATEGORIES)
    setFormError('Backend offline — showing mock data.')
  }
  finally { setLoading(false) }
}
```

**Mock data to add:**
```js
const MOCK_PRODUCTS = [
  { id: 'p1', name: 'Glucometer Kit', sku: 'GLC-001', product_type: 'simple', price: 35.00,
    description: 'Blood glucose monitoring device for home use.', is_active: true,
    category: { id: 'c1', name: 'Diagnostics' }, subcategory: null, category_id: 'c1' },
  { id: 'p2', name: 'Blood Test Panel', sku: 'BTP-002', product_type: 'service', price: null,
    description: 'Comprehensive blood work panel.', is_active: true,
    category: { id: 'c1', name: 'Diagnostics' }, subcategory: { id: 's1', name: 'Blood Tests' }, category_id: 'c1' },
  { id: 'p3', name: 'PPE Bundle', sku: 'PPE-003', product_type: 'variable', price: null,
    description: 'Personal protective equipment bundle with size variations.', is_active: false,
    category: null, subcategory: null, category_id: null },
]
const MOCK_CATEGORIES = [
  { id: 'c1', name: 'Diagnostics', description: 'Diagnostic tools and lab tests', is_active: true },
  { id: 'c2', name: 'Pharmacy', description: 'Pharmaceutical products', is_active: true },
]
const MOCK_SUBCATEGORIES = [
  { id: 's1', category_id: 'c1', name: 'Blood Tests', description: 'Haematology tests', is_active: true },
  { id: 's2', category_id: 'c1', name: 'Imaging', description: 'Radiology services', is_active: true },
  { id: 's3', category_id: 'c2', name: 'OTC Drugs', description: 'Over the counter', is_active: true },
]
```
**Priority:** 🔴 High | **Enables:** 27 skipped TCs

---

### SUG-PRD-002 — Fix: `subcategory_id` Stale on Category Change (E4)

**Problem:** When a user selects Category A → Subcategory A1, then changes to Category B, `pForm.subcategory_id` still holds the old value (A1's ID). When submitted, a mismatched category/subcategory would be sent.

**Fix:** Add a `useEffect` or inline reset:
```js
// In the Category Select onChange:
onChange={e => {
  setFieldP('category_id', e.target.value)
  setFieldP('subcategory_id', '')  // reset subcategory when category changes
}}
```
Or via `useEffect`:
```js
useEffect(() => {
  setFieldP('subcategory_id', '')
}, [pForm.category_id])
```
**Priority:** 🔴 High (data integrity bug) | **Effort:** 2 lines

---

## 🟡 Medium Priority — Feature Gaps

### SUG-PRD-003 — Add Frontend Validation for Negative Price/Stock (E2, E3)

**Problem:** Price and Stock Qty fields allow negative values (`type="number"` with no `min`).

**Fix — Create page (`create.jsx` line 54):**
```jsx
<TextField
  type="number"
  label="Price"
  inputProps={{ min: 0, step: 0.01 }}
  value={form.price}
  onChange={set('price')}
/>

<TextField
  type="number"
  label="Stock Qty"
  inputProps={{ min: 0 }}
  value={form.stock_quantity}
  onChange={set('stock_quantity')}
/>
```
Apply same `inputProps` in `edit.jsx` and the inline form in `index.jsx`.
**Priority:** 🟡 Medium | **Effort:** 4 lines

---

### SUG-PRD-004 — Handle Invalid Product ID on Edit Page (E11 — 404 Guard)

**Problem:** Navigating to `/manager/products/invalid-id` causes skeleton to loop indefinitely because `data.product = null` → `setForm()` never runs → `fetching || !form` remains true forever.

**Fix — in `edit.jsx` after `useEffect`:**
```js
// After existing useEffect:
useEffect(() => {
  if (!fetching && data && !data.product) {
    enqueueSnackbar('Product not found', { variant: 'warning' })
    navigate('/manager/products')
  }
}, [data, fetching])
```
**Priority:** 🟡 Medium | **Effort:** 4 lines

---

### SUG-PRD-005 — Add "Not Found" Handling for Edit Page (skeleton loop for offline IDs)

Same fix as SUG-PRD-004 also applies when backend is simply offline. Consider a timeout fallback:
```js
useEffect(() => {
  const timer = setTimeout(() => {
    if (!form) {
      enqueueSnackbar('Unable to load product data. Check connection.', { variant: 'error' })
      navigate('/manager/products')
    }
  }, 5000) // 5 second timeout
  return () => clearTimeout(timer)
}, [form])
```
**Priority:** 🟡 Medium

---

### SUG-PRD-006 — Wire Index "Add Product" to Inline Form or Clarify Architecture

**Observation (OBS-2):** The inline product form in `index.jsx` supports creating new products (`editProduct === null` case) but is never triggered for creation — the "Add Product" button navigates to `/new`. There are effectively two product creation mechanisms.

**Options:**
- A) Remove the dead inline "create" path from `index.jsx` (since `/new` handles it)
- B) Add a toggle button that opens the inline form for "quick add" from the index
- C) Document the dual paths clearly

**Priority:** 🟡 Medium (code clarity)

---

## 🟢 Low Priority — UX Improvements

### SUG-PRD-007 — Add Search/Filter on Products Tab

**Problem:** With many products, there's no search or filter by name/SKU/category/type. This should be added before the backend is wired.

**Enhancement:**
```jsx
<Stack direction="row" gap={2} mb={2}>
  <TextField size="small" placeholder="Search by name or SKU..." value={search} onChange={e => setSearch(e.target.value)} />
  <Select size="small" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
    <MenuItem value="">All Types</MenuItem>
    <MenuItem value="simple">Simple</MenuItem>
    <MenuItem value="variable">Variable</MenuItem>
    <MenuItem value="service">Service</MenuItem>
  </Select>
</Stack>
```
**Priority:** 🟢 Low

---

### SUG-PRD-008 — Success Alert Auto-dismiss Consistency

`showSuccess` (line 98) uses `setTimeout(3000)`. Good — consistent with Blocks module. No change needed.  
**Status:** ✅ Already good

---

### SUG-PRD-009 — Add Product Count to Tab Labels

```jsx
<Tab label={`Products (${products.length})`} />
<Tab label={`Categories (${categories.length})`} />
```
Provides quick at-a-glance count without needing to scroll through cards.  
**Priority:** 🟢 Low

---

### SUG-PRD-010 — Category Cards: Show Product Count

On each category card, show how many products belong to it:
```jsx
const productCount = products.filter(p => p.category_id === cat.id).length
<Typography variant="caption" color="text.secondary">{productCount} product{productCount !== 1 ? 's' : ''}</Typography>
```
**Priority:** 🟢 Low

---

## Test Plan Gaps & Corrections

### SUG-PRD-PLAN-001 — CORRECT TCs 39–43: Inline Form Is Edit-Only

> **Current (incorrect) assumption:** TCs 39–43 assume the inline product form can be opened for creating a new product from the index page.

> **Correction:** The "Add Product" button on the index page navigates to `/manager/products/new` (line 210). The inline form (`showPForm`) in `index.jsx` is only exposed to edit existing products via the edit icon on product cards.

> **Updated TC-39:** "Open edit mode on an existing product card. Change Product Type to 'Variable'. Assert: 'Product Variations' section hidden (line 270: `!editProduct` is `false` in edit mode). Confirm variations block NOT rendered for existing product edits."

> **Updated TC-40–43 scope:** Add a separate product creation path to test the variations section — either via the inline form exposed as "new product" or test via the `/manager/products/new` create page if variations are added there.

### SUG-PRD-PLAN-002 — Add TC: Product Card Hover Elevation

> **TC-MGR-PRD-03B** — Product Card Hover Shadow  
> With mock data: hover over a product card. Assert: `box-shadow` increases (source line 311: `'&:hover': { boxShadow: 4 }`).

### SUG-PRD-PLAN-003 — Add TC: Delete Cancel on Subcategory Chip

> **TC-MGR-PRD-23B** — Subcategory Delete Cancel  
> Click chip delete icon. ConfirmDialog opens. Click Cancel. Assert: dialog closes, chip remains, no mutation fires.

### SUG-PRD-PLAN-004 — Add TC: Subcategory Dropdown Disabled Without Category

> **TC-MGR-PRD-05B** — Subcategory Disabled State  
> In inline product form (when accessible), before selecting a category: assert Subcategory dropdown is `disabled`. Select a category: assert Subcategory becomes enabled and populates with filtered options.

### SUG-PRD-PLAN-005 — Add TC: Category Filters Subcategories in Inline Form

> **TC-MGR-PRD-05C** — Category → Subcategory Filtering  
> Select Category "Diagnostics" → Subcategory should only show "Blood Tests", "Imaging" (not "OTC Drugs" from Pharmacy). Change to "Pharmacy" → only "OTC Drugs" visible.

### SUG-PRD-PLAN-006 — Add TC: Error Banner on Network Failure

> **TC-MGR-PRD-01B** — loadData Network Error Banner  
> With backend offline: page shows a red error alert banner (E6). Assert: banner text = "Failed to fetch". Assert: `onClose` (x button) dismisses banner.

---

## Summary Table

| ID | Suggestion | Category | Priority | Effort |
|----|-----------|----------|----------|--------|
| SUG-PRD-001 | Add mock data for offline testing | 🧪 Test Infra | 🔴 High | Medium |
| SUG-PRD-002 | Fix subcategory_id stale on category change | 🐛 Bug Fix | 🔴 High | 2 lines |
| SUG-PRD-003 | Frontend min=0 validation for Price/Stock | 🛡 Validation | 🟡 Medium | 4 lines |
| SUG-PRD-004 | 404 redirect for invalid product ID on edit | 🛡 Safety | 🟡 Medium | 4 lines |
| SUG-PRD-005 | Timeout fallback for offline edit skeleton | 🛡 Safety | 🟡 Medium | Low |
| SUG-PRD-006 | Clarify inline form vs. /new page architecture | 🏗 Architecture | 🟡 Medium | Low |
| SUG-PRD-007 | Search/filter on products tab | ✨ UX | 🟢 Low | Medium |
| SUG-PRD-008 | Already handled — auto-dismiss | ✅ N/A | — | — |
| SUG-PRD-009 | Show product/category count in tab labels | ✨ UX | 🟢 Low | 2 lines |
| SUG-PRD-010 | Show product count on category cards | ✨ UX | 🟢 Low | 3 lines |

### Quick Wins (< 5 min):
- **SUG-PRD-002**: 2-line fix — reset `subcategory_id` on category change (data integrity)
- **SUG-PRD-003**: Add `inputProps={{ min: 0 }}` to Price and Stock Qty fields
