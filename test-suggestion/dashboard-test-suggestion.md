# Dashboard — Feature Suggestions

**Derived from:** [dashboard-test-results.md](../test-result/dashboard-test-results.md)  
**Test Plan Source:** [dashboard-test-plan.md](../test-plan/dashboard-test-plan.md)  
**Date:** 2026-03-16  
**Tested by:** Antigravity AI Browser Agent

> Dashboard is one of the best-performing modules — 8/10 pass. Only 2 real bugs: broken time toggles and a data mapping issue in the utilization chart.

---

## 🔴 Bug Fixes

### SUG-DASH-001 — Fix: Time Range Toggles (7D / 14D / 30D) Non-Functional
**Triggered by:** TC-DASH-004 (BUG-DASH-001)  
**File:** `src/pages/dashboard/index.jsx`  
**Root Cause:** `chartRange` state updates when a toggle is clicked, but the data passed to the Recharts chart is not sliced by `chartRange` — it always sends all 30 days of data.  
**Fix:**
```js
const [chartRange, setChartRange] = useState(30);

// Slice the data before passing to the chart:
const chartData = useMemo(() => {
  return volumeData.slice(-chartRange); // last N days
}, [volumeData, chartRange]);

// Update chart title reactively:
const chartTitle = `Appointment Volume — Last ${chartRange} Days`;

// Pass sliced data + title to chart component:
<AppointmentVolumeChart data={chartData} title={chartTitle} />
```
**Priority:** 🔴 High — a non-functional UI control erodes user trust  
**Effort:** Very Low (10 min)

---

### SUG-DASH-002 — Fix: Clinician Utilization Chart Shows "Unknown" / 0%
**Triggered by:** TC-DASH-006 (BUG-DASH-002)  
**File:** `src/pages/dashboard/index.jsx` or `src/components/Dashboard/ClinicianUtilizationChart.jsx`  
**Root Cause:** The chart accesses `clinician.name` but the mock data provides `clinician.full_name` (or `first_name` + `last_name`) instead.  
**Fix — audit the data shape:**
```js
// In the utilization data mapping:
const utilizationData = MOCK_CLINICIANS.map(c => ({
  name: c.full_name ?? `${c.first_name} ${c.last_name}` ?? 'Unknown',
  utilization: c.utilization_percentage ?? c.bookingPercentage ?? 0,
}));

// Pass to chart:
<ClinicianUtilizationChart data={utilizationData} />
```
**Priority:** 🟡 Medium — chart renders but shows no meaningful data  
**Effort:** Very Low (15 min — fix property name in data mapping)

---

## 🚀 UX Suggestions

### SUG-DASH-003 — Rename Table to "Upcoming Appointments" (Align With UI)
**Triggered by:** TC-DASH-007 (BUG-DASH-003)  
**Observation:** The test plan calls it "Recent Appointments" but the UI shows "Upcoming Appointments". The UI naming makes more clinical sense (showing what's coming, not what happened). Update the test plan to match the UI label.  
**Fix:** Update test plan wording. No code change needed.  
**Priority:** 🟢 Low

---

### SUG-DASH-004 — Add Click-to-Drill-Down on KPI Cards
**Triggered by:** TC-DASH-001 (KPI card observation)  
**Observation:** KPI cards show numbers but aren't interactive. Clicking "Total Patients: 1,483" should navigate to `/patients`. Clicking revenue should go to `/finances`.  
**Suggestion:**
```jsx
<KpiCard
  title="Total Patients"
  value={1483}
  onClick={() => navigate('/patients')}
  sx={{ cursor: 'pointer', '&:hover': { boxShadow: 6 } }}
/>
```
**Priority:** 🟢 Low — quick UX win  
**Effort:** Very Low (15 min)

---

### SUG-DASH-005 — Appointment Volume Chart: Stacked by Status
**Triggered by:** TC-DASH-003 (chart observation)  
**Observation:** The appointment volume chart shows total counts. Showing confirmed vs cancelled would help spot cancellation spikes.  
**Suggestion:** Switch from `LineChart` to stacked `BarChart` with two series: `confirmed` (teal) and `cancelled` (red). Data already has both fields in the mock `volume_by_day` array.  
**Priority:** 🟢 Low  
**Effort:** Low

---

## Summary Table

| ID | Suggestion | Category | Priority | Effort |
|----|-----------|----------|----------|--------|
| SUG-DASH-001 | Wire chartRange state to chart data slice | 🐛 Bug Fix | 🔴 High | Very Low |
| SUG-DASH-002 | Fix clinician utilization name/value mapping | 🐛 Bug Fix | 🟡 Medium | Very Low |
| SUG-DASH-003 | Align naming — "Upcoming" in UI vs "Recent" in plan | 🐛 Minor | 🟢 Low | None |
| SUG-DASH-004 | KPI cards navigate to relevant list pages | ✨ UX | 🟢 Low | Very Low |
| SUG-DASH-005 | Stacked bar chart by appointment status | ✨ UX | 🟢 Low | Low |
