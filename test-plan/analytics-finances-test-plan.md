# Analytics & Finances — Test Plan (Updated v2 — Post-Implementation)

**Feature area:**  
- `/src/pages/analytics/index.jsx`  
- `/src/pages/finances/index.jsx`  

**Routes tested:** `/analytics`, `/finances`  
**Libraries:** Recharts, Notistack (snackbar), Blob API (export), MUI Drawer, localStorage  
**Access:** Admin, Super Admin, Manager  
**Updated:** 2026-03-26 — Added TC-ANALYTICS-010/011, TC-FIN-008/009; improved edge-case coverage

---

## Analytics Page (`/analytics`)

### TC-ANALYTICS-001 — Analytics page loads with charts
**Prompt:**  
> Log in as Admin. Navigate to `http://localhost:3001/analytics`.  
> Assert: 6 chart sections visible: Appointment Volume (AreaChart), Service Breakdown (PieChart), Appointment Status Breakdown (PieChart), Revenue vs Expenses (BarChart), Patient Growth (StackedBarChart), Clinician Utilization (progress bars). No blank rectangles.

**Expected:** All Recharts components render with mock data. 4 KPI cards at top. Compare button + date range dropdown in header.

---

### TC-ANALYTICS-002 — Date range filter applies to all charts
**Prompt:**  
> On `/analytics`, change the date range dropdown from "Last 7 Months" to "Last 1 Month".  
> Assert: all time-series charts condense to 1 data point. X-axis shows only "Mar". Subtitle includes "Last 1 Month".  
> Change to "Last 3 Months". Assert: 3 data points (Jan, Feb, Mar).

**Expected:** `dateRange` controlled state + `DATE_RANGE_MONTHS` lookup + `.slice(-monthCount)` applied to all chart data arrays.

---

### TC-ANALYTICS-003 — Appointment status breakdown donut chart
**Prompt:**  
> On `/analytics`, locate "Appointment Status Breakdown".  
> Assert: donut/pie chart with 5 colored segments.  
> Assert: legend shows: Completed (87), Confirmed (42), Cancelled (23), Pending (18), No Show (9).  
> Hover over a segment. Assert: tooltip shows `"87 appts — Completed"` style.

**Expected:** Recharts `<PieChart>` with `<Cell>` per STATUS_BREAKDOWN entry.

---

### TC-ANALYTICS-004 — Clinician performance chart
**Prompt:**  
> On `/analytics`, find "Clinician Utilization".  
> Assert: 5 clinicians with color-coded progress bars: ≥80% green, ≥60% amber, <60% red.  
> Assert: `role="progressbar"` ARIA attribute on each bar container.

**Expected:** Smith: 90% green. Osei: 58% red. ARIA attributes present.

---

### TC-ANALYTICS-005 — Revenue over time chart
**Prompt:**  
> On `/analytics`, find "Revenue vs Expenses" BarChart.  
> Assert: 3 bar groups per month (Revenue blue, Expenses red, Profit green).  
> Assert: Y-axis formatted as `$${n}k`. Tooltip shows dollar amounts.

**Expected:** `<BarChart>` with 3 `<Bar>` components. Dollar-formatted Y-axis and tooltip.

---

### TC-ANALYTICS-006 — Export CSV button
**Prompt:**  
> On `/analytics`, click "Export CSV".  
> Assert: browser downloads a `.csv` file.  
> Assert: success snackbar: "Analytics CSV downloaded successfully!".  
> Assert: filename contains selected date range and today's ISO date.

**Expected:** Blob API generates CSV. Snackbar green. Filename e.g. `analytics_last7months_2026-03-26.csv`.

---

### TC-ANALYTICS-007 — Non-admin access blocked
**Prompt:**  
> Navigate to `http://localhost:3001/forbidden`.  
> Assert: redirected to `/403`, "Access Forbidden" page shows (not 404).

**Expected:** Route alias `<Route path="/forbidden" element={<Navigate to="/403" replace />}`.

---

