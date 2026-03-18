# Profile Page — Test Suggestions

**Derived from:** [profile-test-results.md](../test-result/profile-test-results.md)  
**Source File:** `frontend/src/pages/profile/index.jsx`  
**Date:** 2026-03-17

---

## 🔴 High Priority — Bugs & Critical Gaps

### SUG-PROF-001 — Add Mock Fallback for `GET_MY_PROFILE` (OBS-3)

**Problem:** `load()` uses `client.query({ fetchPolicy: 'network-only' })` with no fallback. Backend offline → `profile=null` → "Failed to load profile" is shown. All 14 view/edit TCs are untestable offline.

**Fix — Add mock profile data:**
```js
const MOCK_PROFILE = {
  id: 'u1', first_name: 'Admin', last_name: 'User', email: 'admin@healthsync.com',
  user_image: null, phone: '+44 7700 900000', phone_country_code: '+44',
  address_line1: '123 Medical Street', address_line2: null,
  city: 'London', postal_code: 'W1A 1AA', country: 'United Kingdom',
  is_active: true, created_at: '2024-01-01T00:00:00Z', updated_at: new Date().toISOString(),
  role: { id: 'r1', name: 'Admin', description: 'Administrator' },
  clinic: { id: 'c1', name: 'City Heart Clinic', address: '123 Medical St', phone: '+44 20 7946 0958', email: 'clinic@healthsync.com' },
  clinician: null, patient: null, clientOrg: null,
};

const load = async () => {
  setLoading(true);
  try {
    const { data } = await client.query({ query: GET_MY_PROFILE, fetchPolicy: 'network-only' });
    const p = data?.myProfile || MOCK_PROFILE;  // fallback to mock
    // ...rest unchanged
  } catch (err) {
    setProfile(MOCK_PROFILE);  // show mock on error instead of failure
    setImageUrl(MOCK_PROFILE.user_image);
    // populate pForm with mock data
  } finally { setLoading(false); }
};
```

**Priority:** 🔴 High | **Enables:** TC-PROF-03 through TC-PROF-18, all currently SKIPPED

---

### SUG-PROF-002 — Cancel Must Reset Form to Original Profile (OBS-2)

**Problem:** Line 377: `onClick={() => { setEditing(false); setError(null) }}` — when Cancel is clicked, `pForm` retains whatever values the user typed. Re-opening edit mode shows stale/partially-edited data from the last aborted edit.

**Fix — Reset pForm to current profile on cancel:**
```js
const handleCancel = () => {
  setEditing(false);
  setError(null);
  // Reset form to current profile values:
  if (profile) {
    setPForm({
      first_name:   profile.first_name   || '',
      last_name:    profile.last_name    || '',
      phone:        profile.phone        || '',
      address_line1: profile.address_line1 || '',
      address_line2: profile.address_line2 || '',
      city:         profile.city         || '',
      postal_code:  profile.postal_code  || '',
      country:      profile.country      || '',
    });
  }
};
```

Apply to both Cancel buttons (Profile tab line 377, Password tab line 392).

**Priority:** 🔴 High | **Effort:** ~15 lines

---

### SUG-PROF-003 — Add Close Button to "Failed to load profile" Alert (OBS-1)

**Problem:** Line 192: `<Alert severity="error">Failed to load profile</Alert>` — no `onClose`. Alert is permanent with no dismiss option.

**Fix:**
```jsx
if (!profile) return (
  <Alert severity="error" onClose={() => navigate(-1)}>
    Failed to load profile.{' '}
    <Button size="small" onClick={load}>Retry</Button>
  </Alert>
);
```

Or add a "Retry" button that calls `load()` again.

**Priority:** 🔴 High | **Effort:** 3 lines

---

### SUG-PROF-004 — Add Client-Side File Size Limit Before Upload (E5)

**Problem:** `handleFileChange` immediately reads any file with `FileReader.readAsDataURL()`. A 50MB photo would create a huge base64 string, potentially crashing the browser tab or timing out the mutation.

