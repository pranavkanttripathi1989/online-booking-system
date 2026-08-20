---
id: TS029
type: test-suggestion
feature: patient-profile
created: 2026-03-19
updated: 2026-08-17
status: done
parent: unknown
related: [TP029, TR028]
---

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
Status: DONE
Notes: Implemented via the "moved to Personal Info grid" option: added a Blood Type
       field (Select) to the Personal Information card, editable in edit mode. Avatar
       card's Blood Type/DOB/Gender read-only display already reads from `profile`, so
       it now reflects the edited values (DOB and Gender were already editable in the
       Personal Info grid; Blood Type was the only gap).
Files: Profile.jsx
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
Status: DONE
Notes: Added isDirty (draft vs profile, only while editing) + window.beforeunload
       listener that warns before leaving the tab/refreshing with unsaved changes.
Files: Profile.jsx
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
Status: DONE
Notes: field() helper extended with an `options` param that renders a controlled
       MUI Select. Gender now uses GENDER_OPTIONS (Male/Female/Non-binary/Prefer not
       to say); the new Blood Type field (added per SUG-PTPROF-006) uses BLOOD_TYPES
       (A+/A-/B+/B-/O+/O-/AB+/AB-).
Files: Profile.jsx
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
Status: DONE
Notes: Added PHONE_RE (/^\+?[0-9()\- ]{7,20}$/) validation in handleSave(); invalid
       phone numbers block save and show inline error/helperText under the Phone field.
       Error clears as soon as the user edits the field again.
Files: Profile.jsx
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
| SUG-PTPROF-006 | Avatar health fields editable | ✅ DONE |
| SUG-PTPROF-007 | Apollo query integration | ⏳ PENDING (backend milestone) |
| SUG-PTPROF-008 | Page title via Helmet | ⏳ PENDING (Low — out of scope) |
| SUG-PTPROF-009 | Remove unused import | ✅ COMPLETED |
| SUG-PTPROF-010 | Unsaved changes guard | ✅ DONE |
| SUG-PTPROF-011 | Blood Type / Gender dropdowns | ✅ DONE |
| SUG-PTPROF-012 | Address autocomplete | ⏳ PENDING (Low — out of scope) |
| SUG-PTPROF-013 | Phone format validation | ✅ DONE |
