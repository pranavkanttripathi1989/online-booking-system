# Clinician Calendar — Test Plan

**Route:** `http://localhost:3002/clinician/calendar`  
**Role Required:** `clinician`  
**Test Credentials:** `clinician@medibook.dev` / `Cln1234!`  
**Source File:** `frontend/src/pages/clinician/Calendar.jsx`  
**Date Written:** 20 Mar 2026  

---

## Feature Summary (from code analysis)

| Feature | Implementation |
|---------|---------------|
| Calendar view | Fixed 7-day week view (Mon–Sun), no Day/Month toggle |
| Navigation | Prev/Next week arrows + "This Week" chip + "Today" button |
| Week label | This Week / Next Week / Last Week / N Weeks Ago |
| Week range | `DD MMM – DD MMM YYYY` in legend bar |
| Time axis | 9:00 AM – 5:00 PM (9 hour slots, 60px each) |
| Appointment cards | Positioned absolutely by decimal hour, color-coded |
| Overlap layout | Side-by-side column splitting via `assignOverlapColumns()` |
| Current time line | Red line in today's column, updates every 60s |
| Today highlight | `E8F8F9` background + teal date number |
| Event detail panel | Shown below calendar on click (not modal) |
| Navigation from detail | "View Patient" → `/patients/:id`, "Join Call" → `/video/:id` |
| Auth | Clinician name/type pulled from `useAuth()` |
| Weekend columns | Sat/Sun show "No appts" placeholder |
| Break/Blocked events | Shown on grid, detail panel hidden (by type filter) |

---

## Test Cases

### TP-CC-01 — Page Load & Auth
| TC | Test | Expected | Status |
|----|------|----------|--------|
| CC-01-01 | Visit `/clinician/calendar` logged in as clinician | Page renders without crash | ⬜ |
| CC-01-02 | Visit `/clinician/calendar` not logged in | Redirect to `/login` | ⬜ |
| CC-01-03 | Visit `/clinician/calendar` logged in as patient | Redirected or 403 page | ⬜ |
| CC-01-04 | Sidebar "My Calendar" nav item is active/highlighted | Active highlight visible | ⬜ |

---

### TP-CC-02 — Page Header
| TC | Test | Expected | Status |
|----|------|----------|--------|
| CC-02-01 | Page title shows "Calendar" | H2 "Calendar" visible | ⬜ |
| CC-02-02 | Subtitle shows clinician name + clinic | e.g. "Dr. Sarah Mitchell · Clinic" | ⬜ |
| CC-02-03 | Week navigation arrows are present | `<` and `>` IconButtons visible | ⬜ |
| CC-02-04 | "This Week" chip displayed for current week | Chip label "This Week" | ⬜ |
| CC-02-05 | "Today" button visible | Button with TodayIcon | ⬜ |

---

### TP-CC-03 — Legend Bar
| TC | Test | Expected | Status |
|----|------|----------|--------|
| CC-03-01 | In-Person legend shows teal `#006D77` dot | Color dot + "In-Person" label | ⬜ |
| CC-03-02 | Video legend shows purple `#7C3AED` dot | Color dot + "Video" label | ⬜ |
| CC-03-03 | Break legend shows amber `#D97706` dot | Color dot + "Break" label | ⬜ |
| CC-03-04 | Blocked legend shows gray `#6B7280` dot | Color dot + "Blocked" label | ⬜ |
| CC-03-05 | Week range shown as `DD MMM – DD MMM YYYY` | e.g. "17 Mar – 23 Mar 2026" | ⬜ |

---

