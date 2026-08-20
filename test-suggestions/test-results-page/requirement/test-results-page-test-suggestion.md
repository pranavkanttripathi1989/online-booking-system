---
id: TS036
type: test-suggestion
feature: test-results-page
created: 2026-03-19
updated: 2026-08-18
status: done
parent: unknown
related: [TP036, TR035]
---

# Test Results Page — Test Suggestions (v3.0)

**Module:** Test Results (`/test-results`) — `pages/test-results/index.jsx`, `backend/src/test-results/**`
**Updated:** 2026-08-17 (Session QA v3.0 — real backend added, see `context/test-results-backend-implementation-plan.md`)

---

## 🔴 High Priority — New this pass

### SUG-TRES-010 — `patient` is free text, not a real Patients link — real risk of typos creating duplicate/unmatched records
**Status:** ⏳ PENDING
**Notes:** The Order Test dialog's "Patient Name" field has always been (and still is, post-backend) a plain `TextField` with no autocomplete against real patient data — confirmed by reading both the pre-existing frontend code and the new backend, which stores `patient_name` as denormalized free text rather than a `patient_id` FK (an optional, nullable `patient_id` was added to the schema for forward compatibility, but nothing populates it yet). A clinician typing "Priya Sharma" vs "Priya sharma" vs "P. Sharma" creates results that can never be reliably grouped under one real patient record. This was a pre-existing frontend gap, not introduced this pass, but it's now a real backend data-quality risk rather than a mock-data curiosity.
**Recommendation:** Block on Phase 6 (Patients module). Once a real `patients`/`patient` query exists, replace the free-text field with an autocomplete against real patients, and start populating `TestResults.patient_id` (already in the schema) instead of only `patient_name`.

