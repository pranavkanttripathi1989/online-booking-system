---
id: TP034
type: test-plan
feature: staff-appointments
created: 2026-04-02
updated: 2026-04-02
status: done
parent: unknown
related: [TR033, TS034]
---

# Staff Appointments — Test Plan (v2.0)

**Module:** Staff Appointments (`/staff/appointments`)
**Source:** `frontend/src/pages/staff/Appointments.jsx`
**Updated:** 2026-03-31 (Session QA v2.0)

---

## Feature Overview

Full appointment management table for staff. All data is MOCK_APPOINTMENTS inline state (no backend). Actions: single cancel (ConfirmDialog), bulk cancel (handleBulkCancel), edit (pre-filled dialog), book new, CSV export (Blob download). Filters: live search (patient/clinician name), status dropdown, from/to date range. Header chip shows "active · total".

---

## 1. Page Load & Layout

### TC-STFAPPT-01 — Page load
**Steps:** Navigate to `/staff/appointments`.
**Expected:** "Appointments" h2. "3 active · 4 total" chip. Export CSV + Book Appointment buttons. Table with 4 rows.

### TC-STFAPPT-02 — Table column headers
**Steps:** View table.
**Expected:** 9 columns: Checkbox, Date & Time, Patient, Clinician, Clinic & Room, Duration, Service & Price, Status, Actions.

---

## 2. Search & Status Filter

### TC-STFAPPT-03 — Search: by patient name
**Steps:** Type "Emma".
**Expected:** 1 row — Emma Wilson.

### TC-STFAPPT-04 — Search: by clinician name
**Steps:** Type "Marcus".
**Expected:** 1 row — James Brown (Dr. Marcus Osei).

### TC-STFAPPT-05 — Status filter: Completed
**Steps:** Select Status = Completed.
**Expected:** 1 row — Lily Chen. "Status: completed" chip with × delete.

### TC-STFAPPT-06 — Delete status chip
**Steps:** Filter by Completed; click × on chip.
**Expected:** Filter resets. All 4 rows return.

---

## 3. Date Range Filter

### TC-STFAPPT-09 — From date filter
**Steps:** Enter From = "2026-03-21".
**Expected:** 1 row — Omar Hassan. "From: 2026-03-21" chip.

### TC-STFAPPT-10 — From + To date range
**Steps:** From="2026-03-20" To="2026-03-20".
**Expected:** 3 rows (Emma, James, Lily). Two chips.

### TC-STFAPPT-22 — From only (no To)
**Steps:** From="2026-03-21" only.
**Expected:** Omar Hassan only (>= 2026-03-21). matchTo always true when toDate empty.

### TC-STFAPPT-23 — No results in range → empty state
**Steps:** From="2026-01-01" To="2026-01-31".
**Expected:** 0 rows. "No appointments match your current filters" italic message.

### TC-STFAPPT-28 — Search + date combined
**Steps:** Type "Emma" + From="2026-03-20" To="2026-03-20".
**Expected:** Only Emma Wilson (both filters pass).

### TC-STFAPPT-29 — Clear Filters button
**Steps:** Set search + Status + From + To; click "Clear Filters".
**Expected:** All filters reset. 4 rows. Button disappears.

---

## 4. Checkbox & Bulk Actions

### TC-STFAPPT-07 — Select single row
**Steps:** Check Emma Wilson checkbox.
**Expected:** Row highlighted. "1 selected" bulk bar with Cancel Selected + Export.

### TC-STFAPPT-08 — Select All
**Steps:** Click header checkbox.
**Expected:** All 4 selected. "4 selected" in bulk bar. Header shows indeterminate → checked.

### TC-STFAPPT-11 — Bulk cancel
**Steps:** Select James + Lily; click "Cancel Selected".
**Expected:** Both → "Cancelled" status. selected clears. Bulk bar disappears.

### TC-STFAPPT-25 — Bulk cancel after status filter
**Steps:** Filter Status=Completed; select Lily; click Cancel Selected; Clear Filters.
**Expected:** Lily cancelled. Filter chip still shows until cleared.

