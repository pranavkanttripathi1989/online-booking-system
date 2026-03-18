# Manager Dashboard — Detailed Test Plan

**File:** `frontend/src/pages/manager/Dashboard.jsx`
**Route:** `/manager/dashboard`

---

## Feature Overview

Analytics overview page with date-range filtering, clinic filtering, 5 KPI cards, a time-series line chart, a status-distribution pie chart, a revenue-by-clinic bar chart, a top-clinicians table, and a paginated recent-transactions table. Falls back to rich mock data when the Apollo query fails.

---

## Test Cases

### TC-MGR-DASH-01 — Page Loads with Mock Data (Apollo Offline)
**Description:** When the backend is unreachable, the dashboard still renders using the hardcoded mock fallback values.
**Steps:**
1. Disable/mock the backend so Apollo returns an error.
2. Navigate to `/manager/dashboard`.
**Expected:**
- Page renders without crashing.
- KPI cards show values (1,245 / £145,200 / 840 / 78% / 12%).
- Charts render with mock time-series, pie, and bar data.
- Top clinicians table shows 3 rows.
- Recent transactions table shows 3 rows.

---

### TC-MGR-DASH-02 — Loading Skeleton State
**Description:** Skeleton placeholders appear while Apollo query is in-flight.
**Steps:**
1. Add artificial network delay.
2. Navigate to `/manager/dashboard`.
**Expected:**
- KPI cards display `...` text.
- Chart areas show `<Skeleton>` rectangles.
- Transactions table shows 3 skeleton rows.

---

### TC-MGR-DASH-03 — Date Toggle: 7D / 30D / 90D
**Description:** Switching the toggle rerequests data with the correct date range.
**Steps:**
1. Click `7D` toggle.
2. Click `30D` toggle.
3. Click `90D` toggle.
**Expected:**
- Only one toggle button is highlighted (exclusive).
- Each click fires a new Apollo query with `startDate` calculated from today minus 7/30/90 days and `endDate = today`.
- KPI cards and charts update accordingly.

---

### TC-MGR-DASH-04 — Date Toggle: Custom Range
**Description:** Selecting "Custom" reveals date pickers; the pickers drive the query.
**Steps:**
1. Click `Custom` toggle.
2. Set Start date to `2026-01-01` and End date to `2026-01-31`.
**Expected:**
- Two date pickers appear.
- Apollo query is issued with `startDate=2026-01-01` and `endDate=2026-01-31`.
- Charts/KPIs update.

---

### TC-MGR-DASH-05 — Custom Date: Start After End (Edge Case)
**Description:** If Start > End, the query should still execute but charts may show empty data.
**Steps:**
1. Set Custom Start = `2026-03-15`, End = `2026-01-01`.
**Expected:**
- No crash; query fires with inverted dates but data may be empty.
- **BUG / Enhancement:** Ideally a validation warning prevents this.

---

### TC-MGR-DASH-06 — Clinic Filter: "All Clinics"
**Description:** Default "All Clinics" passes `clinicId=null` to the query.
**Steps:**
1. Verify the Clinic dropdown defaults to "All Clinics".
2. Check the Apollo query variable.
**Expected:**
- `clinicId` variable is `null`.
- All-clinic summary data is shown.

---

### TC-MGR-DASH-07 — Clinic Filter: Individual Clinic
**Description:** Selecting a specific clinic passes its ID to the query.
**Steps:**
1. Click the Clinic dropdown.
2. Select any clinic (e.g., the first one returned from `getClinics`).
**Expected:**
- Query refires with `clinicId = <selected_id>`.
- Charts and KPIs show filtered data.

---

### TC-MGR-DASH-08 — Clinic Dropdown Populated from API
**Description:** The clinic select options are sourced from `getClinics`, not hardcoded.
**Steps:**
1. Open the clinic dropdown.
**Expected:**
- Options match the clinic names returned by `getClinics`.
- "All Clinics" option is always present at the top.

---

### TC-MGR-DASH-09 — KPI Cards: Trend Indicators
**Description:** Each KPI card displays trend badges (positive = green ↑, negative = red ↓).
**Steps:**
1. Load the dashboard with mock data.
**Expected:**
- `Total Appointments` trend = +12 (positive indicator).
- `Cancellation Rate` trend = -2 (negative indicator displayed correctly; lower = better).
- Trend values are formatted correctly.

---

### TC-MGR-DASH-10 — Appointments Over Time Line Chart
**Description:** The line chart renders three lines: Scheduled, Completed, Cancelled.
**Steps:**
1. View the "Appointments Over Time" chart.
**Expected:**
- Three labelled lines with correct colours (teal/green/red).
- X-axis shows dates, Y-axis shows counts.
- Tooltip on hover shows the three values for that date.
- Legend is visible.

