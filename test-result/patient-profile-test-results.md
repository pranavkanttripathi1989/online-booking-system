# Patient Profile — Test Results

**Feature:** Patient Portal — My Profile  
**Test Plan:** [patient-profile-test-plan-not-done.md](../test-plan/patient-portal/patient-profile-test-plan-not-done.md)  
**Source File:** `frontend/src/pages/patient/Profile.jsx` (195 lines)  
**Route:** `/patient/profile`  
**Executed:** 2026-03-17  
**Tester:** Antigravity AI (Live Browser + Source Review)  
**Environment:** `http://localhost:3001` as Alice Thompson (Patient session) — **100% local state, no backend required**  
**Total Cases:** 13 | **Edge Cases:** 6

---

## Summary

| Status | Count |
|--------|-------|
| ✅ PASS | 11 |
| ❌ FAIL (Bug Confirmed) | 1 |
| ⚠️ PARTIAL (source-verified enhancement) | 1 |
| ⏭ SKIPPED | 0 |

> Page is fully functional for all view/edit/save/discard flows.  
> 1 documented bug confirmed: "+ Add" chip has no onClick.  
> Insurance fields always read-only in edit mode (documented enhancement, E5).

---

## Screenshots

![Patient Profile — View Mode](file:///Users/pranavkanttripathi/.gemini/antigravity/brain/3064dd61-17bb-423a-8714-98b350a1ea98/initial_profile_view_mode_1773751792725.png)
*View mode: "EW" avatar, Emma Wilson, Blood Type A+, DOB 1990-04-12, Gender Female. Personal Info read-only. Allergy chips (red: Penicillin/Latex), Condition chips (yellow: Hypertension/Asthma). Insurance: Bupa Health / BP-2026-44812 / 2027-01-01. 3 active notification toggles, 1 OFF (Newsletter).*

![Patient Profile — After Save](file:///Users/pranavkanttripathi/.gemini/antigravity/brain/3064dd61-17bb-423a-8714-98b350a1ea98/saved_emily_wilson_profile_1773752247749.png)
*After saving: name updated to "Emily Wilson" in both avatar card and Personal Information. Avatar still shows "EW" (Emily[0]="E" + Wilson[0]="W"). "Edit Profile" button restored.*

---

## TC-PTPROF-01 — Page Load: View Mode

| | |
|---|---|
| **Expected** | "My Profile" h2; "Edit Profile" button; avatar "EW"; Emma Wilson; 4 right-column cards |
| **Actual** | ✅ **"My Profile"** h2 visible. **"Edit Profile"** button (outlined, EditIcon) top-right. Left column: teal avatar **"EW"**, **"Emma Wilson"** below, email **"emma.wilson@email.com"**, **"Patient"** chip (teal). Health info cards: Blood Type **A+**, DOB **1990-04-12**, Gender **Female**. Right column: 4 cards — Personal Information, Medical Information, Insurance, Notification Preferences. |
| **Status** | ✅ **PASS** |
| **Source** | Line 51: `<Typography variant="h2">My Profile` Line 68–69: `{profile.firstName[0]}{profile.lastName[0]}` for initials. |

---

## TC-PTPROF-02 — View Mode: Personal Information

| | |
|---|---|
| **Expected** | All 7 fields read-only (Typography, not TextField) |
| **Actual** | ✅ All fields in view mode: First Name **"Emma"**, Last Name **"Wilson"**, Email Address **"emma.wilson@email.com"**, Phone Number **"+44 7700 123456"**, Date of Birth **"1990-04-12"**, Gender **"Female"**, Home Address **"14 Maple Street, London, W1A 1AA"**. All displayed as `<Typography variant="body2">` not inputs. |
| **Status** | ✅ **PASS** |
| **Source** | Line 43: `{editing ? <TextField> : <Typography>{profile[key] || '—'}</Typography>}`. |

---

## TC-PTPROF-03 — View Mode: Allergies and Conditions Chips

| | |
|---|---|
| **Expected** | Penicillin + Latex (red outlined); Hypertension + Asthma (warning outlined); no "+ Add" |
| **Actual** | ✅ **Allergies:** "Penicillin" chip (red outlined, `color="error" variant="outlined"`) + "Latex" chip (red outlined). **Conditions:** "Hypertension" chip (orange/warning outlined) + "Asthma" chip (orange/warning outlined). **No "+ Add"** chip visible in view mode. |
| **Status** | ✅ **PASS** |
| **Source** | Line 120: `profile.allergies.map((a) => <Chip color="error" variant="outlined">)`. Line 121: `{editing && <Chip label="+ Add">}` — only shown when editing. |

---

## TC-PTPROF-04 — View Mode: Insurance Card

| | |
|---|---|
| **Expected** | Provider "Bupa Health"; Policy "BP-2026-44812"; Expires "2027-01-01" |
| **Actual** | ✅ Insurance card with ShieldIcon: Provider **"Bupa Health"**, Policy Number **"BP-2026-44812"**, Expires **"2027-01-01"**. All 3 fields correct. |
| **Status** | ✅ **PASS** |
| **Source** | Lines 143–154: hardcoded `<Typography>{profile.insurance.provider/policyNo/expires}</Typography>`. |

---

## TC-PTPROF-05 — View Mode: Notification Switches Disabled

| | |
|---|---|
| **Expected** | 4 switches, `disabled={!editing}` — not interactive in view mode |
| **Actual** | ✅ 4 switches visible with NotificationsIcon: **Email notifications** (ON), **SMS reminders** (ON), **24h appointment reminders** (ON), **Health tips newsletter** (OFF). Clicking Newsletter switch in view mode: **no toggle** — switches are disabled (greyed out appearance). |
| **Status** | ✅ **PASS** |
| **Source** | Line 179: `disabled={!editing}` — Switch disabled when `editing = false`. |

---

## TC-PTPROF-06 — Edit Mode: Toggle Switches Active, New Buttons

| | |
|---|---|
| **Input** | Click "Edit Profile" |
| **Expected** | `editing=true`; "Discard" + "Save Changes" replace "Edit Profile"; switches enabled |
| **Actual** | ✅ Clicked "Edit Profile". Button replaced by **"Discard"** (outlined, CancelIcon) + **"Save Changes"** (contained, SaveIcon). Notification switches **no longer grey** — interactive. |
| **Status** | ✅ **PASS** |
| **Source** | Line 52–58: Conditional rendering of Discard/Save vs Edit Profile based on `editing`. |

---

## TC-PTPROF-07 — Edit Mode: Personal Info Fields Become Inputs

| | |
|---|---|
| **Expected** | All fields become TextField inputs pre-filled with profile values |
| **Actual** | ✅ In edit mode: First Name → **TextField** with value "Emma", Last Name → "Wilson", Email Address → "emma.wilson@email.com" (type=email), Phone Number → "+44 7700 123456" (type=tel), Date of Birth → date input "1990-04-12", Gender → "Female", Home Address → full-width TextField. All pre-filled from `draft` state. |
| **Status** | ✅ **PASS** |
| **Source** | Line 41–42: `{editing ? <TextField value={draft[key]} onChange={...} /> : <Typography>}`. |

---

## TC-PTPROF-08 — Edit Mode: Toggle Notification Switch

| | |
|---|---|
| **Input** | Toggle "Health tips newsletter" from OFF to ON |
| **Expected** | Switch flips ON immediately via `draft.notifications.newsletter` |
| **Actual** | ✅ Newsletter switch toggled **OFF → ON**. Immediate visual state change. No error. |
| **Status** | ✅ **PASS** |
| **Source** | Line 177: `checked={editing ? draft.notifications[key] : profile.notifications[key]}`. Line 178: `onChange={(e) => setDraft({ ...draft, notifications: { ...draft.notifications, [key]: e.target.checked } })}`. |

---

## TC-PTPROF-09 — Edit Mode: "+ Add" Chip (Documented Bug)

| | |
|---|---|
| **Expected** | "+ Add" chip visible in edit mode; **KNOWN BUG:** no onClick — nothing happens |
| **Actual** | ❌ In edit mode: **"+ Add"** chip appears after "Penicillin" + "Latex" (allergies) and after "Hypertension" + "Asthma" (conditions). Clicking "+ Add" chip: **nothing happens** — no dialog, no input field, no error. |
| **Status** | ❌ **FAIL — Bug Confirmed** |
| **Source** | Lines 121, 128: `<Chip label="+ Add" size="small" variant="outlined" sx={{ cursor: 'pointer' }} />` — **no `onClick` prop**. `cursor: 'pointer'` style false-advertises interactivity. |

---

## TC-PTPROF-10 — Save Changes: Updates Local State

| | |
|---|---|
| **Input** | Change First Name to "Emily"; click "Save Changes" |
| **Expected** | Profile updated; `editing=false`; avatar name updates; success alert |
| **Actual** | ✅ Changed First Name field from "Emma" to "Emily". Clicked "Save Changes". Left avatar card immediately shows **"Emily Wilson"** (updated from `draft`). Avatar initials remain **"EW"** ("Emily"[0]="E" + "Wilson"[0]="W"). **"Edit Profile"** button restored. Green alert: **"Profile updated successfully!"** appeared. |
| **Status** | ✅ **PASS** |
| **Source** | Lines 31–36: `handleSave = () => { setProfile(draft); setEditing(false); setSaveOk(true); setTimeout(() => setSaveOk(false), 3000) }`. |

---

## TC-PTPROF-11 — Save Alert Auto-Dismisses After 3 Seconds

| | |
|---|---|
| **Expected** | Green success alert disappears after ~3 seconds |
| **Actual** | ✅ Alert "Profile updated successfully!" appeared after save. Auto-dismissed after approximately **3 seconds** — timed via browser wait. No user action required. |
| **Status** | ✅ **PASS** |
| **Source** | Line 35: `setTimeout(() => setSaveOk(false), 3000)`. |

---

## TC-PTPROF-12 — Discard Changes Reverts

| | |
|---|---|
| **Input** | In edit mode, change First Name to "Testing"; click "Discard" |
| **Expected** | `editing=false`; `draft` reset to `profile`; name reverts to last-saved "Emily" |
| **Actual** | ✅ Entered edit mode. Changed First Name to "Testing". Clicked "Discard". **Profile shows "Emily Wilson"** (reverted to last saved — NOT "Testing"). `editing=false`: "Edit Profile" button restored. No success alert. |
| **Status** | ✅ **PASS** |
| **Source** | Line 54: `onClick={() => { setEditing(false); setDraft(profile); }}` — draft reset to current `profile` state. |

---

## TC-PTPROF-13 — No Backend Mutation

| | |
|---|---|
| **Expected** | No GraphQL mutation fired on save |
| **Actual** | ✅ No `useMutation` hook in component. No GraphQL operations except Apollo import (unused by this page). Browser Network panel: **no GraphQL POST on save**. `handleSave` only calls `setProfile(draft)` — pure local state. |
| **Status** | ✅ **PASS (source-verified)** |
| **Source** | Source uses only `useState`, no `useMutation` or `gql` import. |

---

## Edge Cases

| # | Edge Case | Result | Status |
|---|-----------|--------|--------|
| **E1** | Clear First Name; Save | `profile.firstName[0]` → `''[0]` = `undefined` → avatar initials become `"undefinedW"` or empty string. Source line 69: no null guard. | ⚠️ Bug: no guard |
| **E2** | Click "+ Add" chip | Nothing happens — no onClick. Re-confirms TC-PTPROF-09. | ❌ Bug confirmed |
| **E3** | Edit DOB to "not-a-date" | `type="date"` input — browser native date picker. Accepts any valid date format. | ✅ Source-verified |
| **E4** | All notifications off; Save | All 4 switches turned OFF → Saved → View mode shows all switches OFF in disabled state. All-off state persisted in local state. | ✅ **PASS (live-tested)** |
| **E5** | Insurance not editable in edit mode | Insurance **Provider, Policy, Expires** remain `<Typography>` (static) even in edit mode — never converted to TextField. | ⚠️ Confirmed enhancement gap |
| **E6** | Phone with international format | `type="tel"` TextField accepts any string — no format validation. "+44 7700 123456" accepted as-is. | ✅ Source-verified |

---

## Observations

| # | Observation | Impact |
|---|-------------|--------|
| **OBS-1** | Topbar displays "Alice Thompson" (auth user) while profile page shows "Emma Wilson" (mock INITIAL data). Disconnection between auth context and patient profile data. | 🔴 High — Data inconsistency |
| **OBS-2** | Avatar initials (`profile.firstName[0] + profile.lastName[0]`) have no null guard — if firstName cleared and saved, the avatar shows empty string or "undefined". | 🔴 High — Crash risk |
| **OBS-3** | Blood Type, DOB, Gender in the left avatar card are NOT editable (hardcoded `<Typography>` from profile state, no field() helper). | 🟡 Medium — Enhancement gap |
| **OBS-4** | `PatientAvatar` is imported (line 6) but NOT used — `Avatar` from MUI is used directly instead. Unused import. | 🟢 Low |
| **OBS-5** | Page title uses MUI `variant="h2"` but no `<Helmet>` title tag — browser tab shows generic app title. | 🟢 Low |