### TC-STFAPPT-26 — Bulk export
**Steps:** Select Emma + James; click bulk "Export".
**Expected:** "appointments.csv" downloads with 2 data rows.

### TC-STFAPPT-30 — Bulk cancel idempotent (already cancelled)
**Steps:** Select Omar Hassan; click Cancel Selected.
**Expected:** No error. Status stays "Cancelled". Table unchanged.

---

## 5. Single Row Actions

### TC-STFAPPT-12 — Cancel single via row icon
**Steps:** Click red × for Emma; confirm in ConfirmDialog.
**Expected:** Emma → "Cancelled". Red × disappears from row.

### TC-STFAPPT-13 — Cancel confirm dialog: dismiss
**Steps:** Click × for James; click "Cancel" in dialog.
**Expected:** Dialog closes. James still "Scheduled".

---

## 6. Edit Appointment

### TC-STFAPPT-18 — Edit icon opens pre-filled dialog
**Steps:** Click pencil on Emma Wilson.
**Expected:** "Edit Appointment" dialog with all fields pre-filled from Emma's data.

### TC-STFAPPT-19 — Edit: Save Changes updates row
**Steps:** Open edit for Emma; change Service to "Follow-up"; click Save Changes.
**Expected:** Emma row: service = "Follow-up".

### TC-STFAPPT-20 — Edit: Cancel reverts
**Steps:** Open edit; change fields; click Cancel.
**Expected:** No change to row. Dialog closed.

### TC-STFAPPT-27 — Edit pre-fill roundtrip for Omar Hassan
**Steps:** Click edit on Omar Hassan.
**Expected:** bookForm: patient="Omar Hassan", date="2026-03-21", time="09:00", clinic="City Heart Clinic", room="3A", duration=30.

---

## 7. Book Appointment

### TC-STFAPPT-14 — Book dialog opens empty
**Steps:** Click "Book Appointment".
**Expected:** "Book Appointment" dialog. All fields empty (controlled state reset).

### TC-STFAPPT-15 — Book: Submit creates row
**Steps:** Fill Patient="Hannah Lee", Date="2026-04-01", Time="09:00", Service="Physio"; click Book Appointment.
**Expected:** New row added: Hannah Lee, scheduled, 2026-04-01 09:00. Chip: "4 active · 5 total".

### TC-STFAPPT-16 — Book: Cancel clears form
**Steps:** Type in Patient; click Cancel.
**Expected:** Dialog closes. Form resets. Next open shows empty.

### TC-STFAPPT-24 — Book: Empty submit
**Steps:** Click Book Appointment; submit with no fields.
**Expected:** Row added as "New Patient / — / scheduled" (no validation currently — see SUG-010).

---

## 8. Export CSV

### TC-STFAPPT-21 — Export CSV (all filtered)
**Steps:** Click "Export CSV" header button.
**Expected:** Browser downloads "appointments.csv". Headers: ID, Date, Time, Patient, Clinician, Service, Status, Price. 4 rows.

---

## 9. Status Chip

### TC-STFAPPT-17 — Status chip colors
**Steps:** View all 4 rows.
**Expected:** Each status chip (confirmed/scheduled/completed/cancelled) renders with distinct color.

---

## Edge Cases

| # | Edge | Expected |
|---|------|----------|
| E1 | No rows after search → empty state | "No appointments match your current filters" in single full-width cell |
| E2 | Bulk cancel all non-cancelled rows | All rows show "Cancelled". Chip: "0 active · 4 total" |
| E3 | Book Appointment while filter active | New row added; may not appear in filtered view until filter adjusted |
| E4 | Edit then Cancel — no state bleed | Next "Book Appointment" click shows empty form (resetBook on cancel) |
| E5 | Export CSV with 0 rows | handleExportCSV([]): CSV with headers only, no data rows |
| E6 | Select all filtered; change Status filter | selected array not cleared — bulk bar count may mismatch visible rows (SUG-011 pending) |
| E7 | Omar Hassan (cancelled): pencil edit works | Edit icon always shown; CancelIcon hidden for cancelled rows only |
| E8 | Date From > To | matchFrom && matchTo: no rows (logically empty range). Empty state shown. |

---

## Total: 30 Test Cases + 8 Edge Cases
