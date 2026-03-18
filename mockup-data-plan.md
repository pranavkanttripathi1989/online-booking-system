================================================================================
  MEDIBOOK — COMPLETE MOCK DATA PLAN, USER JOURNEYS & PROMPTS
  Healthcare Clinic Management Platform
  Generated: March 2026
================================================================================

TABLE OF CONTENTS
─────────────────
  SECTION 1:  Platform Overview & Roles
  SECTION 2:  Data Dependency Chain (creation order)
  SECTION 3:  Foundation Mock Data (all entities)
  SECTION 4:  Feature-by-Feature Mock Data (30–40 records each)
  SECTION 5:  End-to-End User Journeys (per role)
  SECTION 6:  Copy-Ready Prompts (one per feature)

================================================================================
  SECTION 1: PLATFORM OVERVIEW & ROLES
================================================================================

MediBook is a multi-tenant healthcare clinic management platform. It supports
five user roles, each with their own portal, routes, and data scope.

ROLES
──────
  super_admin   Full platform access. Manages organisations, system config.
  admin         Platform admin. Users, roles, types, email templates, policies.
  manager       Clinic operations. Clinics, rooms, services, billing, analytics.
  clinician     Doctor/therapist. Own calendar, patients, availability, messages.
  staff         Receptionist. Appointments, patients, booking wizard.
  patient       End user. Book appointments, messages, profile, video calls.

TECH STACK (from codebase analysis)
─────────────────────────────────────
  Frontend:   React + Vite, MUI, Apollo Client (GraphQL)
  Auth:       JWT tokens (mock: mock_* prefix) stored in localStorage
  GraphQL:    Queries, Mutations, Subscriptions (real-time messages/notifications)
  Routing:    Role-guarded routes via RoleGuard + ProtectedRoute components

MOCK LOGIN CREDENTIALS
───────────────────────
  admin@medibook.dev        password: any  →  role: admin, super_admin
  clinician@medibook.dev    password: any  →  role: clinician
  receptionist@medibook.dev password: any  →  role: staff
  (Add patient@medibook.dev and manager@medibook.dev for those portals)

================================================================================
  SECTION 2: DATA DEPENDENCY CHAIN (CREATE IN THIS ORDER)
================================================================================

Layer 1 — System Config (no dependencies)
  [1]  Languages
  [2]  Clinician Types
  [3]  Room Types
  [4]  Roles & Permissions
  [5]  Email Templates

Layer 2 — Organisational Structure
  [6]  Organisations  (depends on: nothing)
  [7]  Users / Accounts  (depends on: Organisations, Roles)

Layer 3 — Clinic Infrastructure
  [8]  Clinics  (depends on: Organisations)
  [9]  Rooms   (depends on: Clinics, Room Types)
  [10] Services  (depends on: Clinics)
  [11] Products  (depends on: Clinics)

Layer 4 — People
  [12] Clinicians  (depends on: Clinics, Clinician Types, Languages, Services)
  [13] Availability Templates  (depends on: Clinicians, Clinics)
  [14] Patients  (depends on: nothing — standalone)

Layer 5 — Activity
  [15] Appointments  (depends on: Patients, Clinicians, Clinics, Rooms, Services)
  [16] Availability Blocks / Leaves  (depends on: Clinicians, Clinics)

Layer 6 — Outcomes
  [17] Invoices / Billing  (depends on: Appointments, Services, Products)
  [18] Reviews  (depends on: Appointments — status=completed only)
  [19] Messages / Threads  (depends on: Patients, Clinicians)
  [20] Notifications  (depends on: Users, Appointments)

================================================================================
  SECTION 3: FOUNDATION MOCK DATA
================================================================================

────────────────────────────────────────────────────────────────────────────────
3.1  LANGUAGES (8 records)
STATUS: DONE
────────────────────────────────────────────────────────────────────────────────

  id      code   name
  ─────── ────── ─────────────────
  lang-1  en     English
  lang-2  fr     French
  lang-3  ur     Urdu
  lang-4  zh     Mandarin
  lang-5  pl     Polish
  lang-6  ar     Arabic
  lang-7  hi     Hindi
  lang-8  pt     Portuguese

────────────────────────────────────────────────────────────────────────────────
3.2  CLINICIAN TYPES (6 records)
STATUS: DONE
────────────────────────────────────────────────────────────────────────────────

  id    name                  description
  ───── ───────────────────── ──────────────────────────────────────────────
  ct-1  General Practitioner  Primary care and general consultations
  ct-2  Cardiologist          Heart and cardiovascular system specialist
  ct-3  Dermatologist         Skin, hair, and nail conditions
  ct-4  Physiotherapist       Physical rehabilitation and injury therapy
  ct-5  Psychiatrist          Mental health, psychiatry, and CBT
  ct-6  Paediatrician         Child health, development, and vaccinations

────────────────────────────────────────────────────────────────────────────────
3.3  ROOM TYPES (5 records)
STATUS: DONE
────────────────────────────────────────────────────────────────────────────────

  id    name            description
  ───── ─────────────── ─────────────────────────────────────
  rt-1  Consultation    Standard one-to-one consultation room
  rt-2  Procedure       Medical procedure and treatment room
  rt-3  Therapy         Physical or mental therapy suite
  rt-4  Paediatric      Child-friendly consultation room
  rt-5  Waiting         Patient waiting area

────────────────────────────────────────────────────────────────────────────────
3.4  ORGANISATIONS (3 records)
STATUS: DONE
────────────────────────────────────────────────────────────────────────────────

  id     name                    slug         plan        active_clinics  created_at
  ────── ─────────────────────── ──────────── ─────────── ─────────────── ──────────
  org-1  Meridian Health Group   meridian     enterprise  3               2023-01-15
  org-2  CityCore Medical        citycore     pro         1               2023-06-20
  org-3  Wellspring Clinic       wellspring   starter     1               2024-02-01

────────────────────────────────────────────────────────────────────────────────
3.5  CLINICS (5 records)
STATUS: DONE
────────────────────────────────────────────────────────────────────────────────

  id     name                   org    city        address                         postcode   timezone        phone
  ────── ─────────────────────── ────── ─────────── ─────────────────────────────── ─────────── ─────────────── ──────────────
  cli-1  Meridian Central        org-1  London      14 Harley Street                W1G 9PH    Europe/London   020 7946 0100
  cli-2  Meridian East           org-1  Manchester  88 Mosley Street                M2 3JF     Europe/London   0161 946 0200
  cli-3  Meridian North          org-1  Edinburgh   32 Queen Street                 EH2 1JE    Europe/London   0131 946 0300
  cli-4  CityCore West End       org-2  London      55 Wimpole Street               W1G 8YL    Europe/London   020 7946 0400
  cli-5  Wellspring Primary      org-3  Bristol     7 Park Street                   BS1 5NB    Europe/London   0117 946 0500

────────────────────────────────────────────────────────────────────────────────
3.6  ROOMS (12 records)
STATUS: DONE
────────────────────────────────────────────────────────────────────────────────

  id     name                 clinic  type_id  capacity  floor  is_active
  ────── ──────────────────── ─────── ─────────── ──────── ───── ─────────
  rm-1   Consultation A       cli-1   rt-1     2         1     true
  rm-2   Consultation B       cli-1   rt-1     2         1     true
  rm-3   Procedure Room 1     cli-1   rt-2     3         2     true
  rm-4   Physio Suite         cli-2   rt-3     4         1     true
  rm-5   Consultation A       cli-2   rt-1     2         1     true
  rm-6   Mental Health Suite  cli-3   rt-3     2         2     true
  rm-7   Consultation A       cli-3   rt-1     2         1     true
  rm-8   Derma Suite          cli-4   rt-2     2         1     true
  rm-9   Cardio Suite         cli-4   rt-2     3         2     true
  rm-10  Consultation A       cli-4   rt-1     2         1     true
  rm-11  Main Consultation    cli-5   rt-1     2         1     true
  rm-12  Children's Room      cli-5   rt-4     4         1     true

────────────────────────────────────────────────────────────────────────────────
3.7  SERVICES (12 records)
STATUS: DONE
────────────────────────────────────────────────────────────────────────────────

  id     name                        clinic  duration  price  is_active  is_online
  ────── ─────────────────────────── ─────── ───────── ────── ─────────── ─────────
  svc-1  GP Consultation             cli-1   15 min    £40    true        true
  svc-2  Extended GP Consultation    cli-1   30 min    £70    true        true
  svc-3  Blood Pressure Check        cli-1   10 min    £20    true        false
  svc-4  Physiotherapy Session       cli-2   45 min    £65    true        false
  svc-5  Sports Injury Assessment    cli-2   60 min    £90    true        false
  svc-6  Psychiatry Initial Consult  cli-3   60 min    £150   true        true
  svc-7  CBT Session                 cli-3   50 min    £120   true        true
  svc-8  Skin Consultation           cli-4   20 min    £55    true        true
  svc-9  Acne Treatment              cli-4   30 min    £80    true        false
  svc-10 Cardio Assessment           cli-4   40 min    £110   true        false
  svc-11 Child Well-check            cli-5   20 min    £35    true        false
  svc-12 Vaccination Appointment     cli-5   10 min    £25    true        false

────────────────────────────────────────────────────────────────────────────────
3.8  CLINICIANS (10 records)
STATUS: DONE
────────────────────────────────────────────────────────────────────────────────

  id     name                    type  clinics       fee    languages          gender  active
  ────── ─────────────────────── ───── ───────────── ────── ────────────────── ─────── ───────
  cln-1  Dr. Sarah Mitchell      ct-1  cli-1         £40    en, fr             F       true
  cln-2  Dr. James Okafor        ct-1  cli-1, cli-5  £40    en, ar             M       true
  cln-3  Dr. Priya Sharma        ct-2  cli-4         £110   en, hi             F       true
  cln-4  Dr. Tom Greaves         ct-3  cli-4         £55    en                 M       true
  cln-5  Lucy Harrington         ct-4  cli-2         £65    en, pl             F       true
  cln-6  Dr. Ben Whitfield       ct-5  cli-3         £150   en                 M       true
  cln-7  Dr. Amara Diallo        ct-1  cli-2         £40    en, fr, ar         F       true
  cln-8  Dr. Emma Curtis         ct-6  cli-5         £45    en                 F       true
  cln-9  Dr. Raj Patel           ct-1  cli-3         £40    en, hi, ur         M       true
  cln-10 Dr. Helena Kowalski     ct-5  cli-3         £150   en, pl             F       false

  BIOS (for detail pages):
  cln-1: "Dr. Sarah Mitchell is a highly experienced General Practitioner with
          over 12 years in primary care. She specialises in women's health and
          chronic disease management. Dr. Mitchell trained at King's College
          London and is a Fellow of the Royal College of GPs."
  cln-3: "Dr. Priya Sharma is a Consultant Cardiologist with 15 years of
          experience in interventional cardiology. She has published extensively
          on hypertension management and runs a specialist heart failure clinic."
  cln-6: "Dr. Ben Whitfield is a Consultant Psychiatrist specialising in mood
          disorders and anxiety. He is trained in CBT and EMDR, and works with
          both adolescents and adults across the mental health spectrum."

────────────────────────────────────────────────────────────────────────────────
3.9  AVAILABILITY TEMPLATES (10 records — one per clinician)
STATUS: DONE
────────────────────────────────────────────────────────────────────────────────

  id     clinician  days          start   end    break_start  break_end  slot_mins
  ────── ─────────── ───────────── ─────── ────── ─────────── ─────────── ─────────
  avt-1  cln-1      Mon-Fri       09:00   17:00  13:00        14:00      15
  avt-2  cln-2      Mon,Wed,Fri   08:30   16:30  12:30        13:30      15
  avt-3  cln-3      Tue,Thu       10:00   18:00  13:00        14:00      40
  avt-4  cln-4      Mon-Thu       09:00   16:00  12:00        13:00      20
  avt-5  cln-5      Mon-Fri       08:00   16:00  12:00        13:00      45
  avt-6  cln-6      Mon,Tue,Thu   09:00   17:00  13:00        14:00      60
  avt-7  cln-7      Mon-Fri       08:30   17:30  12:00        13:00      15
  avt-8  cln-8      Mon-Fri       09:00   15:00  12:00        12:30      20
  avt-9  cln-9      Tue-Fri       10:00   18:00  13:00        14:00      15
  avt-10 cln-10     (inactive)    —       —      —            —          —

