# Patient Profile — Test Suggestions

**Derived from:** [patient-profile-test-results.md](../test-result/patient-profile-test-results.md)  
**Source File:** `frontend/src/pages/patient/Profile.jsx`  
**Date:** 2026-03-17

---

## 🔴 High Priority — Bug Fixes

### SUG-PTPROF-001 — Implement "+ Add" for Allergies/Conditions (TC-PTPROF-09)

**Problem:** "+ Add" chip has no `onClick`. Clicking it does nothing. The `cursor: 'pointer'` style false-advertises interactivity — creates user confusion.

**Fix — Add inline chip input or dialog:**
```jsx
const [newAllergy, setNewAllergy] = useState('');
const [showAllergyInput, setShowAllergyInput] = useState(false);

const handleAddAllergy = () => {
  if (newAllergy.trim()) {
    setDraft({ ...draft, allergies: [...draft.allergies, newAllergy.trim()] });
    setNewAllergy('');
    setShowAllergyInput(false);
  }
};

// Replace static "+ Add" chip with:
{editing && (showAllergyInput ? (
  <Stack direction="row" gap={0.5}>
    <TextField size="small" value={newAllergy} onChange={(e) => setNewAllergy(e.target.value)}
      placeholder="e.g. Peanuts" onKeyDown={(e) => e.key === 'Enter' && handleAddAllergy()} />
    <IconButton size="small" onClick={handleAddAllergy}><AddIcon /></IconButton>
  </Stack>
) : (
  <Chip label="+ Add" size="small" variant="outlined" sx={{ cursor: 'pointer' }}
    onClick={() => setShowAllergyInput(true)} />
))}
```

**Priority:** 🔴 High | **Effort:** ~20 lines

---

### SUG-PTPROF-002 — Add Null Guard for Avatar Initials (E1 / OBS-2)

**Problem:** Line 69: `{profile.firstName[0]}{profile.lastName[0]}` — if `firstName` is empty string or undefined, this renders `undefined` or an empty avatar.

**Fix:**
```jsx
<Avatar ...>
  {(profile.firstName?.[0] ?? '?')}{(profile.lastName?.[0] ?? '')}
</Avatar>
```

Also protect the left column name display:
```jsx
<Typography fontWeight={700}>
  {profile.firstName || profile.lastName ? `${profile.firstName} ${profile.lastName}`.trim() : 'Unknown Patient'}
</Typography>
```

**Priority:** 🔴 High | **Effort:** 2 lines

---

### SUG-PTPROF-003 — Make Insurance Fields Editable in Edit Mode (E5)

**Problem:** Insurance Provider, Policy Number, Expires are always static `<Typography>` — not editable even in edit mode. Patient cannot update insurance details.

**Fix — Add insurance to draft state and use field() helper:**
```jsx
// In INITIAL (already nested under insurance):
insurance: { provider: 'Bupa Health', policyNo: 'BP-2026-44812', expires: '2027-01-01' }

// Create insuranceField helper:
const insuranceField = (label, key) => (
  <Box>
    <Typography variant="caption" color="text.secondary">{label}</Typography>
    {editing
      ? <TextField fullWidth size="small" value={draft.insurance[key]}
          onChange={(e) => setDraft({ ...draft, insurance: { ...draft.insurance, [key]: e.target.value } })} />
      : <Typography fontWeight={600}>{profile.insurance[key]}</Typography>
    }
  </Box>
);
```

**Priority:** 🔴 High | **Effort:** ~12 lines

---

### SUG-PTPROF-004 — Connect Profile to Auth Context (OBS-1)

**Problem:** Topbar shows "Alice Thompson" (auth user; `useAuth()`) but profile page shows "Emma Wilson" (mock INITIAL data). These are disconnected — a real patient logs in as "Alice Thompson" but sees someone else's data.

**Fix:** The profile INITIAL data should be derived from the auth user's actual data (via `GET_MY_PROFILE` query or using the auth context):
```jsx
const { user } = useAuth();

const INITIAL = {
  firstName: user?.name?.split(' ')[0] ?? 'Emma',
  lastName: user?.name?.split(' ').slice(1).join(' ') ?? 'Wilson',
  email: user?.email ?? 'emma.wilson@email.com',
  // ... rest from Apollo query
};
```

**Priority:** 🔴 High | **Effort:** ~10 lines

---

### SUG-PTPROF-005 — Add Allergy/Condition Delete Button in Edit Mode

**Problem:** Users can see their allergies/conditions and (once fixed) add new ones, but cannot remove existing ones. No delete/X button on chips in edit mode.

**Fix:**
```jsx
{profile.allergies.map((a) => (
  <Chip
    key={a} label={a} size="small" color="error" variant="outlined"
    onDelete={editing ? () => setDraft({ ...draft, allergies: draft.allergies.filter(x => x !== a) }) : undefined}
  />
))}
```

**Priority:** 🔴 High | **Effort:** ~5 lines

---

## 🟡 Medium Priority — UX Improvements

### SUG-PTPROF-006 — Make Avatar Health Fields Editable (OBS-3)

**Problem:** Blood Type, DOB, and Gender in the left avatar card are always read-only `<Typography>` values — not included in the `field()` helper.

**Fix:** Add Blood Type, Gender to the Personal Information grid, or add them as editable fields in the avatar card using the `field()` helper when in edit mode.

**Priority:** 🟡 Medium

---

### SUG-PTPROF-007 — Add Apollo Query Fallback for Real Profile Data

**Problem:** Profile uses hardcoded `INITIAL` constant. A production patient would need their actual data fetched (name, email, allergies, conditions, insurance) from backend.

