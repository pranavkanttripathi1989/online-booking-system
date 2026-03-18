# Clinicians — Test Plan

**Feature area:** `/src/pages/clinicians/`  
**Files:** `index.jsx`, `detail.jsx`, `CreateClinicianPage.jsx`, `EditClinicianPage.jsx`  
**Routes tested:** `/clinicians`, `/clinicians/:id`, `/clinicians/new`, `/clinicians/:id/edit`  
**Access:** Admin, Super Admin, Manager, Receptionist  
**Mock data:** MockStore clinicians + mock fallback in index.jsx

---

## 1. Clinicians List Page (`/clinicians`)

### TC-CLIN-001 — List renders clinicians from mock data
**Prompt:**  
> Log in as Admin. Navigate to `http://localhost:3001/clinicians`.  
> Assert: a grid or table of clinicians renders. Each card/row shows: name, specialization, clinic, status, rating.

**Expected:** At least 8–10 mock clinicians visible. No blank page.

---

### TC-CLIN-002 — Search by clinician name
**Prompt:**  
> On `/clinicians`, type "Mitchell" in the search bar.  
> Assert: only "Dr. Sarah Mitchell" (or matching clinicians) visible. Others hidden.

**Expected:** Name/specialization search filter applied.

---

### TC-CLIN-003 — Filter by specialization
**Prompt:**  
> Open the Specialization filter dropdown (if present). Select "Cardiologist".  
> Assert: only cardiologist clinicians shown.

**Expected:** Specialization filter applied to mock data.

---

### TC-CLIN-004 — Filter by availability status
**Prompt:**  
> Filter by status "Available Today".  
> Assert: only clinicians with availability today are shown. Unavailable clinicians hidden.

**Expected:** Availability filter logic applied.

---

### TC-CLIN-005 — Click clinician card navigates to detail
**Prompt:**  
> Click on "Dr. Sarah Mitchell" card or row.  
> Assert: navigated to `/clinicians/{id}`. Detail page shows Dr. Mitchell's profile.

**Expected:** `navigate('/clinicians/' + id)` fires.

---

## 2. Clinician Detail Page (`/clinicians/:id`)

### TC-CLIN-006 — Profile displays all sections
**Prompt:**  
> Navigate to `/clinicians/clin-1` (or first mock clinician ID).  
> Assert: visible sections: Profile header (name, specialization, rating), Availability schedule, Associated clinics, Reviews/ratings, Appointment history.

**Expected:** Full detail page renders. All sections populated or show "No data" gracefully.

---

### TC-CLIN-007 — Availability schedule shows correct days
**Prompt:**  
> On clinician detail, observe the availability/schedule section.  
> Assert: days of the week with time slots shown (e.g., Mon 9am–5pm). Days off show "Unavailable".

**Expected:** Schedule data rendered from clinician's availability records.

---

## 3. Create Clinician (`/clinicians/new`)

### TC-CLIN-008 — Form renders all sections
**Prompt:**  
> Navigate to `/clinicians/new` (or click the Add Clinician button on list page).  
> Assert: form shows sections: Personal Info (name, email, phone), Professional Info (specialization, license, years of experience), Availability settings.

**Expected:** Multi-section form renders. All required fields marked with *.

---

### TC-CLIN-009 — Email validation
**Prompt:**  
> On Create Clinician form, enter "notanemail" in Email. Click Save.  
> Assert: "Invalid email format" error on Email field.

**Expected:** Validation catches bad email format.

---

### TC-CLIN-010 — Successful clinician creation
**Prompt:**  
> Fill all required fields: Name "Dr. Test Doe", Specialization "General Practitioner", Email "dr.doe@clinic.com", Phone "+1 555-0200", License "LIC-12345". Click Create.  
> Assert: success snackbar. Redirect to clinicians list or new clinician detail.

**Expected:** Mutation fires or mock succeeds. Snackbar green. Navigation fires.

---

## 4. Edit Clinician (`/clinicians/:id/edit`)

### TC-CLIN-011 — Edit form pre-fills data
**Prompt:**  
> Navigate to `/clinicians/clin-1/edit`.  
> Assert: all fields pre-filled with existing clinician data.

**Expected:** Form populates from existing clinician record.

---

### TC-CLIN-012 — Save updated specialization
**Prompt:**  
> Change Specialization to "Pediatrics". Click Save.  
> Assert: success snackbar. Detail page shows "Pediatrics".

**Expected:** UPDATE_CLINICIAN_MUTATION fires. Detail page updated.

---

## 5. Clinician Portal (`/clinician/*`)

### TC-CLIN-013 — Clinician portal dashboard (clinician role)
**Prompt:**  
> Log in as Clinician (`clinician@medibook.dev`). Assert: redirected to `/clinician/dashboard`.  
> Observe: KPI cards (Today's Appointments, Patients Seen, Total Revenue), appointment list for today.

**Expected:** Clinician-specific dashboard renders. No admin/manager sections accessible.

---

### TC-CLIN-014 — Clinician can view their calendar
**Prompt:**  
> Log in as Clinician. Navigate to `/clinician/calendar`.  
> Assert: calendar shows only this clinician's appointments. Other clinicians' appointments not visible.

**Expected:** Calendar filtered to logged-in clinician's data.

---

### TC-CLIN-015 — Clinician can update availability
**Prompt:**  
> Log in as Clinician. Navigate to `/clinician/availability`.  
> Assert: weekly availability form shows. Clinician can check/uncheck days and set time slots. Click Save.  
> Assert: success snackbar.

**Expected:** Availability form renders. Save triggers mutation/mock update.
