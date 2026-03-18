# Manager — Test Plan

**Feature area:** `/src/pages/manager/`  
**Files:** `clinics/`, `rooms/`, `services/`, `products/`, `Availability.jsx`, `Blocks.jsx`, `Billing.jsx`  
**Routes tested:** `/manager/clinics`, `/manager/rooms`, `/manager/services`, `/manager/products`, `/manager/availability`, `/manager/blocks`, `/manager/billing`  
**Access:** Admin, Super Admin, Manager roles

---

## Clinics (`/manager/clinics`)

### TC-MGR-001 — Clinic list renders
**Prompt:**  
> Log in as Manager. Navigate to `http://localhost:3001/manager/clinics`.  
> Assert: list/cards of clinics visible with Name, Address, Phone, Active status.

**Expected:** Mock clinic data renders. Create Clinic button visible.

---

### TC-MGR-002 — Create new clinic
**Prompt:**  
> Click "New Clinic". Fill Name "Test Clinic", Address "123 Test St", Phone "+1 555-0000". Click Save.  
> Assert: success snackbar. New clinic appears in list.

**Expected:** CREATE_CLINIC form validates and submits. Clinic added to list.

---

### TC-MGR-003 — Edit clinic
**Prompt:**  
> Click edit on an existing clinic. Change the name. Click Save.  
> Assert: success snackbar. Updated name shows in list.

**Expected:** Edit form pre-fills. EDIT_CLINIC fires. List updates.

---

### TC-MGR-004 — Clinic detail page shows rooms and clinicians
**Prompt:**  
> Click on a clinic from the list.  
> Assert: detail page shows clinic info + list of associated rooms + list of assigned clinicians.

**Expected:** Detail page renders all sections with correct data.

---

## Rooms (`/manager/rooms`)

### TC-MGR-005 — Room list for a clinic
**Prompt:**  
> Navigate to `/manager/rooms`.  
> Assert: rooms table shows Name, Clinic, Type, Capacity, Status.

**Expected:** Mock room data visible.

---

### TC-MGR-006 — Create room with type selection
**Prompt:**  
> Click "New Room". Fill Name "Room 101", select Type "Consultation", Capacity "2", assign Clinic. Click Save.  
> Assert: success. Room appears in list.

**Expected:** Form validates. Room type from ROOM_TYPES list.

---

## Services (`/manager/services`)

### TC-MGR-007 — Services list renders
**Prompt:**  
> Navigate to `/manager/services`.  
> Assert: cards/table of services: GP Consultation, Blood Test, X-Ray, etc. with duration and price.

**Expected:** Mock service data renders. Price formatted as currency.

---

### TC-MGR-008 — Create service with duration and price
**Prompt:**  
> Click "New Service". Fill Name "Dermatology Consult", Duration "45 min", Price "$150". Click Save.  
> Assert: success snackbar. New service in list.

**Expected:** Service form validates. CREATE_SERVICE fires.

---

### TC-MGR-009 — Edit service price
**Prompt:**  
> Click edit on "GP Consultation". Change Price from "$100" to "$120". Save.  
> Assert: price updated in list.

**Expected:** EDIT_SERVICE fires with new price. List reflects update.

---

## Availability (`/manager/availability`)

### TC-MGR-010 — Availability schedule UI renders
**Prompt:**  
> Navigate to `/manager/availability`.  
> Assert: weekly schedule form shows days Mon–Sun with toggle and time slot inputs.

**Expected:** Availability form renders. Existing schedule pre-filled.

---

### TC-MGR-011 — Toggle a day on/off
**Prompt:**  
> Click the toggle for "Saturday" to enable it. Set time 09:00 – 13:00. Click Save.  
> Assert: Saturday slot added to schedule. Success snackbar.

**Expected:** Day toggle state changes. Time fields appear. Save updates schedule.

---

## Blocks (`/manager/blocks`)

### TC-MGR-012 — Create a block (unavailability window)
**Prompt:**  
> Navigate to `/manager/blocks`. Click "Add Block". Set start date tomorrow, end date +3 days, Reason "Staff Training". Click Save.  
> Assert: block appears in the list/calendar. Appointments cannot be booked in that window.

**Expected:** Block created. Block visible in block list.

---

## Products (`/manager/products`)

### TC-MGR-013 — Products list renders
**Prompt:**  
> Navigate to `/manager/products`.  
> Assert: list of products with Name, Category, Price, Stock levels visible.

**Expected:** Mock product data renders.

---

### TC-MGR-014 — Create and edit product
**Prompt:**  
> Create a product "Vitamin D Supplement", Category "Pharmacy", Price "$25". Save.  
> Assert: product visible. Edit price to "$28". Save. Updated price shown.

**Expected:** CRUD operations work for products.
