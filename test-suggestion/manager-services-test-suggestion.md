# Manager Services — Test Suggestions

**Derived from:** [manager-services-test-results.md](../test-result/manager-services-test-results.md)  
**Source Files:** `frontend/src/pages/manager/services/` (index, create, detail, edit)  
**Date:** 2026-03-17

---

## 🔴 High Priority — Bug Fixes

### SUG-SVC-001 — Wire Delete Button Handler with ConfirmDialog (BUG-SVC-001)

**Problem:** The delete icon on product cards (line 398) has **no `onClick` handler**. Clicking it does nothing. Deletion is completely non-functional.

**Fix — in `index.jsx`:**

1. Add a `DELETE_PRODUCT` mutation:
```js
const DELETE_PRODUCT = gql`
  mutation DeleteProduct($id: ID!) {
    deleteProduct(id: $id) { success userErrors { message } }
  }
`;
```

2. Add confirmation state:
```js
const [deleteTarget, setDeleteTarget] = useState(null);
const [confirmOpen, setConfirmOpen] = useState(false);
const [deleteProduct] = useMutation(DELETE_PRODUCT);
```

3. Wire the icon button:
```jsx
<IconButton
  size="small"
  color="error"
  sx={{ bgcolor: 'error.lighter' }}
  onClick={() => { setDeleteTarget(product); setConfirmOpen(true); }}
>
  <Delete fontSize="small" />
</IconButton>
```

4. Add `<ConfirmDialog>` (already used in other modules):
```jsx
<ConfirmDialog
  isOpen={confirmOpen}
  title="Delete Service"
  message={`Delete "${deleteTarget?.name}" permanently? This cannot be undone.`}
  onConfirm={async () => {
    try {
      await deleteProduct({ variables: { id: deleteTarget.id } });
      refetch();
    } catch (err) { console.error(err); }
    setConfirmOpen(false);
    setDeleteTarget(null);
  }}
  onCancel={() => { setConfirmOpen(false); setDeleteTarget(null); }}
/>
```

**Priority:** 🔴 High | **Effort:** ~30 lines

---

### SUG-SVC-002 — Fix Index Page: Add Mock Data Fallback for Offline State (BUG-SVC-002)

**Problem:** When backend is offline, the entire catalog UI (sidebar + grid) is replaced by a red error Alert (line 247). Users see nothing useful. Unlike other modules, Services index has **no mock fallback**.

**Current code (line 247):**
```jsx
if (error) return <Box p={2}><Alert severity="error">{error.message}</Alert></Box>;
```

**Fix — Keep layout, show banner + mock data instead:**
```js
// Mock data constants (top of file)
const MOCK_CATEGORIES = [
  { id: 'c1', name: 'General', products: [{ id: 'p1' }, { id: 'p2' }], subcategories: [] },
  { id: 'c2', name: 'Cardiology', products: [], subcategories: [
    { id: 's1', name: 'Echocardiography' }
  ]},
]
const MOCK_PRODUCTS = [
  { id: 'p1', name: 'General Consultation', description: 'Standard clinical consultation.', price: 85, sku: 'GEN-001', is_active: true, product_type: 'simple', cancellation_rules: [], variations: [] },
  { id: 'p2', name: 'Extended Consultation', description: 'Longer consultation for complex cases.', price: 150, sku: 'GEN-002', is_active: true, product_type: 'simple', cancellation_rules: [], variations: [] },
  { id: 'p3', name: 'Physiotherapy Session', description: null, price: 60, sku: null, is_active: false, product_type: 'variable', cancellation_rules: [], variations: [] },
]
```

```jsx
// Replace the hard error return:
const categories = useMemo(() => data?.getProductCategories || (error ? MOCK_CATEGORIES : []), [data, error]);
let products = useMemo(() => data?.getProducts || (error ? MOCK_PRODUCTS : []), [data, error]);

// In JSX, show soft warning banner instead of full-page error:
{error && (
  <Alert severity="warning" sx={{ mb: 2 }} onClose={() => {}}>
    Backend offline — showing demo data. {error.message}
  </Alert>
)}
```

Remove the hard `if (error) return <Alert>` early return.

**Priority:** 🔴 High | **Enables:** All 15 product/category TCs to be browser-testable

---

### SUG-SVC-003 — Fix Edit Page Navigation Trap: Keep Header in Skeleton State (BUG-SVC-003)

**Problem:** `if (fetching || !form) return <Box><Skeleton /><Skeleton /></Box>` replaces the **entire render** — user has no Cancel/Back button while data is loading. Same as BUG-RM-002.

