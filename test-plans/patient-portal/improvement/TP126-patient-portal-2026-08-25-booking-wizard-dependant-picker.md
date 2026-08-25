---
id: TP126
type: improvement
feature: patient-portal
created: 2026-08-25
updated: 2026-08-25
status: approved
parent: PLAN099
related: [REQ072]
---

# TP126 — Test plan for the booking-wizard dependant picker

No dedicated `BookingStep4Patient.jsx` unit test exists (pre-existing
gap for the whole `BookingWizard/` directory, not introduced by this
slice). Verification is lint/build plus a manual-QA checklist for the
recommended follow-up live pass.

## Manual QA checklist (recommended follow-up, not yet executed — no
browser-automation tool was available in this session)

| # | Case | Expected |
|---|---|---|
| 1 | Log in as a linked patient account, open `/appointments/new` | Radio list ("Myself" + dependants) shows, not the search box |
| 2 | Same account with ≥1 real dependant | Each dependant listed as `Name (relation)` |
| 3 | Select a dependant | Wizard's subsequent steps use that dependant's real patient id |
| 4 | Log in as staff/manager, open `/appointments/new` | Unchanged generic search/create flow |

## Full-suite gate (Hard Rule 3)

```
cd frontend && npm run lint && npm test && npm run build
```

Frontend lint/unit/build all confirmed green for this change.
