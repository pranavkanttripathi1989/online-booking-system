# Admin Panel — Feature Suggestions (Session 3 Final)

**Module:** `frontend/src/pages/admin/`  
**Last Updated:** 2026-03-24 Session 3

> ✅ **All critical and high priority items complete. All 3 outstanding new issues resolved.**

---

## Implementation Status

| ID | Suggestion | Priority | Status |
|----|-----------|----------|--------|
| SUG-ADMIN-001 | Fix blank admin pages (route + mock data) | 🔴 Critical | ✅ DONE |
| SUG-ADMIN-002 | Mock data for Orgs, Roles, Email Templates | 🔴 Critical | ✅ DONE |
| SUG-ADMIN-003 | Offline user creation fallback | 🔴 High | ✅ DONE |
| SUG-ADMIN-004 | Edit user form pre-fill | 🔴 High | ✅ DONE |
| SUG-ADMIN-005 | Register /forbidden route | 🟡 Medium | ✅ DONE |
| SUG-ADMIN-006 | Users list search filter (useMemo) | 🟡 Medium | ✅ DONE |
| SUG-ADMIN-007 | Pagination count from local array | 🟢 Low | ✅ DONE |
| SUG-ADMIN-008 | Admin left sidebar navigation | 🟡 Medium | ✅ DONE |
| SUG-ADMIN-009 | Audit log page | 🟢 Low | ✅ DONE |
| NEW-ADMIN-001 | Room Types mock data | 🔴 High | ✅ **DONE (Session 3)** |
| NEW-ADMIN-002 | Sidebar Audit Log ?tab= URL param | 🟡 Medium | ✅ **DONE (Session 3)** |
| NEW-ADMIN-003 | /admin redirect to /admin/users | 🟡 Medium | ✅ **DONE (Session 3)** |
| NEW-ADMIN-004 | Admin breadcrumbs on edit pages | 🟢 Low | ⏳ PENDING |

---

## Session 3 Implementation Notes

### NEW-ADMIN-001 — Room Types Mock Data
**Implementation:** Added `MOCK_ROOM_TYPES` (5 entries: Consultation Room, Procedure Room, Video Suite, Waiting Area Annex, Therapy Room) to `RoomTypes.jsx`. Seeded in `catch` block when Apollo query fails. Added `isMockMode` boolean state + offline info `<Alert>` shown in UI when in mock mode.

### NEW-ADMIN-002 — Audit Log Tab URL Param
**Implementation:** Added `useSearchParams` import to `users/index.jsx`. Changed `adminTab` from `useState(0)` to a lazy initializer: `useState(() => { const t = parseInt(searchParams.get('tab') ?? '0', 10); return isNaN(t) ? 0 : Math.min(t, 2); })`. Sidebar "Audit Log" navigates to `/admin/users?tab=2` — page now opens directly at Audit Logs tab.

### NEW-ADMIN-003 — /admin Default Redirect
**Implementation:** Added `<Route path="/admin" element={<Navigate to="/admin/users" replace />} />` as first child inside the `AdminLayout` route block in `App.jsx`. Admin users now land on Users list when navigating to `/admin` directly.

---

## New Suggestions (Session 3 Discovery)

### NEW-ADMIN-005 — Room Types: Mock CRUD Operations
**Observation:** In mock mode, clicking Create/Edit/Delete on Room Types fires the GraphQL mutation which fails → error snackbar shown. The MOCK_ROOM_TYPES state is not updated optimistically.  
**Recommendation:** Add in-memory CRUD to mock mode: `setTypes(prev => [...prev, { id: `rt-${Date.now()}`, ...form }])` after catching the network error.  
**Priority:** 🟢 Low | **Status:** ⏳ PENDING

### NEW-ADMIN-006 — Users List: Avatar Colors Should Use Teal Palette
**Observation:** `getAvatarColor()` in `users/index.jsx` (line 225) still uses old `['#6366F1', '#EC4899', '#F59E0B', ...]` palette — same issue as was fixed in ClinicianCard.  
**Recommendation:** Replace with teal-family colours: `['#006D77', '#0E9F9F', '#14B8A6', '#0D9488', '#1CBFBF', '#047857']`.  
**Priority:** 🟡 Medium | **Status:** ⏳ PENDING

### NEW-ADMIN-007 — Admin breadcrumbs on edit pages
**Observation:** `/admin/users/:id/edit` has a back arrow but no breadcrumb. Long-standing observation from NEW-ADMIN-004.  
**Priority:** 🟢 Low | **Status:** ⏳ PENDING

---

## Priority Queue

| Priority | Item | Effort |
|----------|------|--------|
| 🟡 Medium | NEW-ADMIN-006: Fix avatar colors in users table | Very Low (5 min) |
| 🟢 Low | NEW-ADMIN-005: Room Types in-memory CRUD mock | Low (30 min) |
| 🟢 Low | NEW-ADMIN-007: Breadcrumbs on edit pages | Medium (1 hr) |
