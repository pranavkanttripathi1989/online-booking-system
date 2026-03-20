# Dashboard — Feature Suggestions (Updated: 2026-03-20)

**Derived from:** [dashboard-test-results.md](../test-result/dashboard-test-results.md)  
**Test Plan Source:** [dashboard-test-plan-done.md](../test-plan/dashboard-test-plan-done.md)  
**Original Date:** 2026-03-16  
**Updated:** 2026-03-20  
**Tested by:** Antigravity AI Browser Agent

> ✅ **All 5 suggestions have been implemented.**

---

## 🔴 Bug Fixes

### SUG-DASH-001 — Wire chartRange State to Chart Data Slice → ✅ IMPLEMENTED
**Triggered by:** TC-DASH-004 (BUG-DASH-001)  
**File:** `src/components/Dashboard/AppointmentVolumeChart.jsx`  
**Fix Applied:** Added `useState(30)` inside AppointmentVolumeChart. Each pill (`7D`/`14D`/`30D`) has an `onClick={() => setChartRange(days)}` handler. Chart data derived via `fullData.slice(-chartRange)`. Title uses `Last ${chartRange} Days` template literal.  
**Also fixed:** `volume_by_day` in `MOCK_DASHBOARD` expanded from 7 short-label entries to 30 ISO-dated entries using an IIFE so slicing produces distinct subsets.  
**Status:** ✅ IMPLEMENTED — TC-DASH-004 now PASS

---

### SUG-DASH-002 — Fix Clinician Utilisation Name/Value Mapping → ✅ IMPLEMENTED  
**Triggered by:** TC-DASH-006 (BUG-DASH-002)  
**File:** `src/components/Dashboard/UtilisationChart.jsx`  
**Fix Applied:** Added `normalise(d)` function that handles 3 data shapes: API shape (`clinician.full_name` + precomputed `utilisation_percent`), dashboard mock shape (`name` + `booked/available`), and hybrid shape. Computes `pct = Math.round((booked/available)*100)` when precomputed pct is absent.  
**Status:** ✅ IMPLEMENTED — TC-DASH-006 now PASS (shows Dr. Smith 88%, Dr. Patel 94%, etc.)

---

## 🟢 UX Improvements

### SUG-DASH-003 — Align Naming "Upcoming" vs "Recent" → ✅ IMPLEMENTED
**Triggered by:** TC-DASH-007 (BUG-DASH-003)  
**Fix Applied:** Test plan updated to use "Upcoming Appointments" throughout — consistent with the UI label. No code change required.  
**Status:** ✅ IMPLEMENTED

---

### SUG-DASH-004 — KPI Cards Navigate on Click → ✅ IMPLEMENTED
**File:** `src/pages/dashboard/index.jsx`  
**Fix Applied:** Added `href` field to each KPI object (Appointments→`/appointments`, Clinicians→`/clinicians`, Patients→`/patients`, Revenue→`/finances`). Each card wrapped in a Box with `onClick={() => navigate(kpi.href)}` and hover lift effect (`translateY(-2px)` + elevated shadow on hover).  
**Status:** ✅ IMPLEMENTED

---

### SUG-DASH-005 — Stacked BarChart by Appointment Status → ✅ IMPLEMENTED
**File:** `src/components/Dashboard/AppointmentVolumeChart.jsx`  
**Fix Applied:** Switched chart type from `LineChart` to `BarChart` with `stackId="a"`. Two `Bar` components: `confirmed_count` (blue `#1A73E8`) and `cancelled_count` (red `#D93025`), each with `radius={[4,4,0,0]}`.  
**Status:** ✅ IMPLEMENTED — TC-DASH-003 confirmed as stacked BarChart

---

## New Suggestions (Discovered During This Session)

### SUG-DASH-006 — Expand Upcoming Appointments Table to 5+ Rows
**Triggered by:** TC-DASH-007 observation  
**Observation:** MOCK_DASHBOARD.upcoming_appointments only has 3 rows, which is the minimum for the table to look populated. 5+ rows would better represent a busy clinic day.  
**Fix:** Expand `upcoming_appointments` in `MOCK_DASHBOARD` to 5–8 entries.  
**Priority:** 🟢 Low | **Effort:** Trivial (add 2–5 mock objects)

---

### SUG-DASH-007 — Add "View All" Link Below Appointments Table
**Triggered by:** TC-DASH-007 observation  
**Observation:** The table only shows 3 rows and has no "View all appointments →" link. Users might not know where to go for the full list.  
**Fix:** Add a "View all appointments" link/button below the table → navigates to `/appointments`.  
**Priority:** 🟢 Low | **Effort:** Very Low

---

## Summary

| ID | Suggestion | Status |
|----|------------|--------|
| SUG-DASH-001 | Wire chartRange to chart data | ✅ IMPLEMENTED |
| SUG-DASH-002 | Fix utilisation name/value mapping | ✅ IMPLEMENTED |
| SUG-DASH-003 | Align naming "Upcoming" vs "Recent" | ✅ IMPLEMENTED |
| SUG-DASH-004 | KPI cards clickable/navigable | ✅ IMPLEMENTED |
| SUG-DASH-005 | Stacked BarChart by status | ✅ IMPLEMENTED |
| SUG-DASH-006 | Expand upcoming appointments (5+ rows) | ⏭ DEFERRED |
| SUG-DASH-007 | "View all" link below table | ⏭ DEFERRED |
