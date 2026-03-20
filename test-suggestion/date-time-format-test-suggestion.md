# Date & Time Format — Feature Suggestions (Session 4)

**Last Updated:** 2026-03-20 (Session 4)

---

## All Implemented Suggestions

| ID | Suggestion | Status |
|----|-----------|--------|
| SUG-DT-IMPL-001 | Create `dateTime.js` utility | ✅ COMPLETED |
| SUG-DT-IMPL-002–011 | Fix all Session 1 HH:mm violations (11 files) | ✅ COMPLETED |
| SUG-DT-001 | Chart axis `MMM DD` → `DD MMM` (4 files) | ✅ COMPLETED |
| SUG-DT-002 | Patient list DOB `DD/MM/YYYY` | ✅ COMPLETED |
| SUG-DT-003 | Adopt `dateTime.js` project-wide | ✅ COMPLETED |
| SUG-DT-004 | Clinician Availability display labels | ✅ COMPLETED |
| SUG-DT-005 | Public doctor-profile booking date | ✅ COMPLETED |
| SUG-DT-S3-001 | Clinician Dashboard next apt time (`h:mm A`) | ✅ COMPLETED |
| SUG-DT-S3-002 | Calendar popover Time row (`h:mm A`) | ✅ COMPLETED |
| SUG-DT-S3-003 | Patient Dashboard apt chip (`h:mm A`) | ✅ COMPLETED |

---

## Session 4 Fixed

### SUG-DT-S4-001 — dateUtils.js formatTime / formatDateTime / formatTimeRange
```
Suggestion:   Fix hh:mm A (leading zero) and missing AM/PM in dateUtils.js
Status:       COMPLETED
Notes:        dateUtils.js is currently unused (no consumers), but the functions
              violated the h:mm A standard in 3 places. Now corrected:
              - formatTime: hh:mm A → h:mm A
              - formatDateTime: hh:mm A → h:mm A
              - formatTimeRange start: hh:mm (no AM/PM) → h:mm A
              Both sides of formatTimeRange now produce "9:30 AM – 10:00 AM"
Files:        frontend/src/utils/dateUtils.js lines 22, 26, 32
```

---

## Remaining / Pending

### SUG-DT-006 — Availability TimePicker 12h Preview (P3)
```
Suggestion:   Add live "Selected: 9:00 AM" preview below TimePicker in Availability drawer
Status:       PENDING
Priority:     Low — UX micro-enhancement
Files:        frontend/src/pages/clinician/Availability.jsx
```

### SUG-DT-008 — Regression Audit Script / Pre-commit Hook (P1)
```
Suggestion:   Add grep-based audit as pre-commit hook or CI step to prevent regressions
Status:       PENDING
Priority:     High — prevents future violations
Command:      grep -rn "format('hh:mm')\|format('HH:mm')" src --include="*.jsx" \
              | grep -v "Availability|booking/index|doctor-profile|dateUtils"
              If any output → new violation exists
Notes:        Ideally run as part of CI pipeline (GitHub Actions or Husky pre-commit)
```

### SUG-DT-009 — dateUtils.js Timezone Function Monitoring (P2)
```
Suggestion:   formatSlotTime() in dateUtils.js (line 54) uses HH:mm for internal
              slot comparison. If this ever renders to UI, convert to h:mm A.
Status:       PENDING (monitor only — not a display violation)
Priority:     Low
```

### SUG-DT-010 — Migrate dateUtils.js consumers to dateTime.js (P2)
```
Suggestion:   dateUtils.js is currently unused (no imports). If new code starts
              importing it, steer towards dateTime.js (the project standard).
              Consider adding a deprecation comment to dateUtils.js.
Status:       PENDING (low urgency — file currently has no consumers)
Priority:     Low
```

---

## Summary

| Category | Count | Status |
|----------|-------|--------|
| Bug fixes | 11 | ✅ All done |
| UX/format improvements | 3 | ✅ All done |
| Maintenance (Session 4) | 1 | ✅ Done |
| Pending (low priority) | 4 | ⏭ Deferred |
