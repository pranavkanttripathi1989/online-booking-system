# HealthSync — Complete Frontend Implementation Plan

> **9 Phases · 24 Screens · 21 AG Prompts · End-to-End User Journeys**
>
> Stack: React JSX · MUI v5 · Apollo GraphQL · Supabase · Stripe · WebRTC
> Theme: Medical Teal `#006D77` · Coral `#E29578` · Plus Jakarta Sans

---

## Table of Contents

1. [Current State Audit](#1-current-state-audit)
2. [Database → Screen Model Map](#2-database-model--screen-map)
3. [Complete User Journeys](#3-end-to-end-user-journeys)
4. [Phase 1 — Foundation: Theme, Auth & Shell](#phase-1--foundation-theme-auth--shell)
5. [Phase 2 — Patient Portal: Landing & Doctor Profile](#phase-2--patient-portal-landing--doctor-profile)
6. [Phase 3 — Booking Flow & Payments](#phase-3--booking-flow--payments)
7. [Phase 4 — Patient Dashboard & Video Consultation](#phase-4--patient-dashboard--video-consultation)
8. [Phase 5 — Clinician Portal](#phase-5--clinician-portal)
9. [Phase 6 — Staff & Receptionist Portal](#phase-6--staff--receptionist-portal)
10. [Phase 7 — Manager & Analytics Portal](#phase-7--manager--analytics-portal)
11. [Phase 8 — Admin Panel](#phase-8--admin-panel)
12. [Phase 9 — Polish & Refactor](#phase-9--polish--refactor)
13. [File Structure](#file-structure)
14. [GraphQL API Reference](#graphql-api-reference)

---

## 1. Current State Audit

### ✅ Already Built (Phase 1 complete)

| Component | File | Status |
|---|---|---|
| MUI Theme | `src/theme/index.js` | ✅ Done |
| Login (3-tab auth) | `src/pages/Login.jsx` | ✅ Done |
| AppShell (drawer+nav) | `src/layouts/AppShell.jsx` | ✅ Done |
| Landing (hero+search+grid) | `src/pages/Landing.jsx` | ✅ Done |
| Shared Components | `src/components/shared/*` | ✅ 12 components |
| Legacy Pages (from prior work) | `src/pages/*.jsx` | ✅ 20+ pages |

### 🔲 Needs Building / Upgrading

| Screen | File | Priority |
|---|---|---|
| Doctor Profile + Slot Picker | `src/pages/DoctorProfile.jsx` | 🔴 High |
| Booking Wizard (4-step) | `src/pages/BookingWizard.jsx` | 🔴 High |
| Patient Dashboard | `src/pages/patient/Dashboard.jsx` | 🔴 High |
| Patient Appointments | `src/pages/patient/Appointments.jsx` | 🟡 Medium |
| Patient Profile | `src/pages/patient/Profile.jsx` | 🟡 Medium |
| Video Consultation | `src/pages/VideoConsultation.jsx` | 🟡 Medium |
| Clinician Dashboard | `src/pages/clinician/Dashboard.jsx` | 🔴 High |
| Clinician Calendar | `src/pages/clinician/Calendar.jsx` | 🟡 Medium |
| Clinician Availability | `src/pages/clinician/Availability.jsx` | 🔴 High |
| Clinician Patients | `src/pages/clinician/Patients.jsx` | 🟡 Medium |
| Staff Dashboard | `src/pages/staff/Dashboard.jsx` | 🟡 Medium |
| Staff Appointments | `src/pages/staff/Appointments.jsx` | 🔴 High |
| Manager Dashboard | `src/pages/manager/Dashboard.jsx` | 🔴 High |
| Manager Clinics | `src/pages/manager/Clinics.jsx` | 🟡 Medium |
| Manager Service Catalog | `src/pages/manager/ServiceCatalog.jsx` | 🔴 High |
| Manager Billing | `src/pages/manager/Billing.jsx` | 🟡 Medium |
| Admin Users + RBAC | `src/pages/admin/Users.jsx` | 🔴 High |
| Admin Organizations | `src/pages/admin/Organizations.jsx` | 🟡 Medium |
| Admin Communications | `src/pages/admin/Communications.jsx` | 🟢 Low |
| Admin Policies | `src/pages/admin/Policies.jsx` | 🟢 Low |

---

## 2. Database Model → Screen Map

### GraphQL Types from `schema.ts` (31 models)

| Prisma Model | GraphQL Type | Used In Screens |
|---|---|---|
| `Users` | `User` | Auth, Profile, Admin Users |
| `UserProfiles` | `UserProfile` | AppShell, Profile, Admin Users |
| `UserRoles` | `UserRole` | AppShell, Admin RBAC, Login |
| `Appointments` | `Appointment` | All Calendars, Dashboards, Booking |
| `Clinicians` | `Clinician` | Landing, DoctorProfile, Clinician Portal |
| `ClinicianAvailability` | `ClinicianAvailability` | Availability Builder, Slot Picker, Booking |
| `Patients` | `Patient` | Patient Portal, Clinician Patients, Booking |
| `Clinics` | `Clinic` | Clinic Management, Filters, Booking |
| `Rooms` | `Room` | Room Management, Availability, Booking |
| `RoomBlocks` | `RoomBlock` | Block Calendar |
| `SpacerBlocks` | `SpacerBlock` | Clinician Schedule Blocks |
| `LunchBreaks` | *(via SpacerBlock)* | Schedule Gaps in Availability |
| `Products` | `Product` | Service Catalog, Booking Flow |
| `ProductVariations` | `ProductVariation` | Service Options in Booking |
| `ProductCategories` | `ProductCategory` | Service Catalog Sidebar |
| `ProductSubcategories` | `ProductSubcategory` | Sub-filters in Service Catalog |
| `Notifications` | `Notification` | Notification Feed, AppBar Bell |
| `Languages` | `Language` | Doctor Filters, Booking Search |
| `ClinicianLanguages` | `ClinicianLanguage` | Doctor Profiles |
| `ClinicianTypeModel` | `ClinicianType` | Search Filters, Doctor Profiles |
| `RoomTypeModel` | `RoomType` | Room Labels, Booking |
| `ClientOrganizations` | `ClientOrganization` | Admin Org Settings |
| `OrganizationSubscriptions` | `OrganizationSubscription` | Billing Dashboard |
| `SubscriptionPlans` | `SubscriptionPlan` | Billing / Pricing Page |
| `AuditLogs` | `AuditLog` | Admin Audit Trail |
| `DashboardStats` | `DashboardStats` | Manager Dashboard KPIs |
| `DashboardAnalytics` | `DashboardAnalytics` | Manager Charts |
| `AppointmentAnalytics` | `AppointmentAnalytics` | Timeline Charts |
| `StatusAnalytics` | `StatusAnalytics` | Pie Charts |
| `PatientRegistration` | `PatientRegistration` | Growth Charts |

### Available GraphQL Queries (from `schema.ts`)

```
me, users, user(id), myProfile, userProfile(id), allUserProfiles, searchUserProfiles
userRoles, allRoles, role(id)
appointments(search), appointmentsPaginated(search), appointment(id)
clinics(search), clinicsPaginated(search), clinic(id)
clinicians(search), clinician(id)
languages(search), languagesPaginated(search), language(id)
patients(search), patientsPaginated(search), patient(id)
notifications
products(search), productsPaginated(search), product(id)
productCategories(search), productSubcategories(category_id, search)
rooms(search, clinicId), roomsPaginated(search, clinicId), room(id)
availabilities(search), availabilitiesPaginated(search)
spacerBlocks(search), spacerBlocksPaginated(search)
roomBlocks(search), roomBlocksPaginated(search)
clinicianTypes, roomTypes
subscriptions
dashboardStats, dashboardAnalytics(dateRange)
```

### Available GraphQL Mutations (from `schema.ts`)

```
# Auth
signup, verifyEmail, signin, requestPasswordReset, resetPassword, userDelete

# Admin Users
adminCreateUser, adminUpdateUser, adminDeleteUser

# Profile
updateProfile, uploadProfileImage, deleteProfileImage

# CRUD Operations
createClinic, updateClinic, deleteClinic
createRoom, updateRoom, deleteRoom
createProduct, updateProduct, deleteProduct
createProductCategory, updateProductCategory, deleteProductCategory
createProductSubcategory, updateProductSubcategory, deleteProductSubcategory
createAvailability, updateAvailability, deleteAvailability
createClinician, updateClinician, deleteClinician
createClinicianType, updateClinicianType, deleteClinicianType
createRoomType, updateRoomType, deleteRoomType
createLanguage, updateLanguage, deleteLanguage
createPatient, updatePatient, deletePatient
createAppointment, updateAppointment, cancelAppointment, deleteAppointment
createSpacerBlock, updateSpacerBlock, deleteSpacerBlock
createRoomBlock, updateRoomBlock, deleteRoomBlock
notificationCreate, notificationMarkAsRead
```

---

## 3. End-to-End User Journeys

### Journey 1: Patient Books a Doctor Appointment (Public → Authenticated)

```
Landing Page (/)
  → Browse doctors / Search by specialty, city, date
  → Click "View Profile" on a DoctorCard
    → Doctor Profile (/doctor/:id)
      → View bio, services, languages, ratings
      → Select appointment type (In-Person / Video)
      → Pick date on calendar
      → Select available time slot
      → Click "Continue to Book"
        → Login (/login) — if not authenticated
          → Sign In / Register / Forgot Password
          → Redirect back to booking
        → Booking Wizard (/book/:doctorId)
          → Step 1: Confirm Time Slot + Appointment Type
          → Step 2: Fill Patient Details (pre-filled if logged in)
          → Step 3: Choose Service (Product + Variation)
          → Step 4: Review Summary + Stripe Payment
          → Submit → createAppointment + createPaymentTransaction
          → Redirect to Patient Dashboard
            → Patient Dashboard (/patient/dashboard)
              → See upcoming appointment card
              → "Join Video" if video appointment
                → Video Consultation (/consultation/:id)
              → "Reschedule" → updateAppointment
              → "Cancel" → cancelAppointment + ConfirmDialog
```

### Journey 2: Clinician Daily Workflow

```
Login (/login) — sign in as clinician
  → Clinician Dashboard (/clinician/dashboard)
    → See today's timeline with appointments
    → See next patient card with "Start Session" button
    → Click "Start Session"
      → Video Consultation (/consultation/:appointmentId) — if video
      → OR view patient notes inline
    → Click "Add Block" → create SpacerBlock
  → Clinician Calendar (/clinician/calendar)
    → Week/day view of all appointments
    → Click appointment → detail popover
  → Clinician Availability (/clinician/availability)
    → 7-day grid showing availability windows
    → "Add Availability" → Drawer with RecurrenceType form
      → Set weekly/daily/single/monthly/custom
      → Assign room, set valid dates
      → createAvailability mutation
    → "Add Lunch Break" → Dialog
    → Delete/edit existing slots
  → Clinician Patients (/clinician/patients)
    → List of patients seen by this clinician
    → Click patient → detail drawer with history
```

### Journey 3: Staff/Receptionist Books on Behalf of Patient

```
Login (/login) — sign in as receptionist
  → Staff Dashboard (/staff/dashboard)
    → Today's appointment queue
    → Quick stats
  → Staff Appointments (/staff/appointments)
    → Filter bar: clinic, clinician, status, date range, patient search
    → View all appointments in table
    → Click "Book Appointment" button
      → Booking Modal (Dialog)
        → Search patient (Autocomplete, server-side search)
        → Select clinician → Select clinic → Select room
        → DatePicker + TimePicker
        → Select duration (15/30/45/60 min)
        → Select service (Product + Variation)
        → Right panel: SlotPicker showing clinician's availability
        → Submit → createAppointment mutation
    → Click existing appointment → Edit modal (prefilled)
    → Click "Cancel" → ConfirmDialog → cancelAppointment mutation
    → "Export CSV" → download filtered appointments
```

### Journey 4: Manager Analyzes Clinic Performance

```
Login (/login) — sign in as clinic_manager
  → Manager Dashboard (/manager/dashboard)
    → Date range filter (7d / 30d / 90d / custom)
    → Clinic filter dropdown
    → 5 KPI cards: Total Appointments, Revenue, Active Patients,
      Clinician Utilization %, Cancellation Rate %
    → Line chart: Appointments over time (scheduled/completed/cancelled)
    → Pie chart: Appointment status distribution
    → Bar chart: Revenue by clinic
    → Top clinicians table (rank, name, appointments, revenue)
    → Recent transactions table with pagination
  → Manager Clinics (/manager/clinics)
    → CRUD for clinic locations
    → createClinic / updateClinic / deleteClinic
  → Manager Service Catalog (/manager/products)
    → Left sidebar: ProductCategory tree with subcategories
    → Main grid: Product cards (name, type, SKU, price, active toggle)
    → Add/Edit Product Dialog (3 tabs):
      Tab 1: Basic Info (name, description, type, category, SKU, price)
      Tab 2: Variations (for variable products — name, SKU, price table)
      Tab 3: Cancellation Rules (rule type, fee type, amount, hours)
  → Manager Billing (/manager/billing)
    → Current plan banner (gradient, plan name, price, features)
    → Usage metrics (clinics used, users, appointments)
    → Plan comparison cards (Starter / Professional / Enterprise)
    → Payment history table
    → Stripe configuration card
```

### Journey 5: Admin Manages Users, Roles & System

```
Login (/login) — sign in as system_admin
  → Admin Users (/admin/users)
    → Tab 1: Users
      → Search + role filter + status filter
      → Table: avatar, name, email, role badge, clinic, status toggle, actions
      → "Add User" → Dialog (email, password, name, role, clinic, active)
      → Edit / Deactivate / Reset Password / Delete
    → Tab 2: Roles & Permissions
      → Left panel: list of roles (patient, clinician, receptionist, manager, admin)
      → Right panel: Permission matrix table
        Rows: resources (appointments, patients, clinicians, rooms, products...)
        Columns: create / read / update / delete
        Cells: checkbox (teal=allowed, gray=denied)
      → Save changes
    → Tab 3: Audit Log
      → Filter by action, resource, date range
      → Table: timestamp, user, action badge, resource, IP, expandable JSON
  → Admin Organizations (/admin/organizations)
    → ClientOrganization CRUD
    → Organization subscription management
  → Admin Communications (/admin/communications)
    → Email template management (confirmation, reschedule, cancellation)
  → Admin Policies (/admin/policies)
    → Global cancellation rules
    → System-wide settings
```

---

## Phase 1 — Foundation: Theme, Auth & Shell

> **Status: ✅ COMPLETE** — Already built in previous sessions

### AG-1 — MUI Theme + Project Setup ✅
- **File**: `src/theme/index.js`
- **Models**: None (design system only)
- **Route**: N/A (wraps `App.jsx`)

### AG-2 — Login.jsx Full Auth Screen ✅
- **File**: `src/pages/Login.jsx`
- **Models**: `Users`, `UserProfiles`, `UserRoles`
- **Route**: `/login`
- **GraphQL**: `signin`, `signup`, `requestPasswordReset`

### AG-3 — AppShell.jsx Responsive Layout ✅
- **File**: `src/layouts/AppShell.jsx`
- **Models**: `UserProfiles`, `UserRoles`, `Notifications`
- **Route**: Wraps all authenticated routes

### AG-4 — Landing.jsx Public Homepage ✅
- **File**: `src/pages/Landing.jsx`
- **Models**: `Clinicians`, `ClinicianTypeModel`, `Languages`, `Clinics`
- **Route**: `/`
- **GraphQL**: `clinicians(search)`, `clinicianTypes`, `languages`

---

## Phase 2 — Patient Portal: Landing & Doctor Profile

### AG-5 — DoctorProfile.jsx + SlotPicker

- **File**: `src/pages/DoctorProfile.jsx`
- **Models**: `Clinicians`, `ClinicianAvailability`, `ClinicianLanguages`, `Appointments`
- **Route**: `/doctor/:id`
- **GraphQL Queries**: `clinician(id)`, `availabilities(search)`, `appointments(search)`
- **GraphQL Input Types**: `SearchInput { clinicId, startDate, endDate }`

#### Antigravity Prompt (AG-5 — /create)

```
React JSX no TypeScript. Create src/pages/DoctorProfile.jsx MUI v5.
Fetch clinician by id from useParams().

PROFILE HEADER CARD:
  Paper elevation=0 border p=4 borderRadius=3.
  Grid container spacing=3 alignItems=flex-start.

  Grid xs=12 md=2:
    Avatar src=gravatar sx width=120 height=120 border='3px solid'
    borderColor=primary.main. Chip label='Verified' size=small
    color=success sx mt=1.

  Grid xs=12 md=6:
    Typography h4 fontWeight=800 fullName.
    Chip clinicianType color=primary variant=outlined sx mt=1.
    Stack direction=row gap=2 mt=1:
      LocationOn icon color=primary + body2 clinic.address.
      VerifiedUser icon color=success + body2 'Verified Provider'.
    Stack direction=row flexWrap=wrap gap=0.5 mt=1.5:
      map clinician.languages → Typography caption + flag emoji + name.

  Grid xs=12 md=4 textAlign right:
    Button variant=contained size=large startIcon=CalendarMonth
    fullWidth sx mb=1 'Book Appointment'.
    Button variant=outlined color=secondary startIcon=Videocam
    fullWidth 'Video Consultation'.
    Stack direction=row justifyContent=flex-end gap=1 mt=1:
      IconButton BookmarkBorder tooltip='Save doctor'.
      IconButton Share.

TWO COLUMN LAYOUT:
  Grid container spacing=3 mt=2.

  Left Grid xs=12 md=7:
    Card mb=2 p=3 — Typography subtitle1 fontWeight=700 'About'
      + body1 bio text.
    Card mb=2 p=3 — Typography subtitle1 fontWeight=700 'Services'
      + Grid of Chip per product name.
    Card p=3 — Typography subtitle1 fontWeight=700 'Languages'
      + Stack direction=row gap=1 flexWrap=wrap:
        each language: Stack direction=row alignItems=center gap=0.5 —
        flag emoji + Typography body2.

  Right Grid xs=12 md=5:
    Paper p=3 border borderRadius=3 position=sticky top=80.
    Typography subtitle1 fontWeight=700 mb=2 'Select appointment'.

    ToggleButtonGroup value=appointmentType exclusive onChange fullWidth
    sx mb=2:
      ToggleButton value=inperson startIcon=LocalHospital 'In-Person'.
      ToggleButton value=video startIcon=Videocam 'Video'.

    DateCalendar value=selectedDate onChange=setSelectedDate
    from @mui/x-date-pickers.

    Box mt=2:
      Typography caption color=text.secondary mb=1
      'Available times for selected day'.

      Compute available slots:
        1. Filter availability by selectedDate.day() === dayOfWeek
        2. Split startTime → endTime into 30-min chunks
        3. Remove chunks where existing Appointment overlaps
      Box display=flex flexWrap=wrap gap=1 mt=1:
        map slots: Button size=small variant=slot===selectedSlot?
        'contained':'outlined' onClick=setSelectedSlot
        disabled=isTaken sx borderRadius=2.
        If no slots: Typography body2 color=text.secondary
        'No availability on this day'.

    If selectedSlot:
      Box mt=2 p=2 bgcolor=primary.50 borderRadius=2 border
      borderColor=primary.light:
        Typography body2 fontWeight=700 color=primary.dark
        date + ' at ' + selectedSlot.
        Typography caption color=text.secondary clinicName.
      Button variant=contained fullWidth mt=2 startIcon=ArrowForward
      'Continue to Book' onClick=navigateToBooking.

GraphQL:
  clinician(id) → clinician with clinic + languages + availability
  availabilities(search: { clinicId }) → ClinicianAvailability[]
  appointments(search: { clinicianId, startDate, endDate }) → booked slots

navigateToBooking: navigate('/book/'+clinicianId,
  {state: {slot: selectedSlot, date: selectedDate,
           appointmentType, clinicId: clinician.clinicId}})

Export default DoctorProfile. Use our medicalTheme.
```

---

## Phase 3 — Booking Flow & Payments

### AG-6 — BookingWizard.jsx (4-Step Stepper)

- **File**: `src/pages/BookingWizard.jsx`
- **Models**: `Appointments`, `Products`, `ProductVariations`, `Rooms`, `Patients`
- **Route**: `/book/:doctorId`
- **GraphQL Queries**: `clinician(id)`, `products(search)`, `availabilities(search)`, `appointments(search)`
- **GraphQL Mutations**: `createAppointment(input: CreateAppointmentInput!)`, `createPatient(input: CreatePatientInput!)`
- **Input Types**: `CreateAppointmentInput { clinic_id, room_id, clinician_id, patient_id, appointment_date, appointment_time, duration_minutes, status, reason, notes, product_id, product_variation_id }`

#### Antigravity Prompt (AG-6 — /create)

```
React JSX no TypeScript. Create src/pages/BookingWizard.jsx MUI v5.

const steps = ['Select Time','Your Details','Choose Service','Review & Pay']
const [activeStep, setActiveStep] = useState(0)
const [bookingData, setBookingData] = useState({
  slot: null, appointmentType: 'inperson', date: null,
  patient: {firstName:'',lastName:'',dateOfBirth:null,email:'',
            phone:'',reason:'',notes:''},
  product: null, variation: null, clinicianId: '', clinicId: '',
  roomId: ''
})

MUI Stepper activeStep alternativeLabel.
Custom StepIconComponent:
  if completed: CheckCircle color=primary.
  if active: RadioButtonChecked color=primary.
  else: RadioButtonUnchecked color=disabled.

STEP 0 — Select Time:
  Paper p=3 mb=2 — Stack direction=row gap=2 alignItems=center:
    Avatar src=gravatar size=48, Box: h6 doctorName, body2 clinicianType.
  ToggleButtonGroup value=bookingData.appointmentType exclusive:
    ToggleButton value=inperson startIcon=LocalHospital 'In-Person'.
    ToggleButton value=video startIcon=Videocam 'Video'.
  SlotPicker component with clinicianId from location.state or useParams.
  onSlotSelect: setBookingData with slot and date.

STEP 1 — Your Details:
  If authenticated: pre-fill bookingData.patient from useAuth().profile.
  Grid container spacing=2:
    xs=12 sm=6: TextField label=First Name required.
    xs=12 sm=6: TextField label=Last Name required.
    xs=12: DatePicker label=Date of Birth required.
    xs=12 sm=6: TextField label=Email type=email required.
    xs=12 sm=6: TextField label=Phone.
    xs=12: TextField label='Reason for visit' multiline rows=3 required.
    xs=12: TextField label='Additional notes' multiline rows=2.

STEP 2 — Choose Service:
  Typography subtitle1 fontWeight=700 mb=2 'Select a service'.
  Fetch products(search: {clinicId: bookingData.clinicId}) via GraphQL.
  Grid container spacing=2:
    xs=12 sm=6 per product: Card onClick=selectProduct sx cursor=pointer
    border='2px solid' borderColor=selected?primary.main:border.
    CardContent: Chip product_type + h6 name + body2 description +
    h5 color=primary '£'+price.
    If selected AND productType==='variable':
      Select variations: MenuItem variation_name + ' — £' + price.

STEP 3 — Review & Pay:
  Grid container spacing=3.
  Left xs=12 md=7:
    Paper p=3 — 'Booking Summary': date, time, doctor, service, price.
    Typography h5 fontWeight=800 color=primary 'Total: £'+totalPrice.
    Stripe CardElement from @stripe/react-stripe-js.
    Checkbox accept cancellation policy.
  Right xs=12 md=5:
    Paper p=2.5 position=sticky top=80 — progressive booking details.

handlePayAndBook async:
  1. stripe.createPaymentMethod({type:'card', card:elements.getElement(CardElement)})
  2. createAppointment mutation with CreateAppointmentInput
  3. navigate('/patient/dashboard') + success Snackbar

BOTTOM NAVIGATION:
  Button Back disabled=activeStep===0 + Button Next/Submit.

GraphQL mutations:
  createAppointment(input: CreateAppointmentInput!): AppointmentPayload!

Export default BookingWizard. Use our medicalTheme.
```

---

## Phase 4 — Patient Dashboard & Video Consultation

### AG-7 — PatientDashboard.jsx

- **File**: `src/pages/patient/Dashboard.jsx`
- **Models**: `Appointments`, `Notifications`, `Patients`, `Clinicians`
- **Route**: `/patient/dashboard`
- **GraphQL Queries**: `appointments(search)` (filter by patientId, status), `notifications`
- **GraphQL Mutations**: `cancelAppointment(id)`, `updateAppointment(id, input)`, `notificationMarkAsRead(notificationId)`

#### Antigravity Prompt (AG-7 — /create)

```
React JSX no TypeScript. Create src/pages/patient/Dashboard.jsx MUI v5.

GraphQL:
  appointments(search: {patientId, status:'scheduled'}) → upcoming
  notifications → activity feed

WELCOME BANNER:
  Paper sx bgcolor linear-gradient #004D55 to #0A9396 p=4 borderRadius=3 mb=3.
  Typography h5 color=white fontWeight=700 'Good morning, {profile.first_name} 👋'.
  Typography body2 color=rgba(255,255,255,0.8) 'You have N upcoming appointments'.
  Stack direction=row gap=2: two white outlined Buttons: 'Book Appointment' + 'View All'.
  Avatar gravatar right-aligned.

KPI GRID:
  Grid container spacing=2 mb=3. Grid xs=6 sm=3 per DataCard:
    total (EventNote #3A86FF), completed (CheckCircle #2DC653),
    upcoming (Schedule #006D77), cancelled (Cancel #E63946).

MAIN TWO COLUMNS:
  Left Grid xs=12 md=8:
    Typography h6 'Upcoming Appointments'.
    if loading: SkeletonLoader variant=table rows=3.
    if empty: EmptyState icon=CalendarMonth title='No upcoming appointments'
      action={label:'Find a Doctor', onClick:navigate('/')}.
    map appointments: Card sx borderLeft='4px solid' statusColor.
      Date Box teal bg + Avatar clinician + name + specialty +
      Chip duration + Chip type + StatusChip.
      CardActions: 'Join Video' (if video+scheduled) + 'Reschedule' + 'Cancel'.

  Right Grid xs=12 md=4:
    'Your Doctors' — recent clinicians with 'Book again' buttons.
    'Recent Activity' — last 5 notifications with type icons.

Export default PatientDashboard. Use our medicalTheme.
```

### AG-8 — VideoConsultation.jsx

- **File**: `src/pages/VideoConsultation.jsx`
- **Models**: `Appointments`, `Clinicians`, `Patients`
- **Route**: `/consultation/:appointmentId`
- **GraphQL Queries**: `appointment(id)`

#### Antigravity Prompt (AG-8 — /create)

```
React JSX no TypeScript. Create src/pages/VideoConsultation.jsx.
Dark theme override for this screen ONLY.

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#006D77' },
    background: { default: '#0A1F22', paper: '#0F2D33' }
  }
})
Wrap entire component in ThemeProvider theme=darkTheme.

State: micOn=true, cameraOn=true, sharing=false, chatOpen=false,
callTimer='00:00:00', messages=[], newMessage='', notes='', panel=0.

LAYOUT: Box bgcolor='#0A1F22' minHeight='100vh' display=flex flexDirection=column.

TOP BAR: AppBar bgcolor='#0F2D33'. LocalHospital icon + 'HealthSync' +
Chip 'Encrypted' + callTimer.

MAIN: Box flexGrow=1 display=flex p=1.5 gap=1.5.
  Main video (flexGrow=1 position=relative bgcolor=#000 borderRadius=2):
    video ref=remoteVideoRef autoPlay playsInline.
    Self-view (absolute bottom=16 right=16 width=200).
    Name overlay + Timer.

CONTROLS: Box py=1.5 justifyContent=center gap=2.
  Mic toggle, Camera toggle, ScreenShare, Chat badge, Fab CallEnd red, Settings.

RIGHT PANEL (width=320 bgcolor='#0F2D33'):
  Tabs: Info | Chat | Notes.
  Panel 0: appointment details.
  Panel 1: messages thread + TextField + Send.
  Panel 2: notes TextField multiline + Save Button.

useRef: localVideoRef, remoteVideoRef.
useEffect: navigator.mediaDevices.getUserMedia scaffold.
Comment: '// Replace with Twilio/Daily.co/WebRTC SDK'.

GraphQL: appointment(id from useParams).
Export default VideoConsultation. Use our medicalTheme.
```

---

## Phase 5 — Clinician Portal

### AG-9 — ClinicianDashboard.jsx

- **File**: `src/pages/clinician/Dashboard.jsx`
- **Models**: `Appointments`, `SpacerBlocks`, `ClinicianAvailability`, `Notifications`
- **Route**: `/clinician/dashboard`
- **GraphQL Queries**: `appointments(search: {clinicianId, startDate, endDate})`, `spacerBlocks(search)`, `notifications`

#### Antigravity Prompt (AG-9 — /create)

```
React JSX no TypeScript. Create src/pages/clinician/Dashboard.jsx MUI v5.

GraphQL:
  appointments(search: {clinicianId, startDate: today, endDate: today}) → today's appts
  spacerBlocks(search: {clinicianId, startDate: today}) → blocks
  notifications → recent 3

HEADER STRIP:
  Paper bgcolor=primary.main p=2. dayjs().format('dddd, DD MMMM YYYY').
  'Dr. '+name+' · '+clinicianType+' · '+clinicName. Button 'Add Block'.

KPI ROW: DataCards — todayTotal, completed, remaining, videoCount.

TWO COLUMN LAYOUT:
  Left xs=12 md=7 — 'Today\'s Schedule':
    Box position=relative height=600 overflow=auto pl=8.
    Time labels 08:00–18:00 every 30min, absolute positioned.
    Map appointments:
      top = (hour*60+min - 480) * 1.2
      height = durationMinutes * 1.2
      Card absolute, colored by status.
    Map spacerBlocks: Box gray with Tooltip reason.

  Right xs=12 md=5:
    Next Patient card: Avatar 64px, name, time, reason.
      Buttons: 'View Notes' + 'Start Session'.
    Queue list: next 4 appointments.
    Notifications: 3 items.

setInterval refresh every 60 seconds.
Export default ClinicianDashboard. Use our medicalTheme.
```

### AG-10 — Availability.jsx Full Recurrence Builder

- **File**: `src/pages/clinician/Availability.jsx`
- **Models**: `ClinicianAvailability`, `SpacerBlocks`, `Rooms`
- **Route**: `/clinician/availability`
- **GraphQL Queries**: `availabilities(search)`, `spacerBlocks(search)`, `rooms(clinicId)`
- **GraphQL Mutations**: `createAvailability(input: CreateAvailabilityInput!)`, `updateAvailability(id, input)`, `deleteAvailability(id)`, `createSpacerBlock(input)`, `deleteSpacerBlock(id)`
- **Input Types**: `CreateAvailabilityInput { clinician_id, clinic_id, recurrence_type, start_time, end_time, day_of_week, exclude_weekends, custom_dates, valid_from, valid_until, room_id }`

#### Antigravity Prompt (AG-10 — /create)

```
React JSX no TypeScript. Create src/pages/clinician/Availability.jsx MUI v5.

State: drawerOpen=false, editSlot=null,
formData={recurrence_type:'weekly', day_of_week:null, start_time:'09:00',
end_time:'17:00', room_id:'', valid_from:null, valid_until:null,
exclude_weekends:false, exclude_saturday:false, exclude_sunday:false}

GraphQL:
  availabilities(search: {clinicianId}) → ClinicianAvailability[]
  spacerBlocks(search: {clinicianId}) → SpacerBlock[]
  rooms(clinicId) → Room[]

PAGE HEADER: Typography h5 'Manage Availability'.
Buttons: 'Add Block' outlined + 'Add Availability' contained.

7-DAY GRID: Grid container spacing=1.5.
Days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] with index mapping.
Each Grid item: Paper p=1.5 minHeight=220.
  Filter availability where dayOfWeek===dayIndex OR recurrenceType==='daily'.
  Map: Box bgcolor=primary.main borderRadius=1 p=0.75 cursor=pointer:
    Typography caption color=white: startTime + ' — ' + endTime.
    Typography caption room.roomNumber if room_id set.
  Filter spacerBlocks for same day:
    Box bgcolor=action.disabledBackground: 'Blocked: '+reason.
  Button 'Add Slot' for empty days.

AVAILABILITY DRAWER: Drawer anchor=right PaperProps width=420 p=3.
  RadioGroup recurrence_type: single / daily / weekly / monthly / custom.
  CONDITIONAL weekly: ToggleButtonGroup day_of_week (M T W T F S S).
  CONDITIONAL single: DatePicker block_date.
  CONDITIONAL custom: TextField comma-separated dates.
  TimePicker Start + End (validate end > start).
  Autocomplete rooms from GraphQL rooms query.
  DatePicker valid_from + valid_until.
  FormGroup: Switch exclude_weekends, exclude_saturday, exclude_sunday.
  Buttons: Cancel + Delete(if editing) + Save.

handleSave:
  if editSlot: updateAvailability(id, UpdateAvailabilityInput).
  else: createAvailability(CreateAvailabilityInput).
  Close drawer + refetch availabilities.

Export default Availability. Use our medicalTheme.
```

---

## Phase 6 — Staff & Receptionist Portal

### AG-11 — StaffAppointments.jsx

- **File**: `src/pages/staff/Appointments.jsx`
- **Models**: `Appointments`, `Patients`, `Clinicians`, `Rooms`, `Products`, `ProductVariations`
- **Route**: `/staff/appointments`
- **GraphQL Queries**: `appointmentsPaginated(search)`, `patients(search)`, `clinicians(search)`, `clinics(search)`, `rooms(clinicId)`, `products(search)`
- **GraphQL Mutations**: `createAppointment(input)`, `updateAppointment(id, input)`, `cancelAppointment(id)`
- **Input Types**: `CreateAppointmentInput`, `UpdateAppointmentInput`, `SearchInput`

#### Antigravity Prompt (AG-11 — /create)

```
React JSX no TypeScript. Create src/pages/staff/Appointments.jsx MUI v5.

State: filters={clinic:'',clinician:'',status:[],dateFrom:null,
dateTo:null,search:''}, modalOpen=false, editAppointment=null,
page=0, rowsPerPage=10.

PAGE HEADER: Typography h5 'Appointments' + Chip totalCount.
Buttons: 'Export CSV' outlined + 'Book Appointment' contained.

FILTER BAR: Paper p=2 mb=2. Grid container spacing=2.
  Select clinic, Autocomplete clinician (Avatar+name in options),
  Select multiple status, DatePicker from/to, TextField search debounced.
  Active filter chips: Chip per filter onDelete=clear.

TABLE: TableContainer Paper. Table stickyHeader size=small.
  TableHead sx th bgcolor=#E8F8F9 color=#004D55 fontWeight=700.
  Columns: Checkbox | Date & Time | Patient | Clinician | Clinic & Room |
           Duration | Service | Status | Actions.
  TableBody: if loading: SkeletonLoader variant=table.
    else: map appointments:
      Avatar patient + name, Avatar clinician + specialty Chip,
      clinic + room, Chip duration, StatusChip,
      IconButton edit, IconButton cancel color=error.
  TablePagination rowsPerPageOptions=[10,25,50].

BOOKING MODAL: Dialog maxWidth=lg fullWidth fullScreen=isMobile.
  Left xs=7: Autocomplete patients (debounced server search via
    patients(search) query). Autocomplete clinicians. Select clinic →
    Select room filtered. DatePicker + TimePicker. Select duration.
    Product Autocomplete. TextField reason required.
  Right xs=5: SlotPicker — availability preview for selected clinician+date.

handleBookSubmit: createAppointment(CreateAppointmentInput) mutation.
ConfirmDialog for cancel: cancelAppointment(id) mutation.

GraphQL: appointmentsPaginated(search: SearchInput), patients(search),
clinicians(search), clinics(search), rooms(clinicId), products(search).

Export default StaffAppointments. Use our medicalTheme.
```

---

## Phase 7 — Manager & Analytics Portal

### AG-12 — ManagerDashboard.jsx Analytics

- **File**: `src/pages/manager/Dashboard.jsx`
- **Models**: `Appointments`, `Clinics`, `Clinicians`, `DashboardStats`, `DashboardAnalytics`
- **Route**: `/manager/dashboard`
- **GraphQL Queries**: `dashboardStats`, `dashboardAnalytics(dateRange: DateRangeInput!)`, `clinics(search)`
- **Input Types**: `DateRangeInput { startDate, endDate }`
- **Dependencies**: `recharts`

#### Antigravity Prompt (AG-12 — /create)

```
React JSX no TypeScript. Create src/pages/manager/Dashboard.jsx MUI v5 + recharts.

State: dateFilter='monthly', clinicFilter='all'.

HEADER: Typography h5 'Analytics & Reports'.
ToggleButtonGroup: 7d / 30d / 90d / custom. Select clinicFilter from clinics.

KPI ROW: Grid xs=12 sm=6 md 5 DataCards:
  totalAppointments (EventNote #3A86FF), totalRevenue (AttachMoney #2DC653),
  activePatients (PeopleAlt #006D77), utilization (Speed #7C3AED),
  cancellationRate (Cancel #E63946).

CHARTS:
  LineChart (ResponsiveContainer height=280):
    3 Lines: scheduled (#006D77), completed (#2DC653), cancelled (#E63946).
    CartesianGrid, XAxis, YAxis, Tooltip, Legend.
  PieChart: Appointment status distribution. Cell colors per status.
  BarChart: Revenue by clinic. Bar fill=#006D77 radius=[4,4,0,0].

TOP CLINICIANS TABLE: rank, Avatar+name, Chip apptCount, revenue.

TRANSACTIONS TABLE:
  Columns: Date | Patient | Clinician | Service | Amount | Status.
  TablePagination.

GraphQL: dashboardStats, dashboardAnalytics(dateRange: DateRangeInput),
clinics(search).

Export default ManagerDashboard. Use our medicalTheme.
```

### AG-13 — ServiceCatalog.jsx

- **File**: `src/pages/manager/ServiceCatalog.jsx`
- **Models**: `Products`, `ProductCategories`, `ProductSubcategories`, `ProductVariations`
- **Route**: `/manager/products`
- **GraphQL Queries**: `productCategories(search)`, `products(search)`, `productSubcategories(category_id)`
- **GraphQL Mutations**: `createProduct`, `updateProduct`, `deleteProduct`, `createProductCategory`, `updateProductCategory`, `deleteProductCategory`, `createProductSubcategory`, `updateProductSubcategory`, `deleteProductSubcategory`

#### Antigravity Prompt (AG-13 — /create)

```
React JSX no TypeScript. Create src/pages/manager/ServiceCatalog.jsx MUI v5.

State: selectedCategoryId=null, productDialogOpen=false,
editProduct=null, productTab=0, variations=[], searchQuery=''.

LAYOUT: Box display=flex gap=2.

LEFT SIDEBAR (width=220):
  Paper p=2 position=sticky top=80.
  Typography subtitle2 'CATEGORIES'.
  List dense: map productCategories:
    ListItemButton selected + Badge productCount.
    Collapse subcategories nested.
  Button 'Add Category'.

MAIN AREA:
  Typography h6 selectedCategory.name. Button 'Add Service'.
  TextField search. Grid container spacing=2:
    xs=12 sm=6 lg=4 per product: Card hover shadow lift.
    Chip productType, Switch isActive, h6 name, body2 description,
    caption SKU monospace, h5 price teal.
    CardActions: edit + delete IconButtons.

PRODUCT DIALOG (tabbed, Dialog maxWidth=md):
  Tab 1 'Basic Info': name, description, productType Radio (simple/variable),
    category Autocomplete, subcategory Autocomplete, SKU, price, isActive.
  Tab 2 'Variations': Table name/SKU/price rows + 'Add Variation'.
  Tab 3 'Cancellation Rules': rule list + 'Add Rule' form.

handleSaveProduct: createProduct/updateProduct mutation. Refetch.

GraphQL: productCategories(search), products(search),
productSubcategories(category_id),
createProduct(CreateProductInput), updateProduct(id, UpdateProductInput),
deleteProduct(id).

Export default ServiceCatalog. Use our medicalTheme.
```

### AG-15 — Billing.jsx

- **File**: `src/pages/manager/Billing.jsx`
- **Models**: `OrganizationSubscriptions`, `SubscriptionPlans`
- **Route**: `/manager/billing`
- **GraphQL Queries**: `subscriptions`

#### Antigravity Prompt (AG-15 — /create)

```
React JSX no TypeScript. Create src/pages/manager/Billing.jsx MUI v5.

State: billingCycle='monthly'.

CURRENT PLAN BANNER:
  Paper bgcolor gradient #004D55 to #006D77 p=4 borderRadius=3.
  Typography h4 white plan.name. Chip 'ACTIVE' green.
  ToggleButtonGroup monthly/yearly. Typography h3 white price.
  List features with CheckCircle icons.
  Buttons: 'Upgrade Plan' white + 'Manage billing' outlined.

USAGE METRICS: 3 Paper cards with LinearProgress bars.

PLAN COMPARISON: Grid xs=12 md=4 per plan.
  Card current=border teal + 'Current Plan' chip.
  Plan name, price, features list, Select/Current button.

PAYMENT HISTORY TABLE:
  Columns: Date | Invoice | Description | Amount | Status | Download.
  TablePagination.

GraphQL: subscriptions.

Export default Billing. Use our medicalTheme.
```

---

## Phase 8 — Admin Panel

### AG-14 — AdminUsers.jsx + RBAC Matrix

- **File**: `src/pages/admin/Users.jsx`
- **Models**: `Users`, `UserProfiles`, `UserRoles`, `AuditLogs`
- **Route**: `/admin/users`
- **GraphQL Queries**: `users`, `allUserProfiles`, `allRoles`, `user(id)`
- **GraphQL Mutations**: `adminCreateUser(input: CreateUserInput!)`, `adminUpdateUser(userId, input: UpdateUserInput!)`, `adminDeleteUser(userId)`
- **Input Types**: `CreateUserInput { email, password, first_name, last_name, phone, role_id, clinic_id, is_active }`, `UpdateUserInput`

#### Antigravity Prompt (AG-14 — /create)

```
React JSX no TypeScript. Create src/pages/admin/Users.jsx MUI v5.

const ROLE_COLORS = {
  system_admin:   { bg: '#FFE4E6', text: '#9F1239' },
  clinic_manager: { bg: '#EDE9FE', text: '#4C1D95' },
  receptionist:   { bg: '#DBEAFE', text: '#1E40AF' },
  clinician:      { bg: '#D1FAE5', text: '#065F46' },
  patient:        { bg: '#FEF3C7', text: '#92400E' }
}

Tabs: 'Users' | 'Roles & Permissions' | 'Audit Log'.

TAB 0 — USERS:
  Search + role filter + status filter. Button 'Add User'.
  Table stickyHeader: Avatar+Name+Email | Role Chip | Clinic | Status Switch |
  Last Login | Actions (edit, reset PW, delete).
  Add/Edit User Dialog: email, password, name, Select role from allRoles,
  Select clinic from clinics, Switch isActive.
  handleSaveUser: adminCreateUser or adminUpdateUser.

TAB 1 — ROLES & PERMISSIONS:
  Left panel (260px): List of roles, selected=teal bg.
  Right panel: Permission matrix table.
    Rows: resources (appointments, patients, clinicians, rooms, products...).
    Columns: create | read | update | delete.
    Cells: Checkbox teal=allowed.

TAB 2 — AUDIT LOG:
  Filter: search, action Select, resource Select, DatePickers.
  Table: timestamp, Avatar+userName, action Chip colored, resource,
  IP address, expandable JSON details.
  TablePagination.

GraphQL: allUserProfiles, allRoles, adminCreateUser(CreateUserInput),
adminUpdateUser(userId, UpdateUserInput), adminDeleteUser(userId).

Export default AdminUsers. Use our medicalTheme.
```

### AG-16 — Admin Organizations

- **File**: `src/pages/admin/Organizations.jsx`
- **Models**: `ClientOrganizations`, `OrganizationSubscriptions`, `Clinics`
- **Route**: `/admin/organizations`

### AG-17 — Admin Communications

- **File**: `src/pages/admin/Communications.jsx`
- **Models**: `EmailTemplates` (if available)
- **Route**: `/admin/communications`

### AG-18 — Admin Policies

- **File**: `src/pages/admin/Policies.jsx`
- **Route**: `/admin/policies`

---

## Phase 9 — Polish & Refactor

### AG-R1 — Skeleton Loading States (/refactor)

```
React JSX MUI v5. Ensure every page that fetches data uses
SkeletonLoader from src/components/shared/Skeletons.jsx while loading.
Pattern: if (loading) return <SkeletonLoader variant='table' rows={5} />;
Apply to: Landing, StaffAppointments, PatientDashboard, ClinicianDashboard,
ManagerDashboard, ServiceCatalog, AdminUsers.
```

### AG-R2 — MUI Snackbar Notifications (/refactor)

```
Create src/hooks/useNotification.js. Returns success/error/warning/info
functions + NotificationSnackbar component. Replace any toast.success/error
calls across all pages. Use Snackbar autoHideDuration=4000
anchorOrigin bottom-right with Alert variant=filled.
```

### AG-R3 — Empty States (/refactor)

```
Add EmptyState component from src/components/shared/EmptyState.jsx to
every list/table that can be empty:
  Landing (no search results): icon=SearchOff
  PatientDashboard (no appointments): icon=CalendarMonth
  StaffAppointments (empty table): icon=EventBusy
  ServiceCatalog (no products): icon=Inventory2
  AdminUsers (no users): icon=PersonOff
  Availability (no slots for a day): icon=Schedule
```

### AG-R4 — fullScreen Dialogs on Mobile (/refactor)

```
In every file with Dialog, add:
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  <Dialog fullScreen={isMobile} ...>
Apply to: BookingWizard, StaffAppointments, ServiceCatalog, AdminUsers,
Availability Drawer.
```

### AG-R5 — ConfirmDialog for All Destructive Actions (/refactor)

```
Ensure ConfirmDialog from src/components/shared/ConfirmDialog.jsx wraps
every delete/cancel action:
  StaffAppointments: cancelAppointment
  ServiceCatalog: deleteProduct
  AdminUsers: adminDeleteUser, deactivate
  Availability: deleteAvailability
```

### AG-R6 — Route Guards (ProtectedRoute) (/refactor)

```
Ensure src/components/ProtectedRoute/ProtectedRoute.jsx guards all
role-specific routes in App.jsx:
  /patient/*       → allowedRoles=['patient']
  /clinician/*     → allowedRoles=['clinician']
  /staff/*         → allowedRoles=['receptionist']
  /manager/*       → allowedRoles=['clinic_manager']
  /admin/*         → allowedRoles=['system_admin']
Unauthorized page at /unauthorized with LockPerson icon + 'Access Denied'.
```

---

## File Structure

```
src/
├── theme/
│   └── index.js                    ← medicalTheme ✅
├── graphql/
│   ├── queries.js                  ← All GraphQL queries
│   ├── mutations.js                ← All GraphQL mutations
│   └── subscriptions.js            ← Real-time subscriptions
├── context/
│   └── AuthContext.jsx             ← useAuth hook ✅
├── hooks/
│   └── useNotification.js          ← Snackbar hook (Phase 9)
├── components/
│   ├── shared/
│   │   ├── StatusChip.jsx          ✅
│   │   ├── DataCard.jsx            ✅
│   │   ├── DoctorCard.jsx          ✅
│   │   ├── PatientAvatar.jsx       ✅
│   │   ├── NotificationBell.jsx    ✅
│   │   ├── ConfirmDialog.jsx       ✅
│   │   ├── EmptyState.jsx          ✅
│   │   ├── SearchField.jsx         ✅
│   │   ├── Skeletons.jsx           ✅
│   │   ├── RoleBadge.jsx           ✅
│   │   ├── GlobalSnackbar.jsx      ✅
│   │   └── index.js                ✅
│   ├── ProtectedRoute/
│   │   ├── ProtectedRoute.jsx      ✅
│   │   └── RoleGuard.jsx           ✅
│   └── ...other component folders  ✅
├── layouts/
│   ├── AppShell.jsx                ✅
│   ├── PublicLayout.jsx            ✅
│   └── AuthLayout.jsx              ✅
├── pages/
│   ├── Landing.jsx                 ✅  (Phase 2)
│   ├── Login.jsx                   ✅  (Phase 1)
│   ├── DoctorProfile.jsx           🔲  AG-5
│   ├── BookingWizard.jsx           🔲  AG-6
│   ├── VideoConsultation.jsx       🔲  AG-8
│   ├── patient/
│   │   ├── Dashboard.jsx           🔲  AG-7
│   │   ├── Appointments.jsx        🔲
│   │   └── Profile.jsx             🔲
│   ├── clinician/
│   │   ├── Dashboard.jsx           🔲  AG-9
│   │   ├── Calendar.jsx            🔲
│   │   ├── Availability.jsx        🔲  AG-10
│   │   └── Patients.jsx            🔲
│   ├── staff/
│   │   ├── Dashboard.jsx           🔲
│   │   └── Appointments.jsx        🔲  AG-11
│   ├── manager/
│   │   ├── Dashboard.jsx           🔲  AG-12
│   │   ├── Clinics.jsx             🔲
│   │   ├── ServiceCatalog.jsx      🔲  AG-13
│   │   └── Billing.jsx             🔲  AG-15
│   └── admin/
│       ├── Users.jsx               🔲  AG-14
│       ├── Organizations.jsx       🔲  AG-16
│       ├── Communications.jsx      🔲  AG-17
│       └── Policies.jsx            🔲  AG-18
└── App.jsx                         ✅  (Routes + ThemeProvider)
```

---

## GraphQL API Reference

### SearchInput (Reusable Filter)

```graphql
input SearchInput {
  search: String       # text search
  limit: Int           # pagination limit
  offset: Int          # pagination offset
  orderBy: String      # sort field
  orderDirection: String  # ASC / DESC
  startDate: String    # date range start
  endDate: String      # date range end
  clinicId: ID         # filter by clinic
  roomIds: [ID!]       # filter by rooms
}
```

### Key Queries Per Screen

| Screen | Queries |
|---|---|
| Landing | `clinicians(search)`, `clinicianTypes`, `languages` |
| DoctorProfile | `clinician(id)`, `availabilities(search)`, `appointments(search)` |
| BookingWizard | `clinician(id)`, `products(search)`, `rooms(clinicId)` |
| PatientDashboard | `appointments(search)`, `notifications` |
| VideoConsultation | `appointment(id)` |
| ClinicianDashboard | `appointments(search)`, `spacerBlocks(search)`, `notifications` |
| Availability | `availabilities(search)`, `spacerBlocks(search)`, `rooms(clinicId)` |
| StaffAppointments | `appointmentsPaginated(search)`, `patients(search)`, `clinicians(search)`, `clinics`, `rooms(clinicId)`, `products(search)` |
| ManagerDashboard | `dashboardStats`, `dashboardAnalytics(dateRange)`, `clinics` |
| ServiceCatalog | `productCategories(search)`, `products(search)`, `productSubcategories(category_id)` |
| Billing | `subscriptions` |
| AdminUsers | `allUserProfiles`, `allRoles` |

### Key Mutations Per Screen

| Screen | Mutations |
|---|---|
| Login | `signin`, `signup`, `requestPasswordReset` |
| BookingWizard | `createAppointment(CreateAppointmentInput)` |
| PatientDashboard | `cancelAppointment(id)`, `notificationMarkAsRead(id)` |
| Availability | `createAvailability`, `updateAvailability`, `deleteAvailability`, `createSpacerBlock`, `deleteSpacerBlock` |
| StaffAppointments | `createAppointment`, `updateAppointment`, `cancelAppointment` |
| ServiceCatalog | `createProduct`, `updateProduct`, `deleteProduct`, `createProductCategory`, `updateProductCategory`, `deleteProductCategory` |
| AdminUsers | `adminCreateUser`, `adminUpdateUser`, `adminDeleteUser` |

---

## Execution Order Summary

| Phase | AG Prompts | Screens | Week |
|---|---|---|---|
| **Phase 1** ✅ | AG-1, AG-2, AG-3, AG-4 | Theme, Login, AppShell, Landing | Done |
| **Phase 2** | AG-5 | DoctorProfile | Week 2 |
| **Phase 3** | AG-6 | BookingWizard | Week 2 |
| **Phase 4** | AG-7, AG-8 | PatientDashboard, VideoConsultation | Week 3 |
| **Phase 5** | AG-9, AG-10 | ClinicianDashboard, Availability | Week 4 |
| **Phase 6** | AG-11 | StaffAppointments | Week 5 |
| **Phase 7** | AG-12, AG-13, AG-15 | ManagerDashboard, ServiceCatalog, Billing | Week 5-6 |
| **Phase 8** | AG-14, AG-16–18 | AdminUsers+RBAC, Orgs, Comms, Policies | Week 6-7 |
| **Phase 9** | AG-R1–R6 | Polish all 24 screens | Week 8 |

> **Total: 15 /create prompts + 6 /refactor prompts = 21 AG prompts**

---

*Generated from `plan-new.md` + `schema.ts` on 2026-03-15*
