================================================================================
  HEALTHSYNC — COMPLETE DESIGN & DEVELOPMENT PLAN
  Medical Booking & Scheduling Platform
================================================================================

  Tools:    Google Stitch (UI Design) + Antigravity AI (Code Generation) + MUI JSX
  Stack:    React JSX · MUI v5 · Apollo GraphQL · Supabase · Stripe · WebRTC
  Database: PostgreSQL via Prisma (31 models) · GraphQL API (Apollo Server)
  Theme:    Medical Teal #006D77 · Coral #E29578 · Plus Jakarta Sans
  Phases:   9 Phases · 24 Screens · 24 Stitch Prompts · 24 MUI Prompts
            15 Antigravity /create Prompts · 6 Antigravity /refactor Prompts

================================================================================
  TABLE OF CONTENTS
================================================================================

  SECTION 1  — Database Architecture (31 Models → 24 Screens)
  SECTION 2  — Design System & MUI Theme
  SECTION 3  — App Shell: Layout, Auth & Navigation
  SECTION 4  — Patient Portal Screens
  SECTION 5  — Clinician Portal Screens
  SECTION 6  — Admin & Staff Screens
  SECTION 7  — Shared Component Library
  SECTION 8  — Responsive Strategy & Implementation Roadmap
  SECTION 9  — Antigravity AI Editor Prompts (ALL 21 Prompts)

================================================================================
  SECTION 1 — DATABASE ARCHITECTURE
  All 31 Prisma Models Mapped to Screens
================================================================================

------------------------------------------------------------------------
1.1  PRISMA MODEL → SCREEN MAPPING
------------------------------------------------------------------------

  ClientOrganizations  →  Admin / Org Settings
    Fields: name, code, contact_email, settings (JSON), stripe_config,
            subscriptions, clinics[]

  Clinics              →  Clinic Management
    Fields: name, address, phone, email, is_primary, client_org_id,
            rooms[], clinicians[], appointments[]

  Clinicians           →  Doctor Profiles, Clinician Portal
    Fields: first_name, last_name, clinician_type, gender, email, phone,
            availability[], languages[], lunchBreaks[], spacerBlocks[]

  ClinicianAvailability →  Availability Builder, Slot Picker, Booking Flow
    Fields: clinician_id, clinic_id, day_of_week (0-6), start_time (HH:MM),
            end_time (HH:MM), recurrence_type, custom_dates (JSON),
            exclude_weekends, exclude_saturday, exclude_sunday,
            excluded_days (JSON), valid_from, valid_until, room_id

  Patients             →  Patient Portal, Clinician Patients
    Fields: first_name, last_name, date_of_birth, email, phone,
            phone_country_code, address, medical_notes, title, status,
            birth_surname, social_security_number, gender, occupation,
            place_of_birth (JSON), phones (JSON array), address_structured (JSON)

  Appointments         →  Core Booking, All Calendars, Dashboards
    Fields: clinic_id, room_id, clinician_id, patient_id,
            appointment_date, appointment_time, duration_minutes,
            status, reason, notes, product_id, product_variation_id

  Rooms                →  Room Management, Availability, Booking
    Fields: room_number, room_type, clinician_type, clinic_id,
            is_active, availability[], blocks[]

  RoomBlocks           →  Block Calendar
    Fields: room_id, clinic_id, block_date, start_time, end_time,
            reason, is_recurring

  SpacerBlocks         →  Clinician Schedule Blocks
    Fields: clinician_id, clinic_id, room_id, block_date, start_time,
            end_time, reason, recurrence_type, recurrence_days (JSON), end_date
    Enum RecurrenceType: single | daily | weekly | monthly | custom

  LunchBreaks          →  Schedule Gaps in Availability
    Fields: clinician_id, clinic_id, day_of_week, start_time, end_time,
            is_recurring, specific_date, recurrence_type, recurrence_days, end_date

  Products             →  Service Catalog, Booking Flow
    Fields: clinic_id, category_id, subcategory_id, name, description,
            product_type (simple|variable), sku, price, order_by, is_active

  ProductVariations    →  Service Options in Booking
    Fields: product_id, variation_name, sku, price, stock_quantity, is_active

  ProductCategories    →  Service Catalog Tabs/Sidebar
    Fields: clinic_id, name, description, is_active, subcategories[]

  ProductSubcategories →  Sub-filters in Service Catalog
    Fields: clinic_id, category_id, name, description, is_active

  ProductCancellationRules  →  Booking Policy, Policies Admin
    Fields: product_id, rule_type (cancellation|reschedule),
            hours_before_appointment, fee_type (fixed|percentage), fee_amount
    Enums: RuleType: cancellation | reschedule
           FeeType:  fixed | percentage

  Notifications        →  Notification Feed, AppBar Bell
    Fields: user_id, title, message, type, priority, is_read, action_url, metadata
    Enum NotificationType:     appointment | system | payment | alert
    Enum NotificationPriority: low | medium | high

  EmailTemplates       →  Communications Admin
    Fields: name, template_type, subject, body, is_active
    Enum TemplateType: confirmation | reschedule | cancellation

  Users + UserProfiles →  Auth System, Profile Page
    Fields: role_id, first_name, last_name, email, password, phone,
            user_image, clinic_id, clinician_id, patient_id, client_org_id,
            email_verified, password_reset_token

  UserRoles + Permissions  →  RBAC Panel
    Fields: name, description, resource, action, rolePermissions[]

  SubscriptionPlans    →  Billing / Pricing Page
    Fields: name, description, price_monthly, price_yearly,
            max_clinics, max_users, features (JSON)
    Enum SubscriptionStatus: active | cancelled | expired | trial
    Enum BillingCycle:       monthly | yearly

  OrganizationSubscriptions  →  Billing Dashboard
    Fields: client_org_id, plan_id, status, billing_cycle,
            stripe_customer_id, stripe_subscription_id

  PaymentTransactions  →  Payment History, Manager Analytics
    Fields: client_org_id, subscription_id, amount, currency, status,
            stripe_payment_intent_id, stripe_invoice_id, transaction_date

  StripeConfigurations →  Payment Settings
    Fields: client_org_id, stripe_account_id, stripe_publishable_key,
            stripe_webhook_secret

  Languages + ClinicianLanguages  →  Doctor Filters, Booking Search
    Fields: name, code, clinician_id, language_id

  ClinicianTypeModel   →  Search Filters, Doctor Profiles
    Examples: GP, Cardiologist, Dermatologist, Dentist, Pediatrician

  RoomTypeModel        →  Room Labels, Booking
    Examples: Consultation, Operating, Telemedicine

  AuditLogs            →  Admin Audit Trail
    Fields: user_id, action, resource, resource_id, details (JSON), ip_address

------------------------------------------------------------------------
1.2  24 SCREENS — ROUTES · DB MODELS · ROLES
------------------------------------------------------------------------

  #   Screen                   Route                    Roles
  --- ------------------------ ------------------------ ------------------
  1   Landing / Search         /                        Public
  2   Doctor Profile           /doctor/:id              Public
  3   Booking Flow             /book/:doctorId          Patient
  4   Payment Checkout         /book/:id/pay            Patient
  5   Patient Dashboard        /patient/dashboard       Patient
  6   Patient Appointments     /patient/appointments    Patient
  7   Video Consultation       /consultation/:id        Patient + Clinician
  8   Patient Profile          /patient/profile         Patient
  9   Clinician Dashboard      /clinician/dashboard     Clinician
  10  Clinician Calendar       /clinician/calendar      Clinician
  11  Clinician Availability   /clinician/availability  Clinician
  12  Clinician Patients       /clinician/patients      Clinician
  13  Staff Dashboard          /staff/dashboard         Receptionist
  14  Staff Appointments       /staff/appointments      Receptionist
  15  Staff Calendar           /staff/calendar          Receptionist
  16  Manager Dashboard        /manager/dashboard       Manager
  17  Clinics Management       /manager/clinics         Manager
  18  Service Catalog          /manager/products        Manager
  19  Billing & Payments       /manager/billing         Manager
  20  Admin Users + RBAC       /admin/users             Admin
  21  Admin Organizations      /admin/organizations     Admin
  22  Admin Communications     /admin/communications    Admin
  23  Admin Policies           /admin/policies          Admin
  24  Login / Register / ForgotPW /login, /register     Public

  Role Hierarchy:
  patient → clinician → receptionist → clinic_manager → system_admin

================================================================================
  SECTION 2 — DESIGN SYSTEM & MUI THEME
================================================================================

------------------------------------------------------------------------
2.1  COLOR PALETTE
------------------------------------------------------------------------

  PRIMARY — MEDICAL TEAL
  ----------------------
  #003B42   Teal 900 · Darkest
  #004D55   Teal 800 · primary.dark
  #006D77   Teal 700 · primary.main  ← BRAND COLOR
  #0A9396   Teal 600 · mid tone
  #83C5BE   Teal 400 · primary.light
  #C8EFF0   Teal 100 · soft tint
  #E8F8F9   Teal 50  · background tint

  SECONDARY — WARM CORAL
  ----------------------
  #E29578   Coral     · secondary.main
  #FFDDD2   Coral 100 · secondary.light
  #B56849   Coral 700 · secondary.dark

  STATUS COLORS
  -------------
  #2DC653   Success   · completed appointments
  #FFB703   Warning   · pending / rescheduled
  #E63946   Error     · cancelled appointments
  #3A86FF   Info      · scheduled appointments
  #7C3AED   Purple    · video / blocked slots

  BACKGROUNDS & TEXT
  ------------------
  #F0F7F8   background.default (page bg)
  #FFFFFF   background.paper (cards)
  #1A2B3C   text.primary
  #5A7184   text.secondary
  #D0E8EA   border color

  ROLE BADGE COLORS
  -----------------
  Patient      → background #FEF3C7 · text #92400E  (amber)
  Clinician    → background #D1FAE5 · text #065F46  (green)
  Receptionist → background #DBEAFE · text #1E40AF  (blue)
  Manager      → background #EDE9FE · text #4C1D95  (purple)
  Admin        → background #FFE4E6 · text #9F1239  (red)

  APPOINTMENT STATUS CHIPS
  ------------------------
  scheduled  → color="info"    outlined
  confirmed  → color="primary" outlined
  completed  → color="success" outlined
  cancelled  → color="error"   outlined
  no-show    → color="warning" outlined
  blocked    → sx bgcolor:#EDE9FE color:#4C1D95

------------------------------------------------------------------------
2.2  TYPOGRAPHY
------------------------------------------------------------------------

  Font Family: 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif
  Install:     @fontsource/plus-jakarta-sans

  h1       32px · weight 700 · letterSpacing -0.5px
  h2       24px · weight 700
  h3       20px · weight 600
  h4       16px · weight 600
  body1    15px · weight 400 · lineHeight 1.7
  body2    13px · weight 400 · color text.secondary
  caption  11px · weight 400 · letterSpacing 0.4px

------------------------------------------------------------------------
2.3  MUI THEME SETUP PROMPT
------------------------------------------------------------------------

  [MUI JSX PROMPT — src/theme/index.js]

  "Create src/theme/index.js for a React JSX + MUI v5 medical booking
  platform called HealthSync.

  Install:
    @mui/material
    @emotion/react
    @emotion/styled
    @mui/x-date-pickers
    @mui/lab
    @fontsource/plus-jakarta-sans

  Palette:
    primary:   main #006D77, light #83C5BE, dark #004D55, contrastText #fff
    secondary: main #E29578, light #FFDDD2, dark #B56849, contrastText #fff
    success:   main #2DC653, light #D1FAE5
    warning:   main #FFB703, light #FEF3C7
    error:     main #E63946, light #FFE4E6
    info:      main #3A86FF, light #EDF6F9
    background.default: #F0F7F8
    background.paper:   #FFFFFF
    text.primary:       #1A2B3C
    text.secondary:     #5A7184

  Typography:
    fontFamily: 'Plus Jakarta Sans, Segoe UI, sans-serif'
    h1: 32px/700, h2: 24px/700, h3: 20px/600, h4: 16px/600
    body1: 15px, body2: 13px, caption: 11px

  Shape: borderRadius 10

  Component overrides:
    MuiButton:    textTransform none, fontWeight 600, borderRadius 8,
                  disableElevation true
    MuiCard:      border 1px solid #D0E8EA, borderRadius 12,
                  boxShadow 0 2px 16px rgba(0,109,119,0.10)
    MuiTextField: defaultProps variant=outlined size=small
    MuiTableHead: th background #E8F8F9, color #004D55, fontWeight 700
    MuiChip:      fontWeight 600, fontSize 0.75rem
    MuiAppBar:    backgroundColor white, boxShadow none,
                  borderBottom 1px solid #D0E8EA, color text.primary
    MuiDrawer:    paper borderRight 1px solid #D0E8EA

  Export medicalTheme.
  Wrap App.jsx in ThemeProvider theme={medicalTheme} + CssBaseline."

================================================================================
  SECTION 3 — APP SHELL: LAYOUT, AUTH & NAVIGATION
================================================================================

========================================
  SCREEN 1 — LOGIN / REGISTER / FORGOT PW
  Route: /login, /register, /forgot-password
  DB: Users, UserProfiles, UserRoles
