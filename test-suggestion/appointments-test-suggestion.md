# Appointments — Feature Suggestions (v3 — All Done)

**Derived from:** [appointments-test-results.md](../test-result/appointments-test-results.md)  
**Test Plan Source:** [appointments-test-plan.md](../test-plan/appointments-test-plan.md)  
**Original Date:** 2026-03-16 | **v3 Updated:** 2026-03-27  
**Tested by:** Antigravity AI Browser Agent

> **STATUS UPDATE (2026-03-27 v3):** All 16 suggestions and new recommendations are now **DONE**. SUG-APPT-006 (bulk selection), SUG-APPT-010 (reschedule dialog), SUG-APPT-012 (service-specific checklist), and NEW-APPT-004 (reminder channel selection) implemented and verified. The Appointments module is production-ready in mock mode.

---

## Implementation Status — All Complete

| ID | Suggestion | Priority | Status | Notes |
|----|-----------|----------|--------|-------|
| SUG-APPT-001 | White-screen crash fix (try/catch in renderCell) | 🔴 Critical | ✅ **DONE** | `try/catch` wraps `getRowIndexRelativeToVisibleRows`; fallback `params.row?.index ?? ''` |
| SUG-APPT-002 | Cancel dialog: optimistic update + warning snackbar | 🟡 Medium | ✅ **DONE** | `setOptimisticCancelled(Set)` → `displayRows` applies `status:'cancelled'` immediately |
| SUG-APPT-003 | Contextual "No results" empty state | 🟡 Medium | ✅ **DONE** | `EmptyState({ hasFilters, onClearFilters })` — contextual text + inline "Clear all filters" |
| SUG-APPT-004 | Tooltip on "Clear Filters" icon | 🟡 Medium | ✅ **DONE** | `<Tooltip title="Clear filters">` wraps FilterAltOffIcon |
| SUG-APPT-005 | Inline status change (context menu on chip click) | 🟡 Medium | ✅ **DONE** | Clickable chip → MUI Menu; `statusOverrides` state; terminal statuses locked |
| SUG-APPT-006 | Bulk row selection + bulk cancel + bulk export | 🟡 Medium | ✅ **DONE (v3)** | DataGrid `checkboxSelection`; CSS-animated action bar; normalised MUI v6 selection model |
| SUG-APPT-007 | Sidebar badge showing pending appointment count | 🟢 Low | ✅ **DONE** | Amber badge on Appointments nav item from MockStore |
| SUG-APPT-008 | Upcoming / Past / All tab strip | 🟡 Medium | ✅ **DONE** | 3-tab strip; defaults to Upcoming; tab switches reset date filters |
| SUG-APPT-009 | Export appointments as CSV (10 columns) | 🟡 Medium | ✅ **DONE** | Blob API; 10 columns incl. Room + Clinic; file named by tab |
| SUG-APPT-010 | Dedicated reschedule dialog with DateTimePickers | 🟡 Medium | ✅ **DONE (v3)** | `RescheduleDialog` with start/end pickers; end-before-start validation; optimistic mock update |
| SUG-APPT-011 | "Send Reminder" button on appointment detail | 🟢 Low | ✅ **DONE** | Teal button in Actions card; 1.5s stub |
| SUG-APPT-012 | Service-specific pre-visit checklist | 🟢 Low | ✅ **DONE (v3)** | `SERVICE_CHECKLISTS` map with 10 service entries + default; partial-match lookup; label shown |
| NEW-APPT-001 | Upcoming tab boundary → current datetime | 🔴 High | ✅ **DONE** | `dayjs()` instead of `dayjs().startOf('day')` |
| NEW-APPT-002 | Export CSV → Room + Clinic columns | 🟢 Low | ✅ **DONE** | 10-column CSV; snackbar confirms "(10 columns)" |
| NEW-APPT-003 | Past tab boundary → current datetime | 🟢 Low | ✅ **DONE** | `dateTo = dayjs()` for Past tab |
| NEW-APPT-004 | Send Reminder channel selection (Email/SMS) | 🟡 Medium | ✅ **DONE (v3)** | `ReminderDialog` with Email/SMS radio; disabled if contact missing; snackbar cites channel |

---

## v3 Implementation Notes

### SUG-APPT-006 — Bulk Row Selection
**File:** `appointments/index.jsx`  
- `checkboxSelection` on DataGrid; `rowSelectionModel` state (always plain string-ID array)
- `handleRowSelectionChange(model)` normalises MUI v5 (array) and v6 (`{type, ids:Set}`) forms
- CSS animated action bar using `max-height`/`opacity` transition (Slide removed — ref issue)
- `handleBulkCancel()`: filters non-terminal rows, applies `setOptimisticCancelled`, fires mutations
- `handleExportSelected()`: exports only selected rows as 10-column CSV
- Teal checkbox highlight via MUI DataGrid `sx` overrides

### SUG-APPT-010 — Reschedule Dialog
**File:** `appointments/detail.jsx`  
- `RescheduleDialog({ open, apt, onClose, onSave })` using `@mui/x-date-pickers/DateTimePicker`
- Shows current appointment date in subtitle for reference
- End-before-start validation: error helperText + disables Confirm button
- `MockStore.updateAppointment?.()` called optimistically on confirm
- Purple "Reschedule" outlined button added to Actions panel (above Cancel)

### SUG-APPT-012 — Service-Specific Pre-visit Checklist
**File:** `appointments/detail.jsx`  
- `SERVICE_CHECKLISTS` map: 10 entries (GP, Mental Health, Physiotherapy, Child Health, Dermatology, Dental, Cardiology, X-Ray, Lab Test, default)
- `getChecklist(serviceName)`: exact match → partial match → `default`
- "Specific to: [Service Name]" label shown when service is known
- `CheckCircleRoundedIcon` bullet per item

### NEW-APPT-004 — Reminder Channel Selection
**File:** `appointments/detail.jsx`  
- `ReminderDialog({ open, onClose, onSend, patientEmail, patientPhone })`
- RadioGroup with "Email" and "SMS" options; each disabled if contact missing, shows "No [channel] on file" Chip
- Button label dynamically updates: "Send via Email" / "Send via SMS"
- `handleSendReminder(channel)` updates channel in snackbar: "Reminder sent via EMAIL/SMS to [contact]"

---

## Priority Queue — All Resolved

| Priority | Item | Status |
|----------|------|--------|
| ✅ Done | SUG-APPT-006 — Bulk row selection + actions | **DONE v3** |
| ✅ Done | SUG-APPT-010 — Reschedule dialog | **DONE v3** |
| ✅ Done | SUG-APPT-012 — Service-specific pre-visit checklist | **DONE v3** |
| ✅ Done | NEW-APPT-004 — Send Reminder channel selection | **DONE v3** |
| ✅ Done | All other 12 suggestions | **DONE (prev sessions)** |
