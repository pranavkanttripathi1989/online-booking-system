# Manager Dashboard — Test Suggestions

**Derived from:** [manager-dashboard-test-results.md](../test-result/manager-dashboard-test-results.md)  
**Source File:** `frontend/src/pages/manager/Dashboard.jsx`  
**Date:** 2026-03-17

---

## 🔴 High Priority — Bug Fix

### SUG-DASH-001 — Add Frontend Validation: Start Date Cannot Be After End Date (BUG-DASH-001)

**Location:** `Dashboard.jsx` — `useMemo` for `startStr/endStr` (lines 134–147)  
**Problem (TC-05 FAIL):** Setting Start > End is silently accepted, triggering a nonsensical query.

**Fix — Add guard in the `useMemo`:**
```js
const { startStr, endStr } = useMemo(() => {
  if (dateFilter === 'custom') {
    const start = customStart?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD')
    const end   = customEnd?.format('YYYY-MM-DD')   || dayjs().format('YYYY-MM-DD')
    // Swap if inverted
    if (start > end) return { startStr: end, endStr: start }
    return { startStr: start, endStr: end }
  }
  // ... rest unchanged
}, [dateFilter, customStart, customEnd])
```
**Alternative:** Surface a MUI `Alert` warning below the date pickers:
```jsx
{dateFilter === 'custom' && customStart?.isAfter(customEnd) && (
  <Alert severity="warning" sx={{ py: 0 }}>Start date cannot be after End date.</Alert>
)}
```
**Priority:** 🔴 High | **Effort:** 3 lines

---

## 🟡 Medium Priority — Feature Gaps

### SUG-DASH-002 — Wire Dashboard to Live Backend

**Problem:** All charts, KPIs, and transactions use mock data. Real `getAppointmentStats` and `getTransactionsByDate` queries are defined but return null (backend offline).

**Action:** When backend is live:
1. Ensure `getAppointmentStats` resolver returns the exact shape: `{ totalAppointments, revenue, activePatients, utilization, cancellationRate, trends{...}, timeSeriesData[...], statusDistribution[...], revenueByClinic[...], topClinicians[...] }`
2. Ensure `getTransactionsByDate` returns `{ id, createdAt, amount, status, appointment{clinician{name}, patient{id,firstName,lastName}, product{name}} }`
3. Remove or make optional the hardcoded mock fallbacks once data is live.

**Priority:** 🟡 Medium

---

### SUG-DASH-003 — Add Empty States for Charts When Data is Empty

**Relevant Edge Cases:** E1, E2, E3, E4, E5  
Currently all charts render correctly with mock data. With live backend filtered data, charts may receive empty arrays.

**Fix — Add empty state guards:**
```jsx
{/* Line chart */}
{stats.timeSeriesData.length === 0 ? (
  <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
    <Typography>No appointment data for this period.</Typography>
  </Box>
) : (
  <ResponsiveContainer> ... </ResponsiveContainer>
)}

{/* Top Clinicians */}
{stats.topClinicians.length === 0 ? (
  <Typography color="text.secondary" textAlign="center" py={4}>No clinician data available.</Typography>
) : ( ... table ... )}
```

**Priority:** 🟡 Medium

---

### SUG-DASH-004 — Transactions: Increase Mock Data for Pagination Testing

**Problem (TC-14):** Mock has only 3 transactions (<5 = 1 page). Pagination cannot be tested without ≥6 transactions.

**Fix:** Expand mock to 8 rows:
```js
const transactions = data?.getTransactionsByDate || [
  // existing 3 + 5 more mock rows...
  { id: 'TRX_4', createdAt: new Date().toISOString(), amount: 95.00, status: 'succeeded', appointment: {...} },
  { id: 'TRX_5', createdAt: new Date().toISOString(), amount: 120.00, status: 'failed', appointment: {...} },
  // ...
]
```
This enables pagination "Next Page" testing and the "failed" status chip (red).

**Priority:** 🟡 Medium (enables TC-14 full pass + TC-15 'Failed' chip test)

---

### SUG-DASH-005 — Add "Failed" Transaction Mock to Test Red Chip (TC-15 Gap)

**Problem:** Current mock has no `status: 'failed'` transaction. The red "Failed" chip logic exists (line 410: `trx.status === 'failed' ? 'Failed' : trx.status`) but is untested.

**Add one mock row:**
```js
{ id: 'TRX_FAIL', createdAt: new Date().toISOString(), amount: 45.00, status: 'failed', appointment: { clinician: { name: 'Dr. Emily Blunt' }, patient: { id: 4, firstName: 'Alice', lastName: 'Wong' }, product: { name: 'Blood Test' } } }
```
**Priority:** 🟡 Medium | **Effort:** 5 lines

---

### SUG-DASH-006 — Add Chart Legend to Pie Chart (Missing in Test Plan TC-11)

**Current state:** Pie chart has `<Legend layout="vertical" align="right" />`. However no color swatch appears below the chart for the "Revenue by Clinic" bar chart.

**Enhancement:** Add a color legend to the bar chart or tooltip that labels the bars by clinic:
```jsx
<Legend iconType="square" formatter={(value) => value} />
```
**Priority:** 🟢 Low

