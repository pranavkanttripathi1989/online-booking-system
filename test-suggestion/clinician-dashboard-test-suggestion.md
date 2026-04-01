# Clinician Dashboard — Test Suggestions (Session 6 — 2026-03-30)

**Source File:** `frontend/src/pages/clinician/Dashboard.jsx`  
**Updated:** 2026-03-30 Session 6

> **Session 6: 3 new features added. Only backend-dependent items remain from original suggestions.**

---

## Summary Table

| ID | Suggestion | Category | Priority | Status |
|----|-----------|----------|----------|--------|
| SUG-CLDASH-001 | Wire Add Block → drawer with form | 🐛 Bug Fix | 🔴 High | ✅ DONE |
| SUG-CLDASH-002 | Wire timeline block click → detail drawer | 🐛 Bug Fix | 🔴 High | ✅ DONE |
| SUG-CLDASH-003 | Wire "View Notes" onClick | 🐛 Bug Fix | 🔴 High | ✅ DONE |
| SUG-CLDASH-004 | Mock appointment data for offline | 🧪 Test Infra | 🔴 High | ✅ DONE |
| SUG-CLDASH-005 | Fix "Dr. Doctor" fallback name | ✨ UX | 🟡 Medium | ✅ DONE |
| SUG-CLDASH-006 | Guard invalid startTime format | 🛡 Validation | 🟡 Medium | ✅ DONE |
| SUG-CLDASH-007 | Overlap detection for same-time blocks | ✨ UX | 🟡 Medium | ✅ DONE |
| SUG-CLDASH-008 | Current time line + auto-scroll | ✨ UX Polish | 🟢 Low | ✅ DONE |
| SUG-CLDASH-009 | Offline data indicator alert | ✨ UX | 🟢 Low | ✅ DONE |
| SUG-CLDASH-010 | "Last updated" timestamp | ✨ UX | 🟢 Low | ✅ DONE |
| SUG-CLDASH-011 | "Mark Complete" in detail drawer | ✨ UX | 🟡 Medium | ⏳ PENDING (backend mutation) |
| SUG-CLDASH-012 | Queue patient click → appointment preview | ✨ UX | 🟡 Medium | ✅ DONE |
| SUG-CLDASH-013 | Block form → createSpacerBlock mutation | 🔗 Integration | 🟡 Medium | ⏳ PENDING (backend) |
| SUG-CLDASH-014 | "Now h:mm A" chip on current time line | ✨ UX Polish | 🟢 Low | ✅ DONE (Session 5) |
| SUG-CLDASH-015 | Snackbar block message in 12h format | 🐛 Format | 🟢 Low | ✅ DONE (Session 4) |
| SUG-CLDASH-016 | Delete locally-added block from timeline | ✨ UX | 🟡 Medium | ✅ DONE (Session 5) |
| **NEW-CLDASH-017** | Real-time duration preview in Add Block drawer | ✨ UX | 🟡 Medium | ✅ DONE (Session 6) |
| **NEW-CLDASH-018** | Patient initials fallback avatar in detail drawer | ♿ A11y / UX | 🟢 Low | ✅ DONE (Session 6) |
| **NEW-CLDASH-019** | Today's completed/total progress bar under KPIs | ✨ UX | 🟡 Medium | ✅ DONE (Session 6) |

---

## Session 6 Implementation Notes

### NEW-CLDASH-017 — Duration Preview in Add Block Drawer

```jsx
{blockForm.startTime && blockForm.endTime && (() => {
  const [sh, sm] = blockForm.startTime.split(':').map(Number);
  const [eh, em] = blockForm.endTime.split(':').map(Number);
  const dur = (eh * 60 + em) - (sh * 60 + sm);
  if (dur <= 0) return null;
  return (
    <Box sx={{ mb: 2, px: 1.5, py: 0.75, bgcolor: '#E8F8F9', borderRadius: 2, ... }}>
      <AccessTime sx={{ fontSize: 14, color: STITCH_BRAND }} />
      <Typography>Duration: {dur >= 60 ? `${Math.floor(dur/60)}h ${dur%60 ? dur%60+'m' : ''}`.trim() : `${dur} mins`}</Typography>
    </Box>
  );
})()}
```

---

### NEW-CLDASH-018 — Patient Initials Fallback

```jsx
<Avatar src={`...?d=404`} onError={(e) => { e.currentTarget.style.display='none'; }}
  sx={{ ..., position: 'relative' }} />
<Avatar sx={{ ..., bgcolor: getStatusColor(status), position: 'absolute', zIndex: -1 }}>
  {`${firstName[0]}${lastName[0]}`.toUpperCase()}
</Avatar>
```

---

### NEW-CLDASH-019 — Progress Bar

```jsx
<Box sx={{ height: 6, bgcolor: '#E8F8F9', borderRadius: 3, overflow: 'hidden' }}>
  <Box sx={{ width: `${Math.min(100, (completedApps.length/allAppointments.length)*100)}%`,
    height: '100%', bgcolor: '#10B981', transition: 'width 0.4s ease' }} />
</Box>
```

---

## Remaining (Backend-Dependent Only)

| Item | Requires |
|------|---------|
| SUG-CLDASH-011 — Mark Complete | `markAppointmentComplete()` mutation |
| SUG-CLDASH-013 — createSpacerBlock | Backend endpoint + mutation |
