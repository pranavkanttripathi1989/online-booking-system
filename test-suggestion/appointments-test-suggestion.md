# Appointments — Feature Suggestions (Updated Post-Implementation)

**Derived from:** [appointments-test-results.md](../test-result/appointments-test-results.md)  
**Test Plan Source:** [appointments-test-plan.md](../test-plan/appointments-test-plan.md)  
**Original Date:** 2026-03-16 | **Updated:** 2026-03-18  
**Tested by:** Antigravity AI Browser Agent

> **STATUS UPDATE (2026-03-19 Session 3):** NEW-APPT-001/002/003 and SUG-APPT-005/007 implemented and browser-verified. Tab boundaries now use `dayjs()` (current time); CSV has 10 columns with Room+Clinic; inline status chip menu with optimistic overrides; sidebar amber pending badge. Only backend-dependent features and high-effort UI features remain.

---

## Implementation Status

| ID | Suggestion | Priority | Status | Notes |
|----|-----------|----------|--------|-------|
| SUG-APPT-001 | White-screen crash fix (try/catch in renderCell) | 🔴 Critical | ✅ **DONE** | `try/catch` wraps `getRowIndexRelativeToVisibleRows`; fallback: `params.row?.index ?? ''` |
| SUG-APPT-002 | Cancel dialog: optimistic update + warning snackbar | 🟡 Medium | ✅ **DONE** | `setOptimisticCancelled(Set)` → `displayRows` applies `status: 'cancelled'` immediately |
| SUG-APPT-003 | Contextual "No results" empty state | 🟡 Medium | ✅ **DONE** | `EmptyState({ hasFilters, onClearFilters })` — shows contextual text + inline "Clear all filters" button |
| SUG-APPT-004 | Tooltip on "Clear Filters" icon | 🟡 Medium | ✅ **DONE** | `<Tooltip title="Clear filters">` already present from original implementation |
| SUG-APPT-008 | Upcoming / Past / All tab toggle | 🟡 Medium | ✅ **DONE** | 3-tab Tabs strip; defaults to "Upcoming"; switching tabs resets date filters; subtitle reflects tab |
| SUG-APPT-009 | Export appointments as CSV | 🟡 Medium | ✅ **DONE** | Blob API CSV with 8 columns; filename includes active tab; respects current filter state |
| SUG-APPT-011 | "Send Reminder" button on appointment detail | 🟢 Low | ✅ **DONE** | Teal outlined button in Actions panel; 1.5s stub delay → snackbar "Reminder sent to [email]" |
| SUG-APPT-005 | Inline status change (context menu / dropdown) | 🟡 Medium | ✅ **DONE** | Clickable status chip → MUI Menu with 4-dot status options; `statusOverrides` state + `useMemo` merge; terminal statuses locked |
| SUG-APPT-006 | Bulk row selection + bulk actions | 🟡 Medium | ⏳ Pending | Not yet implemented — high effort |
| SUG-APPT-007 | Sidebar badge showing pending appointment count | 🟢 Low | ✅ **DONE** | `useMemo(MockStore.getAppointments({status:'pending'}).length)` → amber `#F9AB00` badge on Appointments nav item |
| SUG-APPT-010 | Dedicated reschedule flow with slot picker | 🟡 Medium | ⏳ Pending | Not yet implemented |
| SUG-APPT-012 | Service-specific pre-visit checklist | 🟢 Low | ⏳ Pending | Admin panel config required |
| NEW-APPT-001 | Upcoming tab boundary → current datetime (not start of day) | 🔴 High | ✅ **DONE** | `dayjs()` replaces `dayjs().startOf('day')` preventing no-man's-land appointments |
| NEW-APPT-002 | Export CSV → add Room + Clinic columns | 🟢 Low | ✅ **DONE** | 10-column CSV: added `r.room?.name` and `r.clinic?.name`. Snackbar confirms "(10 columns)" |
| NEW-APPT-003 | Past tab boundary → current datetime (not end of prev day) | 🟢 Low | ✅ **DONE** | Same fix as NEW-APPT-001: `dateTo = dayjs()` for Past tab |
| NEW-APPT-004 | Send Reminder channel selection (Email/SMS) | 🟡 Medium | ⏳ Pending | Stub still. Needs backend + split button or dropdown |

---

## Detailed Implementation Notes

### SUG-APPT-001 — White-Screen Crash Fix
**File:** `appointments/index.jsx` — column `#` renderCell  
```js
// BEFORE (crashes on DataGrid unmount during navigation):
renderCell: (params) => paginationModel.page * paginationModel.pageSize
  + params.api.getRowIndexRelativeToVisibleRows(params.id) + 1

// AFTER (safe with fallback):
renderCell: (params) => {
  try {
    return paginationModel.page * paginationModel.pageSize
      + params.api.getRowIndexRelativeToVisibleRows(params.id) + 1
  } catch {
    return params.row?.index ?? ''
  }
}
```

### SUG-APPT-002 — Optimistic Cancel
**File:** `appointments/index.jsx`  
- Added `const [optimisticCancelled, setOptimisticCancelled] = useState(new Set())`
- `handleOptimisticCancel(id, reason)`: immediately adds `id` to `optimisticCancelled`, fires mutation, shows warning snackbar
- `displayRows = useMemo(() => rows.map(r => optimisticCancelled.has(r.id) ? { ...r, status: 'cancelled' } : r), ...)`
- `CancelDialog.onConfirm` → `handleOptimisticCancel` (replaces direct `cancelAppointment()` call)