**Fix:**
```js
const handleFileChange = async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  // File size guard — reject > 5MB
  if (file.size > 5 * 1024 * 1024) {
    setError('Image must be under 5 MB');
    if (fileRef.current) fileRef.current.value = '';
    return;
  }
  // ...rest of FileReader logic
};
```

**Priority:** 🔴 High | **Effort:** 5 lines

---

## 🟡 Medium Priority — UX Improvements

### SUG-PROF-005 — Reset Password Form on Tab Switch (E7 Enhanced)

**Problem:** When switching from Password tab back to Profile tab, `pwForm` retains partial password input. Re-switching to Password tab shows leftover values in password fields.

Currently line 317: `onChange={(_, v) => { setEditTab(v); setError(null) }}` only clears error, not form.

**Fix:**
```js
onChange={(_, v) => {
  setEditTab(v);
  setError(null);
  if (v === 1) setPwForm(defaultPasswordForm); // clear password fields on entering password tab
}}
```

**Priority:** 🟡 Medium | **Effort:** 1 line

---

### SUG-PROF-006 — Disable Upload Button During FileReader Phase (E6 Race)

**Problem:** `uploading=true` is set only inside `reader.onload` (line 167), after `FileReader.readAsDataURL()` is called. Between clicking "Upload Photo" (which triggers `fileRef.current.click()`) and `reader.onload` executing, the button remains enabled. A fast double-click opens the file picker twice.

**Fix — Disable button during entire file operation:**
```js
const [fileProcessing, setFileProcessing] = useState(false);

// In Upload Photo onClick:
onClick={() => { setFileProcessing(true); fileRef.current?.click(); }}

// At top of handleFileChange:
const handleFileChange = async (e) => {
  setFileProcessing(false); // file picked, reset flag
  const file = e.target.files?.[0];
  // ...

// Button:
disabled={uploading || fileProcessing}
```

**Priority:** 🟡 Medium | **Effort:** ~5 lines

---

### SUG-PROF-007 — Show Upload Progress / Loading State on Avatar

**Problem:** During image upload (`uploading=true`), only the "Upload Photo" button text changes to "Uploading…". The avatar doesn't indicate uploading state — users may think nothing is happening if the optimistic preview already showed.

**Fix:**
```jsx
<Box sx={{ ...avatarStyles, position: 'relative' }}>
  {imageUrl ? <img ... /> : initials(...)}
  {uploading && (
    <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress size={24} sx={{ color: 'white' }} />
    </Box>
  )}
</Box>
```

**Priority:** 🟡 Medium | **Effort:** ~8 lines

---

### SUG-PROF-008 — Validate Password Strength (not just length)

**Problem:** Password validation only checks length ≥ 8 (line 143). "aaaaaaaa" (8 identical chars) passes. No complexity requirements.

**Fix — Add basic strength check:**
```js
const isStrongPassword = (pw) => /[A-Z]/.test(pw) && /[0-9]/.test(pw) && pw.length >= 8;

if (!isStrongPassword(pwForm.new_password)) {
  setError('Password must be 8+ characters with at least one uppercase letter and one number');
  setSaving(false); return;
}
```

**Priority:** 🟡 Medium | **Effort:** 5 lines

---

## 🟢 Low Priority — UX Polish

### SUG-PROF-009 — Show Character Count for Phone Field

Phone field (line 362) has placeholder `"+44 7700 900000"` but no validation. Users can enter any string.

**Fix:** Add `inputProps={{ maxLength: 20 }}` and a small character counter.

**Priority:** 🟢 Low

---

### SUG-PROF-010 — Show "Profile Updated At" Relative Time in Real-time

`timeAgo(profile.updated_at)` calculates at render time but doesn't update as time passes. "5m ago" stays stale as the user browses.

**Fix:** Use a `useInterval` / `useEffect` to re-render the timeAgo display every minute.

**Priority:** 🟢 Low

---

## Test Plan Gaps & Additional Test Cases

### SUG-PROF-PLAN-001 — Add TC: Cancel Resets Form State

> **TC-PROF-18B** — Form resets to original data on Cancel  
> Open edit mode. Change First Name from "Admin" to "Changed Name". Click Cancel.  
> Verify: View mode shows original "Admin" name.  
> Re-open edit mode. Verify: First Name field shows "Admin" (not "Changed Name").  
> **Current behavior FAILS** — form retains "Changed Name". See SUG-PROF-002.

