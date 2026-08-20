---
id: TP027
type: test-plan
feature: patient-appointments
created: 2026-04-02
updated: 2026-04-02
status: done
parent: unknown
related: [TR026, TS027]
---

# Patient Appointments — Test Plan (Updated v2.0)

**Route:** `/patient/appointments`
**File:** `frontend/src/pages/patient/Appointments.jsx`
**Updated:** 2026-03-31 (Session QA)
**Status:** ✅ ALL TCs EXECUTED AND PASSING

---

## Feature Overview

Patient's appointment list — fully mock-data driven via inline `APPOINTMENTS` array (now in React state). Two tabs: Upcoming (scheduled/confirmed) and Past (completed/cancelled). Includes search by doctor/specialty, functional Sort dropdown (date/doctor/price via useMemo), per-card actions (Join Video, Receipt, Cancel with confirm dialog). Cancel updates appointment status in state — no backend required.

---

## Test Cases — Original (TC-01 to TC-17)

### TC-PTAPPT-01 — Page Load: Default Tab (Upcoming)
**Steps:** Navigate to `/patient/appointments`.
**Expected:**
- Title "My Appointments". Subtitle: "2 upcoming · 2 past".
- "Upcoming (2)" tab active with 2 appointment cards.

---

### TC-PTAPPT-02 — Book Appointment Button
**Steps:** Click "+ Book Appointment" in header.
**Expected:** Navigates to `/appointments/book`.

---

### TC-PTAPPT-03 — Status Border Colours
**Steps:** View all 4 appointment cards.
**Expected:**
- confirmed → green `#2DC653`; scheduled → teal `#006D77`
- cancelled → red `#E63946`; completed → light blue `#D0E8EA`

---

### TC-PTAPPT-04 — In-Person Card Details
**Steps:** View Dr. Sarah Johnson (in-person, id=1).
**Expected:** `LocationOnIcon` + "City Heart Clinic" chip. No VideoIcon.

---

### TC-PTAPPT-05 — Video Card Details  *(wording updated from old plan)*
**Steps:** View Dr. Marcus Osei (video, id=2).
**Expected:** `VideocamIcon` chip with purple text. Chip label shows **"Video"** (type-based override — clinic field "Online" not displayed directly). Specialty "Neurology" shown separately.

---

### TC-PTAPPT-06 — Action Buttons: Upcoming
**Steps:** View upcoming cards.
**Expected:**
- Video (id=2): "Join Call" (purple) + "Cancel" (red outlined). No Receipt.
- In-person (id=1): "Cancel" only. No "Join Call", no Receipt.

---

### TC-PTAPPT-07 — Action Buttons: Completed
**Steps:** View Past tab, ECG Recording (id=3).
**Expected:** "Receipt" outlined button with DownloadIcon. No Cancel or Join Call.

---

### TC-PTAPPT-08 — Action Buttons: Cancelled
**Steps:** View Past tab, Annual Check-up (id=4).
**Expected:** No action buttons.

---

### TC-PTAPPT-09 — Join Call Navigation
**Steps:** Click "Join Call" on Dr. Marcus Osei.
**Expected:** Navigates to `/video/2`.

---

### TC-PTAPPT-10 — Cancel with Confirm Dialog  *(previously bug — now fixed)*
**Steps:** Click "Cancel" on Dr. Sarah Johnson (id=1). Confirm in dialog.
**Expected:**
- Dialog opens: "Cancel Appointment?", "Keep Appointment" + "Yes, Cancel" buttons.
- On confirm: appointment moves to Past tab (status="cancelled"). Subtitle updates: "1 upcoming · 3 past".

---

### TC-PTAPPT-11 — Tab Switch: Upcoming → Past
**Steps:** Click "Past (2)".
**Expected:** 2 past cards shown (completed + cancelled). "Past (2)" tab selected.

---

### TC-PTAPPT-12 — Empty State: Upcoming Tab
**Steps:** Search "xyz" on Upcoming tab.
**Expected:** CalendarMonthIcon + "No upcoming appointments" + "Book Appointment" button.

---

### TC-PTAPPT-13 — Empty State: Past Tab
**Steps:** Search "xyz" on Past tab.
**Expected:** "No past appointments" + "Your completed appointments will appear here." No action button.

---

