# Manager Billing & Revenue — Test Suggestions

**Derived from:** [manager-billing-test-results.md](../test-result/manager-billing-test-results.md)  
**Source File:** `frontend/src/pages/manager/Billing.jsx`  
**Date:** 2026-03-17

> Billing page passes all 19 test cases. All gaps are feature completeness items (stubs needing implementation), not bugs.

---

## 🔴 High Priority — Backend Wiring

### SUG-BILL-001 — Wire Page to Live Backend (GraphQL / REST)
**Current state:** All data (`INVOICES`, `REVENUE_DATA`, `SUMMARY`) is hardcoded in the component.  
**Suggested approach:**
```js
import { useQuery, gql } from '@apollo/client'

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
**Priority:** 🔴 High — page is completely disconnected from real data

---

## 🟡 Medium Priority — Feature Implementation (Stubs)

### SUG-BILL-002 — Implement Invoice Search Filtering
**Triggered by:** TC-MGR-BILL-17  
**Current state:** `<TextField label="Search invoices">` is an uncontrolled input — no filter logic.  
**Fix:**
```js
const [searchQuery, setSearchQuery] = useState('')

const filtered = INVOICES.filter((inv) => {
  const matchMethod = methodFilter === 'all' || inv.method === methodFilter
  const matchSearch = !searchQuery ||
    inv.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.service.toLowerCase().includes(searchQuery.toLowerCase())
  return matchMethod && matchSearch
})

// In JSX:
<TextField
  value={searchQuery}
  onChange={(e) => setSearchQuery(e.target.value)}
  label="Search invoices"
/>
```
**Priority:** 🟡 Medium — core table UX

---

### SUG-BILL-003 — Wire Date Period Filter to Data
**Triggered by:** TC-MGR-BILL-04  
**Current state:** `dateFilter` state updates on selection but no component reads it.  
**Fix:** Once backend is live, pass `dateFilter` value as a query variable. For now, at minimum show a badge/chip indicating the active filter:
```js
// Visual indicator only (interim fix):
<Chip label={dateFilter === 'this-month' ? 'March 2026' : dateFilter} size="small" color="primary" sx={{ ml: 1 }} />
```
**Priority:** 🟡 Medium

---

### SUG-BILL-004 — Implement Invoice View (Detail Drawer or Page)
**Triggered by:** TC-MGR-BILL-12  
**Fix option A — Slide-in drawer:**
```jsx
const [viewInvoice, setViewInvoice] = useState(null)

<IconButton onClick={() => setViewInvoice(inv)}><VisibilityIcon /></IconButton>

<Drawer anchor="right" open={!!viewInvoice} onClose={() => setViewInvoice(null)}>
  {viewInvoice && <InvoiceDetail invoice={viewInvoice} />}
</Drawer>
```
**Fix option B — Navigate to route:** `navigate('/manager/billing/invoices/' + inv.id)`  
**Priority:** 🟡 Medium

---

### SUG-BILL-005 — Implement Invoice PDF Download
**Triggered by:** TC-MGR-BILL-13  
**Fix:**
```js
const handleDownload = (inv) => {
  // Use jsPDF or react-pdf to generate a PDF:
  const doc = new jsPDF()
  doc.text(`Invoice: ${inv.id}`, 10, 10)
  doc.text(`Patient: ${inv.patient}`, 10, 20)
  doc.text(`Amount: £${inv.amount}`, 10, 30)
  doc.save(`${inv.id}.pdf`)
}

<IconButton onClick={() => handleDownload(inv)}><DownloadIcon /></IconButton>
```
**Priority:** 🟡 Medium

---

### SUG-BILL-006 — Implement Export CSV/PDF Button
**Triggered by:** TC-MGR-BILL-15  
**Fix — Export CSV of filtered invoices:**
```js
const handleExport = () => {
  const csv = [
    ['Invoice', 'Patient', 'Clinician', 'Service', 'Date', 'Amount', 'Method', 'Status'],
    ...filtered.map(inv => [inv.id, inv.patient, inv.clinician, inv.service, inv.date, `£${inv.amount}`, inv.method, inv.status])
  ].map(r => r.join(',')).join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `billing-export-${dateFilter}.csv`; a.click()
  URL.revokeObjectURL(url)
}
```
**Priority:** 🟡 Medium

---

### SUG-BILL-007 — Implement Refund Action with Confirmation Dialog
**Triggered by:** TC-MGR-BILL-14  
**Fix:**
```jsx
const handleRefund = (inv) => {
  if (confirm(`Refund £${inv.amount} for ${inv.patient}?`)) {
    // Call refundInvoice mutation
    refundInvoice({ variables: { id: inv.id } })
  }
}

{inv.status === 'paid' && (
  <Tooltip title="Issue Refund">
    <IconButton size="small" color="error" onClick={() => handleRefund(inv)}>
      <RefundIcon fontSize="small" />
    </IconButton>
  </Tooltip>
)}
```
Use `ConfirmDialog` component (already used in Availability.jsx) for a better UX than `window.confirm`.  
**Priority:** 🟡 Medium

---

### SUG-BILL-008 — Implement Generate Invoice Wizard
**Triggered by:** TC-MGR-BILL-16  
**Fix:** Clicking "Generate Invoice" should open a modal/drawer with:
- Patient selector (from existing patients)
- Clinician selector
- Service selector
- Amount input
- Due date picker
- Method selector (Card / Cash / Insurance)

**Priority:** 🟢 Low (complex feature)

---

## 🟢 Low Priority — UX Enhancements

### SUG-BILL-009 — Add Pagination to Invoice Table
**Observation:** Currently 5 mock invoices. In production, a clinic could have hundreds.  
**Fix:**
```jsx
import { TablePagination } from '@mui/material'

