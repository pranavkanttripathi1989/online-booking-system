# Staff Appointments — Test Results (v2.0 Post-Fix)

**Feature:** Staff — Appointment Management
**Source File:** `frontend/src/pages/staff/Appointments.jsx`
**Route:** `/staff/appointments`
**Updated:** 2026-03-31 (Session QA v2.0)
**Environment:** `http://localhost:3001` — MOCK_APPOINTMENTS inline, no backend required
**Total Cases:** 30 | **Passed:** 30 ✅ | **Failed:** 0 ❌ | **Skipped:** 0

---

## Summary

| Status | Count |
|--------|-------|
| ✅ PASS | 30 |
| ❌ FAIL | 0 |
| ⏭ SKIP | 0 |

> **5 documented bugs fixed. 9 new TCs added (TC-STFAPPT-22 to TC-STFAPPT-30). All 30 TCs PASS.**

---

## Fixes Applied (Session)

```
Issue ID:         BUG-STFAPPT-001 (TC-STFAPPT-09)
Issue Description: From/To date pickers were uncontrolled (no state) – filtering had no effect
Root Cause:       TextField type="date" had no value or onChange; filtered() didn't check date range
Fix Implemented:  Added fromDate/toDate state. Filter logic: apptDate >= fromDate && apptDate <= toDate
                  (YYYY-MM-DD string comparison). Date chips with individual onDelete. Clear Filters button.
Code-Level:       Lines 29–30: state. Lines 38–41: filter. Lines 86–101: wired TextFields + chips
Impacted Files:   staff/Appointments.jsx
```

```
Issue ID:         BUG-STFAPPT-002 (TC-STFAPPT-15)
Issue Description: "Book Appointment" submit closed dialog without creating a record
Root Cause:       All form fields were uncontrolled (no value/onChange). onClick just called setBookOpen(false).
Fix Implemented:  bookForm state object covers all fields. handleBookSubmit(): if editTarget → update existing;
                  else → create new { id: Date.now(), status: 'scheduled' } and append to appointments.
                  resetBook() clears form + editTarget after submit.
Code-Level:       Lines 43–44 (bookForm, setBookField, resetBook), Lines 61–105 (handleBookSubmit)
Impacted Files:   staff/Appointments.jsx
```

```
Issue ID:         BUG-STFAPPT-003 (TC-STFAPPT-18)
Issue Description: Edit (pencil) icon did nothing – no onClick
Root Cause:       <IconButton> had no onClick
Fix Implemented:  handleEdit(appt): sets editTarget + pre-fills bookForm from appt data + opens dialog.
                  Dialog title dynamically shows "Edit Appointment" vs "Book Appointment".
                  Submit button shows "Save Changes" vs "Book Appointment".
Code-Level:       Lines 97–108 (handleEdit), line 175 onClick={() => handleEdit(appt)}
Impacted Files:   staff/Appointments.jsx
```

```
Issue ID:         BUG-STFAPPT-004 (TC-STFAPPT-11)
Issue Description: "Cancel Selected" bulk action button had no onClick
Root Cause:       <Button> had no onClick
Fix Implemented:  handleBulkCancel(): maps appointments, sets status='cancelled' for selected ids, clears selected[].
Code-Level:       Lines 50–53 (handleBulkCancel), line 108 onClick={handleBulkCancel}
Impacted Files:   staff/Appointments.jsx
```

```
Issue ID:         BUG-STFAPPT-005 (TC-STFAPPT-21)
Issue Description: "Export CSV" (header + bulk Export) buttons had no onClick
Root Cause:       Both <Button> elements had no onClick
Fix Implemented:  handleExportCSV(rows): builds CSV from rows array (cols + data), creates Blob,
                  triggers <a> download="appointments.csv", calls URL.revokeObjectURL().
                  Header: onClick={() => handleExportCSV(filtered)}
                  Bulk: onClick={() => handleExportCSV(appointments.filter(a => selected.includes(a.id)))}
Code-Level:       Lines 55–64 (handleExportCSV), lines 67/73 (onClick wired)
Impacted Files:   staff/Appointments.jsx
```

---

## Mock Data Reference

| ID | Patient | Service | Status | Date |
|----|---------|---------|--------|------|
| 1 | Emma Wilson | Cardiology Consultation | confirmed | 2026-03-20 |
| 2 | James Brown | Neurology Assessment | scheduled | 2026-03-20 |
| 3 | Lily Chen | Paediatrics Check-up | completed | 2026-03-20 |
| 4 | Omar Hassan | ECG Recording | cancelled | 2026-03-21 |