### SUG-TRES-011 — `test-results-page-test-plan.md`'s mock-specific assertions (TC-TRES-01–07/28) are now environment-fragile
**Status:** ⏳ PENDING (documented in the test plan itself, `TC-TRES-01`'s header note — flagged here too since it affects how this suite should be run in CI/repeatable testing)
**Notes:** These cases pass only against an empty `TestResults` table (mock fallback active) and silently stop applying the moment any real order exists — there's no test-only "reset to empty" mechanism, so a developer running this suite twice in a row without a DB reset will see confusing, environment-dependent results.
**Recommendation:** Either seed a small set of deterministic `TestResults` rows (matching `MOCK_RESULTS`' exact shape) in `prisma/seed.ts` so the "real" and "mock" expected data converge, or add a documented `docker exec ... psql -c "DELETE FROM \"TestResults\""` reset step before re-running this specific test file.

## 🟡 Medium Priority — New this pass

### SUG-TRES-012 — `date_ordered`/`date_completed` lose time-of-day precision
**Status:** ⏳ PENDING
**Notes:** The backend stores full `DateTime` but the resolver formats both fields down to `YYYY-MM-DD` (`.toISOString().split('T')[0]`) to match the mock's date-only string format exactly (Rule 9). This is a deliberate match to the current UI, not an oversight — but if a future "ordered 2 hours ago" style relative-time display is wanted, the backend already has the precision, only the resolver's formatting would need to change.
**Recommendation:** No action needed unless a real feature request for time-of-day display emerges — noting only so a future engineer doesn't assume the precision was lost at the database level.

---

## v2.0 History (unchanged, still accurate)

## 🔴 High Priority — COMPLETED

### SUG-TRES-001 — Implement "Download PDF" Button Handler
```
Status: COMPLETED
Notes: handleDownloadPDF(result) function added before ResultDialog component.
       Builds plain-text lines from result.id, .test, .patient, .ordered_by, .values.
       Creates Blob(text/plain) → URL.createObjectURL → <a> element click → revokeObjectURL.
       File downloaded as: `${result.id}-result.txt` (e.g. TR-001-result.txt).
       Button: onClick={() => handleDownloadPDF(result)}
Files: pages/test-results/index.jsx
```

### SUG-TRES-002 — Implement "Order Test" Button Handler
```
Status: COMPLETED
Notes: const [orderOpen, setOrderOpen] = useState(false)
       const [orderForm, setOrderForm] = useState({ patient: '', testType: 'Blood Test' })
       handleOrderSubmit(): setOrderOpen(false) + reset form.
       "Order Test" header button: onClick={() => setOrderOpen(true)}
       Full dialog: Patient Name (TextField) + Test Type (Select: 5 options with emoji icons).
       Submit button: disabled when patient name empty.
Files: pages/test-results/index.jsx
```

### SUG-TRES-003 — Fix Unknown Flag Chip Background Color
```
Status: COMPLETED
Notes: const flagColor = FLAG_COLORS[v.flag] || '#64748B' — fallback to grey.
       Chip: bgcolor: `${flagColor}18`, color: flagColor
       Value cell: color: flagColor
       Previously: `${undefined}18` = "undefined18" — invalid CSS, chip had no background.
Files: pages/test-results/index.jsx
```

---

## 🟡 Medium Priority — COMPLETED

### SUG-TRES-004 — Add "Reset Filters" / Clear Button
```
Status: COMPLETED
Notes: Conditional <Button> rendered when any filter is active:
       (search || typeFilter !== 'All' || statusFilter !== 'All')
       onClick: setSearch(''), setTypeFilter('All'), setStatusFilter('All')
       Button style: text variant, color:#64748B, "Clear Filters" label.
       Button disappears when all filters are at default.
Files: pages/test-results/index.jsx
```

### SUG-TRES-007 — Add "low" Flag Test Data to TR-006
```
Status: COMPLETED
Notes: TR-006 (Urine Analysis) values array extended with:
       { name: 'Ketones', value: 'Trace', ref: 'Negative', flag: 'low' }
       This exercises FLAG_COLORS.low = '#D97706' (amber) rendering path.
       Confirmed: value text amber, chip amber bg (#D9770618), label "low".
Files: pages/test-results/index.jsx
```

---

## 🟡 Medium Priority — Pending

### SUG-TRES-005 — Add Column Sorting
```
Status: COMPLETED
Notes: Added sortField/sortDir state (default date_ordered/desc) and TableSortLabel on the
       Patient, Date Ordered, and Status headers. Sorting done via [...list].sort() with
       localeCompare, memoized alongside the filter computation.
Files: pages/test-results/index.jsx
```

### SUG-TRES-006 — Add Loading Skeleton for Backend Integration
```
Status: COMPLETED
Notes: This page has no useQuery (pure local mock data), so added a `loading` state that's
       true for 500ms on mount to simulate a fetch, matching useMockMutation's async-delay
       convention used elsewhere. Renders <Skeleton> placeholders for the 4 KPI cards and 4
       table rows while loading. Also wrapped types/filtered/counts in useMemo as suggested.
Files: pages/test-results/index.jsx
```

---

## New Suggestions (Session)

### SUG-TRES-008 — Order Test: Add to Mock Data on Submit
```
Status: COMPLETED
Notes: Converted MOCK_RESULTS into results state (useState(MOCK_RESULTS)). handleOrderSubmit
       now builds a new record (id TR-0NN, status:'pending', ordered_by:'Current User', today's
       date, empty values) and prepends it via setResults, so it appears in the table and KPI
       counts immediately.
Files: pages/test-results/index.jsx
```

### SUG-TRES-009 — Add "Share Result" Action in Dialog
```
Status: PENDING
Notes: Along with Download PDF, add a "Share" button that copies a formatted summary to clipboard.
       Use navigator.clipboard.writeText(lines.join('\n')).
Priority: Low
```

---

## Summary Table

| ID | Description | Status |
|----|-------------|--------|
| SUG-TRES-001 | Download PDF handler | ✅ COMPLETED |
| SUG-TRES-002 | Order Test dialog | ✅ COMPLETED |
| SUG-TRES-003 | Unknown flag chip fallback | ✅ COMPLETED |
| SUG-TRES-004 | Clear Filters button | ✅ COMPLETED |
| SUG-TRES-005 | Column sorting | ✅ COMPLETED |
| SUG-TRES-006 | Loading skeleton | ✅ COMPLETED |
| SUG-TRES-007 | "low" flag mock data | ✅ COMPLETED |
| SUG-TRES-008 | Order pushes to mock state | ✅ COMPLETED |
| SUG-TRES-009 | Share result to clipboard | ⏳ PENDING (New) |
| SUG-TRES-010 | Patient field is free text, not a real Patients link | ⏳ PENDING (blocked on Phase 6) |
| SUG-TRES-011 | Mock-specific test assertions are environment-fragile now that a real backend exists | ⏳ PENDING |
| SUG-TRES-012 | date_ordered/date_completed lose time-of-day precision in the resolver | ⏳ PENDING (no action needed yet) |

---

## 🔴 Critical — Found & Fixed (Backend-API Verification Pass, 2026-08-18)

### SUG-TRES-SEC-001 — PHI exposure: `testResults`/`testResult(id)` had no auth gate or patient scoping at all
```
Found via: QA-TESTING-EXECUTION-PROMPT.md Phase 1 backend resolver/service inventory. Directly
           relevant to SUG-TRES-010 above -- once patient_id is populated, this is the query that
           would leak every patient's lab values without this fix.
What broke: testResults()/testResult(id) had NO @Auth() role annotation at all (any authenticated
            role, including 'patient', could call it) and org-level scoping only, never per-patient.
            testResults() returned every patient's lab results (including sensitive `values`) to any
            logged-in patient account. Matches test-cases/05-patients/test-cases.md TC-PAT-API-011
            ("A patient can only view their own test results, not another patient's").
What changed: Added patient self-scoping (patient_id embedded in JWT, same pattern as
              patients-test-suggestion.md SUG-PAT-SEC-001) to both findAll and findOne.
Status: FIXED — backend/src/test-results/test-results.service.ts, 4 new unit tests in
        test-results.service.spec.ts. No live curl round-trip possible yet (no test result rows
        are linked to a real patient_id in seed data -- see SUG-TRES-010), but the scoping logic
        itself is unit-tested and structurally identical to the live-verified Patients/Appointments fixes.
Residual risk: this query still has no @Auth() role restriction at all -- any authenticated role can
               call it (deliberately left broad since manager/admin/clinician/staff all legitimately
               need to browse results; only patient-role callers are now restricted to their own).
               Worth an explicit @Auth() review once the domain gets its Phase 2 RBAC matrix pass.
Files: backend/src/test-results/test-results.service.ts, test-results.service.spec.ts
```
