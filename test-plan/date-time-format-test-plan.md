# Date & Time Format — Global Test Plan

**Standard:** All dates must display as **DD/MM/YYYY** · All times must display as **h:mm A** (12-hour, e.g. `2:30 PM`)  
**Date:** 2026-03-19  
**Scope:** All frontend pages in `/frontend/src/pages/`  
**Formatter:** `dayjs` (already installed project-wide)

---

## Format Reference

| Type | Required Format | dayjs Token | Example |
|------|----------------|-------------|---------|
| Date only | DD/MM/YYYY | `'DD/MM/YYYY'` | `19/03/2026` |
| Time only | h:mm A | `'h:mm A'` | `2:30 PM`, `12:00 PM`, `9:00 AM` |
| Date + Time | DD/MM/YYYY h:mm A | `'DD/MM/YYYY h:mm A'` | `19/03/2026 2:30 PM` |
| Short date | DD MMM YYYY | `'DD MMM YYYY'` | `19 Mar 2026` |
| Long date | dddd, DD MMMM YYYY | `'dddd, DD MMMM YYYY'` | `Thursday, 19 March 2026` |
| Date of Birth | DD/MM/YYYY | `'DD/MM/YYYY'` | `12/04/1990` |

> **Never** use `HH:mm` (24-hour). Use `h:mm A` instead.  
> **Never** display raw ISO strings like `2026-03-19T09:00:00Z`.  
> **Never** use `YYYY-MM-DD` in visible UI (backend storage only).

---

## Format Violation Audit (Codebase Scan — 2026-03-19)

The following incorrect format strings were found across 30 files:

| Format Used | Count | Status | Required Fix |
|-------------|-------|--------|--------------|
| `'YYYY-MM-DD'` | 24 | ❌ Wrong (ISO, not visible-safe) | → `'DD/MM/YYYY'` |
| `'HH:mm'` | 10 | ❌ Wrong (24-hour) | → `'h:mm A'` |
| `'DD MMM YYYY, HH:mm'` | 3 | ❌ Wrong (24-hour time) | → `'DD MMM YYYY, h:mm A'` |
| `'MMM D, YYYY'` | 2 | ⚠️ Wrong order | → `'DD MMM YYYY'` |
| `'ddd, MMM D'` | 2 | ⚠️ Wrong order | → `'ddd, DD MMM'` |
| `'h:mm A'` | 2 | ✅ Correct | Keep |
| `'DD MMM YYYY'` | 2 | ✅ Correct | Keep |
| `'dddd, DD MMMM YYYY'` | 1 | ✅ Correct | Keep |

---

## Test Cases by Page / Module

---

### TP-DT-01 · Clinician Dashboard (`/clinician/dashboard`)

| TC | Field | Location | Current | Expected | Status |
|----|-------|----------|---------|----------|--------|
| DT-01-01 | Header date banner | `dayjs().format('dddd, DD MMMM YYYY')` | Thursday, 19 March 2026 | `Thursday, 19 March 2026` | ✅ Correct |
| DT-01-02 | Appointment block startTime | Timeline blocks | `09:00` (24h raw) | `9:00 AM` | ❌ Fix |
| DT-01-03 | Upcoming Next appointment time | Sidebar | `HH:mm` format | `h:mm A` | ❌ Fix |
| DT-01-04 | Last Updated timestamp | Banner sub-text | `dayjs().diff(...)` min ago | N/A (relative, OK) | ✅ OK |

**Test Steps:**
1. Navigate to `/clinician/dashboard`
2. Check header banner date — must show `Thursday, 19 March 2026` not `2026-03-19`
3. Check timeline appointment time labels — must show `9:00 AM`, `2:30 PM` not `09:00`, `14:30`
4. Hover/click appointment block — detail drawer time must show `9:00 AM – 9:30 AM`
5. Check "Upcoming Next" panel time — must show `h:mm A` format

---

### TP-DT-02 · Clinician Patients (`/clinician/patients`)

| TC | Field | Location | Current | Expected | Status |
|----|-------|----------|---------|----------|--------|
| DT-02-01 | Date of Birth column | Patient table | `1990-04-12` | `12/04/1990` | ❌ Fix |
| DT-02-02 | Last Visit column | Patient table | `2026-03-05` | `05/03/2026` | ❌ Fix |
| DT-02-03 | Next Appointment column | Patient table | `2026-03-20` | `20/03/2026` | ❌ Fix |

