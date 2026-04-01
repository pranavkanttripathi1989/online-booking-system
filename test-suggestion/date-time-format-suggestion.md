# Date & Time Format — Feature Suggestions (Session 6 — 2026-03-30)

**Module:** `utils/dateTime.js`, `utils/dateUtils.js`, all date-rendering components  
**Updated:** 2026-03-30 Session 6

> ✅ **All actionable frontend suggestions implemented. Infrastructure items deferred.**

---

## Complete Summary Table

| ID | Suggestion | Priority | Status |
|----|-----------|----------|--------|
| SUG-DT-IMPL-001 | Create `dateTime.js` utility | 🔴 | ✅ DONE |
| SUG-DT-IMPL-002–011 | Fix all Session 1 HH:mm violations | 🔴 | ✅ DONE |
| SUG-DT-001 to 005 | Chart axis, DOB, project-wide adoption | 🟠 | ✅ DONE |
| SUG-DT-S3-001–003 | Clinician/Calendar/Patient times | 🟠 | ✅ DONE |
| SUG-DT-S4-001 | dateUtils.js formatTime/formatTimeRange fix | 🟡 | ✅ DONE |
| SUG-DT-006 | Availability TimePicker 12h preview | 🟢 | ✅ DONE (S5) |
| SUG-DT-010 | dateUtils.js `@deprecated` comment | 🟢 | ✅ DONE (S5) |
| **NEW-DT-011a** | `formatRelativeTime()` in dateTime.js | 🟡 | ✅ DONE (S6) |
| **NEW-DT-011b** | `formatCurrency()` in dateTime.js | 🟢 | ✅ DONE (S6) |
| SUG-DT-008 | Regression audit pre-commit hook | 🟠 | ⏭ DEFERRED (CI/infra) |
| SUG-DT-009 | formatSlotTime() HH:mm monitor | 🟢 | ⏭ MONITOR (intentional API use) |

---

## Session 6 Implementation Notes

### NEW-DT-011a — formatRelativeTime()
```js
export const formatRelativeTime = (value) => {
  if (!value) return '—';
  const diffSec  = dayjs().diff(dayjs(value), 'second');
  const diffMin  = dayjs().diff(dayjs(value), 'minute');
  const diffHour = dayjs().diff(dayjs(value), 'hour');
  const diffDay  = dayjs().diff(dayjs(value), 'day');
  if (diffSec  < 60)  return 'just now';
  if (diffMin  < 60)  return `${diffMin} min ago`;
  if (diffHour < 24)  return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay  < 7)   return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  return formatShortDate(value);  // "19 Mar 2026" for older
}
```

### NEW-DT-011b — formatCurrency()
```js
export const formatCurrency = (amount, currency = 'GBP') =>
  new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount ?? 0);
// Mirrors dateUtils.js — consumers can now import from one canonical source
```

---

## Remaining

| Item | Requires |
|------|---------|
| SUG-DT-008 | CI pipeline (GitHub Actions/Husky) — infrastructure work |
| SUG-DT-009 | Monitor only — `formatSlotTime()` is intentional API format |
