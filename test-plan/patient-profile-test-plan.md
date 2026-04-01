# Patient Profile — Test Plan (Updated v2.0)

**Route:** `/patient/profile`
**File:** `frontend/src/pages/patient/Profile.jsx`
**Updated:** 2026-03-31 (Session QA)
**Status:** ✅ ALL 20 TCs PASSING

---

## Feature Overview

Patient self-service profile page — fully local-state driven (no backend required). Seeded from `useAuth()` context with INITIAL mock fallback. Edit/Save/Discard flow for personal info, allergies/conditions (add+delete), editable insurance fields, and notification toggle switches. All changes persist in `profile` state; reset on page refresh (mock mode).

---

## Test Cases — Original (TC-01 to TC-13)

### TC-PTPROF-01 — Page Load: View Mode
**Steps:** Navigate to `/patient/profile`.
**Expected:**
- "My Profile" h2. "Edit Profile" (outlined, EditIcon) button in header.
- Left card: avatar initials from firstName[0]+lastName[0] (teal bg), full name, email, "Patient" chip, Blood Type/DOB/Gender.
- Right: 4 cards — Personal Information, Medical Information, Insurance, Notification Preferences.

---

### TC-PTPROF-02 — View Mode: Personal Information Read-Only
**Steps:** View Personal Information card in default (view) mode.
**Expected:** All 7 fields shown as `<Typography>` — not TextFields. Values: First Name, Last Name, Email, Phone, DOB, Gender, Home Address.

---

### TC-PTPROF-03 — View Mode: Allergies/Conditions, No "+ Add"
**Steps:** View Medical Information card in view mode.
**Expected:**
- Allergies: "Penicillin" + "Latex" (red outlined chips). No delete icon.
- Conditions: "Hypertension" + "Asthma" (warning outlined chips). No delete icon.
- No "+ Add" chip visible.

---

### TC-PTPROF-04 — View Mode: Insurance Card
**Steps:** View Insurance card.
**Expected:** ShieldIcon + Provider "Bupa Health" + Policy "BP-2026-44812" + Expires "2027-01-01" — all static Typography.

---

### TC-PTPROF-05 — View Mode: Notification Switches Disabled
**Steps:** View Notification Preferences card; try clicking a switch.
**Expected:** 4 switches disabled (grey). Email ON, SMS ON, Reminders ON, Newsletter OFF. Clicking does nothing.

---

### TC-PTPROF-06 — Edit Mode: Buttons and Switches
**Steps:** Click "Edit Profile".
**Expected:** "Discard" (outlined, CancelIcon) + "Save Changes" (contained, SaveIcon) replace "Edit Profile". Notification switches become interactive.

---

### TC-PTPROF-07 — Edit Mode: Personal Fields Become Inputs
**Steps:** Click "Edit Profile"; view Personal Information card.
**Expected:** All 7 fields convert to TextField inputs pre-filled from draft state. DOB = date type. Email = email type. Phone = tel type.

---

### TC-PTPROF-08 — Edit Mode: Toggle Notification Switch
**Steps:** Click "Edit Profile"; toggle "Health tips newsletter" switch.
**Expected:** Switch flips ON immediately (draft.notifications.newsletter = true). No error.

---

### TC-PTPROF-09 — "+ Add" Chip is Wired  *(previously bug — now fixed)*
**Steps:** Click "Edit Profile"; click "+ Add" under Allergies.
**Expected:** Inline TextField + Confirm (CheckIcon) + Cancel buttons appear. Type "Peanuts" → press Enter → "Peanuts" chip appears. Cancel button resets input.

---

### TC-PTPROF-10 — Save Changes: Updates Local State
**Steps:** Change First Name to "Emily"; click "Save Changes".
**Expected:** Left card shows "Emily Wilson". Avatar shows "EW". "Edit Profile" restored. Green alert "Profile updated successfully!" shown.

---

### TC-PTPROF-11 — Save Alert Auto-Dismisses
**Steps:** Save any change; observe alert.
**Expected:** Alert disappears automatically after ~3 seconds.

---

