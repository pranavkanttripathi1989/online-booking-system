# Settings Page — Test Suggestions

**Derived from:** [settings-test-results.md](../test-result/settings-test-results.md)  
**Source File:** `frontend/src/pages/settings/index.jsx`  
**Date:** 2026-03-17

---

## 🔴 High Priority — Bug Fixes

### SUG-SET-001 — Wire Camera Icon to File Upload (TC-SET-06)

**Problem:** Camera `<IconButton>` has no `onClick`. Caption says "Click to change photo" — false promise.

**Fix:**
```jsx
const fileRef = useRef(null);

// Update IconButton:
<IconButton size="small" onClick={() => fileRef.current?.click()} sx={{ ... }}>
  <CameraAltRoundedIcon />
</IconButton>

// Hidden file input:
<input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />

// Handler:
const handleAvatarChange = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => setAvatarPreview(reader.result); // optimistic preview
  reader.readAsDataURL(file);
  // Then call UPLOAD_IMAGE mutation...
};
```

**Priority:** 🔴 High | **Effort:** ~15 lines

---

### SUG-SET-002 — Add Password Validation to "Update Password" (TC-SET-08)

**Problem:** "Update Password" button has no `onClick`. No validation, no mutation, no feedback.

**Fix:**
```jsx
const [pwForm, setPwForm] = useState({ current: '', new: '', confirm: '' });

const handleUpdatePassword = () => {
  if (!pwForm.current) return setError('Please enter your current password');
  if (pwForm.new.length < 8) return setError('New password must be at least 8 characters');
  if (pwForm.new !== pwForm.confirm) return setError('New passwords do not match');
  // Call UPDATE_PASSWORD mutation or handleSave with success feedback
  handleSave();
};

// Update button:
<Button variant="outlined" onClick={handleUpdatePassword}>Update Password</Button>
```

**Priority:** 🔴 High | **Effort:** ~20 lines

---

### SUG-SET-003 — Wire Revoke Session Buttons (TC-SET-11)

**Problem:** Both Revoke buttons have no `onClick`. Sessions cannot be revoked.

**Fix:**
```jsx
const [sessions, setSessions] = useState(MOCK_SESSIONS);

const handleRevoke = (sessionId) => {
  // In production: call REVOKE_SESSION mutation
  setSessions(prev => prev.filter(s => s.id !== sessionId));
};

// Update button:
{!s.current && (
  <Button size="small" color="error" variant="outlined" onClick={() => handleRevoke(s.id)}>
    Revoke
  </Button>
)}
```

**Priority:** 🔴 High | **Effort:** ~8 lines

---

### SUG-SET-004 — Add Confirm Dialog to Deactivate Account (TC-SET-12)

**Problem:** "Deactivate Account" fires nothing. Should require confirmation and call backend.

**Fix:**
```jsx
const [confirmOpen, setConfirmOpen] = useState(false);

<Button variant="outlined" color="error" onClick={() => setConfirmOpen(true)}>
  Deactivate Account
</Button>

<Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
  <DialogTitle>Deactivate Account?</DialogTitle>
  <DialogContent>
    <Typography>This will immediately revoke all access. This action cannot be undone.</Typography>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
    <Button color="error" onClick={handleDeactivate}>Deactivate</Button>
  </DialogActions>
</Dialog>
```

**Priority:** 🔴 High | **Effort:** ~20 lines

---

### SUG-SET-005 — Connect Theme Selection to ThemeContext (TC-SET-16)

**Problem:** `themeMode` state is local — selecting Dark/System has no visual effect. App stays light.

**Fix:**
```jsx
// In AuthContext or ThemeContext:
const [themeMode, setThemeMode] = useContext(ThemeContext);

// In App.jsx:
<ThemeProvider theme={themeMode === 'dark' ? darkTheme : lightTheme}>

// In SettingsPage, read from context instead of local state:
const { themeMode, setThemeMode } = useContext(ThemeContext);
```

**Priority:** 🔴 High | **Effort:** ~30 lines (cross-file)

---

### SUG-SET-006 — Connect Compact/RTL Toggles to Layout (TC-SET-19)

**Problem:** `compact` and `rtl` are local state — toggling them doesn't change the UI.

**Fix:**
```jsx
// Store in context or localStorage:
const [compact, setCompact] = useContext(LayoutContext);
const [rtl, setRtl] = useContext(LayoutContext);

// In root layout:
<Box sx={{ ...(compact && { '& .MuiCardContent-root': { py: 1, px: 2 } }) }}
  dir={rtl ? 'rtl' : 'ltr'}>
```

**Priority:** 🔴 High | **Effort:** ~25 lines (cross-file)

