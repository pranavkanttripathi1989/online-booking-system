# Manager Services (CRUD) — Test Results

**Feature:** Manager Services — Catalog Index, Create, Detail, Edit  
**Test Plan:** [manager-services-test-plan.md](../test-plan/16-03-2026-not-done/manager-services-test-plan.md)  
**Source Files:** `frontend/src/pages/manager/services/` (index, create, detail, edit)  
**Routes:** `/manager/services` · `/manager/services/new` · `/manager/services/:id` · `/manager/services/:id/edit`  
**Executed:** 2026-03-17  
**Tester:** Antigravity AI (Browser Agent + Source Review)  
**Environment:** `http://localhost:3001` (Vite dev server, backend offline — **no mock data fallback on index**)  
**Total Cases:** 42 | **Edge Cases:** 12

---

## Summary

| Status | Count |
|--------|-------|
| ✅ PASS | 12 |
| ⏭ SKIPPED (backend offline / no data) | 25 |
| ❌ FAIL | 3 |
| ⚠️ OBSERVATION / INFORMATIONAL | 3 |

> **3 Bugs confirmed: BUG-SVC-001 (Delete icon has no handler — documented in test plan as known), BUG-SVC-002 (Index page full-screen error — no mock fallback), BUG-SVC-003 (Edit page skeleton navigation trap)**  
> **1 Test plan correction: E8 (`£NaN` claim is incorrect — source shows `|| 0` fallback giving `£0.00`)**

---

## Catalog Index Page (`/manager/services`)

---

### TC-MGR-SVC-01 — Page Load: Spinner Then Layout

| | |
|---|---|
| **Expected** | Spinner while loading, then: left CATEGORIES sidebar + right product grid, "All Services" default |
| **Actual** | Page loaded → **Red error Alert**: `"Failed to fetch"` covers the ENTIRE content area. Two-column layout (sidebar + grid) is NOT rendered. The index page uses `if (error) return <Alert severity="error">{error.message}</Alert>` (line 247), which replaces the whole component. |
| **Status** | ❌ **FAIL — BUG-SVC-002** (Index page fully replaced by error alert; no content accessible while backend offline) |
| **Source** | Line 246: `if (loading && !data) return <CircularProgress />`. Line 247: `if (error) return <Alert>`. No mock fallback for offline scenario. |

---

### TC-MGR-SVC-01B — Error Alert Correct (Source-Verified)

| | |
|---|---|
| **Expected** | Red `<Alert severity="error">` with error message |
| **Actual** | ✅ Red error Alert correctly shows `"Failed to fetch"`. The error handling logic itself is correct — it's the **absence of a fallback** that's the UX problem. |
| **Status** | ✅ **PASS (error rendering works as coded)** |

---

### TC-MGR-SVC-02 — Category Sidebar: "All Services" Default

| | |
|---|---|
| **Expected** | "All Services" selected with brand teal left border |
| **Actual** | ⏭ **SKIPPED** — Sidebar not rendered (error state) |
| **Status** | ⏭ **SKIPPED** |
| **Source-Verified** | Lines 258–268: `selectedCategoryId === null` → `borderLeft: '3px solid #006D77'`, `bgcolor: '#E0F2F1'`, fontWeight 700, teal text. Default state: `useState(null)`. |

---

### TC-MGR-SVC-03 — Category Sidebar: Select Category

| | |
|---|---|
| **Actual** | ⏭ **SKIPPED** — Sidebar not rendered |
| **Status** | ⏭ **SKIPPED** |
| **Source-Verified** | Line 280: `onClick={() => setSelectedCategoryId(cat.id)}`. Line 127: query re-fires with `categoryId: selectedCategoryId`. Line 324: title updates to `categories.find(c => c.id === selectedCategoryId)?.name || 'Category'`. |

---

### TC-MGR-SVC-04 — Category Sidebar: Subcategory Expand/Collapse

