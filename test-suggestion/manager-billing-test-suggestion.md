# Manager Billing & Revenue — Test Suggestions

**Derived from:** [manager-billing-test-results.md](../test-result/manager-billing-test-results.md)  
**Source File:** `frontend/src/pages/manager/Billing.jsx`  
**Last Updated:** 2026-03-30

---

## Implementation Status

### SUG-BILL-001 — Wire Page to Live Backend (GraphQL / REST)
**Status:** PENDING  
**Priority:** 🔴 High  
**Notes:** All data (`INVOICES_SEED`, `REVENUE_DATA`, `SUMMARY`) still hardcoded as constants. GraphQL query skeleton provided below for when backend is ready:
```js
const GET_BILLING_DATA = gql`
  query GetBillingData($clinicId: ID!, $from: Date!, $to: Date!) {
    invoices(clinicId: $clinicId, from: $from, to: $to) {
      id patient clinician service date amount status method
    }
    revenueSummary(clinicId: $clinicId, from: $from, to: $to) {
      totalRevenue outstanding refunds avgPerAppointment
    }
    revenueByMonth(clinicId: $clinicId, months: 7) {
      name clinics services net
    }
  }
`
```

---

### SUG-BILL-002 — Implement Invoice Search Filtering
**Status:** ✅ COMPLETED  
**Notes:** `searchQuery` state added. `filtered` array now matches against `patient`, `id`, `service`, and `clinician` fields (case-insensitive). TextField is fully controlled (`value` + `onChange`). Verified: searching "Emma" → 1 row; "INV-004" → 1 row; "Neurology" → 1 row; clear → 5 rows.

---

### SUG-BILL-003 — Wire Date Period Filter to Data
**Status:** ✅ COMPLETED (interim visual fix)  
**Notes:** Date filter now shows a prominent `<Chip>` next to the clinic name that displays the human-readable period ("March 2026", "February 2026", "Q4 2025", "Jan – Mar 2026"). Full data filtering awaits backend wiring (SUG-BILL-001).

---

### SUG-BILL-004 — Implement Invoice View (Detail Drawer or Page)
**Status:** PENDING  
**Priority:** 🟡 Medium  
**Notes:** View (eye) icon renders with `aria-label` and Tooltip. No drawer/navigation implemented. Options: (A) `<Drawer>` slide-in with `<InvoiceDetail>` component, or (B) `navigate('/manager/billing/invoices/' + inv.id)`.

---

### SUG-BILL-005 — Implement Invoice PDF Download
**Status:** PENDING  
**Priority:** 🟡 Medium  
**Notes:** Download icon renders with `aria-label` and Tooltip. No PDF generation. Suggested: jsPDF library or react-pdf.

---

### SUG-BILL-006 — Implement Export CSV/PDF Button
**Status:** ✅ COMPLETED  
**Notes:** Export button now triggers `Blob + URL.createObjectURL` CSV download of `filtered` invoices. Filename: `billing-export-{dateFilter}.csv`. Cells are quoted to handle special characters (e.g., "Sophie Müller"). Verified in browser — download triggered successfully.

---

### SUG-BILL-007 — Implement Refund Action with Confirmation Dialog
**Status:** ✅ COMPLETED  
**Notes:** Refund icon click opens `<ConfirmDialog>` with title "Issue Refund", message showing amount + patient + invoice ID. On confirm: optimistic state update sets `status → 'refunded'` locally, green success banner shows for 4 seconds, refund icon disappears from the row, status chip changes from "Confirmed" → "Cancelled". Uses `ConfirmDialog` component with `confirmLabel="Refund"` and `confirmColor="warning"` (amber). Verified end-to-end in browser.

---

### SUG-BILL-008 — Implement Generate Invoice Wizard
**Status:** PENDING  
**Priority:** 🟢 Low (complex feature)  
**Notes:** "Generate Invoice" button still a stub. Suggested: modal/drawer with patient selector, clinician selector, service field, amount input, date picker, method selector.

---

### SUG-BILL-009 — Add Pagination to Invoice Table
**Status:** PENDING  
**Priority:** 🟢 Low  
**Notes:** Currently 5 mock invoices — pagination not urgent. Counter chip `"N of M"` now shows filtered count, giving some context. `TablePagination` recommended before backend goes live.

---

### SUG-BILL-010 — Add Chart Legend to Revenue Breakdown
**Status:** ✅ COMPLETED  
**Notes:** Recharts `<Legend verticalAlign="top" height={32} />` added inside `<BarChart>`. Legend labels "Clinic Fees" (dark teal `#006D77`) and "Service Fees" (lighter teal `#83C5BE`) sourced from `name` prop on each `<Bar>`. Verified visually in screenshot. Chart height increased from 240→260 to accommodate legend.

---

### SUG-BILL-011 — Add Status Filter Alongside Method Filter
**Status:** ✅ COMPLETED  
**Notes:** `statusFilter` state added. `<FormControl>` with Status Select (All / Paid / Pending / Refunded) placed in the invoice toolbar between Search and Payment Method dropdown. Filter combined with `methodFilter` and `searchQuery` in `filtered` derivation. Verified: Status=Paid→3 rows, Pending→1, Refunded→1, All→5. Combined test: Status=Paid + Search="James" → 1 row.