### TC-ANALYTICS-008 — Date range "Last 3 Months" shows correct slice
**Prompt:**  
> On `/analytics`, select "Last 3 Months".  
> Assert: Appointment Volume X-axis shows exactly 3 labels (Jan, Feb, Mar).  
> Assert: Revenue vs Expenses shows exactly 3 bar groups.  
> Assert: subtitle mentions "Last 3 Months".

**Expected:** `monthCount = 3`; `.slice(-3)` applied to all monthly arrays.

---

### TC-ANALYTICS-009 — Status breakdown donut tooltip accuracy
**Prompt:**  
> On `/analytics`, scroll to "Appointment Status Breakdown".  
> Hover over the green segment (Completed). Assert: tooltip shows `87 appts` and `Completed`.  
> Hover over the red segment. Assert: `23 appts — Cancelled`.

**Expected:** Recharts `<Tooltip formatter={(value, name) => [\`${value} appts\`, name]}>` fires.

---

### TC-ANALYTICS-010 — Compare mode (period-over-period) [NEW]
**Prompt:**  
> On `/analytics`, click the "Compare" button in the header.  
> Assert: button changes to "Comparing" (filled/contained style).  
> Assert: each of the 4 KPI cards reveals a "vs prior period" comparison badge showing % delta and prior value.  
> Click "Comparing" again. Assert: badges disappear.

**Expected:** `compareMode` state toggle. `CompareBadge` renders under each KPI. Accessible `aria-pressed`.

---

### TC-ANALYTICS-011 — Weekly mode responsive to date range [NEW - FIX NEW-AF-002]
**Prompt:**  
> On `/analytics`, click "Weekly" timeframe toggle.  
> Assert: chart shows daily data points labeled "Wk3 Mon", "Wk3 Tue" etc.  
> Change date range to "Last 3 Months". Assert: chart now shows 14 data points (Wk2 + Wk3).  
> Change to "Last 1 Month". Assert: only 7 data points (Wk3 only).  
> Assert: subtitle reflects `weekCount` and selected range.

**Expected:** `ALL_WEEKLY_APPTS.slice(-weekCount)` where `weekCount` from `DATE_RANGE_WEEKS` map.

---

### TC-ANALYTICS-012 — Empty state: single data point monthly [EDGE CASE]
**Prompt:**  
> Select "Last 1 Month". Assert: charts render correctly with a single data point — no crash, no blank area.  
> Assert: X-axis shows "Mar". Area chart, Bar chart, Patient Growth chart all render single-bar/single-point.

**Expected:** `.slice(-1)` returns array of 1; Recharts handles single-item arrays gracefully.

---

### TC-ANALYTICS-013 — Accessibility baseline [NEW]
**Prompt:**  
> Open browser DevTools accessibility panel on `/analytics`.  
> Assert: date range dropdown has `aria-label`.  
> Assert: Compare button has `aria-pressed`.  
> Assert: progress bars have `role="progressbar"` and `aria-valuenow`.  
> Assert: Export CSV button has `aria-label`.

**Expected:** All ARIA attributes present as documented.

---

## Finances Page (`/finances`)

### TC-FIN-001 — Finances page loads with KPI cards
**Prompt:**  
> Log in as Admin. Navigate to `/finances`.  
> Assert: 4 KPI cards (Active Balance $12,480, Bonus Credits $320, Revenue $8,750, Total Expenses $1,550).  
> Assert: trend indicators visible (%, green/red arrows).

**Expected:** All mock finance data renders with correct formatting.

---

### TC-FIN-002 — Invoice table loads (Payment History tab)
**Prompt:**  
> Default Payment History tab.  
> Assert: 9 rows (TXN-001 through TXN-009).  
> Assert: columns: #, Patient/Description, Service, Date, Amount (+/-$), Method (chip), Status (left accent chip), Receipt icon.  
> Assert: "9 transactions" count label.

**Expected:** All 9 TRANSACTIONS mock rows render. Status chips have `borderLeft: 3px solid ${accent}`.

---

### TC-FIN-003 — Filter invoices by status — Overdue
**Prompt:**  
> Click "Overdue" status toggle.  
> Assert: count = "2 transactions".  
> Assert: Only James Wilson (TXN-007) and Olivia Brown (TXN-008) visible with red chips.