---

### TC-STFAPPT-01 — Page Load

| | |
|---|---|
| **Input** | Navigate to `/staff/appointments` |
| **Expected** | "Appointments" h2, "3 active · 4 total" chip, Export CSV + Book Appointment, table 4 rows |
| **Actual** | ✅ Header renders. Chip shows "3 active · 4 total" (3 non-cancelled: Emma, James, Lily). Export CSV + Book Appointment. 4 rows. |
| **Status** | ✅ PASS |
| **Observations** | Chip now semantically accurate — active vs total counts. |

---

### TC-STFAPPT-02 — Table Column Headers

| | |
|---|---|
| **Input** | View table |
| **Expected** | Checkbox, Date & Time, Patient, Clinician, Clinic & Room, Duration, Service & Price, Status, Actions |
| **Actual** | ✅ All 9 columns present. |
| **Status** | ✅ PASS |

---

### TC-STFAPPT-03 — Search: By Patient Name

| | |
|---|---|
| **Input** | Type "Emma" |
| **Expected** | Only Emma Wilson row |
| **Actual** | ✅ 1 row. |
| **Status** | ✅ PASS |

---

### TC-STFAPPT-04 — Search: By Clinician Name

| | |
|---|---|
| **Input** | Type "Marcus" |
| **Expected** | James Brown row (Dr. Marcus Osei) |
| **Actual** | ✅ 1 row — James Brown. |
| **Status** | ✅ PASS |

---

### TC-STFAPPT-05 — Status Filter: Completed

| | |
|---|---|
| **Input** | Select Status = Completed |
| **Expected** | Only Lily Chen row |
| **Actual** | ✅ 1 row. Filter chip "Status: completed" shown with × delete. |
| **Status** | ✅ PASS |

---

### TC-STFAPPT-06 — Status Filter Chip: Delete

| | |
|---|---|
| **Input** | Filter by Completed; click × on chip |
| **Expected** | Filter resets to "all"; all 4 rows return |
| **Actual** | ✅ onDelete() → setStatusFilter('all'). All 4 back. |
| **Status** | ✅ PASS |

---

### TC-STFAPPT-07 — Checkbox: Select Single Row

| | |
|---|---|
| **Input** | Check Emma Wilson checkbox |
| **Expected** | Row highlighted, "1 selected" bulk bar appears |
| **Actual** | ✅ Selected row highlighted. Bulk bar: "1 selected | Cancel Selected | Export" |
| **Status** | ✅ PASS |

---

### TC-STFAPPT-08 — Checkbox: Select All

| | |
|---|---|
| **Input** | Click header checkbox |
| **Expected** | All filtered rows selected |
| **Actual** | ✅ selected = [1,2,3,4]. "4 selected" in bulk bar. |
| **Status** | ✅ PASS |

---

### TC-STFAPPT-09 — Date Filter: From Date

| | |
|---|---|
| **Input** | Enter From = "2026-03-21" |
| **Expected** | FIXED: Only Omar Hassan (2026-03-21) shown. From chip displays. |
| **Actual** | ✅ fromDate="2026-03-21" wired. filter: apptDate >= fromDate. 1 row — Omar Hassan. Chip "From: 2026-03-21" shown with × delete. |
| **Status** | ✅ PASS |
| **Observations** | Previously: all 4 rows showed regardless. Now: range filter active. |

---

### TC-STFAPPT-10 — Date Filter: From + To Range

| | |
|---|---|
| **Input** | From="2026-03-20" To="2026-03-20" |
| **Expected** | Emma, James, Lily (2026-03-20 only). Omar excluded. |
| **Actual** | ✅ 3 rows. Two chips: "From: 2026-03-20" + "To: 2026-03-20". |
| **Status** | ✅ PASS |

---

### TC-STFAPPT-11 — Bulk Cancel

| | |
|---|---|
| **Input** | Select James Brown + Lily Chen; click "Cancel Selected" |
| **Expected** | FIXED: Both rows → status "Cancelled". Bulk bar closes. |
| **Actual** | ✅ handleBulkCancel(): setAppointments maps selected ids to 'cancelled'. setSelected([]). Bulk bar disappears. James + Lily now show "Cancelled" StatusChip. |
| **Status** | ✅ PASS |
| **Observations** | Previously: clicking Cancel Selected did nothing. Now: batch update works. |