---

### TC-MGR-DASH-11 — Status Distribution Pie Chart
**Description:** The donut chart shows four segments: Completed, Scheduled, Cancelled, No-Show.
**Steps:**
1. View the "Status Distribution" card.
**Expected:**
- Four colour-coded segments.
- Labels inside segments show percentage (only if segment > 5%).
- Hovering a segment shows tooltip with name + value.
- Legend displayed vertically on the right.

---

### TC-MGR-DASH-12 — Revenue by Clinic Horizontal Bar Chart
**Description:** The horizontal bar chart shows revenue per clinic sorted descending.
**Steps:**
1. View the "Revenue by Clinic" card.
**Expected:**
- Y-axis shows clinic names; X-axis formatted as `£Xk`.
- Hovering a bar shows formatted tooltip (e.g., `£65,000`).

---

### TC-MGR-DASH-13 — Top Performing Clinicians Table
**Description:** The top clinicians mini-table shows rank, name, appointments, revenue.
**Steps:**
1. View the "Top Performing Clinicians" card.
**Expected:**
- Rows ranked 1, 2, 3 with coloured rank badges.
- Columns: Clinician, Appts, Revenue (£ formatted).
- No pagination (shows all top clinicians).

---

### TC-MGR-DASH-14 — Recent Transactions Table: Pagination
**Description:** The transaction table paginates 5 rows per page.
**Steps:**
1. Ensure > 5 transactions exist (mock data has 3, so this is degenerate with mock data).
2. Navigate to page 2 if available.
**Expected:**
- Rows displayed = min(5, remaining).
- `TablePagination` shows correct total and page controls.
- Clicking next/previous changes visible rows correctly.

---

### TC-MGR-DASH-15 — Transaction Status Chip: Paid / Pending / Failed
**Description:** Transaction status is mapped and styled correctly.
**Steps:**
1. Review transactions with `status = 'succeeded'`, `'pending'`, `'failed'`.
**Expected:**
- `succeeded` → displayed as "Paid" chip (green).
- `pending` → displayed as "pending" chip (amber).
- `failed` → displayed as "Failed" chip (red).

---

### TC-MGR-DASH-16 — Transaction Amount Colour Coding
**Description:** Revenue amounts colour differently based on payment status.
**Steps:**
1. Compare `succeeded` vs `pending` transaction rows.
**Expected:**
- `succeeded`/`paid` → amount shown in brand colour (`#006D77`).
- Others → `text.primary`.

---

### TC-MGR-DASH-17 — Patient Gravatar Avatar in Transactions
**Description:** Patient avatar uses Gravatar with fallback `?d=mp`.
**Steps:**
1. View a transaction row's patient cell.
**Expected:**
- Avatar image loads (Gravatar or fallback mystery person).
- Patient name is displayed next to avatar.

---

### TC-MGR-DASH-18 — Skip Query When Not Logged In
**Description:** The `skip: !user` option on `useQuery` prevents an unauthenticated call.
**Steps:**
1. Simulate `useAuth` returning `null`/`undefined` user.
**Expected:**
- No GraphQL request is fired.
- Mock data fallbacks render correctly.

---

### TC-MGR-DASH-19 — Responsive Layout: Mobile
**Description:** Header controls stack vertically on small screens.
**Steps:**
1. Resize browser to 375px width.
**Expected:**
- Date filter toggle and clinic dropdown wrap to a column layout.
- KPI card row is horizontally scrollable.
- Charts fill 100% width.

---

### TC-MGR-DASH-20 — Combined Filter: Custom Date + Specific Clinic
**Description:** Both filters can be applied simultaneously.
**Steps:**
1. Set Custom date range.
2. Select a specific clinic.
**Expected:**
- Query fires with both `clinicId` and the custom date range.
- Data updates accordingly.

---

## Edge Cases

| # | Edge Case | Expected Behaviour |
|---|-----------|-------------------|
| E1 | `timeSeriesData` returns empty array | Line chart renders with no lines; no crash |
| E2 | `statusDistribution` has one segment | Pie chart renders single full segment |
| E3 | `topClinicians` list is empty | Table shows empty state; no crash |
| E4 | `revenueByClinic` is empty | Bar chart renders empty; no crash |
| E5 | `transactions` is empty array | Table shows 0 rows + correct page count (0) |
| E6 | Transaction with null `appointment` | Patient/Clinician/Service cells show `—` or blank |
| E7 | Price = 0 | `£0.00` displayed; not blank/undefined |
| E8 | Toggling date filter rapidly | No duplicate queries; state is stable |
| E9 | `getClinics` returns empty list | Only "All Clinics" option shown; no error |
| E10 | Custom dates not yet picked (null) | Fallback to today's date; no `NaN` in query vars |
