# Manager Billing & Revenue — Detailed Test Plan

**File:** `frontend/src/pages/manager/Billing.jsx`  
**Route:** `/manager/billing`  
**Last Updated:** 2026-03-30

---

## Feature Overview

Billing & Revenue page with 4 KPI summary cards, a stacked bar chart (Revenue Breakdown — Clinic Fees + Service Fees), and an invoices table. Supports:
- Date-period filter (This Month / Last Month / Last Quarter / Year to Date) with active Chip indicator
- Payment Method filter (All / Card / Cash / Insurance)
- **Status filter (Paid / Pending / Refunded)** ← new
- **Full-text search** (patient name, invoice ID, service, clinician) ← new
- **CSV export** of filtered invoice set ← new
- **Refund confirmation dialog** with optimistic status update ← new
- Invoice actions: View (stub), Download (stub), Refund (wired)

> **Mock Mode:** Page runs fully offline. `INVOICES_SEED` (5 records), `REVENUE_DATA` (7 months), `SUMMARY` (4 KPI cards) provide all data. Toggle: `VITE_USE_MOCK_API=true` in `.env` (or leave backend offline).

---

## Test Cases

### TC-MGR-BILL-01 — Page Renders Without Crash
**Steps:** Navigate to `/manager/billing`.  
**Expected:**
- "Billing & Revenue" h2 heading visible.
- Period chip next to "City Heart Clinic" shows "March 2026".
- All 4 KPI cards, Revenue Breakdown chart, and Invoices table rendered.
- No console errors.

---

### TC-MGR-BILL-02 — KPI Cards: Values and Colours
**Steps:** Observe 4 KPI summary cards.  
**Expected:**
- **Total Revenue (Mar):** `£11,880` — green top border (`#2DC653`)
- **Outstanding Invoices:** `£2,340` — amber top border (`#FFB703`)
- **Refunds This Month:** `£450` — red top border (`#E63946`)
- **Avg Rev / Appointment:** `£92.40` — teal top border (`#006D77`)
- Sub-labels: "+12% vs last month", "8 invoices pending", "3 refund requests", "245 appointments"

---

### TC-MGR-BILL-03 — Revenue Chart: Renders with Legend
**Steps:** View "Revenue Breakdown" bar chart.  
**Expected:**
- Stacked bars: "Clinic Fees" (dark teal `#006D77`) + "Service Fees" (lighter teal `#83C5BE`).
- X-axis: Sep, Oct, Nov, Dec, Jan, Feb, Mar.
- Y-axis: `£0k` to `£14k` format.
- Tooltip shows `£5,200` format on hover.
- **Legend visible**: "■ Clinic Fees   ■ Service Fees" above bars.

---

### TC-MGR-BILL-04 — Date Period Filter + Active Chip
**Steps:** Change period dropdown through all 4 options.  
**Expected:**
- "This Month" → Chip: **"March 2026"**
- "Last Month" → Chip: **"February 2026"**
- "Last Quarter" → Chip: **"Q4 2025"**
- "Year to Date" → Chip: **"Jan – Mar 2026"**
- Page stable throughout; no crash or re-render loop.

---

### TC-MGR-BILL-05 — Payment Method Filter: All Methods
**Steps:** Confirm default filter = "all".  
**Expected:** All 5 invoices visible (Card×3, Insurance×1, Cash×1). No counter chip showing.

---

### TC-MGR-BILL-06 — Payment Method Filter: Card
**Steps:** Select "Card".  
**Expected:** 3 rows: INV-001, INV-002, INV-003. Counter chip "3 of 5" in Invoices header.

---

### TC-MGR-BILL-07 — Payment Method Filter: Cash
**Steps:** Select "Cash".  
**Expected:** 1 row: INV-005 Sophie Müller. Counter chip "1 of 5".

---

### TC-MGR-BILL-08 — Payment Method Filter: Insurance
**Steps:** Select "Insurance".  
**Expected:** 1 row: INV-004 Omar Hassan. Counter chip "1 of 5".

---

### TC-MGR-BILL-09 — Invoice Table: Columns Present
**Steps:** View table headers.  
**Expected:** All 9 columns: Invoice | Patient | Clinician | Service | Date | Amount | Method | Status | Actions.

---

### TC-MGR-BILL-10 — Invoice Table: Status Chip Rendering
**Steps:** View status chips for all 5 invoices.  
**Expected:**
- `paid` → "Confirmed" chip (green)
- `refunded` → "Cancelled" chip (red)
- `pending` → "Scheduled" chip (amber)

---

### TC-MGR-BILL-11 — Invoice Table: Method Chip Styling
**Steps:** View Method chip for each row.  
**Expected:** `#F0F7F8` bg, `#004D55` text. Labels: "Card", "Card", "Card", "Insurance", "Cash".

---

### TC-MGR-BILL-12 — Invoice Actions: View Button
**Steps:** Click eye icon on any row.  
**Expected:** Icon renders with `aria-label` and Tooltip "View invoice". No crash. (No navigation yet — stub.)

---

### TC-MGR-BILL-13 — Invoice Actions: Download Button
**Steps:** Click download icon.  
**Expected:** Icon renders with `aria-label` and Tooltip "Download invoice". No crash. (No PDF yet — stub.)

---

