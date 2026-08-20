---
id: TP030
type: test-plan
feature: profile
created: 2026-04-02
updated: 2026-04-02
status: approved
parent: unknown
related: [TR029, TS030]
---

# Profile Module — Test Plan (v2.0)

**Module:** Profile page (`/profile`)
**File:** `src/pages/profile/index.jsx`
**Updated:** 2026-03-31 (Session QA v2.0)
**Mock data:** `MOCK_PROFILE` (Admin User, MediBook Health Clinic, Administrator role)

---

## Feature Overview

Profile page — single route `/profile`. View mode (3 cards: header, contact, address) + Edit mode (2-tab: Edit Profile / Change Password). Avatar with initials or uploaded photo. Apollo client.query + client.mutate for all data operations. MOCK_PROFILE fallback for offline mode (v2.0).

---

## 1. View Mode

### TC-PROF-01 — Page load: profile renders from mock (offline mode)
**Steps:** Navigate to `/profile` with backend offline.
**Expected:** Mock profile "Admin User" rendered. Active chip (green), Administrator chip, Member Since "15 January 2024". Email "+1 555-2100", Clinic "MediBook Health Clinic". No spinner. No error.

---

### TC-PROF-02 — Retry button on failed load
**Steps:** Force profile=null state after failed query.
**Expected:** Alert: "Failed to load profile. Please check your connection and try again." With "Retry" action button. Clicking Retry calls load() again.

---

### TC-PROF-03 — Member Since + Last Updated display
**Steps:** View header card.
**Expected:** Member Since → `fmtDate()` → "15 January 2024". Last Updated → `timeAgo()` → "5m ago" (relative).

---

### TC-PROF-04 — Contact card: email + phone
**Steps:** View Contact card.
**Expected:** Email = "admin@medibook.com". Phone = "+1 555-2100" (country code + phone joined, trimmed).

---

### TC-PROF-05 — Address card visible when address_line1 set
**Steps:** View with address_line1="100 Healthcare Ave".
**Expected:** Address card shown. "100 Healthcare Ave, Suite 200", City: Boston, Postal: 02101, Country: United States.

---

### TC-PROF-06 — Address card hidden when no address set
**Steps:** profile.address_line1=null, city=null, country=null.
**Expected:** Address section (Card) not rendered (conditional per line 294).

---

### TC-PROF-07 — Role chip conditional
**Steps:** profile.role={name:'Administrator'} (truthy).
**Expected:** "Administrator" outlined primary chip shown in header.

---

### TC-PROF-08 — Role chip hidden when null
**Steps:** profile.role=null.
**Expected:** Role chip not rendered.

---

### TC-PROF-09 — Clinic row conditional
**Steps:** profile.clinic={name:'MediBook Health Clinic'}.
**Expected:** Clinic row visible with BusinessIcon.

---

### TC-PROF-10 — ClientOrg row conditional
**Steps:** profile.clientOrg={name:'Org', code:'ORG1'}.
**Expected:** "Org (ORG1)" shown in header grid.

---

## 2. Edit Mode — Entry & Exit

### TC-PROF-11 — Enter edit mode
**Steps:** Click "Edit Profile" button.
**Expected:** Edit card with 2 tabs. Edit Profile button hidden. Profile form (first name, last name, phone, address fields) visible. Fields pre-filled from profile.

---

### TC-PROF-12 — Cancel resets form to original data
**Steps:** Open edit; change First Name to "Changed"; click Cancel.
**Expected:** View mode restored. Re-open edit → First Name = "Admin" (original). pForm re-seeded from profile.

---

### TC-PROF-13 — Error in edit mode stays in edit mode
**Steps:** Edit mode; backend returns userErrors.
**Expected:** Error Alert shown inside edit card. setEditing(false) NOT called. Edit mode stays active.

---

## 3. Edit Mode — Photo Upload

### TC-PROF-14 — Upload Photo: file < 5MB accepted
**Steps:** Click "Upload Photo"; select valid < 5MB image file.
**Expected:** Optimistic preview shown immediately. Uploading overlay on avatar. Button disabled during upload. Success: avatar updated.

---

### TC-PROF-15 — Upload Photo: file > 5MB rejected
**Steps:** Click "Upload Photo"; select file > 5MB.
**Expected:** Error: "Image must be under 5 MB. Please choose a smaller file." FileReader NOT called. fileRef cleared.