**Suggested query:**
```graphql
query GetPatientProfile($userId: ID!) {
  getPatientProfile(userId: $userId) {
    firstName lastName email phone dob gender bloodType address
    allergies conditions
    insurance { provider policyNo expires }
    notifications { email sms reminders newsletter }
  }
}
```

**Priority:** 🟡 Medium (production requirement)

---

### SUG-PTPROF-008 — Add Page Title via Helmet (OBS-5)

**Problem:** No `<Helmet>` tag — browser tab shows generic title.

**Fix:**
```jsx
import { Helmet } from 'react-helmet-async';
<Helmet><title>My Profile — MediBook</title></Helmet>
```

**Priority:** 🟢 Low | **Effort:** 3 lines

---

### SUG-PTPROF-009 — Remove Unused PatientAvatar Import (OBS-4)

**Problem:** `PatientAvatar` imported from `../../components/shared` (line 6) but never used. Dead import.

**Fix:** Remove line 6 import.

**Priority:** 🟢 Low | **Effort:** 1 line

---

### SUG-PTPROF-010 — Add Unsaved Changes Guard on Navigation

**Problem:** If the user is in edit mode and navigates to another page (e.g., clicks Dashboard in sidebar), unsaved form changes are silently lost. No warning dialog.

**Fix:**
```jsx
import { useBeforeUnload } from 'react-router-dom';
useBeforeUnload(React.useCallback((event) => {
  if (editing) event.preventDefault();
}, [editing]));
```

**Priority:** 🟡 Medium | **Effort:** ~5 lines

---

## Additional Test Cases

### SUG-PTPROF-PLAN-001 — TC: Avatar Initials After Clearing First Name

> **TC-PTPROF-14** — Clear First Name + Save crashes avatar (Edge Case E1)  
> In edit mode, clear "First Name" field. Click Save.  
> Expected (bug): Avatar shows "undefinedW" or empty — no null guard (line 69).  
> Expected (after SUG-002 fix): Avatar shows "?W".

### SUG-PTPROF-PLAN-002 — TC: Delete Existing Allergy

> **TC-PTPROF-15** — Remove allergy chip in edit mode  
> After SUG-005 fix: In edit mode, click ✕ on "Penicillin" chip.  
> Expected: Penicillin removed from list; only "Latex" chip remains.  
> Save → view mode shows only "Latex".

### SUG-PTPROF-PLAN-003 — TC: Add New Allergy

> **TC-PTPROF-16** — Add allergy via "+ Add" chip  
> After SUG-001 fix: Click "+ Add" → type "Peanuts" → press Enter.  
> Expected: "Peanuts" chip appears alongside Penicillin and Latex.  
> Save → view mode shows 3 allergy chips.

### SUG-PTPROF-PLAN-004 — TC: Edit Mode + Navigate Away (Unsaved Warning)

> **TC-PTPROF-17** — Leaving page with unsaved changes  
> In edit mode with changes made, click Dashboard in sidebar.  
> Expected (after SUG-010): Browser "Leave page?" dialog shown.  
> Current behavior: Navigate away silently; changes lost.

### SUG-PTPROF-PLAN-005 — TC: All Notifications OFF + View Mode

> **TC-PTPROF-18** — Save all notifications as OFF  
> Turn off Email, SMS, Reminders, Newsletter switches. Save.  
> Expected: All 4 switches shown as OFF (disabled) in view mode.  
> This edge case (E4) is LIVE-TESTED and confirmed PASS.

### SUG-PTPROF-PLAN-006 — TC: Insurance Fields Not Editable (Bug Repro)

> **TC-PTPROF-19** — Insurance fields always read-only  
> Click "Edit Profile". Attempt to click/edit Provider, Policy Number, Expires.  
> Expected (bug): Fields remain static `<Typography>` — no TextFields.  
> Confirm: Edit mode does not enable insurance editing (E5).

### SUG-PTPROF-PLAN-007 — TC: Discard Preserves Previous Save

> **TC-PTPROF-20** — Discard resets to last SAVED value (not INITIAL)  
> Save profile with name "Emily". Enter edit mode. Change to "Testing". Discard.  
> Expected: Name shows "Emily" (last saved) not "Emma" (original INITIAL).  
> Source: `setDraft(profile)` where `profile` = last `setProfile(draft)` call.

---

## Summary Table

| ID | Suggestion | Category | Priority |
|----|-----------|----------|----------|
| SUG-PTPROF-001 | Wire "+ Add" chip with input | 🐛 Bug Fix | 🔴 High |
| SUG-PTPROF-002 | Null guard for avatar initials | 🛡 Guard | 🔴 High |
| SUG-PTPROF-003 | Make insurance fields editable | 🐛 Enhancement | 🔴 High |
| SUG-PTPROF-004 | Connect to auth context | 🔗 Data | 🔴 High |
| SUG-PTPROF-005 | Delete allergy/condition chips | 🐛 Enhancement | 🔴 High |
| SUG-PTPROF-006 | Make avatar health fields editable | ✨ UX | 🟡 Medium |
| SUG-PTPROF-007 | Apollo query for real data | 🔗 Integration | 🟡 Medium |
| SUG-PTPROF-008 | Page title via Helmet | ✨ SEO | 🟢 Low |
| SUG-PTPROF-009 | Remove unused PatientAvatar import | 🧹 Cleanup | 🟢 Low |
| SUG-PTPROF-010 | Unsaved changes guard | ✨ UX | 🟡 Medium |

### Quick Wins (1–2 lines):
- **SUG-PTPROF-002**: `profile.firstName?.[0] ?? '?'` null guard (1 line)
- **SUG-PTPROF-009**: Remove unused import (1 line)
- **SUG-PTPROF-008**: Add `<Helmet><title>` (3 lines)