**Test Steps:**
1. Navigate to `/clinician/patients`
2. In table, check Date of Birth column — must show `12/04/1990` not `1990-04-12`
3. Check Last Visit column — must show `05/03/2026` not `2026-03-05`
4. Check Next Appointment column for Emma — must show `20/03/2026` not `2026-03-20`

---

### TP-DT-03 · Clinician Calendar (`/clinician/calendar` or `/calendar`)

| TC | Field | Location | Current | Expected | Status |
|----|-------|----------|---------|----------|--------|
| DT-03-01 | Selected date display | Header | `dayjs().format('dddd, DD MMM YYYY')` | `Thursday, 19 Mar 2026` | ✅ Check |
| DT-03-02 | Time slot labels in timeline | Left axis | `HH:mm` | `h:mm A` | ❌ Fix |
| DT-03-03 | Appointment block time range | Block tooltip/label | `09:00 - 09:30` | `9:00 AM – 9:30 AM` | ❌ Fix |
| DT-03-04 | Appointment form Start/End | Add Appointment dialog | `HH:mm` input type=time | Display as `h:mm A` | ❌ Fix display |
| DT-03-05 | Date picker current date | Calendar header | Week dates | `DD` day number correct | ✅ Check |

**Test Steps:**
1. Navigate to `/calendar`
2. Confirm left time axis labels show `8:00 AM`, `9:00 AM`, ..., `6:00 PM` not `08:00`, `09:00`
3. Click an appointment — time shown must be `9:00 AM – 9:30 AM`
4. Click "New Appointment" — start/end time picker display should show `h:mm A`

---

### TP-DT-04 · Appointments List (`/appointments`)

| TC | Field | Location | Current | Expected | Status |
|----|-------|----------|---------|----------|--------|
| DT-04-01 | Date column | Appointments table | ISO `2026-03-16T09:00:00Z` | `16/03/2026` | ❌ Fix |
| DT-04-02 | Time column | Appointments table | `HH:mm` | `9:00 AM` | ❌ Fix |
| DT-04-03 | Date filter input | Filter row | `type=date` | Display as `DD/MM/YYYY` | ❌ Fix label |
| DT-04-04 | Status + date label | Chip/badge | Raw ISO | Formatted | ❌ Fix |

**Test Steps:**
1. Navigate to `/appointments`
2. Look at the date column — must show `16/03/2026` not `2026-03-16` or `Mar 16, 2026`
3. Look at the time column — must show `9:00 AM` not `09:00`
4. Combined date+time fields must show `16/03/2026 9:00 AM`

---

### TP-DT-05 · Appointment Detail (`/appointments/:id`)

| TC | Field | Location | Current | Expected | Status |
|----|-------|----------|---------|----------|--------|
| DT-05-01 | Appointment date | Detail card | ISO string | `19/03/2026` | ❌ Fix |
| DT-05-02 | Start time | Detail card | `09:00` | `9:00 AM` | ❌ Fix |
| DT-05-03 | End time | Detail card | `09:30` | `9:30 AM` | ❌ Fix |
| DT-05-04 | Duration label | Detail card | `9:00 – 9:30 (30 min)` | `9:00 AM – 9:30 AM (30 min)` | ❌ Fix |

**Test Steps:**
1. Navigate to `/appointments/appt-1`
2. Verify date shows `16/03/2026`
3. Verify start `9:00 AM`, end `9:15 AM`, duration chip `15 min`

---

### TP-DT-06 · Appointment Edit (`/appointments/:id/edit`)

| TC | Field | Location | Current | Expected | Status |
|----|-------|----------|---------|----------|--------|
| DT-06-01 | Date pre-fill | Date input | `2026-03-16` (YYYY-MM-DD) | Input: `YYYY-MM-DD` (HTML standard), Display label: `16/03/2026` | ✅ Input OK |
| DT-06-02 | Time pre-fill | Time inputs | `09:00` (HTML standard) | Input: `HH:mm` (HTML standard), Shown label: `9:00 AM` | ✅ Input OK |
| DT-06-03 | Formatted preview label | Preview section | Raw ISO | `Thursday, 16/03/2026 9:00 AM` | ❌ Fix |