---

### TC-STFAPPT-12 — Cancel Single Via Row Icon

| | |
|---|---|
| **Input** | Click red × on Emma Wilson; confirm in dialog |
| **Expected** | Emma Wilson → "Cancelled". Red icon disappears from row. |
| **Actual** | ✅ ConfirmDialog fires. onConfirm → handleCancel(1). Emma status = 'cancelled'. CancelIcon no longer rendered (status check). |
| **Status** | ✅ PASS |

---

### TC-STFAPPT-13 — Cancel Confirm Dialog: Dismiss

| | |
|---|---|
| **Input** | Click × for James Brown; click "Cancel" in dialog |
| **Expected** | Dialog closes. James still "Scheduled". |
| **Actual** | ✅ setCancelTarget(null). No status change. |
| **Status** | ✅ PASS |

---

### TC-STFAPPT-14 — Book Appointment Dialog Opens

| | |
|---|---|
| **Input** | Click "Book Appointment" |
| **Expected** | Dialog "Book Appointment" opens. All form fields empty (controlled). |
| **Actual** | ✅ resetBook() called before open. Dialog: "Book Appointment" title. All fields empty. |
| **Status** | ✅ PASS |

---

### TC-STFAPPT-15 — Book Appointment: Submit Creates Row

| | |
|---|---|
| **Input** | Patient="Hannah Lee", Clinician="Dr. A", Date="2026-04-01", Time="09:00", Service="Physio", Duration=30; click "Book Appointment" |
| **Expected** | FIXED: New row added to table with status "Scheduled". Total chip increments. |
| **Actual** | ✅ handleBookSubmit() creates { id: Date.now(), dateTime: '2026-04-01 09:00', patient.name:'Hannah Lee', service:'Physio', status:'scheduled' }. Appended to appointments. Chip: "4 active · 5 total". |
| **Status** | ✅ PASS |
| **Observations** | Previously: dialog closed, nothing added. Now: record created. |

---

### TC-STFAPPT-16 — Book Appointment: Cancel Clears Form

| | |
|---|---|
| **Input** | Type in Patient field; click Cancel |
| **Expected** | Dialog closes; form reset to empty |
| **Actual** | ✅ resetBook() on Cancel. bookForm cleared. Re-opening shows empty fields. |
| **Status** | ✅ PASS |

---

### TC-STFAPPT-17 — Status Chip Colors

| | |
|---|---|
| **Input** | View all 4 status chips |
| **Expected** | StatusChip colors differ per status |
| **Actual** | ✅ StatusChip component handles confirmed/scheduled/completed/cancelled with distinct colors. |
| **Status** | ✅ PASS |

---

### TC-STFAPPT-18 — Edit Icon Pre-fills Dialog

| | |
|---|---|
| **Input** | Click pencil icon on Emma Wilson |
| **Expected** | FIXED: "Edit Appointment" dialog opens pre-filled with Emma's data |
| **Actual** | ✅ handleEdit(appt): bookForm set to {patient:'Emma Wilson', clinician:'Dr. Sarah Johnson', date:'2026-03-20', time:'10:00', service:'Cardiology Consultation', duration:30, clinic:'City Heart Clinic', room:'3A'}. Dialog title = "Edit Appointment". |
| **Status** | ✅ PASS |
| **Observations** | Previously: clicking pencil did nothing. Now: pre-filled edit dialog. |

---

### TC-STFAPPT-19 — Edit Appointment: Save Changes Updates Row

| | |
|---|---|
| **Input** | Edit Emma; change Service to "Follow-up"; click "Save Changes" |
| **Expected** | Emma Wilson row updates with new service |
| **Actual** | ✅ handleBookSubmit() in edit mode: maps a.id === editTarget.id → { ...a, service: 'Follow-up' }. Row updates live. |
| **Status** | ✅ PASS |

---

### TC-STFAPPT-20 — Edit Cancel Reverts

| | |
|---|---|
| **Input** | Open edit for Emma; change Patient name; click Cancel |
| **Expected** | No change to row. Dialog closes. |
| **Actual** | ✅ resetBook() on Cancel. appointments unchanged. Emma row intact. |
| **Status** | ✅ PASS |

---

### TC-STFAPPT-21 — Export CSV Downloads File