### TC-PTAPPT-14 — Search: By Doctor Name
**Steps:** Type "Sarah".
**Expected:** Only Dr. Sarah Johnson shown. Case-insensitive.

---

### TC-PTAPPT-15 — Search: By Specialty
**Steps:** Type "neurol".
**Expected:** Only Dr. Marcus Osei (Neurology) shown.

---

### TC-PTAPPT-16 — Search: No Results
**Steps:** Type "xyz".
**Expected:** Empty state with tab-appropriate message.

---

### TC-PTAPPT-17 — Sort by Date (Default)  *(previously bug — now fixed)*
**Steps:** Default state on Upcoming tab.
**Expected:** Dr. Sarah Johnson (2026-03-20) before Dr. Marcus Osei (2026-03-25).

---

## New Test Cases (Session QA)

### TC-PTAPPT-18 — Cancel: UI + Subtitle Update
**Steps:** Cancel any upcoming appointment → confirm.
**Expected:** Appointment disappears from Upcoming; appears in Past. Subtitle decrements upcoming count.

---

### TC-PTAPPT-19 — Sort by Date (Default)
**Steps:** Observe default order on Upcoming tab.
**Expected:** chronological ascending order by `appt.date`.

---

### TC-PTAPPT-20 — Sort by Doctor Alphabetically
**Steps:** Select "Doctor" in Sort dropdown.
**Expected:** Past tab — Dr. Priya Sharma (P) before Dr. Sarah Johnson (S).

---

### TC-PTAPPT-21 — Sort by Price Ascending
**Steps:** Select "Price" on Past tab.
**Expected:** Dr. Priya Sharma (£75) before Dr. Sarah Johnson (£120).

---

### TC-PTAPPT-22 — Search Cleared on Tab Switch
**Steps:** Type "sarah" on Upcoming → click Past tab.
**Expected:** Search box empty. Both past appointments visible.

---

### TC-PTAPPT-23 — Doctor Avatar Initials
**Steps:** View all appointment cards.
**Expected:** Correct initials: SJ (Sarah Johnson), MO (Marcus Osei), SJ (Sarah Johnson), PS (Priya Sharma). Teal bgcolor `#006D77`.

---

### TC-PTAPPT-24 — Past Tab Border Colours
**Steps:** View Past tab cards.
**Expected:** ECG Recording (completed) → `#D0E8EA`; Annual Check-up (cancelled) → `#E63946`.

---

### TC-PTAPPT-25 — Receipt Button Navigation
**Steps:** Click "Receipt" on completed appointment (ECG Recording, id=3).
**Expected:** Navigates to `/patient/appointments/3/receipt`.

---

## Edge Cases

| # | Edge Case | Expected | Status |
|---|-----------|----------|--------|
| E1 | Empty appointments array | Both tabs → EmptyState | ✅ Source-verified |
| E2 | Price = null | "Price TBD" shown | ✅ FIXED |
| E3 | Long doctor name | Truncated with noWrap + maxWidth 280px | ✅ FIXED |
| E4 | Tab switch with active search | Search cleared; full list visible | ✅ FIXED |
| E5 | Receipt button | Navigates to `/patient/appointments/:id/receipt` | ✅ FIXED |

---

## Feature Coverage Matrix

| Feature | Implemented | Tested |
|---------|-------------|--------|
| Appointment list (2 tabs) | ✅ | TC-01, TC-11 |
| Card status border colours | ✅ | TC-03 |
| Action buttons (join/cancel/receipt) | ✅ | TC-06, TC-07, TC-08 |
| Cancel with confirm dialog | ✅ (FIXED) | TC-10, TC-18 |
| Sort (date/doctor/price) | ✅ (FIXED) | TC-17, TC-19–21 |
| Search by name/specialty | ✅ | TC-14, TC-15, TC-16 |
| Search reset on tab switch | ✅ (FIXED) | TC-22 |
| Empty states (both tabs) | ✅ | TC-12, TC-13 |
| Receipt navigation | ✅ (FIXED) | TC-25 |
| Price null guard | ✅ (FIXED) | E2 |
| Doctor name overflow | ✅ (FIXED) | E3 |
| Book Appointment CTA | ✅ | TC-02 |
| Join Call navigation | ✅ | TC-09 |

---

## Total: 25 Test Cases + 5 Edge Cases
