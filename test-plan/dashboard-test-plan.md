# Dashboard — Test Plan

**Feature area:** `/src/pages/dashboard/index.jsx`  
**Route tested:** `/dashboard`  
**Libraries:** Recharts (Bar, Line, Pie charts), dayjs  
**Mock data:** `src/mocks/store.js` + inline dashboard KPI mock  
**Access:** All authenticated roles (content varies by role)

---

## 1. KPI Cards

### TC-DASH-001 — Four KPI cards visible on load
**Prompt:**  
> Log in as Admin. Navigate to `http://localhost:3001/dashboard`.  
> Assert: four KPI cards visible: "Total Appointments Today", "Total Clinicians", "Total Patients", "Revenue This Month". Each shows a number, trending badge, and icon.

**Expected:** KPI cards render. Mock values: 24 appointments, 12 clinicians, 1483 patients, $28,750 revenue.

---

### TC-DASH-002 — KPI trends show correct direction
**Prompt:**  
> Observe the trend badges on KPI cards.  
> Assert: "↑ 8.4%" shown in green on Appointments Today. Revenue shows "↑ 9.3%". All badges match expected direction.

**Expected:** Trend arrows (↑/↓) with correct color (green/red) and percentage.

---

## 2. Charts

### TC-DASH-003 — Appointment Volume chart renders
**Prompt:**  
> On `/dashboard`, scroll to the "Appointment Volume — Last 30 Days" section.  
> Assert: a line or bar chart renders with time axis (dates) and appointment count axis. Tooltip appears on hover.

**Expected:** Recharts `<LineChart>` or `<BarChart>` renders. Data points visible. No blank rectangle.

---

### TC-DASH-004 — Time range toggle (7D / 14D / 30D)
**Prompt:**  
> Click "7D" button on the chart.  
> Assert: chart data changes to show only the last 7 days. X-axis updates. Click "30D" — reverts to 30-day view.

**Expected:** `chartRange` state changes. Chart data recalculated. Smooth transition.

---

### TC-DASH-005 — Bookings by Service pie chart renders
**Prompt:**  
> On `/dashboard`, locate "Bookings by Service" chart.  
> Assert: pie/donut chart visible with legend (Consultation, Blood Test, MRI Scan, X-Ray, etc.). Slices have distinct colors.

**Expected:** Recharts `<PieChart>` renders with labeled segments.

---

### TC-DASH-006 — Clinician Utilization chart renders
**Prompt:**  
> On `/dashboard`, find the utilization chart section.  
> Assert: bar chart with clinician names on Y-axis and utilization % on X-axis (or vice versa).

**Expected:** Recharts `<BarChart>` renders. All clinicians listed. Progress bars at correct values.

---

## 3. Recent Appointments Table

### TC-DASH-007 — Recent appointments table visible
**Prompt:**  
> On `/dashboard`, scroll to the "Recent Appointments" section.  
> Assert: table with columns: Patient Name, Clinician, Service, Date-Time, Status visible. At least 5 rows.

**Expected:** Table renders with mock appointment data.

---

### TC-DASH-008 — Clicking a recent appointment navigates to detail
**Prompt:**  
> Click on any row in the Recent Appointments table.  
> Assert: navigated to `/appointments/{id}`. Appointment detail page renders.

**Expected:** Row click → `navigate('/appointments/' + id)`.

---

## 4. Welcome Banner

### TC-DASH-009 — Greeting shows correct name and time-of-day
**Prompt:**  
> Log in as Admin. On `/dashboard`, observe the greeting.  
> Assert: "Good morning/afternoon/evening, Admin!" shown with wave emoji. Current date shown below.

**Expected:** Greeting changes based on hour. `dayjs()` format used for date.

---

## 5. Error State

### TC-DASH-010 — Dashboard handles backend error gracefully
**Prompt:**  
> With backend offline, navigate to `/dashboard`.  
> Assert: a yellow warning alert "Some dashboard data could not be loaded — showing available data" appears. KPI cards and charts still render with mock data.

**Expected:** `errorPolicy: 'all'` allows partial success. Warning banner shown. Mock data fills in gaps.
