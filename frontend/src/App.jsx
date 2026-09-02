import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { Box, CircularProgress, LinearProgress } from '@mui/material'
import { useTheme, alpha } from '@mui/material/styles'

// ─── Layouts & Guards — synchronous imports (NEVER lazy) ──────────────────────
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute'
import RoleGuard from './components/ProtectedRoute/RoleGuard'
import AppShell from './layouts/AppShell'
import PublicLayout from './layouts/PublicLayout'
import AuthLayout from './layouts/AuthLayout'
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

// "/" itself, not just the AppShell index route below, has to decide between
// Landing (anonymous) and a role dashboard (authenticated) — a pathless
// `index` route nested under ProtectedRoute/AppShell used to also claim "/"
// for this, but React Router v6 scores index routes higher than an explicit
// `path="/"` route on an otherwise-tied match, so that index route silently
// won every time: authenticated visitors got bounced to their dashboard
// (harmless-looking) but anonymous visitors got bounced through
// ProtectedRoute straight to /login — the public marketing/booking landing
// page was unreachable for anyone, ever. Fixed by making "/" itself
// auth-aware (matching the OptionalAuthShell pattern already used for
// /appointments/book) instead of relying on two routes to both resolve "/".
function RootRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <FullPageLoader />
  if (isAuthenticated) return <RoleHomeRedirect />
  return (
    <Suspense fallback={<FullPageLoader />}>
      <Landing />
    </Suspense>
  )
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
const Login = lazy(() => import('./pages/auth/login'))
const ForgotPasswordPage = lazy(() => import('./pages/auth/forgot-password'))
const ResetPasswordPage = lazy(() => import('./pages/auth/reset-password'))
const OnboardingWizard = lazy(() => import('./pages/onboarding/index'))

// ─── Public ───────────────────────────────────────────────────────────────────
const Landing = lazy(() => import('./pages/public/landing'))
const DoctorProfile = lazy(() => import('./pages/public/doctor-profile'))
const Checkin = lazy(() => import('./pages/public/checkin'))
const PrescriptionOtp = lazy(() => import('./pages/share/prescription-otp'))

// ─── Errors ───────────────────────────────────────────────────────────────────
const NotFoundPage = lazy(() => import('./pages/errors/not-found'))
const Forbidden403 = lazy(() => import('./pages/errors/forbidden'))

// ─── Core shared pages ────────────────────────────────────────────────────────
const DashboardPage = lazy(() => import('./pages/dashboard/index'))
const CalendarPage = lazy(() => import('./pages/calendar/index'))
const MessagesPage = lazy(() => import('./pages/messages/index'))
const SettingsPage = lazy(() => import('./pages/settings/index'))
const ProfilePage = lazy(() => import('./pages/profile/index'))
const NotificationsPage = lazy(() => import('./pages/notifications/index'))
const AnalyticsPage = lazy(() => import('./pages/analytics/index'))
const FinancesPage = lazy(() => import('./pages/finances/index'))
const ReviewsPage = lazy(() => import('./pages/reviews/index'))
const TasksPage = lazy(() => import('./pages/tasks/index'))
const WaitingRoomPage = lazy(() => import('./pages/waiting-room/index'))
const TestResultsPage = lazy(() => import('./pages/test-results/index'))
const VideoConsultation = lazy(() => import('./pages/video/index'))

// ─── Appointments ─────────────────────────────────────────────────────────────
const AppointmentsPage = lazy(() => import('./pages/appointments/index'))
const NewAppointmentPage = lazy(() => import('./pages/appointments/create'))
const EditAppointmentPage = lazy(() => import('./pages/appointments/edit'))
const AppointmentDetailPage = lazy(() => import('./pages/appointments/detail'))
const NewAppointmentSeriesPage = lazy(() => import('./pages/appointments/series/new'))
const AppointmentSeriesDetailPage = lazy(() => import('./pages/appointments/series/detail'))
const BookingWizard = lazy(() => import('./pages/booking/index'))

// ─── Clinicians ───────────────────────────────────────────────────────────────
const CliniciansPage = lazy(() => import('./pages/clinicians/index'))
const ClinicianDetailPage = lazy(() => import('./pages/clinicians/detail'))
const CreateClinicianPage = lazy(() => import('./pages/clinicians/CreateClinicianPage'))
const EditClinicianPage = lazy(() => import('./pages/clinicians/EditClinicianPage'))

// ─── Patients ─────────────────────────────────────────────────────────────────
const PatientsPage = lazy(() => import('./pages/patients/index'))
const PatientDetailPage = lazy(() => import('./pages/patients/detail'))
const CreatePatientPage = lazy(() => import('./pages/patients/CreatePatientPage'))
const EditPatientPage = lazy(() => import('./pages/patients/EditPatientPage'))

// ─── Staff ────────────────────────────────────────────────────────────────────
const StaffPage = lazy(() => import('./pages/staff/index'))
const StaffDashboard = lazy(() => import('./pages/staff/Dashboard'))
const StaffAppointments = lazy(() => import('./pages/staff/Appointments'))
const StaffNew = lazy(() => import('./pages/staff/new'))
const StaffEdit = lazy(() => import('./pages/staff/edit'))

