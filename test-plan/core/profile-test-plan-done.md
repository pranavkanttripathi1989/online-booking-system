# Profile Page — Test Plan

**Route:** `/profile`
**File:** `frontend/src/pages/profile/index.jsx`
**Status:** ⚠️ NOT DONE — Test has not been executed yet.

---

## Feature Overview

A view/edit profile page. View mode shows a header card (avatar, name, role), contact information, and address. Edit mode opens a tabbed card with "Edit Profile" (personal info + address) and "Change Password" tabs. Supports photo upload (base64), photo delete, and profile/password mutations.

---

## Test Cases — View Mode

### TC-PROF-01 — Page Load: Spinner Then View Mode
**Steps:** Navigate to `/profile`.
**Expected:**
- `CircularProgress` shown centred while `loading = true`.
- After load: header card, contact card, address card shown.

---

### TC-PROF-02 — Page Load: Failed State
**Steps:** Mock `GET_MY_PROFILE` to return no data.
**Expected:**
- `Alert severity="error"` "Failed to load profile" shown.
- No crash.

---

### TC-PROF-03 — View Mode: Header Card
**Steps:** Profile loaded.
**Expected:**
- Avatar: image if `user_image` set, else initials `first_name[0] + last_name[0]`.
- Name: `first_name last_name`.
- Email shown below name.
- Active/Inactive chip; role chip (if role set).
- Member Since and Last Updated shown.
- Edit Profile button.

---

### TC-PROF-04 — View Mode: Clinic Info
**Steps:** User has an assigned clinic.
**Expected:**
- Clinic name shown with `BusinessIcon` below profile stats.

---

### TC-PROF-05 — View Mode: Organization Info
**Steps:** User has a `clientOrg`.
**Expected:**
- Org name and code shown as "{name} ({code})".

---

### TC-PROF-06 — View Mode: Contact Card
**Steps:** View contact card.
**Expected:**
- Email and Phone (with country code if set) displayed.
- Phone without country code: just the number.

---

### TC-PROF-07 — View Mode: Address Card Hidden when Empty
**Steps:** Profile has no address fields.
**Expected:**
- Address card not rendered (conditional: `address_line1 || city || country`).

---

### TC-PROF-08 — View Mode: Address Card Shows if Any Field Present
**Steps:** Profile has only `city` set.
**Expected:**
- Address card renders; shows city; other fields show "—".

---

---

## Test Cases — Edit Mode: Profile Tab

### TC-PROF-09 — Open Edit Mode
**Steps:** Click "Edit Profile".
**Expected:**
- `editing = true`; view mode hidden.
- Edit card with "Edit Profile" and "Change Password" tabs.
- Profile tab active by default.

---

### TC-PROF-10 — Edit Tab Default: Photo Section
**Steps:** Open edit mode, Profile tab.
**Expected:**
- Current avatar shown (image or initials preview).
- "Upload Photo" button (primary, with camera icon).
- "Remove" button shown only if `imageUrl` is set.

---

### TC-PROF-11 — Upload Photo: File Picker Opens
**Steps:** Click "Upload Photo".
**Expected:**
- Hidden file input triggered via `fileRef.current.click()`.
- File picker opens with `accept="image/*"` filter.

---

### TC-PROF-12 — Upload Photo: Optimistic Preview
**Steps:** Select an image file.
**Expected:**
- Avatar immediately updates to show the selected image (via `FileReader` + `setImageUrl`).
- `UPLOAD_IMAGE` mutation fires with base64 string and filename.
- On success: profile's `user_image` updated from response.

---

### TC-PROF-13 — Upload Photo: Error Feedback
**Steps:** Mock `UPLOAD_IMAGE` to return `userErrors: [{message: "Too large"}]`.
**Expected:**
- `setError("Too large")` shown as red alert in edit card.

---

### TC-PROF-14 — Remove Photo
**Steps:** Click "Remove" on uploaded photo.
**Expected:**
- `DELETE_IMAGE` mutation fires.
- On success: `imageUrl` set to null; avatar reverts to initials.

---

### TC-PROF-15 — Edit Profile: Name Fields Required
**Steps:** Clear First Name or Last Name; try to submit.
**Expected:**
- MUI `required` validation prevents form submission.

---

### TC-PROF-16 — Edit Profile: Save Changes (Happy Path)
**Steps:** Update phone to "+44 7700 999999"; click "Save Changes".
**Expected:**
- `UPDATE_PROFILE` mutation fires with `{ first_name, last_name, phone, address fields }`.
- On success: `setProfile` updated from response; green alert "Profile updated successfully!"; edit mode closes.

---

### TC-PROF-17 — Edit Profile: userErrors from Backend
**Steps:** Mock mutation to return `userErrors: [{message: "Email already in use"}]`.
**Expected:**
- Error shown in edit card alert; editing stays open.

---

### TC-PROF-18 — Edit Profile: Cancel
**Steps:** Make changes; click "Cancel".
**Expected:**
- `editing = false`; no mutation fires; previous profile data unchanged.

---

---

## Test Cases — Edit Mode: Password Tab

### TC-PROF-19 — Switch to Password Tab
**Steps:** In edit mode, click "Change Password" tab.
**Expected:**
- Three fields: Current Password, New Password (min 8 chars helper), Confirm New Password.
- All `type="password"`.

---

### TC-PROF-20 — Password: Passwords Don't Match
**Steps:** Enter new_password = "pass1234", confirm_password = "pass5678"; submit.
**Expected:**
- `setError("New passwords do not match")`.
- No mutation fires.

---

### TC-PROF-21 — Password: Too Short
**Steps:** Enter new_password = "short"; confirm = "short".
**Expected:**
- `setError("Password must be at least 8 characters")`.

---

### TC-PROF-22 — Password: Current Password Empty
**Steps:** Fill new/confirm but leave current password blank.
**Expected:**
- `setError("Please enter your current password")`.

---

### TC-PROF-23 — Password: Happy Path
**Steps:** Fill all fields correctly with valid 8+ char passwords.
**Expected:**
- `UPDATE_PROFILE` mutation fires with `{ current_password, password: newPassword }`.
- On success: success alert "Password changed!"; after 2s edit mode closes; tab resets to Profile tab.

---

## Edge Cases

| # | Edge Case | Expected |
|---|-----------|----------|
| E1 | `profile.phone` null, `phone_country_code` null | Shows "—" rather than crashing |
| E2 | `profile.role` null | Role chip not rendered |
| E3 | `profile.clinic` null | Clinic row not rendered |
| E4 | Upload non-image file (e.g., PDF) | `accept="image/*"` prevents selection in most browsers |
| E5 | Upload very large file (>10MB) | FileReader reads it; backend should reject with userError |
| E6 | Rapidly click "Upload Photo" twice | Second click overwrites first; only one fileRef click at a time |
| E7 | Tab switch in edit mode clears error | `setError(null)` on tab change prevents stale errors |
| E8 | Success alert disappears after 3s | `setTimeout 3000` in `showSuccess` |
