# Patient Dashboard — Test Plan

**Route:** `/patient/dashboard`
**File:** `frontend/src/pages/patient/Dashboard.jsx`
**Status:** ⚠️ NOT DONE — Test has not been executed yet.

---

## Feature Overview

Patient-facing dashboard. Shows a personalized welcome banner, 4 KPI cards (Total, Completed, Upcoming, Cancelled), an upcoming appointments list with action buttons, a "Your Doctors" sidebar from appointment data, and a Recent Activity feed from notifications. Uses Apollo query `GET_PATIENT_DASHBOARD_DATA` with `skip: !user?.id`.

---

## Test Cases

### TC-PTDASH-01 — Auth Guard: No User
**Steps:** View the page without a logged-in user.
**Expected:**
- Warning alert "Please log in to view your dashboard."

---

### TC-PTDASH-02 — Welcome Banner: Patient Name
**Steps:** Log in as patient with `firstName: "Emma"`.
**Expected:**
- Banner shows "Good morning, Emma".
- Falls back to `user.name.split(' ')[0]` if no `firstName`.
- Last fallback: "Patient".

---

### TC-PTDASH-03 — Welcome Banner: Action Buttons
**Steps:** View the banner.
**Expected:**
- "Book Appointment" navigates to `/booking/search`.
- "View All" navigates to `/patient/appointments`.

---

### TC-PTDASH-04 — Welcome Banner: Avatar Hidden on Mobile
**Steps:** View at xs breakpoint (< 600px).
**Expected:**
- Gravatar avatar has `display: { xs: 'none', md: 'block' }` — hidden on mobile.

---

### TC-PTDASH-05 — KPI Cards: Live Data
**Steps:** Backend returns `getPatientKpis: { total: 10, completed: 7, upcoming: 2, cancelled: 1 }`.
**Expected:**
- Total Visits = 10 (blue).
- Completed = 7 (green).
- Upcoming = 2 (teal).
- Cancelled = 1 (red).

---

### TC-PTDASH-06 — KPI Cards: Fallback When No Backend
**Steps:** Apollo query returns no kpi data.
**Expected:**
- `kpis` defaults to `{ total: 0, completed: 0, upcoming: upcomingAppointments.length, cancelled: 0 }`.
- Upcoming count derived from appointment list length.

---

### TC-PTDASH-07 — Upcoming Appointments: Empty State
**Steps:** Backend returns no scheduled appointments.
**Expected:**
- Paper with dashed border: "You have no upcoming appointments."
- "Find a Doctor" button navigates to `/booking/search`.

---

### TC-PTDASH-08 — Upcoming Appointments: Card Data
**Steps:** Backend returns 1 scheduled appointment.
**Expected:**
- Date block: month (uppercase) + day number (large font) in primary colour box.
- Clinician avatar (Gravatar), name, clinicianType shown.
- Appointment chips: time + duration, in-person/video type, status chip.

---

### TC-PTDASH-09 — Appointment Action: Video Type Shows "Join Video" Button
**Steps:** A scheduled appointment has `type='video'` and `status='scheduled'`.
**Expected:**
- "Join Video" button (secondary colour) shown in card actions.

---

### TC-PTDASH-10 — Appointment Action: Reschedule and Cancel Buttons
**Steps:** View any scheduled/confirmed appointment card.
**Expected:**
- "Reschedule" outlined button shown.
- "Cancel" error-colour button shown.
- **BUG:** Neither button has a meaningful handler attached; they log nothing/do nothing.

---

### TC-PTDASH-11 — Appointment Status Left Border
**Steps:** View an appointment with `status='scheduled'`.
**Expected:**
- Card has `borderLeft: '4px solid #006D77'` (teal for scheduled).
- `status='completed'` → `#2DC653` (green).
- `status='cancelled'` → `#E63946` (red).

---

### TC-PTDASH-12 — Your Doctors Sidebar: Derived from Appointments
**Steps:** 2 appointments with the same clinician.
**Expected:**
- `uniqueClinicians` Map deduplicates — only 1 doctor shown.
- Max 3 doctors shown (`.slice(0, 3)`).
- Each has a Gravatar avatar and "Book" button.

---

### TC-PTDASH-13 — Your Doctors Sidebar: Empty
**Steps:** No upcoming appointments.
**Expected:**
- "No recent doctors found." message.

---

### TC-PTDASH-14 — Your Doctors: Book Button Navigation
**Steps:** Click "Book" next to a doctor.
**Expected:**
- Navigates to `/clinician/:clinicianId`.
- **Note:** Route `/clinician/:id` not defined in App.jsx — may 404. Enhancement needed.

---

### TC-PTDASH-15 — Recent Activity: Notifications Feed
**Steps:** Backend returns 5 notifications.
**Expected:**
- List shows up to 5 notifications.
- Each shows: icon (appointment/payment/system/alert), title, message (2-line clamp), relative time via `dayjs().fromNow()`.

---

### TC-PTDASH-16 — Recent Activity: Empty State
**Steps:** No notifications returned.
**Expected:**
- "No recent activity." shown in the paper.

---

### TC-PTDASH-17 — Query Skipped When User ID Missing
**Steps:** `user.id` is undefined.
**Expected:**
- Query fires with `skip: true`; no network request.
- All data falls back to empty arrays/default kpis.

---

## Edge Cases

| # | Edge Case | Expected |
|---|-----------|----------|
| E1 | `appt.clinician.id` is null (for unique map) | `Map` key is null; multiple nulls collapse to one entry |
| E2 | Notification `createdAt` is null | `dayjs(null).fromNow()` → "a few seconds ago" |
| E3 | 6+ notifications returned | Only first shown in list (no limit set in query, but render shows all) |
| E4 | Appointment with no `duration` | Chip shows "(30 min)" — default `|| 30` |
| E5 | `user.firstName` present but empty string `""` | Falls through to `user.name` split → "Patient" |