### TC-MGR-BILL-14 — Invoice Actions: Refund Button Visibility
**Steps:** View Refund icon presence for each row.  
**Expected:**
- INV-001, INV-002, INV-005 (paid): red RefundIcon visible with `aria-label` and Tooltip "Issue refund".
- INV-003 (refunded): Refund icon absent.
- INV-004 (pending): Refund icon absent.

---

### TC-MGR-BILL-15 — Export Button: CSV Download
**Steps:** Click "Export" button in top-right header.  
**Expected:**
- CSV file download triggered.
- Filename: `billing-export-{activeFilter}.csv` (e.g., `billing-export-this-month.csv`).
- File contains header row + one row per `filtered` invoice.
- Export respects current search/filter state.

---

### TC-MGR-BILL-16 — Generate Invoice Button
**Steps:** Click "Generate Invoice" in invoice toolbar.  
**Expected:** Button renders with ReceiptIcon. No crash. (Wizard not yet implemented — stub.)

---

### TC-MGR-BILL-17 — Invoice Search: Patient Name
**Steps:** Type "Emma" in Search field.  
**Expected:** 1 row (Emma Wilson, INV-001) immediately visible. All other rows hidden.

---

### TC-MGR-BILL-18 — Responsive Layout
**Steps:** Resize to ~375px mobile width.  
**Expected:**
- KPI cards 2-per-row (xs=12, sm=6 Grid).
- Revenue chart scales within ResponsiveContainer.
- Invoice table scrolls horizontally inside TableContainer.
- Invoice toolbar wraps to next line (flexWrap="wrap").

---

### TC-MGR-BILL-19 — Invoice Amount Formatting
**Steps:** View Amount column.  
**Expected:** `£85`, `£120`, `£75`, `£120`, `£85` — bold, £ prefix, no decimal places.

---

### TC-MGR-BILL-20 — Status Filter: Paid
**Steps:** Select "Paid" from Status dropdown.  
**Expected:** 3 rows: INV-001, INV-002, INV-005.

---

### TC-MGR-BILL-21 — Status Filter: Pending
**Steps:** Select "Pending".  
**Expected:** 1 row: INV-004 Omar Hassan.

---

### TC-MGR-BILL-22 — Status Filter: Refunded
**Steps:** Select "Refunded".  
**Expected:** 1 row: INV-003 Lily Chen.

---

### TC-MGR-BILL-23 — Combined Search + Status Filter
**Steps:** Set Status = "Paid", type "James" in Search.  
**Expected:** 1 row: INV-002 James Brown. All three filter dimensions (method, status, search) apply simultaneously.

---

### TC-MGR-BILL-24 — Empty State + Clear Filters
**Steps:** Set Status = "Refunded", type "Omar Hassan" in Search (no match).  
**Expected:**
- Table hidden.
- ReceiptIcon + "No invoices match your filters." text shown.
- "Clear filters" button visible.
- Click "Clear filters" → all 3 filters reset, all 5 rows restored.

---

### TC-MGR-BILL-25 — Refund Button: Confirm Dialog
**Steps:** Click Refund icon on INV-001 (Emma Wilson, £85, paid).  
**Expected:**
- ConfirmDialog opens.
- Title: "Issue Refund".
- Message: "Issue a refund of £85 for Emma Wilson (INV-001)? This action cannot be undone."
- Buttons: [Cancel] [Refund (amber)].

---

### TC-MGR-BILL-26 — Refund: Cancel Keeps Status Unchanged
**Steps:** Open refund dialog → click Cancel.  
**Expected:**
- Dialog closes.
- INV-001 status chip remains "Confirmed" (green).
- Refund icon still visible on INV-001 row.
- No success banner shown.

---

### TC-MGR-BILL-27 — Refund: Confirm Optimistic Update
**Steps:** Open refund dialog for INV-001 → click "Refund".  
**Expected:**
- Dialog closes immediately.
- Green success banner: "Refund of £85 issued for Emma Wilson." (auto-dismisses after 4s).
- INV-001 status chip changes from **"Confirmed" (green)** → **"Cancelled" (red)**.
- Refund icon disappears from INV-001 row (status is no longer 'paid').
- After refund, Status=Refunded filter shows 2 rows (INV-001 + INV-003).

---

## Edge Cases

| # | Edge Case | Expected Behaviour |
|---|-----------|-------------------|
| E1 | No invoices match combined filters | Empty state: icon + "No invoices match…" + "Clear filters" button (see TC-24) |
| E2 | Rapid filter switching | State stable; no flicker, no race conditions (React useState handles synchronously) |
| E3 | Chart tooltip on Sep (first point) | Shows "Clinic Fees: £5,200" and "Service Fees: £3,100" with correct formatter |
| E4 | Revenue bar at smallest value (Dec: £4,900 +  £2,900) | Bars clearly visible; no zero-height render crash |
| E5 | INVOICES_SEED is the mock seed — always 5 records | Default table always shows 5 rows; no empty/error state |
| E6 | Long service name (e.g., "Cardiology Consultation") | Text wraps within TableCell; no layout overflow |
| E7 | Special characters ("Sophie Müller" — ü) | Renders correctly; CSV export also quotes the value |
| E8 | Search text cleared | All results immediately restored (controlled input, instant re-filter) |
| E9 | Post-refund filter by Status=Refunded | Optimistically-refunded invoice appears in Refunded filter result |