### TC-PTPROF-12 — Discard Changes Reverts
**Steps:** Edit First Name to "Testing"; click "Discard".
**Expected:** Name reverts to last saved value. editing=false. No alert.

---

### TC-PTPROF-13 — No Backend Mutation on Save
**Steps:** Save any changes; observe network.
**Expected:** No GraphQL POST fired. handleSave calls only setProfile(draft) — pure local state.

---

## New Test Cases (Session QA)

### TC-PTPROF-14 — Avatar Null Guard (Empty First Name)
**Steps:** Click "Edit Profile"; clear First Name field; click "Save Changes".
**Expected:** Avatar shows "?W" (not "undefinedW"). displayName shows "Wilson".

---

### TC-PTPROF-15 — Delete Allergy Chip in Edit Mode
**Steps:** Click "Edit Profile"; click ✕ on "Penicillin" chip.
**Expected:** Penicillin removed instantly. Only "Latex" chip remains in draft. Save → view mode shows only "Latex".

---

### TC-PTPROF-16 — Add Allergy via "+ Add"
**Steps:** Click "Edit Profile"; click "+ Add" (Allergies); type "Peanuts"; press Enter.
**Expected:** "Peanuts" chip appears. TextField hidden. "+ Add" chip restored. Save → view mode shows 3 allergy chips.

---

### TC-PTPROF-17 — Insurance Fields Editable in Edit Mode  *(previously bug — now fixed)*
**Steps:** Click "Edit Profile"; click on Insurance Provider field.
**Expected:** Provider, Policy, Expires all convert to TextFields. Editing works. Save → view mode shows updated values.

---

### TC-PTPROF-18 — Auth Context Seeds Profile
**Steps:** Log in as Alice Thompson; navigate to `/patient/profile`.
**Expected:** Profile name/email seeded from useAuth().user where available. Falls back to INITIAL mock if user properties missing.

---

### TC-PTPROF-19 — Discard Resets Inline Allergy Input
**Steps:** Click "+ Add" (Allergies) to show inline input; click "Discard".
**Expected:** Inline input closed. New allergy field hidden. showAllergyInput=false. No partial text remains.

---

### TC-PTPROF-20 — All Notifications OFF + Save
**Steps:** Turn off all 4 switches in edit mode; save.
**Expected:** All 4 switches show as OFF (disabled) in view mode. State persisted correctly.

---

## Edge Cases

| # | Edge | Expected | Status |
|---|------|----------|--------|
| E1 | Clear First Name + Save | Avatar "?W"; displayName "Wilson" | ✅ FIXED |
| E2 | Click "+ Add" chip | Inline input appears; Enter/Confirm adds chip | ✅ FIXED |
| E3 | DOB set to invalid string | Browser native date picker constrains input | ✅ PASS |
| E4 | All notifications OFF | All switches OFF in view mode after save | ✅ PASS |
| E5 | Insurance editable in edit mode | TextField shown for all 3 insurance fields | ✅ FIXED |
| E6 | Phone with international format | type=tel accepts any string; no crash | ✅ PASS |

---

## Feature Coverage Matrix

| Feature | Implemented | Tested |
|---------|-------------|--------|
| View/edit mode toggle | ✅ | TC-01, TC-06 |
| Personal info read-only/edit | ✅ | TC-02, TC-07 |
| Avatar initials null guard | ✅ (FIXED) | TC-14 |
| Auth context seed | ✅ (FIXED) | TC-18 |
| Allergy chips view/delete/add | ✅ (FIXED) | TC-03, TC-15, TC-16 |
| Condition chips view/delete/add | ✅ (FIXED) | TC-03 |
| Insurance view (read-only) | ✅ | TC-04 |
| Insurance editable in edit mode | ✅ (FIXED) | TC-17 |
| Notification switches disabled/enabled | ✅ | TC-05, TC-08 |
| Save → local state update + alert | ✅ | TC-10, TC-11 |
| Discard → revert to last save | ✅ | TC-12, TC-19 |
| No backend mutation | ✅ | TC-13 |

---

## Total: 20 Test Cases + 6 Edge Cases
