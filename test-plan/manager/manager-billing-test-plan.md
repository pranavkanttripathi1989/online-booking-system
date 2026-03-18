# Manager Billing & Revenue — Detailed Test Plan

**File:** `frontend/src/pages/manager/Billing.jsx`
**Route:** `/manager/billing`

---

## Feature Overview

Static/mock billing page with 4 KPI summary cards, a stacked bar chart showing monthly revenue breakdown (Clinic Fees + Service Fees), and an invoices table. Supports date-period filtering and payment-method filtering. Invoice actions include view, download, and refund.

> **Note:** This page uses hardcoded `INVOICES` and `REVENUE_DATA` constants — it is not yet wired to the live backend.

---

## Test Cases

### TC-MGR-BILL-01 — Page Renders Without Crash
**Steps:** Navigate to `/manager/billing`.
**Expected:**
- Page title "Billing & Revenue" visible.
- Subtitle shows "City Heart Clinic · March 2026".
- All sections (KPI row, chart, invoices table) rendered.

---

### TC-MGR-BILL-02 — KPI Cards: Values and Colours
**Steps:** View the 4 KPI cards.
**Expected:**
- **Total Revenue (Mar):** `£11,880` with green top border.
- **Outstanding Invoices:** `£2,340` with amber top border.
- **Refunds This Month:** `£450` with red top border.
- **Avg Rev / Appointment:** `£92.40` with brand/teal top border.
- Sub-labels match constants (e.g., "+12% vs last month").

---

### TC-MGR-BILL-03 — Revenue Chart Renders
**Steps:** View the "Revenue Breakdown" bar chart.
**Expected:**
- Stacked bars with two data series: "Clinic Fees" (teal) and "Service Fees" (lighter teal).
- X-axis shows Sep, Oct, Nov, Dec, Jan, Feb, Mar.
- Y-axis formatted as `£Xk`.
- Tooltip on hover shows formatted values (e.g., `£5,200`).

---

### TC-MGR-BILL-04 — Date Period Filter (UI Only)
**Steps:** Change the date period dropdown from "This Month" to "Last Month", "Last Quarter", "Year to Date".
**Expected:**
- Dropdown UI responds without crashing.
- `dateFilter` state updates correctly.
- **Note:** Data does not change (static mock); this verifies UI stability.

---

### TC-MGR-BILL-05 — Payment Method Filter: "All Methods"
**Steps:** Verify default filter is "all".
**Expected:**
- All 5 invoices (Card × 3, Insurance × 1, Cash × 1) are shown.
- Row count = 5.

---

### TC-MGR-BILL-06 — Payment Method Filter: "Card"
**Steps:** Select "Card" from the Payment Method dropdown.
**Expected:**
- Only card-payment invoices shown (INV-001, INV-002, INV-003).
- Row count = 3.

---

### TC-MGR-BILL-07 — Payment Method Filter: "Cash"
**Steps:** Select "Cash".
**Expected:**
- Only INV-005 shown.
- Row count = 1.

---

### TC-MGR-BILL-08 — Payment Method Filter: "Insurance"
**Steps:** Select "Insurance".
**Expected:**
- Only INV-004 shown.
- Row count = 1.

---

### TC-MGR-BILL-09 — Invoice Table: Columns Present
**Steps:** View the invoice table.
**Expected:**
- Columns: Invoice | Patient | Clinician | Service | Date | Amount | Method | Status | Actions.

---

### TC-MGR-BILL-10 — Invoice Table: Status Chip Rendering
**Steps:** View status chips for each invoice.
**Expected:**
- `paid` → mapped to `confirmed` status chip (green).
- `pending` → mapped to `scheduled` status chip (amber).
- `refunded` → mapped to `cancelled` status chip (red).

---

### TC-MGR-BILL-11 — Invoice Table: Method Chip Styling
**Steps:** View the Method chip for each row.
**Expected:**
- Chip rendered with `#F0F7F8` background and `#004D55` text.
- Label shows "Card", "Cash", or "Insurance".

---

### TC-MGR-BILL-12 — Invoice Actions: View Button
**Steps:** Click the View (eye) icon on any row.
**Expected:**
- Icon button renders without error.
- **Note:** No navigation implemented yet (no `onClick` handler beyond icon render).

---

### TC-MGR-BILL-13 — Invoice Actions: Download Button
**Steps:** Click the Download icon.
**Expected:**
- Icon button renders.
- **Note:** No download logic implemented; button should not crash.

---

### TC-MGR-BILL-14 — Invoice Actions: Refund Button (Paid Only)
**Steps:**
1. Verify that paid invoices (INV-001, INV-002, INV-005) show a refund icon.
2. Verify that pending (INV-004) and refunded (INV-003) invoices do NOT show the refund icon.
**Expected:**
- Refund icon visible only when `inv.status === 'paid'`.

---

### TC-MGR-BILL-15 — Export Button
**Steps:** Click the "Export" button.
**Expected:**
- Button renders with download icon.
- **Note:** No export logic implemented; button should not crash.

---

### TC-MGR-BILL-16 — Generate Invoice Button
**Steps:** Click "Generate Invoice" button in the invoice table toolbar.
**Expected:**
- Button renders with receipt icon.
- **Note:** No generate logic implemented; button should not crash.

---

### TC-MGR-BILL-17 — Invoice Search Field (UI Only)
**Steps:** Type text into the "Search invoices" text field.
**Expected:**
- Input accepts text.
- **Note:** No filter logic wired; table does not change (enhancement needed).

---

### TC-MGR-BILL-18 — Responsive Layout
**Steps:** Resize to mobile (375px).
**Expected:**
- KPI cards wrap to 2-per-row (sm=6 grid).
- Revenue chart remains responsive.
- Invoice table scrolls horizontally.
- Header row stacks vertically.

---

### TC-MGR-BILL-19 — Invoice Amount Formatting
**Steps:** View amount column.
**Expected:**
- Amounts show as `£85`, `£120`, `£75`, `£120`, `£85` (integer, no decimal in mock).
- Values match `INVOICES` constant.

---

## Edge Cases

| # | Edge Case | Expected Behaviour |
|---|-----------|-------------------|
| E1 | All invoices filtered out (no matches) | Empty table body rendered; no crash |
| E2 | Method filter switched rapidly | State stable; no duplicate renders |
| E3 | Chart tooltip on Sep (first data point) | Shows correct Clinic + Service breakdown |
| E4 | Revenue value = 0 for a month | Bar renders at zero height; no crash |
| E5 | `INVOICES` array is empty (hypothetical) | Table body is empty; no error |
| E6 | Long service name in table (50+ chars) | Truncates or wraps; no layout break |
| E7 | Long patient name | Wraps within cell; no overflow |