---

## 🟡 Medium Priority — Uncontrolled Fields (OBS-3, 4, 5)

### SUG-SET-007 — Convert Clinic, Gender, DOB to Controlled Fields (OBS-3/4/5)

**Problem:** Clinic Name, Contact Phone, Email, Timezone, Currency, Slot Duration, Gender select, and Date of Birth all use `defaultValue` — uncontrolled React. Values typed by users are discarded by React and never reach any save handler.

**Fix — Convert to controlled:**
```jsx
const [clinicForm, setClinicForm] = useState({
  name: 'MediCare Clinic',
  phone: '+1 555-100-0000',
  email: 'admin@medicareclinic.com',
  timezone: 'IST',
  address: '123 Health Avenue...',
  currency: 'USD',
  slotDuration: '30',
});

// In handleSave for Clinic tab:
const handleClinicSave = () => {
  // send clinicForm to backend mutation
  handleSave();
};
```

**Priority:** 🟡 Medium | **Effort:** ~30 lines

---

### SUG-SET-008 — Wire 2FA Switch to Controlled State

**Problem:** 2FA `<Switch>` has no `checked` or `onChange` — it's browser-internal uncontrolled state. React doesn't know its value. Backend can never be called with the toggle state.

**Fix:**
```jsx
const [twoFa, setTwoFa] = useState(false);

<FormControlLabel
  control={<Switch color="success" checked={twoFa} onChange={(e) => setTwoFa(e.target.checked)} />}
  label={<Typography fontWeight={600}>Enable 2FA (TOTP)</Typography>}
/>
```

**Priority:** 🟡 Medium | **Effort:** 3 lines

---

### SUG-SET-009 — Persist Notification Preferences to Backend

**Problem:** All `notifs` state changes are lost on page reload. Save Preferences calls the generic `handleSave()` which shows a success alert but saves nothing.

**Fix:** Call a `UPDATE_NOTIFICATION_PREFERENCES` mutation on Save Preferences, passing the current `notifs` array.

**Priority:** 🟡 Medium

---

### SUG-SET-010 — Per-Tab Success Alert

**Problem:** All 5 Save buttons show the same green "Changes saved successfully!" alert. The alert appears at the top of the page, not contextually near the Save button that was clicked. Users may be confused about which tab's data was saved.

**Fix — Differentiate success messages:**
```jsx
const handleSave = (context = '') => {
  setSaved(`${context} saved successfully!`);
  setTimeout(() => setSaved(null), 2500);
};

// Profile tab:
<Button onClick={() => handleSave('Profile changes')}>Save Changes</Button>
// Clinic tab:
<Button onClick={() => handleSave('Clinic settings')}>Save Clinic Settings</Button>
```

**Priority:** 🟡 Medium | **Effort:** ~5 lines

---

## 🟢 Low Priority — UX Polish

### SUG-SET-011 — Add Unsaved Changes Guard on Tab Switch (E3)

**Problem:** Switching tabs with unsaved form changes gives no warning. While state is actually preserved across tab switches (E3 edge case) — the form retains values — there is no visual indicator of "unsaved changes" when the user navigates away.

**Fix:** Track `isDirty` state per tab and show a small chip or indicator:
```jsx
const [isDirty, setIsDirty] = useState(false);

// On any form change:
onChange={(e) => { setFirstName(e.target.value); setIsDirty(true); }}

// Show indicator:
{isDirty && <Chip label="Unsaved changes" size="small" color="warning" />}
```

**Priority:** 🟢 Low

---

### SUG-SET-012 — Add File Size Validation to Photo Upload (E2 + TC-SET-06 Fix)

Caption at line 115 says "Max 2MB" but when the upload onClick is implemented, no file size check is added.

**Fix (add to handleAvatarChange):**
```js
if (file.size > 2 * 1024 * 1024) {
  setSaved(false);
  alert('File must be under 2 MB');
  return;
}
```

**Priority:** 🟢 Low

---

## Test Plan Gaps & Additional Test Cases

### SUG-SET-PLAN-001 — Add TC: Avatar Initials Update on Name Change

> **TC-SET-02B** — Avatar initials update in real-time  
> In Profile tab, change First Name from "Admin" to "John".  
> Expected: Avatar updates from "AU" to "JU" in real-time.  
> Source line 109: `(firstName[0] ?? '') + (lastName[0] ?? '')` — reactive to state.

### SUG-SET-PLAN-002 — Add TC: Success Alert Not Shown for Unhandled Buttons

> **TC-SET-08B** — Update Password button has no handler  
> Click "Update Password" with filled fields.  
> Expected: No alert, no mutation, no feedback.  
> Source: Line 173 — no `onClick`. Documents the gap explicitly.

