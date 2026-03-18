# Staff Appointments — Test Results

**Feature:** Staff — Appointment Management  
**Test Plan:** [staff-appointments-test-plan-not-done.md](../test-plan/staff/staff-appointments-test-plan-not-done.md)  
**Source File:** `frontend/src/pages/staff/Appointments.jsx` (259 lines)  
**Route:** `/staff/appointments`  
**Executed:** 2026-03-17  
**Tester:** Antigravity AI (Live Browser + Source Review)  
**Environment:** `http://localhost:3001` as Admin User (Staff route) — **MOCK_APPOINTMENTS inline data, no backend**  
**Total Cases:** 21 | **Edge Cases:** 4

---

## Summary

| Status | Count |
|--------|-------|
| ✅ PASS | 15 |
| ❌ FAIL (Documented Bug) | 5 |
| ⚠️ OBSERVATION (E4) | 1 |
| ⏭ SKIPPED | 0 |

> **15/21 test cases PASS.** 5 documented bugs confirmed: Date pickers UI-only, Bulk action buttons no-op, Edit icon no-op, Book submit no mutation, Export CSV no-op. Empty table has no empty state message.

---

## Screenshots

![Initial Page Load — All 4 Appointments](file:///Users/pranavkanttripathi/.gemini/antigravity/brain/3064dd61-17bb-423a-8714-98b350a1ea98/staff_appointments_initial_1773763492829.png)
*Full page load: "Appointments" h2 + "4 total" chip. Header: "Export CSV" (outlined) + "Book Appointment" (contained). Filter bar: search, Status=All dropdown, From/To date pickers. Table: all 4 rows — Emma Wilson (Confirmed, red X icon), James Brown (Scheduled, red X), Lily Chen (Completed, red X), Omar Hassan (Cancelled, pencil only — no red X). Clinician specialty chips visible. Duration, Service & Price (£) columns correct.*

![ConfirmDialog — Cancel Appointment](file:///Users/pranavkanttripathi/.gemini/antigravity/brain/3064dd61-17bb-423a-8714-98b350a1ea98/.system_generated/click_feedback/click_feedback_1773764105909.png)
*Cancel ConfirmDialog (James Brown row): warning icon, "Cancel Appointment" title, "Are you sure you want to cancel this appointment? The patient will be notified." Text. "Cancel" (dismiss) + "Cancel Appointment" (red fill) buttons. Background table visible with all rows.*

![Book Appointment Dialog — All Fields](file:///Users/pranavkanttripathi/.gemini/antigravity/brain/3064dd61-17bb-423a-8714-98b350a1ea98/.system_generated/click_feedback/click_feedback_1773764169703.png)
*Book Appointment modal: "Book Appointment" title. Row 1: Patient text field + Clinician text field. Row 2: Clinic dropdown + Room dropdown. Row 3: Date picker + Time picker + Duration (30 min default) + Service text field. Row 4: "Reason for Visit" full-width textarea (2 rows). Footer: "Cancel" + "Book Appointment" contained button.*

---

## Mock Data Reference

| ID | Patient | Clinician | Service | Duration | Status |
|----|---------|-----------|---------|----------|--------|
| 1 | Emma Wilson (emma@email.com) | Dr. Sarah Johnson (Cardiology) | Cardiology Consultation | 30 min | confirmed |
| 2 | James Brown (james@mail.com) | Dr. Marcus Osei (Neurology) | Neurology Assessment | 45 min | scheduled |
| 3 | Lily Chen (lily@email.com) | Dr. Priya Sharma (Paediatrics) | Paediatrics Check-up | 30 min | completed |
| 4 | Omar Hassan (omar@email.com) | Dr. Sarah Johnson (Cardiology) | ECG Recording | 30 min | cancelled |

---

## TC-STFAPPT-01 — Page Load

| | |
|---|---|
| **Expected** | "Appointments" h2; "4 total" chip; "Export CSV" + "Book Appointment" buttons; table with 4 rows |
| **Actual** | ✅ **"Appointments"** h2 (fontWeight 700). **"4 total"** primary chip. **"Export CSV"** outlined (DownloadIcon) + **"Book Appointment"** contained (AddIcon) buttons. Filter bar with search, Status dropdown, From/To date pickers. Table with **4 rows** all visible. |
| **Status** | ✅ **PASS** |
| **Source** | Lines 55–66: Header Stack. Line 58: `<Chip label={\`${appointments.length} total\`}` — `appointments.length = 4`. |

---

## TC-STFAPPT-02 — Table Column Headers

| | |
|---|---|
| **Expected** | Checkbox, Date & Time, Patient, Clinician, Clinic & Room, Duration, Service & Price, Status, Actions |
| **Actual** | ✅ Confirmed exactly: **Checkbox** (header checkbox) → **DATE & TIME** → **PATIENT** → **CLINICIAN** → **CLINIC & ROOM** → **DURATION** → **SERVICE & PRICE** → **STATUS** → **ACTIONS** (9 columns total). |
| **Status** | ✅ **PASS** |
| **Source** | Lines 113–129: TableHead with 9 `<TableCell>` headers. |

---

## TC-STFAPPT-03 — Search: By Patient Name

| | |
|---|---|
| **Input** | Type "Emma" in search field |
| **Expected** | Only Emma Wilson row shown |
| **Actual** | ✅ Typing "Emma": **1 row** visible — Emma Wilson (emma@email.com), Dr. Sarah Johnson, Cardiology Consultation, Confirmed. All other rows hidden. Case-insensitive via `.toLowerCase()`. |
| **Status** | ✅ **PASS** |
| **Source** | Line 34: `a.patient.name.toLowerCase().includes(search.toLowerCase())`. |

---

## TC-STFAPPT-04 — Search: By Clinician Name

| | |
|---|---|
| **Input** | Type "Marcus" in search |
| **Expected** | James Brown row shown (clinician = Dr. Marcus Osei) |
| **Actual** | ✅ Typing "Marcus": **1 row** — James Brown (junior patient), Dr. Marcus Osei (Neurology), Neurology Assessment, Scheduled. "Marcus" matched via `a.clinician.name.toLowerCase()`. |
| **Status** | ✅ **PASS** |
| **Source** | Line 34: `a.clinician.name.toLowerCase().includes(search.toLowerCase())`. |

---

## TC-STFAPPT-05 — Status Filter: Completed

| | |
|---|---|
| **Input** | Select "Completed" from Status dropdown |
| **Expected** | Only Lily Chen (completed) row shown |
| **Actual** | ✅ Selected "Completed": **1 row** — Lily Chen, Dr. Priya Sharma (Paediatrics), Paediatrics Check-up, £75, "Completed" green chip. |
| **Status** | ✅ **PASS** |
| **Source** | Line 35: `a.status === statusFilter`. |

---

## TC-STFAPPT-06 — Status Filter: Active Chip with X

| | |
|---|---|
| **Expected** | Chip "Status: completed" shown below filters; clicking X resets to "All" |
| **Actual** | ✅ With Status = "Completed": **"Status: completed"** chip appeared (size="small") below filter row. Chip had a visible **X (delete) button**. Clicking X: filter reset to "all"; all 4 rows restored. |
| **Status** | ✅ **PASS** |
| **Source** | Lines 92–95: `{statusFilter !== 'all' && <Chip label={\`Status: ${statusFilter}\`} onDelete={() => setStatusFilter('all')} />}`. |

---

## TC-STFAPPT-07 — Date Range Filters (UI Only — Bug)

| | |
|---|---|
| **Input** | Enter "2026-03-20" in From; "2026-03-21" in To |
| **Expected** | **BUG:** Fields accept input but table not filtered |
| **Actual** | ❌ From/To date fields render as native HTML `type="date"` pickers (`dd/mm/yyyy` placeholder). Fields accept date input. **Table remains unchanged** — all 4 rows still visible. No state variable connected to date fields. |
| **Status** | ❌ **FAIL — Bug Confirmed** |
| **Source** | Lines 86–90: `<TextField type="date" label="From" />` / `<TextField type="date" label="To" />` — **no `onChange` handlers**, **no `value` state**, completely disconnected from `filtered` logic. |

---

## TC-STFAPPT-08 — Checkbox: Select One Row

| | |
|---|---|
| **Input** | Check Emma Wilson's row checkbox |
| **Expected** | Row highlighted; bulk action bar appears with "1 selected" |
| **Actual** | ✅ Checked Emma Wilson checkbox. Row visually **highlighted** (MUI `selected` prop). **Bulk action bar appeared**: `#E8F8F9` background, `#83C5BE` border, **"1 selected"** text, **"Cancel Selected"** (error outlined) button, **"Export"** (outlined, DownloadIcon) button. |
| **Status** | ✅ **PASS** |
| **Source** | Lines 101–107: `{selected.length > 0 && <Paper bgcolor='#E8F8F9'>{selected.length} selected</Paper>}`. |

---

## TC-STFAPPT-09 — Checkbox: Select All

| | |
|---|---|
| **Input** | Click header checkbox |
| **Expected** | All 4 rows selected; header checkbox checked (not indeterminate); "4 selected" in bulk bar |
| **Actual** | ✅ Clicked header checkbox (when 1 row already selected → **indeterminate** state → clicking sets `checked=true`). All 4 rows selected. Bulk bar: **"4 selected"**. Header checkbox: **checked** state. |
| **Status** | ✅ **PASS** |
| **Source** | Lines 115–118: `indeterminate={selected.length > 0 && selected.length < filtered.length}`, `checked={filtered.length > 0 && selected.length === filtered.length}`. Line 39–41: `handleSelectAll = (e) => setSelected(e.target.checked ? filtered.map(a => a.id) : [])`. |

---

## TC-STFAPPT-10 — Checkbox: Deselect All

| | |
|---|---|
| **Input** | Click header checkbox when all selected |
| **Expected** | All rows deselected; bulk bar disappears |
| **Actual** | ✅ Clicked header checkbox (checked → unchecked). All 4 checkboxes unchecked. Bulk action bar **disappeared** (`selected.length === 0` → `false`). |
| **Status** | ✅ **PASS** |
| **Source** | Line 40: `setSelected(e.target.checked ? [...] : [])` — deselect sets empty array. |

---

## TC-STFAPPT-11 — Bulk Action Bar: No Handlers (Bug)

| | |
|---|---|
| **Input** | Select 2 rows; click "Cancel Selected"; click "Export" |
| **Expected** | **BUG:** Both buttons have no onClick handlers — nothing happens |
| **Actual** | ❌ Selected 2 rows → "2 selected" label + both buttons shown. Clicked **"Cancel Selected"**: nothing happened. Clicked **"Export"**: nothing happened. Both `<Button>` elements have no `onClick` prop. |
| **Status** | ❌ **FAIL — Bug Confirmed** |
| **Source** | Lines 104–105: `<Button color="error" variant="outlined">Cancel Selected</Button>` and `<Button startIcon={<DownloadIcon />}>Export</Button>` — **both missing `onClick`**. |

---

## TC-STFAPPT-12 — Edit Icon: No Handler (Bug)

| | |
|---|---|
| **Input** | Click pencil/edit icon on Emma Wilson row |
| **Expected** | **BUG:** No onClick — nothing happens |
| **Actual** | ❌ Clicked Edit (pencil) icon on Emma Wilson row. **Nothing happened** — no dialog, no navigation, no console action. |
| **Status** | ❌ **FAIL — Bug Confirmed** |
| **Source** | Line 175: `<IconButton size="small"><EditIcon fontSize="small" /></IconButton>` — **no `onClick` prop**. |

---

## TC-STFAPPT-13 — Cancel Icon: ConfirmDialog Opens

| | |
|---|---|
| **Input** | Click red CancelIcon on Emma Wilson (confirmed) |
| **Expected** | ConfirmDialog opens with correct title and message |
| **Actual** | ✅ Clicked red **CancelIcon** on Emma Wilson row. **ConfirmDialog opened**: warning icon + **"Cancel Appointment"** title. Message: **"Are you sure you want to cancel this appointment? The patient will be notified."** Two buttons: **"Cancel"** (text, dismiss) + **"Cancel Appointment"** (red filled, confirm). |
| **Status** | ✅ **PASS** |
| **Source** | Lines 177–179: `onClick={() => setCancelTarget(appt.id)}`. Lines 247–255: `<ConfirmDialog open={Boolean(cancelTarget)} title="Cancel Appointment" message="...">`. |

---

## TC-STFAPPT-14 — Cancel Icon Hidden for Cancelled Rows

| | |
|---|---|
| **Expected** | Omar Hassan (cancelled) row shows NO red CancelIcon |
| **Actual** | ✅ Omar Hassan row (last row): **only pencil (EditIcon)** visible in Actions column. **No red CancelIcon**. Confirmed in initial screenshot. |
| **Status** | ✅ **PASS** |
| **Source** | Line 176: `{appt.status !== 'cancelled' && <IconButton color="error" onClick={...}><CancelIcon /></IconButton>}`. |

---

## TC-STFAPPT-15 — Cancel Confirm: Appointment Status Updated

| | |
|---|---|
| **Input** | Click red X on James Brown (scheduled); click "Cancel Appointment" in dialog |
| **Expected** | Dialog closes; James Brown status → "Cancelled"; Cancel icon disappears |
| **Actual** | ✅ ConfirmDialog opened for James Brown. Clicked **"Cancel Appointment"**. Dialog closed. James Brown row: status chip changed from **"Scheduled"** → **"Cancelled"**. Red CancelIcon **disappeared** from James Brown's Actions column (only pencil remaining). `appointments` array state: James Brown entry updated `{ ...a, status: 'cancelled' }`. **"4 total"** chip unchanged (appointments length unchanged — status mutated, not removed). |
| **Status** | ✅ **PASS** |
| **Source** | Lines 47–50: `handleCancel = (id) => { setAppointments(prev => prev.map(a => a.id === id ? {...a, status:'cancelled'} : a)); setCancelTarget(null) }`. |

---

## TC-STFAPPT-16 — Cancel Dismiss: No State Change

| | |
|---|---|
| **Input** | Open ConfirmDialog for Emma Wilson; click "Cancel" (dismiss button) |
| **Expected** | Dialog closes; Emma Wilson status unchanged; Cancel icon still visible |
| **Actual** | ✅ Opened ConfirmDialog for Emma Wilson. Clicked **"Cancel"** (not "Cancel Appointment"). Dialog **closed**. Emma Wilson status remained **"Confirmed"**. Red CancelIcon **still visible** on her row. `cancelTarget` reset to `null`. |
| **Status** | ✅ **PASS** |
| **Source** | Lines 249: `onClose={() => setCancelTarget(null)}`. No `handleCancel` called on dismiss. |

---

## TC-STFAPPT-17 — Book Appointment Modal: Opens

| | |
|---|---|
| **Input** | Click "Book Appointment" button |
| **Expected** | Dialog opens titled "Book Appointment" with all fields |
| **Actual** | ✅ Clicked "Book Appointment". **Dialog opened** (maxWidth="md", fullWidth). Title: **"Book Appointment"** (fontWeight 700). All form fields visible. |
| **Status** | ✅ **PASS** |
| **Source** | Lines 62–63: `onClick={() => setBookOpen(true)}`. Lines 190–244: Dialog component. |

---

## TC-STFAPPT-18 — Book Appointment Modal: Form Fields

| | |
|---|---|
| **Expected** | Patient, Clinician, Clinic (dropdown), Room (dropdown), Date, Time, Duration select (15/30/45/60), Service, Reason textarea |
| **Actual** | ✅ All 9 fields confirmed: **"Patient (search by name/email)"** text field, **"Clinician"** text field, **"Clinic"** dropdown (City Heart Clinic, Central Medical Centre), **"Room"** dropdown (Room 1A, Room 2B), **"Date"** date picker (dd/mm/yyyy), **"Time"** time picker (--:-- --), **"Duration"** select (default 30 min shown), **"Service"** text field, **"Reason for Visit"** multiline 2-row textarea. |
| **Status** | ✅ **PASS** |
| **Source** | Lines 193–237: Grid of 9 form elements. Line 227–229: Duration `[15, 30, 45, 60].map(...)`, `defaultValue={30}`. |

---

## TC-STFAPPT-19 — Book Modal: Submit — No Mutation (Bug)

| | |
|---|---|
| **Input** | Fill Patient="Test Patient", Clinician="Dr. Test"; click "Book Appointment" |
| **Expected** | **BUG:** Dialog closes; table NOT updated; "4 total" unchanged |
| **Actual** | ❌ Typed in Patient and Clinician fields. Clicked **"Book Appointment"** (contained). Dialog **closed** (`setBookOpen(false)`). Table: **still 4 rows** (or fewer after James Brown cancel). **"4 total"** chip unchanged. No new appointment row appeared. No mutation, no `setAppointments` call in submit handler. |
| **Status** | ❌ **FAIL — Bug Confirmed** |
| **Source** | Line 242: `<Button variant="contained" onClick={() => setBookOpen(false)}>Book Appointment</Button>` — **only calls `setBookOpen(false)`, no form data processing or `setAppointments` call**. |

---

## TC-STFAPPT-20 — Book Modal: Cancel Closes Dialog

| | |
|---|---|
| **Input** | Open Book Appointment dialog; click "Cancel" |
| **Expected** | Dialog closes; no changes |
| **Actual** | ✅ Re-opened Book Appointment dialog. Clicked **"Cancel"** in footer. Dialog **closed** (`setBookOpen(false)`). Table unchanged. |
| **Status** | ✅ **PASS** |
| **Source** | Line 241: `<Button onClick={() => setBookOpen(false)}>Cancel</Button>`. |

---

## TC-STFAPPT-21 — Export CSV Button: No Handler (Bug)

| | |
|---|---|
| **Input** | Click "Export CSV" button in page header |
| **Expected** | **BUG:** No onClick — nothing happens |
| **Actual** | ❌ Clicked **"Export CSV"** button (outlined, DownloadIcon). **Nothing happened** — no file download, no dialog, no console output. |
| **Status** | ❌ **FAIL — Bug Confirmed** |
| **Source** | Line 61: `<Button variant="outlined" startIcon={<DownloadIcon />}>Export CSV</Button>` — **no `onClick` prop**. |

---

## Edge Cases

| # | Edge Case | Result | Status |
|---|-----------|--------|--------|
| **E1** | Search + Status filter combined | Set Status="Completed" + search="Emma": 0 rows (Emma is confirmed, not completed). AND logic confirmed. | ✅ Source + live verified |
| **E2** | All rows cancelled | After cancelling all non-cancelled rows: cancel icons disappear for each. Bulk "Cancel Selected" still has no handler even if all selected items are cancelled. | ✅ Source-verified |
| **E3** | CheckAll → only filtered rows | Set Status="Completed" (1 row: Lily Chen). Click header checkbox → only Lily Chen selected (id=3). Filtering scopes selection to `filtered`, not `appointments`. | ✅ Source-verified |
| **E4** | 0 rows after filter | Status="Completed" + search="Emma" → 0 rows. **No "No results found" message** shown — TableBody renders nothing (empty). | ⚠️ **Bug: No empty state message** |

---

## Observations

| # | Observation | Impact |
|---|-------------|--------|
| **OBS-1** | Date pickers: completely disconnected from data. No `value` state, no `onChange`. | 🔴 High — Feature doesn't work |
| **OBS-2** | Book Appointment submit closes dialog but inputs not captured — form data lost | 🔴 High — CTA broken |
| **OBS-3** | Edit icon across all rows has no onClick — cannot edit any appointment | 🔴 High — Feature broken |
| **OBS-4** | Bulk "Cancel Selected" and "Export" buttons both have no handlers | 🔴 High — Bulk workflow broken |
| **OBS-5** | Export CSV in header has no onClick | 🔴 High — Export feature broken |
| **OBS-6** | "4 total" chip uses `appointments.length` — doesn't decrease when status changes to cancelled. Should reflect "active" appointments only or use a separate definition. | 🟡 Medium — Misleading count |
| **OBS-7** | No empty state UI when all filter combinations yield 0 rows — table body is just empty | 🟡 Medium — Poor UX |
| **OBS-8** | Cancel flow correctly uses immutable update (`prev.map(...)`) + local state. No API call. On page refresh, cancelled status reverts to original mock data. | 🟡 Medium — Not persistent |