// ─── Patient Portal ───────────────────────────────────────────────────────────
const PatientDashboard = lazy(() => import('./pages/patient/Dashboard'))
const PatientAppointments = lazy(() => import('./pages/patient/Appointments'))
const PatientProfile = lazy(() => import('./pages/patient/Profile'))
const PatientFamily = lazy(() => import('./pages/patient/Family'))

// ─── Clinician Portal ─────────────────────────────────────────────────────────
const ClinicianDashboard = lazy(() => import('./pages/clinician/Dashboard'))
const ClinicianCalendar = lazy(() => import('./pages/clinician/Calendar'))
const ClinicianAvailability = lazy(() => import('./pages/clinician/Availability'))
const ClinicianPatients = lazy(() => import('./pages/clinician/Patients'))
const EncounterWorkspace = lazy(() => import('./pages/clinician/EncounterWorkspace'))
const PrescriptionBuilder = lazy(() => import('./pages/clinician/PrescriptionBuilder'))
const PrescriptionPrint = lazy(() => import('./pages/prescriptions/PrescriptionPrint'))
const VerifyPrescription = lazy(() => import('./pages/prescriptions/Verify'))
const QueueBoardPage = lazy(() => import('./pages/queue/index'))
const IpdBedBoardPage = lazy(() => import('./pages/ipd/BedBoard'))
const IpdAdmissionsPage = lazy(() => import('./pages/ipd/Admissions'))
const IpdNursingChartPage = lazy(() => import('./pages/ipd/NursingChart'))
const IpdOperationTheatrePage = lazy(() => import('./pages/ipd/OperationTheatre'))
const IpdBillingPage = lazy(() => import('./pages/ipd/IpdBilling'))
const IpdInsurancePage = lazy(() => import('./pages/ipd/IpdInsurance'))
const QueueDisplay = lazy(() => import('./pages/queue/display'))

// ─── Manager: Dashboard, Availability, Blocks, Billing ───────────────────────
const ManagerDashboard = lazy(() => import('./pages/manager/Dashboard'))
const ManagerAvailability = lazy(() => import('./pages/manager/Availability'))
const ManagerBlocks = lazy(() => import('./pages/manager/Blocks'))

// ─── Manager: Clinics (feature folder) ───────────────────────────────────────
const ManagerClinics = lazy(() => import('./pages/manager/clinics/index'))
const ClinicDetailPage = lazy(() => import('./pages/manager/clinics/detail'))
const CreateClinicPage = lazy(() => import('./pages/manager/clinics/create'))
const EditClinicPage = lazy(() => import('./pages/manager/clinics/edit'))

// ─── Manager: Rooms (feature folder) ─────────────────────────────────────────
const ManagerRooms = lazy(() => import('./pages/manager/rooms/index'))
const ManagerResources = lazy(() => import('./pages/manager/resources/index'))
const RoomDetailPage = lazy(() => import('./pages/manager/rooms/detail'))
const CreateRoomPage = lazy(() => import('./pages/manager/rooms/create'))
const EditRoomPage = lazy(() => import('./pages/manager/rooms/edit'))

// ─── Manager: Services (feature folder) ──────────────────────────────────────
const ServiceCatalog = lazy(() => import('./pages/manager/services/index'))
const ServiceDetailPage = lazy(() => import('./pages/manager/services/detail'))
const CreateServicePage = lazy(() => import('./pages/manager/services/create'))
const EditServicePage = lazy(() => import('./pages/manager/services/edit'))

// ─── Manager: Products (feature folder) ──────────────────────────────────────
const ManagerProducts = lazy(() => import('./pages/manager/products/index'))
const CreateProductPage = lazy(() => import('./pages/manager/products/create'))
const EditProductPage = lazy(() => import('./pages/manager/products/edit'))
// Phase G+3 — checklist/intake-field config (REQ051/REQ052) and multi-sitting packages (REQ054)
const ManagerClinicForms = lazy(() => import('./pages/manager/clinic-forms/index'))
const ManagerPackages = lazy(() => import('./pages/manager/packages/index'))
const ManagerMemberships = lazy(() => import('./pages/manager/memberships/index'))
const ManagerRegistries = lazy(() => import('./pages/manager/registries/index'))

// ─── Admin ────────────────────────────────────────────────────────────────────
const AdminUsers = lazy(() => import('./pages/admin/users/index'))
const { CreateUserPage, EditUserPage } = {
  CreateUserPage: lazy(() => import('./pages/admin/users/form').then((m) => ({ default: m.CreateUserPage }))),
  EditUserPage: lazy(() => import('./pages/admin/users/form').then((m) => ({ default: m.EditUserPage }))),
}
const AdminOrganizations = lazy(() => import('./pages/admin/Organizations'))
const AdminCommunications = lazy(() => import('./pages/admin/Communications'))
const AdminPolicies = lazy(() => import('./pages/admin/Policies'))
const AdminRoles = lazy(() => import('./pages/admin/Roles'))
const AdminClinicianTypes = lazy(() => import('./pages/admin/ClinicianTypes'))
const AdminRoomTypes = lazy(() => import('./pages/admin/RoomTypes'))
const AdminDepartments = lazy(() => import('./pages/admin/Departments'))
const AdminLanguages = lazy(() => import('./pages/admin/Languages'))
const AdminEmailTemplates = lazy(() => import('./pages/admin/EmailTemplates'))
// Phase G+2 frontend completion (REQ018/REQ032/REQ034/REQ022/REQ030/REQ031/REQ015/REQ029)
const AdminPlans = lazy(() => import('./pages/admin/Plans'))
const AdminPlatformBilling = lazy(() => import('./pages/admin/PlatformBilling'))
const AdminPayers = lazy(() => import('./pages/admin/Payers'))
const AdminRightsRequests = lazy(() => import('./pages/admin/RightsRequests'))
const ManagerPharmacy = lazy(() => import('./pages/manager/pharmacy/index'))
const ManagerClaims = lazy(() => import('./pages/manager/claims/index'))
const ManagerReports = lazy(() => import('./pages/manager/reports/index'))
const ManagerRevenueShare = lazy(() => import('./pages/manager/revenue-share/index'))
const ManagerImports = lazy(() => import('./pages/manager/imports/index'))
import AdminLayout from './layouts/AdminLayout'