### TP-CC-04 — Calendar Grid Layout
| TC | Test | Expected | Status |
|----|------|----------|--------|
| CC-04-01 | 7 day columns visible (Mon–Sun) | All 7 columns present | ⬜ |
| CC-04-02 | Day header shows short day name + date number | e.g. "Thu" / "20" | ⬜ |
| CC-04-03 | Today's column has teal background highlight | `#E8F8F9` background | ⬜ |
| CC-04-04 | Today's date number shown in teal circle | Teal rounded badge | ⬜ |
| CC-04-05 | Time axis labels (left column) in 12h format | "9:00 AM", "10:00 AM" … "5:00 PM" | ⬜ |
| CC-04-06 | 9 time rows visible (9 AM – 5 PM) | 9 horizontal rows | ⬜ |
| CC-04-07 | Sat + Sun columns show "No appts" placeholder | Text visible in weekend columns | ⬜ |
| CC-04-08 | Grid has horizontal scroll on small viewports | `overflow-x: auto` wrapper | ⬜ |

---

### TP-CC-05 — Current Time Indicator
| TC | Test | Expected | Status |
|----|------|----------|--------|
| CC-05-01 | Red horizontal line visible in today's column | Red `height:2px` line | ⬜ |
| CC-05-02 | Red dot at left edge of time line | `::before` pseudo dot | ⬜ |
| CC-05-03 | Line is absent in other day columns | Only appears in today column | ⬜ |
| CC-05-04 | Line not shown if current time before 9 AM or after 5 PM | Hidden outside visible hours | ⬜ |

---

### TP-CC-06 — Appointment Cards
| TC | Test | Expected | Status |
|----|------|----------|--------|
| CC-06-01 | In-person appointments shown in teal cards | `#006D77` background | ⬜ |
| CC-06-02 | Video appointments shown in purple cards | `#7C3AED` background | ⬜ |
| CC-06-03 | Break appointments shown in amber cards | `#D97706` background | ⬜ |
| CC-06-04 | Blocked events shown in gray cards | `#6B7280` background | ⬜ |
| CC-06-05 | Patient name shown on card | White bold text | ⬜ |
| CC-06-06 | Type emoji shown on taller cards (>22px) | 🏥 / 📹 / ☕ visible | ⬜ |
| CC-06-07 | Appointment positioned at correct time on grid | 9 AM appt at top row | ⬜ |
| CC-06-08 | Overlapping events shown side-by-side (not stacked) | Cards split horizontally by column | ⬜ |

---

### TP-CC-07 — Appointment Tooltip
| TC | Test | Expected | Status |
|----|------|----------|--------|
| CC-07-01 | Hover over appointment shows tooltip | Tooltip visible | ⬜ |
| CC-07-02 | Tooltip shows patient name | e.g. "Emma Wilson" | ⬜ |
| CC-07-03 | Tooltip shows appointment type | "in-person" / "video" / "break" | ⬜ |
| CC-07-04 | Tooltip shows time in 12h format | e.g. "9:00 AM–9:30 AM" | ⬜ |

---

### TP-CC-08 — Appointment Detail Panel
| TC | Test | Expected | Status |
|----|------|----------|--------|
| CC-08-01 | Click in-person appointment shows detail panel | Card appears below calendar | ⬜ |
| CC-08-02 | Detail panel shows "Appointment Details" heading | H5 text visible | ⬜ |
| CC-08-03 | Detail panel shows patient avatar with initials | Avatar with 2-letter initials | ⬜ |
| CC-08-04 | Detail panel shows patient name | Full name text | ⬜ |
| CC-08-05 | Detail panel time uses 12h format | e.g. "9:00 AM – 9:30 AM" | ⬜ |
| CC-08-06 | Detail panel shows appointment type chip | "in-person" or "video" chip | ⬜ |
| CC-08-07 | "View Patient" button navigates to `/patients/:id` | Navigate to patient detail | ⬜ |
| CC-08-08 | "Join Call" button only shown for video type | Hidden for in-person | ⬜ |
| CC-08-09 | "Join Call" navigates to `/video/:id` | Correct route | ⬜ |
| CC-08-10 | "Close" button dismisses detail panel | Panel disappears | ⬜ |
| CC-08-11 | Click Break/Blocked event → no detail panel shown | Panel stays hidden | ⬜ |

---