---

### TC-PROF-16 — Upload Photo: button disabled during FileReader race
**Steps:** Click "Upload Photo" (before file picker closes).
**Expected:** Button disabled immediately (fileProcessing=true). Cannot double-click.

---

### TC-PROF-17 — Upload Photo: avatar overlay during uploading
**Steps:** uploading=true state.
**Expected:** Semi-transparent overlay with white CircularProgress on avatar. Button shows "Uploading…".

---

### TC-PROF-18 — Remove Photo button
**Steps:** imageUrl=null → Upload image → click Remove.
**Expected:** Remove button hidden when no image. Shown after upload. Clicking fires DELETE_IMAGE → avatar reverts to initials.

---

### TC-PROF-19 — Upload non-image file blocked
**Steps:** <input accept="image/*"> — select PDF.
**Expected:** Browser file picker blocks non-image files. onChange not triggered.

---

## 4. Edit Mode — Profile Tab

### TC-PROF-20 — Save Changes: required fields enforced
**Steps:** Clear First Name; click Save Changes.
**Expected:** Browser native required validation blocks submit ("Please fill out this field").

---

### TC-PROF-21 — Save Changes: happy path (when backend available)
**Steps:** Change Last Name to "Test"; click Save Changes.
**Expected:** Spinner during save. "Profile updated successfully!" green alert (3s auto-dismiss). View mode restored.

---

### TC-PROF-22 — Success alert auto-dismisses
**Steps:** Trigger successful save.
**Expected:** Green success alert appears. After 3 seconds: alert disappears (setSuccess(null)).

---

## 5. Edit Mode — Password Tab

### TC-PROF-23 — Switch to Password tab
**Steps:** In edit mode, click "Change Password" tab.
**Expected:** Password form with 3 empty fields (Current Password, New Password, Confirm). pwForm reset on entry.

---

### TC-PROF-24 — Password tab re-entry resets fields
**Steps:** Enter "test" in Current Password; switch to Profile tab; switch back to Password tab.
**Expected:** Current Password field empty. All 3 fields blank (setPwForm(defaultPasswordForm) on tab entry).

---

### TC-PROF-25 — Password: mismatch error
**Steps:** new_password="Password1" confirm="Password2".
**Expected:** "New passwords do not match". No mutation.

---

### TC-PROF-26 — Password: too short error
**Steps:** new_password="Abc1" confirm="Abc1" (4 chars, matching).
**Expected:** "Password must be at least 8 characters".

---

### TC-PROF-27 — Password: strength error (no uppercase/number)
**Steps:** new_password="aaaaaaaa" confirm="aaaaaaaa" (8 chars, no uppercase, no number).
**Expected:** "Password must include at least one uppercase letter and one number".

---

### TC-PROF-28 — Password: empty current password
**Steps:** new_password="Password1" confirm="Password1"; current_password="".
**Expected:** "Please enter your current password". Checked after strength check.

---

### TC-PROF-29 — Password: mismatch priority over length
**Steps:** new_password="ab" confirm="cd" (both < 8 AND mismatch).
**Expected:** "New passwords do not match" (not "too short" — mismatch checked first).

---

### TC-PROF-30 — Password: happy path (when backend available)
**Steps:** Fill valid passwords; submit.
**Expected:** "Password changed!" (3s). After 2s: edit mode closed, editTab reset to 0. pwForm cleared.

---

## 6. Edge Cases

| # | Edge | Expected |
|---|------|----------|
| E1 | phone=null, phone_country_code=null | `${''}${null}`.trim() = '' → '—' shown |
| E2 | role=null | Role chip not rendered |
| E3 | clinic=null | Clinic row not rendered |
| E4 | Upload PDF | Browser picker blocks (accept="image/*") |
| E5 | File > 5MB | Rejected before FileReader — error shown |
| E6 | Double-click Upload Photo | Blocked by fileProcessing=true race guard |
| E7 | Tab switch error state | setError(null) called on tab change |
| E8 | Success alert | 3s auto-dismiss via setTimeout |
| E9 | initials(null, 'Smith') | Returns "S" — optional chaining safe |
| E10 | fmtDate(null) | Returns "—" |

---

## Total: 30 Test Cases + 10 Edge Cases