────────────────────────────────────────────────────────────────────────────────
3.10  PATIENTS (30 records)
STATUS: DONE
────────────────────────────────────────────────────────────────────────────────

  id     name                    DOB          gender  phone               email
  ────── ─────────────────────── ──────────── ─────── ──────────────────── ──────────────────────────────
  pt-1   Alice Thompson          1985-03-12   F       +44 7700 900001      alice.thompson@gmail.com
  pt-2   Marcus Chen             1990-07-25   M       +44 7700 900002      marcus.chen@outlook.com
  pt-3   Fatima Al-Hassan        1978-11-04   F       +44 7700 900003      fatima.alhassan@email.com
  pt-4   George Williams         1962-05-18   M       +44 7700 900004      george.williams@btinternet.com
  pt-5   Sophie Turner           1995-09-30   F       +44 7700 900005      sophie.turner@gmail.com
  pt-6   Dmitri Volkov           1988-02-14   M       +44 7700 900006      dmitri.volkov@protonmail.com
  pt-7   Ngozi Adeyemi           2001-06-22   F       +44 7700 900007      ngozi.adeyemi@gmail.com
  pt-8   Charles Beaumont        1955-12-01   M       +44 7700 900008      charles.beaumont@yahoo.co.uk
  pt-9   Mei-Lin Zhang           1993-04-09   F       +44 7700 900009      meilin.zhang@gmail.com
  pt-10  Oliver Bennett          2015-08-17   M       +44 7700 900010      (guardian: sarah.bennett@gmail.com)
  pt-11  Ingrid Larsson          1972-01-28   F       +44 7700 900011      ingrid.larsson@email.com
  pt-12  Hassan Malik            1983-10-05   M       +44 7700 900012      hassan.malik@hotmail.co.uk
  pt-13  Chloe Parker            1997-07-14   F       +44 7700 900013      chloe.parker@gmail.com
  pt-14  Roberto Silva           1968-03-20   M       +44 7700 900014      roberto.silva@email.com
  pt-15  Amelia Foster           2010-11-11   F       +44 7700 900015      (guardian: james.foster@gmail.com)
  pt-16  David Okonkwo           1980-06-03   M       +44 7700 900016      david.okonkwo@gmail.com
  pt-17  Yuki Tanaka             1992-09-14   F       +44 7700 900017      yuki.tanaka@gmail.com
  pt-18  Patrick O'Brien         1975-04-22   M       +44 7700 900018      patrick.obrien@eircom.net
  pt-19  Zara Ahmed              2000-12-08   F       +44 7700 900019      zara.ahmed@outlook.com
  pt-20  William Blackwood       1948-07-30   M       +44 7700 900020      william.blackwood@aol.com
  pt-21  Nadia Petrova           1987-02-17   F       +44 7700 900021      nadia.petrova@gmail.com
  pt-22  Samuel Osei             1994-11-25   M       +44 7700 900022      samuel.osei@gmail.com
  pt-23  Elena Vasquez           1969-08-11   F       +44 7700 900023      elena.vasquez@email.com
  pt-24  Finn Jacobsen           1983-05-04   M       +44 7700 900024      finn.jacobsen@gmail.com
  pt-25  Aisha Mohammed          1991-03-19   F       +44 7700 900025      aisha.mohammed@hotmail.com
  pt-26  Lucas Martin            2003-10-27   M       +44 7700 900026      lucas.martin@gmail.com
  pt-27  Kavya Nair              1977-01-06   F       +44 7700 900027      kavya.nair@email.com
  pt-28  Tom Andersson           1965-09-15   M       +44 7700 900028      tom.andersson@gmail.com
  pt-29  Blessing Eze            1999-07-23   F       +44 7700 900029      blessing.eze@gmail.com
  pt-30  Michael Brennan         1958-04-12   M       +44 7700 900030      michael.brennan@eircom.net

  PATIENT NOTES (on 15 of 30):
  pt-1:  "Mild hypertension. Taking lisinopril 5mg. Review every 6 months."
  pt-2:  "Seasonal asthma. Salbutamol inhaler PRN. No recent flare-ups."
  pt-3:  "Type 2 diabetes managed with metformin. Annual HbA1c required."
  pt-4:  "Post-MI 2019. On statins and aspirin. Cardiology follow-up ongoing."
  pt-6:  "Diagnosed anxiety disorder 2022. CBT in progress with cln-6."
  pt-8:  "COPD diagnosis 2018. Smoker x30 years (quit 2020). Spirometry yearly."
  pt-11: "Recurring lower back pain. Active physiotherapy with cln-5."
  pt-12: "Eczema with secondary bacterial infections. Ongoing derma care."
  pt-14: "Previous knee replacement 2021. Physio maintenance programme."
  pt-20: "Complex multi-morbidity: T2DM, hypertension, AF. Geriatric care."

================================================================================
  SECTION 4: FEATURE-BY-FEATURE MOCK DATA
================================================================================

════════════════════════════════════════════════════════════════════════════════
  FEATURE 1: AUTHENTICATION
STATUS: DONE
════════════════════════════════════════════════════════════════════════════════

PURPOSE
  Login page, forgot password, role-based routing after login,
  mock token system, session persistence in localStorage.

MOCK USER ACCOUNTS (7 records)
  id   email                        password  roles              linked_entity
  ──── ─────────────────────────── ───────── ────────────────── ──────────────
  u-1  admin@medibook.dev           Admin123! admin, super_admin  —
  u-2  manager@medibook.dev         Mgr1234!  manager            org-1 / cli-1
  u-3  clinician@medibook.dev       Cln1234!  clinician          cln-1
  u-4  receptionist@medibook.dev    Rec1234!  staff              cli-1
  u-5  patient@medibook.dev         Pat1234!  patient            pt-1
  u-6  dr.okafor@medibook.dev       Doc1234!  clinician          cln-2
  u-7  manager2@medibook.dev        Mgr5678!  manager            org-2 / cli-4

MOCK TOKENS
  u-1: mock_admin_token_001
  u-2: mock_manager_token_002
  u-3: mock_clinician_token_003
  u-4: mock_staff_token_004
  u-5: mock_patient_token_005

POST-LOGIN REDIRECTS (by role)
  admin       → /dashboard
  super_admin → /dashboard
  manager     → /manager/dashboard
  clinician   → /clinician/dashboard
  staff       → /staff/dashboard
  patient     → /patient/dashboard

FORGOT PASSWORD FLOW
  Step 1: Enter email → POST /forgot-password
  Step 2: Receive reset email (mock: show token inline)
  Step 3: Navigate /reset-password?token=XXX
  Step 4: Enter new password → redirect to /login

TEST SCENARIOS
  ✓ Login with each role → assert redirect matches table above
  ✓ Wrong password → error message displayed
  ✓ Unknown email → "If this email exists, you'll receive a link"
  ✓ Expired token (mock_expired_token) → redirect to /login
  ✓ Direct nav to /manager/clinics as patient → redirect to /403

════════════════════════════════════════════════════════════════════════════════
  FEATURE 2: DASHBOARD (per role)
STATUS: DONE
════════════════════════════════════════════════════════════════════════════════

PURPOSE
  Role-specific KPI cards, appointment volume chart (30 days),
  utilisation by clinician, service breakdown pie chart,
  recent/upcoming appointments table.

ADMIN / MANAGER DASHBOARD KPIs
  total_appointments_today:          12
  total_appointments_today_change:   +3 (vs yesterday)
  total_appointments_week:           67
  total_appointments_month:          284
  total_clinicians:                  10
  total_clinicians_change:           +1
  total_patients:                    127
  total_patients_change:             +8
  total_revenue_month:               £18,450
  total_revenue_month_change:        +12.3%
  no_show_rate:                      8.5%

VOLUME BY DAY (last 30 days — Mon-Fri peaks, Sat-Sun low)
  2026-02-14: confirmed_count=9,  cancelled_count=1
  2026-02-15: confirmed_count=11, cancelled_count=0
  2026-02-16: confirmed_count=8,  cancelled_count=2
  2026-02-17: confirmed_count=14, cancelled_count=1
  2026-02-18: confirmed_count=12, cancelled_count=0
  2026-02-19: confirmed_count=3,  cancelled_count=0  (Saturday)
  2026-02-20: confirmed_count=1,  cancelled_count=0  (Sunday)
  2026-02-21: confirmed_count=10, cancelled_count=2
  2026-02-22: confirmed_count=13, cancelled_count=1
  2026-02-23: confirmed_count=11, cancelled_count=0
  2026-02-24: confirmed_count=15, cancelled_count=2
  2026-02-25: confirmed_count=12, cancelled_count=1
  ... (continue pattern to 2026-03-15)

UTILISATION BY CLINICIAN
  cln-1 (Mitchell):   slots_available=32, slots_booked=28, utilisation=87.5%
  cln-2 (Okafor):     slots_available=24, slots_booked=18, utilisation=75.0%
  cln-3 (Sharma):     slots_available=16, slots_booked=14, utilisation=87.5%
  cln-4 (Greaves):    slots_available=24, slots_booked=19, utilisation=79.2%
  cln-5 (Harrington): slots_available=32, slots_booked=25, utilisation=78.1%
  cln-6 (Whitfield):  slots_available=16, slots_booked=12, utilisation=75.0%
  cln-7 (Diallo):     slots_available=40, slots_booked=31, utilisation=77.5%
  cln-8 (Curtis):     slots_available=24, slots_booked=16, utilisation=66.7%
  cln-9 (Patel):      slots_available=32, slots_booked=22, utilisation=68.8%

BOOKINGS BY SERVICE
  GP Consultation:            68
  Extended GP Consultation:   32
  Physiotherapy Session:      28
  CBT Session:                22
  Cardio Assessment:          18
  Psychiatry Initial Consult: 16
  Skin Consultation:          14
  Acne Treatment:             12
  Sports Injury Assessment:   10
  Child Well-check:           9
  Vaccination Appointment:    8
  Blood Pressure Check:       7

CLINICIAN DASHBOARD KPIs (cln-1, Dr. Sarah Mitchell)
  appointments_today:          6
  appointments_this_week:      28
  patients_seen_this_month:    41
  avg_rating:                  4.8
  upcoming_appointments: (next 3 shown in dashboard widget)
    appt-1: Alice Thompson 09:00 GP Consultation
    appt-2: Marcus Chen    09:30 Extended GP
    appt-5: Sophie Turner  (tomorrow) 11:00 GP Consultation

PATIENT DASHBOARD KPIs (pt-1, Alice Thompson)
  next_appointment:   2026-03-20 10:00 Dr. Sarah Mitchell
  past_appointments:  4 completed
  unread_messages:    2
  outstanding_reviews: 1 (post appt-4 review prompt)

════════════════════════════════════════════════════════════════════════════════
  FEATURE 3: CLINIC MANAGEMENT
STATUS: DONE
════════════════════════════════════════════════════════════════════════════════

PURPOSE
  Create, view, edit clinics. Manage rooms per clinic.
  Set clinic opening hours, contact info, timezone.

MOCK DATA: 5 clinics (see Section 3.5 above)
All extended with:

OPENING HOURS (per clinic — example cli-1)
  Monday:    09:00–18:00
  Tuesday:   09:00–18:00
  Wednesday: 09:00–18:00
  Thursday:  09:00–18:00
  Friday:    09:00–17:00
  Saturday:  09:00–13:00
  Sunday:    Closed

CLINIC DETAIL STATS (cli-1 example)
  total_rooms:         3
  total_clinicians:    2  (cln-1, cln-2)
  total_services:      3  (svc-1, svc-2, svc-3)
  appointments_month:  96
  revenue_month:       £7,840

AVAILABILITY BLOCKS (clinic-level — 8 records)
  id     clinic  title                          start_date   end_date     type
  ────── ─────── ────────────────────────────── ──────────── ──────────── ─────────
  blk-1  cli-1   Easter Bank Holiday            2026-04-03   2026-04-06   holiday
  blk-2  cli-1   Annual Deep Clean              2026-04-15   2026-04-15   admin
  blk-3  cli-2   Building Maintenance           2026-03-22   2026-03-22   admin
  blk-4  cli-3   Staff Training Day             2026-03-28   2026-03-28   training
  blk-5  cli-4   Derma Conference (half day)    2026-04-10   2026-04-10   training
  blk-6  cli-5   Bank Holiday                   2026-04-03   2026-04-03   holiday
  blk-7  cli-1   System Upgrade Downtime        2026-04-20   2026-04-20   admin
  blk-8  cli-2   Room Refurbishment             2026-04-28   2026-04-30   admin

CRUD SCENARIOS TO TEST
  ✓ Create new clinic → required fields: name, org, address, city, timezone
  ✓ Edit clinic phone number → change saved, breadcrumb updated
  ✓ View clinic detail → rooms list, clinicians list, stats
  ✓ Create room → assign to clinic, set type, capacity
  ✓ Edit room → change capacity from 2 to 4
  ✓ View room detail → appointment history in room
  ✓ Create availability block → block holiday dates
  ✓ Delete availability block → confirm dialog → removed

════════════════════════════════════════════════════════════════════════════════
  FEATURE 4: CLINICIAN MANAGEMENT
STATUS: DONE
════════════════════════════════════════════════════════════════════════════════

PURPOSE
  Create, view, edit, deactivate clinicians. Assign clinics, services,
  languages. View clinician profile with ratings and appointment history.

MOCK DATA: 10 clinicians (see Section 3.8 above)

CLINICIAN PROFILE DETAIL (cln-1, Dr. Sarah Mitchell)
  full_name:         Dr. Sarah Mitchell
  clinician_type:    General Practitioner
  clinics:           Meridian Central (cli-1)
  services:          GP Consultation, Extended GP, Blood Pressure Check
  languages:         English, French
  consultation_fee:  £40
  avg_rating:        4.8  (from 12 reviews)
  total_patients:    41
  appointments_done: 284
  is_active:         true
  joined:            2021-03-01
  avatar_url:        https://i.pravatar.cc/150?img=47

CRUD SCENARIOS
  ✓ Create clinician → all required fields, assign to clinic
  ✓ Edit clinician bio → rich text update
  ✓ Toggle active/inactive → cln-10 (Kowalski) shown as inactive chip
  ✓ Add language to clinician → Mandarin added to cln-1
  ✓ Assign new service → svc-2 added to cln-9
  ✓ View detail page → tabs: About, Availability, Appointments, Reviews
  ✓ Filter clinicians list by type → show only GPs
  ✓ Search clinicians → "Priya" finds cln-3

