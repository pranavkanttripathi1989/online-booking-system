import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { Box, CircularProgress, LinearProgress } from '@mui/material'

// ─── Layouts & Guards — synchronous imports (NEVER lazy) ──────────────────────
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import RoleGuard      from './components/ProtectedRoute/RoleGuard'
import AppShell       from './layouts/AppShell'
import PublicLayout   from './layouts/PublicLayout'
import AuthLayout     from './layouts/AuthLayout'
import { useAuth, getPostLoginRedirect } from './context/AuthContext'

// Role-aware home redirect for the AppShell index route (`/`) — found via
// live Chrome MCP verification that the previous hardcoded
// `<Navigate to="/dashboard" replace />` sent every role, including
// patient/clinician/staff, into the admin-only /dashboard rather than their
// own dedicated dashboard (getPostLoginRedirect already existed and is used
// everywhere else post-login, just not here or in login.jsx's already-
// authenticated redirect — both fixed together).
function RoleHomeRedirect() {
  const { user } = useAuth()
  return <Navigate to={getPostLoginRedirect(user)} replace />
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
const Login              = lazy(() => import('./pages/auth/login'))
const LoginPage          = lazy(() => import('./pages/auth/login-legacy'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/forgot-password'))
const OnboardingWizard   = lazy(() => import('./pages/onboarding/index'))

// ─── Public ───────────────────────────────────────────────────────────────────
const Landing       = lazy(() => import('./pages/public/landing'))
const DoctorProfile = lazy(() => import('./pages/public/doctor-profile'))

// ─── Errors ───────────────────────────────────────────────────────────────────
const NotFoundPage = lazy(() => import('./pages/errors/not-found'))
const Forbidden403 = lazy(() => import('./pages/errors/forbidden'))

// ─── Core shared pages ────────────────────────────────────────────────────────
const DashboardPage    = lazy(() => import('./pages/dashboard/index'))
const CalendarPage     = lazy(() => import('./pages/calendar/index'))
const MessagesPage     = lazy(() => import('./pages/messages/index'))
const SettingsPage     = lazy(() => import('./pages/settings/index'))
const ProfilePage      = lazy(() => import('./pages/profile/index'))
const NotificationsPage = lazy(() => import('./pages/notifications/index'))
const AnalyticsPage    = lazy(() => import('./pages/analytics/index'))
const FinancesPage     = lazy(() => import('./pages/finances/index'))
const ReviewsPage      = lazy(() => import('./pages/reviews/index'))
const TasksPage        = lazy(() => import('./pages/tasks/index'))
const WaitingRoomPage  = lazy(() => import('./pages/waiting-room/index'))
const TestResultsPage  = lazy(() => import('./pages/test-results/index'))
const VideoConsultation = lazy(() => import('./pages/video/index'))

// ─── Appointments ─────────────────────────────────────────────────────────────
const AppointmentsPage   = lazy(() => import('./pages/appointments/index'))
const NewAppointmentPage = lazy(() => import('./pages/appointments/create'))
const EditAppointmentPage = lazy(() => import('./pages/appointments/edit'))
const AppointmentDetailPage = lazy(() => import('./pages/appointments/detail'))
const BookingWizard      = lazy(() => import('./pages/booking/index'))

// ─── Clinicians ───────────────────────────────────────────────────────────────
const CliniciansPage      = lazy(() => import('./pages/clinicians/index'))
const ClinicianDetailPage = lazy(() => import('./pages/clinicians/detail'))
const CreateClinicianPage = lazy(() => import('./pages/clinicians/CreateClinicianPage'))
const EditClinicianPage   = lazy(() => import('./pages/clinicians/EditClinicianPage'))

// ─── Patients ─────────────────────────────────────────────────────────────────
const PatientsPage      = lazy(() => import('./pages/patients/index'))
const PatientDetailPage = lazy(() => import('./pages/patients/detail'))
const CreatePatientPage = lazy(() => import('./pages/patients/CreatePatientPage'))
const EditPatientPage   = lazy(() => import('./pages/patients/EditPatientPage'))

// ─── Staff ────────────────────────────────────────────────────────────────────
const StaffPage         = lazy(() => import('./pages/staff/index'))
const StaffDashboard    = lazy(() => import('./pages/staff/Dashboard'))
const StaffAppointments = lazy(() => import('./pages/staff/Appointments'))
const StaffNew          = lazy(() => import('./pages/staff/new'))
const StaffEdit         = lazy(() => import('./pages/staff/edit'))

// ─── Patient Portal ───────────────────────────────────────────────────────────
const PatientDashboard    = lazy(() => import('./pages/patient/Dashboard'))
const PatientAppointments = lazy(() => import('./pages/patient/Appointments'))
const PatientProfile      = lazy(() => import('./pages/patient/Profile'))

// ─── Clinician Portal ─────────────────────────────────────────────────────────
const ClinicianDashboard    = lazy(() => import('./pages/clinician/Dashboard'))
const ClinicianCalendar     = lazy(() => import('./pages/clinician/Calendar'))
const ClinicianAvailability = lazy(() => import('./pages/clinician/Availability'))
const ClinicianPatients     = lazy(() => import('./pages/clinician/Patients'))

// ─── Manager: Dashboard, Availability, Blocks, Billing ───────────────────────
const ManagerDashboard    = lazy(() => import('./pages/manager/Dashboard'))
const ManagerAvailability = lazy(() => import('./pages/manager/Availability'))
const ManagerBlocks       = lazy(() => import('./pages/manager/Blocks'))
const ManagerBilling      = lazy(() => import('./pages/manager/Billing'))

// ─── Manager: Clinics (feature folder) ───────────────────────────────────────
const ManagerClinics   = lazy(() => import('./pages/manager/clinics/index'))
const ClinicDetailPage = lazy(() => import('./pages/manager/clinics/detail'))
const CreateClinicPage = lazy(() => import('./pages/manager/clinics/create'))
const EditClinicPage   = lazy(() => import('./pages/manager/clinics/edit'))

// ─── Manager: Rooms (feature folder) ─────────────────────────────────────────
const ManagerRooms   = lazy(() => import('./pages/manager/rooms/index'))
const RoomDetailPage = lazy(() => import('./pages/manager/rooms/detail'))
const CreateRoomPage = lazy(() => import('./pages/manager/rooms/create'))
const EditRoomPage   = lazy(() => import('./pages/manager/rooms/edit'))

// ─── Manager: Services (feature folder) ──────────────────────────────────────
const ServiceCatalog    = lazy(() => import('./pages/manager/services/index'))
const ServiceDetailPage = lazy(() => import('./pages/manager/services/detail'))
const CreateServicePage = lazy(() => import('./pages/manager/services/create'))
const EditServicePage   = lazy(() => import('./pages/manager/services/edit'))

// ─── Manager: Products (feature folder) ──────────────────────────────────────
const ManagerProducts     = lazy(() => import('./pages/manager/products/index'))
const CreateProductPage   = lazy(() => import('./pages/manager/products/create'))
const EditProductPage     = lazy(() => import('./pages/manager/products/edit'))

// ─── Admin ────────────────────────────────────────────────────────────────────
const AdminUsers          = lazy(() => import('./pages/admin/users/index'))
const { CreateUserPage, EditUserPage } = {
  CreateUserPage: lazy(() => import('./pages/admin/users/form').then(m => ({ default: m.CreateUserPage }))),
  EditUserPage:   lazy(() => import('./pages/admin/users/form').then(m => ({ default: m.EditUserPage   }))),
}
const AdminOrganizations  = lazy(() => import('./pages/admin/Organizations'))
const AdminCommunications = lazy(() => import('./pages/admin/Communications'))
const AdminPolicies       = lazy(() => import('./pages/admin/Policies'))
const AdminRoles          = lazy(() => import('./pages/admin/Roles'))
const AdminClinicianTypes = lazy(() => import('./pages/admin/ClinicianTypes'))
const AdminRoomTypes      = lazy(() => import('./pages/admin/RoomTypes'))
const AdminLanguages      = lazy(() => import('./pages/admin/Languages'))
const AdminEmailTemplates = lazy(() => import('./pages/admin/EmailTemplates'))
import AdminLayout from './layouts/AdminLayout'

// ─── Loading fallbacks ────────────────────────────────────────────────────────
const FullPageLoader = () => (
  <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" sx={{ bgcolor: '#F0F7F8' }}>
    <CircularProgress size={48} thickness={4} sx={{ color: '#006D77' }} />
  </Box>
)

const ShellPageLoader = () => (
  <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}>
    <LinearProgress sx={{
      height: 3,
      bgcolor: 'rgba(0,109,119,0.1)',
      '& .MuiLinearProgress-bar': { bgcolor: '#006D77' }
    }} />
  </Box>
)

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    <Routes>
      {/* ── Public — with header/footer ──────────────────────────────── */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={
          <Suspense fallback={<FullPageLoader />}><Landing /></Suspense>
        } />
        <Route path="/doctor/:id" element={
          <Suspense fallback={<FullPageLoader />}><DoctorProfile /></Suspense>
        } />
      </Route>

      {/* ── Auth pages ───────────────────────────────────────────────── */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={
          <Suspense fallback={<FullPageLoader />}><Login /></Suspense>
        } />
        <Route path="/login-legacy" element={
          <Suspense fallback={<FullPageLoader />}><LoginPage /></Suspense>
        } />
        <Route path="/forgot-password" element={
          <Suspense fallback={<FullPageLoader />}><ForgotPasswordPage /></Suspense>
        } />
        <Route path="/get-started" element={
          <Suspense fallback={<FullPageLoader />}><OnboardingWizard /></Suspense>
        } />
      </Route>

      {/* ── Error pages ──────────────────────────────────────────────── */}
      <Route path="/403" element={
        <Suspense fallback={<FullPageLoader />}><Forbidden403 /></Suspense>
      } />
      {/* FIX-5: /forbidden alias → redirects to /403 so both routes render the access-denied page */}
      <Route path="/forbidden" element={<Navigate to="/403" replace />} />

      {/* ── Video — auth required, full-screen ───────────────────────── */}
      <Route element={<ProtectedRoute />}>
        <Route path="/video/:id" element={
          <Suspense fallback={<FullPageLoader />}><VideoConsultation /></Suspense>
        } />
      </Route>

      {/* ── Protected + AppShell ─────────────────────────────────────── */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<RoleHomeRedirect />} />

          {/* ── Core shared ───────────────────────────────────────────── */}
          {/* /dashboard is shared by admin/super_admin/staff (AppShell.jsx NAV_CONFIG's
              actual role list for this nav entry — 'receptionist' also listed there is
              a dead/no-op role name, RolesGuard only ever sees the real seeded role
              names). manager/clinician/patient each have their own dedicated dashboard
              route below and were never meant to reach this one — previously reachable
              by ANY authenticated role via plain ProtectedRoute; a patient/clinician
              account could land here (e.g. via the /login redirect bug fixed alongside
              this) and see a full manager-style analytics UI, even though its data was
              mock-only. */}
          <Route element={<RoleGuard roles={['admin', 'super_admin', 'staff']} />}>
            <Route path="/dashboard"            element={<Suspense fallback={<ShellPageLoader />}><DashboardPage /></Suspense>} />
          </Route>
          <Route path="/calendar"               element={<Suspense fallback={<ShellPageLoader />}><CalendarPage /></Suspense>} />
          <Route path="/messages"               element={<Suspense fallback={<ShellPageLoader />}><MessagesPage /></Suspense>} />
          <Route path="/settings"               element={<Suspense fallback={<ShellPageLoader />}><SettingsPage /></Suspense>} />
          <Route path="/notifications"          element={<Suspense fallback={<ShellPageLoader />}><NotificationsPage /></Suspense>} />
          <Route path="/profile"                element={<Suspense fallback={<ShellPageLoader />}><ProfilePage /></Suspense>} />

          {/* ── Appointments ─────────────────────────────────────────── */}
          <Route path="/appointments"           element={<Suspense fallback={<ShellPageLoader />}><AppointmentsPage /></Suspense>} />
          <Route path="/appointments/new"        element={<Suspense fallback={<ShellPageLoader />}><NewAppointmentPage /></Suspense>} />
          <Route path="/appointments/book"       element={<Suspense fallback={<ShellPageLoader />}><BookingWizard /></Suspense>} />
          <Route path="/appointments/:id"        element={<Suspense fallback={<ShellPageLoader />}><AppointmentDetailPage /></Suspense>} />
          <Route path="/appointments/:id/edit"   element={<Suspense fallback={<ShellPageLoader />}><EditAppointmentPage /></Suspense>} />

          {/* ── Clinicians ───────────────────────────────────────────── */}
          <Route path="/clinicians"              element={<Suspense fallback={<ShellPageLoader />}><CliniciansPage /></Suspense>} />
          <Route path="/clinicians/new"          element={<Suspense fallback={<ShellPageLoader />}><CreateClinicianPage /></Suspense>} />
          <Route path="/clinicians/:id"          element={<Suspense fallback={<ShellPageLoader />}><ClinicianDetailPage /></Suspense>} />
          <Route path="/clinicians/:id/edit"     element={<Suspense fallback={<ShellPageLoader />}><EditClinicianPage /></Suspense>} />

          {/* ── Patients ─────────────────────────────────────────────── */}
          <Route path="/patients"                element={<Suspense fallback={<ShellPageLoader />}><PatientsPage /></Suspense>} />
          <Route path="/patients/new"            element={<Suspense fallback={<ShellPageLoader />}><CreatePatientPage /></Suspense>} />
          <Route path="/patients/:id"            element={<Suspense fallback={<ShellPageLoader />}><PatientDetailPage /></Suspense>} />
          <Route path="/patients/:id/edit"       element={<Suspense fallback={<ShellPageLoader />}><EditPatientPage /></Suspense>} />

          {/* ── Patient Portal ────────────────────────────────────────── */}
          <Route path="/patient/dashboard"      element={<Suspense fallback={<ShellPageLoader />}><PatientDashboard /></Suspense>} />
          <Route path="/patient/appointments"   element={<Suspense fallback={<ShellPageLoader />}><PatientAppointments /></Suspense>} />
          <Route path="/patient/profile"        element={<Suspense fallback={<ShellPageLoader />}><PatientProfile /></Suspense>} />
          {/* SUG-PTDASH-001: /booking/search used by Patient Dashboard CTAs — redirect to existing booking wizard */}
          <Route path="/booking/search"         element={<Navigate to="/appointments/book" replace />} />
          {/* SUG-PTAPPT-003: Receipt page redirect — navigates to appointments list until a receipt page is built */}
          <Route path="/patient/appointments/:id/receipt" element={<Navigate to="/patient/appointments" replace />} />

          {/* ── Clinician Portal ──────────────────────────────────────── */}
          <Route path="/clinician/dashboard"    element={<Suspense fallback={<ShellPageLoader />}><ClinicianDashboard /></Suspense>} />
          <Route path="/clinician/calendar"     element={<Suspense fallback={<ShellPageLoader />}><ClinicianCalendar /></Suspense>} />
          <Route path="/clinician/availability" element={<Suspense fallback={<ShellPageLoader />}><ClinicianAvailability /></Suspense>} />
          <Route path="/clinician/patients"     element={<Suspense fallback={<ShellPageLoader />}><ClinicianPatients /></Suspense>} />

          {/* ── Staff ─────────────────────────────────────────────────── */}
          <Route path="/staff/dashboard"        element={<Suspense fallback={<ShellPageLoader />}><StaffDashboard /></Suspense>} />
          <Route path="/staff/appointments"     element={<Suspense fallback={<ShellPageLoader />}><StaffAppointments /></Suspense>} />

          {/* ── Manager / admin ───────────────────────────────────────── */}
          <Route element={<RoleGuard roles={['admin', 'super_admin', 'manager']} />}>
            <Route path="/manager/dashboard"         element={<Suspense fallback={<ShellPageLoader />}><ManagerDashboard /></Suspense>} />
            <Route path="/manager/billing"           element={<Suspense fallback={<ShellPageLoader />}><ManagerBilling /></Suspense>} />
            <Route path="/manager/availability"      element={<Suspense fallback={<ShellPageLoader />}><ManagerAvailability /></Suspense>} />
            <Route path="/manager/blocks"            element={<Suspense fallback={<ShellPageLoader />}><ManagerBlocks /></Suspense>} />
            {/* Clinics CRUD */}
            <Route path="/manager/clinics"           element={<Suspense fallback={<ShellPageLoader />}><ManagerClinics /></Suspense>} />
            <Route path="/manager/clinics/new"       element={<Suspense fallback={<ShellPageLoader />}><CreateClinicPage /></Suspense>} />
            <Route path="/manager/clinics/:id"       element={<Suspense fallback={<ShellPageLoader />}><ClinicDetailPage /></Suspense>} />
            <Route path="/manager/clinics/:id/edit"  element={<Suspense fallback={<ShellPageLoader />}><EditClinicPage /></Suspense>} />
            {/* Rooms CRUD */}
            <Route path="/manager/rooms"             element={<Suspense fallback={<ShellPageLoader />}><ManagerRooms /></Suspense>} />
            <Route path="/manager/rooms/new"         element={<Suspense fallback={<ShellPageLoader />}><CreateRoomPage /></Suspense>} />
            <Route path="/manager/rooms/:id"         element={<Suspense fallback={<ShellPageLoader />}><RoomDetailPage /></Suspense>} />
            <Route path="/manager/rooms/:id/edit"    element={<Suspense fallback={<ShellPageLoader />}><EditRoomPage /></Suspense>} />
            {/* Services CRUD */}
            <Route path="/manager/services"          element={<Suspense fallback={<ShellPageLoader />}><ServiceCatalog /></Suspense>} />
            <Route path="/manager/services/new"      element={<Suspense fallback={<ShellPageLoader />}><CreateServicePage /></Suspense>} />
            <Route path="/manager/services/:id"      element={<Suspense fallback={<ShellPageLoader />}><ServiceDetailPage /></Suspense>} />
            <Route path="/manager/services/:id/edit" element={<Suspense fallback={<ShellPageLoader />}><EditServicePage /></Suspense>} />
            {/* Products CRUD */}
            <Route path="/manager/products"          element={<Suspense fallback={<ShellPageLoader />}><ManagerProducts /></Suspense>} />
            <Route path="/manager/products/new"      element={<Suspense fallback={<ShellPageLoader />}><CreateProductPage /></Suspense>} />
            <Route path="/manager/products/:id/edit" element={<Suspense fallback={<ShellPageLoader />}><EditProductPage /></Suspense>} />
            {/* Shared manager/admin pages */}
            <Route path="/tasks"               element={<Suspense fallback={<ShellPageLoader />}><TasksPage /></Suspense>} />
            <Route path="/waiting-room"        element={<Suspense fallback={<ShellPageLoader />}><WaitingRoomPage /></Suspense>} />
            <Route path="/staff"               element={<Suspense fallback={<ShellPageLoader />}><StaffPage /></Suspense>} />
            <Route path="/staff/new"            element={<Suspense fallback={<ShellPageLoader />}><StaffNew /></Suspense>} />
            <Route path="/staff/edit/:id"       element={<Suspense fallback={<ShellPageLoader />}><StaffEdit /></Suspense>} />
            <Route path="/test-results"        element={<Suspense fallback={<ShellPageLoader />}><TestResultsPage /></Suspense>} />
            <Route path="/analytics"           element={<Suspense fallback={<ShellPageLoader />}><AnalyticsPage /></Suspense>} />
            <Route path="/finances"            element={<Suspense fallback={<ShellPageLoader />}><FinancesPage /></Suspense>} />
            <Route path="/reviews"             element={<Suspense fallback={<ShellPageLoader />}><ReviewsPage /></Suspense>} />
          </Route>

          {/* ── Admin only — wrapped in AdminLayout sidebar ───────────── */}
          <Route element={<RoleGuard roles={['admin', 'super_admin']} />}>
            <Route element={<AdminLayout />}>
              {/* NEW-ADMIN-003: /admin → /admin/users default landing */}
              <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
              <Route path="/admin/users"           element={<Suspense fallback={<ShellPageLoader />}><AdminUsers /></Suspense>} />
              <Route path="/admin/users/new"       element={<Suspense fallback={<ShellPageLoader />}><CreateUserPage /></Suspense>} />
              <Route path="/admin/users/:id/edit"  element={<Suspense fallback={<ShellPageLoader />}><EditUserPage /></Suspense>} />
              <Route path="/admin/organizations"   element={<Suspense fallback={<ShellPageLoader />}><AdminOrganizations /></Suspense>} />
              <Route path="/admin/communications"  element={<Suspense fallback={<ShellPageLoader />}><AdminCommunications /></Suspense>} />
              <Route path="/admin/policies"        element={<Suspense fallback={<ShellPageLoader />}><AdminPolicies /></Suspense>} />
              <Route path="/admin/roles"           element={<Suspense fallback={<ShellPageLoader />}><AdminRoles /></Suspense>} />
              <Route path="/admin/clinician-types" element={<Suspense fallback={<ShellPageLoader />}><AdminClinicianTypes /></Suspense>} />
              <Route path="/admin/room-types"      element={<Suspense fallback={<ShellPageLoader />}><AdminRoomTypes /></Suspense>} />
              <Route path="/admin/languages"       element={<Suspense fallback={<ShellPageLoader />}><AdminLanguages /></Suspense>} />
              <Route path="/admin/email-templates" element={<Suspense fallback={<ShellPageLoader />}><AdminEmailTemplates /></Suspense>} />
            </Route>
          </Route>
        </Route>
      </Route>

      {/* ── 404 ──────────────────────────────────────────────────────── */}
      <Route path="*" element={
        <Suspense fallback={<FullPageLoader />}><NotFoundPage /></Suspense>
      } />
    </Routes>
  )
}

export default App