### TP-CC-09 — Week Navigation
| TC | Test | Expected | Status |
|----|------|----------|--------|
| CC-09-01 | Click `>` (Next) increments week | Week dates shift +7 days | ⬜ |
| CC-09-02 | Week chip label updates to "Next Week" | Label changes | ⬜ |
| CC-09-03 | Next week shows different appointments | e.g. "Clara Singh" in next week | ⬜ |
| CC-09-04 | Click `<` (Prev) decrements week | Week dates shift -7 days | ⬜ |
| CC-09-05 | Two weeks back shows "2 Weeks Ago" chip label | Correct label | ⬜ |
| CC-09-06 | Click "Today" button returns to week offset 0 | Returns to this week | ⬜ |
| CC-09-07 | Click "This Week" chip returns to offset 0 | Same as Today button | ⬜ |
| CC-09-08 | Prev week shows past appointments (id:14, Past Patient) | Events from offset -1 visible | ⬜ |
| CC-09-09 | Empty week (offset ≥ 2) shows all empty columns | No appointment cards | ⬜ |

---

### TP-CC-10 — Date & Time Format (Standard Compliance)
| TC | Test | Expected | Status |
|----|------|----------|--------|
| CC-10-01 | Time axis left column labels | `9:00 AM`, `10:00 AM` … `5:00 PM` | ⬜ |
| CC-10-02 | Event card tooltip time | `9:00 AM–9:30 AM` | ⬜ |
| CC-10-03 | Event detail panel time row | `9:00 AM – 9:30 AM` | ⬜ |
| CC-10-04 | Week range header in legend | `16 Mar – 22 Mar 2026` (DD MMM) | ⬜ |
| CC-10-05 | No 24-hour time visible anywhere on page | None found | ⬜ |
| CC-10-06 | No raw `HH:mm` strings rendered | None found | ⬜ |

---

### TP-CC-11 — Responsive / UX
| TC | Test | Expected | Status |
|----|------|----------|--------|
| CC-11-01 | Page scrolls horizontally below 700px viewport | Horizontal scrollbar appears | ⬜ |
| CC-11-02 | Appointment cards have hover opacity increase | Opacity 0.9 → 1.0 with shadow | ⬜ |
| CC-11-03 | Cursor changes to pointer on appointment hover | `cursor: pointer` | ⬜ |
| CC-11-04 | New appointment button in header → `/appointments/new` | Navigate correctly | ⬜ |

---

## Bugs Found (Live Test — 20 Mar 2026)

| Bug ID | Severity | Description | Status |
|--------|----------|-------------|--------|
| BUG-CC-001 | 🔴 High | Time axis labels displayed in **24h format** (`09:00`) instead of `9:00 AM` | ✅ FIXED |
| BUG-CC-002 | 🟡 Med | Event tooltip time shows `09:00–09:30` (24h) instead of `9:00 AM–9:30 AM` | ✅ FIXED |
| BUG-CC-003 | 🟡 Med | Event detail panel time shows `09:00–09:30` (24h) | ✅ FIXED |
| BUG-CC-004 | 🟢 Low | Week range shows `16 Mar` not `16 Mar` — single-digit day (`D MMM`) vs standard `DD MMM` | ✅ FIXED |
| BUG-CC-005 | 🟢 Low | No Day/Month view toggle — only week view available | ⬜ PENDING (enhancement) |
| BUG-CC-006 | 🟢 Low | `/appointments/new` → "Failed to fetch clinics" error on first load | ⬜ PENDING (API/network) |

---

## Pass Criteria

- ✅ Page loads for clinician role, redirects for unauthenticated users
- ✅ All 7 day columns visible with correct dynamic dates
- ✅ Today column highlighted correctly
- ✅ Red current-time line visible in today's column  
- ✅ Appointments displayed, color-coded by type
- ✅ Overlapping appointments shown side-by-side
- ✅ Tooltips show correct patient + time info
- ✅ Detail panel opens/closes correctly
- ✅ View Patient and Join Call buttons navigate correctly
- ✅ Week navigation works (prev/next/today)
- ✅ Time labels use `h:mm A` format (12-hour)
- ✅ Week range uses `DD MMM` format