**Fix — in `edit.jsx` line 34:**
```jsx
if (fetching || !form) return (
  <Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
      <IconButton onClick={() => navigate('/manager/services')} sx={{ bgcolor: '#F1F3F4' }}>
        <ArrowBackRoundedIcon />
      </IconButton>
      <Typography variant="h5" fontWeight={800}>Loading Service…</Typography>
      <Box flex={1} />
      <Button variant="outlined" onClick={() => navigate('/manager/services')}
        sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>
        Cancel
      </Button>
    </Box>
    <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, mb: 3 }} />
    <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 3 }} />
  </Box>
)
```

**Priority:** 🔴 High | **Effort:** 12 lines

---

## 🟡 Medium Priority — Feature & Validation Gaps

### SUG-SVC-004 — Add Frontend Validation: Negative Duration and Price (E11, E12)

**Problem:** Duration and Price fields allow negative values — no `min` attribute.

**Fix in `create.jsx` and `edit.jsx`:**
```jsx
<TextField
  label="Duration (minutes)"
  type="number"
  inputProps={{ min: 1, max: 480 }}  // 1 min to 8 hours
  ...
/>
<TextField
  label="Price"
  type="number"
  inputProps={{ min: 0, step: 0.01 }}
  ...
/>
```
**Priority:** 🟡 Medium | **Effort:** 4 lines per file

---

### SUG-SVC-005 — "Add Category" Button: Implement or Remove

**Problem:** Line 312 renders "Add Category" with no handler. It appears clickable but does nothing.

**Options:**
- A) Wire it to open a simple dialog for category creation
- B) Show a tooltip: `<Tooltip title="Coming soon">...</Tooltip>`
- C) Disable with `disabled` prop and add `cursor: 'not-allowed'`

**Priority:** 🟡 Medium

---

### SUG-SVC-006 — Inline Delete of Cancellation Rules (Dialog Tab 2)

**Problem:** The rule list (lines 522–532) renders delete icons for each rule, but those icons also have **no `onClick` handler** — same pattern as the product delete button.

```jsx
// Line 528 — no onClick:
<IconButton size="small" color="error"><Delete fontSize="small" /></IconButton>
```

**Fix:**
```jsx
<IconButton size="small" color="error"
  onClick={async () => {
    // Call DELETE_RULE mutation or remove from local state
    setEditProduct(prev => ({
      ...prev,
      cancellation_rules: prev.cancellation_rules.filter(r => r.id !== rule.id)
    }));
  }}>
  <Delete fontSize="small" />
</IconButton>
```

**Priority:** 🟡 Medium

---

### SUG-SVC-007 — Correct Test Plan E8: Price=null Renders £0.00, Not £NaN

**Problem:** Test plan E8 states: `"parseFloat(null) = NaN → rendered as £NaN; Enhancement needed"`. This is **incorrect**.

**Reality:** Source line 389: `£{parseFloat(product.price || 0).toFixed(2)}`. The `|| 0` guard means:
- `null → null || 0 → 0 → £0.00` ✅
- `undefined → undefined || 0 → 0 → £0.00` ✅

**Correct E8 description:** "Product with no price shows `£0.00`. Enhancement: show `—` or 'Price on request' instead of `£0.00` for variable products."

**Priority:** 🟡 Medium (test plan correction)

---

## 🟢 Low Priority — UX Improvements

### SUG-SVC-008 — Add Clear Button to Search Field

When search returns 0 results, a "Clear" button would help:
```jsx
InputProps={{
  endAdornment: searchQuery ? (
    <InputAdornment position="end">
      <IconButton size="small" onClick={() => setSearchQuery('')}>
        <Close fontSize="small" />
      </IconButton>
    </InputAdornment>
  ) : null
}}
```
**Priority:** 🟢 Low

---

### SUG-SVC-009 — Show Product Count in Category Sidebar

The "All Services" item has no count badge. Add one:
```jsx
<ListItemText primary={<Typography>All Services</Typography>} />
<Badge badgeContent={products.length} sx={{ /* same style as categories */ }} />
```
**Priority:** 🟢 Low

---

### SUG-SVC-010 — Error Handling in `toggleActive` — Silent Failure

**Problem:** Line 173: `catch(err) { console.error(err) }` — errors from TOGGLE_PRODUCT are silently swallowed. User gets no feedback if toggle fails.