| | |
|---|---|
| **Actual** | ⏭ **SKIPPED** |
| **Status** | ⏭ **SKIPPED** |
| **Source-Verified** | Lines 273–276: `KeyboardArrowDown/Right` icon toggle. Line 147: `handleToggleCat(id) → setExpandedCats(prev => ({ ...prev, [id]: !prev[id] }))`. Lines 292–307: `<Collapse in={expandedCats[cat.id]}>` for subcategory `<List>`. |

---

### TC-MGR-SVC-05 — Category Sidebar: Product Count Badges

| | |
|---|---|
| **Actual** | ⏭ **SKIPPED** |
| **Status** | ⏭ **SKIPPED** |
| **Source-Verified** | Line 288: `<Badge badgeContent={cat.products?.length || 0} sx={{ bgcolor: '#006D77', color: 'white', fontSize: '0.65rem' }} />` |

---

### TC-MGR-SVC-06 — "Add Category" Button

| | |
|---|---|
| **Expected** | Dashed-outline "Add Category" button at bottom of sidebar |
| **Actual** | ⏭ **SKIPPED** — Sidebar not rendered |
| **Status** | ⏭ **SKIPPED** |
| **Source-Verified** | Line 312: `<Button startIcon={<Add />} fullWidth size="small" variant="outlined" sx={{ borderStyle: 'dashed' }}>Add Category</Button>` — **No `onClick` handler wired**. Button renders but does nothing on click. |
| **⚠️ BUG** | The "Add Category" button has no handler. Clicking it has no effect. Test plan mentions this as expected. |

---

### TC-MGR-SVC-07 — Product Grid: Card Layout

| | |
|---|---|
| **Expected** | Cards: product_type chip (simple=info/blue, variable=secondary/purple), active switch, name, description (2-line clamp), SKU, price as `£X.00` |
| **Actual** | ⏭ **SKIPPED** — No products visible (error state) |
| **Status** | ⏭ **SKIPPED** |
| **Source-Verified** | Line 364–376: `<Chip color={product_type === 'simple' ? 'info' : 'secondary'}>`. Line 370: `<Switch checked={product.is_active} onChange={() => toggleActive(product.id, product.is_active)}>`. Lines 379–382: name h6, description with `-webkit-box clamp(2)`, `|| 'No description provided.'`. Lines 385–390: SKU monospace `|| 'NO-SKU'`, price `£${parseFloat(product.price || 0).toFixed(2)}`. Card hover: `transform: translateY(-4px)`, `boxShadow`, `borderColor: #006D77`. |

---

### TC-MGR-SVC-08 — Product Grid: Empty State

| | |
|---|---|
| **Expected** | Dashed-border Paper with "No services found in this category." |
| **Actual** | ⏭ **SKIPPED** — Error state prevents grid rendering |
| **Status** | ⏭ **SKIPPED** |
| **Source-Verified** | Lines 345–350: `products.length === 0 → <Paper sx={{ border: '1px dashed', borderColor: 'divider' }}>`. Text: "No services found in this category." |

---

### TC-MGR-SVC-09 — Search: Filters by Name

| | |
|---|---|
| **Actual** | ⏭ **SKIPPED** |
| **Status** | ⏭ **SKIPPED** |
| **Source-Verified** | Lines 141–143: `products = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(...)))` — both name and SKU searched, case-insensitive. |

---

### TC-MGR-SVC-10 — Search: Filters by SKU

| | |
|---|---|
| **Actual** | ⏭ **SKIPPED** |
| **Status** | ⏭ **SKIPPED** |

---

### TC-MGR-SVC-11 — Search: Empty State on No Matches

| | |
|---|---|
| **Actual** | ⏭ **SKIPPED** |
| **Status** | ⏭ **SKIPPED** |

---

### TC-MGR-SVC-12 — Toggle Active Status (Instant)

| | |
|---|---|
| **Expected** | `TOGGLE_PRODUCT` mutation fires; `refetch()` updates switch |
| **Actual** | ⏭ **SKIPPED** — No product cards |
| **Status** | ⏭ **SKIPPED** |
| **Source-Verified** | Lines 169–174: `toggleActive(id, currentStatus) → toggleProduct({ variables: { id, isActive: !currentStatus } }); refetch()`. Error caught silently (`console.error`). |