### SUG-SET-PLAN-003 — Add TC: Tab Switching Preserves Local State

> **TC-SET-22** — Tab switch preserves form values (Edge Case E3 correction)  
> Type "Test Name" in First Name. Switch to Notifications tab. Switch back.  
> Expected: "Test Name" remains in First Name field (state preserved as `firstName` useState).  
> This corrects the test plan's E3 claim that "changes are lost".

### SUG-SET-PLAN-004 — Add TC: Notification Toggle Persists Within Session

> **TC-SET-23** — Toggled notification state preserved across tab switches  
> Toggle SMS for "New appointment booked" to OFF. Switch to Appearance tab. Switch back.  
> Expected: SMS toggle still OFF (state preserved in `notifs` useState).

### SUG-SET-PLAN-005 — Add TC: Only One Accent Color Selected

> **TC-SET-24** — Single accent color selection at a time  
> Click each of the 7 accent colors in sequence.  
> Expected: Only the last clicked color has the ring/shadow. Previous selections deselected.

### SUG-SET-PLAN-006 — Add TC: Font Size Slider Boundary Values

> **TC-SET-25** — Font size slider min/max  
> Drag to SM (0): "Aa" text at 12px. Drag to XL (3): "Aa" at 18px.  
> Verify slider cannot go below 0 or above 3 (MUI Slider min/max).

### SUG-SET-PLAN-007 — Add TC: 2FA Switch Uncontrolled State

> **TC-SET-26** — 2FA switch is uncontrolled  
> Toggle 2FA switch ON. Switch to Profile tab. Switch back.  
> Expected (current behavior): 2FA switch reverts to OFF (no React state backing it).  
> This documents Bug OBS-2: switch uses browser-internal state only.

### SUG-SET-PLAN-008 — Add TC: Clinic Fields Use defaultValue (Uncontrolled)

> **TC-SET-27** — Clinic form values not captured by React  
> Change Clinic Name from "MediCare Clinic" to "Test Clinic". Click Save Clinic Settings.  
> Navigate away. Return to Clinic tab.  
> Expected: "MediCare Clinic" shows again (defaultValue resets, not controlled state).

### SUG-SET-PLAN-009 — Add TC: Bio Field No Character Limit

> **TC-SET-28** — Bio textarea accepts unlimited input (Edge Case E2)  
> Paste 1000 characters of text in Bio / About textarea.  
> Expected: All 1000 characters accepted. No max-length truncation.  
> Source line 141: `<TextField multiline rows={3}>` — no `inputProps={{ maxLength }}`.

### SUG-SET-PLAN-010 — Add TC: Tab Keyboard Navigation

> **TC-SET-29** — Keyboard navigation between tabs  
> Press Tab key to focus the tab bar. Use left/right arrow keys to navigate tabs.  
> Expected: Standard MUI Tabs keyboard navigation (ArrowLeft/ArrowRight cycles through tabs).

---

## Summary Table

| ID | Suggestion | Category | Priority |
|----|-----------|----------|----------|
| SUG-SET-001 | Wire camera icon to file upload | 🐛 Bug Fix | 🔴 High |
| SUG-SET-002 | Add password validation to Update Password | 🐛 Bug Fix | 🔴 High |
| SUG-SET-003 | Wire Revoke session buttons | 🐛 Bug Fix | 🔴 High |
| SUG-SET-004 | Add confirm dialog to Deactivate Account | 🐛 Bug Fix | 🔴 High |
| SUG-SET-005 | Connect theme to ThemeContext | 🐛 Bug Fix | 🔴 High |
| SUG-SET-006 | Connect Compact/RTL to layout | 🐛 Bug Fix | 🔴 High |
| SUG-SET-007 | Convert clinic/gender/DOB to controlled | 🐛 Data Loss | 🟡 Medium |
| SUG-SET-008 | Wire 2FA to controlled state | 🐛 Data Loss | 🟡 Medium |
| SUG-SET-009 | Persist notifications to backend | 🔗 Integration | 🟡 Medium |
| SUG-SET-010 | Per-tab success alert messages | ✨ UX | 🟡 Medium |
| SUG-SET-011 | Unsaved changes indicator | ✨ UX | 🟢 Low |
| SUG-SET-012 | File size validation for photo | 🛡 Validation | 🟢 Low |

### Quick Wins (< 5 min):
- **SUG-SET-008**: Add `checked={twoFa} onChange={...}` to 2FA Switch (3 lines)
- **SUG-SET-003**: Add `onClick={() => handleRevoke(s.id)}` to Revoke buttons (1 line per button)
