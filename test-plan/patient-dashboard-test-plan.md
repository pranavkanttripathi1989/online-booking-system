# Patient Dashboard — Test Plan (Updated v2.0)

**Route:** `/patient/dashboard`
**File:** `frontend/src/pages/patient/Dashboard.jsx`
**Updated:** 2026-03-31 (Session QA)
**Status:** ✅ ALL 26 TCs PASSING (0 SKIPPED)

---

## Feature Overview

Patient dashboard — Apollo GraphQL query with inline mock fallback for offline mode. Shows: dynamic greeting banner (time-of-day), 4 KPI cards, upcoming appointments list (with join-video, reschedule+cancel confirm dialog), Your Doctors sidebar (deduped, max 3), and Recent Activity notifications (max 5). Full mock data layer via `MOCK_UPCOMING`, `MOCK_NOTIFICATIONS`, `MOCK_KPIS`.

---

## Test Cases — Original (TC-01 to TC-17)

### TC-PTDASH-01 — Auth Guard: No User
**Steps:** Navigate to `/patient/dashboard` without being logged in.
**Expected:** `<Alert severity="warning">Please log in to view your dashboard.</Alert>` — no crash.

---

### TC-PTDASH-02 — Welcome Banner: Patient Name
**Steps:** Log in as any patient; load dashboard.
**Expected:** Dynamic greeting: "Good morning/afternoon/evening, {firstName}". Fallback chain: `firstName → name.split[0] → 'Patient'`.

---

### TC-PTDASH-03 — Welcome Banner: Action Buttons
**Steps:** View banner buttons.
**Expected:**
- "Book Appointment" (Add icon) → navigates to `/appointments/book` ✅
- "View All" → navigates to `/patient/appointments` ✅
- `/booking/search` redirects to `/appointments/book` (App.jsx alias) ✅

---

### TC-PTDASH-04 — Avatar Hidden on Mobile
**Steps:** Resize browser to xs/mobile.
**Expected:** Gravatar avatar hidden at `xs`; visible at `md+`.

---

### TC-PTDASH-05 — KPI Cards: Mock Data
**Steps:** Backend offline → mock fallback active.
**Expected:** Total Visits=12 (blue), Completed=9 (green), Upcoming=2 (teal), Cancelled=1 (red).

---

### TC-PTDASH-06 — KPI Cards: Zero Fallback
**Steps:** Empty mock data / fresh state.
**Expected:** All 4 cards show 0.

---

### TC-PTDASH-07 — Upcoming Appointments: Empty State
**Steps:** `MOCK_UPCOMING = []`.
**Expected:** Dashed-border paper; "You have no upcoming appointments."; "Find a Doctor" button → `/appointments/book`.

---

### TC-PTDASH-08 — Upcoming Appointments: Card Data
**Steps:** View dashboard with 2 mock appointments.
**Expected:**
- Date block: primary.main bgcolor, "APR 10" and "APR 15" shown (MMM + D).
- Gravatar avatar, clinician name, clinicianType.
- 3 chips: time+duration, type (Video Consult/In-Person), StatusChip.
- Status border: scheduled → `#006D77`.

---

### TC-PTDASH-09 — Join Video Button
**Steps:** View video appointment (mock id=m1, type=video, status=scheduled).
**Expected:** "Join Video" contained secondary button shown. Navigates to `/video/m1`.

---

### TC-PTDASH-10 — Reschedule and Cancel Handlers  *(previously bug — now fixed)*
**Steps:** Click "Reschedule" or "Cancel".
**Expected:**
- Reschedule: navigates to `/patient/appointments?reschedule=m1`.
- Cancel: opens Dialog "Cancel Appointment?"; "Keep Appointment" dismisses; "Yes, Cancel" triggers handleCancelConfirm.

---

### TC-PTDASH-11 — Appointment Status Left Border Color
**Steps:** View appointment cards.
**Expected:** scheduled → `4px solid #006D77`; completed → `#2DC653`; cancelled → `#E63946`.

---

### TC-PTDASH-12 — Your Doctors Sidebar: Derived from Appointments
**Steps:** 2 mock appointments with distinct clinician IDs.
**Expected:** 2 unique doctor entries in list (Map deduplication). Max 3 shown.

---

### TC-PTDASH-13 — Your Doctors Sidebar: Empty
**Steps:** `uniqueClinicians = []`.
**Expected:** "No recent doctors found." (body2, text.secondary).

---

### TC-PTDASH-14 — Your Doctors: Book Button
**Steps:** Click "Book" on a doctor.
**Expected:** Navigates to `/appointments/book?clinician={id}`.