const [page, setPage]       = useState(0)
const [rowsPerPage, setRows] = useState(10)

const paginated = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

// In table footer:
<TablePagination
  count={filtered.length}
  page={page}
  rowsPerPage={rowsPerPage}
  onPageChange={(_, p) => setPage(p)}
  onRowsPerPageChange={(e) => { setRows(+e.target.value); setPage(0) }}
/>
```
**Priority:** 🟢 Low (needed before production)

---

### SUG-BILL-010 — Add Chart Legend to Revenue Breakdown
**Observation:** TC-MGR-BILL-03 confirmed the chart uses two distinct teal colors but has NO legend explaining which color is "Clinic Fees" vs "Service Fees".  
**Fix:** Add Recharts `<Legend />` below the chart, or add manual colored swatches:
```jsx
import { Legend } from 'recharts'
// Inside BarChart:
<Legend />
```
**Priority:** 🟢 Low — UX clarity

---

### SUG-BILL-011 — Add Status Filter Alongside Method Filter
**Observation:** Only Payment Method filter exists. Managers also need to filter by invoice status (Paid / Pending / Refunded) to track outstanding and refund requests.  
**Fix:**
```jsx
const [statusFilter, setStatusFilter] = useState('all')

const filtered = INVOICES.filter(inv =>
  (methodFilter === 'all' || inv.method === methodFilter) &&
  (statusFilter === 'all' || inv.status === statusFilter)
)

<FormControl size="small" sx={{ minWidth: 140 }}>
  <InputLabel>Status</InputLabel>
  <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} label="Status">
    <MenuItem value="all">All Statuses</MenuItem>
    <MenuItem value="paid">Paid</MenuItem>
    <MenuItem value="pending">Pending</MenuItem>
    <MenuItem value="refunded">Refunded</MenuItem>
  </Select>
</FormControl>
```
**Priority:** 🟡 Medium — high clinical value

---

### SUG-BILL-012 — KPI Cards: Make Clickable for Drill-Down
**Observation:** KPI cards show summary numbers but are not interactive.  
**Suggestion:**  
- "Outstanding Invoices (£2,340)" click → auto-set Payment Method filter to Insurance + Status to Pending  
- "Refunds This Month (£450)" click → auto-filter to status=refunded  
**Priority:** 🟢 Low — UX polish

---

## Test Plan Gaps & Additional Scenarios

### SUG-BILL-PLAN-001 — Test with Empty Invoice Array
Add a test case that temporarily empties `INVOICES`:
```js
// Temporarily set: const INVOICES = []
```
**Expected:** Table renders with empty body, no crash, no "undefined.map is not a function" error.  
**Reason:** Current plan mentions this as E5 but it's only theoretically tested — add a concrete step to force it.

### SUG-BILL-PLAN-002 — Test Refund Button Triggers Mutation (Post-Implementation)
Once `handleRefund` is implemented, add:
- TC-MGR-BILL-14B: Click refund icon on INV-001. Confirm dialog appears. Click Confirm. Assert: mutation fires, status chip changes to "Cancelled", refund button disappears.

### SUG-BILL-PLAN-003 — Test Payment Method = "Insurance" + Status = "Pending" Combo Filter
After SUG-BILL-011 is implemented:
> Set Method=Insurance, Status=Pending → Assert: 1 row (INV-004)  
> Set Method=Card, Status=Refunded → Assert: 1 row (INV-003)

### SUG-BILL-PLAN-004 — Accessibility Test
Add: Navigate table headers with Tab key. Assert: all interactive elements (sort buttons, filter dropdowns, action icons) are keyboard-focusable with visible focus rings.

### SUG-BILL-PLAN-005 — Revenue Chart: No Data Month
Add mock data with a month where `clinics: 0, services: 0`. Assert: bar renders at zero height without crash, no NaN displayed in tooltip.

---

## Summary Table

| ID | Suggestion | Category | Priority | Effort |
|----|-----------|----------|----------|--------|
| SUG-BILL-001 | Wire to live backend | 🔌 Backend | 🔴 High | High |
| SUG-BILL-002 | Implement invoice search filter | 🚀 Feature | 🟡 Medium | Low |
| SUG-BILL-003 | Wire date filter to data | 🚀 Feature | 🟡 Medium | Low |
| SUG-BILL-004 | Invoice view drawer/page | 🚀 Feature | 🟡 Medium | Medium |
| SUG-BILL-005 | Invoice PDF download | 🚀 Feature | 🟡 Medium | Medium |
| SUG-BILL-006 | CSV/PDF export | 🚀 Feature | 🟡 Medium | Low |
| SUG-BILL-007 | Refund with confirm dialog | 🚀 Feature | 🟡 Medium | Low |
| SUG-BILL-008 | Generate invoice wizard | 🚀 Feature | 🟢 Low | High |
| SUG-BILL-009 | Pagination for invoice table | ✨ UX | 🟢 Low | Low |
| SUG-BILL-010 | Add chart legend | ✨ UX | 🟢 Low | Very Low |
| SUG-BILL-011 | Status filter for invoices | ✨ UX | 🟡 Medium | Low |
| SUG-BILL-012 | Clickable KPI cards drill-down | ✨ UX | 🟢 Low | Low |

### Quick Wins (< 30 min each):
1. **SUG-BILL-002** — 20 min — add `searchQuery` state + filter to `filtered` array
2. **SUG-BILL-006** — 20 min — `Blob` + `URL.createObjectURL` CSV download
3. **SUG-BILL-010** — 2 min — add `<Legend />` inside `<BarChart>`
4. **SUG-BILL-011** — 20 min — add status filter to toolbar