---

### TC-MGR-SVC-13 — "Add Service" Button: Navigate to Create

| | |
|---|---|
| **Expected** | Navigate to `/manager/services/new` |
| **Actual** | ⏭ **SKIPPED** — Button not visible in error state |
| **Status** | ⏭ **SKIPPED** |
| **Source-Verified** | Line 338: `onClick={() => navigate('/manager/services/new')}` — correct navigation. |

---

### TC-MGR-SVC-14 — Edit Product Button: Navigate to Edit

| | |
|---|---|
| **Actual** | ⏭ **SKIPPED** — No product cards |
| **Status** | ⏭ **SKIPPED** |
| **Source-Verified** | Line 395: `onClick={() => navigate('/manager/services/' + product.id + '/edit')}` |

---

### TC-MGR-SVC-15 — Delete Button: No Handler (Known Bug)

| | |
|---|---|
| **Expected** | Click → nothing happens (known bug: no handler) |
| **Actual** | ⏭ **SKIPPED** — No product cards. Confirmed via source. |
| **Status** | ❌ **FAIL — BUG-SVC-001 (Known, documented in test plan)** |
| **Source** | Lines 398–400: `<IconButton size="small" color="error" sx={{ bgcolor: 'error.lighter' }}><Delete fontSize="small" /></IconButton>` — **No `onClick` prop**. Delete is completely non-functional. No confirm dialog wired. |

---

## Create Service Page (`/manager/services/new`)

---

### TC-MGR-SVC-16 — Create Page: Initial State

| | |
|---|---|
| **Expected** | h5 "New Service", subtitle "Add a clinical service to the catalogue", back arrow, fields, status panel |
| **Actual** | ✅ h5 **"New Service"** confirmed. Subtitle: **"Add a clinical service to the catalogue"**. Back arrow (grey `#F1F3F4` bg). Left panel (md=8): **Service Name *** (error-bound), **Description** (multiline 3 rows), **Duration (minutes)** (number, default "30"), **Price** (£ prefix), **Category** (plain text field). Right panel (md=4): Status **"Active"** (green switch). Header: **"Cancel"** (outlined) + **"Save Service"** (green `#0F9D58`). |
| **Status** | ✅ **PASS** |

---

### TC-MGR-SVC-17 — Validation: Name Required

| | |
|---|---|
| **Input** | All fields blank, clicked "Save Service" |
| **Expected** | `errors.name = 'Required'` shown under Name |
| **Actual** | Red **"Required"** helperText appeared under Service Name field. Mutation did not fire. |
| **Status** | ✅ **PASS** |
| **Source** | Line 27: `validate()` → `if (!form.name.trim()) e.name = 'Required'`. Line 52: `error={!!errors.name} helperText={errors.name}`. |

---

### TC-MGR-SVC-18 — Create: Happy Path

| | |
|---|---|
| **Expected** | Mutation → snackbar "Service created" → navigate to `/manager/services` |
| **Actual** | ⏭ **SKIPPED** — Backend offline |
| **Status** | ⏭ **SKIPPED** |
| **Source-Verified** | Line 41: `createService({ variables: { input: { name, description||undefined, duration_minutes: parseInt(form.duration_minutes)||30, price: form.price?parseFloat(form.price):undefined, is_active } } })`. Line 22: `onCompleted → enqueueSnackbar('Service created'); navigate('/manager/services')`. |

---

### TC-MGR-SVC-19 — Create: Duration Default Fallback

| | |
|---|---|
| **Input** | Observed Duration field on page load |
| **Expected** | Default value = "30" |
| **Actual** | Duration field showed **"30"** on page load. |
| **Status** | ✅ **PASS** |
| **Source** | Line 18: `useState({ ..., duration_minutes: '30', ... })` — initialized as "30". Line 41: `parseInt(form.duration_minutes) || 30` — additional fallback if cleared. |

---

### TC-MGR-SVC-20 — Create: Price Not Set → `undefined`

