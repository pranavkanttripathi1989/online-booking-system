# Manager Dashboard — Test Suggestions
**Source:** `frontend/src/pages/manager/Dashboard.jsx` | **Updated:** 2026-03-30

### SUG-DASH-001 — Custom Date Range Validation
**Status:** COMPLETED
`dateRangeError = customStart.isAfter(customEnd)` triggers red Alert via Collapse. Query skipped via `skip: !user || !!dateRangeError`. Fixes BUG-DASH-001.

### SUG-DASH-002 — Mock Clinic Options (offline)
**Status:** PENDING | Medium — `getClinics` returns [] offline; add MOCK_CLINICS fallback.

### SUG-DASH-003 — Expand Mock Transactions to 6+
**Status:** PENDING | Medium — Enable Next Page pagination TC (3 rows = 1 page only).

### SUG-DASH-004 — ErrorBoundary Wrapper
**Status:** PENDING | Medium — Consistent with Availability/Blocks modules.

### SUG-DASH-005 — Failed Transaction Mock
**Status:** PENDING | Low — Add mock `status: 'failed'` transaction to verify red chip.

### SUG-DASH-006 — KPI Trend Badge Tooltip
**Status:** PENDING | Low — `<Tooltip title="vs previous period">` on trend badges.

### SUG-DASH-007 — Chart Empty States
**Status:** PENDING | Low — "No data for selected period" when arrays are empty.

### SUG-DASH-008 — Date Range Label in Chart Title
**Status:** PENDING | Low — Append "(Last 7 days)" or range to chart overlines.

### SUG-DASH-009 — Export Transactions CSV
**Status:** PENDING | Low — Client-side Blob export, no backend needed.

### SUG-DASH-010 — Top Clinician Highlight
**Status:** PENDING | Low — Gold border or trophy icon on rank-1 row.

## Summary

| ID | Suggestion | Priority | Status |
|----|-----------|----------|--------|
| SUG-DASH-001 | Date range validation | Medium | COMPLETED |
| SUG-DASH-002 | Mock clinic options | Medium | PENDING |
| SUG-DASH-003 | 6+ mock transactions | Medium | PENDING |
| SUG-DASH-004 | ErrorBoundary | Medium | PENDING |
| SUG-DASH-005 | Failed chip mock | Low | PENDING |
| SUG-DASH-006 | Trend tooltip | Low | PENDING |
| SUG-DASH-007 | Chart empty states | Low | PENDING |
| SUG-DASH-008 | Date label in chart | Low | PENDING |
| SUG-DASH-009 | Export CSV | Low | PENDING |
| SUG-DASH-010 | Top clinician highlight | Low | PENDING |
