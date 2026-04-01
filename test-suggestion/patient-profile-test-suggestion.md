# Patient Profile — Test Suggestions (Session QA v2.0)

**Module:** Patient Portal — My Profile
**Updated:** 2026-03-31 (Session QA)

---

## 🔴 High Priority — Completed (Session)

### SUG-PTPROF-001 — Wire "+ Add" Chip for Allergies/Conditions
```
Status: COMPLETED
Notes: onClick → setShowAllergyInput(true) / setShowConditionInput(true)
       Inline TextField + Enter key + Confirm (CheckIcon) + Cancel (CancelIcon) buttons.
       Same pattern applied to conditions.
       aria-labels on all buttons.
Files: Profile.jsx
```

### SUG-PTPROF-002 — Null Guard for Avatar Initials
```
Status: COMPLETED
Notes: profile.firstName?.[0] ?? '?' — safe when firstName is empty string or undefined
       displayName guard: "Unknown Patient" fallback when both names absent
Files: Profile.jsx
```

### SUG-PTPROF-003 — Insurance Fields Editable in Edit Mode
```
Status: COMPLETED
Notes: insuranceField(label, key) helper function mirrors field() but targets draft.insurance[key]
       All 3 insurance fields (provider, policyNo, expires) now convert to TextField in edit mode.
Files: Profile.jsx
```

### SUG-PTPROF-004 — Connect Profile to Auth Context
```
Status: COMPLETED
Notes: seedFromAuth() reads useAuth().user. Seeds firstName, lastName, email from auth user.
       Falls back to INITIAL mock values if user info incomplete.
       Still fully mock-mode compatible — no API call required.
Files: Profile.jsx
```

### SUG-PTPROF-005 — Delete Allergy/Condition Chips in Edit Mode
```
Status: COMPLETED
Notes: onDelete={editing ? () => filter(x=>x!==item) : undefined}
       Delete icon shown on chip in edit mode. Hidden in view mode.
       Applied to both allergies and conditions.
Files: Profile.jsx
```

---

## 🟢 Low Priority — Completed (Session)

### SUG-PTPROF-009 — Remove Unused PatientAvatar Import
```
Status: COMPLETED
Notes: PatientAvatar removed from import. MUI Avatar used directly (was already the case).
Files: Profile.jsx
```

---

## 🟡 Medium Priority — Pending

### SUG-PTPROF-006 — Make Avatar Health Fields Editable
```
Status: PENDING
Notes: Blood Type, DOB, Gender in left avatar card are static Typography in all modes.
       Could be moved to Personal Info grid or added conditionally in avatar card.
Priority: Medium
```

### SUG-PTPROF-007 — Apollo Query for Real Profile Data
```
Status: PENDING
Notes: Deferred — requires GET_PATIENT_PROFILE query. Mock INITIAL + auth seeding covers offline.
Priority: Backend milestone
```

### SUG-PTPROF-010 — Unsaved Changes Guard on Navigation
```
Status: PENDING
Notes: useBeforeUnload(editing) — browser dialog when navigating away with unsaved changes.
Priority: Medium
```

---

## 🟢 Low Priority — Pending

### SUG-PTPROF-008 — Page Title via Helmet
```
Status: PENDING
Notes: <Helmet><title>My Profile — MediBook</title></Helmet>
Priority: Low
```

---

## New Suggestions Discovered

### SUG-PTPROF-011 — Blood Type / Gender as Select Dropdowns
```
Status: PENDING
Notes: Blood Type should be a controlled dropdown (A+/A-/B+/B-/O+/O-/AB+/AB-).
       Gender should be a Select (Male/Female/Non-binary/Prefer not to say).
       Currently both are free-text TextField fields.
Priority: Medium
```

### SUG-PTPROF-012 — Address Autocomplete
```
Status: PENDING
Notes: "Home Address" is a free-text field. Google Places or Mapbox autocomplete would
       improve UX for address entry and ensure valid postal formatting.
Priority: Low
```

### SUG-PTPROF-013 — Phone Format Validation
```
Status: PENDING
Notes: type="tel" accepts any string — no format enforcement. A regex validator
       (e.g., E.164 format +44XXXXXXXXXX) would prevent invalid entries.
Priority: Medium
```

---

## Summary Table

| ID | Description | Status |
|----|-------------|--------|
| SUG-PTPROF-001 | Wire "+ Add" chip | ✅ COMPLETED |
| SUG-PTPROF-002 | Avatar null guard | ✅ COMPLETED |
| SUG-PTPROF-003 | Editable insurance fields | ✅ COMPLETED |
| SUG-PTPROF-004 | Auth context seed | ✅ COMPLETED |
| SUG-PTPROF-005 | Delete chip in edit mode | ✅ COMPLETED |
| SUG-PTPROF-006 | Avatar health fields editable | ⏳ PENDING |
| SUG-PTPROF-007 | Apollo query integration | ⏳ PENDING |
| SUG-PTPROF-008 | Page title via Helmet | ⏳ PENDING |
| SUG-PTPROF-009 | Remove unused import | ✅ COMPLETED |
| SUG-PTPROF-010 | Unsaved changes guard | ⏳ PENDING |
| SUG-PTPROF-011 | Blood Type / Gender dropdowns | ⏳ PENDING |
| SUG-PTPROF-012 | Address autocomplete | ⏳ PENDING |
| SUG-PTPROF-013 | Phone format validation | ⏳ PENDING |