---

### TC-PTDASH-15 — Recent Activity: Notifications
**Steps:** Mock notifications loaded.
**Expected:**
- Icon per type: appointment→CalendarMonth, payment→Payment, system→Settings, alert→Warning.
- Title bold, body 2-line clamp, `dayjs(createdAt).fromNow()` timestamp.

---

### TC-PTDASH-16 — Recent Activity: Empty
**Steps:** `notifications = []`.
**Expected:** "No recent activity." shown.

---

### TC-PTDASH-17 — Query Skipped When User ID Missing
**Steps:** user?.id = undefined
**Expected:** Query skipped (`skip: !user?.id`). No network call. Fallback data shown.

---

## New Test Cases (Session QA)

### TC-PTDASH-18 — Dynamic Greeting
**Steps:** Load at different hours.
**Expected:** Before 12:00 → "Good morning"; 12:00–17:59 → "Good afternoon"; 18:00+ → "Good evening".

---

### TC-PTDASH-19 — Loading Skeleton
**Steps:** Simulate slow backend (loading=true).
**Expected:** 4 rectangular Skeletons in KPI grid + 1 large skeleton below. Banner still shown.

---

### TC-PTDASH-20 — Apollo Error Alert
**Steps:** Backend returns error (not just offline).
**Expected:** `<Alert severity="warning">Could not load live dashboard data — showing demo information.</Alert>` shown between banner and KPI grid.

---

### TC-PTDASH-21 — Notifications Client-Side Cap
**Steps:** Mock data has 6+ notifications.
**Expected:** Only first 5 rendered (`notifications.slice(0, 5)`).

---

### TC-PTDASH-22 — Cancel Confirm Dialog
**Steps:** Click "Cancel" on appointment → click "Yes, Cancel".
**Expected:** Dialog opens; "Yes, Cancel" triggers handleCancelConfirm (console.log in mock mode); dialog closes.

---

### TC-PTDASH-23 — Reschedule Navigation
**Steps:** Click "Reschedule" on appointment.
**Expected:** Navigates to `/patient/appointments?reschedule={id}`.

---

### TC-PTDASH-24 — Clinician null Guard
**Steps:** Mock appointment where `clinician = null`.
**Expected:** No crash; item excluded from uniqueClinicians (`.filter(a => a.clinician?.id)`).

---

### TC-PTDASH-25 — Sidebar View All Links
**Steps:** Click "View all" in Your Doctors → Click "View all" in Recent Activity.
**Expected:** Doctors → `/patient/appointments`; Activity → `/notifications`.

---

### TC-PTDASH-26 — KPI Mock Values
**Steps:** Backend offline; `MOCK_KPIS` active.
**Expected:** Total=12, Completed=9, Upcoming=2, Cancelled=1. Correct colors per card.

---

## Edge Cases

| # | Edge | Expected |
|---|------|----------|
| E1 | appt.clinician=null | Filtered out; no crash |
| E2 | notification.createdAt=null | dayjs(null).fromNow() → "a few seconds ago" |
| E3 | 6+ notifications | Only first 5 shown (client slice) |
| E4 | Appointment has no duration | `duration \|\| 30` → "30 min" |
| E5 | user.firstName="" | Falls to name.split[0] or "Patient" |

---

## Feature Coverage Matrix

| Feature | Implemented | Tested |
|---------|-------------|--------|
| Auth guard | ✅ | TC-01 |
| Dynamic greeting | ✅ (FIXED) | TC-18 |
| Welcome banner + buttons | ✅ | TC-02, TC-03 |
| KPI cards (4) | ✅ | TC-05, TC-06, TC-26 |
| Mock fallback data | ✅ (FIXED) | TC-05, TC-08–15 |
| Loading skeleton | ✅ (FIXED) | TC-19 |
| Apollo error display | ✅ (FIXED) | TC-20 |
| Upcoming list + card data | ✅ | TC-08, TC-11 |
| Join Video button | ✅ | TC-09 |
| Reschedule handler | ✅ (FIXED) | TC-10, TC-23 |
| Cancel confirm dialog | ✅ (FIXED) | TC-10, TC-22 |
| Clinician null guard | ✅ (FIXED) | E1, TC-24 |
| Your Doctors sidebar | ✅ | TC-12–14 |
| View all links | ✅ (FIXED) | TC-25 |
| Recent Activity feed | ✅ | TC-15, TC-21 |
| Notification slice cap | ✅ (FIXED) | TC-21 |
| /booking/search route | ✅ (FIXED) | TC-03 |

---

## Total: 26 TCs + 5 Edge Cases