========================================

  [GOOGLE STITCH PROMPT]

  "Design a premium medical booking platform login screen for a web app
  called HealthSync. Full-screen two-column layout on desktop, single
  column on mobile.

  Left panel (60% width, desktop only):
    Deep teal gradient background from #004D55 to #0A9396.
    Large centered illustration: a clean medical cross icon with soft
    glow, surrounded by floating UI cards showing 'Your next appointment:
    Dr. Sarah Johnson — Cardiology — Tomorrow 10:00 AM' and 'Video
    consultation ready'. Below: headline 'Your health, perfectly scheduled'
    in 32px white bold. Three feature pills: calendar icon + 'Book any
    specialist instantly', shield icon + 'Secure & private', video icon +
    'In-person or video'. Bottom: five clinic logo placeholders labeled
    'Trusted by 500+ clinics'.

  Right panel (40% width):
    White background, 48px padding. HealthSync logo top-left (stethoscope
    icon + wordmark in teal #006D77). Tab row: 'Sign in' | 'Create
    account' with teal active underline. Email field with envelope icon,
    Password field with eye toggle. 'Forgot password?' link right-aligned
    in teal. 'Sign in' button: full width, teal #006D77, white text,
    10px radius. Divider: '— or continue with —'. Google OAuth button
    outlined. Footer: terms and privacy policy link.

  Style: Clean, premium medical aesthetic. Font: Plus Jakarta Sans.
  Generous spacing. No decorative noise."

  [MUI JSX PROMPT]

  "Create src/pages/Login.jsx using MUI v5 JSX (no TypeScript).
  Two-column Grid on desktop (md+), single column on mobile (xs).

  Left panel: Box sx display hide xs show md, bgcolor gradient #004D55
  to #006D77, p:8, flexDirection column. MedicalServices icon 80px white.
  Typography h5 white. Three feature Stack rows: CheckCircle + body2 text.

  Right panel: Centered Card maxWidth=440. MUI Tabs value=activeTab.

  Sign In tab: email TextField (EmailOutlined adornment), password
  TextField (Visibility toggle), forgot password Link. Submit Button
  contained fullWidth size=large with CircularProgress size=20 loading.
  Alert error on failure.

  Register tab: firstName + lastName Grid row, email, password,
  confirm password, role Select (patient/clinician). Submit: GraphQL
  signup mutation.

  Forgot PW tab: email field + Send Reset Button → Supabase reset email.

  State: activeTab, email, password, loading, error.
  On sign in: Supabase signInWithPassword.
  Export default Login."

========================================
  SCREEN 2 — APP SHELL (SIDEBAR + TOPBAR)
  All authenticated routes
  DB: UserProfiles, UserRoles, Notifications
========================================

  [GOOGLE STITCH PROMPT]

  "Design the main app navigation shell for HealthSync medical booking
  platform. Show layout with sidebar open on desktop (1440px).

  Left sidebar (260px, white, full height):
    Teal gradient header (#004D55 to #006D77): HealthSync logo in white.
    User card: Gravatar (40px), full name, role badge chip.
    Navigation list:
      Active item:   teal #006D77 bg, white text, 4px left border accent
      Inactive item: gray text, hover light teal #E8F8F9 bg
    Nav items: Dashboard, Calendar, Appointments, Patients, Availability,
    Notifications (bell + red badge '3').
    Admin submenu: Collapse with ExpandMore/Less icon.

  Top AppBar (64px, white, 1px bottom border #D0E8EA):
    Left: page breadcrumb (Home > Calendar)
    Right: notification bell with badge, avatar + name + chevron dropdown
    Dropdown menu: Profile, Settings, Sign Out (red text)

  Main content area: Light teal-gray #F0F7F8, 24px padding.

  Mobile view (375px): Collapsed sidebar, hamburger in AppBar,
  BottomNavigation with 5 icons (Home, Calendar, Patients,
  Notifications, Menu).

  Style: Professional medical SaaS. Plus Jakarta Sans."

  [MUI JSX PROMPT]

  "Create src/layouts/AppShell.jsx using MUI v5 JSX.

  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedAdmin, setExpandedAdmin] = useState(false)

  DRAWER CONTENT (width 260px):
    Header Box: teal gradient, HealthSync logo + LocalHospital icon white.
    User card: Avatar (Gravatar), name Typography, role Chip colored.
    Nav List: filter navConfig by profile.role.name.
    ListItemButton: selected → bgcolor primary.main, color white.
    Inactive → hover bgcolor #E8F8F9.
    Admin item: Collapse with nested items indented 16px.

  APPBAR:
    White bg, 64px minHeight, 1px border-bottom.
    Right: NotificationBell component (Badge + IconButton),
    Avatar button → Menu (Profile / Sign out).

  MAIN BOX:
    ml = isMobile ? 0 : '260px'
    mt = '64px'
    p = 3
    bgcolor = background.default

  Desktop: Drawer variant=permanent
  Mobile:  Drawer variant=temporary + BottomNavigation 5 items

  Role-based nav: filter navConfig array by profile.role.name.
  Use Outlet from react-router-dom for child routes.
  Export default AppShell."

================================================================================
  SECTION 4 — PATIENT PORTAL SCREENS
================================================================================

========================================
  SCREEN 3 — LANDING PAGE & DOCTOR SEARCH
  Route: /
  DB: Clinicians, ClinicianTypeModel, Languages, Clinics
========================================

  [GOOGLE STITCH PROMPT]

  "Design a premium public homepage for HealthSync, a medical appointment
  booking platform. Desktop 1440px viewport.

  Hero section (full width, teal gradient #004D55 to #0A9396):
    White nav: logo left, links center, Login + Sign up right.
    Headline: 'Find the right doctor. Book instantly.' 52px white bold.
    Subtitle: 'Search 2,000+ verified specialists across 120+ clinics'.
    White search card (large, rounded 16px, shadow):
      Three-column search bar:
        - Specialty dropdown (stethoscope icon, 'All Specialties')
        - Location field (pin icon, 'City or Clinic')
        - Date picker (calendar icon, 'Any date')
      Large teal 'Find Doctors' button.
    Below search: 8 specialty quick-pick pills in teal outline:
    Cardiology, Dermatology, Orthopedics, Dentistry, Pediatrics,
    Psychology, General Practice, Ophthalmology.

  Stats row (white bg):
    4 centered numbers with icons:
    '2,400+ Doctors', '120 Clinics', '50,000 Appointments', '4.9★ Rating'

  Featured doctors grid (3 columns):
    Doctor cards: Gravatar 64px, name, specialty chip, clinic name,
    language flags, star rating + count, next available slot,
    'Book now' teal button. 1px border, 12px radius, shadow on hover.

  How it works (3-step): Search → Select slot → Confirm.

  Bottom CTA strip: Teal gradient 'Are you a healthcare provider?'
  + 'Join HealthSync' white button.

  Style: Clean, modern medical brand. Teal #006D77 primary."

  [MUI JSX PROMPT]

  "Create src/pages/Landing.jsx in React JSX + MUI v5. No auth required.

  Hero: Box bgcolor gradient py=12. Paper elevation=4 borderRadius=4
  p=3 maxWidth=780 mx=auto as search card.
  Grid container spacing=2:
    - Autocomplete options from GraphQL getClinicianTypes()
    - TextField location with LocationOn adornment
    - DatePicker from @mui/x-date-pickers
    - Button fullWidth variant=contained size=large 'Find Doctors'

  Specialty chips: Stack direction=row flexWrap=wrap justifyContent=center
  gap=1 mt=3 — Chip per specialty, outlined, white in hero.

  Filters sidebar (md+): Paper sticky with checkboxes for
  ClinicianTypeModel list, language filter, date availability,
  price range Slider.

  Doctor results: Grid container spacing=3 xs=12 sm=6 md=4.
  Each DoctorCard: Avatar 64px (Gravatar), h6 name, Chip clinicianType,
  body2 clinic, Stack language Chips, 'Next available' text.
  CardActions: 'View Profile' outlined + 'Book Now' contained.

  Fetch: GraphQL getClinicians(filters).
  State: searchParams, clinicianTypes, languages, results, loading.
  Export default Landing."

========================================
  SCREEN 4 — DOCTOR PUBLIC PROFILE
  Route: /doctor/:id
  DB: Clinicians, ClinicianAvailability, ClinicianLanguages, Appointments
========================================

  [GOOGLE STITCH PROMPT]

  "Design a doctor profile page for HealthSync. Desktop 1440px.

  Profile header card (full width, white, shadow):
    Left: Large Gravatar avatar 120px, teal border ring, 'Verified' badge.
    Center: Doctor name 28px bold, specialty chip (teal outline),
    clinic + location body2 with icons, 5-star rating '4.8 (124 reviews)',
    languages row (flag+language chips), gender + years experience badges.
    Right: 'Book Appointment' button (large, teal contained),
    'Video consultation available' (purple outlined, webcam icon),
    'Save doctor' bookmark button.

  Left column (65%):
    About card (bio paragraph), Education & Experience timeline,
    Services offered (grid of service chips from Products),
    Languages card (flag icons + names).

  Right column (35%, sticky):
    Availability picker card:
      'Select appointment type' toggle (In-Person / Video)
      Date navigation (prev/next week + 7-day mini calendar)
      Time slot grid for selected day:
        Teal = available (clickable), Gray = unavailable, Green = selected
      'Duration: 30 min'
      Selected slot summary: date + time + doctor + type
      'Continue to Book' teal button full width.

  Below: Patient reviews section. Similar doctors row (3 cards).
  Style: Medical professional. Trust indicators prominent."

  [MUI JSX PROMPT]

  "Create src/pages/DoctorProfile.jsx.
  Fetch getClinician(id) + getClinicianAvailability(clinicianId).

  Header: Paper p=4 — Grid:
    Avatar 120px (Gravatar), Typography h4 name,
    Chip clinicianType color=primary variant=outlined,
    Stack language Chips (ClinicianLanguages → Languages),
    Chip gender, Stack buttons: Book contained + Video outlined secondary.

  Slot picker (sticky Paper right column):
    ToggleButtonGroup: 'In-Person' | 'Video'.
    DateCalendar from @mui/x-date-pickers.
    Compute slots from ClinicianAvailability:
      - Filter by selected day_of_week
      - Split start_time → end_time into 30-min chunks
      - Remove chunks that conflict with existing Appointments
    Render slots as Grid of Button chips:
      available: variant=outlined color=primary
      taken:     disabled, gray
      selected:  variant=contained
    On slot select: update state selectedSlot.
    Show summary Box + 'Continue to Book' Button.
    Navigate to /book/:clinicianId with state {slot, appointmentType}.

  GraphQL: getClinician(id), getClinicianAvailability(clinicianId),
           getAppointments(clinicianId, date).
  Export default DoctorProfile."

========================================
  SCREEN 5 — MULTI-STEP BOOKING FLOW (4 STEPS)
  Route: /book/:doctorId
  DB: Appointments, Products, ProductVariations, Rooms, Patients,
      ProductCancellationRules
========================================

  [GOOGLE STITCH PROMPT]

  "Design a 4-step booking wizard for HealthSync. 800px centered
  container on white background card.

  Progress bar (4 steps, teal connecting line):
    Active:    teal filled circle + bold label
    Completed: teal checkmark circle
    Future:    gray circle + gray label
    Labels: 1 'Select Time' → 2 'Your Details' → 3 'Choose Service'
            → 4 'Review & Pay'

  Step 1 (Select Time):
    Doctor mini card (avatar+name+specialty) at top.
    Week calendar navigation (Mon–Sun).
    Time slots grid (morning/afternoon/evening sections).
    Selected slot: teal bg white text.
    Appointment type toggle: In-Person / Video.

  Step 2 (Your Details):
    Pre-filled if logged in.
    Fields: first_name, last_name, date_of_birth, phone, email.
    Reason for visit (multiline, required).
    Notes field (optional). Medical notes upload.

  Step 3 (Choose Service):
    Grid of service cards from Products.
    Each card: name, description, duration, price, type chip.
    Variable products show variation Select below.
    Cancellation policy from ProductCancellationRules.

  Step 4 (Review & Confirm):
    Summary card: doctor, date/time, clinic/room, service/price, patient.
    Stripe payment card input.
    Cancellation policy checkbox.
    'Confirm & Pay £85' teal button. Back + Cancel links.

  Right sidebar (sticky, desktop throughout all steps):
    Progressive booking summary card with teal border.

  Style: Clean step-by-step form. Medical professional."

  [MUI JSX PROMPT]

  "Create src/pages/BookingWizard.jsx using MUI Stepper.

  const steps = ['Select Time','Your Details','Choose Service','Review & Pay']
  const [activeStep, setActiveStep] = useState(0)
  const [bookingData, setBookingData] = useState({
    slot: null, appointmentType: 'inperson',
    patient: {}, product: null, variation: null
  })

  Stepper: activeStep, alternativeLabel.
  Custom StepIcon: completed=CheckCircle teal, active=teal, inactive=gray.

  Step 0: SlotPicker component, ToggleButtonGroup appointment type.

  Step 1: React Hook Form + MUI fields. Pre-fill from useAuth() profile.
    Fields map to PatientInput GraphQL type.
    reason TextField multiline required.

  Step 2: Fetch getProducts(clinicId). Grid xs=12 sm=6 ProductCards.
    On select: if product_type=variable → Select ProductVariations.
    Alert if ProductCancellationRules exist.

  Step 3: Summary Paper. Stripe CardElement.
    Checkbox accept cancellation policy.
    On submit:
      1. stripe.createPaymentMethod()
      2. createAppointment mutation (AppointmentInput)
      3. createPaymentTransaction mutation
      4. navigate('/patient/appointments') + Snackbar success.

  Right sidebar: Grid item xs=12 md=4, display hide xs show md.
  Progressive summary Paper.

  Bottom nav: Button Back (disabled step=0) + Button Next/Submit.
  Export default BookingWizard."

========================================
  SCREEN 6 — PATIENT DASHBOARD
  Route: /patient/dashboard
  DB: Appointments, Notifications, Patients
========================================

  [GOOGLE STITCH PROMPT]

  "Design a patient-facing dashboard for HealthSync. Warm, personal,
  trustworthy medical UI. Desktop 1440px.

  Welcome banner (teal gradient card, full width):
    'Good morning, Emma' 24px white bold.
    Subtitle: 'You have 2 upcoming appointments this week'.
    Two white action buttons: 'Book new appointment' + 'View all'.
    Gravatar avatar right-aligned.

  Stats row (4 cards):
    Total appointments (calendar, teal border),
    Completed (checkmark, green), Upcoming (clock, blue),
    Cancelled (x icon, red). Large number + label + trend.

  Main content (two columns):
    Left (65%): Upcoming appointments section.
      Each card: date pill left accent, doctor avatar+name+specialty,
      clinic + room, time + duration chips, appointment type badge,
      status chip. Actions: 'Join Video' (purple), 'Reschedule', 'Cancel'.

    Right (35%):
      'Your doctors' — 3 most recent + 'Book again' buttons.
      'Recent activity' — last 5 notification events with type icons.
      Quick links: 'Update profile', 'Payment history', 'Download records'.

  Style: Patient-friendly, warm but professional."

  [MUI JSX PROMPT]

  "Create src/pages/patient/Dashboard.jsx in MUI JSX.

  GraphQL:
    getPatientAppointments(patientId, status: 'scheduled') → upcoming
    getNotifications(userId, limit: 5) → activity feed

  Welcome Box: bgcolor gradient, p:4, borderRadius:3.
    Typography h5 white 'Good morning, {firstName}'.
    Stack direction=row gap=2: two white outlined Buttons.

  KPI Grid: Grid xs=6 sm=3 per card. DataCard component:
    total (EventNote #3A86FF), completed (Check #2DC653),
    upcoming (Schedule #006D77), cancelled (Cancel #E63946).

  Appointment cards: Card borderLeft='4px solid' status color.
    Grid inside: date Box (teal bg white, borderRadius:1),
    Stack: doctor Avatar+name, clinic body2, chips row.
    CardActions: 'Join Video' Button color=secondary if video+scheduled,
    'Reschedule' outlined, 'Cancel' text error.

  Notifications feed: List with ListItemAvatar (icon by NotificationType:
    appointment=CalendarMonth, payment=Payment,
    system=Settings, alert=Warning).
    ListItemText title+message. Caption relative time.
  Mark all read Button.

  Export default PatientDashboard."

========================================
  SCREEN 7 — VIDEO CONSULTATION ROOM
  Route: /consultation/:appointmentId
  DB: Appointments, Clinicians, Patients
========================================

  [GOOGLE STITCH PROMPT]

  "Design a professional telemedicine video consultation interface for
  HealthSync. Dark UI theme. 1440px desktop.

  Background: Very dark teal #0A1F22, full screen.

  Main video area (70% width):
    Doctor's video feed in large rounded rectangle (dark border).
    Patient self-view: small PiP card (bottom-right, 200x150px).
    'Dr. Sarah Johnson' name overlay (bottom-left, translucent bg).
    Call timer '00:15:32' top-center in small white pill.

  Control bar (bottom center, dark frosted background):
    Icon buttons: Microphone (muted=red slash), Camera (off=red),
    Screen share (teal when active), Chat bubble, Participants (count badge),
    Settings gear. Center: large red 'End call' button (circle, 56px).
    All buttons: dark bg, rounded, hover lighten.

  Right panel (30%, collapsible):
    Tabs: 'Appointment Info' | 'Chat' | 'Notes'.
    Info: appointment details card.
    Chat: messages thread + input field.
    Notes: doctor private textarea + 'Save notes' button.

  Top bar: HealthSync logo (white), appointment info,
  'Secure & Encrypted' shield badge in teal, network quality indicator.

  Style: Dark mode, professional medical telehealth UI."

  [MUI JSX PROMPT]

  "Create src/pages/VideoConsultation.jsx.
  LOCAL dark theme override only:
  const darkTheme = createTheme({ palette: { mode: 'dark',
    primary: { main: '#006D77' },
    background: { default: '#0A1F22', paper: '#0F2D33' }
  }})
  Wrap in ThemeProvider theme=darkTheme.

  Layout: Box bgcolor='#0A1F22' minHeight='100vh' flexDirection=column.
  AppBar: bgcolor='#0F2D33' borderBottom='1px solid #1E4A52'.
    Stack direction=row: logo, title, Security badge.

  Main: Box flexGrow=1 display=flex p=2 gap=2.
    Main video Box: position=relative bgcolor=#000 borderRadius=2.
      video ref=remoteVideoRef autoPlay playsInline (fill container).
      Self-view Box position=absolute bottom=16 right=16 width=200:
        video ref=localVideoRef muted.
      Name overlay: Box position=absolute bottom=16 left=16.
      Timer: Box position=absolute top=16 left=50%.

  Controls: Box bgcolor=rgba(15,45,51,0.95) py=2 justifyContent=center.
    Mic IconButton (toggle MicIcon/MicOffIcon, off=error color).
    Camera IconButton (toggle, off=error color).
    ScreenShare IconButton.
    Chat IconButton with Badge count.
    Fab color=error: CallEnd.
    Settings IconButton.

  Right panel Box width=320 bgcolor='#0F2D33':
    Tabs: 'Info' | 'Chat' | 'Notes'.
    Panel 0: appointment details Cards.
    Panel 1: messages List + TextField + Send IconButton.
    Panel 2: notes TextField multiline + Save Button.

  useRef localVideoRef, remoteVideoRef.
  useEffect: navigator.mediaDevices.getUserMedia scaffold.
  Comment: 'Replace with Twilio/Daily.co/WebRTC SDK'.
  Fetch: getAppointment(id) on mount.
  Export default VideoConsultation."

================================================================================
  SECTION 5 — CLINICIAN PORTAL SCREENS
================================================================================

========================================
  SCREEN 9 — CLINICIAN DASHBOARD
  Route: /clinician/dashboard
  DB: Appointments, ClinicianAvailability, SpacerBlocks, LunchBreaks,
      Notifications
========================================

  [GOOGLE STITCH PROMPT]

  "Design a clinician daily work dashboard for HealthSync.
  Professional medical workspace UI. Desktop 1440px.

  Header strip (teal #006D77, white text):
    Current date + day. 'Dr. James Wilson · Cardiologist · City Clinic'.
    Right: 'Your availability today: 08:00–17:00' + 'Add block' button.

  Today's schedule (left column, 55%):
    Vertical timeline 08:00–18:00 (every 30 min on Y-axis).
    Appointment blocks (colored rectangles):
      Patient name bold, appointment type icon, service name, duration.
      scheduled=teal, confirmed=green, cancelled=red strikethrough,
      video=purple. Click: opens appointment detail popover.
    Lunch break: amber striped pattern 'Lunch 13:00–14:00'.
    Empty slots: light gray, 'Available', '+' button on hover.
    SpacerBlocks: gray hatched with reason tooltip.

  Right column (45%):
    Today stats row: Total (calendar), Completed (check),
    Remaining (clock), Video calls (camera).
    Next patient card (teal border):
      Gravatar 64px, patient name + age, appointment time,
      reason for visit. 'View notes' + 'Start session' buttons.
    Queue list: next 4 patients compact rows.
    Recent notifications: 3 alert items."

  [MUI JSX PROMPT]

  "Create src/pages/clinician/Dashboard.jsx in MUI JSX.

  GraphQL:
    getTodayAppointments(clinicianId, date: today)
    getSpacerBlocks(clinicianId, date: today)
    getLunchBreaks(clinicianId)

  Header strip: Paper bgcolor=primary.main p=2 borderRadius=2.
    Stack direction=row justifyContent=space-between.
    Typography body1 color=white fontWeight=700 dayjs().format().
    Button variant=outlined sx color=white 'Add Block'.

  Stats row: Grid container spacing=2 xs=6 sm=3.
    DataCard: todayTotal (EventNote #3A86FF), completed (Check #2DC653),
    remaining (Schedule #006D77), videoCount (Videocam #7C3AED).

  Timeline: Box position=relative height=600 overflow=auto.
    Time labels: array 08:00–18:00 every 30min, absolute positioned left=0.
    Map todayAppointments:
      top = (hour*60 + min - 480) * 1.2
      height = duration * 1.2
      Card position=absolute left=60 right=0 bgcolor per status.
    LunchBreaks: Box amber hatched.
    SpacerBlocks: Box gray with Tooltip reason.

  Next patient: Paper border='2px solid' borderColor=primary.main p=3.
    Avatar size=64, name h6, time body2, reason body2.
    Stack direction=row gap=1 mt=2:
      Button outlined 'View Notes'.
      Button contained 'Start Session' (if video → navigate to /consultation/:id).

  setInterval refresh every 60s.
  Export default ClinicianDashboard."

========================================
  SCREEN 11 — CLINICIAN AVAILABILITY BUILDER
  Route: /clinician/availability
  DB: ClinicianAvailability, LunchBreaks, SpacerBlocks, Rooms
  RecurrenceType enum: single|daily|weekly|monthly|custom
========================================

  [GOOGLE STITCH PROMPT]

  "Design a clinician availability management screen for HealthSync.
  Desktop 1440px.

  Page header: 'Manage Availability' h5, clinic selector dropdown.
  'Add Availability' teal button + 'Add Block' outlined button.

  Weekly overview grid (7 columns Mon–Sun):
    Each column = day card with day name header.
    Colored time bars:
      Teal solid = availability windows
      Amber dashed = lunch breaks
      Gray hatched = spacer blocks
    Hover a bar: tooltip shows start/end time + room.
    Empty day: 'No availability' + '+' icon button.

  Add Availability Drawer (right side, 400px):
    'New Availability Slot' title.
    Recurrence type Radio:
      Single Date | Daily | Weekly | Monthly | Custom
    If weekly: day-of-week ToggleButtonGroup (M T W T F S S).
    Start time + End time TimePickers.
    Room Select dropdown.
    Valid from + Valid until DatePickers (optional).
    Exclude weekends Switch.
    Save teal button + Cancel.

  Lunch breaks section (below grid):
    Simple list with day chip + start–end time + recurring badge.
    'Add lunch break' button.

  Visual timeline (full width):
    Horizontal bar chart 08:00–20:00 showing weekly availability.
    Heatmap grid: each cell = 30min slot per day, colored if available."

  [MUI JSX PROMPT]

  "Create src/pages/clinician/Availability.jsx in MUI JSX.

  State:
    drawerOpen=false, editSlot=null,
    formData: { recurrence_type:'weekly', day_of_week:null,
      start_time:'09:00', end_time:'17:00', room_id:'',
      valid_from:null, valid_until:null, exclude_weekends:false,
      exclude_saturday:false, exclude_sunday:false,
      excluded_days:'', custom_dates:'' }

  7-day grid: Grid container columns=7 spacing=1.
    Days: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'] with dayIndex 0-6.
    Each Grid item: Paper p=1 minHeight=220 border borderRadius=2.
      Filter availability where day_of_week===dayIndex OR recurrence=daily:
        Box bgcolor=primary.main opacity=0.85 borderRadius=1 cursor=pointer
        Typography caption color=white: start_time+' — '+end_time
        Typography caption color=rgba(255,255,255,0.8): room.room_number
      Filter lunchBreaks:
        Box bgcolor=warning.light border=dashed borderColor=warning.main
        Typography caption 'Lunch '+start+'-'+end
      Button size=small startIcon=Add 'Add Slot' fullWidth variant=outlined.

  Availability Drawer: Drawer anchor=right PaperProps sx={width:420, p:3}.
    Typography h6 'Availability Slot'.
    RadioGroup recurrence_type:
      Radio single / daily / weekly / monthly / custom
    CONDITIONAL weekly: ToggleButtonGroup value=day_of_week
      ToggleButton for M=1, T=2, W=3, T=4, F=5, S=6, S=0.
    TimePicker Start + TimePicker End (validate end > start).
    Autocomplete rooms from getRooms(clinicId).
    DatePicker valid_from + DatePicker valid_until optional.
    FormGroup: Switch exclude_weekends, exclude_saturday, exclude_sunday.
    Stack justifyContent=flex-end gap=2 mt=3:
      Button 'Cancel'. Button variant=contained 'Save' onClick=handleSave.

  handleSave:
    createAvailability or updateAvailability GraphQL mutation.
    Input type: CreateAvailabilityInput / UpdateAvailabilityInput.
    Close drawer + refetch.

  LunchBreaks section below grid: Paper p=2.
    List of lunchBreaks each with time range + day + Chip recurring.
    Add Lunch Break Dialog.

  GraphQL: getAvailability(clinicianId), getLunchBreaks(clinicianId),
           getSpacerBlocks(clinicianId), getRooms(clinicId).
  Export default Availability."

================================================================================
  SECTION 6 — ADMIN & STAFF SCREENS
================================================================================

========================================
  SCREEN 14 — STAFF APPOINTMENT MANAGEMENT
  Route: /staff/appointments
  DB: Appointments, Patients, Clinicians, Rooms, Products,
      ProductVariations
========================================

  [GOOGLE STITCH PROMPT]

  "Design a staff/receptionist appointment management screen for
  HealthSync. Power-user interface. Desktop 1440px.

  Header: 'Appointments' h5 + count badge.
  Right: 'Book Appointment' teal + 'Export CSV' outlined + view toggle icons.

  Filter bar (white card):
    Clinic select, Clinician Autocomplete (avatar+name in options),
    Status multi-select chips, Date range from/to DatePickers,
    Patient search TextField.
    Active filters as dismissible Chips. 'Clear all' link.

  Table (sticky header):
    Columns: checkbox, Date & Time, Patient (avatar+name+email),
    Clinician (avatar+specialty chip), Clinic & Room,
    Duration chip, Service (product+price), Status chip, Actions.
    Row hover: teal light bg. Sorted by date desc.

  Book Appointment modal (Dialog 900px):
    Two-column layout.
    Left: Patient search Autocomplete, clinician Autocomplete,
    clinic select, room select, DatePicker, TimePicker,
    duration Select (15/30/45/60min), service Autocomplete + variation,
    reason multiline, notes.
    Right: availability preview calendar showing clinician's free slots.
    Bottom: Cancel + 'Book Appointment' teal button."

  [MUI JSX PROMPT]

  "Create src/pages/staff/Appointments.jsx in MUI JSX.

  State: filters={clinic:'',clinician:'',status:[],dateFrom:null,
         dateTo:null,search:''}, modalOpen=false, editAppointment=null,
         page=0, rowsPerPage=10.

  Filter bar: Paper p=2 mb=2. Grid container spacing=2.
    Select clinic, Autocomplete clinician, Select multiple status,
    DatePicker from/to, TextField search debounced 300ms.
    Active filters: Stack direction=row — Chip per filter, onDelete=clear.

  Table: TableContainer Paper. Table stickyHeader.
    TableHead: checkbox + columns listed above.
    TableBody: map appointments:
      Avatar patient + name+email, Avatar clinician + specialty Chip,
      clinic body2 + caption room, Chip duration, StatusChip,
      IconButton edit (→ open modal with prefilled),
      IconButton cancel color=error (→ ConfirmDialog).
    TableFooter: TablePagination.

  Booking Modal: Dialog maxWidth=lg fullWidth.
    DialogTitle 'Book Appointment' + CloseIconButton.
    Grid container spacing=3:
      Left xs=7:
        Autocomplete patients (searchPatients(query) debounced).
        Autocomplete clinicians. Select clinic → Select room filtered.
        DatePicker + TimePicker. Select duration. Product Autocomplete.
        Conditional Select variation. TextField reason required.
      Right xs=5:
        Paper p=2 border — availability preview (reuse SlotPicker).

  handleBookSubmit: createAppointment(AppointmentInput) mutation.
  Snackbar success + refetch list.

  GraphQL: getAppointments(filters), searchPatients(query),
           getClinicians, getClinics, getRooms(clinicId), getProducts(clinicId).
  Export default StaffAppointments."

========================================
  SCREEN 16 — MANAGER ANALYTICS DASHBOARD
  Route: /manager/dashboard
  DB: Appointments, Clinics, Clinicians, PaymentTransactions, Patients
========================================

  [GOOGLE STITCH PROMPT]

  "Design a clinic manager analytics dashboard for HealthSync.
  Professional healthcare SaaS analytics. Desktop 1440px.

  Header: 'HealthSync Analytics' + date range picker.
  Clinic filter dropdown.

  Top KPI row (5 cards):
    Total Appointments (calendar, teal border),
    Revenue (£ sign, green border),
    Active Patients (person, blue border),
    Clinician Utilization % (gauge, purple border),
    Cancellation Rate % (x icon, red border).
    Each: large number + label + trend vs previous period.

  Charts row (two columns):
    Left: Line chart 'Appointments over time'
      3 lines: Scheduled (teal), Completed (green), Cancelled (red).
    Right: Bar chart 'Revenue by clinic'
      Grouped bars per clinic, colored by clinic name.

  Second row:
    Left:   Pie chart 'Appointment type distribution'
    Center: 'Top performing clinicians' table
            (rank, name, specialty, appointments, revenue, rating)
    Right:  'Room utilization heatmap' (7×24 grid, darker = more booked)

  Bottom: Recent transactions table
    (date, patient, clinician, service, amount, status chip)"

  [MUI JSX PROMPT]

  "Create src/pages/manager/Dashboard.jsx in MUI JSX + Recharts.

  State: dateFilter='monthly', clinicFilter='all'.
  ToggleButtonGroup: 7d / 30d / 90d / custom. Select clinicFilter.

  KPI Row: Grid xs=12 sm=6 md 5 cards DataCard:
    totalAppointments (#3A86FF), revenue (#2DC653),
    activePatients (#006D77), utilization (#7C3AED),
    cancellationRate (#E63946). Trend Chip vs previous period.

  Recharts Line Chart (Card p=2):
    ResponsiveContainer height=280.
    LineChart data=appointmentData.
    CartesianGrid strokeDasharray, XAxis, YAxis, Tooltip, Legend.
    Line scheduled stroke=#006D77 strokeWidth=2 dot=false.
    Line completed stroke=#2DC653.
    Line cancelled stroke=#E63946.

  Recharts Bar Chart (Card p=2):
    BarChart data=revenueData height=250.
    Bar dataKey=revenue fill=#006D77 radius=[4,4,0,0].

  Transactions Table: MUI Table.
    Columns: date, Avatar+name patient, clinician, service,
    Typography h6 amount color=primary, StatusChip.
    TablePagination. Skeleton on loading.

  GraphQL: getAppointmentStats(dateRange clinicId),
           getPaymentTransactions(orgId dateRange), getClinics.
  Export default ManagerDashboard."

========================================
  SCREEN 18 — SERVICE CATALOG MANAGEMENT
  Route: /manager/products
  DB: Products, ProductCategories, ProductSubcategories,
      ProductVariations, ProductCancellationRules
========================================

  [GOOGLE STITCH PROMPT]

  "Design a service catalog management screen for HealthSync.
  Medical services catalog (Consultations, Scans, Check-ups).
  Desktop 1440px.

  Left sidebar (220px):
    Category tree — each ProductCategory as collapsible item with
    ProductSubcategories as children. Selected: teal bg.
    Count badge per category. 'Add Category' button at bottom.

  Main area:
    Category breadcrumb h5. 'Add Service' teal button + Search TextField.
    Service cards grid (3 columns): name h6, type badge (Simple=blue /
    Variable=purple), SKU monospace code, price h5 teal, description
    2-line truncated, category breadcrumb, active switch, edit/delete icons.
    Hover: soft shadow lift.

  Add/Edit Service Dialog (tabbed, 700px):
    Tab 1 'Basic Info': name, description multiline, productType Radio
      (Simple/Variable), category+subcategory selects, SKU, price, isActive.
    Tab 2 'Variations' (Variable only): table of variations
      (name, SKU, price, stock) + 'Add Variation' row.
    Tab 3 'Cancellation Rules': rules list, 'Add Rule' form:
      ruleType Radio (cancellation/reschedule),
      feeType Radio (fixed/percentage), fee amount, hours threshold.

  Style: E-commerce catalog meets medical professional."

========================================
  SCREEN 20 — ADMIN USERS + RBAC
  Route: /admin/users, /admin/roles
  DB: Users, UserProfiles, UserRoles, Permissions, RolePermissions,
      AuditLogs
========================================

  [GOOGLE STITCH PROMPT]

  "Design an admin user management screen for HealthSync.
  Enterprise SaaS admin panel. Desktop 1440px.

  Tabs at top: Users | Roles & Permissions | Audit Log.

  Users tab:
    Search + role filter + status filter row.
    Table: Avatar (Gravatar 40px) + name + email, Role badge chip
    (patient=orange, clinician=green, receptionist=blue,
    manager=purple, admin=red), Clinic assigned, Status toggle,
    Last login (relative time), Actions (edit, deactivate, reset PW).
    Add User → Dialog: email, password, name, role Select,
    clinic_id Select, is_active Switch.

  Roles & Permissions tab (two-panel):
    Left panel (280px): list of roles clickable. Active: teal bg.
    Right panel: Permissions matrix table
      Rows: resource names (appointments, patients, clinicians,
            rooms, products, etc.)
      Columns: create / read / update / delete
      Cells: teal filled checkbox if allowed, gray empty if not.
    Save changes button.

  Audit Log tab:
    Table: timestamp, user (avatar+name), action badge (CREATE=green/
    UPDATE=blue/DELETE=red), resource+id, IP address,
    expandable JSON viewer for details."

========================================
  SCREEN 19 — BILLING & SUBSCRIPTIONS
  Route: /manager/billing
  DB: OrganizationSubscriptions, SubscriptionPlans,
      PaymentTransactions, StripeConfigurations
========================================

  [GOOGLE STITCH PROMPT]

  "Design a billing and subscription management screen for HealthSync.
  Desktop 1440px.

  Current plan card (full width, teal gradient):
    Plan name 'Professional' 28px white. '£249/month' price.
    Billing cycle toggle: Monthly / Yearly ('Save 20%' badge on yearly).
    Features list: checkmarks + text.
    Status: 'Active' green pill.
    'Upgrade Plan' white button + 'Manage billing' outlined white.

  Usage metrics row (3 cards):
    Clinics used (3/5 progress bar teal),
    Users (12/50), Monthly appointments (sparkline).

  Plan comparison (3 cards — Starter/Professional/Enterprise):
    Selected plan: teal border, 'Current Plan' badge.
    Monthly/yearly price. Feature checkmarks. Select Plan buttons.

  Payment history table:
    Date, Invoice ID (link), Description, Amount, Status chip
    (paid=green, pending=amber, failed=red), Download PDF icon.
    Pagination at bottom.

  Stripe settings card:
    Stripe logo, masked publishable key, webhook URL,
    'Configure Stripe' teal button."

================================================================================
  SECTION 7 — SHARED COMPONENT LIBRARY
================================================================================

  All components in: src/components/shared/
  Export all from:   src/components/shared/index.js

  Component         DB Models Used                    Description
  ─────────────────────────────────────────────────────────────────────────────
  StatusChip        Appointments.status               Colored MUI Chip per status
  NotificationBell  Notifications (unread count)      Badge IconButton, polls 30s
  DoctorCard        Clinicians, ClinicianLanguages     Profile card for search
  AppointmentCard   Appointments, Clinicians, Patients Timeline & list card
  SlotPicker        ClinicianAvailability, Appts       Available time slots grid
  PatientAvatar     Patients.email + name             Gravatar with fallback
  RoleBadge         UserRoles.name                    Colored Chip per role
  DataCard          Analytics stats                   KPI card: icon, value, trend
  ConfirmDialog     Any delete/cancel action          Title, message, confirm/cancel
  EmptyState        Any list screen                   Icon, title, subtitle, CTA
  SearchField       Any search                        Debounced, clear X button
  SkeletonLoader    Any loading state                 Table rows or card grid
  ProductCard       Products, ProductVariations        Selectable service card
  ClinicSelector    Clinics                            Select with address subtitle
  RecurrenceForm    RecurrenceType enum               Availability/block builder
  NotificationItem  Notifications model               Priority dot, type icon
  TimelineView      Appointments, Blocks              Daily schedule vertical
  WeeklyGrid        ClinicianAvailability             7-column availability view

  [MUI JSX PROMPT — Build all shared components]

  "Create src/components/shared/ with these MUI JSX components:

  1. StatusChip.jsx — props: status (string)
     Map: scheduled→info, confirmed→primary, completed→success,
          cancelled→error, no-show→warning, blocked→custom purple.
     Return: <Chip size='small' label={status} color={map[status]}
             variant='outlined' />

  2. DataCard.jsx — props: icon, value, label, trend, borderColor
     Paper elevation=0, border, borderLeft='4px solid' borderLeftColor.
     Stack direction=row: Avatar bgcolor tint + icon, Box: h4 value + body2 label.
     If trend: Chip size=small color=trend>0?success:error.

  3. SlotPicker.jsx — props: clinicianId, clinicId, onSlotSelect
     Fetch ClinicianAvailability. Compute 30-min slots for selected date.
     Grid of Button chips. Disabled if conflicts with Appointment.
     Selected: variant=contained. Returns {date, startTime, endTime, roomId}.

  4. RecurrenceForm.jsx — props: value, onChange
     RadioGroup for RecurrenceType enum (single/daily/weekly/monthly/custom).
     Conditional: weekly → ToggleButtonGroup Mon-Sun (day_of_week 0-6).
     custom → multiple DatePicker.
     Both → end_date DatePicker + Switch exclude_weekends.

  5. PatientAvatar.jsx — props: email, firstName, lastName, size
     Sizes: sm=32 / md=40 / lg=64 / xl=96.
     Gravatar URL via md5(email). Avatar src=gravatarUrl.
     On error: fallback initials with teal bgcolor.

  6. NotificationBell.jsx
     Badge badgeContent=unreadCount color=error.
     Poll getNotifications(userId, isRead:false) every 30s.
     IconButton → Menu with last 5 notifications.
     'View all' MenuItem → navigate /notifications.

  7. ConfirmDialog.jsx — props: open, title, message, onConfirm,
                                onCancel, loading, severity (default=error)
     Dialog maxWidth=xs. WarningAmberRounded if severity=error.
     Cancel Button + Confirm Button variant=contained color=severity.
     CircularProgress size=16 inside confirm button when loading.

  8. EmptyState.jsx — props: icon, title, subtitle, action {label, onClick}
     Box textAlign=center py=8.
     Box bgcolor=primary.50 borderRadius=50% width=80 height=80 mx=auto:
       icon cloneElement sx fontSize=40 color=primary.main.
     h6 title, body2 color=text.secondary subtitle.
     If action: Button variant=contained mt=3.

  Export all from src/components/shared/index.js."

================================================================================
  SECTION 8 — RESPONSIVE STRATEGY & IMPLEMENTATION ROADMAP
================================================================================

------------------------------------------------------------------------
8.1  BREAKPOINT STRATEGY
------------------------------------------------------------------------

  MOBILE — xs (0–599px)
  ─────────────────────
  Navigation:   Hidden sidebar, hamburger AppBar + swipeable Drawer
                + BottomNavigation (5 icons)
  Tables:       Replace with Card list view (display none on xs)
  Dialogs:      fullScreen={isMobile} prop on all Dialog components
  Grids:        All single column
  Landing:      Hero stacked, search vertical, doctor cards 1-col
  Calendar:     Day view only by default
  KPI cards:    2-column grid (xs=6)
  Booking:      Stepper vertical orientation, no sidebar summary

  TABLET — sm/md (600–1199px)
  ──────────────────────────
  Navigation:   Collapsible mini Drawer (64px icons only), expand on hover
  Tables:       Visible but lower-priority columns hidden
                (display:{xs:'none',sm:'table-cell'})
  Dialogs:      maxWidth='sm', no fullScreen
  Grids:        2-column layouts (sm=6)
  Calendar:     Week view with 3-day window
  KPI cards:    3-column grid (sm=4)
  Availability: 3-col grid (Mon-Wed / Thu-Fri / Sat-Sun)

  DESKTOP — lg/xl (1200px+)
  ──────────────────────────
  Navigation:   Permanent Drawer (260px), always visible
  Tables:       Full columns, inline actions, hover states
  Dialogs:      maxWidth='md' or 'lg'
  Grids:        3–4 column layouts
  Calendar:     Full week view (7 days)
  KPI cards:    5-column grid (all in one row)
  Availability: Full 7-column weekly grid with visual timeline
  Booking:      Sticky right summary panel throughout all steps

  Global responsive pattern:
    const isMobile = useMediaQuery(theme.breakpoints.down('md'))
    const isTablet = useMediaQuery(theme.breakpoints.between('sm','lg'))
    All Dialog: fullScreen={isMobile}
    All Table: wrapped in Box sx={overflow:'auto'}
    Form grids: Grid item xs=12 sm=6 pattern

------------------------------------------------------------------------
8.2  PROJECT FILE STRUCTURE (React JSX)
------------------------------------------------------------------------

  src/
  ├── theme/
  │   └── index.js               ← MUI medicalTheme
  ├── lib/
  │   ├── graphql.js             ← Apollo client setup
  │   ├── auth.jsx               ← AuthContext + useAuth hook
  │   ├── supabase.js            ← Supabase client
  │   └── utils.js               ← date helpers, formatters, md5
  ├── components/
  │   ├── shared/
  │   │   ├── StatusChip.jsx
  │   │   ├── DataCard.jsx
  │   │   ├── SlotPicker.jsx
  │   │   ├── RecurrenceForm.jsx
  │   │   ├── PatientAvatar.jsx
  │   │   ├── NotificationBell.jsx
  │   │   ├── DoctorCard.jsx
  │   │   ├── ConfirmDialog.jsx
  │   │   ├── EmptyState.jsx
  │   │   ├── SearchField.jsx
  │   │   ├── SkeletonLoader.jsx
  │   │   └── index.js
  │   └── forms/
  │       ├── AppointmentForm.jsx
  │       ├── PatientForm.jsx
  │       └── AvailabilityForm.jsx
  ├── layouts/
  │   ├── AppShell.jsx           ← Drawer + AppBar + Outlet
  │   ├── PublicLayout.jsx       ← Landing, doctor profiles
  │   └── AuthLayout.jsx         ← Login, register, forgot PW
  ├── pages/
  │   ├── Landing.jsx            ← Public search homepage
  │   ├── DoctorProfile.jsx
  │   ├── BookingWizard.jsx
  │   ├── VideoConsultation.jsx
  │   ├── Login.jsx
  │   ├── Unauthorized.jsx
  │   ├── patient/
  │   │   ├── Dashboard.jsx
  │   │   ├── Appointments.jsx
  │   │   └── Profile.jsx
  │   ├── clinician/
  │   │   ├── Dashboard.jsx
  │   │   ├── Calendar.jsx
  │   │   ├── Availability.jsx
  │   │   └── Patients.jsx
  │   ├── staff/
  │   │   ├── Dashboard.jsx
  │   │   ├── Appointments.jsx
  │   │   └── Calendar.jsx
  │   ├── manager/
  │   │   ├── Dashboard.jsx
  │   │   ├── Clinics.jsx
  │   │   ├── ServiceCatalog.jsx
  │   │   └── Billing.jsx
  │   └── admin/
  │       ├── Users.jsx
  │       ├── Organizations.jsx
  │       ├── Communications.jsx
  │       └── Policies.jsx
  └── App.jsx                    ← Routes + ThemeProvider + AuthProvider

------------------------------------------------------------------------
8.3  PHASED IMPLEMENTATION ROADMAP (8 WEEKS)
------------------------------------------------------------------------

  PHASE 1 — Foundation (Week 1)
    MUI theme installation and setup
    Auth screens: Login, Register, Forgot Password
    AppShell layout: Drawer + AppBar + routing
    Shared component library (all 18 components)
    Prompts: AG-1, AG-2, AG-3, Component Library

  PHASE 2 — Public Patient Portal (Week 2)
    Landing page with live doctor search
    DoctorProfile with real ClinicianAvailability slot picker
    URL search params for filter state
    Prompts: Stitch 3–4, AG-4, AG-5

  PHASE 3 — Booking Flow + Payments (Week 3)
    4-step BookingWizard with MUI Stepper
    Stripe integration (CardElement, payment intent)
    ProductVariations selection
    ProductCancellationRules display in booking
    Prompts: Stitch 5–6, AG-6

  PHASE 4 — Patient Dashboard + Video (Week 4)
    Patient dashboard with real appointment cards
    Video consultation room (dark theme, WebRTC scaffold)
    Patient profile with all Patients model fields
    Prompts: Stitch 7–8, AG-7, AG-8

  PHASE 5 — Clinician Portal (Week 5)
    Clinician daily timeline dashboard
    Availability Builder: all 5 RecurrenceType values
    LunchBreaks management
    SpacerBlocks with recurrence
    Prompts: Stitch 9–12, AG-9, AG-10

  PHASE 6 — Staff & Manager (Week 6)
    Staff appointment CRUD with book-on-behalf
    Manager analytics dashboard (Recharts)
    Service catalog with variations and rules
    Billing + Stripe subscription UI
    Prompts: Stitch 13–19, AG-11, AG-12, AG-13, AG-15

  PHASE 7 — Admin Panel (Week 7)
    User management with role chips
    RBAC permissions matrix (resource × action checkboxes)
    Audit logs with JSON viewer
    Organizations + subscriptions management
    Email templates, policies
    Prompts: Stitch 20–23, AG-14

  PHASE 8 — Polish & QA (Week 8)
    Run all 6 Antigravity /refactor prompts (AG-R1 through AG-R6)
    Mobile responsive testing on all 24 screens
    Skeleton loading states on all data screens
    Empty states on all list screens
    Confirm dialogs on all delete/cancel actions
    Role-based route guards (ProtectedRoute)
    Accessibility audit (aria-labels, keyboard nav, contrast)
    Performance: React.memo, code splitting, lazy loading

================================================================================
  SECTION 9 — ANTIGRAVITY AI EDITOR PROMPTS
  15 /create Prompts + 6 /refactor Prompts
================================================================================

  HOW TO USE ANTIGRAVITY AI
  ─────────────────────────
  Antigravity AI is an AI-powered code editor that generates full React
  components from natural language prompts directly inside your project.

  3-Tool Workflow:
    STEP 1: Google Stitch  → paste Stitch prompt → get visual mockup
    STEP 2: Antigravity AI → paste AG prompt below → get working JSX file
    STEP 3: MUI + GraphQL  → wire to real data using MUI JSX prompts

  Commands:
    /create   → new file from scratch
    /edit     → modify existing file
    /refactor → clean up and improve existing code
    /explain  → understand code
    /fix      → debug errors

  Always include in every prompt:
    • "React JSX no TypeScript"
    • "MUI v5"
    • "export default ComponentName"
    • "use our medicalTheme"
    • "GraphQL query/mutation: [exact name from schema.ts]"
    • File path: "src/pages/patient/Dashboard.jsx"

  Antigravity tips:
    • Attach the Google Stitch screenshot as image context
    • Ask it to export default all components
    • End each prompt with "use our medicalTheme"
    • Specify exact state variable names you want
    • Name GraphQL queries from schema.ts exactly

------------------------------------------------------------------------
  PHASE 1: FOUNDATION
------------------------------------------------------------------------

════════════════════════════════════════
  AG-1 — Create MUI Theme + Wrap App.jsx
  File: src/theme/index.js
════════════════════════════════════════

  [ANTIGRAVITY PROMPT — /create]

  "React JSX no TypeScript. Create src/theme/index.js with MUI v5
  createTheme for a medical booking platform called HealthSync.

  Primary color #006D77 (medical teal), primary.dark #004D55,
  primary.light #83C5BE. Secondary #E29578 (warm coral), secondary.light
  #FFDDD2. Success #2DC653, warning #FFB703, error #E63946, info #3A86FF.
  Background default #F0F7F8, paper #FFFFFF. Text primary #1A2B3C,
  secondary #5A7184.

  Typography: fontFamily 'Plus Jakarta Sans, Segoe UI, sans-serif'.
  h1 32px 700, h2 24px 700, h3 20px 600, h4 16px 600,
  body1 15px, body2 13px.

  Shape borderRadius 10.

  Override MuiButton: textTransform none, fontWeight 600, borderRadius 8,
  disableElevation true.
  Override MuiCard: border '1px solid #D0E8EA', borderRadius 12.
  Override MuiTextField: defaultProps variant=outlined size=small.
  Override MuiTableHead: th background #E8F8F9, fontWeight 700,
  color #004D55.
  Override MuiAppBar: backgroundColor white, boxShadow none,
  borderBottom '1px solid #D0E8EA', color text.primary.

  Export medicalTheme. Then update src/App.jsx: import ThemeProvider
  CssBaseline from @mui/material, wrap entire app in ThemeProvider
  theme=medicalTheme with CssBaseline inside. Use our medicalTheme."

════════════════════════════════════════
  AG-2 — Login.jsx Full Auth Screen
  File: src/pages/Login.jsx
  DB:   Users, UserProfiles, UserRoles
════════════════════════════════════════

  [ANTIGRAVITY PROMPT — /create]

  "React JSX no TypeScript. Create src/pages/Login.jsx using MUI v5.

  Two-column Grid on desktop (md+), single column on mobile (xs).

  Left panel: Box sx display hide xs show md, bgcolor linear-gradient
  #004D55 to #006D77, p:8, flexDirection column, alignItems center,
  justifyContent center. MedicalServices icon 80px white. Typography h5
  white 'Your health, perfectly scheduled'. Stack of 3 rows: CheckCircle
  icon + body2 text ('Book any specialist instantly', 'Secure and
  private', 'In-person or video'). All white text.

  Right panel: Box display=flex alignItems=center justifyContent=center
  p=6. Paper elevation=0 border='1px solid #D0E8EA' borderRadius=3 p=4
  maxWidth=420 width='100%'. Stack spacing=3.

  HealthSync logo: Stack direction=row alignItems=center gap=1 —
  LocalHospital icon color=primary, Typography h5 fontWeight=800
  color=primary.main 'HealthSync'.

  MUI Tabs value=activeTab onChange.

  Tab 0 Sign In:
    TextField email (EmailOutlined adornment required).
    TextField password type=password (Visibility toggle InputAdornment).
    Box textAlign=right: Link onClick=goToForgot 'Forgot password?'.
    Button variant=contained fullWidth size=large — loading state with
    CircularProgress size=20 inside.
    Alert severity=error if errorMessage.

  Tab 1 Register:
    Grid container spacing=2: TextField firstName xs=6, TextField
    lastName xs=6.
    TextField email, TextField password, TextField confirmPassword.
    Select role options: patient / clinician.
    Submit Button variant=contained fullWidth.

  Tab 2 Forgot Password:
    TextField email. Button 'Send Reset Link' fullWidth.
    Alert success 'Check your email'.

  State: activeTab, email, password, confirmPassword, firstName,
  lastName, role, loading, error.

  On sign in: Supabase signInWithPassword({ email, password }).
  On register: call GraphQL signup mutation.
  On forgot: Supabase resetPasswordForEmail(email).

  Export default Login. Use our medicalTheme."

════════════════════════════════════════
  AG-3 — AppShell.jsx Responsive Layout
  File: src/layouts/AppShell.jsx
  DB:   UserProfiles, UserRoles, Notifications
════════════════════════════════════════

  [ANTIGRAVITY PROMPT — /create]

  "React JSX no TypeScript. Create src/layouts/AppShell.jsx using MUI v5.

  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedAdmin, setExpandedAdmin] = useState(false)

  DRAWER CONTENT (width=260):
    Box sx width=260 height='100%' display=flex flexDirection=column.

    Header Box: bgcolor linear-gradient #004D55 to #006D77 p=2.5 —
    Stack direction=row alignItems=center gap=1.5 —
    LocalHospital icon white 28px + Typography h6 fontWeight=800
    color=white 'HealthSync'.

    User card Box: mx=1.5 my=1 bgcolor=rgba(255,255,255,0.12)
    borderRadius=2 p=1.5. Stack direction=row gap=1.5 —
    Avatar src=gravatarUrl sx=width=40 height=40,
    Box: Typography body2 fontWeight=700 white name,
    Chip size=small label=roleName sx bgcolor per role color=white.

    Nav List: navConfig filtered by profile.role.name.
    ListItemButton selected=isActive(item.path):
      selected: sx bgcolor=primary.main color=white borderRadius=1.5
                mx=1 mb=0.5.
      hover:    sx bgcolor=#E8F8F9.
    ListItemIcon color=inherit. ListItemText.

    Admin item: Button onClick=toggleExpandedAdmin, Collapse with
    nested ListItemButtons indented 16px extra.

    Box flexGrow=1 (spacer). Box p=2 border-top:
    Typography caption color=text.secondary 'v1.0.0'.

  APPBAR:
    AppBar position=fixed sx zIndex=theme.zIndex.drawer+1 bgcolor=white
    color=text.primary borderBottom='1px solid #D0E8EA'.
    Toolbar: if isMobile: IconButton MenuIcon onClick=setMobileOpen.
    Box flexGrow=1.
    Stack direction=row alignItems=center gap=1:
      NotificationBell component.
      Divider vertical flexItem.
      Avatar src=gravatarUrl button onClick=setMenuOpen.
    Menu: MenuItem Profile + MenuItem Sign Out color=error.

  MAIN:
    Box component=main sx ml=isMobile?0:'260px' mt='64px' p=3
    bgcolor=background.default minHeight='100vh'.
    Outlet from react-router-dom.

  Desktop: Drawer variant=permanent.
  Mobile:  Drawer variant=temporary open=mobileOpen
           onClose=setMobileOpen(false) ModalProps keepMounted.

  If isMobile: render BottomNavigation value=bottomNav onChange
  sx position=fixed bottom=0 width='100%' bgcolor=white
  borderTop='1px solid #D0E8EA'. BottomNavigationAction:
  Dashboard (LayoutDashboard icon), Calendar, Appointments,
  Notifications (with Badge), More.

  navConfig array (filter by role):
    Patient:      Dashboard, Notifications, Appointments, Profile
    Clinician:    Dashboard, Calendar, Availability, Patients, Notifications
    Receptionist: Dashboard, Calendar, Appointments, Patients, Notifications
    Manager:      Dashboard, Clinics, Products, Billing, Notifications
    Admin:        Dashboard, Users, Organizations, Communications, Policies

  Export default AppShell. Use our medicalTheme."

------------------------------------------------------------------------
  PHASE 2: PATIENT PORTAL
------------------------------------------------------------------------

════════════════════════════════════════
  AG-4 — Landing.jsx Public Homepage + Search
  File: src/pages/Landing.jsx
  DB:   Clinicians, ClinicianTypeModel, Languages, Clinics
════════════════════════════════════════

  [ANTIGRAVITY PROMPT — /create]

  "React JSX no TypeScript. Create src/pages/Landing.jsx MUI v5.
  Public page, no auth required.

  HERO SECTION:
    Box sx bgcolor linear-gradient #004D55 to #0A9396 py=12 px=4
    textAlign=center.
    Typography variant=h2 color=white fontWeight=800 'Find the right
    doctor. Book instantly.'
    Typography body1 color=rgba(255,255,255,0.85) mt=1 subtitle.
    Paper elevation=6 sx borderRadius=4 p=3 mt=5 mx=auto maxWidth=800
    (search card):
      Grid container spacing=2 alignItems=center:
        xs=12 sm=4: Autocomplete options=clinicianTypes
          getOptionLabel=name renderInput=TextField label='Specialty'
          startAdornment=LocalHospital.
        xs=12 sm=4: TextField label='City or Clinic'
          InputProps startAdornment=LocationOn.
        xs=12 sm=4: DatePicker label='Select date'.
        xs=12: Button variant=contained size=large fullWidth
          startIcon=Search 'Find Doctors' onClick=handleSearch.

  SPECIALTY CHIPS ROW:
    Box mt=3 display=flex flexWrap=wrap justifyContent=center gap=1.
    Map specialties: Chip label variant=outlined sx color=white
    borderColor=rgba(255,255,255,0.5) onClick=setSpecialty each.
    Specialties: Cardiology, Dermatology, Orthopedics, Dentistry,
    Pediatrics, Psychology, General Practice, Ophthalmology.

  STATS ROW (below hero, white bg):
    Grid container spacing=4 justifyContent=center py=4.
    4 items: '2,400+ Doctors' (Stethoscope icon),
    '120 Clinics' (LocalHospital), '50,000 Appointments' (EventAvailable),
    '4.9★ Average Rating' (Star). Each: Stack alignItems=center —
    Box bgcolor=primary.50 borderRadius=50% p=2: icon color=primary,
    Typography h4 fontWeight=800, Typography body2 color=text.secondary.

  FILTERS + RESULTS:
    Container maxWidth=xl mt=6.
    Grid container spacing=3.
    Grid item xs=12 md=3: sticky Paper p=2 — Typography subtitle2
    fontWeight=700 color=text.secondary 'FILTERS'. FormGroup checkboxes
    for each ClinicianTypeModel. Autocomplete languages.
    Slider price range min=0 max=500.

    Grid item xs=12 md=9:
      if loading: Grid of 6 Skeleton Card placeholders.
      else: Grid container spacing=3 xs=12 sm=6 lg=4 per doctor.
      Each DoctorCard: Card sx borderRadius=3 hover boxShadow=4
      transition='box-shadow 0.2s'.
      CardContent: Stack direction=row gap=2 —
        Avatar src=gravatar sx width=64 height=64 border='2px solid #006D77',
        Box: Typography h6 fontWeight=700 name,
        Chip label=clinicianType color=primary variant=outlined size=small,
        body2 clinic.name, body2 'Next: Monday 10:00',
        Stack direction=row flexWrap=wrap gap=0.5: language Chips size=small.
      CardActions justifyContent=space-between:
        Button variant=outlined 'View Profile'
          navigate to /doctor/{clinician.id}.
        Button variant=contained 'Book Now'
          navigate to /book/{clinician.id}.

  Bottom CTA strip: Box bgcolor=primary.main py=6 textAlign=center.
    Typography h5 color=white 'Are you a healthcare provider?'
    Button variant=contained sx bgcolor=white color=primary.dark mt=2
    'Join HealthSync'.

  State: searchParams (specialty, location, date), clinicianTypes,
  languages, results=[], loading=false.
  useEffect: fetch GraphQL getClinicians(filters) when searchParams change.

  Export default Landing. Use our medicalTheme."

════════════════════════════════════════
  AG-5 — DoctorProfile.jsx + SlotPicker
  File: src/pages/DoctorProfile.jsx
  DB:   Clinicians, ClinicianAvailability, ClinicianLanguages, Appointments
════════════════════════════════════════

  [ANTIGRAVITY PROMPT — /create]

  "React JSX no TypeScript. Create src/pages/DoctorProfile.jsx MUI v5.
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
        map ClinicianLanguages → Typography caption + flag emoji + name.

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
        + Grid of Chip per product.
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
        'Available times for {dayjs(selectedDate).format('dddd')}'.

        Compute available slots:
          1. Filter availability by selectedDate.day() === day_of_week
          2. Split start_time → end_time into 30-min chunks
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
          dayjs(selectedDate).format('ddd, DD MMM') + ' at ' + selectedSlot.
          Typography caption color=text.secondary clinicName.
        Button variant=contained fullWidth mt=2 startIcon=ArrowForward
        'Continue to Book' onClick=navigateToBooking.

  GraphQL:
    getClinician(id) → clinician with clinic + languages
    getClinicianAvailability(clinicianId) → ClinicianAvailability[]
    getAppointments(clinicianId, date) → booked slots to exclude

  navigateToBooking: navigate('/book/'+clinicianId,
    {state: {slot: selectedSlot, date: selectedDate,
             appointmentType, clinicId: clinician.clinicId}})

  Export default DoctorProfile. Use our medicalTheme."

════════════════════════════════════════
  AG-6 — BookingWizard.jsx 4-Step Stepper
  File: src/pages/BookingWizard.jsx
  DB:   Appointments, Products, ProductVariations, Rooms, Patients,
        PaymentTransactions, ProductCancellationRules
════════════════════════════════════════

  [ANTIGRAVITY PROMPT — /create]

  "React JSX no TypeScript. Create src/pages/BookingWizard.jsx MUI v5.

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
  Custom StepIconComponent: function StepIcon({active,completed,icon}):
    if completed: CheckCircle color=primary.
    if active:    RadioButtonChecked color=primary.
    else:         RadioButtonUnchecked color=disabled.

  STEP 0 — Select Time:
    Paper p=3 mb=2 — Stack direction=row gap=2 alignItems=center:
      Avatar src=gravatar size=48, Box: h6 doctorName, body2 clinicianType.
    ToggleButtonGroup value=bookingData.appointmentType exclusive:
      ToggleButton value=inperson startIcon=LocalHospital 'In-Person'.
      ToggleButton value=video startIcon=Videocam 'Video'.
    SlotPicker component clinicianId from location.state or useParams.
    onSlotSelect: setBookingData({...slot, date}).

  STEP 1 — Your Details:
    If authenticated: pre-fill bookingData.patient from useAuth().profile.
    Grid container spacing=2:
      xs=12 sm=6: TextField label=First Name required.
      xs=12 sm=6: TextField label=Last Name required.
      xs=12: DatePicker label=Date of Birth required.
      xs=12 sm=6: TextField label=Email type=email required.
      xs=12 sm=6: TextField label=Phone.
      xs=12: TextField label='Reason for visit' multiline rows=3 required.
      xs=12: TextField label='Additional notes (optional)' multiline rows=2.

  STEP 2 — Choose Service:
    Typography subtitle1 fontWeight=700 mb=2 'Select a service'.
    Fetch getProducts(bookingData.clinicId).
    Grid container spacing=2:
      xs=12 sm=6 per product: Card onClick=selectProduct sx cursor=pointer
      border='2px solid' borderColor=selected?primary.main:border.
      CardContent: Stack direction=row justifyContent=space-between —
        Chip label=product.product_type size=small
        color=product.product_type==='simple'?'info':'secondary'.
        Typography h6 mt=1 product.name.
        Typography body2 color=text.secondary product.description.
        Typography h5 color=primary.main mt=1 '£'+product.price.
      If selected AND product.product_type==='variable':
        Select fullWidth sx mt=1.5 value=bookingData.variation
        onChange=setVariation:
          map product.variations: MenuItem value=variation.id:
          variation.variation_name + ' — £' + variation.price.
    If product.cancellationRules.length > 0:
      Alert severity=warning sx mt=2:
        'Cancellation policy: '+rule.hours_before_appointment+' hours
        notice required. Fee: '+rule.fee_amount+
        (rule.fee_type==='percentage'?'%':' £fixed').

  STEP 3 — Review & Pay:
    Grid container spacing=3.
    Left xs=12 md=7:
      Paper p=3 mb=2 border — Typography subtitle1 fontWeight=700
      'Booking Summary'. Divider. Grid rows:
        'Date & Time': dayjs(bookingData.date).format('ddd DD MMM') +
                       ' at ' + bookingData.slot.
        'Doctor':      bookingData.doctorName.
        'Appointment': bookingData.appointmentType.
        'Service':     bookingData.product.name + ' (£'+price+')'.
        'Location':    bookingData.clinicName.
      Divider. Typography h5 fontWeight=800 color=primary.main
      'Total: £'+totalPrice.

      Typography subtitle2 mt=3 mb=1 'Payment details'.
      Box sx border='1px solid #D0E8EA' borderRadius=2 p=2:
        CardElement from @stripe/react-stripe-js.

      FormControlLabel sx mt=2: Checkbox required
      label=Typography body2 'I accept the cancellation policy and
      terms of service'.

    Right xs=12 md=5:
      Paper p=2.5 border borderRadius=3 position=sticky top=80:
        Typography subtitle2 color=text.secondary 'BOOKING DETAILS'.
        Stack spacing=1 mt=1: each detail row body2.

    DialogActions sx mt=3:
      Button 'Back' onClick=handleBack.
      Button variant=contained size=large startIcon=Payment
      onClick=handlePayAndBook disabled=!accepted loading=payLoading:
        'Confirm & Pay £'+totalPrice.

  handlePayAndBook async:
    1. const {paymentMethod, error} = await stripe.createPaymentMethod({
         type: 'card', card: elements.getElement(CardElement)}).
    2. if error: show Alert error. return.
    3. const appt = await createAppointment({variables: {input: {
         clinicId: bookingData.clinicId,
         roomId: bookingData.roomId,
         clinicianId: bookingData.clinicianId,
         patientId: patientId,
         appointmentDate: bookingData.date,
         appointmentTime: bookingData.slot,
         durationMinutes: 30,
         status: 'scheduled',
         reason: bookingData.patient.reason,
         notes: bookingData.patient.notes,
         productId: bookingData.product?.id,
         productVariationId: bookingData.variation?.id
       }}}).
    4. await createPaymentTransaction({variables: {input: {
         clientOrgId: orgId, appointmentId: appt.id,
         amount: totalPrice, currency: 'GBP',
         stripePaymentIntentId: paymentMethod.id, status: 'pending'
       }}}).
    5. navigate('/patient/appointments').
    6. show success Snackbar 'Appointment booked successfully!'.

  RIGHT SIDEBAR (steps 0–3):
    Grid item xs=12 md=4 display={xs:'none',md:'block'}.
    Paper position=sticky top=80 p=2.5 border borderRadius=3:
      Typography subtitle2 color=text.secondary 'BOOKING SUMMARY'.
      Progressive content per step.

  BOTTOM NAVIGATION:
    Box display=flex justifyContent=space-between mt=4:
      Button startIcon=ArrowBack disabled=activeStep===0 onClick=handleBack.
      Button variant=contained endIcon=ArrowForward
      onClick=activeStep===3?handlePayAndBook:handleNext
      disabled=!canProceed[activeStep]:
        activeStep===3 ? 'Confirm & Pay' : 'Next'.

  GraphQL mutations:
    createAppointment(input: AppointmentInput): AppointmentPayload
    createPaymentTransaction(input: {...}): PaymentTransactionPayload

  Export default BookingWizard. Use our medicalTheme."

════════════════════════════════════════
  AG-7 — PatientDashboard.jsx
  File: src/pages/patient/Dashboard.jsx
  DB:   Appointments, Notifications, Patients
════════════════════════════════════════

  [ANTIGRAVITY PROMPT — /create]

  "React JSX no TypeScript. Create src/pages/patient/Dashboard.jsx
  MUI v5.

  GraphQL:
    getPatientAppointments(patientId, status: 'scheduled') → upcoming
    getNotifications(userId, limit: 5) → activity

  WELCOME BANNER:
    Paper sx bgcolor linear-gradient #004D55 to #0A9396 p=4
    borderRadius=3 mb=3.
    Stack direction=row justifyContent=space-between alignItems=center.
    Box: Typography h5 color=white fontWeight=700
      'Good morning, {profile.first_name} 👋'.
    Typography body2 color=rgba(255,255,255,0.8)
      'You have {upcomingCount} upcoming appointments this week'.
    Stack direction=row gap=2 mt=2:
      Button variant=outlined sx color=white borderColor=rgba(255,255,255,0.6)
      startIcon=Add 'Book Appointment' onClick=navigateToLanding.
      Button variant=outlined sx color=white borderColor=rgba(255,255,255,0.6)
      'View All'.
    Avatar src=gravatar sx ml=auto display={xs:'none',md:'block'}.

  KPI GRID:
    Grid container spacing=2 mb=3.
    Grid item xs=6 sm=3 per DataCard:
      total:     EventNote icon, value=stats.total,     borderColor=#3A86FF
      completed: CheckCircle,   value=stats.completed,  borderColor=#2DC653
      upcoming:  Schedule,      value=stats.upcoming,   borderColor=#006D77
      cancelled: Cancel,        value=stats.cancelled,  borderColor=#E63946

  MAIN TWO COLUMNS:
    Grid container spacing=3.

    Left Grid xs=12 md=8:
      Stack direction=row justifyContent=space-between alignItems=center mb=2:
        Typography h6 fontWeight=700 'Upcoming Appointments'.
        Button size=small 'View all' onClick=navigateToAppointments.
      if loading: SkeletonLoader variant=table rows=3.
      if upcomingAppointments.length===0: EmptyState
        icon=CalendarMonth title='No upcoming appointments'
        subtitle='Book your first appointment today'
        action={label:'Find a Doctor', onClick:navigateToLanding}.
      map upcomingAppointments: Card sx mb=2 borderRadius=3
        borderLeft='4px solid' borderLeftColor=statusColors[appt.status].
        CardContent:
          Grid container alignItems=center.
          Box sx bgcolor=primary.main borderRadius=2 p=1 mr=2
          width=52 textAlign=center flexShrink=0:
            Typography caption color=white
            dayjs(appt.appointmentDate).format('MMM').
            Typography h6 color=white fontWeight=700
            dayjs(appt.appointmentDate).format('D').
          Box flexGrow=1:
            Stack direction=row alignItems=center gap=1.5 mb=0.5:
              Avatar src=gravatarClinician sx width=36 height=36.
              Box: Typography subtitle1 fontWeight=600 clinicianName.
              Typography body2 color=text.secondary clinicianType.
            Stack direction=row gap=1 flexWrap=wrap:
              Chip label=appt.durationMinutes+'min' size=small
                icon=Schedule.
              Chip label=appt.appointmentType size=small
                icon=appt.appointmentType==='video'?Videocam:LocalHospital.
              StatusChip status=appt.status.
            Typography body2 color=text.secondary mt=0.5:
              'at '+dayjs(appt.appointmentTime).format('HH:mm')+
              ' · '+appt.clinic.name.
        CardActions:
          if appt.appointmentType==='video' AND appt.status==='scheduled':
            Button color=secondary startIcon=Videocam size=small
            'Join Video' onClick=navigateToConsultation(appt.id).
          Button variant=outlined size=small 'Reschedule'.
          Button size=small color=error 'Cancel'.

    Right Grid xs=12 md=4:
      Paper p=2.5 border borderRadius=3 mb=2:
        Typography subtitle1 fontWeight=700 mb=1.5 'Your Doctors'.
        List dense: map recentClinicians (unique from appointments):
          ListItem: ListItemAvatar Avatar gravatar.
          ListItemText primary=name secondary=clinicianType.
          ListItemSecondaryAction: Button size=small 'Book again'.

      Paper p=2.5 border borderRadius=3:
        Stack direction=row justifyContent=space-between mb=1.5:
          Typography subtitle1 fontWeight=700 'Recent Activity'.
          Button size=small 'Mark all read' onClick=markAllRead.
        List dense: map notifications:
          ListItem alignItems=flex-start:
            ListItemAvatar: Avatar sx bgcolor=iconBgColor[notif.type]
              width=36 height=36 — icon by type
              (appointment=CalendarMonth, payment=Payment,
               system=Settings, alert=Warning).
            ListItemText:
              primary=Typography body2 fontWeight=notif.is_read?400:700
              notif.title.
              secondary=Stack: Typography caption notif.message (2-line).
                Typography caption color=text.secondary dayjs(created_at).
            Box sx width=6 height=6 borderRadius=50%
            bgcolor=notif.is_read?transparent:error.main mt=1.5.

  Export default PatientDashboard. Use our medicalTheme."

════════════════════════════════════════
  AG-8 — VideoConsultation.jsx
  File: src/pages/VideoConsultation.jsx
  DB:   Appointments, Clinicians, Patients
════════════════════════════════════════

  [ANTIGRAVITY PROMPT — /create]

  "React JSX no TypeScript. Create src/pages/VideoConsultation.jsx.
  Dark theme override for this screen ONLY.

  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: { main: '#006D77' },
      background: { default: '#0A1F22', paper: '#0F2D33' }
    }
  })
  Wrap entire component in ThemeProvider theme=darkTheme.

  State:
    micOn=true, cameraOn=true, sharing=false, chatOpen=false,
    callTimer='00:00:00', messages=[], newMessage='', notes='', panel=0.

  useRef: localVideoRef, remoteVideoRef.
  useEffect: navigator.mediaDevices.getUserMedia({video:true, audio:true})
    .then(stream => localVideoRef.current.srcObject = stream).
    Comment: '// Replace with Twilio/Daily.co/WebRTC peer connection'.

  useEffect: increment callTimer every second with setInterval.

  LAYOUT:
    Box sx bgcolor='#0A1F22' minHeight='100vh' display=flex
    flexDirection=column overflow=hidden.

  TOP BAR:
    AppBar position=static sx bgcolor='#0F2D33'
    borderBottom='1px solid rgba(255,255,255,0.08)'.
    Toolbar sx minHeight=52:
      LocalHospital sx color=primary.main mr=1.
      Typography body1 color=white fontWeight=700 'HealthSync'.
      Divider orientation=vertical flexItem sx mx=2
      bgcolor=rgba(255,255,255,0.15).
      Typography body2 color=rgba(255,255,255,0.7)
        appointment?.clinician?.firstName + ' — ' + appointment?.reason.
      Box flexGrow=1.
      Chip icon=Security size=small label='Encrypted' color=primary
      variant=outlined sx borderColor=rgba(255,255,255,0.3).
      Typography caption color=rgba(255,255,255,0.5) ml=2 callTimer.

  MAIN CONTENT:
    Box flexGrow=1 display=flex p=1.5 gap=1.5.

    Main video Box sx flexGrow=1 position=relative bgcolor='#000000'
    borderRadius=2 overflow=hidden:
      video ref=remoteVideoRef autoPlay playsInline sx width='100%'
      height='100%' objectFit=cover.
      Self-view Box sx position=absolute bottom=16 right=16
      width=200 height=150 bgcolor='#111' borderRadius=1 overflow=hidden
      border='2px solid rgba(255,255,255,0.3)':
        video ref=localVideoRef autoPlay playsInline muted sx
        width='100%' height='100%' objectFit=cover.
      Name Box sx position=absolute bottom=12 left=12
      bgcolor=rgba(0,0,0,0.65) borderRadius=1 px=1.5 py=0.5:
        Typography body2 color=white fontWeight=600
        appointment?.clinician?.firstName + ' ' + appointment?.clinician?.lastName.
      Timer Box sx position=absolute top=12 left=50%
      sx={transform:'translateX(-50%)'} bgcolor=rgba(0,0,0,0.65)
      borderRadius=5 px=2 py=0.5:
        Typography caption color=white callTimer.

  CONTROL BAR:
    Box sx bgcolor=rgba(15,45,51,0.95) py=1.5 display=flex
    justifyContent=center alignItems=center gap=2 px=3.
    IconButton onClick=toggleMic sx bgcolor=rgba(255,255,255,0.1)
    color=micOn?white:error.main size=large:
      micOn ? Mic : MicOff.
    IconButton camera same pattern VideocamIcon / VideocamOff.
    IconButton onClick=toggleShare sx bgcolor=sharing?primary.main:rgba(255,255,255,0.1)
    color=white: ScreenShare.
    IconButton onClick=()=>setPanel(1) sx bgcolor=rgba(255,255,255,0.1)
    color=white: Badge badgeContent=messages.filter(m=>!m.read).length
    color=error: Chat.
    Fab color=error onClick=handleEndCall sx width=56 height=56
    mx=1: CallEnd.
    IconButton sx bgcolor=rgba(255,255,255,0.1) color=white: Settings.

  RIGHT PANEL:
    Box sx width={xs:'100%',md:320} bgcolor='#0F2D33' borderRadius=2
    display=flex flexDirection=column overflow=hidden.
    Tabs value=panel onChange textColor=primary
    sx borderBottom='1px solid rgba(255,255,255,0.1)':
      Tab label='Info'. Tab label='Chat'. Tab label='Notes'.

    TabPanel 0:
      Box p=2: appointment info — doctor name, date, time, reason,
      clinic in Paper cards.

    TabPanel 1:
      Box flexGrow=1 overflow=auto p=1.5 ref=chatScrollRef:
        map messages: Box mb=1 display=flex
        justifyContent=message.fromMe?flex-end:flex-start:
          Paper p=1 px=1.5 bgcolor=message.fromMe?primary.dark:rgba(255,255,255,0.08)
          borderRadius=2: Typography body2 color=white message.text.
          Typography caption color=rgba(255,255,255,0.4) message.time.
      Box p=1.5 borderTop='1px solid rgba(255,255,255,0.08)':
        Stack direction=row gap=1:
          TextField value=newMessage onChange fullWidth size=small
          sx bgcolor=rgba(255,255,255,0.05) input color=white
          placeholder='Type message...'
          onKeyDown=enter→sendMessage.
          IconButton color=primary onClick=sendMessage: Send.

    TabPanel 2:
      Box p=2 display=flex flexDirection=column gap=2:
        TextField label='Private notes' multiline rows=8
        value=notes onChange=setNotes
        sx textarea color=white bgcolor=rgba(255,255,255,0.05).
        Button variant=contained onClick=saveNotes 'Save Notes'.

  handleEndCall: navigate(-1).

  GraphQL: getAppointment(id from useParams).
  useEffect on mount: fetch appointment.

  Export default VideoConsultation. Use our medicalTheme."

------------------------------------------------------------------------
  PHASE 3: CLINICIAN PORTAL
------------------------------------------------------------------------

════════════════════════════════════════
  AG-9 — ClinicianDashboard.jsx
  File: src/pages/clinician/Dashboard.jsx
  DB:   Appointments, SpacerBlocks, LunchBreaks, ClinicianAvailability
════════════════════════════════════════

  [ANTIGRAVITY PROMPT — /create]

  "React JSX no TypeScript. Create src/pages/clinician/Dashboard.jsx
  MUI v5.

  GraphQL:
    getTodayAppointments(clinicianId, date: dayjs().format('YYYY-MM-DD'))
    getSpacerBlocks(clinicianId, date: today)
    getLunchBreaks(clinicianId)
    getNotifications(userId, limit:3)

  HEADER STRIP:
    Paper sx bgcolor=primary.main p=2 borderRadius=2 mb=3.
    Stack direction=row justifyContent=space-between alignItems=center.
    Box: Typography body1 color=white fontWeight=700
      dayjs().format('dddd, DD MMMM YYYY').
    Typography body2 color=rgba(255,255,255,0.85)
      'Dr. '+profile.first_name+' '+profile.last_name+
      ' · '+profile.clinician?.clinician_type+
      ' · '+profile.clinic?.name.
    Button variant=outlined sx color=white
    borderColor=rgba(255,255,255,0.5) size=small 'Add Block'.

  KPI ROW:
    Grid container spacing=2 mb=3.
    DataCard xs=6 sm=3 each:
      todayTotal:  EventNote  #3A86FF
      completed:   CheckCircle #2DC653
      remaining:   Schedule   #006D77
      videoCount:  Videocam   #7C3AED
    Values computed from todayAppointments.

  TWO COLUMN LAYOUT:
    Grid container spacing=3.

    Left Grid xs=12 md=7:
      Typography h6 fontWeight=700 mb=2 'Today\'s Schedule'.
      Box position=relative height=600 overflow=auto pl=8:
        Time labels: array of times 08:00–18:00 every 30min.
        Map times: Box position=absolute left=0 width=56 textAlign=right
        top=timeToPixels(time): Typography caption color=text.secondary time.
        Divider Box position=absolute left=60 right=0.

        Map todayAppointments:
          const top = (hour*60+min - 480) * 1.2 (pixel per minute)
          const height = appt.durationMinutes * 1.2
          Card sx position=absolute left=64 right=0 top=top+'px'
          height=height+'px' bgcolor=statusBg[appt.status]
          borderRadius=1 p=0.75 overflow=hidden cursor=pointer
          onClick=setSelectedAppt(appt):
            Typography caption fontWeight=700
              appt.patient.first_name+' '+appt.patient.last_name.
            Typography caption color=text.secondary appt.reason.
            if appt.appointmentType==='video': Chip label='Video'
              size=small color=secondary sx position=absolute
              top=4 right=4.

        Map lunchBreaks:
          Box sx position=absolute left=64 right=0
          top=timeToPixels(lunchBreak.start_time)+'px'
          height=lunchBreakHeight+'px'
          bgcolor=warning.light border='1px dashed' borderColor=warning.main
          borderRadius=1 p=0.5:
            Typography caption color=warning.dark 'Lunch break'.

        Map spacerBlocks:
          Box sx position=absolute left=64 right=0
          bgcolor=action.disabledBackground borderRadius=1
          Tooltip title=spacerBlock.reason:
            Typography caption color=text.secondary 'Blocked'.

    Right Grid xs=12 md=5:
      if nextPatient:
        Paper border='2px solid' borderColor=primary.main p=3 mb=2
        borderRadius=3:
          Typography subtitle1 fontWeight=700 mb=2 'Next Patient'.
          Stack direction=row gap=2 alignItems=flex-start:
            Avatar src=gravatar sx width=64 height=64.
            Box:
              Typography h6 fontWeight=700 patientFullName.
              Typography body2 color=text.secondary:
                dayjs(nextAppt.appointmentTime).format('HH:mm')+
                ' — '+nextAppt.durationMinutes+'min'.
              Typography body2 color=text.secondary nextAppt.reason.
          Stack direction=row gap=1.5 mt=2:
            Button variant=outlined startIcon=Description 'View Notes'.
            Button variant=contained startIcon=PlayArrow 'Start Session'
            onClick=navigateToConsultation(nextAppt.id).

      Paper p=2.5 border borderRadius=3 mb=2:
        Typography subtitle1 fontWeight=700 mb=1 'Queue'.
        List dense: map next4Appointments:
          ListItem: ListItemAvatar Avatar gravatar size=32.
          ListItemText primary=patientName
          secondary=dayjs(time).format('HH:mm')+' · '+reason.
          StatusChip.

      Paper p=2.5 border borderRadius=3:
        Typography subtitle1 fontWeight=700 mb=1 'Notifications'.
        List dense: map notifications — NotificationItem component each.

  setInterval refresh every 60 seconds.
  useEffect cleanup clearInterval on unmount.

  Export default ClinicianDashboard. Use our medicalTheme."

════════════════════════════════════════
  AG-10 — Availability.jsx Full Recurrence Builder
  File: src/pages/clinician/Availability.jsx
  DB:   ClinicianAvailability, LunchBreaks, SpacerBlocks, Rooms
  RecurrenceType: single|daily|weekly|monthly|custom
════════════════════════════════════════

  [ANTIGRAVITY PROMPT — /create]

  "React JSX no TypeScript. Create src/pages/clinician/Availability.jsx
  MUI v5.

  State:
    drawerOpen=false, editSlot=null, lunchDialogOpen=false,
    formData={
      recurrence_type:'weekly', day_of_week:null, start_time:'09:00',
      end_time:'17:00', room_id:'', valid_from:null, valid_until:null,
      exclude_weekends:false, exclude_saturday:false, exclude_sunday:false,
      excluded_days:'', custom_dates:''
    }

  GraphQL:
    getAvailability(clinicianId) → ClinicianAvailability[]
    getLunchBreaks(clinicianId) → LunchBreaks[]
    getSpacerBlocks(clinicianId) → SpacerBlocks[]
    getRooms(clinicId) → Rooms[]

  PAGE HEADER:
    Stack direction=row justifyContent=space-between alignItems=center mb=3.
    Typography h5 fontWeight=700 'Manage Availability'.
    Stack direction=row gap=2:
      Button variant=outlined startIcon=Block onClick=openSpacerDrawer
      'Add Block'.
      Button variant=contained startIcon=Add onClick=()=>openDrawer(null)
      'Add Availability'.

  7-DAY GRID:
    Grid container spacing=1.5.
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].
    Map days with index (Mon=1, Tue=2, Wed=3, Thu=4, Fri=5, Sat=6, Sun=0).
    Grid item xs=12 sm=6 md per day:
      Paper p=1.5 minHeight=220 border borderRadius=2
      sx border=isToday?'2px solid #006D77':'1px solid #D0E8EA'.
      Typography caption fontWeight=700 color=text.secondary
      textTransform=uppercase dayName.

      Filter availability:
        (avail.day_of_week === dayIndex) OR
        (avail.recurrence_type === 'daily')
        AND avail.is_active===true.
      Map each: Box sx bgcolor=primary.main opacity=0.85 borderRadius=1
      p=0.75 mb=0.75 cursor=pointer onClick=()=>openDrawer(avail):
        Typography caption color=white fontWeight=600:
          avail.start_time + ' — ' + avail.end_time.
        if avail.room_id:
          Typography caption color=rgba(255,255,255,0.75) fontSize=10:
            'Room: ' + avail.room?.room_number.

      Filter lunchBreaks for same day:
        Box sx bgcolor=warning.light border='1px dashed'
        borderColor=warning.main borderRadius=1 p=0.75 mb=0.75:
          Typography caption color=warning.dark fontWeight=600:
            'Lunch: '+dayjs(lb.start_time).format('HH:mm')+
            '–'+dayjs(lb.end_time).format('HH:mm').

      Filter spacerBlocks for same day:
        Box sx bgcolor=action.disabledBackground borderRadius=1 p=0.75:
          Typography caption color=text.secondary: 'Blocked: '+sb.reason.

      Button size=small startIcon=Add fullWidth variant=outlined sx mt=1
      onClick=()=>openDrawerForDay(dayIndex) 'Add Slot'.

  AVAILABILITY DRAWER:
    Drawer anchor=right open=drawerOpen onClose=closeDrawer
    PaperProps sx={width:420, p:3}.
    Stack direction=row justifyContent=space-between mb=3:
      Typography h6 fontWeight=700 editSlot?'Edit Slot':'New Slot'.
      IconButton onClick=closeDrawer: Close.

    FormControl fullWidth mb=2:
      InputLabel 'Recurrence Type'.
      RadioGroup value=formData.recurrence_type
      onChange=e=>setFormData({...formData, recurrence_type:e.target.value}):
        FormControlLabel value=single  control=Radio label='Single date'.
        FormControlLabel value=daily   control=Radio label='Every day'.
        FormControlLabel value=weekly  control=Radio label='Specific days (weekly)'.
        FormControlLabel value=monthly control=Radio label='Monthly'.
        FormControlLabel value=custom  control=Radio label='Custom dates'.

    CONDITIONAL — if recurrence_type==='weekly':
      Box mb=2:
        Typography body2 fontWeight=600 mb=1 'Select days'.
        ToggleButtonGroup value=formData.day_of_week exclusive={false}
        onChange sx flexWrap=wrap:
          ToggleButton value=1 sx width=44: 'M'.
          ToggleButton value=2: 'T'.
          ToggleButton value=3: 'W'.
          ToggleButton value=4: 'T'.
          ToggleButton value=5: 'F'.
          ToggleButton value=6: 'S'.
          ToggleButton value=0: 'S'.

    CONDITIONAL — if recurrence_type==='single':
      DatePicker label='Date' value=formData.block_date fullWidth mb=2.

    CONDITIONAL — if recurrence_type==='custom':
      Box mb=2: Typography body2 'Enter comma-separated dates (YYYY-MM-DD)'.
      TextField value=formData.custom_dates onChange multiline rows=2
      placeholder='2025-01-15, 2025-01-22, 2025-02-05' fullWidth.

    TimePicker label='Start time' value=formData.start_time
    onChange fullWidth sx mb=2.
    TimePicker label='End time' value=formData.end_time
    onChange validate end>start fullWidth sx mb=2.
    if end_time <= start_time: FormHelperText error 'End time must be after start'.

    Autocomplete options=rooms getOptionLabel=r=>r.room_number
    renderOption shows room_type too label='Assign room (optional)'
    onChange fullWidth sx mb=2.

    DatePicker label='Valid from' value=formData.valid_from
    onChange fullWidth sx mb=2.
    DatePicker label='Valid until (optional)' value=formData.valid_until
    onChange fullWidth sx mb=2.

    Typography body2 fontWeight=600 mb=1 'Exclude days'.
    FormGroup row:
      FormControlLabel control=Switch checked=formData.exclude_weekends
      onChange label='Exclude weekends'.
      FormControlLabel control=Switch checked=formData.exclude_saturday
      label='Exclude Saturdays'.
      FormControlLabel control=Switch checked=formData.exclude_sunday
      label='Exclude Sundays'.

    Stack direction=row justifyContent=flex-end gap=2 mt=4:
      Button onClick=closeDrawer 'Cancel'.
      if editSlot: Button variant=outlined color=error onClick=deleteSlot
      'Delete'.
      Button variant=contained onClick=handleSave loading=saving 'Save'.

  handleSave:
    if editSlot: updateAvailability(UpdateAvailabilityInput).
    else: createAvailability(CreateAvailabilityInput).
    Map formData to exact GraphQL input fields.
    Refetch getAvailability after save. Close drawer.

  LUNCH BREAKS SECTION:
    Paper p=2.5 border borderRadius=3 mt=3.
    Stack direction=row justifyContent=space-between mb=2:
      Typography subtitle1 fontWeight=700 'Lunch Breaks'.
      Button size=small startIcon=Add onClick=()=>setLunchDialogOpen(true).
    List: map lunchBreaks:
      ListItem: Chip label=dayNames[lb.day_of_week] size=small.
      ListItemText:
        primary=dayjs(lb.start_time).format('HH:mm') +
                ' — ' + dayjs(lb.end_time).format('HH:mm').
        secondary=lb.recurrence_type.
      ListItemSecondaryAction: IconButton Delete color=error
        onClick=deleteLunchBreak(lb.id).
    if lunchBreaks.length===0: EmptyState icon=LunchDining
      title='No lunch breaks' subtitle='Add your lunch schedule'.

  Lunch Break Dialog: Dialog maxWidth=xs fullWidth open=lunchDialogOpen.
    TimePicker start + end. Select day_of_week. Switch is_recurring.
    Submit: createLunchBreak mutation.

  Export default Availability. Use our medicalTheme."

------------------------------------------------------------------------
  PHASE 4: STAFF, MANAGER & ADMIN
------------------------------------------------------------------------

════════════════════════════════════════
  AG-11 — StaffAppointments.jsx
  File: src/pages/staff/Appointments.jsx
  DB:   Appointments, Patients, Clinicians, Rooms, Products, Variations
════════════════════════════════════════

  [ANTIGRAVITY PROMPT — /create]

  "React JSX no TypeScript. Create src/pages/staff/Appointments.jsx
  MUI v5.

  State: filters={clinic:'',clinician:'',status:[],dateFrom:null,
  dateTo:null,search:''}, modalOpen=false, editAppointment=null,
  page=0, rowsPerPage=10, selected=[] (checkbox bulk select).

  PAGE HEADER:
    Stack direction=row justifyContent=space-between alignItems=center mb=3.
    Stack direction=row alignItems=center gap=2:
      Typography h5 'Appointments'.
      Chip label=totalCount color=primary variant=outlined.
    Stack direction=row gap=1.5:
      Button variant=outlined startIcon=GetApp 'Export CSV'
      onClick=handleExport.
      Button variant=contained startIcon=Add 'Book Appointment'
      onClick=()=>setModalOpen(true).

  FILTER BAR:
    Paper p=2 mb=2 border.
    Grid container spacing=2 alignItems=center:
      xs=12 sm=4 md=2: Select label='Clinic' value=filters.clinic
        options=clinics. onChange update filters.
      xs=12 sm=4 md=3: Autocomplete label='Clinician'
        options=clinicians renderOption with Avatar+name+specialty.
      xs=12 sm=4 md=2: Select multiple label='Status'
        value=filters.status renderValue=selected=>Stack of Chips.
        Options: scheduled, confirmed, completed, cancelled, no-show.
      xs=12 sm=6 md=2: DatePicker label='From' value=filters.dateFrom.
      xs=12 sm=6 md=2: DatePicker label='To' value=filters.dateTo.
      xs=12 md=1: Button outlined size=small
        startIcon=FilterListOff onClick=clearFilters 'Clear'.

    Active filter chips row: Stack direction=row flexWrap=wrap gap=1 mt=1.
    map activeFilters: Chip label={filter} onDelete=clearFilter size=small.

  TABLE:
    TableContainer Paper elevation=0 border borderRadius=2.
    Table stickyHeader size=small.
    TableHead: sx th bgcolor=#E8F8F9 color=#004D55 fontWeight=700.
      Columns: Checkbox (bulk) | Date & Time | Patient | Clinician |
               Clinic & Room | Duration | Service | Status | Actions.
    TableBody: if loading: SkeletonLoader variant=table rows=rowsPerPage.
    else if filtered.length===0: TableRow: TableCell colSpan=9:
      EmptyState icon=EventBusy title='No appointments found'
      subtitle='Try adjusting your filters'.
    else: map appointments: TableRow hover selected=selected.includes(appt.id):
      TableCell padding=checkbox: Checkbox checked onClick=handleSelect.
      TableCell:
        Typography body2 fontWeight=700
          dayjs(appt.appointmentDate).format('ddd DD MMM').
        Typography caption color=text.secondary
          dayjs(appt.appointmentTime).format('HH:mm')+
          ' ('+appt.durationMinutes+'min)'.
      TableCell: Stack direction=row gap=1 alignItems=center:
        Avatar src=gravatarPatient sx width=32 height=32.
        Box: Typography body2 fontWeight=600 patientName.
          Typography caption color=text.secondary email.
      TableCell: Stack direction=row gap=1 alignItems=center:
        Avatar src=gravatarClinician sx width=32 height=32.
        Box: body2 clinicianName.
          Chip label=clinicianType size=small variant=outlined.
      TableCell:
        Typography body2 appt.clinic.name.
        Typography caption color=text.secondary 'Room '+appt.room.room_number.
      TableCell: Chip label=appt.durationMinutes+'min' size=small.
      TableCell: if appt.product: body2 product.name +
        caption color=text.secondary '£'+price. Else '—'.
      TableCell: StatusChip status=appt.status.
      TableCell:
        Tooltip title='Edit': IconButton onClick=()=>openEditModal(appt)
          size=small: EditOutlined.
        Tooltip title='Cancel': IconButton color=error
          onClick=()=>openCancelConfirm(appt) size=small: CancelOutlined.
        IconButton size=small: MoreVert (Menu with more actions).

    TableFooter: TablePagination rowsPerPageOptions=[10,25,50].

  BOOKING MODAL:
    Dialog maxWidth=lg fullWidth open=modalOpen
    fullScreen=isMobile.
    DialogTitle: Stack direction=row justifyContent=space-between:
      Typography h6 editAppointment?'Edit Appointment':'Book Appointment'.
      IconButton onClick=closeModal: Close.
    DialogContent dividers:
      Grid container spacing=3.

      Left xs=12 md=7:
        Typography subtitle2 color=text.secondary mb=2
        'PATIENT DETAILS'.
        Autocomplete label='Search patient (name, email, phone)'
          options=[] onInputChange=debouncedSearchPatients
          filterOptions=x=>x  (server-side)
          renderOption: Stack direction=row gap=1 alignItems=center:
            Avatar gravatar size=32 + Box name+email.
          onChange=setSelectedPatient.

        Typography subtitle2 color=text.secondary mt=2 mb=2
        'APPOINTMENT DETAILS'.
        Grid container spacing=2:
          xs=12 sm=6: Autocomplete clinicians.
          xs=12 sm=6: Select clinic.
          xs=12 sm=6: Select room filtered by clinicId.
          xs=12 sm=6: DatePicker label='Date' required.
          xs=12 sm=6: TimePicker label='Time' required.
          xs=12 sm=6: Select label='Duration':
            MenuItem 15 '15 min', 30 '30 min', 45 '45 min', 60 '1 hour'.
          xs=12 sm=6: Select label='Appointment type':
            MenuItem inperson 'In-Person', video 'Video'.
          xs=12: Autocomplete products renderOption with name+price.
          xs=12: if selectedProduct?.product_type==='variable':
            Select label='Service option' options=variations.
          xs=12: TextField label='Reason for visit' multiline rows=3
            required.
          xs=12: TextField label='Notes' multiline rows=2.

      Right xs=12 md=5:
        Paper p=2 border borderRadius=2:
          Typography subtitle2 color=text.secondary mb=1
          'CLINICIAN AVAILABILITY'.
          if selectedClinician AND selectedDate:
            SlotPicker clinicianId=selectedClinician.id
              clinicId=selectedClinic value=selectedTime
              onSlotSelect=handleSlotSelect.
          else: EmptyState icon=Schedule
            title='Select clinician & date'
            subtitle='Available slots will appear here'.

    DialogActions:
      Button onClick=closeModal 'Cancel'.
      Button variant=contained onClick=handleBookSubmit loading=saving
      'Book Appointment'.

  handleBookSubmit:
    createAppointment mutation with AppointmentInput.
    Show Snackbar success 'Appointment booked successfully'.
    Close modal. Refetch appointments list.

  ConfirmDialog for cancel:
    title='Cancel Appointment?'
    message='The patient will be notified. This cannot be undone.'
    onConfirm=handleCancelAppointment loading=cancelling.
    handleCancelAppointment: updateAppointment({status:'cancelled'}).

  GraphQL:
    getAppointments(filters), searchPatients(query),
    getClinicians, getClinics, getRooms(clinicId), getProducts(clinicId),
    createAppointment(AppointmentInput), updateAppointment.

  Export default StaffAppointments. Use our medicalTheme."

════════════════════════════════════════
  AG-12 — ManagerDashboard.jsx Analytics
  File: src/pages/manager/Dashboard.jsx
  DB:   Appointments, Clinics, Clinicians, PaymentTransactions, Patients
════════════════════════════════════════

  [ANTIGRAVITY PROMPT — /create]

  "React JSX no TypeScript. Create src/pages/manager/Dashboard.jsx
  MUI v5 + recharts.

  State: dateFilter='monthly', clinicFilter='all',
  customStart=null, customEnd=null.

  HEADER:
    Stack direction=row justifyContent=space-between alignItems=center mb=3.
    Typography h5 'Analytics & Reports'.
    Stack direction=row gap=2 alignItems=center:
      ToggleButtonGroup value=dateFilter exclusive onChange size=small:
        ToggleButton value='7d' '7 days'.
        ToggleButton value='30d' '30 days'.
        ToggleButton value='90d' '90 days'.
        ToggleButton value='custom' 'Custom'.
      if dateFilter==='custom':
        DatePicker label='From' value=customStart.
        DatePicker label='To' value=customEnd.
      Select value=clinicFilter onChange sx minWidth=160:
        MenuItem value='all' 'All Clinics'.
        map clinics: MenuItem value=c.id c.name.

  KPI ROW:
    Grid container spacing=2 mb=3.
    Grid xs=12 sm=6 md 5 DataCards:
      totalAppointments: EventNote  #3A86FF
        value=stats.total trend=trendVsPrevious.
      totalRevenue:      AttachMoney #2DC653
        value='£'+formatNumber(stats.revenue).
      activePatients:    PeopleAlt   #006D77
        value=stats.patients.
      utilization:       Speed       #7C3AED
        value=stats.utilization+'%'.
      cancellationRate:  Cancel      #E63946
        value=stats.cancellationRate+'%'.

  CHARTS ROW:
    Grid container spacing=3 mt=1.
    Grid xs=12 md=7:
      Card p=2:
        Stack direction=row justifyContent=space-between mb=2:
          Typography subtitle1 fontWeight=700 'Appointments Over Time'.
          Chip label=dateFilter size=small.
        ResponsiveContainer width='100%' height=280:
          LineChart data=appointmentData:
            CartesianGrid strokeDasharray='3 3' stroke=#F0F7F8.
            XAxis dataKey='date' tick fontSize=11.
            YAxis tick fontSize=11.
            Tooltip contentStyle borderRadius=8.
            Legend.
            Line type=monotone dataKey='scheduled' stroke=#006D77
              strokeWidth=2 dot=false activeDot r=4.
            Line type=monotone dataKey='completed' stroke=#2DC653
              strokeWidth=2 dot=false.
            Line type=monotone dataKey='cancelled' stroke=#E63946
              strokeWidth=2 dot=false.

    Grid xs=12 md=5:
      Card p=2:
        Typography subtitle1 fontWeight=700 mb=2
        'Appointment Status'.
        ResponsiveContainer width='100%' height=280:
          PieChart:
            Pie data=statusData dataKey='value' nameKey='name'
              cx='50%' cy='50%' outerRadius=90
              label={({name,percent}) => name+' '+
              (percent*100).toFixed(0)+'%'}.
            map statusData: Cell fill=statusColors[item.name].
            Tooltip.

  SECOND ROW:
    Grid container spacing=3 mt=0.5.
    Grid xs=12 md=8:
      Card p=2:
        Typography subtitle1 fontWeight=700 mb=2 'Revenue by Clinic'.
        ResponsiveContainer height=240:
          BarChart data=revenueByClinic:
            CartesianGrid strokeDasharray='3 3'.
            XAxis dataKey='name' tick fontSize=11.
            YAxis tickFormatter=v=>'£'+v.
            Tooltip formatter=v=>'£'+v.
            Bar dataKey='revenue' fill=#006D77 radius=[4,4,0,0]
              maxBarSize=50.

    Grid xs=12 md=4:
      Card p=2:
        Typography subtitle1 fontWeight=700 mb=2 'Top Clinicians'.
        Table size=small:
          TableBody map topClinicians with index:
            TableRow: TableCell #rank (index+1).
              TableCell: Stack direction=row gap=1: Avatar size=32 +
                body2 name.
              TableCell: Chip label=apptCount size=small color=primary.
              TableCell: Typography body2 color=success.main
                '£'+revenue.

  TRANSACTIONS TABLE:
    Card mt=2 p=2.
    Stack direction=row justifyContent=space-between mb=2:
      Typography subtitle1 fontWeight=700 'Recent Transactions'.
      Button size=small 'View all'.
    TableContainer: Table size=small:
      TableHead: columns: Date | Patient | Clinician | Service |
                          Amount | Status.
      TableBody: if loading: SkeletonLoader variant=table rows=5.
      else map transactions:
        TableRow: body2 date, Avatar+name patient,
        body2 clinician, body2 service,
        Typography subtitle1 color=primary.main fontWeight=700 '£'+amount,
        StatusChip status.
    TablePagination rowsPerPageOptions=[5,10,25].

  GraphQL:
    getAppointmentStats(dateRange, clinicId),
    getPaymentTransactions(orgId, dateRange, clinicId).
  Compute stats from responses.

  Export default ManagerDashboard. Use our medicalTheme."

════════════════════════════════════════
  AG-13 — ServiceCatalog.jsx
  File: src/pages/manager/ServiceCatalog.jsx
  DB:   Products, ProductCategories, ProductSubcategories,
        ProductVariations, ProductCancellationRules
════════════════════════════════════════

  [ANTIGRAVITY PROMPT — /create]

  "React JSX no TypeScript. Create src/pages/manager/ServiceCatalog.jsx
  MUI v5.

  State: selectedCategoryId=null, productDialogOpen=false,
  editProduct=null, productTab=0, variations=[], cancellationRules=[].

  LAYOUT: Box display=flex gap=2.

  LEFT SIDEBAR (width=220 flexShrink=0):
    Paper p=2 position=sticky top=80 border borderRadius=2.
    Typography subtitle2 fontWeight=700 color=text.secondary mb=1
    'CATEGORIES'.
    List dense: map productCategories:
      ListItemButton selected=selectedCategoryId===cat.id
        onClick=()=>setSelectedCategoryId(cat.id)
        sx selected bgcolor=primary.50 color=primary.main borderRadius=1:
        ListItemText primary=cat.name.
        Badge badgeContent=cat.products?.length color=primary size=small.
        ExpandMore if has subcategories.
      Collapse open=selectedCategoryId===cat.id || cat.subcategories.length:
        List dense: map cat.subcategories:
          ListItemButton onClick sx pl=3 borderRadius=1:
            ListItemText primary=sub.name.
    Divider sx my=1.
    Button startIcon=Add size=small fullWidth onClick=openCategoryDialog
    'Add Category'.

  MAIN AREA (flexGrow=1):
    Stack direction=row justifyContent=space-between alignItems=center mb=2:
      Typography h6 fontWeight=700
        selectedCategory?.name || 'All Services'.
      Stack direction=row gap=1.5:
        TextField size=small placeholder='Search services'
          InputProps={startAdornment: Search icon}
          value=searchQuery onChange=setSearchQuery.
        Button variant=contained startIcon=Add
          onClick=()=>openProductDialog(null) 'Add Service'.

    if loading: Grid of 6 Skeleton Cards.
    else if filteredProducts.length===0:
      EmptyState icon=Inventory2 title='No services yet'
      subtitle='Add your first service to this category'
      action={label:'Add Service', onClick:openProductDialog}.
    else:
    Grid container spacing=2:
      Grid xs=12 sm=6 lg=4 per product:
        Card sx borderRadius=3 cursor=pointer
          transition='transform 0.2s, box-shadow 0.2s'
          hover sx transform=translateY(-2px) boxShadow=3:
          CardContent:
            Stack direction=row justifyContent=space-between
            alignItems=flex-start:
              Chip label=product.product_type size=small
                color=product.product_type==='simple'?'info':'secondary'.
              FormControlLabel control=Switch checked=product.is_active
                size=small onChange=()=>toggleProductActive(product.id).
            Typography h6 fontWeight=700 mt=1 product.name.
            Typography body2 color=text.secondary mt=0.5 sx
              overflow=hidden display=-webkit-box
              WebkitLineClamp=2 WebkitBoxOrient=vertical:
              product.description.
            Stack direction=row justifyContent=space-between
            alignItems=center mt=2:
              Typography caption color=text.secondary
                sx fontFamily=monospace bgcolor=#F0F7F8 px=1 py=0.25
                borderRadius=0.5:
                product.sku.
              Typography h5 color=primary.main fontWeight=700:
                '£'+product.price.
          CardActions sx pt=0:
            IconButton size=small onClick=()=>openProductDialog(product):
              EditOutlined.
            IconButton size=small color=error
              onClick=()=>openDeleteConfirm(product):
              DeleteOutlined.
            if product.variations?.length:
              Chip label=product.variations.length+' variants'
                size=small icon=Layers variant=outlined.

  PRODUCT DIALOG:
    Dialog maxWidth=md fullWidth open=productDialogOpen
    fullScreen=isMobile.
    DialogTitle: Stack direction=row justifyContent=space-between:
      Typography h6 editProduct?'Edit Service':'New Service'.
      CloseIconButton.
    Tabs value=productTab onChange sx borderBottom=1 borderColor=divider:
      Tab label='Basic Info'.
      Tab label='Variations' disabled=currentFormProductType!=='variable'.
      Tab label='Cancellation Rules'.

    TabPanel 0:
      Grid container spacing=2:
        xs=12: TextField label='Service name' required.
        xs=12: TextField label='Description' multiline rows=3.
        xs=12: FormLabel 'Type'. RadioGroup row value=productType:
          Radio value=simple label='Simple (single price)'.
          Radio value=variable label='Variable (multiple options)'.
        xs=12 sm=6: Autocomplete label='Category' options=productCategories.
        xs=12 sm=6: Autocomplete label='Subcategory'
          options=filteredSubcategories (by selected category).
        xs=12 sm=6: TextField label='SKU' required helperText='Unique code'.
        xs=12 sm=6: TextField label='Price (£)' type=number
          InputProps startAdornment='£'.
        xs=12: FormControlLabel Switch checked=isActive label='Active'.

    TabPanel 1:
      Typography body2 color=text.secondary mb=2
      'Add variations with different pricing (e.g. 30min/60min sessions)'.
      Table size=small:
        TableHead: Name | SKU | Price | Stock | Actions.
        TableBody: map variations:
          TableRow: editable TextFields inline + delete IconButton.
      Button startIcon=Add onClick=addVariationRow mt=2 'Add Variation'.

    TabPanel 2:
      Typography body2 color=text.secondary mb=2
      'Set fees for late cancellations or reschedules'.
      if cancellationRules.length===0:
        Alert severity=info 'No cancellation rules set.
        Cancellations are free by default.'.
      List: map cancellationRules: ListItem:
        Chip label=rule.rule_type size=small.
        ListItemText:
          primary=rule.fee_type==='percentage'?
          rule.fee_amount+'% fee':
          '£'+rule.fee_amount+' flat fee'.
          secondary=rule.hours_before_appointment+'h notice required'.
        IconButton delete color=error.
      Button startIcon=Add 'Add Cancellation Rule' mt=1
        onClick=openRuleDialog.

    Cancellation Rule Dialog (nested): Dialog maxWidth=xs.
      RadioGroup label='Rule type': cancellation | reschedule.
      RadioGroup label='Fee type': fixed | percentage.
      TextField label='Fee amount'.
      TextField label='Hours of notice required'.
      Save → createProductCancellationRule mutation.

    DialogActions:
      Button 'Cancel'. Button variant=contained onClick=handleSaveProduct
      loading=saving 'Save Service'.

  handleSaveProduct:
    if editProduct: updateProduct(UpdateProductInput).
    else: createProduct(CreateProductInput) then for each variation
    createProductVariation.
    Refetch getProducts. Close dialog.

  GraphQL:
    getProductCategories(clinicId), getProducts(clinicId, categoryId),
    createProduct(CreateProductInput), updateProduct(UpdateProductInput),
    createProductVariation, createProductCancellationRule.

  Export default ServiceCatalog. Use our medicalTheme."

════════════════════════════════════════
  AG-14 — AdminUsers.jsx + RBAC Matrix
  File: src/pages/admin/Users.jsx
  DB:   Users, UserProfiles, UserRoles, Permissions, RolePermissions,
        AuditLogs
════════════════════════════════════════

  [ANTIGRAVITY PROMPT — /create]

  "React JSX no TypeScript. Create src/pages/admin/Users.jsx MUI v5.

  const ROLE_COLORS = {
    system_admin:   { bg: '#FFE4E6', text: '#9F1239' },
    clinic_manager: { bg: '#EDE9FE', text: '#4C1D95' },
    receptionist:   { bg: '#DBEAFE', text: '#1E40AF' },
    clinician:      { bg: '#D1FAE5', text: '#065F46' },
    patient:        { bg: '#FEF3C7', text: '#92400E' }
  }

  Tabs value=adminTab onChange sx mb=3:
    Tab 0 'Users'. Tab 1 'Roles & Permissions'. Tab 2 'Audit Log'.

  ─────────────────────────────────────
  TAB 0 — USERS
  ─────────────────────────────────────
  Stack direction=row justifyContent=space-between mb=2:
    Stack direction=row gap=2:
      TextField placeholder='Search users...' value=search
        InputProps={startAdornment:Search} onChange debounced.
      Select label='Role' value=roleFilter:
        MenuItem value='' 'All Roles'.
        map userRoles: MenuItem value=role.id role.name.
      Select label='Status' value=statusFilter:
        MenuItem value='' 'All'. MenuItem value='active' 'Active'.
        MenuItem value='inactive' 'Inactive'.
    Button variant=contained startIcon=PersonAdd
      onClick=()=>openUserDialog(null) 'Add User'.

  TableContainer Paper border: Table stickyHeader size=small.
  TableHead sx th bgcolor=#E8F8F9 color=#004D55 fontWeight=700.
  Columns: Avatar+Name+Email | Role | Clinic | Status | Last Login | Actions.
  TableBody: if loading: SkeletonLoader rows=8.
  else map users: TableRow hover:
    TableCell: Stack direction=row gap=1.5 alignItems=center:
      Avatar src=gravatar sx width=40 height=40.
      Box: Typography body2 fontWeight=600 firstName+' '+lastName.
        Typography caption color=text.secondary email.
    TableCell: Chip label=user.role?.name size=small
      sx bgcolor=ROLE_COLORS[user.role?.name]?.bg
         color=ROLE_COLORS[user.role?.name]?.text fontWeight=700.
    TableCell: Typography body2 user.clinic?.name || '—'.
    TableCell: Switch checked=user.is_active size=small
      onChange=()=>toggleUserActive(user.id).
    TableCell: Typography caption color=text.secondary
      dayjs(user.created_at).fromNow().
    TableCell:
      Tooltip 'Edit': IconButton EditOutlined
        onClick=()=>openUserDialog(user).
      Tooltip 'Reset password': IconButton LockReset color=warning.
      Tooltip 'Delete': IconButton DeleteOutlined color=error
        onClick=()=>openDeleteConfirm(user).

  TablePagination.

  ADD/EDIT USER DIALOG:
    Dialog maxWidth=sm fullWidth fullScreen=isMobile.
    DialogTitle: editUser ? 'Edit User' : 'Add New User'.
    Grid container spacing=2:
      xs=12 sm=6: TextField firstName required.
      xs=12 sm=6: TextField lastName required.
      xs=12: TextField email type=email required.
      xs=12 if !editUser: TextField password type=password required
        helperText='Min 8 characters'.
      xs=12: Select label='Role' required:
        map userRoles MenuItem.
      xs=12 if role is not system_admin: Select label='Assign to Clinic':
        map clinics MenuItem.
      xs=12: FormControlLabel Switch checked=isActive label='Account active'.
    DialogActions: Cancel + Save Button loading.

  handleSaveUser:
    createUser(CreateUserInput) or updateUser(UpdateUserInput).
    Snackbar success. Refetch users.

  ─────────────────────────────────────
  TAB 1 — ROLES & PERMISSIONS MATRIX
  ─────────────────────────────────────
  Box display=flex gap=2.

  Roles list (width=260):
    Paper border borderRadius=2 p=1:
      Typography subtitle2 fontWeight=700 color=text.secondary p=1
      'ROLES'.
      List dense: map userRoles:
        ListItemButton selected=selectedRoleId===role.id
          onClick=setSelectedRoleId(role.id)
          sx selected bgcolor=primary.50 color=primary.main borderRadius=1:
          ListItemText primary=role.name
          secondary=role.description || ''.
          Badge badgeContent=role.userProfiles?.length color=primary.

  Permissions matrix (flexGrow=1):
    Paper border borderRadius=2:
      Stack direction=row justifyContent=space-between p=2 alignItems=center:
        Typography subtitle1 fontWeight=700
          'Permissions for: '+(selectedRole?.name||'Select a role').
        Button variant=contained size=small onClick=savePermissions
          loading=saving 'Save Changes'.
      Divider.
      TableContainer: Table size=small:
        TableHead: empty TH | TH 'Create' | TH 'Read' | TH 'Update' | TH 'Delete'.
        TableBody: map uniqueResources:
          TableRow: TableCell fontWeight=700 textTransform=capitalize
            resource name.
          Map actions ['create','read','update','delete']: TableCell:
            Checkbox checked=hasPermission(selectedRoleId, resource, action)
              onChange=()=>togglePermission(resource, action)
              color=primary.

  togglePermission(resource, action):
    Find permission where resource===resource AND action===action.
    if hasPermission: deleteRolePermission mutation.
    else: createRolePermission mutation.
    Update local permissionsState optimistically.

  ─────────────────────────────────────
  TAB 2 — AUDIT LOG
  ─────────────────────────────────────
  Stack direction=row gap=2 mb=2 flexWrap=wrap:
    TextField search placeholder='Search audit log...'.
    Select actionFilter 'All Actions' | CREATE | UPDATE | DELETE | READ.
    Select resourceFilter 'All Resources' | appointments | patients | etc.
    DatePicker from. DatePicker to.

  Table size=small: Columns: Timestamp | User | Action | Resource | IP | Details.
  map auditLogs: TableRow:
    TableCell: Typography caption color=text.secondary
      dayjs(log.created_at).format('DD MMM YYYY HH:mm:ss').
    TableCell: Stack direction=row gap=1: Avatar size=28 + body2 userName.
    TableCell: Chip label=log.action size=small
      color=CREATE?'success':UPDATE?'info':DELETE?'error':'default'.
    TableCell: Typography body2 log.resource+' '+log.resource_id?.slice(0,8).
    TableCell: Typography caption color=text.secondary log.ip_address.
    TableCell: IconButton ExpandMore onClick=toggleExpandRow(log.id).

    Collapse in additional row: TableRow TableCell colSpan=6:
      Paper sx bgcolor=#1A2B3C borderRadius=2 p=2:
        pre sx color=#94E3B0 fontSize=11 fontFamily=monospace overflow=auto:
          JSON.stringify(JSON.parse(log.details||'{}'), null, 2).

  TablePagination.

  GraphQL:
    getUsers(filters), getUserRoles, getPermissions,
    getRolePermissions(roleId), getAuditLogs(filters),
    createUser(CreateUserInput), updateUser(UpdateUserInput),
    createRolePermission(role_id, permission_id),
    deleteRolePermission(id).

  Export default AdminUsers. Use our medicalTheme."

════════════════════════════════════════
  AG-15 — Billing.jsx Stripe + Subscriptions
  File: src/pages/manager/Billing.jsx
  DB:   OrganizationSubscriptions, SubscriptionPlans,
        PaymentTransactions, StripeConfigurations
════════════════════════════════════════

  [ANTIGRAVITY PROMPT — /create]

  "React JSX no TypeScript. Create src/pages/manager/Billing.jsx MUI v5.

  State: billingCycle='monthly', stripeKeyVisible=false.

  GraphQL:
    getOrganizationSubscription(orgId) → current plan + features
    getSubscriptionPlans → all available plans
    getPaymentTransactions(orgId) → payment history
    getStripeConfiguration(orgId) → stripe keys

  CURRENT PLAN BANNER:
    Paper sx bgcolor linear-gradient #004D55 to #006D77 p=4
    borderRadius=3 mb=3.
    Grid container spacing=3 alignItems=center.

    Grid xs=12 md=8:
      Stack direction=row alignItems=center gap=2 mb=2:
        Typography h4 color=white fontWeight=800
          currentSub.plan.name.
        Chip label='ACTIVE' size=small
          sx bgcolor=success.main color=white fontWeight=700.

      ToggleButtonGroup value=billingCycle exclusive onChange size=small
      sx bgcolor=rgba(255,255,255,0.15) mb=2:
        ToggleButton value=monthly sx color=white 'Monthly'.
        ToggleButton value=yearly sx color=white:
          Stack direction=row gap=1: 'Yearly'
          Chip label='Save 20%' size=small sx bgcolor=success.main
          color=white fontSize=9.

      Stack direction=row alignItems=baseline gap=1:
        Typography h3 color=white fontWeight=800:
          '£'+(billingCycle==='monthly'?
          currentSub.plan.price_monthly:
          currentSub.plan.price_yearly).
        Typography body2 color=rgba(255,255,255,0.7)
          '/'+billingCycle.

      List dense sx mt=2:
        map Object.entries(currentSub.plan.features):
          ListItem sx p=0 mb=0.5:
            ListItemIcon sx minWidth=28:
              CheckCircle sx color=rgba(255,255,255,0.9) fontSize=18.
            ListItemText sx span color=rgba(255,255,255,0.9)
              fontSize=14: featureValue.

    Grid xs=12 md=4 textAlign=right:
      Stack gap=1.5:
        Button variant=contained
          sx bgcolor=white color=primary.dark fontWeight=700
          'Upgrade Plan'.
        Button variant=outlined sx color=white
          borderColor=rgba(255,255,255,0.5) 'Manage billing'.
        Typography caption color=rgba(255,255,255,0.6):
          'Next billing: '+dayjs(currentSub.current_period_end)
          .format('DD MMM YYYY').

  USAGE METRICS:
    Grid container spacing=2 mb=3.
    Grid xs=12 sm=4 each:
      Paper p=2.5 border borderRadius=2:
        Stack direction=row justifyContent=space-between mb=1:
          Typography body2 fontWeight=700 label.
          Typography body2 color=text.secondary used+'/'+max.
        LinearProgress variant=determinate value=percent
          sx height=8 borderRadius=4
          '& .MuiLinearProgress-bar': bgcolor=percent>80?error.main:primary.main.
        Typography caption color=text.secondary mt=0.5:
          percent+'% used'.

  PLAN COMPARISON:
    Typography h6 fontWeight=700 mb=2 'Available Plans'.
    Grid container spacing=2.
    Grid xs=12 md=4 per plan: Card sx
      border=currentSub.plan_id===plan.id?'2px solid #006D77':
      '1px solid #D0E8EA'
      borderRadius=3 position=relative:
      if currentPlan: Chip label='Current Plan' size=small
        sx position=absolute top=-14 left=50%
        transform=translateX(-50%) bgcolor=primary.main color=white.
      CardContent:
        Typography h6 fontWeight=700 plan.name.
        Typography h3 fontWeight=800 color=primary.main mt=1:
          '£'+(billingCycle==='monthly'?
          plan.price_monthly:plan.price_yearly).
        Typography caption color=text.secondary '/'+billingCycle.
        Divider sx my=1.5.
        List dense: map plan features:
          ListItem sx p=0 mb=0.25:
            ListItemIcon sx minWidth=24:
              CheckCircle color=success fontSize=16.
            ListItemText primaryTypographyProps fontSize=13.
      CardActions:
        Button fullWidth variant=isCurrent?'outlined':isUpgrade?'contained':'text'
        disabled=isCurrent 'Current Plan' or 'Upgrade' or 'Downgrade'.

  PAYMENT HISTORY:
    Typography h6 fontWeight=700 mb=2 mt=3 'Payment History'.
    Paper border borderRadius=2:
      Table size=small:
        TableHead: Date | Invoice | Description | Amount | Status | Download.
        TableBody: if loading: SkeletonLoader rows=5.
        map transactions: TableRow:
          body2 dayjs(date).format('DD MMM YYYY').
          Typography caption sx fontFamily=monospace:
            invoice_id?.slice(-8).
          body2 description.
          Typography subtitle1 fontWeight=700 color=primary.main
            '£'+amount.
          Chip label=status size=small
            color=status==='paid'?'success':status==='pending'?'warning':'error'.
          IconButton DownloadIcon size=small
            onClick=downloadInvoice(transaction.stripe_invoice_id).
      TablePagination rowsPerPageOptions=[5,10,25].

  STRIPE CONFIGURATION:
    Paper border borderRadius=2 p=3 mt=3.
    Stack direction=row alignItems=center gap=2 mb=3:
      Box sx bgcolor=#635BFF borderRadius=1.5 p=1:
        Typography body2 color=white fontWeight=800 'stripe'.
      Typography subtitle1 fontWeight=700 'Stripe Configuration'.
      Chip label=stripeConfig?.is_active?'Connected':'Not Connected'
        color=stripeConfig?.is_active?'success':'default' size=small.
    Grid container spacing=2:
      xs=12 sm=6: TextField label='Publishable Key'
        value=maskedOrVisible(stripeConfig?.stripe_publishable_key)
        type=stripeKeyVisible?'text':'password'
        InputProps endAdornment=IconButton Visibility toggle.
      xs=12 sm=6: TextField label='Webhook Secret'
        value='••••••••••••••••' type=password.
      xs=12: TextField label='Webhook URL (read-only)'
        value=window.location.origin+'/api/webhooks/stripe'
        InputProps endAdornment=IconButton ContentCopy readOnly.
    Stack direction=row justifyContent=flex-end gap=2 mt=2:
      Button startIcon=OpenInNew 'Stripe Dashboard'.
      Button variant=contained onClick=handleSaveStripe loading=saving
      'Save Configuration'.

  handleSaveStripe: updateStripeConfiguration mutation.
  Show Snackbar success 'Stripe configuration saved'.

  Export default Billing. Use our medicalTheme."

------------------------------------------------------------------------
  REFACTOR & POLISH PROMPTS (Run after all screens are built)
------------------------------------------------------------------------

════════════════════════════════════════
  AG-R1 — Add Skeleton Loading States
  Run: /refactor in all list pages
════════════════════════════════════════

  [ANTIGRAVITY PROMPT — /refactor]

  "React JSX MUI v5. Create src/components/shared/SkeletonLoader.jsx
  with two variants:

  Props: variant ('table' | 'grid'), rows=5, columns=3.

  variant=table: Box pt=1. Map rows times: Skeleton variant=rectangular
  height=48 width='100%' sx borderRadius=1 mb=1 animation=wave.

  variant=grid: Grid container spacing=2. Map rows times:
  Grid item xs=12 sm=6 md={12/columns}:
    Skeleton variant=rectangular height=180 borderRadius=2 animation=wave.

  Export default SkeletonLoader.

  Then import SkeletonLoader in these files and replace 'loading' state
  divs or null returns:
    src/pages/Landing.jsx — variant=grid
    src/pages/staff/Appointments.jsx — variant=table
    src/pages/patient/Dashboard.jsx — variant=table rows=3
    src/pages/clinician/Dashboard.jsx — variant=table rows=4
    src/pages/manager/Dashboard.jsx — variant=table rows=5
    src/pages/manager/ServiceCatalog.jsx — variant=grid
    src/pages/admin/Users.jsx — variant=table rows=8

  Pattern to apply everywhere:
    if (loading) return <SkeletonLoader variant='table' rows={5} />;

  Use our medicalTheme."

════════════════════════════════════════
  AG-R2 — Replace react-hot-toast with MUI Snackbar
  Run: /refactor across all pages
════════════════════════════════════════

  [ANTIGRAVITY PROMPT — /refactor]

  "React JSX MUI v5. Create src/hooks/useNotification.js:

  Custom hook using useState({open:false, message:'', severity:'success'}).
  Returns object with:
    success(msg): setState({open:true, message:msg, severity:'success'})
    error(msg):   setState({open:true, message:msg, severity:'error'})
    warning(msg): setState({open:true, message:msg, severity:'warning'})
    info(msg):    setState({open:true, message:msg, severity:'info'})
    close():      setState({...state, open:false})
    NotificationSnackbar: React component that renders:
      Snackbar open=state.open autoHideDuration=4000 onClose=close
      anchorOrigin={{vertical:'bottom', horizontal:'right'}}:
        Alert severity=state.severity onClose=close variant=filled
          sx borderRadius=2 elevation=6: state.message.

  Export default useNotification.

  Then in every file under src/pages that uses toast.success or
  toast.error:
    1. Remove import toast from 'react-hot-toast'.
    2. Add const notification = useNotification() at top of component.
    3. Add <notification.NotificationSnackbar /> at end of JSX.
    4. Replace toast.success('msg') with notification.success('msg').
    5. Replace toast.error('msg') with notification.error('msg').

  Also remove <Toaster> from src/App.jsx.
  Remove react-hot-toast from package.json.

  Use our medicalTheme."

════════════════════════════════════════
  AG-R3 — Add Empty States to All List Screens
  Run: /refactor in list pages
════════════════════════════════════════

  [ANTIGRAVITY PROMPT — /refactor]

  "React JSX MUI v5.
  Create src/components/shared/EmptyState.jsx:

  Props: icon (MUI SvgIcon component), title (string),
  subtitle (string, optional), action ({label, onClick}, optional).

  Render: Box textAlign=center py=8 px=4.
    Box sx bgcolor=primary.50 borderRadius='50%' width=88 height=88
      mx=auto display=flex alignItems=center justifyContent=center mb=2:
      cloneElement(icon, {sx:{fontSize:44, color:'primary.main'}}).
    Typography h6 fontWeight=700 color=text.primary mt=2 title.
    Typography body2 color=text.secondary mt=1 subtitle.
    if action:
      Button variant=contained mt=3 onClick=action.onClick
      startIcon=Add action.label.

  Export default EmptyState.

  Then add EmptyState in the following files:

  src/pages/Landing.jsx (search results empty):
    icon=SearchOff, title='No doctors found',
    subtitle='Try adjusting your search or selecting a different specialty'.

  src/pages/patient/Dashboard.jsx (no upcoming appointments):
    icon=CalendarMonth, title='No upcoming appointments',
    subtitle='Book your first appointment with a specialist today',
    action={label:'Find a Doctor', onClick:()=>navigate('/')}.

  src/pages/staff/Appointments.jsx (filtered table empty):
    icon=EventBusy, title='No appointments found',
    subtitle='Try adjusting your filters or date range'.

  src/pages/manager/ServiceCatalog.jsx (no products):
    icon=Inventory2, title='No services yet',
    subtitle='Add services that patients can book appointments for',
    action={label:'Add Service', onClick:openProductDialog}.

  src/pages/admin/Users.jsx (no users):
    icon=PersonOff, title='No users found',
    subtitle='Add team members or adjust your search filters'.

  src/pages/clinician/Availability.jsx (no availability for a day):
    Per-day: EmptyState icon=Schedule title='No slots' subtitle='Add slot'.

  Use our medicalTheme."

════════════════════════════════════════
  AG-R4 — fullScreen Dialogs on Mobile
  Run: /refactor in all files with Dialog
════════════════════════════════════════

  [ANTIGRAVITY PROMPT — /refactor]

  "React JSX MUI v5. In every file under src/pages that uses MUI Dialog,
  add mobile fullScreen support.

  Pattern to add at top of each component that has a Dialog:
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
    (import useTheme and useMediaQuery from @mui/material)

  Then on every Dialog component add:
    fullScreen={isMobile}

  Also ensure every DialogTitle has a close button:
    DialogTitle: Box component=Stack direction=row
    justifyContent=space-between alignItems=center:
      Typography h6 [dialog title text].
      IconButton onClick=handleClose edge=end:
        Close icon.

  Files to update:
    src/pages/Login.jsx (Register dialog if modal)
    src/pages/BookingWizard.jsx
    src/pages/staff/Appointments.jsx (BookingModal)
    src/pages/manager/ServiceCatalog.jsx (ProductDialog)
    src/pages/admin/Users.jsx (UserDialog)
    src/pages/clinician/Availability.jsx (DrawerDialog equivalent)

  Also ensure Drawer components use:
    PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}
  so they go full-width on mobile.

  Use our medicalTheme."

════════════════════════════════════════
  AG-R5 — ConfirmDialog for All Delete/Cancel Actions
  Run: /refactor in all pages with destructive actions
════════════════════════════════════════

  [ANTIGRAVITY PROMPT — /refactor]

  "React JSX MUI v5.
  Create src/components/shared/ConfirmDialog.jsx:

  Props: open (bool), title (string), message (string),
  onConfirm (func), onCancel (func), loading (bool),
  severity ('error'|'warning', default='error'),
  confirmLabel (string, default='Confirm').

  Render: Dialog open maxWidth=xs fullWidth
  PaperProps sx borderRadius=3.
    DialogTitle: Stack direction=row gap=1 alignItems=center:
      if severity=error: WarningAmberRounded color=error fontSize=28.
      if severity=warning: InfoOutlined color=warning.
      Typography h6 fontWeight=700 title.
    DialogContent:
      Typography body2 color=text.secondary message.
    DialogActions sx px=3 pb=2:
      Button onClick=onCancel variant=outlined 'Cancel'.
      Button onClick=onConfirm variant=contained color=severity
        disabled=loading
        startIcon=loading?
          CircularProgress(size=16 color=inherit):null
        confirmLabel.

  Export default ConfirmDialog.

  Then replace all browser confirm() and inline confirmation patterns
  in these files:

  src/pages/staff/Appointments.jsx (cancel appointment):
    state: confirmOpen=false, confirmAppt=null.
    onDelete: setConfirmAppt(appt); setConfirmOpen(true).
    ConfirmDialog: title='Cancel Appointment?'
    message='The patient will receive a cancellation notification.
    This action cannot be undone.'
    onConfirm=handleCancelConfirmed severity=error.

  src/pages/manager/ServiceCatalog.jsx (delete service):
    ConfirmDialog: title='Delete Service?'
    message='All variations and cancellation rules will also be deleted.
    This cannot be undone.'
    severity=error.

  src/pages/admin/Users.jsx (deactivate/delete user):
    ConfirmDialog for deactivate: title='Deactivate User?'
    message='The user will lose access immediately.'
    confirmLabel='Deactivate' severity=warning.
    ConfirmDialog for delete: title='Delete User?'
    message='All user data will be permanently removed.'
    severity=error.

  src/pages/clinician/Availability.jsx (delete availability slot):
    ConfirmDialog: title='Remove Availability?'
    message='Existing appointments in this slot will not be affected.'
    severity=warning.

  Use our medicalTheme."

════════════════════════════════════════
  AG-R6 — Role-Based Route Guards (ProtectedRoute)
  Run: /refactor in src/App.jsx and create ProtectedRoute
════════════════════════════════════════

  [ANTIGRAVITY PROMPT — /refactor]

  "React JSX no TypeScript.

  Create src/components/shared/ProtectedRoute.jsx:
    Props: allowedRoles (array of strings), children.
    const { user, profile, loading } = useAuth().
    if loading: return Box display=flex justifyContent=center
      alignItems=center height=100vh: CircularProgress color=primary.
    if !user: return Navigate to='/login' replace.
    if !allowedRoles.includes(profile?.role?.name):
      return Navigate to='/unauthorized' replace.
    return children.
    Export default ProtectedRoute.

  Create src/pages/Unauthorized.jsx:
    Box display=flex flexDirection=column alignItems=center
    justifyContent=center height=100vh bgcolor=background.default.
    Box sx bgcolor=error.50 borderRadius=50% p=3 mb=3:
      LockPerson sx color=error.main fontSize=64.
    Typography h5 fontWeight=700 mt=2 'Access Denied'.
    Typography body1 color=text.secondary mt=1 textAlign=center
      maxWidth=400:
      'You do not have permission to view this page.
      Please contact your administrator if you believe this is an error.'.
    Stack direction=row gap=2 mt=4:
      Button variant=outlined onClick=()=>navigate(-1) startIcon=ArrowBack
        'Go Back'.
      Button variant=contained onClick=()=>navigate('/dashboard')
        'Go to Dashboard'.
    Export default Unauthorized.

  Update src/App.jsx routes. Wrap all protected routes:

  PUBLIC ROUTES (no auth required):
    /                    → Landing
    /doctor/:id          → DoctorProfile
    /login               → Login
    /register            → Login (activeTab=1)
    /forgot-password     → Login (activeTab=2)
    /unauthorized        → Unauthorized

  PATIENT ROUTES (allowedRoles=['patient']):
    /book/:doctorId      → BookingWizard
    /patient/dashboard   → PatientDashboard
    /patient/appointments → PatientAppointments
    /patient/profile     → PatientProfile
    /consultation/:id    → VideoConsultation (also clinician)

  CLINICIAN ROUTES (allowedRoles=['clinician']):
    /clinician/dashboard   → ClinicianDashboard
    /clinician/calendar    → ClinicianCalendar
    /clinician/availability → Availability
    /clinician/patients    → ClinicianPatients

  RECEPTIONIST ROUTES (allowedRoles=['receptionist']):
    /staff/dashboard     → StaffDashboard
    /staff/appointments  → StaffAppointments
    /staff/calendar      → StaffCalendar

  MANAGER ROUTES (allowedRoles=['clinic_manager','system_admin']):
    /manager/dashboard   → ManagerDashboard
    /manager/clinics     → ClinicManagement
    /manager/products    → ServiceCatalog
    /manager/billing     → Billing

  ADMIN ROUTES (allowedRoles=['system_admin']):
    /admin/users         → AdminUsers
    /admin/organizations → AdminOrganizations
    /admin/communications → AdminCommunications
    /admin/policies      → AdminPolicies

  SHARED ROUTES (all roles):
    /dashboard           → RoleDashboard (redirect to role-specific)
    /notifications       → Notifications
    /profile             → Profile
    /consultation/:id    → VideoConsultation

  Also add a root redirect component:
  RoleDashboard: based on profile.role.name, navigate to:
    patient     → /patient/dashboard
    clinician   → /clinician/dashboard
    receptionist → /staff/dashboard
    clinic_manager → /manager/dashboard
    system_admin → /manager/dashboard

  Use our medicalTheme."

================================================================================
  QUICK REFERENCE SUMMARY
================================================================================

  ANTIGRAVITY AI COMMAND REFERENCE
  ─────────────────────────────────
  /create   → Generate new file from scratch
  /edit     → Modify specific part of existing file
  /refactor → Improve, clean up, or restructure existing code
  /explain  → Get explanation of what code does
  /fix      → Debug and fix errors in existing code

  RECOMMENDED PROMPT ORDER
  ─────────────────────────
  1.  AG-1   → Theme setup (ALWAYS FIRST)
  2.  AG-2   → Login screen
  3.  AG-3   → AppShell layout
  4.  Components → Build all 18 shared components
  5.  AG-4   → Landing page + search
  6.  AG-5   → Doctor profile + slot picker
  7.  AG-6   → Booking wizard (4 steps)
  8.  AG-7   → Patient dashboard
  9.  AG-8   → Video consultation room
  10. AG-9   → Clinician dashboard
  11. AG-10  → Availability builder
  12. AG-11  → Staff appointments CRUD
  13. AG-12  → Manager analytics
  14. AG-13  → Service catalog
  15. AG-14  → Admin users + RBAC
  16. AG-15  → Billing + Stripe
  17. AG-R1  → Add skeletons (REFACTOR PHASE)
  18. AG-R2  → Replace toasts with Snackbar
  19. AG-R3  → Add empty states
  20. AG-R4  → Mobile fullScreen dialogs
  21. AG-R5  → ConfirmDialog for destructive actions
  22. AG-R6  → Role-based route guards (LAST)

  ALWAYS INCLUDE IN EVERY ANTIGRAVITY PROMPT
  ────────────────────────────────────────────
  • "React JSX no TypeScript"
  • "MUI v5"
  • "export default [ComponentName]"
  • "use our medicalTheme"
  • Exact file path (e.g., src/pages/patient/Dashboard.jsx)
  • Exact GraphQL query/mutation name from schema.ts

  KEY GRAPHQL INPUT TYPES (from schema.ts)
  ──────────────────────────────────────────
  AppointmentInput:      clinicId, roomId, clinicianId, patientId,
                         appointmentDate, appointmentTime, durationMinutes,
                         status, reason, notes, productId, productVariationId
  PatientInput:          firstName, lastName, dateOfBirth, email, phone,
                         address, medicalNotes
  CreateUserInput:       email, password, first_name, last_name, phone,
                         role_id, clinic_id, clinician_id, is_active
  CreateAvailabilityInput: clinician_id, clinic_id, recurrence_type,
                            start_time, end_time, day_of_week,
                            exclude_weekends, exclude_saturday,
                            exclude_sunday, excluded_days, custom_dates,
                            valid_from, valid_until, room_id
  CreateProductInput:    clinic_id, category_id, subcategory_id, name,
                         description, product_type, price, sku, is_active
  ClinicInput:           name, address, phone, email, clientOrgId
  ClinicianInput:        clinicId, firstName, lastName, clinicianType,
                         email, phone, isActive

  KEY GRAPHQL PAYLOAD TYPES (return with userErrors array):
  AppointmentPayload, PatientPayload, ClinicPayload, ClinicianPayload,
  ProductPayload, UserPayload, AvailabilityPayload, RoomPayload

  Always handle: if (data.createAppointment.userErrors.length > 0)
    notification.error(data.createAppointment.userErrors[0].message)

================================================================================
  END OF PLAN
================================================================================

  HealthSync — Complete Design & Development Plan
  ────────────────────────────────────────────────
  9 Sections | 8 Implementation Phases
  24 Screens | 24 Google Stitch Prompts | 24 MUI JSX Prompts
  15 Antigravity /create Prompts | 6 Antigravity /refactor Prompts
  31 Prisma DB Models | 31 GraphQL Types (from schema.ts)

  Stack:    React JSX · MUI v5 · Apollo GraphQL · Supabase
            Stripe · WebRTC/Telemedicine · dayjs · Recharts
  Theme:    Medical Teal #006D77 · Coral #E29578
            Font: Plus Jakarta Sans
  Auth:     Supabase Auth + Custom UserProfiles + RBAC
  DB:       PostgreSQL via Prisma · GraphQL API via Apollo Server

================================================================================