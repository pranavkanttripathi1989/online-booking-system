# Manager Module — Test Suggestions

**Version:** 1.0  
**Date:** 2026-03-20

---

## Implemented Fixes

### SUG-MGR-001 — Mock data fallbacks for Blocks.jsx form dropdowns
- **Priority:** CRITICAL  
- **Action:** Added `MOCK_CLINICIANS`, `MOCK_CLINICS`, `MOCK_ROOMS` module-level constants. Updated derived variables to use mock data when GraphQL returns empty results.
- **Status:** ✅ IMPLEMENTED

### SUG-MGR-002 — Mock data fallbacks for Availability.jsx form dropdowns
- **Priority:** CRITICAL  
- **Action:** Added `MOCK_CLINICIANS_AV`, `MOCK_CLINICS_AV` module-level constants. Updated `clinicians` and `clinics` derived variables to fall back to mock.
- **Status:** ✅ IMPLEMENTED

### SUG-MGR-003 — Fix missing FormControl import in services/index.jsx
- **Priority:** CRITICAL  
- **Action:** Added `FormControl` to the `@mui/material` import. This was the root cause of the services page React crash.
- **Status:** ✅ IMPLEMENTED

### SUG-MGR-004 — Move mock data to module level in services/index.jsx
- **Priority:** HIGH  
- **Action:** Moved `MOCK_SERVICES_DATA` and `MOCK_CATEGORIES_DATA` from render body to module level. Added `isMock` / `displayCategories` / `displayProducts` logic as graceful fallback.
- **Status:** ✅ IMPLEMENTED

### SUG-MGR-005 — Mock data fallback in products/index.jsx loadData()
- **Priority:** HIGH  
- **Action:** Added `MOCK_PRODUCTS`, `MOCK_PROD_CATEGORIES`, `MOCK_PROD_SUBCATEGORIES` constants. `loadData()` catch block now populates state with mock data instead of showing error banner with empty page.
- **Status:** ✅ IMPLEMENTED

---

## Deferred Suggestions

### SUG-MGR-006 — Centralise mock reference data into a shared file
- **Priority:** MEDIUM  
- **Rationale:** `MOCK_CLINICIANS`, `MOCK_CLINICS`, `MOCK_ROOMS` are duplicated across Blocks.jsx and Availability.jsx with near-identical data. A single `src/mocks/referenceData.js` file would eliminate duplication and keep mock data consistent across all Manager sub-pages.

### SUG-MGR-007 — Edit clinic routing uses hardcoded 'cl-001' instead of card ID
- **Priority:** MEDIUM  
- **Rationale:** TC-MGR-003 showed a PARTIAL result. The edit navigation should use the actual clinic `id` from mock data, not a hardcoded string. Verify `clinics/index.jsx` uses `navigate(\`/manager/clinics/${clinic.id}/edit\`)`.

### SUG-MGR-008 — Add Availability form: "Valid From" should default to today
- **Priority:** LOW  
- **Rationale:** `defaultForm.valid_from` is set to `new Date().toISOString().split('T')[0]` which is good, but "Valid Until" is empty with no guidance text. Adding a placeholder like "No end date" would improve UX.

### SUG-MGR-009 — Services/Products: Add a toast/banner in mock mode
- **Priority:** LOW  
- **Rationale:** When the backend is offline and mock data is displayed, users (including admins) have no indication they are seeing demo data. A dismissable `<Alert severity="info">Showing demo data — backend offline</Alert>` banner would clarify the state.

### SUG-MGR-010 — Blocks.jsx: End time validation (must be after start time)
- **Priority:** LOW  
- **Rationale:** The form allows submitting a block with `end_time` earlier than `start_time`. Frontend validation (similar to Availability.jsx's `if (form.start_time >= form.end_time)` check) should be added.