// ─── Loading fallbacks ────────────────────────────────────────────────────────
// BUG053: was fixed teal ('#006D77'/'#F0F7F8') regardless of org branding.
// Both loaders render inside main.jsx's <ThemeModeProvider>, so the real,
// org-derived theme is always available here -- no chicken-and-egg case.
const FullPageLoader = () => {
  const theme = useTheme()
  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}
    >
      <CircularProgress size={48} thickness={4} sx={{ color: 'primary.main' }} />
    </Box>
  )
}

const ShellPageLoader = () => {
  const theme = useTheme()
  return (
    <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }}>
      <LinearProgress
        sx={{
          height: 3,
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          '& .MuiLinearProgress-bar': { bgcolor: 'primary.main' },
        }}
      />
    </Box>
  )
}

// The booking wizard (/appointments/book) is the one route genuinely meant
// to work both logged-in (pre-fills patient details, matches
// BookingWizard's own `if (user && ...)` guard) and anonymous (a patient
// booking from the public doctor-profile page, before creating an
// account) — everything else in the app is strictly one or the other.
// Renders the full authenticated shell when signed in, the public
// header/footer layout otherwise, so the same URL and component serve
// both without duplicating the route.
function OptionalAuthShell() {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <FullPageLoader />
  return isAuthenticated ? <AppShell /> : <PublicLayout />
}

