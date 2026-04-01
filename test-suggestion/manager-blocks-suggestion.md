# Manager Blocks — Test Suggestions

**Source File:** `frontend/src/pages/manager/Blocks.jsx`  
**Last Updated:** 2026-03-30

---

### SUG-BLK-001 — Wire Page to Live Backend
**Status:** PENDING | **Priority:** 🔴 High  
**Notes:** Mock fallback is in place (`data?.spacerBlocks?.length ? data.spacerBlocks : MOCK_SPACER_BLOCKS`). Will auto-switch to live data when backend is available.

---

### SUG-BLK-002 — Mock Spacer Block Records
**Status:** ✅ COMPLETED  
**Notes:** `MOCK_SPACER_BLOCKS` — 5 records, all 5 recurrence types, with/without room, with/without reason, seed-aligned IDs. Verified: 5 cards render in offline mode.

---

### SUG-BLK-003 — Mock Room Block Records
**Status:** ✅ COMPLETED  
**Notes:** `MOCK_ROOM_BLOCKS` — 3 records (single, weekly, daily). Verified: 3 cards render on Room Blocks tab.

---

### SUG-BLK-004 — Frontend Time Validation (End > Start)
**Status:** ✅ COMPLETED  
**Notes:** `validateTimes(start, end)` helper. Called before both submit handlers. Returns `"End time must be after start time."` when `start >= end`. Fixes E4 (equal times) and E5 (end before start).

---

### SUG-BLK-005 — Close Forms on Tab Switch
**Status:** ✅ COMPLETED  
**Notes:** `handleTabChange` replaces inline `v && setTab(v)`. Calls `setShowSpacerForm(false)`, `setShowRoomForm(false)`, resets both form states and `formError`. Verified: form closes on tab switch.

---

### SUG-BLK-006 — Reason maxLength + Char Counter
**Status:** ✅ COMPLETED  
**Notes:** `inputProps={{ maxLength: 500 }}` + `helperText="${form.reason.length} / 500"`. Applied in shared `RecurrenceFields` component. Verified: "0 / 500" visible in screenshot.

---

### SUG-BLK-007 — aria-labels on Delete Buttons
**Status:** ✅ COMPLETED  
**Notes:** Spacer: `aria-label="Delete spacer block for Dr. <name>"`. Room: `aria-label="Delete room block for Room <number> at <clinic>"`. Tooltip: "Delete block". WCAG 2.1 SC 4.1.2.

---

### SUG-BLK-008 — ErrorBoundary Wrapper
**Status:** ✅ COMPLETED  
**Notes:** Page wrapped in reusable `<ErrorBoundary>`. Consistent with Availability and Billing.

---

### SUG-BLK-009 — Edit/Update Block Support
**Status:** PENDING | **Priority:** 🟡 Medium  
**Notes:** Only create + delete supported. No edit. Suggested: click card → pre-populated form, `updateSpacerBlock` / `updateRoomBlock` mutations.

---

### SUG-BLK-010 — End Date in-Past Validation
**Status:** PENDING | **Priority:** 🟢 Low  
**Notes:** `if (form.end_date && new Date(form.end_date) < new Date()) setFormError('End date cannot be in the past.')`.

---

### SUG-BLK-011 — Custom Recurrence: Require ≥1 Day
**Status:** PENDING | **Priority:** 🟢 Low  
**Notes:** `if (form.recurrence_type === 'custom' && form.recurrence_days.length === 0) setFormError('Select at least one day.')`.

---

### SUG-BLK-012 — Pagination for Large Lists
**Status:** PENDING | **Priority:** 🟢 Low  
**Notes:** Query limit is 500. `TablePagination` or infinite scroll for production.

---

### SUG-BLK-013 — Block Count in Tab Labels
**Status:** PENDING | **Priority:** 🟢 Low  
**Notes:** Show `(5)` / `(3)` inline in ToggleButton labels for at-a-glance counts.

---

### SUG-BLK-014 — Recurrence Detail on Cards
**Status:** PENDING | **Priority:** 🟢 Low  
**Notes:** Custom cards: show "Mon · Wed · Fri" instead of just "custom" chip. Daily/weekly with end_date: show "until Apr 30".

---

## Summary Table

| ID | Suggestion | Priority | Status |
|----|-----------|----------|--------|
| SUG-BLK-001 | Wire backend | 🔴 High | PENDING |
| SUG-BLK-002 | Mock spacer records | 🟡 Medium | ✅ COMPLETED |
| SUG-BLK-003 | Mock room records | 🟡 Medium | ✅ COMPLETED |
| SUG-BLK-004 | Time validation | 🟡 Medium | ✅ COMPLETED |
| SUG-BLK-005 | Close forms on tab switch | 🟡 Medium | ✅ COMPLETED |
| SUG-BLK-006 | Reason maxLength + counter | 🟢 Low | ✅ COMPLETED |
| SUG-BLK-007 | aria-labels on delete | 🟡 Medium | ✅ COMPLETED |
| SUG-BLK-008 | ErrorBoundary | 🟡 Medium | ✅ COMPLETED |
| SUG-BLK-009 | Edit/update blocks | 🟡 Medium | PENDING |
| SUG-BLK-010 | End date validation | 🟢 Low | PENDING |
| SUG-BLK-011 | Custom ≥1 day check | 🟢 Low | PENDING |
| SUG-BLK-012 | Pagination | 🟢 Low | PENDING |
| SUG-BLK-013 | Count badge in tabs | 🟢 Low | PENDING |
| SUG-BLK-014 | Recurrence detail on cards | 🟢 Low | PENDING |
