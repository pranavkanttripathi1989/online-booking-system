# Analytics & Finances — Feature Suggestions (Updated v2)

**Derived from:** [analytics-finances-test-results.md](../test-result/analytics-finances-test-results.md)  
**Test Plan Source:** [analytics-finances-test-plan.md](../test-plan/analytics-finances-test-plan.md)  
**Original Date:** 2026-03-16 | **v1 Updated:** 2026-03-18 | **v2 Updated:** 2026-03-26  
**Tested by:** Antigravity AI Browser Agent

> **STATUS UPDATE (2026-03-26):** All 8 suggestions (SUG-AF-001 – 008) fully implemented and verified. All 3 new recommendations (NEW-AF-001/002/003) resolved. No pending items remain.

---

## Implementation Status

| ID | Suggestion | Priority | Status | Implemented |
|----|-----------|----------|--------|-------------|
| SUG-AF-001 | Wire date range filter to chart data | 🔴 High | ✅ **DONE** | `dateRange` controlled state → `DATE_RANGE_MONTHS` map → `.slice(-monthCount)` on all arrays |
| SUG-AF-002 | Export CSV — download or toast | 🟡 Medium | ✅ **DONE** | Blob API CSV export with snackbar in both Analytics and Finances |
| SUG-AF-003 | Add status breakdown donut chart | 🟡 Medium | ✅ **DONE** | `STATUS_BREAKDOWN` array + `<PieChart>` with 5 `<Cell>` segments |
| SUG-AF-004 | Add Paid/Pending/Overdue invoice filter | 🟡 Medium | ✅ **DONE** | `ToggleButtonGroup` + `useMemo` combining type + status filters |
| SUG-AF-005 | Add monthly revenue chart to Finances | 🟡 Medium | ✅ **DONE** | "Revenue Chart" tab with `<BarChart>` + 3 KPI summary cards |
| SUG-AF-006 | Analytics comparison mode (vs prior period) | 🟢 Low | ✅ **DONE** | "Compare" toggle button → `CompareBadge` component on KPI cards showing % delta vs prior period values |
| SUG-AF-007 | Invoice detail page / slide-in drawer | 🟢 Low | ✅ **DONE** | `<InvoiceDrawer>` Drawer component: patient avatar, all fields, amount highlight, status chip, overdue warning, Print + Download PDF buttons |
| SUG-AF-008 | Shared date range context (Analytics ↔ Finances) | 🟢 Low | ✅ **DONE** | `localStorage.setItem/getItem('medibook_dateRange')` written on change, read on Finances page mount |
| NEW-AF-001 | Currency formatter inconsistency in table | 🟢 Low | ✅ **DONE** | `+$120` format (+ before $) is now the consistent standard; no duplication |
| NEW-AF-002 | Weekly mode not responsive to date range | 🔴 High | ✅ **DONE** | `ALL_WEEKLY_APPTS` (21 days) + `DATE_RANGE_WEEKS` map → `.slice(-weekCount)` applied in weekly mode |
| NEW-AF-003 | Finances Revenue Chart has no date range | 🟡 Medium | ✅ **DONE** | Date range `<TextField select>` added to Revenue Chart tab header; totals and chart update dynamically |

---

## Detailed Implementation Notes

### SUG-AF-006 — Analytics Comparison Mode
**File:** `analytics/index.jsx`  
**Before:** KPI cards showed only current period delta badge.  
**After:** Added `const [compareMode, setCompareMode] = useState(false)`. "Compare" button in header (outlined → contained when active). Each KPI stores `rawValue` and `priorValue`. When `compareMode` is true, `<CompareBadge>` renders below the KPI value showing:
```
vs prior period: +12.4%
Prior: 1038
```
Color-coded green (up) / red (down). Accessible `aria-pressed` on the button.

### SUG-AF-007 — Invoice Detail Drawer
**File:** `finances/index.jsx`  
**Before:** Receipt icon button was non-functional (just a Tooltip).  
**After:** `openDrawer(tx)` sets `drawerTx` state → `<InvoiceDrawer>` renders a MUI `<Drawer anchor="right">` (420px wide) containing:
- Patient avatar + name
- Detail grid: Transaction ID, Service, Date, Payment Method, Type
- Amount highlighted in income green / expense red
- Status chip with left accent
- Overdue warning Paper (FCE8E6 background) if `tx.status === 'overdue'`
- "Download Receipt (PDF)" primary button
- Print icon (`window.print()`)
- Close button + "Close" secondary button

### SUG-AF-008 — Shared Date Range via localStorage
**File:** `analytics/index.jsx`, `finances/index.jsx`  
**Before:** Analytics and Finances date ranges were independent state variables.  
**After:**
- `analytics/index.jsx` — `handleDateRangeChange(newRange)` writes `localStorage.setItem('medibook_dateRange', newRange)` on every change
- `finances/index.jsx` — `revenueRange` initializes with `useState(() => { try { return localStorage.getItem('medibook_dateRange') || 'last7months' } catch { return 'last7months' } })`
- Finance page's own date range change also writes back to localStorage
- Try/catch guards prevent crashes in environments where localStorage is unavailable

### NEW-AF-002 — Weekly Mode Fixed
**File:** `analytics/index.jsx`  
**Before:** `WEEKLY_APPTS` was a static 7-day array; date range dropdown had no effect in weekly mode.  
**After:**
```js
const ALL_WEEKLY_APPTS = [ /* 21 days: Wk1 Mon–Sun, Wk2 Mon–Sun, Wk3 Mon–Sun */ ]
const DATE_RANGE_WEEKS = {
  last1month: 7, last3months: 14, last7months: 21, this_year: 21
}
const apptData = timeframe === 'weekly'
  ? ALL_WEEKLY_APPTS.slice(-weekCount)   // <-- now responsive
  : ALL_MONTHLY_APPTS.slice(-monthCount)
```
Subtitle dynamically reflects `weekCount` in weekly mode.

### NEW-AF-003 — Revenue Chart Date Range
**File:** `finances/index.jsx`  
**Before:** `MONTHLY_REVENUE` was a fixed 7-month constant; totals never changed.  
**After:** `ALL_MONTHLY_REVENUE` (7 months) is sliced by `revenueMonthCount`. `totalRevenue`, `totalExpenses`, `netProfit` are computed from the slice. Date range `<TextField select>` added to Revenue Chart tab header (aligned top-right). Changing values updates KPI cards and BarChart bars in real time.

---

## Accessibility Improvements Added (v2)

| Element | Attribute Added |
|---------|----------------|
| Clinician progress bars | `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label` |
| Date range dropdown | `aria-label="Select date range"` |
| Compare toggle button | `aria-pressed={compareMode}` |
| Export CSV button | `aria-label="Export analytics as CSV"` |
| Weekly/Monthly toggle | `aria-label="Chart timeframe"` on group, `aria-label` on each button |
| Receipt icon buttons | `aria-label="View receipt for TXN-xxx"` |
| Delete card buttons | `aria-label="Delete card ending in XXXX"` |
| Invoice drawer close | `aria-label="Close drawer"` |
| Invoice print button | `aria-label="Print receipt"` |

---

## Future Recommendations

| Priority | Item | Effort |
|----------|------|--------|
| 🟢 Low | Add skeleton loading states while charts mount | Low |
| 🟢 Low | Persist compare mode preference in localStorage | Very Low |
| 🟢 Low | Add overdue invoice count badge on Finances tab in sidebar | Low |
| 🟢 Low | Drill-down from Revenue chart bar to filtered transaction list | Medium |