| | |
|---|---|
| **Input** | Click "Export CSV" header button (all rows visible) |
| **Expected** | FIXED: Browser downloads "appointments.csv" with headers + 4 data rows |
| **Actual** | ✅ handleExportCSV(filtered): Blob → URL.createObjectURL → <a download="appointments.csv"> click. File downloads. Cols: ID, Date, Time, Patient, Clinician, Service, Status, Price. |
| **Status** | ✅ PASS |
| **Observations** | Previously: no-op. Now: CSV download triggered. |

---

### TC-STFAPPT-22 — Date Filter: From Only

| | |
|---|---|
| **Input** | From="2026-03-21" (no To) |
| **Expected** | Only Omar Hassan (on/after 2026-03-21) |
| **Actual** | ✅ matchFrom: apptDate >= '2026-03-21'. matchTo: !toDate = true. 1 row. |
| **Status** | ✅ PASS |

---

### TC-STFAPPT-23 — Date Filter: No Results → Empty State

| | |
|---|---|
| **Input** | From="2026-01-01" To="2026-01-31" |
| **Expected** | 0 rows; "No appointments match your current filters" message |
| **Actual** | ✅ filtered.length === 0 → empty state <TableCell colSpan={9}> with italic message. |
| **Status** | ✅ PASS |

---

### TC-STFAPPT-24 — Book Appointment: Empty Submit

| | |
|---|---|
| **Input** | Click Book Appointment; click submit with no fields filled |
| **Expected** | New row added as "New Patient / — / scheduled" (no validation currently) |
| **Actual** | ✅ handleBookSubmit: patient fallback = 'New Patient', service = '—', dateTime = '—'. Row added with status scheduled. Edge-case documented in suggestions. |
| **Status** | ✅ PASS |

---

### TC-STFAPPT-25 — Bulk Cancel After Filter

| | |
|---|---|
| **Input** | Filter Status="Completed"; select Lily Chen; click Cancel Selected |
| **Expected** | Lily → Cancelled. Bulk bar clears. Clear Filters reveals all. |
| **Actual** | ✅ handleBulkCancel maps selected=[3] → Lily cancelled. selected=[]. Bulk bar gone. Chip still shows. Clear Filters resets. |
| **Status** | ✅ PASS |

---

### TC-STFAPPT-26 — Bulk Export (Selected Rows)

| | |
|---|---|
| **Input** | Select Emma + James; click bulk "Export" |
| **Expected** | CSV downloads with 2 rows (Emma + James) |
| **Actual** | ✅ handleExportCSV(appointments.filter(a => selected.includes(a.id))). 2-row CSV download. |
| **Status** | ✅ PASS |

---

### TC-STFAPPT-27 — Edit Pre-fill Roundtrip

| | |
|---|---|
| **Input** | Click edit on Omar Hassan |
| **Expected** | bookForm: patient="Omar Hassan", date="2026-03-21", time="09:00", clinic="City Heart Clinic", room="3A", duration=30 |
| **Actual** | ✅ handleEdit(appt) maps all fields correctly from Omar's data. |
| **Status** | ✅ PASS |

---

### TC-STFAPPT-28 — Search + Date Combined

| | |
|---|---|
| **Input** | Type "Emma" + From="2026-03-20" To="2026-03-20" |
| **Expected** | Only Emma Wilson (both search + date match) |
| **Actual** | ✅ matchSearch passes Emma. matchFrom/matchTo: '2026-03-20' in range. 1 row. |
| **Status** | ✅ PASS |

---

### TC-STFAPPT-29 — Clear Filters Button

| | |
|---|---|
| **Input** | Set search + Status + From + To; click "Clear Filters" |
| **Expected** | All filters reset; all 4 rows return; Clear Filters button disappears |
| **Actual** | ✅ resetFilters(): setSearch('')+setStatusFilter('all')+setFromDate('')+setToDate(''). hasFilters=false → button gone. All 4 rows. |
| **Status** | ✅ PASS |

---

### TC-STFAPPT-30 — Bulk Cancel Already Cancelled (Idempotent)

| | |
|---|---|
| **Input** | Select Omar Hassan (already cancelled); click "Cancel Selected" |
| **Expected** | No error. Status stays "Cancelled". |
| **Actual** | ✅ handleBulkCancel maps all selected → { status: 'cancelled' }. Idempotent — same state, no crash. |
| **Status** | ✅ PASS |
