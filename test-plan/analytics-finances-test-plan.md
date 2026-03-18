# Analytics & Finances — Test Plan (Updated Post-Implementation)

**Feature area:**  
- `/src/pages/analytics/index.jsx`  
- `/src/pages/finances/index.jsx`  

**Routes tested:** `/analytics`, `/finances`  
**Libraries:** Recharts, Notistack (snackbar), Blob API (export)  
**Access:** Admin, Super Admin, Manager  
**Updated:** 2026-03-18 — Added TC-ANALYTICS-008, TC-ANALYTICS-009, TC-FIN-006, TC-FIN-007

---

## Analytics Page (`/analytics`)

### TC-ANALYTICS-001 — Analytics page loads with charts
**Prompt:**  
> Log in as Admin. Navigate to `http://localhost:3001/analytics`.  
> Assert: at least 5 chart sections visible: Appointment Volume (AreaChart), Service Breakdown (PieChart), Appointment Status Breakdown (PieChart — NEW), Revenue vs Expenses (BarChart), Patient Growth (BarChart), Clinician Utilization (progress bars). No blank rectangles.

**Expected:** All Recharts components render with mock data. Legend labels visible. 4 KPI cards visible at top.

---

### TC-ANALYTICS-002 — Date range filter applies to all charts
**Prompt:**  
> On `/analytics`, change the date range dropdown from "Last 7 Months" to "Last 1 Month".  
> Assert: all time-series charts condense to 1 data point. X-axis shows only "Mar". Subtitle under toggle reads "Showing last 1 months data".  
> Change to "Last 3 Months". Assert: 3 data points (Jan, Feb, Mar).

**Expected:** `dateRange` controlled state + `DATE_RANGE_MONTHS` lookup + `.slice(-monthCount)` applied to all chart data arrays.

---

### TC-ANALYTICS-003 — Appointment status breakdown donut chart
**Prompt:**  
> On `/analytics`, locate the section titled "Appointment Status Breakdown".  
> Assert: a donut/pie chart is visible with 5 colored segments.  
> Assert: legend below shows: Completed (87), Confirmed (42), Cancelled (23), Pending (18), No Show (9).  
> Hover over a segment. Assert: tooltip shows `"87 appts — Completed"` style.

**Expected:** Recharts `<PieChart>` with `<Cell>` per STATUS_BREAKDOWN entry. Tooltip formatter: `(value, name) => [\`${value} appts\`, name]`.

---

### TC-ANALYTICS-004 — Clinician performance chart
**Prompt:**  
> On `/analytics`, find the "Clinician Utilization" section.  
> Assert: 5 clinicians (Dr. Jane Smith, Dr. Carlos Vega, Dr. Amara Patel, Dr. Lena Müller, Dr. Samuel Osei).  
> Assert: utilization % color-coding: ≥80% green, ≥60% amber, <60% red.  
> Assert: progress bar width reflects utilization %.

**Expected:** 5 clinician cards. Smith: 90% green. Osei: 58% red.

---

### TC-ANALYTICS-005 — Revenue over time chart
**Prompt:**  
> On `/analytics`, find the "Revenue vs Expenses" chart.  
> Assert: BarChart with 3 bar groups per month: Revenue (blue), Expenses (red), Profit (green).  
> Assert: Y-axis formatted as `$${n}k` (e.g., $18k, $27k).  
> Assert: Tooltip shows dollar amounts (e.g., "$27,800").

**Expected:** `<BarChart>` with 3 `<Bar>` components. Dollar-formatted Y-axis and tooltip.

---

### TC-ANALYTICS-006 — Export CSV button
**Prompt:**  
> On `/analytics`, click the "Export CSV" button in the header.  
> Assert: browser downloads a `.csv` file.  
> Assert: success snackbar appears: "Analytics CSV downloaded successfully!".  
> (Optional) Verify CSV filename contains the selected date range.

**Expected:** Blob API generates CSV. `enqueueSnackbar('Analytics CSV downloaded successfully!', { variant: 'success' })`.

---

### TC-ANALYTICS-007 — Non-admin access blocked
**Prompt:**  
> Navigate to `http://localhost:3001/forbidden`.  
> Assert: redirected to `/403` and "Access Forbidden" page shows (not a 404).

**Expected:** Route alias `<Route path="/forbidden" element={<Navigate to="/403" replace />}` works.

---

