# Patient Dashboard — Test Suggestions (Session QA v2.0)

**Module:** Patient Portal — Dashboard
**Updated:** 2026-03-31 (Session QA)

---

## 🔴 High Priority — Completed (Session)

### SUG-PTDASH-001 — Register /booking/search Route
```
Status: COMPLETED
Notes: <Route path="/booking/search" element={<Navigate to="/appointments/book" replace />} />
       Added in App.jsx. Fixes all "Book Appointment" + "Find a Doctor" CTAs.
Files: App.jsx
```

### SUG-PTDASH-002 — Register /clinician/:id Route
```
Status: COMPLETED (Remapped)
Notes: "Your Doctors" Book button now navigates to /appointments/book?clinician=:id
       instead of unregistered /clinician/:id. Avoids 404 without new page.
Files: Dashboard.jsx
```

### SUG-PTDASH-003 — Reschedule and Cancel Handlers
```
Status: COMPLETED
Notes: handleReschedule(id) → navigate('/patient/appointments?reschedule=:id')
       Cancel: setCancelId → Dialog → handleCancelConfirm (logs in mock mode)
       aria-labels added to all action buttons.
Files: Dashboard.jsx
```

### SUG-PTDASH-004 — Mock Data Fallback for Offline Testing
```
Status: COMPLETED
Notes: MOCK_UPCOMING (2 appts), MOCK_NOTIFICATIONS (2), MOCK_KPIS (12/9/2/1)
       All 5 previously SKIPPED TCs now PASS.
Files: Dashboard.jsx
```

---

## 🟡 Medium Priority — Completed (Session)

### SUG-PTDASH-005 — Loading Skeleton
```
Status: COMPLETED
Notes: Loading state shows welcome banner + 4 Skeleton cards + 1 main skeleton.
Files: Dashboard.jsx
```

### SUG-PTDASH-006 — Dynamic Greeting
```
Status: COMPLETED
Notes: getGreeting(): <12→morning, <18→afternoon, else→evening
Files: Dashboard.jsx
```

### SUG-PTDASH-007 — Client-Side Notification Limit
```
Status: COMPLETED
Notes: notifications.slice(0, 5).map(...) — divider logic updated.
Files: Dashboard.jsx
```

### SUG-PTDASH-008 — Apollo Error Alert
```
Status: COMPLETED
Notes: {error && <Alert severity="warning">...</Alert>} between banner and KPI grid.
Files: Dashboard.jsx
```

### SUG-PTDASH-010 — View all Links in Sidebar Cards
```
Status: COMPLETED
Notes: Doctors header "View all" → /patient/appointments. Activity "View all" → /notifications.
Files: Dashboard.jsx
```

---

## 🟢 Low Priority — Pending

### SUG-PTDASH-009 — Email Hash for Gravatar
```
Status: PENDING
Notes: user.id used as Gravatar hash — incorrect (needs md5 of email).
       Low impact: default silhouette avatar shown regardless.
Priority: Low
```

---

## New Suggestions Discovered

### SUG-PTDASH-011 — Reschedule Query Param UI in Appointments
```
Status: DONE
Notes: Appointments.jsx now reads the `reschedule` search param on mount (useSearchParams),
       looks up the matching appointment, opens the new RescheduleDialog pre-filled with
       its current date/time, highlights the card, and clears the param afterwards. Also
       added a standalone "Reschedule" button on each upcoming AppointmentCard (companion
       to SUG-PTAPPT-011) since the flow needed a dialog either way.
Files: Appointments.jsx
Priority: Medium
```

### SUG-PTDASH-012 — Optimistic Cancel in Mock Mode
```
Status: DONE
Notes: Dashboard.jsx: added cancelledIds Set state; handleCancelConfirm() adds the id
       instead of just console.log-ing, and upcomingAppointments filters out cancelled
       ids — the card disappears immediately in mock mode.
Files: Dashboard.jsx
Priority: Medium
```

### SUG-PTDASH-013 — Receipt Route Redirect
```
Status: COMPLETED
Notes: <Route path="/patient/appointments/:id/receipt" element={<Navigate to="/patient/appointments" replace />} />
       Added in App.jsx — keeps app from 404-ing until receipt page is built.
Files: App.jsx
```

---

## Summary Table

| ID | Description | Status |
|----|-------------|--------|
| SUG-PTDASH-001 | /booking/search redirect | ✅ COMPLETED |
| SUG-PTDASH-002 | /clinician/:id (Book button) | ✅ COMPLETED (remapped) |
| SUG-PTDASH-003 | Reschedule/Cancel handlers | ✅ COMPLETED |
| SUG-PTDASH-004 | Mock data fallback | ✅ COMPLETED |
| SUG-PTDASH-005 | Loading skeleton | ✅ COMPLETED |
| SUG-PTDASH-006 | Dynamic greeting | ✅ COMPLETED |
| SUG-PTDASH-007 | Notification client slice | ✅ COMPLETED |
| SUG-PTDASH-008 | Apollo error alert | ✅ COMPLETED |
| SUG-PTDASH-009 | Email hash for Gravatar | ⏳ PENDING (Low — out of scope) |
| SUG-PTDASH-010 | View all sidebar links | ✅ COMPLETED |
| SUG-PTDASH-011 | Reschedule param UI | ✅ DONE |
| SUG-PTDASH-012 | Optimistic cancel mock | ✅ DONE |
| SUG-PTDASH-013 | Receipt route redirect | ✅ COMPLETED |