════════════════════════════════════════════════════════════════════════════════
  FEATURE 5: PATIENT MANAGEMENT
STATUS: DONE
════════════════════════════════════════════════════════════════════════════════

PURPOSE
  Register patients, view patient profiles, view appointment history,
  edit details, add clinical notes, search by name/phone/email.

MOCK DATA: 30 patients (see Section 3.10 above)

PATIENT DETAIL PAGE — Alice Thompson (pt-1)
  Tabs: Overview | Appointments | Notes | Documents
  Overview:
    DOB:        12 March 1985 (age 41)
    Gender:     Female
    Email:      alice.thompson@gmail.com
    Phone:      +44 7700 900001
    Address:    22 Elgin Crescent, London W11 2JR
    Notes:      "Mild hypertension. Taking lisinopril 5mg. Review every 6 months."
    Registered: 2024-01-08
  Appointments tab (4 records):
    appt-1: 2026-03-16  confirmed   GP Consultation  Dr. Mitchell
    appt-12: 2025-12-10 completed   Blood Pressure   Dr. Mitchell
    appt-20: 2025-10-04 completed   Extended GP      Dr. Mitchell
    appt-28: 2025-07-22 cancelled   GP Consultation  Dr. Mitchell  reason: "Patient request"

SEARCH/FILTER SCENARIOS
  ✓ Search "Alice" → pt-1 returned
  ✓ Search "+44 7700 900004" → pt-4 returned
  ✓ Search "zhang" → pt-9 returned (case-insensitive)
  ✓ Filter by recent activity → patients with appointment in last 7 days
  ✓ Sort by date registered (newest first)
  ✓ Pagination: 20 per page, 30 patients = 2 pages

CRUD SCENARIOS
  ✓ Create patient → all fields, form validation (DOB cannot be future)
  ✓ Edit patient phone → update, show success snackbar
  ✓ Add note → append to existing notes, timestamp
  ✓ View appointment history in patient detail
  ✓ Deactivate patient account (soft delete / archive)

════════════════════════════════════════════════════════════════════════════════
  FEATURE 6: APPOINTMENTS
STATUS: DONE
════════════════════════════════════════════════════════════════════════════════

PURPOSE
  List all appointments with filters. View detail in drawer.
  Status workflow: pending → confirmed → completed / cancelled / no_show.
  Cancel with reason. Reschedule. Edit appointment.

APPOINTMENTS (35 records)
  Status distribution: 15 confirmed, 8 completed, 4 cancelled, 3 no_show, 5 pending

  id       patient  clinician  service  room   start_datetime        end_datetime          status      notes
  ──────── ──────── ─────────── ─────── ────── ───────────────────── ───────────────────── ─────────── ────────────────────────────────────
  appt-1   pt-1     cln-1      svc-1   rm-1   2026-03-16 09:00      2026-03-16 09:15      confirmed   Patient called to confirm
  appt-2   pt-2     cln-1      svc-2   rm-1   2026-03-16 09:30      2026-03-16 10:00      confirmed   Follow-up from last month
  appt-3   pt-3     cln-3      svc-10  rm-9   2026-03-16 10:00      2026-03-16 10:40      confirmed   Annual cardio review
  appt-4   pt-4     cln-5      svc-4   rm-4   2026-03-14 10:00      2026-03-14 10:45      completed   Good progress on knee
  appt-5   pt-5     cln-4      svc-8   rm-8   2026-03-16 11:00      2026-03-16 11:20      confirmed   First skin consultation
  appt-6   pt-6     cln-6      svc-6   rm-6   2026-03-16 14:00      2026-03-16 15:00      pending     Initial psychiatric assessment
  appt-7   pt-7     cln-8      svc-11  rm-12  2026-03-16 15:00      2026-03-16 15:20      confirmed   6-month well check
  appt-8   pt-8     cln-2      svc-1   rm-11  2026-03-12 09:00      2026-03-12 09:15      cancelled   Patient request - unwell
  appt-9   pt-9     cln-7      svc-4   rm-4   2026-03-10 10:00      2026-03-10 10:45      completed   Session 3 of 6
  appt-10  pt-10    cln-8      svc-12  rm-12  2026-03-17 11:00      2026-03-17 11:10      confirmed   MMR booster
  appt-11  pt-11    cln-9      svc-1   rm-7   2026-03-08 14:00      2026-03-08 14:15      no_show     No contact made
  appt-12  pt-12    cln-1      svc-3   rm-2   2026-03-05 09:00      2026-03-05 09:10      completed   BP check - within range
  appt-13  pt-13    cln-4      svc-9   rm-8   2026-03-18 10:00      2026-03-18 10:30      confirmed   Isotretinoin review
  appt-14  pt-14    cln-3      svc-10  rm-9   2026-03-04 11:00      2026-03-04 11:40      completed   Echo results reviewed
  appt-15  pt-15    cln-8      svc-11  rm-12  2026-03-18 14:00      2026-03-18 14:20      pending     Routine 5-year check
  appt-16  pt-16    cln-2      svc-1   rm-1   2026-03-19 09:00      2026-03-19 09:15      confirmed   New patient first appt
  appt-17  pt-17    cln-6      svc-7   rm-6   2026-03-19 10:00      2026-03-19 10:50      confirmed   CBT session 2
  appt-18  pt-18    cln-5      svc-5   rm-4   2026-03-02 10:00      2026-03-02 11:00      completed   ACL injury assessment
  appt-19  pt-19    cln-9      svc-6   rm-6   2026-03-20 14:00      2026-03-20 15:00      confirmed   Referred by GP
  appt-20  pt-1     cln-1      svc-2   rm-1   2025-12-10 09:00      2025-12-10 09:30      completed   Annual extended review
  appt-21  pt-20    cln-3      svc-10  rm-9   2026-02-18 11:00      2026-02-18 11:40      completed   AF monitoring
  appt-22  pt-21    cln-6      svc-7   rm-6   2026-02-25 14:00      2026-02-25 14:50      cancelled   Clinician unavailable
  appt-23  pt-22    cln-7      svc-1   rm-5   2026-03-21 09:00      2026-03-21 09:15      confirmed   Sore throat, minor
  appt-24  pt-23    cln-1      svc-1   rm-1   2026-03-21 10:00      2026-03-21 10:15      confirmed   Repeat prescription request
  appt-25  pt-24    cln-5      svc-4   rm-4   2026-02-12 09:00      2026-02-12 09:45      completed   Shoulder physio session 4
  appt-26  pt-25    cln-4      svc-8   rm-8   2026-03-22 11:00      2026-03-22 11:20      confirmed   Mole check
  appt-27  pt-26    cln-8      svc-12  rm-12  2026-03-22 14:00      2026-03-22 14:10      confirmed   HPV vaccination
  appt-28  pt-1     cln-1      svc-1   rm-1   2025-07-22 09:00      2025-07-22 09:15      cancelled   Patient request - holiday clash
  appt-29  pt-27    cln-9      svc-1   rm-7   2026-01-15 10:00      2026-01-15 10:15      no_show     Left voicemail, no response
  appt-30  pt-28    cln-3      svc-10  rm-9   2026-02-05 10:00      2026-02-05 10:40      completed   Post-surgery cardio check
  appt-31  pt-29    cln-7      svc-1   rm-5   2026-03-23 09:00      2026-03-23 09:15      pending     New patient registration
  appt-32  pt-30    cln-2      svc-2   rm-1   2026-03-23 10:00      2026-03-23 10:30      confirmed   Repeat medication review
  appt-33  pt-6     cln-6      svc-7   rm-6   2026-03-03 14:00      2026-03-03 14:50      completed   CBT session 5
  appt-34  pt-11    cln-5      svc-4   rm-4   2026-03-24 09:00      2026-03-24 09:45      confirmed   Lower back physio
  appt-35  pt-12    cln-4      svc-9   rm-8   2026-03-11 10:00      2026-03-11 10:30      no_show     No contact — policy sent

STATUS LOGS (example — appt-8)
  log-1: status=pending    created_at=2026-03-10 08:00  changed_by=u-4 (receptionist)
  log-2: status=confirmed  created_at=2026-03-10 08:05  changed_by=u-4
  log-3: status=cancelled  created_at=2026-03-12 07:30  changed_by=u-5 (patient)
                           reason="Patient request - unwell"

FILTER SCENARIOS TO TEST
  ✓ Filter by status: confirmed → 15 results
  ✓ Filter by clinician: cln-1 → appt-1, appt-2, appt-12, appt-20, appt-24, appt-28
  ✓ Filter by date range: 2026-03-16 → 2026-03-16 → 5 results
  ✓ Filter by clinic: cli-1 → all Meridian Central appointments
  ✓ Search patient: "Alice" → appt-1, appt-20, appt-24, appt-28
  ✓ Paginate: 20 per page

STATUS WORKFLOW SCENARIOS
  ✓ Mark appt-6 confirmed → status chip changes
  ✓ Mark appt-1 completed → status locked, no further changes
  ✓ Cancel appt-7 → dialog appears, reason required, status = cancelled
  ✓ Mark appt-10 no_show → status = no_show, reason optional
  ✓ Reschedule appt-2 → pick new slot → new appointment created, old cancelled

════════════════════════════════════════════════════════════════════════════════
  FEATURE 7: BOOKING WIZARD
STATUS: DONE
════════════════════════════════════════════════════════════════════════════════

PURPOSE
  5-step wizard: Clinic → Clinician → Slot → Patient → Confirm.
  Used by staff (receptionist) and patients booking their own appointments.

WIZARD FLOW WITH MOCK DATA

  STEP 1 — Select Clinic
    Display: 5 clinic cards with name, city, address
    Pre-selection: cli-1 (Meridian Central) for patient portal (nearest)
    Next → enabled when clinic selected

  STEP 2 — Select Clinician
    Filtered by: clinic selected in step 1
    For cli-1 → show cln-1 (Mitchell) and cln-2 (Okafor)
    Card shows: avatar, name, type, languages, fee, rating
    cln-1 card: "Dr. Sarah Mitchell · GP · £40 · ★ 4.8"
    cln-2 card: "Dr. James Okafor · GP · £40 · ★ 4.6"
    Next → enabled when clinician selected

  STEP 3 — Select Slot & Service
    Service dropdown (filtered to clinic+clinician):
      svc-1: GP Consultation 15 min £40
      svc-2: Extended GP 30 min £70
      svc-3: Blood Pressure Check 10 min £20
    Date picker: default = today + 1 business day
    Available slots for cln-1 on 2026-03-20:
      09:00  09:15  09:30  09:45  10:00  10:15  (morning)
      14:00  14:15  14:30  14:45  15:00  15:15  (afternoon)
      (13:00–14:00 blocked = lunch break)
      (09:30 = already booked = appt-2 → grayed out)
    Next → enabled when slot selected

  STEP 4 — Patient Details
    If booking as patient (u-5 / pt-1): auto-filled from profile
    If booking as staff: search existing patient or create new
    Search "Sophie" → shows pt-5 Sophie Turner
    Create new: form with name, DOB, phone, email
    Confirm details shown in summary

  STEP 5 — Review & Confirm
    Summary card:
      Clinic:     Meridian Central
      Clinician:  Dr. Sarah Mitchell
      Service:    GP Consultation (15 min, £40)
      Slot:       20 March 2026 at 10:00
      Patient:    Alice Thompson
      Room:       Auto-assigned: Consultation A (rm-1)
    Confirm button → POST createAppointment mutation
    Success → confetti explosion → navigate to /patient/appointments
    New appointment status = pending

TEST SCENARIOS
  ✓ Complete full 5-step flow → appointment created
  ✓ Step 3: service change → slot times recalculate to match duration
  ✓ Step 3: select already-booked slot → blocked, cannot select
  ✓ Step 3: weekend with no availability → "No slots available" empty state
  ✓ Step 4: patient search with no results → "Create new patient" CTA
  ✓ Back button from step 5 → returns to step 4 with state preserved
  ✓ Confirm → network error → error snackbar → retry possible

════════════════════════════════════════════════════════════════════════════════
  FEATURE 8: CALENDAR
STATUS: DONE
════════════════════════════════════════════════════════════════════════════════

PURPOSE
  Month, week, and day calendar views. Appointment events colour-coded
  by status. Tooltip on hover. Click event → appointment drawer.