### SUG-APPT-003 — Contextual Empty State
**File:** `appointments/index.jsx`  
- `EmptyState` now accepts `{ hasFilters, onClearFilters }` props
- When `hasFilters = true`: shows "No appointments match your filters" + sub-message + red "Clear all filters" button
- When `hasFilters = false`: shows "No appointments yet" + "Create a new booking"
- `hasActiveFilters = !!(search || status !== 'all' || clinicianId || dateFrom || dateTo || viewTab !== 'all')`
- DataGrid `noRowsOverlay` slot updated: `() => <EmptyState hasFilters={hasActiveFilters} onClearFilters={handleClearFilters} />`

### SUG-APPT-008 — Upcoming / Past / All Tabs
**File:** `appointments/index.jsx`  
- Added `const [viewTab, setViewTab] = useState('upcoming')`
- `handleTabChange(_, newTab)`: sets tab, resets `dateFrom`/`dateTo`, resets pagination
- Tab bounds applied to mock filter: `tabDateFrom = viewTab === 'upcoming' ? today.format('YYYY-MM-DD') : undefined`
- `MockStore.getAppointments({ dateFrom: dateFrom ?? tabDateFrom, dateTo: dateTo ?? tabDateTo })`
- Subtitle: `` `${total} ${viewTab !== 'all' ? viewTab : 'total'} appointments` ``
- MUI `<Tabs>` with 3 `<Tab>` entries; blue `#1A73E8` indicator

### SUG-APPT-009 — Export CSV
**File:** `appointments/index.jsx`  
- `handleExport()` reads `displayRows` (respects optimistic cancels)
- Columns: `[ID, Patient, Email, Clinician, Service, Date & Time, Duration (min), Status]`
- Blob API → `URL.createObjectURL` → programmatic click → cleanup
- Filename: `` `appointments_${viewTab}_${dayjs().format('YYYY-MM-DD')}.csv` ``
- Shows count in snackbar: `"Exported 35 appointments as CSV"`
- "Export CSV" outlined button added next to "New Booking" in header

### SUG-APPT-011 — Send Reminder
**File:** `appointments/detail.jsx`  
- Import `NotificationsRoundedIcon`
- Added `const [reminderSending, setReminderSending] = useState(false)`
- `handleSendReminder()`: 1.5s `setTimeout` → snackbar `"Reminder sent to ${email/phone}"`
- Teal outlined button below "Cancel Appointment" in Actions card
- **Next step**: wire to `SEND_REMINDER_MUTATION({ variables: { appointmentId, channel } })`

---

## New Recommendations (Discovered During Implementation)

### NEW-APPT-001 — Upcoming tab should exclude "today's past" appointments
**Observation:** The "Upcoming" tab uses `dateFrom = today` (start of day), so appointments that started earlier today (e.g., 09:00 appointment at now=15:00) appear in "Upcoming" but are effectively in the past.  
**Fix:** Use `dateFrom = dayjs().format('YYYY-MM-DDTHH:mm')` (current time, not start of day) to only show future appointments in the true sense.  
**Priority:** 🟡 Medium | **Effort:** Very Low (1 line change)

### NEW-APPT-002 — Export CSV doesn't include clinic/room fields
**Observation:** The current CSV export exports `[ID, Patient, Email, Clinician, Service, Date & Time, Duration, Status]`. It omits `room.name` and `clinic.name` which are frequently needed for scheduling reports.  
**Fix:** Add `Room` and `Clinic` columns to the export: `r.room?.name ?? ''` and `r.clinic?.name ?? ''`.  
**Priority:** 🟢 Low | **Effort:** Very Low

### NEW-APPT-003 — "Past" tab should have a clearer time boundary
**Observation:** "Past" tab uses `tabDateTo = today.subtract(1, 'day')`. This means appointments from earlier today are in a grey zone — not shown in either "Upcoming" or "Past" (they'd need "All"). Consider "today" as its own category or include today's elapsed appointments in "Past".  
**Fix (option):** Change Past to `dateTo = dayjs().format('YYYY-MM-DDTHH:mm')` (anything before now).  
**Priority:** 🟢 Low | **Effort:** Very Low (same line as NEW-APPT-001)

### NEW-APPT-004 — Send Reminder should support channel selection (Email vs SMS)
**Observation:** Current "Send Reminder" is a stub. When real backend is available, the API likely needs a `channel` parameter.  
**Fix:** Replace button with a split button or dropdown: "Via Email" / "Via SMS". Show "Last reminder sent: [date]" below when available.  
**Priority:** 🟡 Medium | **Effort:** Low (when backend is ready)

---

## Updated Priority Queue

| Priority | Item | Effort | Status |
|----------|------|--------|--------|
| 🟡 Medium | SUG-APPT-004 backend — Send Reminder channel (Email vs SMS) | Low | ⏳ Pending |
| 🟡 Medium | SUG-APPT-010 — Dedicated reschedule flow + slot picker | Medium | ⏳ Pending |
| 🟢 Low | SUG-APPT-006 — Bulk row selection + actions | High | ⏳ Pending |
| 🟢 Low | SUG-APPT-012 — Service-specific pre-visit checklist | Medium | ⏳ Pending |
| ✅ Done | NEW-APPT-001 — Upcoming tab boundary to current datetime | Very Low | ✅ DONE |
| ✅ Done | NEW-APPT-002 — Add Room/Clinic to export CSV (10 columns) | Very Low | ✅ DONE |
| ✅ Done | NEW-APPT-003 — Past tab boundary to current datetime | Very Low | ✅ DONE |
| ✅ Done | SUG-APPT-005 — Inline status change per row | Medium | ✅ DONE |
| ✅ Done | SUG-APPT-007 — Pending appointment count badge on sidebar | Low | ✅ DONE |