### TC-ANALYTICS-008 — Date range "Last 3 Months" shows correct slice (NEW)
**Prompt:**  
> On `/analytics`, select "Last 3 Months" from the date range dropdown.  
> Assert: Appointment Volume X-axis shows exactly 3 labels (Jan, Feb, Mar).  
> Assert: Revenue vs Expenses shows exactly 3 bar groups.  
> Assert: subtitle says "Showing last 3 months data".

**Expected:** `monthCount = 3`; `.slice(-3)` applied to all monthly arrays.

---

### TC-ANALYTICS-009 — Status breakdown donut tooltip accuracy (NEW)
**Prompt:**  
> On `/analytics`, scroll to "Appointment Status Breakdown".  
> Hover over the green segment (Completed).  
> Assert: tooltip shows `87 appts` and label `Completed`.  
> Hover over the red segment. Assert: `23 appts — Cancelled`.

**Expected:** Recharts `<Tooltip formatter=(value, name) => [\`${value} appts\`, name]>` fires.

---

## Finances Page (`/finances`)

### TC-FIN-001 — Finances page loads with KPI cards
**Prompt:**  
> Log in as Admin. Navigate to `http://localhost:3001/finances`.  
> Assert: 4 KPI cards (Active Balance $12,480, Bonus Credits $320, Revenue This Month $8,750, Total Expenses $1,550).  
> Assert: trend indicators visible (%, green/red arrows).

**Expected:** All mock finance data renders with correct formatting.

---

### TC-FIN-002 — Invoice table loads (Payment History tab)
**Prompt:**  
> On `/finances`, Payment History tab (default).  
> Assert: 9 rows visible (TXN-001 through TXN-009).  
> Assert: columns: #, Patient/Description, Service, Date, Amount (+/-$), Method (chip), Status (chip with left accent), View Receipt (icon).  
> Assert: "9 transactions" count label visible.

**Expected:** All 9 TRANSACTIONS mock rows render. Status chips have `borderLeft: 3px solid ${accent}`.

---

### TC-FIN-003 — Filter invoices by status — Overdue
**Prompt:**  
> On `/finances` Payment History tab, click the "Overdue" status filter toggle button.  
> Assert: transaction count drops to "2 transactions".  
> Assert: Only James Wilson (TXN-007, Physiotherapy, 02 Feb 2026) and Olivia Brown (TXN-008, Follow-Up, 28 Jan 2026) visible.  
> Assert: Both have red "Overdue" chip with red left accent.

**Expected:** `useMemo` applies `t.status === 'overdue'`. Count label reads "2 transactions".

---

### TC-FIN-004 — Revenue chart renders (Revenue Chart tab)
**Prompt:**  
> On `/finances`, click the "Revenue Chart" tab (second tab, BarChart icon).  
> Assert: 3 summary cards visible: "Total Revenue", "Total Expenses", "Net Profit" with $ values.  
> Assert: BarChart below shows 7 months (Sep–Mar) with Revenue (blue) and Expenses (red) bars.  
> Assert: X-axis shows month names. Y-axis formatted as `$${v/1000}k`.

**Expected:** `MONTHLY_REVENUE` data renders. Total Revenue = $155,400, Expenses = $61,100, Profit = $94,300.

---

### TC-FIN-005 — Finance page is admin/manager only
**Prompt:**  
> Access `/finances` as Admin. Assert page loads fully.  
> (Manual validation) Log in as Clinician role. Navigate to `/finances`. Assert redirected to `/403`.

**Expected:** `RoleGuard` allows admin. Blocks clinician with redirect to `/403`.

---

### TC-FIN-006 — Combined type + status filter (NEW)
**Prompt:**  
> On `/finances` Payment History tab, click "Income" type chip AND "Pending" status toggle.  
> Assert: shows only income transactions that are pending.  
> Assert: TXN-005 (Mark Johnson, X-Ray) and TXN-009 (Ethan Park, Lab Test) visible.  
> Assert: count reads "2 transactions".

**Expected:** Both filters applied via `useMemo`: `t.type === 'income' && t.status === 'pending'`.

---

### TC-FIN-007 — Export Report button on Finances (NEW)
**Prompt:**  
> On `/finances`, click "Export Report" button in header.  
> Assert: file downloads as `finances_report_YYYY-MM-DD.csv`.  
> Assert: snackbar shows "Report downloaded (9 transactions)" (count matches current filtered set).  
> Filter to "Overdue" first, then export. Assert snackbar shows "Report downloaded (2 transactions)".

**Expected:** Export respects active filters — rows = `filtered` array. Count in snackbar matches.
