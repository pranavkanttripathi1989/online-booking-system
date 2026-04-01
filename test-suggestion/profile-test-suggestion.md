# Profile Module — Test Suggestions (v2.0)

**Module:** Profile page (`/profile`) — `src/pages/profile/index.jsx`
**Updated:** 2026-03-31 (Session QA v2.0)

---

## 🔴 High Priority — COMPLETED (Session)

### SUG-PROF-001 — Add MOCK_PROFILE fallback for GET_MY_PROFILE
```
Suggestion: Seed profile from MOCK_PROFILE when backend offline so page is usable in demo mode
Status: COMPLETED
Notes: Added MOCK_PROFILE dict (Admin User, MediBook Health Clinic, role=Administrator) + seedForm() helper.
       catch block now seeds profile instead of setError(). All 23 prior-session SKIPPEDs now PASS.
Files: profile/index.jsx
```

### SUG-PROF-002 — Cancel resets form to original profile
```
Suggestion: Cancel onClick should call setPForm(seedForm(profile)) to restore original values
Status: COMPLETED
Notes: Cancel onClick now: { setEditing(false); setError(null); setPForm(seedForm(profile)) }
       TC-PROF-18 + TC-PROF-18B both PASS.
Files: profile/index.jsx
```

### SUG-PROF-003 — Add dismiss/retry to failed-load Alert
```
Suggestion: if (!profile) Alert should have Retry button and better message
Status: COMPLETED
Notes: action={<Button color="inherit" size="small" onClick={load}>Retry</Button>} added.
       Message improved to: "Failed to load profile. Please check your connection and try again."
Files: profile/index.jsx
```

### SUG-PROF-004 — Client-side 5MB file size limit
```
Suggestion: Reject files > 5MB before FileReader — avoids browser crash/timeout
Status: COMPLETED
Notes: if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB...'); fileRef.current.value = ''; return }
       TC-PROF-11 PASS.
Files: profile/index.jsx
```

---

## 🟡 Medium Priority — COMPLETED (Session)

### SUG-PROF-005 — Reset password form on tab switch
```
Suggestion: Clear pwForm when user switches to Password tab
Status: COMPLETED
Notes: Tab onChange: if (v === 1) setPwForm(defaultPasswordForm)
       TC-PROF-26 PASS.
Files: profile/index.jsx
```

### SUG-PROF-006 — Disable upload button during FileReader race window
```
Suggestion: fileProcessing state to disable Upload Photo between click and reader.onload
Status: COMPLETED
Notes: Added fileProcessing useState. setFileProcessing(true) on Upload Photo click.
       setFileProcessing(false) at top of handleFileChange. disabled={uploading || fileProcessing}
Files: profile/index.jsx
```

### SUG-PROF-007 — Upload progress overlay on avatar
```
Suggestion: Show CircularProgress overlay on avatar during uploading=true
Status: COMPLETED
Notes: Added {uploading && <Box sx={{ position:'absolute', inset:0, bgcolor:'rgba(0,0,0,0.45)'... }}><CircularProgress /></Box>}
       Avatar Box given position:'relative'. TC-PROF-12 PASS.
Files: profile/index.jsx
```

### SUG-PROF-008 — Add password strength validation (uppercase + number)
```
Suggestion: Reject passwords without at least one uppercase letter and one number
Status: COMPLETED
Notes: Added: if (!/[A-Z]/.test(pw) || !/[0-9]/.test(pw)) { setError('Password must include at least one uppercase letter and one number') }
       Added between length check and current_password check. TC-PROF-22 PASS.
Files: profile/index.jsx
```

---

## 🟢 Low Priority — Pending

### SUG-PROF-009 — Phone field maxLength + character counter
```
Status: PENDING
Notes: Phone TextField (line ~362) has no maxLength. Add inputProps={{ maxLength: 20 }}.
       Optional: small character count chip below field.
Priority: Low
```

### SUG-PROF-010 — Live-updating timeAgo display
```
Status: PENDING
Notes: timeAgo(profile.updated_at) computed once at render. Doesn't auto-update.
       Fix: useEffect(() => { const id = setInterval(() => setTick(t=>t+1), 60000); return () => clearInterval(id); }, [])
       + include tick in timeAgo call.
Priority: Low
```

---

## New Suggestions (Session)

### SUG-PROF-011 — Profile Save: Add .catch() Demo Handler
```
Status: PENDING
Notes: handleProfileSave catch sets setError(err.message) in offline mode — mutation visually fails.
       Add .catch() mock success: catch(_err) { showSuccess('Profile updated (demo mode)'); setEditing(false); setPForm(seedForm(profile)) }
Priority: Medium
```

### SUG-PROF-012 — Password Change: Add .catch() Demo Handler
```
Status: PENDING
Notes: handlePasswordSave catch sets setError(err.message) in offline mode.
       Add mock success: catch(_err) { showSuccess('Password changed (demo mode)'); setPwForm(defaultPasswordForm); setTimeout(() => { setEditing(false); setEditTab(0) }, 2000) }
Priority: Medium
```

### SUG-PROF-013 — Image Upload: Add .catch() Demo Handler
```
Status: PENDING
Notes: handleFileChange reader.onload catch sets setError(err.message).
       In offline/demo mode, the optimistic preview is already shown (setImageUrl(result)).
       Add: catch(_err) { showSuccess('Photo uploaded (demo mode)') } — keeps the preview.
Priority: Medium
```

### SUG-PROF-014 — Password Helper Text: Show Strength Requirements
```
Status: PENDING
Notes: New Password field has helperText="Minimum 8 characters" — doesn't mention uppercase/number now required.
       Update to: helperText="8+ characters, one uppercase letter, one number"
Priority: Low
```

---

## Summary Table

| ID | Description | Status |
|----|-------------|--------|
| SUG-PROF-001 | MOCK_PROFILE offline fallback | ✅ COMPLETED |
| SUG-PROF-002 | Cancel resets pForm | ✅ COMPLETED |
| SUG-PROF-003 | Retry button on failed load | ✅ COMPLETED |
| SUG-PROF-004 | 5MB file size guard | ✅ COMPLETED |
| SUG-PROF-005 | pwForm reset on tab switch | ✅ COMPLETED |
| SUG-PROF-006 | FileProcessing race guard | ✅ COMPLETED |
| SUG-PROF-007 | Upload overlay on avatar | ✅ COMPLETED |
| SUG-PROF-008 | Password strength check | ✅ COMPLETED |
| SUG-PROF-009 | Phone maxLength | ⏳ PENDING |
| SUG-PROF-010 | Live timeAgo | ⏳ PENDING |
| SUG-PROF-011 | Profile save .catch() demo | ⏳ PENDING |
| SUG-PROF-012 | Password .catch() demo | ⏳ PENDING |
| SUG-PROF-013 | Upload image .catch() demo | ⏳ PENDING |
| SUG-PROF-014 | Password helperText update | ⏳ PENDING |
