---
id: TP005
type: test-plan
feature: booking-wizard
created: 2026-03-19
updated: 2026-03-19
status: approved
parent: unknown
related: []
---

# Booking Wizard — Test Plan

**Feature area:** `/src/pages/booking/index.jsx`, `/src/components/BookingWizard/`  
**Route tested:** `/booking`, `/appointments/new`  
**Mock data:** MockStore services, clinicians, clinics, slots  
**Access:** All roles (patients, staff creating on behalf of patients)

---

## 1. Multi-Step Wizard Navigation

### TC-BOOK-001 — Wizard starts on Step 1 (Service Selection)
**Prompt:**  
> Navigate to `http://localhost:3001/booking` or `/appointments/new`.  
> Assert: Step 1 is active in the stepper. "Select a Service" heading visible. Service cards/list shown.

**Expected:** `step = 0`. Stepper shows Step 1 highlighted. Service options from mock data rendered.

---

### TC-BOOK-002 — Cannot proceed without selecting service
**Prompt:**  
> On Step 1, click "Next" without selecting any service.  
> Assert: validation error or button is disabled. Step 2 does not load.

**Expected:** "Next" button disabled until a service card is selected.

---

### TC-BOOK-003 — Select service advances to Step 2 (Clinician)
**Prompt:**  
> Click on "GP Consultation" service card.  
> Assert: card gets selected (highlighted border). "Next" button becomes enabled. Click Next.  
> Assert: Step 2 loads with list of clinicians who offer GP Consultation.

**Expected:** `selectedService` set. Step advances to `step = 1`. Clinicians filtered by service.

---

### TC-BOOK-004 — Step 2 — Select clinician
**Prompt:**  
> On Step 2, click on "Dr. Sarah Mitchell" clinician card.  
> Assert: card highlighted. "Next" enabled. Click Next → Step 3 (Date & Time) loads.

**Expected:** `selectedClinician` set. Step advances to `step = 2`.

---

### TC-BOOK-005 — Step 3 — Select date
**Prompt:**  
> On Step 3, click on a date in the calendar picker (tomorrow or a future date).  
> Assert: date is highlighted/selected. Next week's available time slots load for that date.

**Expected:** `selectedDate` set. Time slots load filtered to selected date.

---

### TC-BOOK-006 — Step 3 — Select time slot
**Prompt:**  
> On Step 3, click on any available time slot (e.g., "10:00 AM").  
> Assert: slot highlighted. "Next" enabled. Unavailable/booked slots shown as greyed-out and unclickable.

**Expected:** `selectedSlot` set. Disabled slots cannot be clicked.

---

### TC-BOOK-007 — Step 4 — Confirmation summary
**Prompt:**  
> Complete Steps 1–3. On Step 4, verify the booking summary.  
> Assert: visible: Service name, Clinician name & specialization, Date, Time, Clinic/location, Patient name. "Confirm Booking" button present.

**Expected:** Summary card populated with all `selected*` state values. No blank fields.

---

### TC-BOOK-008 — Back button returns to previous step without losing data
**Prompt:**  
> On Step 3, click "Back".  
> Assert: Step 2 loads. Previously selected clinician is still highlighted.

**Expected:** `step` decremented. `selectedClinician` state preserved. Card still shows selected state.

---

### TC-BOOK-009 — Confirm booking creates appointment
**Prompt:**  
> On Step 4, click "Confirm Booking".  
> Assert: loading spinner shown. Then: success confirmation screen with appointment reference number. "View Appointment" button visible.

**Expected:** CREATE_APPOINTMENT_MUTATION fires (or mock completes). Confirmation state shown.

---

### TC-BOOK-010 — Booking for a specific patient (staff mode)
**Prompt:**  
> Log in as Receptionist. Go to `/appointments/new`.  
> Assert: a patient search field visible at top ("Booking for patient"). Type "Alice" — select Alice Johnson. Complete wizard steps.  
> Assert: booking created under Alice Johnson's name.

**Expected:** Patient selection present in staff mode. `patientId` included in mutation variables.

---

## 2. Clinic Selection

### TC-BOOK-011 — Clinic filter on Step 2 or 3
**Prompt:**  
> On the clinician selection step (Step 2), filter by clinic "Meridian Central".  
> Assert: only clinicians at Meridian Central clinic shown.

**Expected:** Clinic filter applies to clinician list.

---

### TC-BOOK-012 — Video appointment toggle
**Prompt:**  
> On Step 1 or 2, toggle "Video Consultation" option if available.  
> Assert: clinician list updates to show only those offering video consultations. Time slots reflect video appointment duration.

**Expected:** Appointment type (`in_person` vs `video`) toggle changes filtered results.

---

## 3. Edge Cases

### TC-BOOK-013 — No available slots shows message
**Prompt:**  
> Select a clinician and navigate to Step 3. Select a date with no available slots (weekend or past date).  
> Assert: "No available slots for this date" message shown. No time slot buttons rendered.

**Expected:** Empty state message rendered. User prompted to try another date.

---

### TC-BOOK-014 — Booking confirmation email info
**Prompt:**  
> After successful booking (Step 4 confirmed), observe the confirmation screen.  
> Assert: message "A confirmation email has been sent to {patient email}" shown.

**Expected:** Post-booking confirmation shows email notification info.
