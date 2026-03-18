# Patient Appointments — Test Plan

**Route:** `/patient/appointments`
**File:** `frontend/src/pages/patient/Appointments.jsx`
**Status:** ⚠️ NOT DONE — Test has not been executed yet.

---

## Feature Overview

Patient's appointment list, fully mock-data driven. Two tabs: Upcoming (scheduled/confirmed) and Past (completed/cancelled). Includes search by doctor/specialty, Sort dropdown (UI only), per-card actions (Join Video, Receipt, Cancel). Cancel is a local state operation — no backend mutation.

---

## Test Cases

### TC-PTAPPT-01 — Page Load: Default Tab (Upcoming)
**Steps:** Navigate to `/patient/appointments`.
**Expected:**
- Title "My Appointments".
- Subtitle: "{N} upcoming · {M} past".
- "Upcoming" tab active; 2 appointments shown (status: confirmed, scheduled).

---

### TC-PTAPPT-02 — Page Header: Book Appointment Button
**Steps:** View page header.
**Expected:**
- "Book Appointment" button navigates to `/appointments/book`.

---

### TC-PTAPPT-03 — Appointment Card: Status Border Colours
**Steps:** View cards on the Upcoming tab.
**Expected:**
- `status='confirmed'` → left border `#2DC653` (green).
- `status='scheduled'` → left border `#006D77` (teal).
- `status='cancelled'` → left border `#E63946` (red).
- `status='completed'` → left border `#D0E8EA` (light blue).

---

### TC-PTAPPT-04 — Appointment Card: In-Person Data
**Steps:** View an in-person appointment.
**Expected:**
- `LocationOnIcon` + clinic name chip shown.
- No video icon.

---

### TC-PTAPPT-05 — Appointment Card: Video Type
**Steps:** View a video appointment (id=2, type=video).
**Expected:**
- `VideocamIcon` chip with purple text shown.
- Clinic shown as "Online".

---

### TC-PTAPPT-06 — Appointment Card: Actions (Upcoming)
**Steps:** View a confirmed/scheduled video appointment.
**Expected:**
- "Join Call" button (purple) shown.
- "Cancel" error button shown.
- No Receipt button.

---

### TC-PTAPPT-07 — Appointment Card: Actions (Completed)
**Steps:** View a past/completed appointment.
**Expected:**
- "Receipt" outlined button with download icon shown.
- No Cancel or Join Call buttons.

---

### TC-PTAPPT-08 — Appointment Card: Actions (Cancelled)
**Steps:** View a cancelled appointment.
**Expected:**
- No action buttons shown (cancelled status = `isUpcoming = false`).

---

### TC-PTAPPT-09 — Join Call Action
**Steps:** Click "Join Call" on a video appointment.
**Expected:**
- Navigates to `/video/:id`.

---

### TC-PTAPPT-10 — Cancel Action
**Steps:** Click "Cancel" on any upcoming appointment.
**Expected:**
- **Note:** `onCancel` calls `console.log('cancel', id)` only; no state change, no dialog.
- **BUG:** No actual cancellation logic or confirm dialog. Enhancement needed.

---

### TC-PTAPPT-11 — Tab Switch: Upcoming → Past
**Steps:** Click the "Past (2)" tab.
**Expected:**
- Shows 2 appointments: completed (id=3) and cancelled (id=4).
- "Upcoming" tab not highlighted.

---

### TC-PTAPPT-12 — Tab: Empty State on Upcoming
**Steps:** Filter so no upcoming appointments match.
**Expected:**
- `EmptyState` component: "No upcoming appointments" title, "Book your first appointment to get started." description, "Book Appointment" action button.

---

### TC-PTAPPT-13 — Tab: Empty State on Past
**Steps:** Filter so no past appointments match.
**Expected:**
- Empty state: "No past appointments", "Your completed appointments will appear here.", no action button.

---

### TC-PTAPPT-14 — Search: Filter by Doctor Name
**Steps:** Type "Sarah" in search field.
**Expected:**
- Only appointments with "Sarah" in doctor name shown.
- Case-insensitive.

---

### TC-PTAPPT-15 — Search: Filter by Specialty
**Steps:** Type "cardio" in search field.
**Expected:**
- Only Cardiology appointments shown.
- Case-insensitive match on `specialty`.

---

### TC-PTAPPT-16 — Search: No Matching Results
**Steps:** Type "xyz" in search.
**Expected:**
- Empty state shown with tab-appropriate message.

---

### TC-PTAPPT-17 — Sort Dropdown (UI Only)
**Steps:** Open Sort dropdown; select "Doctor".
**Expected:**
- Dropdown shows Date, Doctor, Price options.
- **BUG:** No sort logic applied; list order unchanged. Enhancement needed.

---

## Edge Cases

| # | Edge Case | Expected |
|---|-----------|----------|
| E1 | APPOINTMENTS array empty | Both tabs show empty state |
| E2 | Appointment with no price | `£undefined` shown — Enhancement: null guard needed |
| E3 | Very long doctor name | Wraps in card, no truncation (may overflow layout) |
| E4 | Tab switch clears search | **BUG:** Search state not cleared on tab change; old filter persists |
| E5 | Receipt button | Click does nothing (no handler) — Enhancement needed |