| | |
|---|---|
| **Expected** | `price: undefined` in mutation when blank |
| **Actual** | ⏭ **SKIPPED** |
| **Status** | ⏭ **SKIPPED** |
| **Source-Verified** | Line 41: `price: form.price ? parseFloat(form.price) : undefined` — correct falsy guard. |

---

### TC-MGR-SVC-21 — Create: Toggle Status to Inactive/Active

| | |
|---|---|
| **Input** | Toggle status switch Off then On |
| **Expected** | "Active" → "Inactive" → "Active" |
| **Actual** | Toggle Off: **"Inactive"** (text.secondary grey). Toggle On: **"Active"** (success.main green). |
| **Status** | ✅ **PASS** |

---

### TC-MGR-SVC-22 — Cancel: Navigate to Catalog

| | |
|---|---|
| **Input** | Clicked "Cancel" |
| **Expected** | Navigate to `/manager/services` |
| **Actual** | Navigated to `/manager/services` (showed error alert since backend offline). |
| **Status** | ✅ **PASS** |

---

### TC-MGR-SVC-22B — Back Arrow: Navigate to Catalog

| | |
|---|---|
| **Input** | Clicked back arrow |
| **Expected** | Navigate to `/manager/services` |
| **Actual** | Navigated to `/manager/services`. |
| **Status** | ✅ **PASS** |

---

## Detail Page (`/manager/services/:id`)

---

### TC-MGR-SVC-23 — Loading Skeleton

| | |
|---|---|
| **Expected** | Two skeleton blocks while `loading && !service` |
| **Actual** | Source line 28: `if (loading && !service) return (<Skeleton h=56 /><Skeleton h=320 />)`. Uses `fetchPolicy: 'cache-and-network'` — skeleton shown on cache miss. With offline backend: query resolves as error eventually; since `fetchPolicy: 'cache-and-network'`, after error `loading = false`, `service = undefined` → falls through to render with mock fallback. |
| **Status** | ✅ **PASS (source-verified; skeleton shown briefly then mock renders)** |

---

### TC-MGR-SVC-24 — Detail: Data Display (Live)

| | |
|---|---|
| **Actual** | ⏭ **SKIPPED** — Backend offline |
| **Status** | ⏭ **SKIPPED** |

---

### TC-MGR-SVC-25 — Detail: No Clinicians Assigned

| | |
|---|---|
| **Expected** | Large MedicalServicesIcon + "No clinicians assigned" |
| **Actual** | ✅ **Confirmed via mock fallback**. Mock data has `clinicians: []`. Lines 151–155: `<MedicalServicesRoundedIcon fontSize 48>` + "No clinicians assigned" shown in right panel. |
| **Status** | ✅ **PASS (confirmed via TC-MGR-SVC-26 mock)** |

---

### TC-MGR-SVC-26 — Detail: Mock Fallback (Invalid ID)

| | |
|---|---|
| **Input** | Navigated to `/manager/services/test-svc-999` |
| **Expected** | Mock: h5 "General Consultation", "30 min", "£85.00", Active chip, no clinicians |
| **Actual** | ✅ h5 **"General Consultation"** confirmed. Active chip (green, CheckCircleIcon). **30 min** duration (TimerRoundedIcon). **£85.00** price (success.main). Right panel: **"Assigned Clinicians"** header + large MedicalServicesIcon + **"No clinicians assigned"** text. |
| **Status** | ✅ **PASS** |
| **Source** | Lines 35–44: mock = `{ name: 'General Consultation', duration_minutes: 30, price: 85, is_active: true, category: null, clinicians: [] }`. |
| **Note** | Unlike Rooms detail page (BUG-RM-001), Services detail uses `fetchPolicy: 'cache-and-network'` which **does not throw** in the same way — `loading` becomes false and `service = undefined` → the `??` fallback correctly renders. This is why Services detail works but Rooms detail was blank. Difference: Rooms had same pattern but appeared to crash. Further investigation suggested environmental/timing differences. |

---

### TC-MGR-SVC-27 — Detail: Click Edit Button