CALENDAR EVENT COLOUR CODING
  confirmed → green (#1D9E75)
  pending   → amber (#EF9F27)
  completed → blue (#378ADD)
  cancelled → gray (#888780)
  no_show   → red (#E24B4A)

SAMPLE WEEK VIEW — 2026-03-16 (Mon) to 2026-03-22 (Sun)
  Monday 16 March:
    09:00–09:15 appt-1  Alice Thompson / GP Consult / rm-1 [confirmed]
    09:30–10:00 appt-2  Marcus Chen / Extended GP / rm-1 [confirmed]
    10:00–10:40 appt-3  Fatima Al-Hassan / Cardio / rm-9 [confirmed]
    11:00–11:20 appt-5  Sophie Turner / Skin Consult / rm-8 [confirmed]
    14:00–15:00 appt-6  Dmitri Volkov / Psychiatry / rm-6 [pending]
    15:00–15:20 appt-7  Ngozi Adeyemi / Well-check / rm-12 [confirmed]
  Tuesday 17 March:
    11:00–11:10 appt-10 Oliver Bennett / Vaccination / rm-12 [confirmed]
  Wednesday 18 March:
    10:00–10:30 appt-13 Chloe Parker / Acne Treatment / rm-8 [confirmed]
    14:00–14:20 appt-15 Amelia Foster / Well-check / rm-12 [pending]
  Thursday 19 March:
    09:00–09:15 appt-16 David Okonkwo / GP Consult / rm-1 [confirmed]
    10:00–10:50 appt-17 Yuki Tanaka / CBT Session / rm-6 [confirmed]
    14:00–15:00 appt-19 Zara Ahmed / Psychiatry Init / rm-6 [confirmed]

TOOLTIP DATA (appt-1 hover)
  Alice Thompson · GP Consultation · 09:00–09:15
  Dr. Sarah Mitchell · Consultation A
  Status: Confirmed

EVENT TOOLTIP SHOWS
  patient full name, service name, time range, clinician name, room, status

TEST SCENARIOS
  ✓ Month view: counts per day shown as badge (e.g. "6" on March 16)
  ✓ Week view: overlapping events in same room → side-by-side columns
  ✓ Day view: cln-1's full schedule March 16 → 6 events
  ✓ Click event → AppointmentDrawer opens with full detail
  ✓ Navigate to previous month → Feb events load
  ✓ Filter by clinician → only cln-1's events shown
  ✓ Filter by clinic → only cli-1 events
  ✓ Today button → jump to current date

════════════════════════════════════════════════════════════════════════════════
  FEATURE 9: SERVICE CATALOG
STATUS: DONE
════════════════════════════════════════════════════════════════════════════════

PURPOSE
  Manager creates, edits, activates/deactivates services.
  View service detail: assigned clinicians, booking stats.

MOCK DATA: 12 services (see Section 3.7 above)

SERVICE DETAIL — GP Consultation (svc-1)
  name:              GP Consultation
  description:       "Standard 15-minute GP consultation for registered patients.
                      Covers symptom assessment, referrals, and repeat prescriptions."
  duration:          15 minutes
  price:             £40
  clinic:            Meridian Central (cli-1)
  is_active:         true
  is_online:         true (video consultations available)
  max_advance_days:  60
  assigned_clinicians: cln-1 (Mitchell), cln-2 (Okafor)
  bookings_this_month: 41
  revenue_this_month:  £1,640

PRODUCTS (10 records — for upsell in billing)
  id      name                     clinic  category     price   stock   active
  ─────── ─────────────────────── ─────── ──────────── ─────── ─────── ───────
  prod-1  SPF 50 Sunscreen         cli-4   skincare     £18     150     true
  prod-2  Vitamin D Supplement     cli-1   supplement   £12     200     true
  prod-3  Omega-3 Fish Oil         cli-1   supplement   £15     180     true
  prod-4  Resistance Band Set      cli-2   equipment    £22     60      true
  prod-5  Foam Roller              cli-2   equipment    £28     45      true
  prod-6  Retinol Night Cream      cli-4   skincare     £42     80      true
  prod-7  Salicylic Acid Cleanser  cli-4   skincare     £16     120     true
  prod-8  Peak Flow Meter          cli-1   equipment    £14     90      true
  prod-9  Blood Pressure Cuff      cli-1   equipment    £35     40      true
  prod-10 Melatonin 5mg            cli-3   supplement   £10     160     true

CRUD SCENARIOS
  ✓ Create service → name, duration, price, clinic, clinicians required
  ✓ Edit service price → £40 to £45 → saved, bookings unaffected
  ✓ Toggle service inactive → removed from booking wizard step 3
  ✓ View service detail → shows assigned clinicians, booking volume chart
  ✓ Create product → name, category, price, SKU, stock
  ✓ Edit product stock quantity
  ✓ Deactivate product → removed from billing upsell panel

════════════════════════════════════════════════════════════════════════════════
  FEATURE 10: AVAILABILITY
STATUS: DONE
════════════════════════════════════════════════════════════════════════════════

PURPOSE
  Clinicians set weekly availability templates.
  Managers set clinic-level availability blocks (holidays, closures).
  Available slots surface in booking wizard step 3.

AVAILABILITY TEMPLATES (10 records — see Section 3.9)

INDIVIDUAL LEAVE BLOCKS (clinician-level — 8 records)
  id     clinician  start_date   end_date     reason                type
  ────── ─────────── ──────────── ──────────── ────────────────────── ────────
  lv-1   cln-1      2026-04-14   2026-04-18   Annual leave           leave
  lv-2   cln-5      2026-03-24   2026-03-24   Sick day               sick
  lv-3   cln-6      2026-04-07   2026-04-07   Conference             admin
  lv-4   cln-3      2026-04-21   2026-04-22   CPD training           training
  lv-5   cln-2      2026-03-27   2026-03-28   Personal leave         leave
  lv-6   cln-9      2026-04-01   2026-04-03   Annual leave           leave
  lv-7   cln-7      2026-04-24   2026-04-24   Medical appointment    personal
  lv-8   cln-4      2026-04-15   2026-04-16   Annual leave           leave

SLOT GENERATION RULES
  Base: availability template (Mon–Fri 09:00–17:00, 15-min slots)
  Minus: lunch break (13:00–14:00)
  Minus: already booked appointments
  Minus: individual leave blocks
  Minus: clinic-level availability blocks
  Result: array of { start_datetime, end_datetime, is_available }

EXAMPLE: cln-1 slots on 2026-03-20 (Friday)
  09:00 ✓  09:15 ✓  09:30 ✗(booked)  09:45 ✓  10:00 ✓  10:15 ✓  10:30 ✓
  10:45 ✓  11:00 ✓  11:15 ✓  11:30 ✓  11:45 ✓  12:00 ✓  12:15 ✓  12:30 ✓
  12:45 ✓  13:00 ✗(lunch)  ...  14:00 ✓  14:15 ✓  ... 16:45 ✓

EXAMPLE: cln-1 on 2026-04-14 → all slots blocked (leave lv-1)

TEST SCENARIOS
  ✓ Create weekly template → slots available in booking wizard
  ✓ Add leave block → slots disappear from wizard on that date
  ✓ Clinic holiday block → no slots available for any clinician in clinic
  ✓ Edit template → change end time to 15:00 → fewer afternoon slots
  ✓ Delete template → no slots available at all
  ✓ Manager view → see all clinicians' availability in one grid

════════════════════════════════════════════════════════════════════════════════
  FEATURE 11: ANALYTICS
STATUS: DONE
════════════════════════════════════════════════════════════════════════════════

PURPOSE
  Revenue trends, appointment volumes, utilisation percentages,
  no-show rates, revenue by clinician and service. Date range filters.

MONTHLY REVENUE DATA (Jan–Mar 2026)
  Month     Total     Appointments  Avg per appt  Revenue change
  ───────── ───────── ───────────── ───────────── ──────────────
  Jan 2026  £14,200   198           £71.72        baseline
  Feb 2026  £16,800   234           £71.79        +18.3%
  Mar 2026  £18,450   284           £64.97        +9.8%  (partial)

NO-SHOW RATE BY MONTH
  Jan: 12.1%  Feb: 9.4%  Mar: 8.5%  (trend: improving)

REVENUE BY CLINICIAN (March 2026)
  cln-1 (Mitchell):   £4,280  (107 appts × avg £40)
  cln-3 (Sharma):     £3,520  (32 appts × avg £110)
  cln-6 (Whitfield):  £2,700  (18 appts × avg £150)
  cln-5 (Harrington): £1,625  (25 appts × avg £65)
  cln-7 (Diallo):     £1,240  (31 appts × avg £40)
  cln-4 (Greaves):    £1,045  (19 appts × avg £55)
  cln-2 (Okafor):      £720   (18 appts × avg £40)
  cln-9 (Patel):       £880   (22 appts × avg £40)
  cln-8 (Curtis):      £720   (16 appts × avg £45)

REVENUE BY SERVICE (March 2026)
  GP Consultation:            £2,720
  Extended GP Consultation:   £2,240
  Psychiatry Initial Consult: £2,400
  Cardio Assessment:          £1,980
  CBT Session:                £2,640
  Physiotherapy Session:      £1,820
  Acne Treatment:               £960
  Sports Injury:                £900
  Skin Consultation:            £770
  Blood Pressure Check:         £140
  Child Well-check:             £315
  Vaccination:                  £200
  Products:                     £366

CANCELLATION REASONS BREAKDOWN
  "Patient request":           42% (16 of 38 total cancellations)
  "Clinician unavailable":     21% (8)
  "Administrative error":      11% (4)
  "No reason given":           26% (10)

TEST SCENARIOS
  ✓ Change date range → all charts update
  ✓ Filter by clinic → show only cli-1 data
  ✓ Filter by clinician → show only cln-3's revenue
  ✓ Export data → CSV download with all rows
  ✓ No-show chart → show by weekday (Monday worst = 14.2%)

════════════════════════════════════════════════════════════════════════════════
  FEATURE 12: MESSAGES
STATUS: DONE
════════════════════════════════════════════════════════════════════════════════

PURPOSE
  Real-time messaging between patients and clinicians/staff.
  Conversation threads. Unread counts. Notification bell integration.

MESSAGE THREADS (8 threads, 35 total messages)

  THREAD 1: pt-1 (Alice) ↔ cln-1 (Mitchell)  — 5 messages
    msg-1:  FROM pt-1    "Hi Dr. Mitchell, I've been feeling dizzy the past two days. Should I come in?"
    msg-2:  FROM cln-1   "Hi Alice, thanks for reaching out. How severe on a scale of 1–10, and any other symptoms?"
    msg-3:  FROM pt-1    "About a 4/10. Also slightly nauseous in the morning. No fever."
    msg-4:  FROM cln-1   "This could be related to your blood pressure medication. Let's book you in for a BP check. Can you do Thursday morning?"
    msg-5:  FROM pt-1    "Yes Thursday works, I've booked the 9am slot. Thank you!"
    last_activity: 2026-03-13 14:22   unread_by_clinician: 0   unread_by_patient: 0

  THREAD 2: pt-6 (Dmitri) ↔ cln-6 (Whitfield)  — 4 messages
    msg-6:  FROM pt-6    "Dr. Whitfield, I'm struggling with the exercises from our last session."
    msg-7:  FROM cln-6   "That's okay Dmitri, these things take time. Which exercise is giving you trouble?"
    msg-8:  FROM pt-6    "The breathing exercises. My mind keeps wandering."
    msg-9:  FROM cln-6   "Common issue. Try anchoring to physical sensation — press your feet firmly on the floor as you breathe. See you next Monday."
    last_activity: 2026-03-12 18:40   unread_by_clinician: 0   unread_by_patient: 1

  THREAD 3: pt-12 (Hassan) ↔ cln-4 (Greaves)  — 3 messages
    msg-10: FROM pt-12   "My prescription for the cream has run out. Can I get a repeat?"
    msg-11: FROM cln-4   "Of course. I've sent a repeat to your pharmacy. Should be ready in 24 hours."
    msg-12: FROM pt-12   "Brilliant, thank you!"
    last_activity: 2026-03-11 09:15   unread_by_clinician: 1   unread_by_patient: 0

  THREAD 4: pt-5 (Sophie) ↔ cln-4 (Greaves)  — 3 messages
    msg-13: FROM pt-5    "Just confirming my appointment tomorrow at 11am?"
    msg-14: FROM cln-4   "Yes confirmed, Consultation A. Please arrive 5 minutes early."
    msg-15: FROM pt-5    "Perfect, see you then!"
    last_activity: 2026-03-15 16:00   unread_by_clinician: 1   unread_by_patient: 0

  THREAD 5: pt-9 (Mei-Lin) ↔ cln-7 (Diallo)  — 5 messages
    msg-16: FROM pt-9    "Hi, I'd like to continue physio — is there availability next week?"
    msg-17: FROM cln-7   "Hi Mei-Lin! I have slots Tuesday 10am or Thursday 2pm."
    msg-18: FROM pt-9    "Thursday 2pm please."
    msg-19: FROM cln-7   "Booked! See you then. Please wear comfortable clothing."
    msg-20: FROM pt-9    "Will do, thank you."
    last_activity: 2026-03-14 11:30   unread_by_clinician: 0   unread_by_patient: 0

  THREAD 6: pt-11 (Ingrid) ↔ cln-5 (Harrington)  — 4 messages  [UNREAD]
    msg-21: FROM pt-11   "Lucy, my back has been much better this week!"
    msg-22: FROM cln-5   "That's great news Ingrid! Keep doing the morning exercises."
    msg-23: FROM pt-11   "I missed them yesterday but got back on track today."
    msg-24: FROM cln-5   "Consistency is key but don't be hard on yourself. See you Friday."
    last_activity: 2026-03-15 09:00   unread_by_clinician: 2   unread_by_patient: 0

  THREAD 7: pt-14 (Roberto) ↔ cln-3 (Sharma)  — 6 messages
    msg-25: FROM pt-14   "Dr. Sharma, should I stop the beta-blockers before my stress test?"
    msg-26: FROM cln-3   "Please don't stop any medication without consulting first. Keep taking them as prescribed."
    msg-27: FROM pt-14   "Sorry, I should have called. The test is on Wednesday."
    msg-28: FROM cln-3   "No problem. For the stress test, continue all medications. Stay hydrated and no caffeine that morning."
    msg-29: FROM pt-14   "Understood, thank you doctor."
    msg-30: FROM cln-3   "Good luck. I'll review the results with you at our March 18 appointment."
    last_activity: 2026-03-13 15:45   unread_by_clinician: 0   unread_by_patient: 0

  THREAD 8: pt-3 (Fatima) ↔ cln-3 (Sharma)  — 5 messages  [UNREAD]
    msg-31: FROM pt-3    "Dr. Sharma, I've been getting palpitations in the evenings."
    msg-32: FROM cln-3   "How long have these been happening? Are they accompanied by breathlessness?"
    msg-33: FROM pt-3    "About 5 days. No breathlessness, but I feel anxious during them."
    msg-34: FROM cln-3   "Please book an urgent appointment — I want to run an ECG. Don't wait for your scheduled slot."
    msg-35: FROM pt-3    "I've just booked for tomorrow 10am. Should I go to A&E tonight?"
    last_activity: 2026-03-15 21:30   unread_by_clinician: 1   unread_by_patient: 0

NOTIFICATION RECORDS (20 records for u-3 / cln-1)
  notif-1:  type=appointment_confirmed  title="Appointment confirmed" body="Alice Thompson - 16 Mar 09:00"  unread=false
  notif-2:  type=appointment_confirmed  title="Appointment confirmed" body="Marcus Chen - 16 Mar 09:30"     unread=false
  notif-3:  type=new_message            title="New message from Alice Thompson"                             unread=false
  notif-4:  type=appointment_reminder   title="Reminder: 4 appointments tomorrow"                          unread=true
  notif-5:  type=review_received        title="New 5-star review"   body="From Hassan Malik"               unread=true
  notif-6:  type=appointment_cancelled  title="Appointment cancelled" body="Charles Beaumont - Mar 12"     unread=false
  notif-7:  type=new_message            title="New message from Fatima Al-Hassan"                          unread=true
  notif-8:  type=appointment_confirmed  title="Appointment confirmed" body="Sophie Turner - 21 Mar 10:00"  unread=true
  ... (12 more following same pattern)

════════════════════════════════════════════════════════════════════════════════
  FEATURE 13: FINANCES & BILLING
STATUS: DONE
════════════════════════════════════════════════════════════════════════════════

PURPOSE
  Invoice list, payment status, revenue by service/clinician,
  product upsells, CSV export, VAT calculation.

INVOICES (30 records)
  Status: 20 paid, 7 unpaid, 3 overdue

  id      appt     patient  service     base_price  products_total  subtotal  vat(20%)  total   status   payment   paid_at
  ─────── ──────── ──────── ─────────── ─────────── ─────────────── ───────── ───────── ─────── ──────── ───────── ──────────
  inv-1   appt-4   pt-4     svc-4       £65         £28 (prod-4)    £93       £18.60    £111.60 paid     card      2026-03-14
  inv-2   appt-9   pt-9     svc-4       £65         £0              £65       £13.00    £78.00  paid     card      2026-03-10
  inv-3   appt-12  pt-12    svc-3       £20         £16 (prod-7)    £36       £7.20     £43.20  paid     card      2026-03-05
  inv-4   appt-14  pt-14    svc-10      £110        £0              £110      £22.00    £132.00 paid     insurance 2026-03-04
  inv-5   appt-18  pt-18    svc-5       £90         £22 (prod-4)    £112      £22.40    £134.40 paid     card      2026-03-02
  inv-6   appt-20  pt-1     svc-2       £70         £12 (prod-2)    £82       £16.40    £98.40  paid     card      2025-12-10
  inv-7   appt-21  pt-20    svc-10      £110        £0              £110      £22.00    £132.00 paid     insurance 2026-02-18
  inv-8   appt-25  pt-24    svc-4       £65         £28 (prod-5)    £93       £18.60    £111.60 paid     card      2026-02-12
  inv-9   appt-30  pt-28    svc-10      £110        £0              £110      £22.00    £132.00 paid     insurance 2026-02-05
  inv-10  appt-33  pt-6     svc-7       £120        £10 (prod-10)   £130      £26.00    £156.00 paid     card      2026-03-03
  inv-11  appt-1   pt-1     svc-1       £40         £0              £40       £8.00     £48.00  unpaid   —         —
  inv-12  appt-2   pt-2     svc-2       £70         £0              £70       £14.00    £84.00  unpaid   —         —
  inv-13  appt-3   pt-3     svc-10      £110        £0              £110      £22.00    £132.00 unpaid   —         —
  inv-14  appt-5   pt-5     svc-8       £55         £18 (prod-1)    £73       £14.60    £87.60  unpaid   —         —
  inv-15  appt-13  pt-13    svc-9       £80         £42 (prod-6)    £122      £24.40    £146.40 unpaid   —         —
  inv-16  appt-29  pt-27    svc-1       £40         £0              £40       £8.00     £48.00  overdue  —         —
  inv-17  appt-35  pt-12    svc-9       £80         £16 (prod-7)    £96       £19.20    £115.20 overdue  —         —
  inv-18  appt-22  pt-21    svc-7       £120        £0              £120      £24.00    £144.00 overdue  —         —
  ... (12 more paid records for Jan-Feb — totalling monthly revenue targets)

════════════════════════════════════════════════════════════════════════════════
  FEATURE 14: REVIEWS
STATUS: DONE
════════════════════════════════════════════════════════════════════════════════

PURPOSE
  Patients leave star ratings + comments after completed appointments.
  Manager views all reviews, responds to feedback.
  Clinician detail page shows avg rating.

REVIEWS (15 records — only from completed appointments)

  id     appt     patient  clinician  stars  comment                                                        response
  ────── ──────── ──────── ─────────── ───── ──────────────────────────────────────────────────────────────── ────────────────────────────────────────────────────
  rev-1  appt-4   pt-4     cln-5       5     "Lucy was absolutely fantastic. Very thorough and explained everything about my injury in detail. I feel confident in my recovery programme."  —
  rev-2  appt-9   pt-9     cln-7       4     "Good session overall. The wait time was a little long but Amara was very helpful once we got started."  "Thank you for your feedback. We're working on reducing wait times."
  rev-3  appt-12  pt-12    svc-3 →cln-1 5   "Dr. Mitchell explained everything clearly and put me at ease. Quick and professional service."  —
  rev-4  appt-14  pt-14    cln-3       4     "Very knowledgeable cardiologist. Felt reassured after the appointment. Only minor issue was parking."  —
  rev-5  appt-18  pt-18    cln-5       5     "Excellent assessment. Lucy identified the issue immediately and outlined a clear treatment plan. Highly recommend."  —
  rev-6  appt-20  pt-1     cln-1       5     "Always a pleasure to see Dr. Mitchell. She takes the time to listen and never makes you feel rushed."  —
  rev-7  appt-21  pt-20    cln-3       3     "Doctor was professional but felt the appointment was quite rushed. Could have explained the medication changes better."  "We're sorry to hear you felt rushed. We'll ensure more time is allocated. Thank you for letting us know."
  rev-8  appt-25  pt-24    cln-5       5     "Session 4 and my shoulder is dramatically better. Lucy's approach is excellent and the exercises she gives are very manageable."  —
  rev-9  appt-30  pt-28    cln-3       4     "Professional and thorough as always. Dr. Sharma takes a holistic view of cardiac health."  —
  rev-10 appt-33  pt-6     cln-6       5     "Dr. Whitfield has been transformative for my anxiety. CBT with him has given me real tools to manage my condition."  —
  rev-11 appt-4   pt-4     cli-2       2     (second review, different angle) "The clinic facilities could be improved. Waiting room was crowded."  "Thank you for your feedback. We're renovating Q2 2026."
  rev-12 appt-9   pt-9     cln-7       4     "Dr. Diallo is clearly passionate about her patients. Very empathetic consultation."  —
  rev-13 appt-12  pt-12    cln-1       5     "Outstanding care. 5 stars without hesitation."  —
  rev-14 appt-18  pt-18    cln-5       5     "Best physio I've had. Already seeing results after 2 sessions."  —
  rev-15 appt-14  pt-14    cln-3       3     "Good clinician, but waiting 20 minutes past appointment time was frustrating."  "Apologies for the delay — we had an emergency earlier that day. Your patience is appreciated."

AVERAGE RATINGS BY CLINICIAN
  cln-1 (Mitchell):   4.8 stars (8 reviews)
  cln-3 (Sharma):     3.9 stars (5 reviews)
  cln-4 (Greaves):    4.3 stars (3 reviews)
  cln-5 (Harrington): 4.9 stars (6 reviews)
  cln-6 (Whitfield):  4.8 stars (4 reviews)
  cln-7 (Diallo):     4.2 stars (3 reviews)
  Platform average:   4.5 stars

════════════════════════════════════════════════════════════════════════════════
  FEATURE 15: VIDEO CONSULTATION
STATUS: NOT DONE
════════════════════════════════════════════════════════════════════════════════

PURPOSE
  Full-screen video call room. Patient joins from /patient/appointments.
  Clinician joins from calendar or appointment drawer.
  Waiting room state while the other party connects.

VIDEO SESSION DATA (linked to appointments with is_online=true)

  VIDEO-ENABLED APPOINTMENTS (services with is_online=true: svc-1, svc-2, svc-6, svc-7, svc-8)
    appt-1:  video_room_id=room_appt1_abc123    clinician_joined=null  patient_joined=null
    appt-2:  video_room_id=room_appt2_def456    clinician_joined=null  patient_joined=null
    appt-6:  video_room_id=room_appt6_ghi789    clinician_joined=null  patient_joined=null
    appt-17: video_room_id=room_appt17_jkl012   clinician_joined=null  patient_joined=null

  IN-SESSION MOCK STATE (simulated for demo purposes)
    clinician_connected: true
    patient_connected:   true
    call_duration_secs:  482  (8 min 2 sec)
    video_enabled:       true  (both parties)
    audio_enabled:       true  (both parties)
    screen_share_active: false

VIDEO UI STATES TO TEST
  State 1 — Waiting room (patient arrived, clinician not yet joined):
    "Waiting for Dr. Sarah Mitchell to join..."
    Patient sees: camera preview, mute/camera toggle, leave button

  State 2 — Waiting room (clinician side):
    "Alice Thompson is waiting in the room"
    Admit button visible

  State 3 — In call:
    Both video streams visible
    Controls: mute, camera toggle, screen share, end call
    Timer showing call duration

  State 4 — Call ended:
    "This session has ended."
    CTA: "Write appointment notes" (clinician) / "Leave a review" (patient)

================================================================================
  SECTION 5: END-TO-END USER JOURNEYS
STATUS: NOT DONE
================================================================================

════════════════════════════════════════════════════════════════════════════════
  JOURNEY 1: PATIENT — Complete self-service booking to post-appointment
════════════════════════════════════════════════════════════════════════════════

  ROLE: patient (u-5 / pt-1 / Alice Thompson)
  DURATION: ~15 minutes of user interaction
  FEATURES COVERED: Landing, Auth, Patient Dashboard, Booking Wizard,
                     Appointments, Video Consultation, Reviews, Messages

  STEPS:
  1.  Visit / (Landing page)
        See hero section, "How it works", clinician showcase
        Click "Find a Doctor" or "Book Now" CTA

  2.  View /doctor/cln-1 (Dr. Sarah Mitchell profile)
        See bio, speciality, languages, fee, availability calendar
        See 4.8 star rating with 8 reviews
        Click "Book with Dr. Mitchell"

  3.  Redirected to /login (not authenticated)
        Enter: patient@medibook.dev / Pat1234!
        localStorage set: medibook_token=mock_patient_token_005
        localStorage set: medibook_user={"id":"5","name":"Alice Thompson",...}

  4.  Redirect to /patient/dashboard
        See: next appointment card (upcoming appt if any)
        See: unread messages badge = 0
        See: "Book a new appointment" quick action button

  5.  Click "Book appointment" → /appointments/book
        Booking Wizard renders Step 1

  6.  Step 1 — Clinic: select Meridian Central (cli-1)
        Card shows: London · Harley Street · 3 rooms · 2 clinicians
        Click Next

  7.  Step 2 — Clinician: select Dr. Sarah Mitchell (cln-1)
        Card shows: GP · English, French · £40 · ★ 4.8
        Click Next

  8.  Step 3 — Slot & Service:
        Select service: GP Consultation (svc-1, 15 min, £40)
        Date picker: select 2026-03-20
        Available slots shown: 09:00, 09:15, 09:45, 10:00, ...
        Select 10:00
        Click Next

  9.  Step 4 — Patient Details:
        Auto-filled from Alice Thompson (pt-1) profile
        Review: name, DOB, phone, email
        Click Next

  10. Step 5 — Review & Confirm:
        Summary: Meridian Central · Dr. Mitchell · GP Consult · 20 Mar 10:00 · £40
        Click "Confirm Booking"
        → createAppointment mutation fires
        → Confetti explosion animation
        → New appointment created: appt-36 (status=pending)
        → Navigate to /patient/appointments

  11. View /patient/appointments
        List shows: appt-36 (Pending) highlighted
        appt-1 (Confirmed, 16 Mar) also visible
        Status chips colour-coded correctly

  12. Receive notification
        Bell badge increments to 1
        Click bell → NotificationPanel opens
        "Appointment confirmed — 20 March 10:00 with Dr. Mitchell"
        (status appt-36 changed from pending → confirmed by system)

  13. Day of appointment — join video call
        appt-36 card shows "Join video call" button (is_online=true)
        Click → /video/appt-36
        Waiting room: "Waiting for Dr. Sarah Mitchell..."
        Clinician joins → call starts
        8-minute consultation
        Click "End call" → post-call screen

  14. Post-appointment actions:
        Review prompt appears: "How was your appointment?"
        Select 5 stars
        Write: "Dr. Mitchell was thorough and explained everything clearly."
        Submit → rev-16 created

  15. Send follow-up message
        Navigate to /messages
        Start new thread with Dr. Mitchell
        Type: "Thank you for today. Should I still take my usual medication?"
        Send → msg-36 created in thread-9

  16. Update profile
        Navigate to /patient/profile
        Edit address: "22 Elgin Crescent, London W11 2JR"
        Save → success snackbar "Profile updated"

  EXPECTED STATE AT END OF JOURNEY:
    appt-36: status=confirmed, room=rm-1
    rev-16: stars=5, patient=pt-1, clinician=cln-1
    thread-9: 1 message, unread_by_clinician=1
    pt-1 address updated

════════════════════════════════════════════════════════════════════════════════
  JOURNEY 2: CLINICIAN — Full working day workflow
════════════════════════════════════════════════════════════════════════════════

  ROLE: clinician (u-3 / cln-1 / Dr. Sarah Mitchell)
  FEATURES COVERED: Clinician Dashboard, Calendar, Appointment Drawer,
                     Video Consultation, Patients, Availability, Messages

  STEPS:
  1.  Login as clinician@medibook.dev
        Redirect → /clinician/dashboard

  2.  Review dashboard
        Today: 6 appointments
        Next appointment: Alice Thompson 09:00 GP Consult
        Rating: 4.8 stars
        Messages: 2 unread

  3.  Open /clinician/calendar
        Day view for 2026-03-16
        See 6 colour-coded events
        Hover appt-1 → tooltip: "Alice Thompson · 09:00–09:15 · GP Consultation"

  4.  Click appt-1 event → AppointmentDrawer opens (right panel)
        Patient: Alice Thompson
        DOB: 12 Mar 1985 (age 41)
        Notes: "Mild hypertension. Taking lisinopril 5mg."
        Service: GP Consultation · rm-1 · £40
        Status: Confirmed
        Actions: [Complete] [No Show] [Cancel] [Join Video]

  5.  Click "Join Video" → /video/appt-1
        Clinician side: "Alice Thompson is waiting in the room"
        Click Admit → call starts
        Consultation runs (mock: skip to end)
        Click End Call

  6.  Back in drawer → click "Complete"
        Confirm dialog: "Mark this appointment as completed?"
        Confirm → appt-1 status = completed
        Status log entry added: u-3, completed, 09:18

  7.  View patient detail
        Click patient name in drawer → /patients/pt-1 or /clinician/patients
        See Alice's full profile
        View appointments tab → history of 4 appointments
        Add note: "BP within range today. Continue lisinopril 5mg. Review in 3 months."

  8.  Reply to message from Alice (thread-1)
        Navigate to /messages
        Open thread-1 (Alice Thompson)
        Unread: 0 (already read)
        See thread history
        Type reply: "Your blood pressure was excellent today. No changes needed."
        Send → msg-new created

  9.  Read new message from Fatima (thread-8)
        Marked urgent (unread_by_clinician=1)
        Open thread-8
        Read Fatima's palpitation concerns
        Reply: "I've seen your booking for 10am tomorrow. That's the right call.
                If symptoms worsen overnight, please go to A&E."

  10. Manage availability
        Navigate to /clinician/availability
        View current weekly template (avt-1: Mon-Fri 09:00-17:00)
        Block leave: 2026-04-14 to 2026-04-18 (Easter)
        → lv-1 created
        Confirmation: "Leave block saved. Affected appointments: 0"

  11. End of day — review calendar
        /clinician/calendar week view
        Count: 5 completed, 1 confirmed (appt-6 at 14:00)
        appt-6 status still pending (patient hasn't arrived yet)
        Mark appt-6 no_show at 14:20 (no arrival)
        → appt-6 status = no_show

  EXPECTED STATE AT END OF JOURNEY:
    appt-1: status=completed
    appt-6: status=no_show
    pt-1 notes updated
    thread-1: 1 new message from clinician
    thread-8: 1 new message from clinician
    lv-1: 2026-04-14 to 2026-04-18 created

════════════════════════════════════════════════════════════════════════════════
  JOURNEY 3: STAFF/RECEPTIONIST — Front desk daily operations
════════════════════════════════════════════════════════════════════════════════

  ROLE: staff (u-4 / receptionist@medibook.dev)
  FEATURES COVERED: Staff Dashboard, Appointments, Patients, Booking Wizard

  STEPS:
  1.  Login as receptionist@medibook.dev → /staff/dashboard
        See today's appointments list (12 total)
        Appointment queue: ordered by time

  2.  9:00 — Check in Alice Thompson for appt-1
        Find appt-1 in list
        Open drawer → confirm patient details
        Click "Mark Arrived" (status stays confirmed, internal check-in flag)

  3.  9:20 — Walk-in patient arrives (new patient)
        Click "New Patient" → /patients/new
        Enter: Patrick O'Brien / 1975-04-22 / +44 7700 900018 / patrick.obrien@eircom.net
        Note: "Walk-in, presenting with back pain"
        Save → pt-18 created (already exists in our data — verify or use pt-31 new)

  4.  Book appointment for walk-in
        Click "Book Appointment" → /appointments/book
        Step 1: cli-1 (Meridian Central)
        Step 2: cln-1 (Dr. Mitchell — only available clinician)
        Step 3: check today's slots → 11:30 available
        Step 4: search patient → "Patrick O'Brien" → select pt-18
        Step 5: confirm → appt-37 created (status=pending → confirmed)

  5.  10:00 — Handle cancellation (appt-3, Fatima Al-Hassan)
        Phone call: Fatima can't make it
        Find appt-3 in appointments list
        Open drawer → click Cancel
        Select reason: "Patient request"
        Click Confirm → appt-3 status = cancelled
        Cancellation email sent (mock notification)

  6.  11:00 — Reschedule request (Charles Beaumont, appt-8 already cancelled)
        Patient calls requesting new appointment
        Search appointments for "Charles Beaumont" → see appt-8 cancelled
        Book new → /appointments/book
        Select cln-2 (Okafor), cli-5 (Wellspring - closer to patient)
        Next available: 2026-03-18 09:00
        Book → appt-38 created

  7.  14:00 — No-show (appt-6, Dmitri Volkov)
        14:20: patient hasn't arrived
        Open appt-6 drawer → click "No Show"
        Confirm → status = no_show
        Auto-notification sent to patient

  8.  End of day — check tomorrow's schedule
        Filter appointments by date 2026-03-17
        3 appointments: appt-10, appt-15 (pending = needs confirmation)
        Call pt-7 (Oliver Bennett's guardian) to confirm appt-10 → mark confirmed
        Call pt-15 (Amelia Foster's guardian) → confirmed → mark confirmed

  EXPECTED STATE AT END OF JOURNEY:
    appt-3: status=cancelled, reason="Patient request"
    appt-6: status=no_show
    appt-10, appt-15: status=confirmed
    appt-37: new booking for walk-in patient
    appt-38: rescheduled for Charles Beaumont

════════════════════════════════════════════════════════════════════════════════
  JOURNEY 4: MANAGER — Clinic setup and operations
════════════════════════════════════════════════════════════════════════════════

  ROLE: manager (u-2 / manager@medibook.dev / org-1, cli-1)
  FEATURES COVERED: Manager Dashboard, Clinics, Rooms, Services, Products,
                     Availability Blocks, Billing, Reviews, Analytics

  STEPS:
  1.  Login as manager@medibook.dev → /manager/dashboard
        KPIs: 12 today, £18,450 month, 87.5% utilisation (cln-1)
        Charts: volume by day (30 days), service breakdown pie

  2.  Create new clinic branch
        Navigate to /manager/clinics → click "Add Clinic"
        /manager/clinics/new
        Fill: "Meridian South" · org-1 · "12 Victoria Street, London SW1H 0NB"
        Timezone: Europe/London · phone: 020 7946 0600
        Save → cli-6 created

  3.  Add rooms to new clinic
        Navigate to cli-6 detail page
        Click "Add Room" → /manager/rooms/new
        Room 1: "Consultation A" · rt-1 · capacity 2 · floor 1 → rm-13
        Room 2: "Procedure Room" · rt-2 · capacity 3 · floor 1 → rm-14
        Both saved and appear in clinic detail

  4.  Create new service
        /manager/services/new
        Name: "Full Health MOT" · duration: 90 min · price: £180
        Clinic: cli-6 · is_online: false · is_active: true
        Assign clinicians: none yet (to be assigned when clinicians onboarded)
        Save → svc-13 created

  5.  Create product for new clinic
        /manager/products/new
        Name: "Multivitamin Complex" · category: supplement · price: £14 · stock: 100
        SKU: MVC-001 · clinic: cli-6
        Save → prod-11 created

  6.  Block clinic availability for Easter
        /manager/blocks → click "Add Block"
        Clinic: cli-1 · Title: "Easter Bank Holiday" · 2026-04-03 to 2026-04-06
        Type: holiday · Save → blk-1 confirmed
        Calendar preview shows 4 blocked days

  7.  Review and respond to reviews
        /reviews
        Filter: 3-star and below → 3 results (rev-7, rev-11, rev-15)
        Click rev-7 (patient: William Blackwood, Dr. Sharma)
        Manager types response: "We're sorry you felt rushed..."
        Submit → response saved

  8.  Analyse finances
        /finances
        Date range: March 2026
        Total revenue: £18,450
        Unpaid invoices: 7 (total £580 outstanding)
        Click "Export CSV" → download invoked

  9.  Analytics deep-dive
        /analytics
        No-show rate chart: 8.5% this month vs 12.1% January (improvement)
        Utilisation heat map: Monday worst (cln-1 80%), Friday best (cln-1 93%)
        Revenue by service bar chart: CBT #1 at £2,640
        Flag: cln-8 (Curtis) 66.7% utilisation — lowest → review staffing

  EXPECTED STATE AT END OF JOURNEY:
    cli-6: created (Meridian South)
    rm-13, rm-14: created for cli-6
    svc-13: created (Full Health MOT)
    prod-11: created
    blk-1: Easter block confirmed
    rev-7: manager response saved

════════════════════════════════════════════════════════════════════════════════
  JOURNEY 5: ADMIN — Platform administration
════════════════════════════════════════════════════════════════════════════════

  ROLE: admin (u-1 / admin@medibook.dev)
  FEATURES COVERED: Dashboard, Admin Users, Organisations, Clinician Types,
                     Room Types, Languages, Email Templates, Roles, Policies

  STEPS:
  1.  Login as admin@medibook.dev → /dashboard
        Platform-wide view: 3 orgs, 5 clinics, 10 clinicians, 127 patients

  2.  Create new organisation
        /admin/organizations → "Add Organisation"
        Name: "PrimeCare Network" · slug: primecare · plan: pro
        Contact: info@primecare.co.uk · Phone: 0800 946 0001
        Save → org-4 created

  3.  Create manager user for new org
        /admin/users/new
        Name: "Rachel Green" · email: rachel.green@primecare.co.uk
        Role: manager · Organisation: PrimeCare Network (org-4)
        Temporary password generated → email sent
        → u-8 created

  4.  Add new clinician type
        /admin/clinician-types → "Add Type"
        Name: "Osteopath"
        Description: "Musculoskeletal assessment and manipulation therapy"
        Save → ct-7 created

  5.  Add new room type
        /admin/room-types → "Add Type"
        Name: "Imaging Suite"
        Description: "Ultrasound and diagnostic imaging room"
        Save → rt-6 created

  6.  Add new language
        /admin/languages → "Add Language"
        Code: tr · Name: Turkish
        Save → lang-9 created

  7.  Create email template
        /admin/email-templates → "Add Template"
        Type: appointment_reminder
        Subject: "Reminder: Your appointment tomorrow at {{time}}"
        Body: HTML with patient name, clinician, date, clinic address, cancel link
        Preview renders correctly
        Save → template saved

  8.  Review roles and permissions
        /admin/roles
        View role matrix: admin, manager, clinician, staff, patient
        Permissions grid: can_create_clinic, can_view_all_patients, etc.
        Add permission "can_export_analytics" to manager role
        Save → policy updated

  9.  Review platform communications settings
        /admin/communications
        SMS enabled: true
        Email enabled: true
        Appointment reminder lead time: 24 hours
        No-show follow-up: enabled, 2-hour delay
        Toggle: patient_can_cancel_within: 24 hours of appointment
        Save settings

  EXPECTED STATE AT END OF JOURNEY:
    org-4: PrimeCare Network created
    u-8: Rachel Green (manager) created
    ct-7: Osteopath clinician type added
    rt-6: Imaging Suite room type added
    lang-9: Turkish added
    Email template: appointment_reminder updated
    manager role: can_export_analytics permission added

================================================================================
  SECTION 6: COPY-READY PROMPTS (one per feature)
STATUS: NOT DONE
================================================================================

────────────────────────────────────────────────────────────────────────────────
PROMPT 1: Foundation Seed Data
────────────────────────────────────────────────────────────────────────────────
Generate a complete JavaScript seed data file for a healthcare clinic management
platform called MediBook. The platform is multi-tenant with multiple organisations.

Include the following entities as exported JavaScript arrays/objects:

1. LANGUAGES (8 records): English (en), French (fr), Urdu (ur), Mandarin (zh),
   Polish (pl), Arabic (ar), Hindi (hi), Portuguese (pt)

2. CLINICIAN_TYPES (6 records): General Practitioner, Cardiologist, Dermatologist,
   Physiotherapist, Psychiatrist, Paediatrician — each with id (ct-1 to ct-6),
   name, and description.

3. ROOM_TYPES (5 records): Consultation, Procedure, Therapy, Paediatric, Waiting
   — each with id (rt-1 to rt-5), name, and description.

4. ORGANISATIONS (3 records):
   - org-1: Meridian Health Group, slug=meridian, plan=enterprise, 3 clinics
   - org-2: CityCore Medical, slug=citycore, plan=pro, 1 clinic
   - org-3: Wellspring Clinic, slug=wellspring, plan=starter, 1 clinic

5. CLINICS (5 records) with full UK addresses:
   - cli-1: Meridian Central, London W1G 9PH, org-1
   - cli-2: Meridian East, Manchester M2 3JF, org-1
   - cli-3: Meridian North, Edinburgh EH2 1JE, org-1
   - cli-4: CityCore West End, London W1G 8YL, org-2
   - cli-5: Wellspring Primary, Bristol BS1 5NB, org-3
   Each needs: id, name, org_id, city, address, postcode, phone, email, timezone,
   opening_hours (object with mon-sun), created_at.

6. ROOMS (12 records, 2-3 per clinic):
   IDs rm-1 to rm-12, each with clinic_id, name, room_type_id, capacity, floor,
   is_active, created_at.

7. ROLES (5 records): super_admin, admin, manager, clinician, staff
   Each with id, name, display_name, and permissions array.

8. USERS (7 records) with mock credentials:
   admin@medibook.dev (admin, super_admin), manager@medibook.dev (manager, org-1),
   clinician@medibook.dev (clinician, cln-1), receptionist@medibook.dev (staff, cli-1),
   patient@medibook.dev (patient, pt-1), dr.okafor@medibook.dev (clinician, cln-2),
   manager2@medibook.dev (manager, org-2)

Format as: export const SEED_DATA = { languages, clinicianTypes, roomTypes,
organisations, clinics, rooms, roles, users }
Use consistent ID patterns (org-1, cli-1, rm-1, u-1) throughout.

────────────────────────────────────────────────────────────────────────────────
PROMPT 2: Clinicians Mock Data (10 records)
────────────────────────────────────────────────────────────────────────────────
Generate 10 clinician records for MediBook as a JSON array. Each clinician
object must include ALL of these fields:

  id:               string (cln-1 to cln-10)
  first_name:       string
  last_name:        string
  full_name:        string (prefixed with Dr. or professional title where applicable)
  bio:              string (3 sentences — qualifications, speciality, approach)
  avatar_url:       string (use https://i.pravatar.cc/150?img=N where N is 1-60)
  consultation_fee: number (in GBP, integer)
  is_active:        boolean (9 true, 1 false — cln-10 is inactive)
  gender:           "M" | "F"
  languages:        array of language codes from [en, fr, ur, zh, pl, ar, hi, pt]
  clinician_type:   { id: "ct-N", name: string }
  clinics:          array of { id: "cli-N", name: string }
  services:         array of { id: "svc-N", name: string, duration_minutes: number, price: number }
  availability_templates: array (at least one per active clinician)

Distribution requirements:
  4 GPs (cln-1, cln-2, cln-7, cln-9) → clinician_type ct-1
  1 Cardiologist (cln-3) → ct-2
  1 Dermatologist (cln-4) → ct-3
  1 Physiotherapist (cln-5) → ct-4
  2 Psychiatrists (cln-6, cln-10) → ct-5
  1 Paediatrician (cln-8) → ct-6

Clinic assignments:
  cln-1: cli-1 only | cln-2: cli-1 and cli-5 | cln-3: cli-4 | cln-4: cli-4
  cln-5: cli-2 | cln-6: cli-3 | cln-7: cli-2 | cln-8: cli-5 | cln-9: cli-3
  cln-10: cli-3 (inactive)

Specific names to use:
  cln-1: Dr. Sarah Mitchell (F), cln-2: Dr. James Okafor (M),
  cln-3: Dr. Priya Sharma (F), cln-4: Dr. Tom Greaves (M),
  cln-5: Lucy Harrington (F), cln-6: Dr. Ben Whitfield (M),
  cln-7: Dr. Amara Diallo (F), cln-8: Dr. Emma Curtis (F),
  cln-9: Dr. Raj Patel (M), cln-10: Dr. Helena Kowalski (F)

Return as: export const CLINICIANS = [...]

────────────────────────────────────────────────────────────────────────────────
PROMPT 3: Patients Mock Data (30 records)
────────────────────────────────────────────────────────────────────────────────
Generate 30 patient records for MediBook as a JSON array.

Each patient object must include:
  id:          string (pt-1 to pt-30)
  first_name:  string
  last_name:   string
  full_name:   string
  email:       string (realistic email addresses, firstname.lastname@domain.com pattern)
  phone:       string (UK mobile format: +44 7700 9XXXXX)
  date_of_birth: string (ISO format YYYY-MM-DD)
  gender:      "M" | "F"
  address:     string (full UK address including postcode)
  notes:       string | null (clinical notes on 15 records, null on 15)
  created_at:  string (ISO datetime, spread over last 18 months)

Patient name requirements (pt-1 to pt-15 must match exactly):
  pt-1: Alice Thompson (F, 1985-03-12), pt-2: Marcus Chen (M, 1990-07-25),
  pt-3: Fatima Al-Hassan (F, 1978-11-04), pt-4: George Williams (M, 1962-05-18),
  pt-5: Sophie Turner (F, 1995-09-30), pt-6: Dmitri Volkov (M, 1988-02-14),
  pt-7: Ngozi Adeyemi (F, 2001-06-22), pt-8: Charles Beaumont (M, 1955-12-01),
  pt-9: Mei-Lin Zhang (F, 1993-04-09), pt-10: Oliver Bennett (M, 2015-08-17),
  pt-11: Ingrid Larsson (F, 1972-01-28), pt-12: Hassan Malik (M, 1983-10-05),
  pt-13: Chloe Parker (F, 1997-07-14), pt-14: Roberto Silva (M, 1968-03-20),
  pt-15: Amelia Foster (F, 2010-11-11)

pt-16 to pt-30: generate diverse, realistic names reflecting multicultural UK.
Age range: 3 to 78 years old. Include 3 paediatric patients (under 16).

Clinical notes to include on these patients:
  pt-1: hypertension + lisinopril
  pt-2: asthma + salbutamol
  pt-3: type 2 diabetes + metformin
  pt-4: post-MI 2019 + statins
  pt-6: anxiety disorder + CBT
  pt-8: COPD + ex-smoker
  pt-11: lower back pain + physiotherapy
  pt-12: eczema + dermatology
  pt-14: knee replacement 2021 + physio maintenance
  pt-20: multi-morbidity (T2DM, hypertension, AF)
  (generate realistic notes for pt-21 to pt-25 as well)

Return as: export const PATIENTS = [...]

────────────────────────────────────────────────────────────────────────────────
PROMPT 4: Appointments Mock Data (35 records)
────────────────────────────────────────────────────────────────────────────────
Generate 35 appointment records for MediBook covering 2026-01-01 to 2026-03-25.

Each appointment must include:
  id:                  string (appt-1 to appt-35)
  tenant_id:           "meridian"
  start_datetime:      ISO datetime string
  end_datetime:        start_datetime + service duration_minutes
  duration_minutes:    number (must match service)
  status:              "confirmed" | "completed" | "pending" | "cancelled" | "no_show"
  notes:               string | null (present on ~60% of records)
  cancellation_reason: string | null (only on cancelled — use realistic reasons)
  reminder_sent_at:    ISO datetime | null (set for confirmed and completed)
  created_at:          ISO datetime
  updated_at:          ISO datetime
  patient:             { id, first_name, last_name, full_name, email, phone, date_of_birth, gender }
  clinician:           { id, first_name, last_name, full_name, avatar_url, clinician_type: { id, name } }
  clinic:              { id, name, address, city, timezone }
  room:                { id, name }
  service:             { id, name, duration_minutes, price }
  booked_by_user:      { id, name }
  status_logs:         array of { id, status, reason, created_at, changed_by_user: { id, name } }

Status distribution (enforce exactly):
  confirmed: 15 records (all with start_datetime AFTER 2026-03-15)
  completed: 8 records (all with start_datetime BEFORE 2026-03-15)
  cancelled: 4 records (spread across date range)
  no_show:   3 records
  pending:   5 records (all AFTER 2026-03-15)

Referential integrity rules (enforce all):
  - Each patient references pt-1 through pt-30
  - Each clinician references cln-1 through cln-10
  - Room must belong to the same clinic as the clinician
  - Service must belong to the same clinic as the room
  - No double-booking: same clinician, overlapping time range = invalid
  - No double-booking: same room, overlapping time range = invalid
  - All completed appointments must have at least 2 status_log entries
  - Each cancelled appointment must have cancellation_reason set

Ensure appt-1 through appt-15 match these specific records exactly:
  [list the 15 specific appointments from Section 4, Feature 6 of this document]

Return as: export const APPOINTMENTS = [...]

────────────────────────────────────────────────────────────────────────────────
PROMPT 5: Services & Products Mock Data
────────────────────────────────────────────────────────────────────────────────
Generate mock data for MediBook services (12 records) and products (10 records).

SERVICES — each needs:
  id:                string (svc-1 to svc-12)
  name:              string
  description:       string (2–3 sentences, patient-facing language)
  duration_minutes:  number (10, 15, 20, 30, 40, 45, 50, 60, 90)
  price:             number (GBP integer)
  clinic:            { id, name }
  is_active:         boolean (all true)
  is_online:         boolean (true for: svc-1, svc-2, svc-6, svc-7, svc-8)
  max_advance_days:  number (30–90)
  assigned_clinicians: array of { id, full_name }
  bookings_this_month: number

Use these exact services:
  svc-1: GP Consultation 15min £40 cli-1 → cln-1, cln-2
  svc-2: Extended GP Consultation 30min £70 cli-1 → cln-1, cln-2
  svc-3: Blood Pressure Check 10min £20 cli-1 → cln-1, cln-2
  svc-4: Physiotherapy Session 45min £65 cli-2 → cln-5, cln-7
  svc-5: Sports Injury Assessment 60min £90 cli-2 → cln-5
  svc-6: Psychiatry Initial Consult 60min £150 cli-3 → cln-6, cln-9
  svc-7: CBT Session 50min £120 cli-3 → cln-6, cln-10
  svc-8: Skin Consultation 20min £55 cli-4 → cln-4
  svc-9: Acne Treatment 30min £80 cli-4 → cln-4
  svc-10: Cardio Assessment 40min £110 cli-4 → cln-3
  svc-11: Child Well-check 20min £35 cli-5 → cln-8
  svc-12: Vaccination Appointment 10min £25 cli-5 → cln-8

PRODUCTS — each needs:
  id:          string (prod-1 to prod-10)
  name:        string
  description: string (1–2 sentences)
  price:       number (GBP)
  category:    "supplement" | "equipment" | "skincare"
  sku:         string (e.g. SPF50-001)
  stock_quantity: number (20–200)
  is_active:   boolean (all true)
  clinic:      { id, name }

Products must logically match their clinic's specialty:
  cli-4 (Dermatology): SPF sunscreen, retinol cream, salicylic cleanser
  cli-1 (GP): vitamin D, omega-3, peak flow meter, blood pressure cuff
  cli-2 (Physio): resistance band set, foam roller
  cli-3 (Psychiatry): melatonin supplement

Return as: export const SERVICES = [...]; export const PRODUCTS = [...]

────────────────────────────────────────────────────────────────────────────────
PROMPT 6: Availability Mock Data
────────────────────────────────────────────────────────────────────────────────
Generate availability mock data for MediBook covering templates and blocks.

AVAILABILITY TEMPLATES (10 records — one per clinician):
  Each record needs:
    id:            string (avt-1 to avt-10)
    clinician_id:  string (cln-1 to cln-10)
    days_of_week:  array of integers [1-7] where 1=Monday, 7=Sunday
    start_time:    string (HH:MM, 24hr)
    end_time:      string (HH:MM, 24hr)
    break_start:   string (HH:MM) | null
    break_end:     string (HH:MM) | null
    slot_duration_minutes: number (matches clinician's service duration)
    is_active:     boolean

Use these exact templates:
  avt-1: cln-1 Mitchell, Mon-Fri [1,2,3,4,5], 09:00-17:00, lunch 13:00-14:00, 15min
  avt-2: cln-2 Okafor, Mon+Wed+Fri [1,3,5], 08:30-16:30, lunch 12:30-13:30, 15min
  avt-3: cln-3 Sharma, Tue+Thu [2,4], 10:00-18:00, lunch 13:00-14:00, 40min
  avt-4: cln-4 Greaves, Mon-Thu [1,2,3,4], 09:00-16:00, lunch 12:00-13:00, 20min
  avt-5: cln-5 Harrington, Mon-Fri [1,2,3,4,5], 08:00-16:00, lunch 12:00-13:00, 45min
  avt-6: cln-6 Whitfield, Mon+Tue+Thu [1,2,4], 09:00-17:00, lunch 13:00-14:00, 60min
  avt-7: cln-7 Diallo, Mon-Fri [1,2,3,4,5], 08:30-17:30, lunch 12:00-13:00, 15min
  avt-8: cln-8 Curtis, Mon-Fri [1,2,3,4,5], 09:00-15:00, lunch 12:00-12:30, 20min
  avt-9: cln-9 Patel, Tue-Fri [2,3,4,5], 10:00-18:00, lunch 13:00-14:00, 15min
  avt-10: cln-10 Kowalski, is_active=false, all other fields null

INDIVIDUAL LEAVE BLOCKS (8 records — clinician-level):
  Each record needs:
    id:            string (lv-1 to lv-8)
    clinician_id:  string
    clinic_id:     string (clinician's home clinic)
    start_date:    string (YYYY-MM-DD)
    end_date:      string (YYYY-MM-DD)
    reason:        string
    type:          "leave" | "sick" | "training" | "admin" | "personal"
    created_by:    user id

CLINIC-LEVEL AVAILABILITY BLOCKS (8 records):
  Each record needs:
    id:         string (blk-1 to blk-8)
    clinic_id:  string
    title:      string
    start_date: string
    end_date:   string
    type:       "holiday" | "admin" | "training"
    all_day:    boolean (true for all)
    created_by: user id

Return as: export const AVAILABILITY = { templates, leaveBlocks, clinicBlocks }

────────────────────────────────────────────────────────────────────────────────
PROMPT 7: Reviews Mock Data (15 records)
────────────────────────────────────────────────────────────────────────────────
Generate 15 patient review records for MediBook. Reviews can only be created
for appointments with status = "completed".

Each review needs:
  id:                string (rev-1 to rev-15)
  appointment_id:    string (must reference a completed appointment)
  patient_id:        string
  patient_name:      string
  clinician_id:      string
  clinician_name:    string
  stars:             integer (1–5)
  comment:           string (2–5 sentences of authentic patient feedback)
  created_at:        ISO datetime (after appointment end_datetime)
  manager_response:  string | null (response from clinic manager)
  manager_responded_at: ISO datetime | null

Star distribution requirements:
  5 stars: 7 reviews
  4 stars: 4 reviews
  3 stars: 3 reviews
  2 stars: 1 review

This must result in these average ratings per clinician:
  cln-1 (Mitchell):   4.8 avg (appears in 3+ reviews)
  cln-3 (Sharma):     3.9 avg (mixed feedback)
  cln-5 (Harrington): 4.9 avg (excellent physio)
  cln-6 (Whitfield):  4.8 avg
  cln-7 (Diallo):     4.2 avg

Manager responses must be present on all 3-star and below reviews.
Responses should be professional, empathetic, and solution-oriented.

Completed appointments to use (status=completed):
  appt-4, appt-9, appt-12, appt-14, appt-18, appt-20, appt-21,
  appt-25, appt-30, appt-33 (plus generate 5 more past completed appointments
  appt-36 through appt-40 with dates in Jan-Feb 2026 for additional reviews)

Return as: export const REVIEWS = [...]

────────────────────────────────────────────────────────────────────────────────
PROMPT 8: Messages & Notifications Mock Data
────────────────────────────────────────────────────────────────────────────────
Generate mock messaging and notification data for MediBook.

THREADS (8 conversation threads):
  Each thread needs:
    id:            string (thread-1 to thread-8)
    participants:  array [{ user_id, name, role, entity_id }]
    subject:       string (brief topic, used in thread list)
    created_at:    ISO datetime
    last_message_at: ISO datetime
    unread_count:  { [user_id]: number }

MESSAGES (35 total, 3–6 per thread):
  Each message needs:
    id:          string (msg-1 to msg-35)
    thread_id:   string
    sender_id:   string (user id)
    sender_name: string
    sender_role: "patient" | "clinician" | "staff"
    content:     string (realistic clinical or administrative communication)
    created_at:  ISO datetime
    is_read:     boolean
    read_at:     ISO datetime | null

Thread requirements:
  thread-1: pt-1 (Alice) ↔ cln-1 (Mitchell) — 5 messages, last is from patient
  thread-2: pt-6 (Dmitri) ↔ cln-6 (Whitfield) — 4 messages, 1 unread
  thread-3: pt-12 (Hassan) ↔ cln-4 (Greaves) — 3 messages, prescription request
  thread-4: pt-5 (Sophie) ↔ cln-4 (Greaves) — 3 messages, appointment confirmation
  thread-5: pt-9 (Mei-Lin) ↔ cln-7 (Diallo) — 5 messages, rebooking request
  thread-6: pt-11 (Ingrid) ↔ cln-5 (Harrington) — 4 messages, 2 unread (clinician)
  thread-7: pt-14 (Roberto) ↔ cln-3 (Sharma) — 6 messages, medication query
  thread-8: pt-3 (Fatima) ↔ cln-3 (Sharma) — 5 messages, urgent (palpitations)

Message tone guidelines:
  Patients: informal, anxious, grateful, practical questions
  Clinicians: professional, reassuring, clear instructions, appropriate medical info
  No diagnosis or prescriptions via message — clinicians escalate to appointment

NOTIFICATIONS (20 records for clinician user u-3):
  Each notification needs:
    id:          string (notif-1 to notif-20)
    user_id:     "u-3"
    type:        "appointment_confirmed" | "appointment_cancelled" | "appointment_reminder"
                 | "new_message" | "review_received" | "system"
    title:       string (short, push-notification style)
    body:        string (slightly longer detail)
    is_read:     boolean (12 read, 8 unread)
    created_at:  ISO datetime (spread over last 7 days)
    action_url:  string ("/appointments/:id" or "/messages" or "/reviews")

Type distribution: 6 confirmed, 5 reminder, 4 new_message, 2 cancelled, 2 review, 1 system

Return as: export const MESSAGES = { threads, messages, notifications }

────────────────────────────────────────────────────────────────────────────────
PROMPT 9: Finance & Billing Mock Data (30 records)
────────────────────────────────────────────────────────────────────────────────
Generate 30 invoice records for MediBook's billing/finance module.

Each invoice needs:
  id:              string (inv-1 to inv-30)
  appointment_id:  string (references appt- records)
  patient_id:      string
  patient_name:    string
  clinician_id:    string
  clinician_name:  string
  clinic_id:       string
  service_name:    string
  service_price:   number (GBP)
  product_items:   array of { product_id, name, price, quantity } | [] (on 8 invoices)
  subtotal:        number (service_price + sum of product items)
  tax_amount:      number (subtotal × 0.20, rounded to 2dp)
  total:           number (subtotal + tax_amount)
  status:          "paid" | "unpaid" | "overdue"
  payment_method:  "card" | "cash" | "insurance" | null
  issued_at:       ISO datetime
  due_date:        ISO date (issued_at + 14 days)
  paid_at:         ISO datetime | null

Status distribution:
  paid: 20 invoices (across Jan-Mar 2026)
  unpaid: 7 invoices (issued within last 14 days — not yet overdue)
  overdue: 3 invoices (due_date in the past, still unpaid)

Monthly totals must match:
  January 2026:  8 invoices, total £14,200 paid
  February 2026: 10 invoices, total £16,800 paid
  March 2026:    12 invoices (partial month), ~£18,450 revenue across all statuses

Revenue breakdown to generate separately:
  revenue_by_service: array of { service_name, total_revenue, appointment_count }
  revenue_by_clinician: array of { clinician_id, clinician_name, total_revenue, appointment_count }
  monthly_summary: array of { month, total_revenue, paid_count, unpaid_count, overdue_count }

Ensure product_items on inv-1, inv-3, inv-5, inv-6, inv-8, inv-10, inv-14, inv-15
(use relevant products from prod-1 to prod-10 matching the clinic's specialty).

Return as: export const BILLING = { invoices, revenueByService, revenueByClinician, monthlySummary }

────────────────────────────────────────────────────────────────────────────────
PROMPT 10: Dashboard Mock Data (all KPIs and charts)
────────────────────────────────────────────────────────────────────────────────
Generate the complete mock response for MediBook's DASHBOARD_QUERY GraphQL query.
This query returns a single 'dashboard' object.

The dashboard object must include ALL of these fields:

Scalar KPIs:
  total_appointments_today: 12
  total_appointments_today_change: 3
  total_appointments_week: 67
  total_appointments_month: 284
  total_clinicians: 10
  total_clinicians_change: 1
  total_patients: 127
  total_patients_change: 8
  total_revenue_month: 18450
  total_revenue_month_change: 12.3
  no_show_rate: 8.5

upcoming_appointments (array of 5 — next scheduled):
  Each: { id, start_datetime, end_datetime, status, patient: {id, full_name},
          clinician: {id, full_name}, service: {id, name} }
  Use appt-1, appt-2, appt-3, appt-5, appt-6

utilisation_by_clinician (array — all 9 active clinicians):
  Each: { clinician: {id, full_name, avatar_url, clinician_type: {name}},
          slots_available, slots_booked, utilisation_percent }
  Values: Mitchell 87.5%, Okafor 75%, Sharma 87.5%, Greaves 79.2%,
          Harrington 78.1%, Whitfield 75%, Diallo 77.5%, Curtis 66.7%, Patel 68.8%

volume_by_day (array — last 30 days from 2026-02-14 to 2026-03-15):
  Each: { date, confirmed_count, cancelled_count }
  Pattern: weekdays: confirmed 8-15 (peak Tue-Thu), cancelled 0-2
           weekends: confirmed 0-3, cancelled 0
  Include authentic variance — not perfectly uniform

bookings_by_service (array — all 12 services):
  Each: { service_name, count }
  Total counts must sum to at least 284 (matches total_appointments_month)
  Top 3: GP Consultation (68), CBT Session (22), Physiotherapy (28)

Return as a JavaScript object:
  export const DASHBOARD_DATA = { dashboard: { ...all fields above } }

This object should be importable as a mock Apollo Client response.

────────────────────────────────────────────────────────────────────────────────
PROMPT 11: Complete GraphQL Mock Handler
────────────────────────────────────────────────────────────────────────────────
Create a complete Apollo Client mock handler for MediBook that intercepts all
GraphQL queries and returns the seed data. The handler should use Apollo's
MockedProvider pattern.

Queries to mock (return the corresponding seed data):
  - DASHBOARD_QUERY → DASHBOARD_DATA.dashboard
  - APPOINTMENTS_QUERY (with any filters) → APPOINTMENTS filtered by input
  - APPOINTMENT_DETAIL_QUERY ($id) → find appointment by id
  - CLINICIANS_QUERY → CLINICIANS array (supports search filter)
  - CLINICIAN_DETAIL_QUERY ($id) → find clinician by id
  - PATIENTS_QUERY → PATIENTS array (supports search filter)
  - PATIENT_DETAIL_QUERY ($id) → find patient by id
  - CLINICS_QUERY → CLINICS array
  - CLINIC_DETAIL_QUERY ($id) → find clinic by id
  - SERVICES_QUERY → SERVICES array (filtered by clinic_id if provided)
  - ROOMS_QUERY → ROOMS array (filtered by clinic_id if provided)
  - AVAILABLE_SLOTS_QUERY → generate slots from AVAILABILITY templates

Mutations to mock (return success responses):
  - CREATE_APPOINTMENT_MUTATION → return new appointment with generated id
  - CANCEL_APPOINTMENT_MUTATION → return appointment with status=cancelled
  - COMPLETE_APPOINTMENT_MUTATION → return appointment with status=completed
  - MARK_NO_SHOW_MUTATION → return appointment with status=no_show
  - CREATE_PATIENT_MUTATION → return new patient with generated id
  - UPDATE_PATIENT_MUTATION → return updated patient
  - CREATE_CLINICIAN_MUTATION → return new clinician
  - LOGIN_MUTATION → return { token: "mock_token", user: matchingUser }

Include realistic network delay simulation (200-800ms random).
Export as: export const createMockApolloClient = () => new ApolloClient({ ... })

Also export: export const mocks = [...] (array for MockedProvider)

================================================================================
  APPENDIX: QUICK REFERENCE — ALL IDs
================================================================================

  ORGANISATIONS:  org-1, org-2, org-3
  CLINICS:        cli-1 to cli-5
  ROOMS:          rm-1 to rm-12
  CLINICIAN TYPES: ct-1 to ct-6
  ROOM TYPES:     rt-1 to rt-5
  LANGUAGES:      lang-1 to lang-8
  CLINICIANS:     cln-1 to cln-10
  AVAIL TEMPLATES: avt-1 to avt-10
  LEAVE BLOCKS:   lv-1 to lv-8
  CLINIC BLOCKS:  blk-1 to blk-8
  PATIENTS:       pt-1 to pt-30
  APPOINTMENTS:   appt-1 to appt-35
  SERVICES:       svc-1 to svc-12
  PRODUCTS:       prod-1 to prod-10
  INVOICES:       inv-1 to inv-30
  REVIEWS:        rev-1 to rev-15
  MESSAGES:       msg-1 to msg-35
  THREADS:        thread-1 to thread-8
  NOTIFICATIONS:  notif-1 to notif-20
  USERS:          u-1 to u-8
  ROLES:          super_admin, admin, manager, clinician, staff, patient

  TOTAL MOCK RECORDS: 342+

================================================================================
  END OF DOCUMENT
================================================================================