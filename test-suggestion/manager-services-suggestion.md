# Manager Services — Feature Suggestions (Final)

**Source:** `services/index.jsx`, `create.jsx`, `detail.jsx`, `edit.jsx`
**Session:** Session 1 — QA + Fix + Suggestion Cycle Complete

---

## Bug Fixes

### BUG-SVC-001 — Delete Button Has No Handler
```
Status: COMPLETED
Fix: Added handleDeleteProduct(), confirmDeleteProduct(), ConfirmDialog with title "Deactivate Service".
     Uses existing TOGGLE_PRODUCT mutation to set is_active=false (no DELETE_PRODUCT mutation available).
     aria-label="Delete service {name}" also added.
Files: index.jsx
```

### BUG-SVC-002 — Index Full-Screen Error Alert (No Mock Fallback)
```
Status: COMPLETED (already fixed in source)
Fix: MOCK_SERVICES_DATA (6 services) + MOCK_CATEGORIES_DATA (4 categories) defined at module level.
     isMock = !!error || (!loading && !data) → displayProducts/displayCategories use mock arrays.
     The old if(error) return <Alert> branch was replaced with graceful fallback rendering.
Files: index.jsx
```

### BUG-SVC-003 — Edit Page Navigation Trap in Skeleton State
```
Status: COMPLETED
Fix: Skeleton early-return now wraps in <Box> with back-button header containing ArrowBackRoundedIcon
     wired to /manager/services + aria-label="Back to services".
Files: edit.jsx
```

---

## Gap Fixes

### GAP-SVC-001 — Negative Duration Accepted (E11)
```
Status: COMPLETED
Fix: inputProps={{ min: 1 }} on Duration (minutes) field in both create.jsx and edit.jsx.
Files: create.jsx, edit.jsx
```

### GAP-SVC-002 — Negative Price Accepted (E12)
```
Status: COMPLETED
Fix: inputProps={{ min: 0, step: 0.01 }} on Price field in both create.jsx and edit.jsx.
Files: create.jsx, edit.jsx
```

---

## Accessibility Fixes

### ACC-SVC-001 — aria-labels on Card Edit/Delete Buttons
```
Status: COMPLETED
Fix: aria-label="Edit service {name}" and "Delete service {name}" on card icon buttons.
Files: index.jsx
```

### ACC-SVC-002 — aria-label on Back Buttons
```
Status: COMPLETED
Fix: aria-label="Back to services" on IconButton in create.jsx and edit.jsx skeleton header.
Files: create.jsx, edit.jsx
```

---

## Stability Fixes

### STAB-SVC-001 — ErrorBoundary Wrapper on Index
```
Status: COMPLETED
Fix: ServiceCatalogWithBoundary export wraps ServiceCatalog in <ErrorBoundary>.
Files: index.jsx
```

---

## Pending Suggestions

### SUG-SVC-001 — Wire to Live Backend
```
Status: PENDING
Notes: Remove mock fallbacks; connect catalog to real GraphQL endpoints when backend available.
```

### SUG-SVC-002 — "Add Category" Button Handler
```
Status: PENDING
Notes: Button renders (dashed outline) but has no onClick — needs category creation dialog.
```

### SUG-SVC-003 — Hard Delete Mutation
```
Status: PENDING
Notes: No DELETE_PRODUCT mutation available. Current "delete" sets is_active=false.
       Backend needs a proper delete endpoint.
```

### SUG-SVC-004 — ErrorBoundary on create.jsx + edit.jsx
```
Status: PENDING
Notes: create.jsx and edit.jsx use notistack for errors (sufficient); consider adding for deeper crash resilience.
```

---

## Summary Table

| ID | Description | Status |
|----|-------------|--------|
| BUG-SVC-001 | Delete button unhandled | ✅ COMPLETED |
| BUG-SVC-002 | Index full-screen error / no mock | ✅ COMPLETED |
| BUG-SVC-003 | Edit nav trap in skeleton | ✅ COMPLETED |
| GAP-SVC-001 | Negative duration | ✅ COMPLETED |
| GAP-SVC-002 | Negative price | ✅ COMPLETED |
| ACC-SVC-001 | aria-labels on card buttons | ✅ COMPLETED |
| ACC-SVC-002 | aria-label on back buttons | ✅ COMPLETED |
| STAB-SVC-001 | ErrorBoundary on index | ✅ COMPLETED |
| SUG-SVC-001 | Live backend wiring | ⏳ PENDING |
| SUG-SVC-002 | Add Category button handler | ⏳ PENDING |
| SUG-SVC-003 | Hard delete mutation | ⏳ PENDING |
| SUG-SVC-004 | ErrorBoundary on create/edit | ⏳ PENDING |