// ─── App ──────────────────────────────────────────────────────────────────────
function App() {
  return (
    <Routes>
      {/* ── Public — with header/footer ──────────────────────────────── */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<RootRoute />} />
        <Route
          path="/doctor/:id"
          element={
            <Suspense fallback={<FullPageLoader />}>
              <DoctorProfile />
            </Suspense>
          }
        />
        {/* REQ107 — QR self-check-in landing page. No auth required at
            all: the token in the URL is the sole authority. */}
        <Route
          path="/checkin/:token"
          element={
            <Suspense fallback={<FullPageLoader />}>
              <Checkin />
            </Suspense>
          }
        />
        {/* REQ109 — same "no auth required, token in the URL is the sole
            authority" shape, plus a separate OTP the visitor types in. */}
        <Route
          path="/share/rx/:token"
          element={
            <Suspense fallback={<FullPageLoader />}>
              <PrescriptionOtp />
            </Suspense>
          }
        />
      </Route>

      {/* ── Booking wizard — works both logged-in and anonymous ─────────
          Linked from the public Landing/DoctorProfile "Book Appointment"
          CTAs (as an anonymous patient) and from in-app "New Booking"
          buttons (as an authenticated one) — same URL and component
          either way, see OptionalAuthShell above. */}
      <Route element={<OptionalAuthShell />}>
        <Route
          path="/appointments/book"
          element={
            <Suspense fallback={<ShellPageLoader />}>
              <BookingWizard />
            </Suspense>
          }
        />
      </Route>

      {/* ── Auth pages ───────────────────────────────────────────────── */}
      <Route element={<AuthLayout />}>
        <Route
          path="/login"
          element={
            <Suspense fallback={<FullPageLoader />}>
              <Login />
            </Suspense>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <Suspense fallback={<FullPageLoader />}>
              <ForgotPasswordPage />
            </Suspense>
          }
        />
        <Route
          path="/reset-password"
          element={
            <Suspense fallback={<FullPageLoader />}>
              <ResetPasswordPage />
            </Suspense>
          }
        />
        <Route
          path="/get-started"
          element={
            <Suspense fallback={<FullPageLoader />}>
              <OnboardingWizard />
            </Suspense>
          }
        />
      </Route>

      {/* ── Error pages ──────────────────────────────────────────────── */}
      <Route
        path="/403"
        element={
          <Suspense fallback={<FullPageLoader />}>
            <Forbidden403 />
          </Suspense>
        }
      />
      {/* FIX-5: /forbidden alias → redirects to /403 so both routes render the access-denied page */}
      <Route path="/forbidden" element={<Navigate to="/403" replace />} />

      {/* ── Video — auth required, full-screen ───────────────────────── */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/video/:id"
          element={
            <Suspense fallback={<FullPageLoader />}>
              <VideoConsultation />
            </Suspense>
          }
        />
      </Route>

      {/* ── Prescription print view — auth required, no AppShell chrome ──
          Same "protected but bare" shape as /video/:id above: one rendering
          path for both on-screen preview and window.print() (REQ021 US-RX-03). */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/prescriptions/:id/print"
          element={
            <Suspense fallback={<FullPageLoader />}>
              <PrescriptionPrint />
            </Suspense>
          }
        />
      </Route>

      {/* ── Queue TV display — auth required, no AppShell chrome (REQ019
          US-QUE-03): meant for a waiting-room screen, not staff navigation. */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/queue/display/:clinicianId"
          element={
            <Suspense fallback={<FullPageLoader />}>
              <QueueDisplay />
            </Suspense>
          }
        />
      </Route>

      {/* ── Protected + AppShell ─────────────────────────────────────── */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          {/* No index route here — "/" itself is handled by RootRoute above,
              which is what an authenticated visitor to "/" actually hits
              first (see RootRoute's comment). An index route nested this
              deep also ambiguously matches "/" itself in React Router v6
              (a pathless layout chain doesn't consume a path segment), and
              index routes are scored higher than an explicit path="/" route
              on a tie — that mismatch previously made the public landing
              page unreachable. */}

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
            <Route
              path="/dashboard"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <DashboardPage />
                </Suspense>
              }
            />
          </Route>
          {/* BUG046 — /calendar and /appointments used to sit here as plain
              sibling routes with no RoleGuard at all, reachable by ANY
              authenticated role including 'patient' (the same unguarded
              shape /dashboard was fixed away from, per the comment above).
              Backend appointments.service.ts self-scopes a patient caller
              correctly, so this was a UI-surface leak (the staff/manager
              bulk-management page), not a PHI leak -- gated here to match
              AppShell.jsx's own nav roles for each. */}
          <Route element={<RoleGuard roles={['admin', 'super_admin', 'manager', 'receptionist', 'staff']} />}>
            <Route
              path="/calendar"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <CalendarPage />
                </Suspense>
              }
            />
          </Route>
          <Route
            path="/messages"
            element={
              <Suspense fallback={<ShellPageLoader />}>
                <MessagesPage />
              </Suspense>
            }
          />
          <Route
            path="/settings"
            element={
              <Suspense fallback={<ShellPageLoader />}>
                <SettingsPage />
              </Suspense>
            }
          />
          <Route
            path="/notifications"
            element={
              <Suspense fallback={<ShellPageLoader />}>
                <NotificationsPage />
              </Suspense>
            }
          />
          <Route
            path="/profile"
            element={
              <Suspense fallback={<ShellPageLoader />}>
                <ProfilePage />
              </Suspense>
            }
          />
          {/* REQ136 — a real frontend surface for the already-built
              verifyPrescriptionIntegrity query (REQ129). Any authenticated
              role, matching that query's own broad @Auth gate. */}
          <Route
            path="/prescriptions/verify"
            element={
              <Suspense fallback={<ShellPageLoader />}>
                <VerifyPrescription />
              </Suspense>
            }
          />

          {/* ── Appointments ─────────────────────────────────────────── */}
          {/* BUG046 — this whole family used to have no RoleGuard at all,
              reachable by ANY authenticated role including 'patient' (a
              patient never navigates here through the app's own UI — the
              patient-facing equivalent is /patient/appointments and the
              public /appointments/book wizard below). Gated to match
              AppShell.jsx's own "Appointments" nav roles. */}
          <Route
            element={
              <RoleGuard roles={['admin', 'super_admin', 'manager', 'receptionist', 'staff', 'clinician']} />
            }
          >
            <Route
              path="/appointments"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <AppointmentsPage />
                </Suspense>
              }
            />
            <Route
              path="/appointments/new"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <NewAppointmentPage />
                </Suspense>
              }
            />
            {/* /appointments/book moved to its own top-level OptionalAuthShell route
                (below) — it's the one flow meant to work both logged-in and
                anonymous, so it isn't nested under ProtectedRoute here. */}
            {/* REQ163 (P2-10) — React Router v6 scores a literal "series"
                segment over the ":id" wildcard below regardless of
                declaration order, so this doesn't collide with
                /appointments/:id. */}
            <Route
              path="/appointments/series/new"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <NewAppointmentSeriesPage />
                </Suspense>
              }
            />
            <Route
              path="/appointments/series/:id"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <AppointmentSeriesDetailPage />
                </Suspense>
              }
            />
            <Route
              path="/appointments/:id"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <AppointmentDetailPage />
                </Suspense>
              }
            />
            <Route
              path="/appointments/:id/edit"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <EditAppointmentPage />
                </Suspense>
              }
            />
          </Route>

          {/* ── Clinicians ───────────────────────────────────────────── */}
          <Route
            path="/clinicians"
            element={
              <Suspense fallback={<ShellPageLoader />}>
                <CliniciansPage />
              </Suspense>
            }
          />
          <Route
            path="/clinicians/new"
            element={
              <Suspense fallback={<ShellPageLoader />}>
                <CreateClinicianPage />
              </Suspense>
            }
          />
          <Route
            path="/clinicians/:id"
            element={
              <Suspense fallback={<ShellPageLoader />}>
                <ClinicianDetailPage />
              </Suspense>
            }
          />
          <Route
            path="/clinicians/:id/edit"
            element={
              <Suspense fallback={<ShellPageLoader />}>
                <EditClinicianPage />
              </Suspense>
            }
          />

          {/* ── Patients ─────────────────────────────────────────────── */}
          <Route
            path="/patients"
            element={
              <Suspense fallback={<ShellPageLoader />}>
                <PatientsPage />
              </Suspense>
            }
          />
          <Route
            path="/patients/new"
            element={
              <Suspense fallback={<ShellPageLoader />}>
                <CreatePatientPage />
              </Suspense>
            }
          />
          <Route
            path="/patients/:id"
            element={
              <Suspense fallback={<ShellPageLoader />}>
                <PatientDetailPage />
              </Suspense>
            }
          />
          <Route
            path="/patients/:id/edit"
            element={
              <Suspense fallback={<ShellPageLoader />}>
                <EditPatientPage />
              </Suspense>
            }
          />

          {/* ── Patient Portal ────────────────────────────────────────── */}
          <Route
            path="/patient/dashboard"
            element={
              <Suspense fallback={<ShellPageLoader />}>
                <PatientDashboard />
              </Suspense>
            }
          />
          <Route
            path="/patient/appointments"
            element={
              <Suspense fallback={<ShellPageLoader />}>
                <PatientAppointments />
              </Suspense>
            }
          />
          <Route
            path="/patient/profile"
            element={
              <Suspense fallback={<ShellPageLoader />}>
                <PatientProfile />
              </Suspense>
            }
          />
          <Route
            path="/patient/family"
            element={
              <Suspense fallback={<ShellPageLoader />}>
                <PatientFamily />
              </Suspense>
            }
          />
          {/* SUG-PTDASH-001: /booking/search used by Patient Dashboard CTAs — redirect to existing booking wizard */}
          <Route path="/booking/search" element={<Navigate to="/appointments/book" replace />} />
          {/* SUG-PTAPPT-003: Receipt page redirect — navigates to appointments list until a receipt page is built */}
          <Route path="/patient/appointments/:id/receipt" element={<Navigate to="/patient/appointments" replace />} />

          {/* ── Clinician Portal ──────────────────────────────────────── */}
          <Route
            path="/clinician/dashboard"
            element={
              <Suspense fallback={<ShellPageLoader />}>
                <ClinicianDashboard />
              </Suspense>
            }
          />
          <Route
            path="/clinician/calendar"
            element={
              <Suspense fallback={<ShellPageLoader />}>
                <ClinicianCalendar />
              </Suspense>
            }
          />
          <Route
            path="/clinician/availability"
            element={
              <Suspense fallback={<ShellPageLoader />}>
                <ClinicianAvailability />
              </Suspense>
            }
          />
          <Route
            path="/clinician/patients"
            element={
              <Suspense fallback={<ShellPageLoader />}>
                <ClinicianPatients />
              </Suspense>
            }
          />
          {/* Guarded to match the backend: getOrCreateEncounter/createPrescription
              are @Auth('clinician')-only (encounters.resolver.ts,
              prescriptions.resolver.ts). These two routes previously had no
              RoleGuard at all — EncounterWorkspace has its own internal
              hasRole('clinician') check so it degraded gracefully, but
              PrescriptionBuilder has no internal check whatsoever, so any
              authenticated non-clinician could open the full Rx form and
              only get rejected by the server on final submit, not on entry —
              the SEC-18 "route gate doesn't match backend @Auth" bug class,
              here as an absent gate rather than a narrow one. */}
          <Route element={<RoleGuard roles={['clinician']} />}>
            <Route
              path="/clinician/encounters/:appointmentId"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <EncounterWorkspace />
                </Suspense>
              }
            />
            <Route
              path="/clinician/prescriptions/new"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <PrescriptionBuilder />
                </Suspense>
              }
            />
          </Route>

          {/* ── Staff ─────────────────────────────────────────────────── */}
          {/* Guarded to match the backend: dashboard.resolver.ts is
              @Auth('admin','super_admin','staff'). These routes previously had
              no RoleGuard at all, so a patient or clinician could open a staff
              console — harmless while the pages were fabricated, a FORBIDDEN
              error the moment they read real data. 'manager' is included
              because managers legitimately cover the front desk. */}
          <Route element={<RoleGuard roles={['admin', 'super_admin', 'staff', 'manager']} />}>
            <Route
              path="/staff/dashboard"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <StaffDashboard />
                </Suspense>
              }
            />
            <Route
              path="/staff/appointments"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <StaffAppointments />
                </Suspense>
              }
            />
            {/* REQ059 — pharmacy.resolver.ts is @Auth('staff','manager','admin',
                'super_admin'); this route previously sat under the manager-only
                block below, so real pharmacy staff got this app's own 403 page
                before ever reaching a page the backend already lets them use. */}
            <Route
              path="/manager/pharmacy"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <ManagerPharmacy />
                </Suspense>
              }
            />
            {/* REQ131 — insurance.resolver.ts's claims/submitClaim are
                @Auth('staff','manager','admin','super_admin'); same
                staff-inclusive gate as pharmacy above, matching its own
                previously-fixed frontend/backend gate mismatch. */}
            <Route
              path="/manager/claims"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <ManagerClaims />
                </Suspense>
              }
            />
          </Route>

          {/* ── Manager / admin ───────────────────────────────────────── */}
          <Route element={<RoleGuard roles={['admin', 'super_admin', 'manager']} />}>
            <Route
              path="/manager/dashboard"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <ManagerDashboard />
                </Suspense>
              }
            />
            {/* /manager/billing duplicated /finances (real since REQ004) — same
                manager-scoped revenue summary, transaction list and revenue
                chart. Its extra concepts (invoice IDs, refunds, "outstanding")
                had no backing model at all. Redirected rather than given a
                second, fabricated source of truth for the same numbers — the
                same call as open-questions.md #7. */}
            <Route path="/manager/billing" element={<Navigate to="/finances" replace />} />
            <Route
              path="/manager/availability"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <ManagerAvailability />
                </Suspense>
              }
            />
            <Route
              path="/manager/blocks"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <ManagerBlocks />
                </Suspense>
              }
            />
            {/* Clinics CRUD */}
            <Route
              path="/manager/clinics"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <ManagerClinics />
                </Suspense>
              }
            />
            <Route
              path="/manager/clinics/new"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <CreateClinicPage />
                </Suspense>
              }
            />
            <Route
              path="/manager/clinics/:id"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <ClinicDetailPage />
                </Suspense>
              }
            />
            <Route
              path="/manager/clinics/:id/edit"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <EditClinicPage />
                </Suspense>
              }
            />
            {/* Rooms CRUD */}
            <Route
              path="/manager/rooms"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <ManagerRooms />
                </Suspense>
              }
            />
            <Route
              path="/manager/rooms/new"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <CreateRoomPage />
                </Suspense>
              }
            />
            <Route
              path="/manager/rooms/:id"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <RoomDetailPage />
                </Suspense>
              }
            />
            <Route
              path="/manager/rooms/:id/edit"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <EditRoomPage />
                </Suspense>
              }
            />
            <Route
              path="/manager/reports"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <ManagerReports />
                </Suspense>
              }
            />
            {/* P2-05 */}
            <Route
              path="/manager/imports"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <ManagerImports />
                </Suspense>
              }
            />
            {/* P2-06 */}
            <Route
              path="/manager/revenue-share"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <ManagerRevenueShare />
                </Suspense>
              }
            />
            {/* Services CRUD */}
            <Route
              path="/manager/services"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <ServiceCatalog />
                </Suspense>
              }
            />
            <Route
              path="/manager/services/new"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <CreateServicePage />
                </Suspense>
              }
            />
            <Route
              path="/manager/services/:id"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <ServiceDetailPage />
                </Suspense>
              }
            />
            <Route
              path="/manager/services/:id/edit"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <EditServicePage />
                </Suspense>
              }
            />
            {/* Products CRUD */}
            <Route
              path="/manager/products"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <ManagerProducts />
                </Suspense>
              }
            />
            <Route
              path="/manager/products/new"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <CreateProductPage />
                </Suspense>
              }
            />
            <Route
              path="/manager/products/:id/edit"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <EditProductPage />
                </Suspense>
              }
            />
            {/* Shared manager/admin pages */}
            <Route
              path="/tasks"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <TasksPage />
                </Suspense>
              }
            />
            <Route
              path="/staff"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <StaffPage />
                </Suspense>
              }
            />
            <Route
              path="/staff/new"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <StaffNew />
                </Suspense>
              }
            />
            <Route
              path="/staff/edit/:id"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <StaffEdit />
                </Suspense>
              }
            />
            <Route
              path="/analytics"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <AnalyticsPage />
                </Suspense>
              }
            />
            <Route
              path="/finances"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <FinancesPage />
                </Suspense>
              }
            />
            <Route
              path="/reviews"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <ReviewsPage />
                </Suspense>
              }
            />
          </Route>

          {/* BUG062 — checklist.resolver.ts's/intake-fields.resolver.ts's own
              read queries allow clinician/staff too, narrower than the
              shared admin/super_admin/manager-only block above. Write
              mutations (create/update/deleteChecklistItem,
              create/update/deleteIntakeFieldConfig) stay manager/admin/
              super_admin-only and are self-gated client-side inside
              manager/clinic-forms/index.jsx (canManage). */}
          <Route element={<RoleGuard roles={['admin', 'super_admin', 'manager', 'clinician', 'staff']} />}>
            <Route
              path="/manager/clinic-forms"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <ManagerClinicForms />
                </Suspense>
              }
            />
          </Route>

          {/* BUG062 — packages.resolver.ts's own read query (packages)
              allows staff too, narrower than the shared admin/super_admin/
              manager-only block above. Write mutations (create/update/
              deletePackage) stay manager/admin/super_admin-only and are
              self-gated client-side inside manager/packages/index.jsx
              (canManage). */}
          <Route element={<RoleGuard roles={['admin', 'super_admin', 'manager', 'staff']} />}>
            <Route
              path="/manager/packages"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <ManagerPackages />
                </Suspense>
              }
            />
          </Route>

          {/* BUG062 — memberships.resolver.ts's own read query
              (membershipPlans) allows clinician/staff too, narrower than
              the shared admin/super_admin/manager-only block above. Write
              mutations (create/update/deleteMembershipPlan) stay
              manager/admin/super_admin-only and are self-gated
              client-side inside manager/memberships/index.jsx
              (canManage). */}
          <Route element={<RoleGuard roles={['admin', 'super_admin', 'manager', 'clinician', 'staff']} />}>
            <Route
              path="/manager/memberships"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <ManagerMemberships />
                </Suspense>
              }
            />
          </Route>

          {/* resources.resolver.ts's own read query (resources) allows
              staff too, narrower than the shared admin/super_admin/
              manager-only block above — its own dedicated RoleGuard, same
              precedent as /manager/registries and /queue below. Write
              mutations (create/update/deleteResource) stay manager/admin/
              super_admin-only and are self-gated client-side inside
              manager/resources/index.jsx (canManage). */}
          <Route element={<RoleGuard roles={['admin', 'super_admin', 'manager', 'staff']} />}>
            <Route
              path="/manager/resources"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <ManagerResources />
                </Suspense>
              }
            />
          </Route>

          {/* REQ168 (P2-12) — /manager/registries needs clinician/staff too
              (a clinician confirms suggestions off their own diagnoses,
              front-desk staff can mark a review done), broader than the
              admin/super_admin/manager-only block above — its own
              dedicated RoleGuard, same precedent as /queue and
              /waiting-room below. */}
          <Route element={<RoleGuard roles={['admin', 'super_admin', 'manager', 'clinician', 'staff']} />}>
            <Route
              path="/manager/registries"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <ManagerRegistries />
                </Suspense>
              }
            />
          </Route>

          {/* BUG039 — /queue's own RoleGuard used to sit inside the
              manager/admin-only block above, narrower than both the nav
              config (AppShell.jsx) and the backend @Auth (QUEUE_STAFF_ROLES),
              which both already allow clinician/staff/receptionist. Given
              its own dedicated RoleGuard here instead of widening the shared
              block, which would have granted those roles every other route
              in it too. */}
          <Route
            element={<RoleGuard roles={['admin', 'super_admin', 'manager', 'clinician', 'staff', 'receptionist']} />}
          >
            <Route
              path="/queue"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <QueueBoardPage />
                </Suspense>
              }
            />
          </Route>

          {/* REQ179 (IPD slice 1) — wards.resolver.ts/admissions.resolver.ts's
              own read gate is @Auth('staff','clinician','manager','admin',
              'super_admin'), matching /queue's own dedicated RoleGuard
              precedent above rather than the narrower admin/manager-only
              block elsewhere. Every mutation is additionally gated
              server-side by the 'ipd' plan feature flag. */}
          <Route
            element={<RoleGuard roles={['admin', 'super_admin', 'manager', 'clinician', 'staff', 'receptionist']} />}
          >
            <Route
              path="/ipd/beds"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <IpdBedBoardPage />
                </Suspense>
              }
            />
            <Route
              path="/ipd/admissions"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <IpdAdmissionsPage />
                </Suspense>
              }
            />
            {/* REQ179 (IPD slice 2) — nursing charting. Reached from the
                admissions detail dialog's "Chart" action, not top-level nav. */}
            <Route
              path="/ipd/chart/:admissionId"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <IpdNursingChartPage />
                </Suspense>
              }
            />
            {/* REQ179 (IPD slice 3) — OT scheduling. Top-level nav entry,
                matching /ipd/beds and /ipd/admissions' own precedent (this
                is a schedule board, not a drill-down like the chart above). */}
            <Route
              path="/ipd/ot"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <IpdOperationTheatrePage />
                </Suspense>
              }
            />
            {/* REQ179 (IPD slice 4) — billing console. Top-level nav entry
                (front-desk/finance surface), also reachable via
                /ipd/billing?admission=<id> from the admissions detail
                dialog's own "Billing" action, matching the chart deep-link
                precedent above. */}
            <Route
              path="/ipd/billing"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <IpdBillingPage />
                </Suspense>
              }
            />
            {/* REQ179 (IPD slice 5) — TPA cashless insurance console. Top-
                level nav entry, also reachable via
                /ipd/insurance?admission=<id> from the admissions detail
                dialog's own "Insurance" action, matching the billing
                deep-link precedent above. */}
            <Route
              path="/ipd/insurance"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <IpdInsurancePage />
                </Suspense>
              }
            />
          </Route>

          {/* /waiting-room's own RoleGuard used to sit inside the
              manager/admin-only block above, narrower than the backend
              @Auth on every check-in/start-consultation/mark-no-show
              mutation it calls (appointments.resolver.ts), which already
              allows clinician/staff/receptionist -- the exact same gap
              BUG039 found and fixed for /queue. Given its own dedicated
              RoleGuard here instead of widening the shared block, which
              would have granted those roles every other route in it too. */}
          <Route
            element={<RoleGuard roles={['admin', 'super_admin', 'manager', 'clinician', 'staff', 'receptionist']} />}
          >
            <Route
              path="/waiting-room"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <WaitingRoomPage />
                </Suspense>
              }
            />
          </Route>

          {/* /test-results's own RoleGuard used to sit inside the shared
              manager/admin-only block above, narrower than the backend
              @Auth on orderTest (test-results.resolver.ts: manager, admin,
              super_admin, clinician, staff) -- the same gap class BUG039/
              the /queue and /waiting-room routes above found and fixed.
              Given its own dedicated RoleGuard here instead of widening
              the shared block, which would have granted clinician/staff
              every other route in it too. */}
          <Route element={<RoleGuard roles={['admin', 'super_admin', 'manager', 'clinician', 'staff']} />}>
            <Route
              path="/test-results"
              element={
                <Suspense fallback={<ShellPageLoader />}>
                  <TestResultsPage />
                </Suspense>
              }
            />
          </Route>

          {/* ── Admin only — wrapped in AdminLayout sidebar ───────────── */}
          <Route element={<RoleGuard roles={['admin', 'super_admin']} />}>
            <Route element={<AdminLayout />}>
              {/* NEW-ADMIN-003: /admin → /admin/users default landing */}
              <Route path="/admin" element={<Navigate to="/admin/users" replace />} />
              <Route
                path="/admin/organizations"
                element={
                  <Suspense fallback={<ShellPageLoader />}>
                    <AdminOrganizations />
                  </Suspense>
                }
              />
              <Route
                path="/admin/roles"
                element={
                  <Suspense fallback={<ShellPageLoader />}>
                    <AdminRoles />
                  </Suspense>
                }
              />
              <Route
                path="/admin/clinician-types"
                element={
                  <Suspense fallback={<ShellPageLoader />}>
                    <AdminClinicianTypes />
                  </Suspense>
                }
              />
              <Route
                path="/admin/room-types"
                element={
                  <Suspense fallback={<ShellPageLoader />}>
                    <AdminRoomTypes />
                  </Suspense>
                }
              />
              <Route
                path="/admin/languages"
                element={
                  <Suspense fallback={<ShellPageLoader />}>
                    <AdminLanguages />
                  </Suspense>
                }
              />
              <Route
                path="/admin/email-templates"
                element={
                  <Suspense fallback={<ShellPageLoader />}>
                    <AdminEmailTemplates />
                  </Suspense>
                }
              />
            </Route>
          </Route>

          {/* ── super_admin only — plans.resolver.ts gates every query/
               mutation to @Auth('super_admin') exclusively (platform
               SaaS-subscription plan definitions, not org-scoped like
               everything else in the admin-only block above). A plain
               'admin' role previously reached this route and got a real
               403 on every GraphQL call, matching SEC-18. ── */}
          <Route element={<RoleGuard roles={['super_admin']} />}>
            <Route element={<AdminLayout />}>
              <Route
                path="/admin/plans"
                element={
                  <Suspense fallback={<ShellPageLoader />}>
                    <AdminPlans />
                  </Suspense>
                }
              />
              {/* REQ178/179/180 — platform_billing.resolver.ts gates every
                  query/mutation to @Auth('super_admin') exclusively (tenant
                  SaaS subscription billing, same platform-wide shape as
                  Plans above), so this route stays in this super_admin-only
                  block rather than the admin+manager one below. */}
              <Route
                path="/admin/platform-billing"
                element={
                  <Suspense fallback={<ShellPageLoader />}>
                    <AdminPlatformBilling />
                  </Suspense>
                }
              />
            </Route>
          </Route>

          {/* ── Admin OR manager — same AdminLayout shell, but these pages'
               real backend is org-scoped off the caller's own client_org_id
               (cancellation-rules, org-settings), or explicitly @Auth()'d to
               include 'manager' (insurance.resolver.ts's payers/empanelments,
               consent.resolver.ts's rightsRequests, users.resolver.ts's
               getUsers/getUsersStats/getUser) — a manager (not an org-less
               admin/super_admin) is the real day-to-day caller for all of
               these. Split out from the admin-only block above so a manager
               can reach and use them. ── */}
          <Route element={<RoleGuard roles={['admin', 'super_admin', 'manager']} />}>
            <Route element={<AdminLayout />}>
              <Route
                path="/admin/users"
                element={
                  <Suspense fallback={<ShellPageLoader />}>
                    <AdminUsers />
                  </Suspense>
                }
              />
              <Route
                path="/admin/users/new"
                element={
                  <Suspense fallback={<ShellPageLoader />}>
                    <CreateUserPage />
                  </Suspense>
                }
              />
              <Route
                path="/admin/users/:id/edit"
                element={
                  <Suspense fallback={<ShellPageLoader />}>
                    <EditUserPage />
                  </Suspense>
                }
              />
              <Route
                path="/admin/communications"
                element={
                  <Suspense fallback={<ShellPageLoader />}>
                    <AdminCommunications />
                  </Suspense>
                }
              />
              <Route
                path="/admin/policies"
                element={
                  <Suspense fallback={<ShellPageLoader />}>
                    <AdminPolicies />
                  </Suspense>
                }
              />
              <Route
                path="/admin/payers"
                element={
                  <Suspense fallback={<ShellPageLoader />}>
                    <AdminPayers />
                  </Suspense>
                }
              />
              <Route
                path="/admin/rights-requests"
                element={
                  <Suspense fallback={<ShellPageLoader />}>
                    <AdminRightsRequests />
                  </Suspense>
                }
              />
            </Route>
          </Route>

          {/* ── Admin, manager OR staff — departments.resolver.ts's own read
               queries (departments/department) allow staff too; write
               mutations stay manager/admin/super_admin-only and are
               self-gated client-side inside Departments.jsx (canManage). ── */}
          <Route element={<RoleGuard roles={['admin', 'super_admin', 'manager', 'staff']} />}>
            <Route element={<AdminLayout />}>
              <Route
                path="/admin/departments"
                element={
                  <Suspense fallback={<ShellPageLoader />}>
                    <AdminDepartments />
                  </Suspense>
                }
              />
            </Route>
          </Route>
        </Route>
      </Route>

      {/* ── 404 ──────────────────────────────────────────────────────── */}
      <Route
        path="*"
        element={
          <Suspense fallback={<FullPageLoader />}>
            <NotFoundPage />
          </Suspense>
        }
      />
    </Routes>
  )
}

export default App