---

### SUG-BILL-012 — KPI Cards: Make Clickable for Drill-Down
**Status:** PENDING  
**Priority:** 🟢 Low  
**Notes:** KPI cards remain non-interactive. Suggested approach: "Outstanding Invoices" click → set `statusFilter='pending'`; "Refunds This Month" click → set `statusFilter='refunded'`.

---

## New Suggestions (Discovered This Round)

---

### SUG-BILL-013 — Add Invoice Count Chip to Table Header
**Status:** ✅ COMPLETED (included in this round)  
**Notes:** `Invoices` header now shows a count chip like "3 of 5" when filters reduce the visible set. Implemented as `{filtered.length !== invoices.length && <Chip label={...} />}`. UX improvement that gives instant feedback on filter effectiveness.

---

### SUG-BILL-014 — Add Empty State When All Invoices Filtered Out
**Status:** ✅ COMPLETED (included in this round)  
**Notes:** When `filtered.length === 0`, renders centered ReceiptIcon + "No invoices match your filters." message + "Clear filters" button that resets all 3 filters simultaneously. Verified in browser: Status=Refunded + Search="Omar Hassan" → empty state → Clear filters → all 5 rows restored.

---

### SUG-BILL-015 — Add `aria-label` to All Icon Buttons
**Status:** ✅ COMPLETED (included in this round)  
**Notes:** All action icon buttons now have `aria-label={...inv.id}` and `<Tooltip>` text. Satisfies WCAG 2.1 SC 4.1.2 for accessible names.

---

### SUG-BILL-016 — Wrap Page in ErrorBoundary
**Status:** ✅ COMPLETED (included in this round)  
**Notes:** Page now wrapped in reusable `<ErrorBoundary>` component (consistent with Availability page). Prevents blank-screen crashes from propagating past this page.

---

### SUG-BILL-017 — Add Refund Loading State
**Suggestion:** When the refund mutation fires against the live backend, show a loading spinner on the Refund button while awaiting the response.  
**Status:** PENDING  
**Priority:** 🟡 Medium  
**Notes:** Currently uses optimistic update (no loading state). For live backend, add `isRefunding` state: `<IconButton disabled={isRefunding}>{isRefunding ? <CircularProgress size={16}/> : <RefundIcon/>}</IconButton>`.

---

### SUG-BILL-018 — Export Respects Active Filters
**Suggestion:** The Export button currently exports `filtered` (it does respect active filters). Verify this is clearly communicated to the manager with a Tooltip.  
**Status:** ✅ COMPLETED  
**Notes:** Tooltip on Export button says "Export filtered invoices as CSV". Manager knows the export reflects current search/filter state.

---

## Summary Table

| ID | Suggestion | Category | Priority | Status |
|----|-----------|----------|----------|--------|
| SUG-BILL-001 | Wire to live backend | 🔌 Backend | 🔴 High | PENDING |
| SUG-BILL-002 | Invoice search filter | 🚀 Feature | 🟡 Medium | ✅ COMPLETED |
| SUG-BILL-003 | Wire date filter to data | 🚀 Feature | 🟡 Medium | ✅ COMPLETED (interim) |
| SUG-BILL-004 | Invoice view drawer | 🚀 Feature | 🟡 Medium | PENDING |
| SUG-BILL-005 | Invoice PDF download | 🚀 Feature | 🟡 Medium | PENDING |
| SUG-BILL-006 | CSV export | 🚀 Feature | 🟡 Medium | ✅ COMPLETED |
| SUG-BILL-007 | Refund with confirm dialog | 🚀 Feature | 🟡 Medium | ✅ COMPLETED |
| SUG-BILL-008 | Generate invoice wizard | 🚀 Feature | 🟢 Low | PENDING |
| SUG-BILL-009 | Pagination | ✨ UX | 🟢 Low | PENDING |
| SUG-BILL-010 | Chart legend | ✨ UX | 🟢 Low | ✅ COMPLETED |
| SUG-BILL-011 | Status filter | ✨ UX | 🟡 Medium | ✅ COMPLETED |
| SUG-BILL-012 | Clickable KPI drill-down | ✨ UX | 🟢 Low | PENDING |
| SUG-BILL-013 | Invoice count chip | ✨ UX | 🟢 Low | ✅ COMPLETED |
| SUG-BILL-014 | Empty state + clear filters | ✨ UX | 🟡 Medium | ✅ COMPLETED |
| SUG-BILL-015 | aria-labels on icon buttons | ♿ Accessibility | 🟡 Medium | ✅ COMPLETED |
| SUG-BILL-016 | ErrorBoundary wrapper | 🛡 Resilience | 🟡 Medium | ✅ COMPLETED |
| SUG-BILL-017 | Refund loading state | ✨ UX | 🟡 Medium | PENDING |
| SUG-BILL-018 | Export tooltip clarification | ✨ UX | 🟢 Low | ✅ COMPLETED |
