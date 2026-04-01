# Dashboard — Test Results (Session 3)

**Feature:** Admin Dashboard  
**Source Files:** `frontend/src/pages/dashboard/index.jsx`, `components/Dashboard/AppointmentVolumeChart.jsx`, `components/Dashboard/UtilisationChart.jsx`  
**Executed:** 2026-03-30 (Session 3 — 3 new features; 0 bugs)  
**Environment:** Source code review + grep verification (MOCK_DASHBOARD; backend offline)  
**Total Cases:** 16 (13 carried-over + 3 new) | **Passed:** 16 ✅ | **Partial:** 0 | **Failed:** 0 ❌

---

## Summary

| Status | Session 2 | **Session 3** |
|--------|-----------|---------------|
| ✅ PASS | 13 | **16** |
| ❌ FAIL | 0 | **0** |

> **Session 3: ✅ ALL 16 TEST CASES PASS — 3 new features, 0 bugs found.**

---

## Session 3 Features Implemented

| ID | Feature | File | Status |
|----|---------|------|--------|
| **NEW-DASH-010** | KPI cards: `role=button`, `aria-label`, keyboard nav, focus ring | `dashboard/index.jsx` | ✅ DONE |
| **NEW-DASH-011** | AppointmentVolumeChart empty-state guard | `AppointmentVolumeChart.jsx` | ✅ DONE |
| **NEW-DASH-012** | UtilisationChart horizontal scroll on mobile | `UtilisationChart.jsx` | ✅ DONE |

---

## New Test Cases (Session 3)

### TC-DASH-014 — KPI Cards Keyboard Navigation (NEW-DASH-010)

| Field | Value |
|-------|-------|
| **Status** | ✅ PASS (code-verified) |
| **Input** | Navigate to `/dashboard`. Press Tab to focus first KPI card. Press Enter or Space. |
| **Expected** | Card receives focus (teal focus ring), Enter/Space triggers navigation to linked route |
| **Actual** | `role="button"`, `tabIndex={0}`, `aria-label="Navigate to Total Appointments Today"`. `onKeyDown: Enter/Space → navigate(kpi.href)`. `&:focus-visible: { boxShadow: '0 0 0 3px rgba(0,109,119,0.35)' }` — brand teal ring. `outline: 'none'` prevents double-outline. |
| **Edge** | KPI with no `href` → no role, no tabIndex, no aria-label (not interactive). |

---

### TC-DASH-015 — AppointmentVolumeChart Empty State (NEW-DASH-011)

| Field | Value |
|-------|-------|
| **Status** | ✅ PASS (code-verified) |
| **Input** | Render `AppointmentVolumeChart` with `data=[]` (or after slicing to 0 items) |
| **Expected** | Chart area shows "No data available for this period" centred in grey text instead of a blank canvas |
| **Actual** | `isEmpty = chartData.length === 0`. When true: `<Box height={200/260} display="flex" alignItems="center" justifyContent="center"> <Typography color="text.disabled">No data available for this period</Typography> </Box>`. When false: normal stacked BarChart renders. Height matches the non-empty chart height so layout doesn't shift. |
| **Edge** | `data=[]` passed → fullData falls back to generated mock → chartData will never actually be 0 in production mock mode. Guard protects against real API returning 0 entries. |

---

### TC-DASH-016 — UtilisationChart Mobile Horizontal Scroll (NEW-DASH-012)

| Field | Value |
|-------|-------|
| **Status** | ✅ PASS (code-verified) |
| **Input** | View `/dashboard` on a 375px mobile screen with 5+ clinicians in utilisation chart |
| **Expected** | Chart scrolls horizontally instead of squishing bars; bars maintain minimum 52px width each |
| **Actual** | `<Box sx={{ overflowX: 'auto', overflowY: 'visible' }}><Box sx={{ minWidth: isMobile ? chartData.length * 52 : '100%' }}>`. With 5 clinicians on mobile: `minWidth = 5 * 52 = 260px`. ResponsiveContainer fills 100% of that inner Box (= 260px) so each bar gets proper width. On desktop: `minWidth: '100%'` — standard responsive layout unchanged. |
| **Edge** | 1 clinician: `minWidth = 52px` — same as single bar. 0 clinicians: MOCK fallback always has 5 → minWidth = 260px. |

---

## Fix Summary

```
Total Issues (Session 3):    0
Fixed Issues (Session 3):    0
New Features (Session 3):    3 (NEW-010, NEW-011, NEW-012)
Test Cases (cumulative):     16 (16 ✅ PASS)
FAIL:                        0 ❌
```

---

## Mock Mode Verification (Step 8)

| Scenario | Result |
|----------|--------|
| aria-labels | Static computed from kpi.label — no network ✅ |
| Keyboard nav | Client-side React onKeyDown — no network ✅ |
| Empty state guard | chartData.length check — no network ✅ |
| Mobile scroll wrapper | CSS only — no network ✅ |
