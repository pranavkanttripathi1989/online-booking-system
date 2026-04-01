# Manager Clinics — Test Suggestions

**Source Files:** `frontend/src/pages/manager/clinics/*.jsx`  
**Last Updated:** 2026-03-30

---

### SUG-CLI-001 — Fix Subtitle "rooms total" Inaccuracy
**Status:** ✅ COMPLETED  
**Notes:** `index.jsx` line 55 changed from `ROOMS_DATA.length` (4) to `clinics.reduce((s, c) => s + c.rooms, 0)` (= 20). Subtitle now shows "4 clinics · 20 rooms total". Verified in browser screenshot.

---

### SUG-CLI-002 — Fix Edit Page Skeleton Loop When Backend Offline
**Status:** ✅ COMPLETED  
**Notes:** `edit.jsx` rewritten with:
1. `MOCK_CLINIC_BY_ID` map (all 4 clinics keyed by ID; `DEFAULT_MOCK_CLINIC` for unknown IDs)
2. `fetchPolicy: 'network-only'` → `'cache-first'`
3. `useEffect` falls back to `MOCK_CLINIC_BY_ID[id] ?? DEFAULT_MOCK_CLINIC` when `data?.clinic` is null
4. Heading now shows mock clinic name when offline
5. Guard changed from `if (fetching || !form)` to `if (fetching && !form)` to prevent stuck-skeleton

---

### SUG-CLI-003 — Add aria-labels to Index Page Icon Buttons
**Status:** ✅ COMPLETED  
**Notes:** View/Edit/Delete IconButtons on each clinic card now have `aria-label={`View/Edit/Delete ${clinic.name}`}`. Satisfies WCAG 2.1 SC 4.1.2.

---

### SUG-CLI-004 — Wire All Pages to Live Backend (GraphQL)
**Status:** PENDING | **Priority:** 🔴 High  
**Notes:** Index page uses local `CLINICS_DATA`/`ROOMS_DATA`. Detail and Edit use Apollo queries that return no data offline. When backend is live, all data will flow automatically. Edit mock fallback is intentionally transparent (live data takes precedence via Apollo cache).

---

### SUG-CLI-005 — Add Mock Clinic Data to Detail Page
**Status:** PENDING | **Priority:** 🟡 Medium  
**Notes:** `detail.jsx` still shows blank header ("Inactive" chip because `is_active = undefined`) when backend offline. Could apply same `MOCK_CLINIC_BY_ID[id]` fallback pattern used in edit.jsx. `clinic = data?.clinic ?? MOCK_CLINIC_BY_ID[id]`.

---

### SUG-CLI-006 — Add Email Format Validation on Create/Edit
**Status:** PENDING | **Priority:** 🟢 Low  
**Notes:** No frontend email format check. Suggested: `if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'`. Backend also validates.

---

### SUG-CLI-007 — Add Phone Format Validation
**Status:** PENDING | **Priority:** 🟢 Low  
**Notes:** Phone field free-form. Could add `inputProps={{ pattern: '[\\+0-9 \\(\\)\\-]+' }}` for lightweight client-side hint.

---

### SUG-CLI-008 — Persist Delete (Connect to Backend Mutation)
**Status:** PENDING | **Priority:** 🔴 High  
**Notes:** Index page delete is local-state only — `setClinics(prev => prev.filter(...))`. Page refresh restores the clinic. Need `DELETE_CLINIC_MUTATION` wired to `confirmDelete`.

---

### SUG-CLI-009 — Rooms Tab: Show Rooms from All Clinics (Live)
**Status:** PENDING | **Priority:** 🟡 Medium  
**Notes:** `ROOMS_DATA` in index is hardcoded to 4 rooms from only 2 clinics. Should be replaced with `useQuery(ROOMS_QUERY)` results when backend available.

---

### SUG-CLI-010 — Add Rooms Tab Empty State
**Status:** PENDING | **Priority:** 🟢 Low  
**Notes:** If `ROOMS_DATA.length === 0` (live backend with no rooms), the Rooms tab shows nothing. Need an "No rooms yet" empty state card.

---

### SUG-CLI-011 — Add 404 Guard on Detail/Edit for Unknown Clinic ID
**Status:** PENDING | **Priority:** 🟢 Low  
**Notes:** Unknown ID (`/manager/clinics/999`) on detail page: `clinic` is null → blank header (no crash, but confusing). Could add: `if (!loading && !clinic) return <NotFoundMessage>`.

---

### SUG-CLI-012 — Add ErrorBoundary Wrapper
**Status:** PENDING | **Priority:** 🟡 Medium  
**Notes:** Clinics module pages not yet wrapped in `<ErrorBoundary>`. Consistent with Availability/Blocks.

---

## Summary Table

| ID | Suggestion | Priority | Status |
|----|-----------|----------|--------|
| SUG-CLI-001 | Fix subtitle rooms total | 🟡 Minor | ✅ COMPLETED |
| SUG-CLI-002 | Fix edit skeleton loop (offline) | 🟡 Medium | ✅ COMPLETED |
| SUG-CLI-003 | aria-labels on icon buttons | 🟡 Medium | ✅ COMPLETED |
| SUG-CLI-004 | Wire to live backend | 🔴 High | PENDING |
| SUG-CLI-005 | Mock data in detail page | 🟡 Medium | PENDING |
| SUG-CLI-006 | Email format validation | 🟢 Low | PENDING |
| SUG-CLI-007 | Phone format validation | 🟢 Low | PENDING |
| SUG-CLI-008 | Persist delete via mutation | 🔴 High | PENDING |
| SUG-CLI-009 | Live rooms data in tab | 🟡 Medium | PENDING |
| SUG-CLI-010 | Rooms tab empty state | 🟢 Low | PENDING |
| SUG-CLI-011 | 404 guard on detail/edit | 🟢 Low | PENDING |
| SUG-CLI-012 | ErrorBoundary wrapper | 🟡 Medium | PENDING |