**Fix:**
```js
catch(err) {
  console.error(err);
  enqueueSnackbar('Failed to update status: ' + err.message, { variant: 'error' });
}
```
Requires adding `useSnackbar` to the index.jsx component.
**Priority:** 🟢 Low

---

### SUG-SVC-011 — Error Handling in `handleSaveProduct` — Native Alert

**Problem:** Line 207: `alert("Error saving service.")` — uses native `window.alert()` which is jarring and unstyled.

**Fix:**
```js
// Replace native alert with MUI Alert or snackbar:
catch(err) {
  console.error(err);
  // if using snackbar:
  enqueueSnackbar('Error saving service: ' + err.message, { variant: 'error' });
}
```
**Priority:** 🟢 Low

---

## Test Plan Gaps & Additional Scenarios

### SUG-SVC-PLAN-001 — Correct E8 (Price Null → £0.00 not £NaN)
> See SUG-SVC-007. Update E8 to reflect correct behavior.

### SUG-SVC-PLAN-002 — Add TC: Product Type Chip Colors

> **TC-MGR-SVC-07B** — Product type chip color  
> Simple product: `Chip color="info"` → blue. Variable product: `Chip color="secondary"` → purple/magenta. Verify colors visually when products exist.

### SUG-SVC-PLAN-003 — Add TC: Card Hover Animation

> **TC-MGR-SVC-07C** — Card hover lift  
> Hover over product card. Assert: `transform: translateY(-4px)`, `boxShadow`, `borderColor: #006D77`. Transition 0.2s ease.

### SUG-SVC-PLAN-004 — Add TC: Rule Dialog Defaults

> **TC-MGR-SVC-40B** — Verify rule dialog initial state  
> Open "Add Rule" dialog. Assert: Rule Type = "Cancellation" (radio default). Fee Structure = "Percentage" (radio default). Both text fields empty.

### SUG-SVC-PLAN-005 — Add TC: "Add Category" Button No-Op

> **TC-MGR-SVC-06B** — Test Add Category button click  
> Click "Add Category" dashed button. Assert: Nothing happens (no dialog, no navigation). Document as known incomplete feature.

### SUG-SVC-PLAN-006 — Add TC: Toggle Active from Active → Inactive → Active

> **TC-MGR-SVC-12B** — Toggle immediate feedback  
> Click active switch on card. Assert: mutation fires with `{ id, isActive: false }`. Assert: after `refetch()`, card switch reflects new state. Repeat backwards.

### SUG-SVC-PLAN-007 — Add TC: Search Clears When Query Removed

> **TC-MGR-SVC-09B** — Search clear  
> Type "cons" → products filter. Clear the search field. Assert: all products reappear (no API call — filtering is client-side via `useMemo`).

---

## Summary Table

| ID | Suggestion | Category | Priority | Effort |
|----|-----------|----------|----------|--------|
| SUG-SVC-001 | Wire delete button handler + ConfirmDialog | 🐛 Bug Fix | 🔴 High | ~30 lines |
| SUG-SVC-002 | Add mock data fallback to index (offline) | 🐛 Bug Fix + 🧪 Test Infra | 🔴 High | Medium |
| SUG-SVC-003 | Fix edit skeleton navigation trap | 🐛 Bug Fix | 🔴 High | 12 lines |
| SUG-SVC-004 | Negative duration/price validation | 🛡 Validation | 🟡 Medium | 4 lines |
| SUG-SVC-005 | Add Category button: implement or disable | ✨ UX | 🟡 Medium | Low |
| SUG-SVC-006 | Wire rule delete icons in dialog | 🐛 Bug Fix | 🟡 Medium | 10 lines |
| SUG-SVC-007 | Correct test plan E8 (£NaN false) | 📝 Doc Fix | 🟡 Medium | — |
| SUG-SVC-008 | Clear button on search | ✨ UX | 🟢 Low | 5 lines |
| SUG-SVC-009 | Product count badge for "All Services" | ✨ UX | 🟢 Low | 3 lines |
| SUG-SVC-010 | Silent error on toggle → show snackbar | 🛡 Error Handling | 🟢 Low | 3 lines |
| SUG-SVC-011 | Replace native `alert()` with snackbar | ✨ UX | 🟢 Low | 3 lines |

### Quick Wins (< 5 min):
- **SUG-SVC-004**: Add `inputProps={{ min: 0 }}` to Duration and Price fields
- **SUG-SVC-010**: Add `enqueueSnackbar` in toggleActive catch block (3 lines)
- **SUG-SVC-011**: Replace `alert("Error saving service.")` with snackbar (1 line)