> Note: `<input type="date">` and `<input type="time">` always use `YYYY-MM-DD`/`HH:mm` internally (HTML spec). Only the display label should be formatted.

---

### TP-DT-07 · Patient List (`/patients`)

| TC | Field | Location | Current | Expected | Status |
|----|-------|----------|---------|----------|--------|
| DT-07-01 | Date of Birth | Table column | `12 May 1992` | `12/05/1992` | ❌ Fix |
| DT-07-02 | Registered date | Detail row | ISO or `DD MMM YYYY` | `DD/MM/YYYY` | ❌ Fix |

**Test Steps:**
1. Navigate to `/patients`
2. Click any patient row. Check DOB field: must show `12/05/1992` not `12 May 1992` or `1992-05-12`

---

### TP-DT-08 · Patient Detail (`/patients/:id`)

| TC | Field | Location | Current | Expected | Status |
|----|-------|----------|---------|----------|--------|
| DT-08-01 | Date of Birth | Profile card | `1985-03-12` | `12/03/1985` | ❌ Fix |
| DT-08-02 | Registered At | Profile footer | ISO timestamp | `08/01/2024` | ❌ Fix |
| DT-08-03 | Appointment history dates | Timeline | `2026-03-16T09:00:00Z` | `16/03/2026 9:00 AM` | ❌ Fix |

---

### TP-DT-09 · Booking Wizard (`/appointments/book`)

| TC | Field | Location | Current | Expected | Status |
|----|-------|----------|---------|----------|--------|
| DT-09-01 | Date picker selected date | Calendar | Any format | `19/03/2026` in confirmation step | ❌ Fix confirm |
| DT-09-02 | Time slot labels | Slot grid | `09:00`, `09:30` | `9:00 AM`, `9:30 AM` | ❌ Fix |
| DT-09-03 | Booking summary | Confirm step | Raw ISO | `Monday, 16/03/2026 at 9:00 AM` | ❌ Fix |

**Test Steps:**
1. Navigate to `/appointments/book`
2. Select a date → select a time slot
3. In confirmation step, date must read `16/03/2026`, time must read `9:00 AM`
4. Time slot buttons must show `9:00 AM`, not `09:00`

---

### TP-DT-10 · Clinician Availability (`/clinician/availability`)

| TC | Field | Location | Current | Expected | Status |
|----|-------|----------|---------|----------|--------|
| DT-10-01 | Week header dates | Calendar header | `Mon 16 Mar` style | `Mon 16/03` or `16 Mar` | ✅ Check |
| DT-10-02 | Slot start/end times | Availability blocks | `HH:mm` | `h:mm A` | ❌ Fix |
| DT-10-03 | Exception date display | Exceptions list | `YYYY-MM-DD` | `DD/MM/YYYY` | ❌ Fix |

---

### TP-DT-11 · Manager Blocks (`/manager/blocks`)

| TC | Field | Location | Current | Expected | Status |
|----|-------|----------|---------|----------|--------|
| DT-11-01 | Block start date | Table | Raw date | `DD/MM/YYYY` | ❌ Fix |
| DT-11-02 | Block start/end time | Table | `HH:mm` | `h:mm A` | ❌ Fix |

---

### TP-DT-12 · Dashboard (`/dashboard`)

| TC | Field | Location | Current | Expected | Status |
|----|-------|----------|---------|----------|--------|
| DT-12-01 | Today's date in banner | Header | Any format | `Thursday, 19 March 2026` or `Thursday, 19/03/2026` | ✅ Check |
| DT-12-02 | Upcoming appointments | Cards | `2026-03-16T09:00` | `16/03/2026 9:00 AM` | ❌ Fix |
| DT-12-03 | Appointment volume chart X axis | Chart | `YYYY-MM-DD` | `DD/MM` short | ❌ Fix |

---

### TP-DT-13 · Messages (`/messages`)

| TC | Field | Location | Current | Expected | Status |
|----|-------|----------|---------|----------|--------|
| DT-13-01 | Message timestamp | Thread list / bubble | ISO or `MMM DD, HH:mm:ss` | `DD/MM/YYYY h:mm A` or `Today at 2:30 PM` | ❌ Fix |
| DT-13-02 | Last message time | Sidebar list | Raw | Relative: `2 min ago` / `19/03/2026` | ⚠️ Improve |