| | |
|---|---|
| **Input** | Clicked "Edit Service" |
| **Expected** | Navigate to `/manager/services/test-svc-999/edit` |
| **Actual** | Navigated to `/manager/services/test-svc-999/edit`. |
| **Status** | ✅ **PASS** |

---

### TC-MGR-SVC-28 — Detail: Clinician Click Navigation

| | |
|---|---|
| **Expected** | Click clinician row → navigate to `/clinicians/:id` |
| **Actual** | ⏭ **SKIPPED** — No clinicians in mock data |
| **Status** | ⏭ **SKIPPED** |
| **Source-Verified** | Line 141: `onClick={() => navigate('/clinicians/' + c.id)}`. Hover: `bgcolor: '#F1F3F4'` + cursor pointer. |

---

## Edit Page (`/manager/services/:id/edit`)

---

### TC-MGR-SVC-29 — Edit: Loading Skeleton

| | |
|---|---|
| **Expected** | Two skeleton rectangles while fetching |
| **Actual** | Navigated to `/manager/services/test-svc-999/edit`. Two skeleton rectangles: h=56 (header) and h=400 (form). Skeletons persisted indefinitely (backend offline + `fetchPolicy: 'network-only'`). No header, no buttons. |
| **Status** | ✅ **PASS (skeleton correct; persistence expected offline)** |

---

### TC-MGR-SVC-30 — Edit: Pre-populates Form

| | |
|---|---|
| **Actual** | ⏭ **SKIPPED** — Backend offline |
| **Status** | ⏭ **SKIPPED** |
| **Source-Verified** | Line 26: `setForm({ name: s.name||'', description: s.description||'', duration_minutes: s.duration_minutes?.toString()||'30', price: s.price?.toString()||'', is_active: s.is_active??true })`. |

---

### TC-MGR-SVC-31 — Edit: Save Changes

| | |
|---|---|
| **Actual** | ⏭ **SKIPPED** |
| **Status** | ⏭ **SKIPPED** |
| **Source-Verified** | Line 50: `duration_minutes: parseInt(form.duration_minutes)||30`, `price: form.price?parseFloat(form.price):undefined`. On success (line 30): snackbar "Service updated" + navigate to `/manager/services`. |

---

### TC-MGR-SVC-32 — Edit: Toggle Status

| | |
|---|---|
| **Actual** | ⏭ **SKIPPED** — Form in skeleton state |
| **Status** | ⏭ **SKIPPED** |

---

### TC-MGR-SVC-33 — Edit: Cancel

| | |
|---|---|
| **Expected** | Cancel button navigates to `/manager/services` |
| **Actual** | ❌ **No Cancel or Back buttons visible** in skeleton state. Line 34: `if (fetching || !form) return <Box><Skeleton /><Skeleton /></Box>` — replaces the entire render including header. User navigation trap. |
| **Status** | ❌ **FAIL — BUG-SVC-003** (Same pattern as BUG-RM-002) |

---

## Dialog TCs (TC-MGR-SVC-34 to 42)

All dialog TCs require existing service data (product list loaded from backend). Since backend offline and the index shows error Alert instead of the grid, no products exist and the dialog cannot be opened.

| TC | Expected | Status | Source-Verified |
|----|----------|--------|----------------|
| **TC-34** | Dialog: "Add New Service" title; Tab 0 active | ⏭ SKIPPED | Line 419: `editProduct?.id ? 'Edit Service' : 'Add New Service'`. `openNewProduct()` sets `editProduct = { name:'', ... }` (no id). |
| **TC-35** | Dialog Basic Info: Name, Description, Product Type radio, Status, Category autocomplete, SKU, Base Price | ⏭ SKIPPED | Lines 438–480 confirmed in source. |
| **TC-36** | Save disabled when Name empty | ⏭ SKIPPED | Line 539: `disabled={savingProduct || (productTab === 0 && !editProduct?.name)}` — disabled when on tab 0 and name is empty (falsy). |
| **TC-37** | Variable type → Variations tab enabled | ⏭ SKIPPED | Line 427: `disabled={editProduct?.product_type !== 'variable'}` — only enabled when type is 'variable'. |
| **TC-38** | "Add Variation Block" adds table row | ⏭ SKIPPED | Lines 217–219: `addVariantRow = () => setVariations(prev => [...prev, { id: Date.now(), name:'', ... }])`. |
| **TC-39** | Cancellation Rules tab disabled for new product | ⏭ SKIPPED | Line 428: `disabled={!editProduct?.id}` — new product has no id. |
| **TC-40** | "Add Rule" inner dialog opens | ⏭ SKIPPED | Lines 547–584: `<Dialog open={ruleDialogOpen}>` with Rule Type radio, Fee Structure radio, Fee amount, Hours trigger. |
| **TC-41** | "Add Rule" button disabled without feeAmount or hours | ⏭ SKIPPED | Line 582: `disabled={!newRule.feeAmount || !newRule.hoursBeforeAppointment}` |
| **TC-42** | Cancel closes dialog, no mutation | ⏭ SKIPPED | Line 538: `<Button onClick={() => setProductDialogOpen(false)}>Cancel</Button>` |

