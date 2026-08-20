---
id: TS011
type: test-suggestion
feature: dashboard
created: 2026-03-19
updated: 2026-04-02
status: in-progress
parent: unknown
related: [TP012, TR011]
---

# Dashboard — Feature Suggestions (Session 3 — 2026-03-30)

**Module:** `frontend/src/pages/dashboard/index.jsx` + `components/Dashboard/`  
**Updated:** 2026-03-30 Session 3

---

## Summary Table

| ID | Suggestion | Priority | Status |
|----|-----------|----------|--------|
| SUG-DASH-001 | Wire chartRange state to chart data | 🔴 | ✅ DONE (S1) |
| SUG-DASH-002 | Fix utilisation name/value mapping | 🔴 | ✅ DONE (S1) |
| SUG-DASH-003 | Align naming "Upcoming" | 🟡 | ✅ DONE (S1) |
| SUG-DASH-004 | KPI cards navigable on click | 🟡 | ✅ DONE (S1) |
| SUG-DASH-005 | Stacked BarChart by status | 🟡 | ✅ DONE (S1) |
| SUG-DASH-006 | Expand mock upcoming appointments to 5 rows | 🟢 | ✅ DONE (S2) |
| SUG-DASH-007 | "View all →" link below table | 🟢 | ✅ CONFIRMED (S2) |
| NEW-DASH-008 | "Refreshed HH:MM" chip in header | ✨ | ✅ DONE (S2) |
| NEW-DASH-009 | Confirmation rate insight strip | 📊 | ✅ DONE (S2) |
| **NEW-DASH-010** | KPI card a11y: role, aria-label, keyboard nav, focus ring | ♿ | ✅ DONE (S3) |
| **NEW-DASH-011** | AppointmentVolumeChart empty-state guard | 🛡️ | ✅ DONE (S3) |
| **NEW-DASH-012** | UtilisationChart mobile horizontal scroll | 📱 | ✅ DONE (S3) |

---

## Session 3 Implementation Notes

### NEW-DASH-010 — KPI Card Accessibility
```jsx
<Box
  role={kpi.href ? 'button' : undefined}
  tabIndex={kpi.href ? 0 : undefined}
  aria-label={kpi.href ? `Navigate to ${kpi.label}` : undefined}
  onKeyDown={(e) => kpi.href && (e.key === 'Enter' || e.key === ' ') && navigate(kpi.href)}
  sx={{
    outline: 'none',
    '&:focus-visible': kpi.href ? { boxShadow: '0 0 0 3px rgba(0,109,119,0.35)' } : {},
  }}
>
```

### NEW-DASH-011 — AppointmentVolumeChart Empty State
```jsx
const isEmpty = chartData.length === 0
// In render:
{isEmpty ? (
  <Box sx={{ height: 260, display:'flex', alignItems:'center', justifyContent:'center' }}>
    <Typography color="text.disabled">No data available for this period</Typography>
  </Box>
) : (
  <ResponsiveContainer ...>...</ResponsiveContainer>
)}
```

### NEW-DASH-012 — UtilisationChart Mobile Scroll
```jsx
<Box sx={{ overflowX: 'auto', overflowY: 'visible' }}>
  <Box sx={{ minWidth: isMobile ? chartData.length * 52 : '100%' }}>
    <ResponsiveContainer width="100%" height={isMobile ? 200 : 240}>
```

---

## Remaining

**None.** All frontend suggestions complete. Backend integration (real GraphQL API) is the only remaining item.