---

## 🟢 Low Priority — UX Improvements

### SUG-DASH-007 — Add "Rows per page" Options to Transactions Pagination

**Source:** Line 420: `rowsPerPageOptions={[5]}` — locked to 5.  
**Enhancement:**
```jsx
<TablePagination
  rowsPerPageOptions={[5, 10, 25]}
  ...
  onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0) }}
/>
```
**Priority:** 🟢 Low

---

### SUG-DASH-008 — Export / Download Button for Transactions

The test plan doesn't mention an export button but the billing page has one. Adding an export CSV for transactions would be consistent.  
**Priority:** 🟢 Low

---

### SUG-DASH-009 — Add Loading State to Export + Clinic Dropdown

When clinic dropdown is loading (fetching `getClinics`), show a loading indicator in the dropdown. Currently, if `getClinics` is slow, the dropdown just shows "All Clinics" with no indication data is still loading.

```jsx
{loadingClinics ? (
  <MenuItem disabled>Loading clinics...</MenuItem>
) : clinics.map(...)}
```
**Priority:** 🟢 Low

---

## Test Plan Gaps & Additional Scenarios

### SUG-DASH-PLAN-001 — Add TC: "Failed" Transaction Chip (Red)
> **TC-MGR-DASH-15B** — Failed Status Chip  
> With a `status: 'failed'` transaction in mock data, assert chip shows **"Failed"** label with **red background**.  
> Source path: `StitchStatusChip` with label="Failed" and statusType="failed".

### SUG-DASH-PLAN-002 — Add TC: Transactions Pagination (Page 2)
> **TC-MGR-DASH-14B** — Pagination: Navigate to Page 2  
> With ≥6 mock transactions (after SUG-DASH-004 fix): click "Next Page" in TablePagination.  
> Assert: rows 6–10 visible. Prev button now enabled. Page counter updates to "6–10 of 8" (etc.).

### SUG-DASH-PLAN-003 — Add TC: Date Toggle Cannot Deselect Active Button
> **TC-MGR-DASH-03B** — No Deselect Behavior  
> Click the currently-active toggle button (e.g., click "30D" when 30D is active).  
> Assert: button stays active (does not deselect). Source: `if (newFilter) setDateFilter(newFilter)` — guard prevents null.

### SUG-DASH-PLAN-004 — Add TC: Date Filter persists after Tab Navigation
> Navigate away from dashboard (e.g., to Appointments), then back.  
> Assert: `dateFilter` resets to default `'30d'` on remount (since state is local — not persisted). Document this as expected behavior.

### SUG-DASH-PLAN-005 — Add TC: KPI Card "..." During Loading
> Simulate delayed network response. Assert KPI cards show `...` text while `loading=true`.  
> Currently untestable without backend. Could be tested by mocking Apollo with artificial delay.

### SUG-DASH-PLAN-006 — Add TC: MOCK_TIME_SERIES Randomness
> Since `MOCK_TIME_SERIES` is generated at module-level with `Math.random()`, values are fixed per page load (module init, not per re-render).  
> Assert: chart values are stable within a session (do not re-randomize on filter change). This verifies the module-level constant.

### SUG-DASH-PLAN-007 — Add Edge Case: null `appointment` in Transaction (E6 Extended)
> Add a mock transaction with `appointment: null`.  
> Assert: Patient, Clinician, Service cells show `—` or blank (via optional chaining `trx.appointment?.patient.firstName`).  
> Currently `trx.appointment?.patient` — if `appointment` is null, `firstName` would break. Source line 398: `trx.appointment?.patient.firstName` — optional chain stops at appointment but `patient.firstName` could crash if patient is null. Add extra guard: `trx.appointment?.patient?.firstName`.

---

## Summary Table

| ID | Suggestion | Category | Priority | Effort |
|----|-----------|----------|----------|--------|
| SUG-DASH-001 | Add Start > End date validation | 🐛 Bug Fix | 🔴 High | 3 lines |
| SUG-DASH-002 | Wire to live backend | 🔌 Backend | 🟡 Medium | High |
| SUG-DASH-003 | Empty states for all charts | ✨ UX | 🟡 Medium | Low |
| SUG-DASH-004 | Expand mock to 8 transactions for pagination | 🧪 Test Infra | 🟡 Medium | 5 lines |
| SUG-DASH-005 | Add failed status mock transaction | 🧪 Test Infra | 🟡 Medium | 5 lines |
| SUG-DASH-006 | Bar chart legend | ✨ UX | 🟢 Low | 2 lines |
| SUG-DASH-007 | Rows-per-page selector in pagination | ✨ UX | 🟢 Low | Low |
| SUG-DASH-008 | Export CSV for transactions | 🚀 Feature | 🟢 Low | Medium |
| SUG-DASH-009 | Loading state in clinic dropdown | ✨ UX | 🟢 Low | 3 lines |

### Quick Wins (< 5 min):
- **SUG-DASH-001**: 3-line `useMemo` guard — prevents silent inverted-date queries
- **SUG-DASH-005**: Add one "failed" mock transaction — enables TC-15 red chip verification