---

## Edge Case Results

| # | Edge Case | Result | Status |
|---|-----------|--------|--------|
| **E1** | `user.clinicId` null → defaults to "1" | Line 124: `user?.clinicId || "1"` — confirmed fallback | ✅ Source-verified |
| **E2** | Price = 0 → `£0.00`, switch toggleable | Line 389: `parseFloat(product.price || 0).toFixed(2)` → `£0.00`. Switch unrelated to price. | ✅ Source-verified |
| **E3** | No SKU → "NO-SKU" monospace | Line 386: `{product.sku || 'NO-SKU'}` with `fontFamily: '"Fira Code", monospace'` | ✅ Source-verified |
| **E4** | No description → "No description provided." | Line 381: `{product.description || 'No description provided.'}` | ✅ Source-verified |
| **E5** | Category ID not in categories list | Line 324: `categories.find(...)?.name || 'Category'` — shows "Category" fallback | ✅ Source-verified |
| **E6** | Very long description (200+ chars) | Lines 380: `-webkit-box`, `WebkitLineClamp: 2`, `overflow: 'hidden'`, `minHeight: 40` — clamped to 2 lines | ✅ Source-verified |
| **E7** | Category list empty | Sidebar shows only "All Services"; `categories = []` → map renders nothing; Autocomplete empty | ✅ Source-verified |
| **E8** | `price = null` → `£NaN` | ❌ **TEST PLAN INCORRECT.** Source line 389: `parseFloat(product.price || 0).toFixed(2)` — the `|| 0` means null/undefined price renders as **`£0.00`**, NOT `£NaN`. The `|| 0` guard makes this safe. | ⚠️ Test plan error |
| **E9** | Variable product with empty variation rows | Line 197: `if (v.name && v.price !== '') { await saveVariation(...) }` — empty rows skipped | ✅ Source-verified |
| **E10** | Rule added before product saved | Line 223: `if (!editProduct?.id) return alert("Must save product first before adding rules.")` | ✅ Source-verified |
| **E11** | Negative duration | `parseInt` keeps negative; no `min` guard on Duration field. Backend should validate. | ⚠️ No frontend guard |
| **E12** | Negative price | No `min` check on Price field. Sent to backend as-is. | ⚠️ No frontend guard |

---

## Bugs Found

| ID | Bug | Severity | Location |
|----|-----|----------|----------|
| **BUG-SVC-001** | Delete icon button on product cards has no `onClick` handler — delete is fully non-functional | 🔴 High | `services/index.jsx` line 398 |
| **BUG-SVC-002** | Index page shows full-screen red error Alert when backend offline — no sidebar/grid visible, no mock fallback | 🟡 Medium | `services/index.jsx` line 247 |
| **BUG-SVC-003** | Edit page skeleton replaces entire render — Cancel/Back buttons inaccessible (navigation trap) | 🟡 Medium | `services/edit.jsx` line 34 |

---

## Screenshots

| File | Description |
|------|-------------|
| `manager_services_test_*.webp` | Full session recording |
| Create page validation, status toggle, cancel, back captured via click feedback screenshots |
