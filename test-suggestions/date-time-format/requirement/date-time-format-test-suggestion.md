---
id: TS012
type: test-suggestion
feature: date-time-format
created: 2026-03-20
updated: 2026-08-17
status: done
parent: unknown
related: [TP013, TR012]
---

# Date & Time Format — Feature Suggestions (Session 7 — 2026-03-30)

**Module:** `utils/dateTime.js`, `utils/dateUtils.js`, all date-rendering components  
**Updated:** 2026-03-30 Session 7

> ✅ **All actionable frontend suggestions implemented. 2 new adoption-gap items added (Session 7).**

---

## Summary Table

| ID | Suggestion | Priority | Status |
|----|-----------|----------|--------|
| SUG-DT-IMPL-001 | Create `dateTime.js` utility | ✅ | ✅ DONE |
| SUG-DT-IMPL-002–011 | Fix all Session 1 HH:mm violations | 🔴 | ✅ DONE |
| SUG-DT-001 to 005 | Chart axis, DOB, project-wide adoption | 🟠 | ✅ DONE |
| SUG-DT-S3-001–003 | Clinician/Calendar/Patient times | 🟠 | ✅ DONE |
| SUG-DT-S4-001 | dateUtils.js formatTime/formatTimeRange fix | 🟡 | ✅ DONE |
| **SUG-DT-006** | Availability TimePicker 12h preview | 🟢 | ✅ DONE (S5) |
| **SUG-DT-010** | dateUtils.js `@deprecated` JSDoc comment | 🟢 | ✅ DONE (S5) |
| **NEW-DT-011a** | `formatRelativeTime()` helper | 🟡 | ✅ DONE (S6) |
| **NEW-DT-011b** | `formatCurrency()` helper | 🟡 | ✅ DONE (S6) |
| **SUG-DT-S7-001** | Adopt `formatRelativeTime` in Messages sidebar | 🟡 | ✅ DONE (S7) |
| **SUG-DT-S7-002** | Adopt `formatCurrency` in Billing/Finance components | 🟡 | ✅ DONE (S7) |
| SUG-DT-008 | Regression audit pre-commit hook | 🟠 | ⏭ DEFERRED (CI/infra) |
| SUG-DT-009 | formatSlotTime() HH:mm monitor | 🟢 | ⏭ MONITOR (intentional API use) |

---

## Session 7 New Suggestions

### SUG-DT-S7-001 — Adopt `formatRelativeTime` in Messages Sidebar
**Priority:** 🟡 Medium | **Status:** ✅ DONE

**Context:** `formatRelativeTime()` was added to `dateTime.js` in Session 6 but no component imports it yet. The Messages sidebar thread list likely shows raw timestamps or ISO strings.

**Recommended change:**
```jsx
// In Messages sidebar thread list
import { formatRelativeTime } from '../../utils/dateTime'
// Replace raw timestamp display:
<Typography>{formatRelativeTime(thread.last_message_at)}</Typography>
// → "just now", "2 min ago", "3 days ago", or "19 Mar 2026"
```

**Implementation:** `pages/messages/index.jsx` `ContactItem` (thread list row) previously rendered `new Date(thread.last_activity).toLocaleTimeString('en-GB', {...})` — a fixed clock time. Replaced with `formatRelativeTime(thread.last_activity)`, imported from `utils/dateTime`, so the sidebar now shows "2 min ago" / "3 days ago" etc. like the rest of the app.

---

### SUG-DT-S7-002 — Adopt `formatCurrency` in Billing/Finance Components
**Priority:** 🟡 Medium | **Status:** ✅ DONE

**Context:** `formatCurrency()` is defined in both `dateTime.js` and `dateUtils.js` (intentional mirror). No component currently imports from `dateTime.js`. Billing/Finance pages likely use hardcoded `£${value.toFixed(2)}` or inline `Intl.NumberFormat`.

**Recommended change:**
```jsx
import { formatCurrency } from '../../utils/dateTime'
// Replace:
// £{Number(value).toFixed(2)}
// With:
{formatCurrency(value)}  // → £28,750.00 (handles null, commas, GBP symbol)
```

**Implementation:** `pages/manager/Billing.jsx` hardcoded `£${inv.amount}`/`£{inv.amount}` in six places (CSV export, refund success message, refund confirm dialog, invoice table cell, invoice detail drawer, and the downloadable receipt text). All six now call `formatCurrency(inv.amount)` from `utils/dateTime`. Left untouched: the static `SUMMARY` KPI strings (pre-formatted literals, not derived from `amount`) and the revenue chart's axis/tooltip compact formatting (`£11k` style), which is a deliberate different format, not a plain currency amount. `pages/finances/index.jsx` was reviewed too but intentionally uses a `$`-prefixed `BalanceCard`/wallet display throughout — swapping in `formatCurrency` (GBP) there would change the displayed currency symbol, so it was left as-is rather than guessed at.

---

## Remaining

| Item | Requires |
|------|---------|
| SUG-DT-008 | CI pipeline (GitHub Actions/Husky) — infrastructure work |
| SUG-DT-009 | Monitor only — `formatSlotTime()` is intentional API format |