### SUG-PROF-PLAN-002 — Add TC: Password Validation Execution Order

> **TC-PROF-24** — Mismatch takes priority over length  
> Enter New Password = "ab" (too short), Confirm = "cd" (mismatch AND too short).  
> Expected: "New passwords do not match" (not "too short").  
> Source line 142: mismatch check runs before length check.

### SUG-PROF-PLAN-003 — Add TC: Success Alert Auto-Dismiss

> **TC-PROF-25** — Green success alert disappears after 3 seconds  
> Save profile changes. Green "Profile updated successfully!" appears.  
> Wait 3 seconds. Verify alert disappears automatically.  
> Source line 97: `showSuccess` → `setTimeout(() => setSuccess(null), 3000)`.

### SUG-PROF-PLAN-004 — Add TC: Password Close-then-Reopen Resets Fields

> **TC-PROF-26** — Password fields clear on tab re-entry  
> Switch to Password tab. Type "test" in Current Password. Switch to Profile tab. Switch back to Password tab.  
> Expected (after fix): Password fields are empty (reset). Current (before fix): "test" persists.

### SUG-PROF-PLAN-005 — Add TC: initials() Function Edge Cases

> **TC-PROF-27** — initials with missing names  
> Test `initials(null, 'Smith')` → "S" (not crash). `initials('John', null)` → "J".  
> Source line 74: `${f?.[0] || ''}${l?.[0] || ''}`.toUpperCase()` — safe optional chaining.

### SUG-PROF-PLAN-006 — Add TC: fmtDate() Formats Member Since

> **TC-PROF-28** — Member Since date format  
> Verify `fmtDate('2024-01-15T00:00:00Z')` → "15 January 2024" (en-GB locale).  
> `fmtDate(null)` → "—".

### SUG-PROF-PLAN-007 — Add TC: "Remove" Button Only Shows With Image

> **TC-PROF-10B** — Remove button conditional on imageUrl  
> Default state (no image): "Remove" button NOT visible.  
> After uploading image: "Remove" button appears.  
> Source line 347: `{imageUrl && <Button>Remove</Button>}`.

### SUG-PROF-PLAN-008 — Add TC: Retry Button on Failed Load

> **TC-PROF-02B** — Retry button on failed profile load  
> After "Failed to load profile" appears, a "Retry" button should be available.  
> Currently: no retry. Enhancement required per SUG-PROF-003.

---

## Summary Table

| ID | Suggestion | Category | Priority |
|----|-----------|----------|----------|
| SUG-PROF-001 | Add mock fallback for GET_MY_PROFILE | 🧪 Test Infra | 🔴 High |
| SUG-PROF-002 | Cancel resets form to original profile | 🐛 Bug Fix | 🔴 High |
| SUG-PROF-003 | Add dismiss/retry to failed-load alert | 🐛 UX Bug | 🔴 High |
| SUG-PROF-004 | Client-side file size limit | 🛡 Validation | 🔴 High |
| SUG-PROF-005 | Reset password form on tab switch | ✨ UX | 🟡 Medium |
| SUG-PROF-006 | Disable upload button during FileReader | 🐛 Race Fix | 🟡 Medium |
| SUG-PROF-007 | Upload progress overlay on avatar | ✨ UX | 🟡 Medium |
| SUG-PROF-008 | Add password strength validation | 🛡 Security | 🟡 Medium |
| SUG-PROF-009 | Phone field max length | ✨ UX | 🟢 Low |
| SUG-PROF-010 | Live-updating timeAgo display | ✨ UX | 🟢 Low |

### Quick Wins (< 5 min):
- **SUG-PROF-003**: Add `onClose` + "Retry" button to failed-load Alert (3 lines)
- **SUG-PROF-004**: Add `file.size > 5MB` guard in `handleFileChange` (5 lines)
- **SUG-PROF-005**: Add `setPwForm(defaultPasswordForm)` on tab switch to Password tab (1 line)
