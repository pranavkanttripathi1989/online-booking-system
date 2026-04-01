# Manager Module — Test Suggestions (Final)

**Version:** 2.0
**Updated:** 2026-03-31 (Session QA)

---

## COMPLETED Suggestions

### SUG-MGR-001 — Mock data fallbacks for Blocks.jsx form dropdowns
```
Status: COMPLETED
Notes: MOCK_CLINICIANS, MOCK_CLINICS, MOCK_ROOMS added to Blocks.jsx. Dropdowns populated offline.
```

### SUG-MGR-002 — Mock data fallbacks for Availability.jsx form dropdowns
```
Status: COMPLETED
Notes: MOCK_CLINICIANS_AV, MOCK_CLINICS_AV added to Availability.jsx. Dropdowns populated offline.
```

### SUG-MGR-003 — Fix missing FormControl import in services/index.jsx
```
Status: COMPLETED
Notes: FormControl added to @mui/material import. Services page crash resolved.
```

### SUG-MGR-004 — Move mock data to module level in services/index.jsx
```
Status: COMPLETED
Notes: MOCK_SERVICES_DATA + MOCK_CATEGORIES_DATA at module level. isMock graceful fallback applied.
```

### SUG-MGR-005 — Mock data fallback in products/index.jsx loadData()
```
Status: COMPLETED
Notes: MOCK_PRODUCTS, MOCK_PROD_CATEGORIES, MOCK_PROD_SUBCATEGORIES. catch block populates state.
```

### SUG-MGR-006 — Centralise mock reference data into a shared file
```
Status: COMPLETED
Notes: Created src/mocks/referenceData.js with canonical MOCK_CLINICIANS (5), MOCK_CLINICS (5), MOCK_ROOMS (4).
       Blocks.jsx and Availability.jsx maintain their own inline constants for backward compatibility;
       referenceData.js is the canonical source for future sub-modules to import from.
```

### SUG-MGR-007 — Edit clinic routing uses correct ID
```
Status: COMPLETED (already implemented)
Notes: clinics/index.jsx line 142 uses /manager/clinics/${clinic.id}/edit — no hardcoding.
```

### SUG-MGR-008 — Availability: "Valid Until" needs guidance text
```
Status: COMPLETED
Notes: helperText="Leave blank for no end date" added to Valid Until TextField (Availability.jsx line 499).
```

### SUG-MGR-009 — Services/Products: Add offline demo data banner
```
Status: COMPLETED
Notes:
  - services/index.jsx: isMock && <Alert severity="info">Demo mode banner</Alert>
  - products/index.jsx: isMockData state (set in catch block) drives <Alert severity="info">banner
```

### SUG-MGR-010 — Blocks.jsx: End time validation
```
Status: COMPLETED (already implemented)
Notes: validateTimes(start, end) at line 194; called in both spacerForm and roomForm submit handlers.
```

---

## Pending Suggestions (New — Discovered in Session QA)

### SUG-MGR-011 — Availability: "Valid From" default should respect timezone
```
Status: PENDING
Notes: new Date().toISOString().split('T')[0] produces UTC date which may be off by 1 day in IST+5:30.
       Should use new Date().toLocaleDateString('sv') for reliable local-date string.
```

### SUG-MGR-012 — Blocks.jsx / Availability.jsx: Import from referenceData.js
```
Status: PENDING
Notes: Both files still have inline mock constants. Future refactor should import from
       src/mocks/referenceData.js to eliminate duplication entirely.
```

### SUG-MGR-013 — Services/Products offline banner should be dismissable
```
Status: PENDING
Notes: The isMock Alert has no onClose prop. Adding onClose={() => {}} with local dismissed state
       would allow users to dismiss the banner after acknowledging demo mode.
```

---

## Summary Table

| ID | Description | Status |
|----|-------------|--------|
| SUG-MGR-001 | Blocks.jsx mock dropdowns | ✅ COMPLETED |
| SUG-MGR-002 | Availability.jsx mock dropdowns | ✅ COMPLETED |
| SUG-MGR-003 | FormControl import in services | ✅ COMPLETED |
| SUG-MGR-004 | services mock data to module level | ✅ COMPLETED |
| SUG-MGR-005 | products mock data in catch block | ✅ COMPLETED |
| SUG-MGR-006 | Centralised referenceData.js | ✅ COMPLETED |
| SUG-MGR-007 | Clinic edit uses clinic.id | ✅ COMPLETED |
| SUG-MGR-008 | Valid Until helper text | ✅ COMPLETED |
| SUG-MGR-009 | Offline "Demo mode" banner | ✅ COMPLETED |
| SUG-MGR-010 | Blocks end_time validation | ✅ COMPLETED |
| SUG-MGR-011 | Timezone-safe valid_from date | ⏳ PENDING |
| SUG-MGR-012 | Import from referenceData.js | ⏳ PENDING |
| SUG-MGR-013 | Dismissable offline banner | ⏳ PENDING |
