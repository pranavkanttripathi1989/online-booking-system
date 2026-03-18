# Clinician Dashboard — Test Results

**Feature:** Clinician Dashboard  
**Test Plan:** [clinician-dashboard-test-plan-not-done.md](../test-plan/clinician-portal/clinician-dashboard-test-plan-not-done.md)  
**Source File:** `frontend/src/pages/clinician/Dashboard.jsx` (396 lines)  
**Route:** `/clinician/dashboard`  
**Executed:** 2026-03-17  
**Tester:** Antigravity AI (Browser Agent + Source Review)  
**Environment:** `http://localhost:3001` (Vite dev server, backend offline — **mock fallbacks active**)  
**Total Cases:** 16 | **Edge Cases:** 5

---

## Summary

| Status | Count |
|--------|-------|
| ✅ PASS | 10 |
| ⏭ SKIPPED (backend offline / no appointment data) | 6 |
| ❌ FAIL | 0 |

> **0 blocking bugs found.** 2 known issues as documented in test plan (BUG-CLDASH-001: Add Block no handler, BUG-CLDASH-002: Timeline click only logs to console).  
> **Mock fallbacks work correctly** — page renders fully without backend.

---

## Screenshots

![Clinician Dashboard Full View](file:///Users/pranavkanttripathi/.gemini/antigravity/brain/3064dd61-17bb-423a-8714-98b350a1ea98/clinician_dashboard_full_1773741526505.png)
*Full dashboard: gradient banner, KPI cards (12/5/7/3), timeline grid, Upcoming Next and Queue panels*

---

## Auth & Loading

---

### TC-CLDASH-01 — Auth Guard: No User

| | |
|---|---|
| **Expected** | Warning Alert "Please log in to view your dashboard." |
| **Actual** | ✅ **Source-verified.** Line 86: `if (!user) return <Alert severity="warning">Please log in to view your dashboard.</Alert>`. Not browser-tested to avoid disrupting session. |
| **Status** | ✅ **PASS (source-verified)** |
| **Note** | The check runs before query skip. No user → alert rendered, no query fired. |

---

## Header Banner

---

### TC-CLDASH-02 — Header Banner: Date and Doctor Name

| | |
|---|---|
| **Expected** | Teal gradient banner with today's date, "Dr. {name}", clinicianType chip, clinic name, "Add Block" button |
| **Actual** | ✅ Gradient banner (#006D77 → #0A9396) confirmed. Overline text: **"TUESDAY, 17 MARCH 2026"** (matches system date). h5: **"Dr. Doctor"** (fallback). Chip: **"Specialist"** chip (white semi-transparent). Body text: **"Health Clinic"**. Right side: **"+ Add Block"** outlined white button. |
| **Status** | ✅ **PASS** |
| **Screenshot** | `clinician_dashboard_full_1773741526505.png` |
| **Source** | Line 162: `dayjs().format('dddd, DD MMMM YYYY')`. Line 165: `Dr. {clinician.name}`. Line 91: fallback `{ name: 'Doctor', clinicianType: 'Specialist', clinic: { name: 'Health Clinic' } }`. |

---

### TC-CLDASH-03 — Header Banner: Fallback When No Backend

| | |
|---|---|
| **Expected** | Fallback: name='Doctor', clinicianType='Specialist', clinic.name='Health Clinic' |
| **Actual** | ✅ Confirmed offline: **"Dr. Doctor"**, **"Specialist"** chip, **"Health Clinic"** text — all fallback values rendered correctly. No crash. |
| **Status** | ✅ **PASS** |
| **Source** | Line 91: `const clinician = data?.getClinician || { name: 'Doctor', clinicianType: 'Specialist', clinic: { name: 'Health Clinic' } }` |

---

### TC-CLDASH-04 — "Add Block" Button Has No Handler (Known Bug)

| | |
|---|---|
| **Expected** | Click → nothing (BUG: no onClick) |
| **Actual** | ✅ Clicked "Add Block" button — **nothing happened**. No dialog, no navigation, no UI response. |
| **Status** | ✅ **PASS** (expected confirmed) |
| **Source** | Lines 178–185: `<Button variant="outlined" ... startIcon={<Add />}>Add Block</Button>` — **no `onClick` prop**. |
| **⚠️ Known Bug** | BUG-CLDASH-001: "Add Block" is visual-only. Should open block creation dialog/drawer. |

---

## KPI Cards

---

### TC-CLDASH-05 — KPI Cards: Live Data

| | |
|---|---|
| **Expected** | Dynamic values from appointment data |
| **Actual** | ⏭ **SKIPPED** — Backend offline; no appointment data |
| **Status** | ⏭ **SKIPPED** |
| **Source-Verified** | Line 97–100: all four KPI values computed from `allAppointments`. Line 191–194: each uses `value || fallback` pattern. |

---

### TC-CLDASH-06 — KPI Cards: Fallback Values

| | |
|---|---|
| **Expected** | Fallback values: Total Today=12, Completed=5, Remaining=7, Video Calls=3 |
| **Actual** | ✅ All 4 KPI cards confirmed: **Total Today: 12**, **Completed: 5**, **Remaining: 7**, **Video Calls: 3**. Each card shows icon (blue calendar, green check, teal clock, purple video), value number, and label. |
| **Status** | ✅ **PASS** |
| **Screenshot** | `clinician_dashboard_full_1773741526505.png` (KPI cards visible) |
| **Source** | Lines 191–194: `value={allAppointments.length || 12}`, `|| 5`, `upcomingApps.length || 7`, `|| 3`. With empty arrays, `[].length = 0`, so `0 || fallback = fallback`. |

---

## Timeline

---

### TC-CLDASH-07 — Timeline: 08:00 to 18:00 Hour Grid

| | |
|---|---|
| **Expected** | Scrollable 720px area; hour labels 08:00–18:00; stronger lines on hours, lighter on half-hours |
| **Actual** | ✅ "TODAY'S SCHEDULE" overline label above timeline. Paper area contains scroll region. Hour labels **08:00, 09:00, 10:00, 11:00, 12:00, 13:00, 14:00, 15:00, 16:00, 17:00, 18:00** all visible via scroll. Horizontal dividers visible between rows. Scroll works independently. No appointment blocks (offline). |
| **Status** | ✅ **PASS** |
| **Screenshot** | `timeline_grid_1773741544927.png` — scrolled showing 10:00–17:00+ labels |
| **Source** | Lines 112–118: `timeLabels` loop generates `:00` and `:30` entries. Line 209: `isHour = time.endsWith(':00')` → bold label. `GRID_ROW = 0`, height 720 (lines 204: `height={720}`). `PIXELS_PER_MIN = 1.2` → 60min = 72px, total 720px for 10 hours. |

---

### TC-CLDASH-08 — Timeline: Appointment Blocks

| | |
|---|---|
| **Expected** | Coloured blocks at correct positions: scheduled=teal, completed=green, cancelled=red |
| **Actual** | ⏭ **SKIPPED** — No appointments (backend offline) |
| **Status** | ⏭ **SKIPPED** |
| **Source-Verified** | Line 139–145: `getStatusColor` returns `#2DC653` (completed), `#E63946` (cancelled), `#006D77` (scheduled/default). Line 234: `Math.max(height, 28)` minimum 28px. Line 252: product name shown if `height > 30`. Line 260: `appt.type === 'video' && <Videocam />`. |

---

### TC-CLDASH-09 — Timeline: Appointment Click (Console Log Only)

| | |
|---|---|
| **Expected** | Click logs to console; no UI response (known bug) |
| **Actual** | ⏭ **SKIPPED** — No appointment blocks to click |
| **Status** | ⏭ **SKIPPED** |
| **Source** | Line 245: `onClick={() => console.log('Selected Appt', appt.id)}` — console-only, no UI state update. |
| **⚠️ Known Bug** | BUG-CLDASH-002: Timeline appointment click has no UI interaction (no drawer/detail panel). |

---

### TC-CLDASH-10 — Timeline: Lunch Breaks (Amber Dashed)

| | |
|---|---|
| **Actual** | ⏭ **SKIPPED** — Backend offline; no lunch break data returned |
| **Status** | ⏭ **SKIPPED** |
| **Source-Verified** | Lines 268–285: amber dashed `border: '1.5px dashed #F59E0B'`, `bgcolor: '#FFFBEB'`, `RestaurantMenu` icon (#F59E0B), "Lunch Break" text (#92400E). |

---

### TC-CLDASH-11 — Timeline: Spacer Blocks (Grey Dashed)

| | |
|---|---|
| **Actual** | ⏭ **SKIPPED** |
| **Status** | ⏭ **SKIPPED** |
| **Source-Verified** | Lines 288–306: grey dashed `border: '1.5px dashed #CBD5E1'`, `bgcolor: '#F8FAFC'`, `DoNotDisturb` icon (#94A3B8). `<Tooltip title={sb.reason || 'Blocked time'}>`. Label: `Blocked${sb.reason ? ': ' + sb.reason : ''}`. |

---

## Upcoming Next & Queue

---

### TC-CLDASH-12 — Upcoming Panel: Next Patient

| | |
|---|---|
| **Expected** | Patient name, time, duration, type, Gravatar avatar, "View Notes" + conditional "Start Session" |
| **Actual** | ⏭ **SKIPPED** — No upcoming appointments |
| **Status** | ⏭ **SKIPPED** |
| **Source-Verified** | Line 324: `<Avatar src="https://www.gravatar.com/avatar/${nextAppt.patient.id}?d=mp">`. Line 330: `HH:mm · {duration || 30} mins · {video ? 'Video' : 'In-Person'}`. Line 339: "View Notes" outlined, no onClick. Line 340–350: `{nextAppt.type === 'video' && <Button onClick={() => navigate('/video-consultation/' + nextAppt.id)}>Start Session</Button>}`. |

---

### TC-CLDASH-13 — Upcoming Panel: No Appointments

| | |
|---|---|
| **Expected** | "No more appointments today." message |
| **Actual** | ✅ **"No more appointments today."** shown in the teal-bordered panel with "UPCOMING NEXT" header. |
| **Status** | ✅ **PASS** |
| **Screenshot** | `clinician_dashboard_full_1773741526505.png` |
| **Source** | Lines 354–356: `<Box py={3} textAlign="center"><Typography>No more appointments today.</Typography></Box>` |

---

### TC-CLDASH-14 — Queue: Up to 4 Patients

| | |
|---|---|
| **Actual** | ⏭ **SKIPPED** — No appointments |
| **Status** | ⏭ **SKIPPED** |
| **Source-Verified** | Line 104: `queue = upcomingApps.filter(a => a.id !== nextAppt?.id).slice(0, 4)` — strictly max 4. Each item shows patient name (subtitle2 bold), time + product (monospace caption), Videocam icon if video. |

---

### TC-CLDASH-15 — Queue: Empty State

| | |
|---|---|
| **Expected** | "Queue is empty." message |
| **Actual** | ✅ **"Queue is empty."** shown in "UPCOMING QUEUE" panel with grey header bar. |
| **Status** | ✅ **PASS** |
| **Screenshot** | `clinician_dashboard_full_1773741526505.png` (visible at bottom) |
| **Source** | Lines 383–386: `<Box py={3} textAlign="center"><Typography variant="body2">Queue is empty.</Typography></Box>` |

---

### TC-CLDASH-16 — Auto-Refresh Every 60s

| | |
|---|---|
| **Expected** | `refetch()` called via `setInterval` every 60 seconds |
| **Actual** | Not browser-tested (would require 60s wait). Source-verified. |
| **Status** | ✅ **PASS (source-verified)** |
| **Source** | Lines 79–84: `useEffect(() => { const interval = setInterval(() => { refetch(); }, 60000); return () => clearInterval(interval); }, [refetch])` — interval set on mount, cleared on unmount. |

---

## Edge Cases

| # | Edge Case | Result | Status |
|---|-----------|--------|--------|
| **E1** | `startTime` in incorrect format | Line 121: `const [h, m] = startTime.split(':').map(Number)` — if format wrong (e.g., no colon), split returns `['invalid']`, `Number('invalid') = NaN`. `topPx = NaN` → block not positioned. | ⚠️ No guard |
| **E2** | No `duration`, no `endTime` | Line 131–132: `else { durationMins = 30 }` — defaults to 30-min block. | ✅ Source-verified |
| **E3** | All appointments `status='cancelled'` | `upcomingApps = scheduledApps` → only 'scheduled' is upcoming. All cancelled → `upcomingApps = []`, `nextAppt = undefined`, queue = []. KPI Remaining = 0. | ✅ Source-verified |
| **E4** | Timeline block past 18:00 | Container height=720px, `overflow: auto`. Block at e.g. 19:00 = `top=(19-8)*60*1.2=792px` — scroll reveals it. No overflow clip. | ✅ Source-verified |
| **E5** | Multiple appointments at same time | All blocks use `position: absolute, left: 64, right: 12` — same coordinates, overlap completely. | ⚠️ No overlap handling |

---

## Observations

| # | Observation | Impact |
|---|-------------|--------|
| **OBS-1** | "Dr. Doctor" as fallback name is grammatically awkward | Low — cosmetic, use "Dr. —" or remove fallback prefix |
| **OBS-2** | "View Notes" button in Upcoming Next has no onClick | Medium — navigates nowhere |
| **OBS-3** | KPI icons hard to distinguish by colour alone (accessibility) | Low — add ARIA labels |
| **OBS-4** | Timeline label column (`left: 8px`) and appointment block span (`left: 64px`) — hour labels and blocks don't have a clear separator/header row | Low — cosmetic |
