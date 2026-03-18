# Dashboard — Test Results

**Feature:** Dashboard  
**Test Plan:** [dashboard-test-plan.md](../test-plan/dashboard-test-plan.md)  
**Executed:** 2026-03-16  
**Tester:** Antigravity AI (Browser Agent)  
**Environment:** `http://localhost:3001` (Vite dev server, mock data mode, backend offline)  
**Total Cases:** 10 | **Executed:** 10 | **Passed:** 8 ✅ | **Partial:** 1 ⚠️ | **Failed:** 1 ❌ | **Skipped:** 0

---

## Summary

| Status | Count |
|--------|-------|
| ✅ PASS | 8 |
| ⚠️ PARTIAL | 1 (Clinician Utilization chart — renders but shows "Unknown" names and 0%) |
| ❌ FAIL | 1 (time-range toggle 7D/14D/30D non-functional) |
| ⏭ SKIPPED | 0 |

> **Overall Result: ✅ LARGELY PASSING — Dashboard is one of the strongest modules. Only 2 issues: broken toggles and bad clinician data in utilization chart.**

---

## Bugs Found

| # | Bug | Severity | Affected TC |
|---|-----|----------|-------------|
| BUG-DASH-001 | Time range toggle (7D / 14D / 30D) buttons exist but clicking them doesn't update the chart title or data | 🔴 High | TC-DASH-004 |
| BUG-DASH-002 | Clinician Utilization chart renders with "Unknown" for all clinician names and 0% utilization | 🟡 Medium | TC-DASH-006 |
| BUG-DASH-003 | Table is labeled "Upcoming Appointments" in the UI but test plan refers to it as "Recent Appointments" — naming mismatch | 🟢 Low | TC-DASH-007 |

---

## Test Case Results

### TC-DASH-001 — Four KPI cards visible on load
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | Navigated to `http://localhost:3001/dashboard`. Four KPI cards rendered with exact expected values: **Appointments Today: 24**, **Clinicians: 12**, **Patients: 1,483**, **Revenue: $28,750**. Each card has a number, icon, and trending badge. |
| **Expected** | 4 KPI cards with those exact mock values. |

---

### TC-DASH-002 — KPI trends show correct direction
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | Trend badges confirmed: **Appointments ↑ 8.4%** (green), **Revenue ↑ 9.3%** (green). All arrows point in correct directions with appropriate green/red coloring. |
| **Expected** | ↑/↓ arrows with correct color and percentage. |

---

### TC-DASH-003 — Appointment Volume chart renders
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | "Appointment Volume — Last 30 Days" line chart rendered fully. Both axes visible (date X-axis, count Y-axis). Data points plotted. Tooltip appears on hover. No blank rectangle. |
| **Expected** | Recharts LineChart/BarChart renders with data. |

---

### TC-DASH-004 — Time range toggle (7D / 14D / 30D)
| Field | Value |
|-------|-------|
| **Status** | ❌ FAIL |
| **Actual Result** | Toggle buttons (7D, 14D, 30D) are visible next to the chart header. Clicked **"7D"** — the button showed a visual state change but the chart title remained **"Last 30 Days"** and the chart data did not change. Clicked **"14D"** — same result. The toggle state is not connected to the chart data calculation. |
| **Expected** | Chart data recalculated. Title and X-axis update. |
| **Root Cause** | `chartRange` state likely updates on button click, but the data slice passed to the Recharts component doesn't use `chartRange` — it always uses the full 30-day dataset. |
| **Bug ID** | BUG-DASH-001 |

---

### TC-DASH-005 — Bookings by Service pie chart renders
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | "Bookings by Service" donut chart rendered with a legend showing: **Consultation, Blood Test, MRI Scan, X-Ray**. Each slice has a distinct color. Legend labels are clearly visible. |
| **Expected** | Recharts PieChart with labeled segments. |

---

### TC-DASH-006 — Clinician Utilization chart renders
| Field | Value |
|-------|-------|
| **Status** | ⚠️ PARTIAL |
| **Actual Result** | A bar chart section for "Clinician Utilization" rendered — chart axes and bars are visible. However, all clinician names are displayed as **"Unknown"** and all utilization values show **0%**. The chart structure is correct but the data mapping is broken. |
| **Expected** | Clinician names and their utilization percentages shown correctly. |
| **Root Cause** | The mock clinician utilization data likely uses a different property name than what the chart accesses (e.g., `clinician.name` but data has `clinician.full_name`). |
| **Bug ID** | BUG-DASH-002 |

---

### TC-DASH-007 — Recent appointments table visible
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | A table labeled **"Upcoming Appointments"** (not "Recent Appointments") rendered with columns: Patient, Clinician, Service, Date/Time, Status. At least 5 rows of mock data visible. Status chips colored by type. |
| **Expected** | Table with patient, clinician, service, date, status. ≥5 rows. |
| **Notes** | Minor naming mismatch — table says "Upcoming" but test plan says "Recent". Logged as BUG-DASH-003. |

---

### TC-DASH-008 — Clicking row navigates to appointment detail
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | Clicked on **John Doe's** row in the appointments table. Navigated to `/appointments/appt-1`. Appointment detail page rendered with John Doe's appointment details. |
| **Expected** | Row click → `/appointments/{id}`. Detail page renders. |

---

### TC-DASH-009 — Greeting shows correct name and time of day
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | Welcome banner showed **"Good evening, Admin! 👋"** — correct for the test execution time of ~20:38 IST (evening). Current date displayed below in a readable format. |
| **Expected** | Time-appropriate greeting + current date. |

---

### TC-DASH-010 — Dashboard handles backend error gracefully
| Field | Value |
|-------|-------|
| **Status** | ✅ PASS |
| **Actual Result** | With backend offline, navigated to `/dashboard`. A **yellow warning banner** appeared: *"Some dashboard data could not be loaded — showing available data"*. All KPI cards and charts still rendered using mock data fallback. No white screen. No crash. |
| **Expected** | Yellow warning alert. KPI cards and charts still render. |

---

## Screenshots & Recordings

| File | Description |
|------|-------------|
| `dashboard_test_execution_*.webp` | Full browser recording — KPI cards, charts, toggle test, table navigation |

---

## Follow-up Recommendations

| Action | Priority |
|--------|----------|
| Fix BUG-DASH-001 — Wire `chartRange` state to the chart data slice calculation | 🔴 High |
| Fix BUG-DASH-002 — Fix property name mismatch in clinician utilization data mapping | 🟡 Medium |
| Fix BUG-DASH-003 — Align table label ("Upcoming" vs "Recent Appointments") | 🟢 Low |