---

### TP-DT-14 · Analytics (`/analytics`)

| TC | Field | Location | Current | Expected | Status |
|----|-------|----------|---------|----------|--------|
| DT-14-01 | Chart X-axis | Bar/line charts | `YYYY-MM-DD` | `DD/MM` | ❌ Fix |
| DT-14-02 | Date range picker | Filters | ISO input | Label `DD/MM/YYYY` | ❌ Fix |

---

### TP-DT-15 · Finances (`/finances`)

| TC | Field | Location | Current | Expected | Status |
|----|-------|----------|---------|----------|--------|
| DT-15-01 | Transaction date | Table | ISO | `DD/MM/YYYY` | ❌ Fix |
| DT-15-02 | Period label | Filter | `YYYY-MM` | `MM/YYYY` | ❌ Fix |

---

## Implementation Fixes Required

### Correct dayjs Format Strings to Use

```js
// ✅ Date only
dayjs(value).format('DD/MM/YYYY')          // → 19/03/2026

// ✅ Time only (12-hour)
dayjs(`2026-01-01T${time}`).format('h:mm A')  // → 9:00 AM

// ✅ Date + Time
dayjs(isoString).format('DD/MM/YYYY h:mm A')  // → 19/03/2026 9:00 AM

// ✅ Long weekday header
dayjs().format('dddd, DD MMMM YYYY')       // → Thursday, 19 March 2026

// ✅ Short date (e.g. chart axis)
dayjs(value).format('DD/MM')              // → 19/03

// ❌ DO NOT USE
dayjs(value).format('YYYY-MM-DD')         // → 2026-03-19  (ISO — backend only)
dayjs(value).format('HH:mm')             // → 09:00  (24-hour — never in UI)
dayjs(value).format('MMM D, YYYY')        // → Mar 19, 2026  (US format)
```

### Globally Recommended: Date/Time Utility File

Create `frontend/src/utils/dateTime.js`:

```js
import dayjs from 'dayjs';

export const formatDate     = (v) => v ? dayjs(v).format('DD/MM/YYYY') : '—';
export const formatTime     = (v) => v ? dayjs(v).format('h:mm A') : '—';
export const formatDateTime = (v) => v ? dayjs(v).format('DD/MM/YYYY h:mm A') : '—';
export const formatTimeFromStr = (hhmm) =>
  hhmm ? dayjs(`2000-01-01T${hhmm}`).format('h:mm A') : '—';
export const formatLongDate = (v) => v ? dayjs(v).format('dddd, DD MMMM YYYY') : '—';
export const formatShortDate = (v) => v ? dayjs(v).format('DD MMM YYYY') : '—';
```

Then replace all inline `.format()` calls with these helpers.

---

## Priority Order for Fixes

| Priority | Pages | Impact |
|----------|-------|--------|
| 🔴 P1 (High) | Booking Wizard, Appointment Detail, Clinician Dashboard | Patient/clinician sees wrong time |
| 🟡 P2 (Medium) | Clinician Patients, Patient Detail, Appointments List | Date of Birth / visit dates |
| 🟢 P3 (Low) | Analytics charts, Messages, Finances | Data presentation |

---

## Pass Criteria

A page **PASSES** if:
- All date fields show `DD/MM/YYYY` (e.g. `19/03/2026`) ✅
- All time fields show `h:mm A` (e.g. `9:00 AM`, `12:00 PM`) ✅
- No raw ISO strings visible (e.g. `2026-03-19T09:00:00Z`) ✅
- No 24-hour times visible (e.g. `09:00`, `14:30`) ✅
- AM/PM uses single letter capitalized: `AM`, `PM` (not `am`, `pm`) ✅

---

## Total Test Cases

| Module | TCs |
|--------|-----|
| Clinician Dashboard | 4 |
| Clinician Patients | 3 |
| Clinician Calendar | 5 |
| Appointments List | 4 |
| Appointment Detail | 4 |
| Appointment Edit | 3 |
| Patient List | 2 |
| Patient Detail | 3 |
| Booking Wizard | 3 |
| Clinician Availability | 3 |
| Manager Blocks | 2 |
| Dashboard | 3 |
| Messages | 2 |
| Analytics | 2 |
| Finances | 2 |
| **Total** | **45** |