**Expected:** `useMemo` applies `t.status === 'overdue'`.

---

### TC-FIN-004 — Revenue chart renders with date range selector [ENHANCED]
**Prompt:**  
> Click "Revenue Chart" tab.  
> Assert: 3 KPI cards (Total Revenue, Total Expenses, Net Profit). BarChart with 7 months.  
> Assert: a date range dropdown is visible on this tab.  
> Switch to "Last 3 Months". Assert: KPI totals recalculate, chart shows 3 bars.  
> Switch to "Last 1 Month". Assert: single bar, single-month totals.

**Expected:** `ALL_MONTHLY_REVENUE.slice(-revenueMonthCount)` updates dynamically.

---

### TC-FIN-005 — Finance page accessible to admin
**Prompt:**  
> Access `/finances` as Admin. Assert page loads fully with 3 tabs.

**Expected:** RoleGuard allows admin. All 3 tabs accessible.

---

### TC-FIN-006 — Combined type + status filter
**Prompt:**  
> Click "Income" type chip AND "Pending" status toggle.  
> Assert: "2 transactions" (Mark Johnson, Ethan Park).

**Expected:** Both filters applied via `useMemo`.

---

### TC-FIN-007 — Export Report respects active filters
**Prompt:**  
> Export with all 9 transactions. Assert snackbar: "Report downloaded (9 transactions)".  
> Filter to "Overdue". Export. Assert snackbar: "Report downloaded (2 transactions)".

**Expected:** Export uses `filtered` array, not raw TRANSACTIONS.

---

### TC-FIN-008 — Invoice detail drawer (SUG-AF-007) [NEW]
**Prompt:**  
> On Payment History tab, click the receipt icon on TXN-007 (James Wilson, overdue).  
> Assert: slide-in drawer opens from the right.  
> Assert: shows Transaction ID (TXN-007), patient avatar, Service (Physiotherapy), Date, Method (Cash), Amount (+$220 green), Status (Overdue chip red).  
> Assert: red overdue warning banner visible in drawer.  
> Assert: Close (X) button in header dismisses drawer.  
> Repeat for TXN-001 (paid). Assert: no overdue warning for paid transactions.

**Expected:** `<InvoiceDrawer>` renders with correct tx data. Overdue banner only when `tx.status === 'overdue'`.

---

### TC-FIN-009 — Date range sync (SUG-AF-008) [NEW]
**Prompt:**  
> Navigate to `/analytics`. Change date range to "Last 3 Months".  
> Navigate to `/finances`. Click "Revenue Chart" tab.  
> Assert: date range dropdown shows "Last 3 Months" (pre-filled from localStorage).

**Expected:** `localStorage.getItem('medibook_dateRange')` read on Finances mount.

---

### TC-FIN-010 — Empty state: no transactions match filter [EDGE CASE]
**Prompt:**  
> On Payment History tab, click "Expense" type chip AND "Overdue" status toggle.  
> Assert: no expense transactions are overdue, so table shows empty state message.  
> Assert: message reads "No transactions matching the selected filters." (centered, not blank).

**Expected:** `filtered.length === 0` → `<TableCell colSpan={8}>` empty state row renders.

---

### TC-FIN-011 — Payment Methods tab loads [EXISTING]
**Prompt:**  
> Click "Payment Methods" tab.  
> Assert: 2 saved cards shown (Visa ending 4521 Default, Mastercard ending 7832).  
> Assert: Default card has blue border + "Default" chip.  
> Assert: non-default card has "Set Default" button and delete icon.

**Expected:** `CARDS` mock renders. Default card highlighted `2px solid #1A73E8`.

---

### TC-FIN-012 — Drawer accessibility [NEW]
**Prompt:**  
> Open invoice drawer for any transaction.  
> Assert: Close button has `aria-label="Close drawer"`.  
> Assert: Print button has `aria-label="Print receipt"`.  
> Assert: Receipt icon buttons in table have `aria-label="View receipt for TXN-xxx"`.

**Expected:** All ARIA labels on drawer buttons present.
