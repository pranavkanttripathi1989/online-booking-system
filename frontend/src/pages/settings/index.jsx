import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApolloClient, gql } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import {
  Box,
  Button,
  Typography,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  Stack,
  Divider,
  TextField,
  Avatar,
  Switch,
  FormControlLabel,
  Paper,
  IconButton,
  Chip,
  Slider,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  MenuItem,
  Alert,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import CameraAltRoundedIcon from '@mui/icons-material/CameraAltRounded'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded'
import PaletteRoundedIcon from '@mui/icons-material/PaletteRounded'
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded'
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import DevicesRoundedIcon from '@mui/icons-material/DevicesRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import CodeRoundedIcon from '@mui/icons-material/CodeRounded'
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded'
import { useAuth } from '../../context/AuthContext'
import { useThemeMode, FONT_SCALE_PRESETS } from '../../context/ThemeContext'

function TabPanel({ value, index, children }) {
  return value === index ? <Box>{children}</Box> : null
}

// BUG044 -- Appearance prefs have no server-side model; per-device localStorage
// is the documented minimum bar (the bug's own acceptance criteria).
// themeMode and fontScale are intentionally NOT here -- both are owned by
// ThemeModeContext (context/ThemeContext.jsx), which already reads/writes
// this same key. Accent Color used to be a third field here too (a
// personal, per-device swatch pick) -- removed: an organization's accent
// is a brand-identity setting, not a personal one, so it now reads from
// the org's own real Branding color (ThemeModeContext's accentColor,
// sourced from Settings > Clinic Settings > Branding) instead of a second,
// competing per-device mechanism.
const APPEARANCE_STORAGE_KEY = 'medibook_appearance_prefs'
const DEFAULT_APPEARANCE = { compact: false, rtl: false }
function loadAppearancePrefs() {
  try {
    const raw = window.localStorage.getItem(APPEARANCE_STORAGE_KEY)
    return raw ? { ...DEFAULT_APPEARANCE, ...JSON.parse(raw) } : DEFAULT_APPEARANCE
  } catch {
    return DEFAULT_APPEARANCE
  }
}

// ─── Notification rows — event_type must match backend/src/notification-preferences
// (NOTIFICATION_EVENT_TYPES / DEFAULTS) exactly; label is display-only ─────────
const NOTIF_ROWS = [
  { event_type: 'new_appointment', label: 'New appointment booked' },
  { event_type: 'appointment_reminder', label: 'Appointment reminder (24h)' },
  { event_type: 'appointment_cancelled', label: 'Appointment cancelled' },
  { event_type: 'new_message', label: 'New message received' },
  { event_type: 'new_review', label: 'New review posted' },
  { event_type: 'payment_received', label: 'Payment received' },
  { event_type: 'system_announcement', label: 'System announcements' },
]

// ─── REQ005 — Profile / Account & Security / Notifications GraphQL ─────────────
const MY_PROFILE_QUERY = gql`
  query MyProfile {
    myProfile {
      id
      first_name
      last_name
      email
      phone
      bio
      date_of_birth
      gender
      avatar_url
      totp_enabled
      address {
        line1
        line2
        city
        state
        pincode
        country
      }
    }
  }
`
const UPDATE_MY_PROFILE = gql`
  mutation UpdateMyProfile($input: UpdateMyProfileInput!) {
    updateMyProfile(input: $input) {
      success
      userErrors {
        message
      }
      profile {
        first_name
        last_name
        phone
        bio
        date_of_birth
        gender
        avatar_url
      }
    }
  }
`
// PLAN016 Slice C — 2FA (TOTP)
const START_TOTP_ENROLLMENT = gql`
  mutation StartTotpEnrollment {
    startTotpEnrollment {
      qr_data_url
      secret
    }
  }
`
const CONFIRM_TOTP_ENROLLMENT = gql`
  mutation ConfirmTotpEnrollment($input: ConfirmTotpEnrollmentInput!) {
    confirmTotpEnrollment(input: $input) {
      success
      message
      backup_codes
    }
  }
`
const DISABLE_TOTP = gql`
  mutation DisableTotp($input: DisableTotpInput!) {
    disableTotp(input: $input) {
      success
      message
    }
  }
`
const CHANGE_MY_PASSWORD = gql`
  mutation ChangeMyPassword($input: ChangeMyPasswordInput!) {
    changeMyPassword(input: $input) {
      success
      message
    }
  }
`
const MY_SESSIONS_QUERY = gql`
  query MySessions {
    mySessions {
      id
      device
      created_at
    }
  }
`
const REVOKE_MY_SESSION = gql`
  mutation RevokeMySession($id: String!) {
    revokeMySession(id: $id) {
      success
      message
    }
  }
`
// REQ053 (US-SEC-05) — self-service, immediately-granted emergency access.
// No admin-review query exists on the backend (myBreakGlassGrants is
// strictly self-scoped) — this is a "my own grants" list, not an oversight
// page. revokeBreakGlassAccess is manager+-gated server-side.
const MY_BREAK_GLASS_GRANTS_QUERY = gql`
  query MyBreakGlassGrants {
    myBreakGlassGrants {
      id
      reason
      granted_at
      expires_at
      revoked_at
      is_active
    }
  }
`
const REQUEST_BREAK_GLASS_ACCESS = gql`
  mutation RequestBreakGlassAccess($input: RequestBreakGlassAccessInput!) {
    requestBreakGlassAccess(input: $input) {
      success
      userErrors {
        message
      }
      grant {
        id
        expires_at
      }
    }
  }
`
const REVOKE_BREAK_GLASS_ACCESS = gql`
  mutation RevokeBreakGlassAccess($id: ID!) {
    revokeBreakGlassAccess(id: $id) {
      success
      userErrors {
        message
      }
    }
  }
`
const DEACTIVATE_MY_ACCOUNT = gql`
  mutation DeactivateMyAccount {
    deactivateMyAccount {
      success
      message
    }
  }
`
const MY_NOTIFICATION_PREFERENCES_QUERY = gql`
  query MyNotificationPreferences {
    myNotificationPreferences {
      event_type
      email_enabled
      sms_enabled
      app_enabled
      whatsapp_enabled
      quiet_hours_start
      quiet_hours_end
    }
  }
`
// REQ012/PLAN021 Slice 3 — GDPR Article 20 data portability. Nullable: null
// means either the org hasn't enabled export or this account isn't linked
// to a Patients row yet (both handled with a message, see handleDownloadData).
const MY_DATA_EXPORT_QUERY = gql`
  query MyDataExport {
    myDataExport
  }
`
const UPDATE_MY_NOTIFICATION_PREFERENCES = gql`
  mutation UpdateMyNotificationPreferences($input: [NotificationPreferenceInput!]!) {
    updateMyNotificationPreferences(input: $input) {
      success
      message
    }
  }
`
// REQ002/PLAN022 — Clinic tab -> Branding. myOrgBranding has no role gate
// (any authenticated user) and returns null for an org-less caller, so this
// page never needs to pre-guess who has an organisation client-side.
//
// This query (and GET_CLINICS_FOR_SETTINGS/UPDATE_CLINIC_FOR_SETTINGS/
// GET_CLINICIANS_FOR_LETTERHEAD/UPDATE_ORG_BRANDING below) is exported so
// index.test.jsx can import them verbatim instead of hand-copying them --
// BUG062's own lesson: a hand-copied duplicate of a query already drifted
// out of sync once (patient/Appointments.test.jsx) when the real query
// gained fields the test's own copy never did, breaking every test in
// that file with an opaque "Unable to find" error and no hint of the real
// cause. This file's OTHER hand-copied queries are left as-is -- fixing
// those is a separate, larger change outside this slice's own scope.
export const GET_ORG_BRANDING = gql`
  query MyOrgBranding {
    myOrgBranding {
      name
      logo_url
      primary_color
      secondary_color
      tagline
    }
  }
`
// BUG044 -- the "Clinic Information" section above Branding used to be 100%
// hardcoded (a US phone format, USD as a selectable currency, a generic
// "MediCare Clinic" placeholder), with a Save button that never called any
// mutation. Wired to the real clinics()/updateClinic() operations, matching
// the canonical CLINICS_QUERY/UPDATE_CLINIC_MUTATION field selection exactly
// (Hard Rule 7). Scoped to the org's primary clinic (is_primary: true),
// matching REQ041's own established "head office" convention -- a
// multi-branch org manages its other locations at /manager/clinics, the
// existing full clinic-management page this was never meant to duplicate.
export const GET_CLINICS_FOR_SETTINGS = gql`
  query ClinicsForSettings {
    clinics {
      id
      name
      address
      city
      postcode
      timezone
      phone
      email
      is_primary
      website
      alternate_phone
      appointment_note
      letterhead_clinician_ids
    }
  }
`
export const UPDATE_CLINIC_FOR_SETTINGS = gql`
  mutation UpdateClinicForSettings($id: ID!, $input: ClinicInput!) {
    updateClinic(id: $id, input: $input) {
      id
      name
      address
      city
      postcode
      timezone
      phone
      email
      website
      alternate_phone
      appointment_note
      letterhead_clinician_ids
    }
  }
`
// REQ170 -- the clinic's real clinician roster, for the "Letterhead
// Doctors" multi-select below. Deliberately its own small query rather
// than reusing CLINICIANS_QUERY's paginated shape, which this picker has
// no use for.
export const GET_CLINICIANS_FOR_LETTERHEAD = gql`
  query CliniciansForLetterhead {
    clinicians(first: 200) {
      data {
        id
        full_name
      }
    }
  }
`
export const UPDATE_ORG_BRANDING = gql`
  mutation UpdateMyOrgBranding($input: UpdateOrgBrandingInput!) {
    updateMyOrgBranding(input: $input) {
      success
      userErrors {
        message
      }
      branding {
        logo_url
        primary_color
        secondary_color
        tagline
      }
    }
  }
`

// ─── REQ018/REQ030/REQ015 — Integrations tab (booking widget, webhooks, API keys) ──
const GET_INTEGRATIONS = gql`
  query GetIntegrations {
    bookingWidgetConfigs {
      id
      allowed_origins
      short_link_slug
      is_active
      clinic {
        id
      }
    }
    webhookEndpoints {
      id
      url
      event_types
      is_active
    }
    apiKeys {
      id
      key_prefix
      name
      is_active
      last_used_at
    }
  }
`
const CREATE_BOOKING_WIDGET = gql`
  mutation CreateBookingWidgetConfig($input: BookingWidgetConfigInput!) {
    createBookingWidgetConfig(input: $input) {
      success
      userErrors {
        message
      }
      config {
        id
        allowed_origins
        short_link_slug
      }
    }
  }
`
const DEACTIVATE_BOOKING_WIDGET = gql`
  mutation DeactivateBookingWidgetConfig($id: ID!) {
    deactivateBookingWidgetConfig(id: $id) {
      success
    }
  }
`
// A-9 (project-plans/08-integration-gap-analysis.md) — the only way to
// change an existing widget's allowed origins was deactivate-and-recreate,
// which mints a new short_link_slug and breaks anything already embedded
// on the org's real site.
const UPDATE_BOOKING_WIDGET = gql`
  mutation UpdateBookingWidgetConfig($id: ID!, $input: BookingWidgetConfigInput!) {
    updateBookingWidgetConfig(id: $id, input: $input) {
      success
      userErrors {
        message
      }
      config {
        id
        allowed_origins
        short_link_slug
      }
    }
  }
`
// REQ105 — Embed Code dialog's clinician picker. Deliberately a lightweight
// inline query (id + name only) rather than the full CLINICIAN_FIELDS
// fragment CLINICIANS_QUERY pulls — this dialog only needs a name list.
const EMBED_CLINICIANS_QUERY = gql`
  query EmbedClinicians($clinic_id: ID, $first: Int = 100) {
    clinicians(clinic_id: $clinic_id, first: $first) {
      data {
        id
        first_name
        last_name
      }
    }
  }
`
const CREATE_WEBHOOK_ENDPOINT = gql`
  mutation CreateWebhookEndpoint($input: WebhookEndpointInput!) {
    createWebhookEndpoint(input: $input) {
      id
      url
      event_types
      secret
    }
  }
`
const DEACTIVATE_WEBHOOK_ENDPOINT = gql`
  mutation DeactivateWebhookEndpoint($id: ID!) {
    deactivateWebhookEndpoint(id: $id) {
      id
      is_active
    }
  }
`
// A-8 (project-plans/08-integration-gap-analysis.md) — webhookDeliveryLog
// exists and is tested backend-side but had no UI; a failed delivery (the
// common case against a real customer endpoint) was previously invisible.
const GET_WEBHOOK_DELIVERY_LOG = gql`
  query GetWebhookDeliveryLog($endpoint_id: ID!) {
    webhookDeliveryLog(endpoint_id: $endpoint_id) {
      id
      event_type
      status
      http_status
      attempted_at
      response_snippet
    }
  }
`
const CREATE_API_KEY = gql`
  mutation CreateApiKey($input: ApiKeyInput!) {
    createApiKey(input: $input) {
      id
      key_prefix
      name
      raw_key
    }
  }
`
const REVOKE_API_KEY = gql`
  mutation RevokeApiKey($id: ID!) {
    revokeApiKey(id: $id) {
      id
      is_active
    }
  }
`

// ─── REQ034 — Privacy tab (patient-facing consent + data rights) ──────────────
// AuthContext caches `medibook_user` straight from LOGIN_MUTATION's response
// on every fresh login, which has no `patient` field (see graphql/mutations.js
// LOGIN_MUTATION) — and its own mount effect only calls the full ME_QUERY
// (which does select `patient { id }`) when no cached user exists yet, so a
// freshly-logged-in patient session never picks up its own patient_id from
// `useAuth()` at all. Fetch it directly here instead of trusting that cache.
const GET_MY_PATIENT_LINK = gql`
  query MyPatientLink {
    me {
      patient {
        id
      }
    }
  }
`
const GET_MY_CONSENTS = gql`
  query GetMyConsents($patient_id: ID!) {
    patientConsents(patient_id: $patient_id) {
      id
      purpose
      granted
      granted_at
      revoked_at
    }
  }
`
const UPDATE_CONSENT = gql`
  mutation UpdateConsentSelf($input: UpdateConsentInput!) {
    updateConsent(input: $input) {
      id
      purpose
      granted
      granted_at
    }
  }
`
const REQUEST_DATA_RIGHTS = gql`
  mutation RequestDataRightsSelf($input: RequestDataRightsInput!) {
    requestDataRights(input: $input) {
      id
      type
      status
      sla_due_at
    }
  }
`

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, updateUser, logout, hasRole } = useAuth()
  const client = useApolloClient()
  const navigate = useNavigate()
  const location = useLocation()
  // REQ012/PLAN021 Slice 1 — login.jsx redirects here with this state when
  // the org requires MFA and this account hasn't enrolled yet.
  const mfaSetupRequired = !!location.state?.mfaSetupRequired
  const fileRef = useRef(null) // SUG-SET-001: camera icon file upload
  const [tab, setTab] = useState(location.state?.tab ?? 0)
  const [saved, setSaved] = useState(null) // SUG-SET-010: null|string

  // Profile state — seeded from the real myProfile query (loadAccountTabs
  // below), not a naive user?.name split or a hardcoded placeholder.
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [bio, setBio] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender] = useState('prefer_not_to_say')
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [addressCity, setAddressCity] = useState('')
  const [addressState, setAddressState] = useState('')
  const [addressPincode, setAddressPincode] = useState('')
  const [profileError, setProfileError] = useState(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Password state (SUG-SET-002)
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState(null)
  const [changingPw, setChangingPw] = useState(false)

  // Sessions state (SUG-SET-003) — real mySessions data. No `location`/
  // `current` fields: nothing backs them (no geo-IP infra, and the frontend
  // doesn't retain its own refresh_token to identify "this" session), so
  // they're dropped from the UI entirely rather than shown as fake data.
  const [sessions, setSessions] = useState([])

  // REQ053 (US-SEC-05) — Emergency Access (break-glass). Self-service
  // request + the caller's own grant history only — myBreakGlassGrants has
  // no org-wide review query, so there is no "review all pending" surface.
  const [breakGlassGrants, setBreakGlassGrants] = useState([])
  const [breakGlassDialogOpen, setBreakGlassDialogOpen] = useState(false)
  const [breakGlassReason, setBreakGlassReason] = useState('')
  const [requestingBreakGlass, setRequestingBreakGlass] = useState(false)
  const [breakGlassError, setBreakGlassError] = useState(null)

  // 2FA (TOTP) — PLAN016 Slice C: real enrollment against startTotpEnrollment/
  // confirmTotpEnrollment/disableTotp, seeded from myProfile.totp_enabled.
  const [totpEnabled, setTotpEnabled] = useState(false)
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [enrollStep, setEnrollStep] = useState('qr') // 'qr' | 'backup_codes'
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [totpSecret, setTotpSecret] = useState(null)
  const [confirmCode, setConfirmCode] = useState('')
  const [backupCodes, setBackupCodes] = useState([])
  const [totpBusy, setTotpBusy] = useState(false)
  const [totpError, setTotpError] = useState(null)
  const [disableOpen, setDisableOpen] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')

  // Deactivate confirm dialog state (SUG-SET-004)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

  // REQ012/PLAN021 Slice 3 — "Download my data" (GDPR Article 20)
  const [exportingData, setExportingData] = useState(false)
  const [exportError, setExportError] = useState(null)
  const isPatient = user?.roles?.some((r) => r.name === 'patient') ?? false

  // Notifications state — real myNotificationPreferences data, keyed by
  // event_type (see loadAccountTabs below); NOTIF_ROWS supplies only the
  // static label/order.
  const [notifPrefs, setNotifPrefs] = useState({})
  const [savingNotifs, setSavingNotifs] = useState(false)
  // REQ025 (US-NOT-04) — one account-wide quiet-hours window, applied
  // uniformly across every event's saved row (see handleSaveNotifications).
  const [quietHoursStart, setQuietHoursStart] = useState('')
  const [quietHoursEnd, setQuietHoursEnd] = useState('')

  const loadAccountTabs = async () => {
    try {
      const [{ data: profileData }, { data: sessionsData }, { data: notifData }] = await Promise.all([
        client.query({ query: MY_PROFILE_QUERY, fetchPolicy: 'network-only' }),
        client.query({ query: MY_SESSIONS_QUERY, fetchPolicy: 'network-only' }),
        client.query({ query: MY_NOTIFICATION_PREFERENCES_QUERY, fetchPolicy: 'network-only' }),
      ])
      if (profileData?.myProfile) {
        const p = profileData.myProfile
        setFirstName(p.first_name ?? '')
        setLastName(p.last_name ?? '')
        setPhone(p.phone ?? '')
        setBio(p.bio ?? '')
        setDateOfBirth(p.date_of_birth ? p.date_of_birth.slice(0, 10) : '')
        setGender(p.gender ?? 'prefer_not_to_say')
        setAvatarUrl(p.avatar_url ?? null)
        setAddressLine1(p.address?.line1 ?? '')
        setAddressLine2(p.address?.line2 ?? '')
        setAddressCity(p.address?.city ?? '')
        setAddressState(p.address?.state ?? '')
        setAddressPincode(p.address?.pincode ?? '')
        setTotpEnabled(!!p.totp_enabled)
      }
      setSessions(sessionsData?.mySessions ?? [])
      const prefsByType = Object.fromEntries((notifData?.myNotificationPreferences ?? []).map((p) => [p.event_type, p]))
      setNotifPrefs(prefsByType)
      // REQ025 — quiet hours are saved identically on every row; any one
      // row's value represents the account-wide setting.
      const anyRow = (notifData?.myNotificationPreferences ?? [])[0]
      setQuietHoursStart(anyRow?.quiet_hours_start ?? '')
      setQuietHoursEnd(anyRow?.quiet_hours_end ?? '')
    } catch (err) {
      setProfileError(err.message)
    }
  }
  useEffect(() => {
    loadAccountTabs()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Organization branding — REQ002/PLAN022, real backend
  // (org-settings.service.ts's myBranding/updateMyBranding). Real source of
  // truth for "does this account have an org to brand" is the query result
  // itself (null for an org-less caller), not a client-side guess off
  // user.organisation — that field isn't even populated by the real `me`
  // query today, only by MOCK_USERS.
  const [logoUrl, setLogoUrl] = useState(null)
  // Deliberate UI-2 exception: an org's own custom brand colours, picked
  // and persisted by a manager+, independent of this app's own light/dark
  // toggle. The default here is just this app's own teal as a sensible
  // starting point before an org customises it. This is the real,
  // backend-stored color the Appearance tab's accentColor now reads
  // (ThemeContext.jsx) -- see that context for the propagation.
  const [primaryColor, setPrimaryColor] = useState('#006D77')
  const [secondaryColor, setSecondaryColor] = useState('#007680')
  // REQ170 -- the letterhead subtitle shown under the clinic/org name.
  const [tagline, setTagline] = useState('')
  const [hasOrgForBranding, setHasOrgForBranding] = useState(false)
  const [brandingLoaded, setBrandingLoaded] = useState(false)
  const [brandingError, setBrandingError] = useState(null)
  const [savingBranding, setSavingBranding] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef(null)

  const loadBranding = async () => {
    try {
      const { data } = await client.query({ query: GET_ORG_BRANDING, fetchPolicy: 'network-only' })
      const b = data?.myOrgBranding
      setHasOrgForBranding(!!b)
      if (b) {
        setLogoUrl(b.logo_url ?? null)
        setPrimaryColor(b.primary_color ?? '#006D77')
        setSecondaryColor(b.secondary_color ?? '#007680')
        setTagline(b.tagline ?? '')
      }
    } catch (err) {
      setBrandingError(err.message)
    } finally {
      setBrandingLoaded(true)
    }
  }
  useEffect(() => {
    loadBranding()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // BUG044 — Clinic Information section (see GET_CLINICS_FOR_SETTINGS above)
  const canManageClinic = hasRole('manager') || hasRole('admin') || hasRole('super_admin')
  const [clinicId, setClinicId] = useState(null)
  const [clinicForm, setClinicForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    postcode: '',
    timezone: 'Asia/Kolkata',
    website: '',
    alternate_phone: '',
    appointment_note: '',
    letterhead_clinician_ids: [],
  })
  // REQ170 -- clinician roster for the Letterhead Doctors multi-select.
  const [letterheadClinicians, setLetterheadClinicians] = useState([])
  const [clinicLoaded, setClinicLoaded] = useState(false)
  const [hasClinicToManage, setHasClinicToManage] = useState(false)
  const [clinicError, setClinicError] = useState(null)
  const [savingClinic, setSavingClinic] = useState(false)
  const setClinicField = (field) => (e) => setClinicForm((prev) => ({ ...prev, [field]: e.target.value }))

  const loadClinic = async () => {
    // BUG (found live) -- `clinics` is deliberately unscoped for
    // admin/super_admin (orgScope() returns {} for platform operators, by
    // design, for legitimate cross-org tooling like /manager/clinics). This
    // section previously called it directly and picked whichever clinic
    // happened to have is_primary: true with no clinic picker and no
    // org-name disclosure -- for an org-less admin, that meant silently
    // viewing (and, via handleSaveClinic below, actually being able to
    // SAVE EDITS TO) an arbitrary, unrelated tenant's real clinic record
    // under a form that visually implies "your own clinic". Reusing
    // hasOrgForBranding (Branding's own already-correct, strictly
    // client_org_id-gated check, computed just above) as the single
    // source of truth for "does this account genuinely belong to an org"
    // closes it -- an org-less caller now sees the same empty state
    // Branding already shows, instead of someone else's data.
    if (!canManageClinic || !hasOrgForBranding) {
      setClinicLoaded(true)
      return
    }
    try {
      const [{ data }, { data: cliniciansData }] = await Promise.all([
        client.query({ query: GET_CLINICS_FOR_SETTINGS, fetchPolicy: 'network-only' }),
        client.query({ query: GET_CLINICIANS_FOR_LETTERHEAD, fetchPolicy: 'network-only' }),
      ])
      setLetterheadClinicians(cliniciansData?.clinicians?.data ?? [])
      const primary = (data?.clinics ?? []).find((c) => c.is_primary) ?? data?.clinics?.[0]
      setHasClinicToManage(!!primary)
      if (primary) {
        setClinicId(primary.id)
        setClinicForm({
          name: primary.name ?? '',
          phone: primary.phone ?? '',
          email: primary.email ?? '',
          address: primary.address ?? '',
          city: primary.city ?? '',
          postcode: primary.postcode ?? '',
          timezone: primary.timezone ?? 'Asia/Kolkata',
          website: primary.website ?? '',
          alternate_phone: primary.alternate_phone ?? '',
          appointment_note: primary.appointment_note ?? '',
          letterhead_clinician_ids: primary.letterhead_clinician_ids ?? [],
        })
      }
    } catch (err) {
      setClinicError(err.message)
    } finally {
      setClinicLoaded(true)
    }
  }
  useEffect(() => {
    // Deliberately sequenced after brandingLoaded (not a bare mount effect)
    // -- loadClinic() needs hasOrgForBranding to already reflect a real,
    // resolved query result, not this state's own initial `false` default,
    // to correctly distinguish "org-less caller" from "branding query still
    // in flight".
    if (brandingLoaded) loadClinic()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandingLoaded])

  const handleSaveClinic = async () => {
    setClinicError(null)
    setSavingClinic(true)
    try {
      const { data } = await client.mutate({
        mutation: UPDATE_CLINIC_FOR_SETTINGS,
        variables: { id: clinicId, input: clinicForm },
      })
      if (!data?.updateClinic) throw new Error('Failed to save clinic settings')
      handleSave('Clinic settings')
    } catch (err) {
      setClinicError(err?.graphQLErrors?.[0]?.message || err.message)
    } finally {
      setSavingClinic(false)
    }
  }

  // BUG044 -- a stale deep link (e.g. login.jsx's own `state: {tab}` pattern)
  // could otherwise land a non-managing caller on the now-hidden Clinic tab.
  useEffect(() => {
    if (tab === 4 && !canManageClinic) setTab(0)
  }, [tab, canManageClinic])

  // ── REQ018/REQ030/REQ015 — Integrations tab ──────────────────────────────
  const [widgetConfigs, setWidgetConfigs] = useState([])
  const [webhookEndpoints, setWebhookEndpoints] = useState([])
  const [apiKeys, setApiKeys] = useState([])
  const [integrationsError, setIntegrationsError] = useState(null)
  const [widgetOrigin, setWidgetOrigin] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookEvents, setWebhookEvents] = useState(['appointment.created'])
  const [apiKeyName, setApiKeyName] = useState('')
  const [revealedSecret, setRevealedSecret] = useState(null) // { kind, value } — shown once
  const [integrationsSubmitting, setIntegrationsSubmitting] = useState(false)

  const loadIntegrations = async () => {
    try {
      const { data } = await client.query({ query: GET_INTEGRATIONS, fetchPolicy: 'network-only' })
      setWidgetConfigs(data?.bookingWidgetConfigs ?? [])
      setWebhookEndpoints(data?.webhookEndpoints ?? [])
      setApiKeys(data?.apiKeys ?? [])
    } catch (err) {
      setIntegrationsError(err.message)
    }
  }
  useEffect(() => {
    loadIntegrations()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const submitWidget = async () => {
    if (!widgetOrigin.trim()) {
      setIntegrationsError('Enter at least one allowed origin URL')
      return
    }
    setIntegrationsSubmitting(true)
    setIntegrationsError(null)
    try {
      const { data } = await client.mutate({
        mutation: CREATE_BOOKING_WIDGET,
        variables: {
          input: {
            allowed_origins: widgetOrigin
              .split(',')
              .map((o) => o.trim())
              .filter(Boolean),
          },
        },
      })
      if (!data?.createBookingWidgetConfig?.success)
        throw new Error(data?.createBookingWidgetConfig?.userErrors?.[0]?.message ?? 'Failed to create widget config')
      setWidgetOrigin('')
      loadIntegrations()
    } catch (err) {
      setIntegrationsError(err.message)
    } finally {
      setIntegrationsSubmitting(false)
    }
  }
  const deactivateWidget = async (id) => {
    try {
      await client.mutate({ mutation: DEACTIVATE_BOOKING_WIDGET, variables: { id } })
      loadIntegrations()
    } catch (err) {
      setIntegrationsError(err.message)
    }
  }
  // REQ105 — Embed Code dialog
  const [embedWidget, setEmbedWidget] = useState(null)
  const [embedClinicians, setEmbedClinicians] = useState([])
  const [embedClinicianId, setEmbedClinicianId] = useState('')
  const [embedCopied, setEmbedCopied] = useState(false)
  const openEmbedCode = async (w) => {
    setEmbedWidget(w)
    setEmbedClinicianId('')
    setEmbedCopied(false)
    try {
      const { data } = await client.query({
        query: EMBED_CLINICIANS_QUERY,
        variables: { clinic_id: w.clinic?.id || undefined },
        fetchPolicy: 'network-only',
      })
      setEmbedClinicians(data?.clinicians?.data ?? [])
    } catch (err) {
      setEmbedClinicians([])
    }
  }
  const embedSnippet =
    embedWidget && embedClinicianId
      ? `<iframe src="${window.location.origin}/appointments/book?doctor=${embedClinicianId}&widget=${embedWidget.short_link_slug}" width="100%" height="800" style="border:none" title="Book an appointment"></iframe>`
      : ''
  const copyEmbedSnippet = async () => {
    try {
      await navigator.clipboard.writeText(embedSnippet)
      setEmbedCopied(true)
      setTimeout(() => setEmbedCopied(false), 2000)
    } catch (err) {
      /* clipboard unavailable — the snippet is still visible to copy manually */
    }
  }

  const [editingWidget, setEditingWidget] = useState(null) // { id, allowed_origins } or null
  const [editWidgetOrigins, setEditWidgetOrigins] = useState('')
  const openEditWidget = (w) => {
    setEditingWidget(w)
    setEditWidgetOrigins((w.allowed_origins ?? []).join(', '))
  }
  const submitEditWidget = async () => {
    if (!editWidgetOrigins.trim()) {
      setIntegrationsError('Enter at least one allowed origin URL')
      return
    }
    setIntegrationsSubmitting(true)
    setIntegrationsError(null)
    try {
      const { data } = await client.mutate({
        mutation: UPDATE_BOOKING_WIDGET,
        variables: {
          id: editingWidget.id,
          input: {
            allowed_origins: editWidgetOrigins
              .split(',')
              .map((o) => o.trim())
              .filter(Boolean),
          },
        },
      })
      if (!data?.updateBookingWidgetConfig?.success)
        throw new Error(data?.updateBookingWidgetConfig?.userErrors?.[0]?.message ?? 'Failed to update widget config')
      setEditingWidget(null)
      loadIntegrations()
    } catch (err) {
      setIntegrationsError(err.message)
    } finally {
      setIntegrationsSubmitting(false)
    }
  }

  const submitWebhook = async () => {
    if (!webhookUrl.trim()) {
      setIntegrationsError('Enter an endpoint URL')
      return
    }
    setIntegrationsSubmitting(true)
    setIntegrationsError(null)
    try {
      const { data } = await client.mutate({
        mutation: CREATE_WEBHOOK_ENDPOINT,
        variables: { input: { url: webhookUrl.trim(), event_types: webhookEvents } },
      })
      setRevealedSecret({ kind: 'Webhook signing secret', value: data?.createWebhookEndpoint?.secret })
      setWebhookUrl('')
      loadIntegrations()
    } catch (err) {
      setIntegrationsError(err.message)
    } finally {
      setIntegrationsSubmitting(false)
    }
  }
  const deactivateWebhook = async (id) => {
    try {
      await client.mutate({ mutation: DEACTIVATE_WEBHOOK_ENDPOINT, variables: { id } })
      loadIntegrations()
    } catch (err) {
      setIntegrationsError(err.message)
    }
  }
  const [deliveryLogFor, setDeliveryLogFor] = useState(null) // webhook endpoint being viewed, or null
  const [deliveryLog, setDeliveryLog] = useState([])
  const [deliveryLogLoading, setDeliveryLogLoading] = useState(false)
  const viewDeliveryLog = async (endpoint) => {
    setDeliveryLogFor(endpoint)
    setDeliveryLogLoading(true)
    try {
      const { data } = await client.query({
        query: GET_WEBHOOK_DELIVERY_LOG,
        variables: { endpoint_id: endpoint.id },
        fetchPolicy: 'network-only',
      })
      setDeliveryLog(data?.webhookDeliveryLog ?? [])
    } catch (err) {
      setIntegrationsError(err.message)
    } finally {
      setDeliveryLogLoading(false)
    }
  }

  const submitApiKey = async () => {
    if (!apiKeyName.trim()) {
      setIntegrationsError('Give the key a name')
      return
    }
    setIntegrationsSubmitting(true)
    setIntegrationsError(null)
    try {
      const { data } = await client.mutate({ mutation: CREATE_API_KEY, variables: { input: { name: apiKeyName.trim() } } })
      setRevealedSecret({ kind: 'API key', value: data?.createApiKey?.raw_key })
      setApiKeyName('')
      loadIntegrations()
    } catch (err) {
      setIntegrationsError(err.message)
    } finally {
      setIntegrationsSubmitting(false)
    }
  }
  const revokeApiKey = async (id) => {
    try {
      await client.mutate({ mutation: REVOKE_API_KEY, variables: { id } })
      loadIntegrations()
    } catch (err) {
      setIntegrationsError(err.message)
    }
  }

  // ── REQ034 — Privacy tab (patient-facing) ────────────────────────────────
  const [patientId, setPatientId] = useState(user?.patient?.id ?? null)
  const [consents, setConsents] = useState([])
  const [privacyError, setPrivacyError] = useState(null)
  const [privacyLoaded, setPrivacyLoaded] = useState(false)
  const [rightsRequestMsg, setRightsRequestMsg] = useState(null)

  const loadPrivacy = async () => {
    let resolvedPatientId = patientId
    if (!resolvedPatientId) {
      const { data: linkData } = await client
        .query({ query: GET_MY_PATIENT_LINK, fetchPolicy: 'network-only' })
        .catch(() => ({ data: null }))
      resolvedPatientId = linkData?.me?.patient?.id ?? null
      setPatientId(resolvedPatientId)
    }
    if (!resolvedPatientId) {
      setPrivacyLoaded(true)
      return
    }
    try {
      const { data } = await client.query({
        query: GET_MY_CONSENTS,
        variables: { patient_id: resolvedPatientId },
        fetchPolicy: 'network-only',
      })
      setConsents(data?.patientConsents ?? [])
    } catch (err) {
      setPrivacyError(err.message)
    } finally {
      setPrivacyLoaded(true)
    }
  }
  useEffect(() => {
    loadPrivacy()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isConsentGranted = (purpose) => {
    const rows = consents.filter((c) => c.purpose === purpose).sort((a, b) => new Date(b.granted_at) - new Date(a.granted_at))
    return rows[0]?.granted ?? false
  }
  const toggleConsent = async (purpose, granted) => {
    try {
      await client.mutate({ mutation: UPDATE_CONSENT, variables: { input: { patient_id: patientId, purpose, granted } } })
      loadPrivacy()
    } catch (err) {
      setPrivacyError(err.message)
    }
  }
  const requestRights = async (type) => {
    try {
      await client.mutate({ mutation: REQUEST_DATA_RIGHTS, variables: { input: { patient_id: patientId, type } } })
      setRightsRequestMsg(`Your ${type} request has been submitted — our team will respond within 30 days.`)
      setTimeout(() => setRightsRequestMsg(null), 6000)
    } catch (err) {
      setPrivacyError(err.message)
    }
  }

  // Same REST-multipart pattern as the avatar upload above — PNG/JPEG only
  // (magic-byte validated server-side; SVG deliberately excluded, see
  // org-branding.controller.ts).
  const handleLogoSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBrandingError(null)
    setUploadingLogo(true)
    try {
      const apiBase = (import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql').replace(/\/graphql$/, '')
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${apiBase}/org-branding/logo`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.message || 'Failed to upload logo')
      setLogoUrl(body.url)
    } catch (err) {
      setBrandingError(err.message)
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleSaveBranding = async () => {
    setBrandingError(null)
    setSavingBranding(true)
    try {
      const { data } = await client.mutate({
        mutation: UPDATE_ORG_BRANDING,
        variables: { input: { logo_url: logoUrl, primary_color: primaryColor, secondary_color: secondaryColor, tagline: tagline || undefined } },
      })
      if (!data?.updateMyOrgBranding?.success) {
        throw new Error(data?.updateMyOrgBranding?.userErrors?.[0]?.message ?? 'Failed to save branding')
      }
      handleSave('Branding')
    } catch (err) {
      setBrandingError(err?.graphQLErrors?.[0]?.message || err.message)
    } finally {
      setSavingBranding(false)
    }
  }

  // Appearance state -- hydrated from localStorage (BUG044); see
  // loadAppearancePrefs/APPEARANCE_STORAGE_KEY above. themeMode and
  // fontScale apply instantly via ThemeModeContext (never gated behind
  // this tab's own Save button); accentColor is read-only here, sourced
  // from the organization's real Branding color, editable only via
  // Settings > Clinic Settings > Branding (manager+). Only Compact
  // Mode/RTL remain this component's own local state, saved explicitly.
  const [appearancePrefs] = useState(loadAppearancePrefs)
  const { mode: themeMode, setMode: setThemeMode, accentColor, fontScale, setFontScale } = useThemeMode()
  const [compact, setCompact] = useState(appearancePrefs.compact)
  const [rtl, setRtl] = useState(appearancePrefs.rtl)
  const [language, setLanguage] = useState('en')
  const [appearanceError, setAppearanceError] = useState(null)

  useEffect(() => {
    document.documentElement.dir = rtl ? 'rtl' : 'ltr'
  }, [rtl])

  const handleSaveAppearance = () => {
    setAppearanceError(null)
    try {
      // BUG (fixed) -- this used to be a bare overwrite of the whole shared
      // APPEARANCE_STORAGE_KEY, silently deleting whatever ThemeModeContext
      // had just written (themeMode/fontScale). Read-modify-write instead,
      // matching ThemeContext.jsx's own merge-safe writeStoredField pattern.
      const raw = window.localStorage.getItem(APPEARANCE_STORAGE_KEY)
      const existing = raw ? JSON.parse(raw) : {}
      window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify({ ...existing, compact, rtl }))
      handleSave('Appearance settings')
    } catch {
      setAppearanceError('Could not save your appearance preferences on this device. Check your browser storage settings and try again.')
    }
  }

  // SUG-SET-010: Per-tab contextual success messages
  const handleSave = (context = 'Changes') => {
    setSaved(`${context} saved successfully!`)
    setTimeout(() => setSaved(null), 2500)
  }

  const handleProfileSave = async () => {
    setProfileError(null)
    setSavingProfile(true)
    try {
      // MyAddressInput requires line1/city/state/pincode together — only send
      // an address at all once every required part has actually been filled in,
      // rather than submitting a half-filled object the backend would reject.
      const address =
        addressLine1 && addressCity && addressState && addressPincode
          ? {
              line1: addressLine1,
              line2: addressLine2 || null,
              city: addressCity,
              state: addressState,
              pincode: addressPincode,
              country: 'India',
            }
          : null
      const { data } = await client.mutate({
        mutation: UPDATE_MY_PROFILE,
        variables: {
          input: {
            first_name: firstName,
            last_name: lastName,
            phone: phone || null,
            bio: bio || null,
            date_of_birth: dateOfBirth || null,
            gender,
            address,
          },
        },
      })
      if (!data?.updateMyProfile?.success) throw new Error(data?.updateMyProfile?.userErrors?.[0]?.message ?? 'Failed to save profile')
      updateUser({ name: `${firstName} ${lastName}`.trim() })
      handleSave('Profile changes')
    } catch (err) {
      setProfileError(err?.graphQLErrors?.[0]?.message || err.message)
    } finally {
      setSavingProfile(false)
    }
  }

  // REQ005/PLAN016 Slice B — plain REST multipart upload (no GraphQL upload
  // scalar exists in this schema), authenticated manually since the global
  // GqlAuthGuard only covers GraphQL execution context (account.controller.ts).
  const handleAvatarUpload = async (file) => {
    setProfileError(null)
    setUploadingAvatar(true)
    try {
      const apiBase = (import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql').replace(/\/graphql$/, '')
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${apiBase}/account/avatar`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.message || 'Failed to upload photo')
      setAvatarUrl(body.url)
      handleSave('Photo')
    } catch (err) {
      setProfileError(err.message)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const avatarSrc = avatarUrl
    ? avatarUrl.startsWith('http')
      ? avatarUrl
      : `${(import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql').replace(/\/graphql$/, '')}${avatarUrl}`
    : undefined
  const logoSrc = logoUrl
    ? logoUrl.startsWith('http')
      ? logoUrl
      : `${(import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql').replace(/\/graphql$/, '')}${logoUrl}`
    : undefined

  // ── 2FA (TOTP) — PLAN016 Slice C ──────────────────────────────────────────
  const handleStartEnroll = async () => {
    setTotpError(null)
    setTotpBusy(true)
    try {
      const { data } = await client.mutate({ mutation: START_TOTP_ENROLLMENT })
      setQrDataUrl(data.startTotpEnrollment.qr_data_url)
      setTotpSecret(data.startTotpEnrollment.secret)
      setEnrollStep('qr')
      setConfirmCode('')
      setEnrollOpen(true)
    } catch (err) {
      setProfileError(err?.graphQLErrors?.[0]?.message || err.message)
    } finally {
      setTotpBusy(false)
    }
  }

  const handleConfirmEnroll = async () => {
    setTotpError(null)
    setTotpBusy(true)
    try {
      const { data } = await client.mutate({
        mutation: CONFIRM_TOTP_ENROLLMENT,
        variables: { input: { code: confirmCode } },
      })
      if (!data?.confirmTotpEnrollment?.success) throw new Error(data?.confirmTotpEnrollment?.message ?? 'Incorrect code')
      setBackupCodes(data.confirmTotpEnrollment.backup_codes ?? [])
      setEnrollStep('backup_codes')
      setTotpEnabled(true)
    } catch (err) {
      setTotpError(err?.graphQLErrors?.[0]?.message || err.message)
    } finally {
      setTotpBusy(false)
    }
  }

  const closeEnrollDialog = () => {
    setEnrollOpen(false)
    setQrDataUrl(null)
    setTotpSecret(null)
    setConfirmCode('')
    setBackupCodes([])
    setEnrollStep('qr')
    setTotpError(null)
  }

  const handleDisableTotp = async () => {
    setTotpError(null)
    setTotpBusy(true)
    try {
      const { data } = await client.mutate({
        mutation: DISABLE_TOTP,
        variables: { input: { password: disablePassword } },
      })
      if (!data?.disableTotp?.success) throw new Error(data?.disableTotp?.message ?? 'Failed to disable 2FA')
      setTotpEnabled(false)
      setDisableOpen(false)
      setDisablePassword('')
      handleSave('Two-factor authentication')
    } catch (err) {
      setTotpError(err?.graphQLErrors?.[0]?.message || err.message)
    } finally {
      setTotpBusy(false)
    }
  }

  // SUG-SET-002: Password validation, now against the real changeMyPassword mutation
  const handlePasswordUpdate = async () => {
    setPwError(null)
    if (!currentPw) {
      setPwError('Please enter your current password.')
      return
    }
    if (newPw.length < 8) {
      setPwError('New password must be at least 8 characters.')
      return
    }
    if (newPw !== confirmPw) {
      setPwError('Passwords do not match.')
      return
    }
    setChangingPw(true)
    try {
      const { data } = await client.mutate({
        mutation: CHANGE_MY_PASSWORD,
        variables: { input: { current_password: currentPw, new_password: newPw } },
      })
      if (!data?.changeMyPassword?.success) throw new Error(data?.changeMyPassword?.message ?? 'Failed to change password')
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
      handleSave('Password')
    } catch (err) {
      setPwError(err.message)
    } finally {
      setChangingPw(false)
    }
  }

  // SUG-SET-003: Revoke session — real revokeMySession mutation
  const handleRevoke = async (id) => {
    try {
      const { data } = await client.mutate({ mutation: REVOKE_MY_SESSION, variables: { id } })
      if (!data?.revokeMySession?.success) throw new Error(data?.revokeMySession?.message ?? 'Failed to revoke session')
      setSessions((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      setProfileError(err.message)
    }
  }

  // REQ053 (US-SEC-05) — loaded independently of loadAccountTabs' own
  // Promise.all rather than folded in, so a break-glass query failure can
  // never block the rest of the Account & Security tab from loading.
  const loadBreakGlassGrants = async () => {
    try {
      const { data } = await client.query({ query: MY_BREAK_GLASS_GRANTS_QUERY, fetchPolicy: 'network-only' })
      setBreakGlassGrants(data?.myBreakGlassGrants ?? [])
    } catch {
      /* non-fatal — the rest of the tab still works */
    }
  }
  useEffect(() => {
    loadBreakGlassGrants()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRequestBreakGlass = async () => {
    setBreakGlassError(null)
    setRequestingBreakGlass(true)
    try {
      const { data } = await client.mutate({
        mutation: REQUEST_BREAK_GLASS_ACCESS,
        variables: { input: { reason: breakGlassReason } },
      })
      const result = data?.requestBreakGlassAccess
      if (!result?.success) throw new Error(result?.userErrors?.[0]?.message ?? 'Failed to request emergency access')
      setBreakGlassDialogOpen(false)
      setBreakGlassReason('')
      await loadBreakGlassGrants()
    } catch (err) {
      setBreakGlassError(err.message)
    } finally {
      setRequestingBreakGlass(false)
    }
  }

  const handleRevokeBreakGlass = async (id) => {
    try {
      const { data } = await client.mutate({ mutation: REVOKE_BREAK_GLASS_ACCESS, variables: { id } })
      if (!data?.revokeBreakGlassAccess?.success) {
        throw new Error(data?.revokeBreakGlassAccess?.userErrors?.[0]?.message ?? 'Failed to revoke access')
      }
      await loadBreakGlassGrants()
    } catch (err) {
      setBreakGlassError(err.message)
    }
  }

  // REQ012/PLAN021 Slice 3 — myDataExport returns null when the org hasn't
  // enabled patient data export OR this account has no linked Patients row
  // (both real, distinct states the backend deliberately collapses into one
  // nullable result, see account.service.ts). Distinguished here only by the
  // one thing the frontend can check itself (role), everything else gets a
  // single honest "not available" message rather than guessing which reason applies.
  const handleDownloadData = async () => {
    setExportError(null)
    setExportingData(true)
    try {
      const { data } = await client.query({ query: MY_DATA_EXPORT_QUERY, fetchPolicy: 'network-only' })
      if (!data?.myDataExport) {
        throw new Error("Data export isn't available for your account right now. Your clinic may not have enabled this feature yet.")
      }
      const blob = new Blob([data.myDataExport], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `medibook-my-data-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setExportError(err.message)
    } finally {
      setExportingData(false)
    }
  }

  const handleDeactivate = async () => {
    setDeactivateOpen(false)
    setDeactivating(true)
    try {
      const { data } = await client.mutate({ mutation: DEACTIVATE_MY_ACCOUNT })
      if (!data?.deactivateMyAccount?.success) throw new Error(data?.deactivateMyAccount?.message ?? 'Failed to deactivate account')
      logout(client)
      navigate('/login')
    } catch (err) {
      setProfileError(err.message)
      setDeactivating(false)
    }
  }

  const toggleNotif = (eventType, channel) => {
    setNotifPrefs((prev) => ({
      ...prev,
      [eventType]: { ...prev[eventType], [`${channel}_enabled`]: !prev[eventType]?.[`${channel}_enabled`] },
    }))
  }

  const handleSaveNotifications = async () => {
    setSavingNotifs(true)
    try {
      if (!!quietHoursStart !== !!quietHoursEnd) throw new Error('Quiet hours start and end must both be set, or both left empty')
      const input = NOTIF_ROWS.map((r) => ({
        event_type: r.event_type,
        email_enabled: !!notifPrefs[r.event_type]?.email_enabled,
        sms_enabled: !!notifPrefs[r.event_type]?.sms_enabled,
        app_enabled: !!notifPrefs[r.event_type]?.app_enabled,
        whatsapp_enabled: !!notifPrefs[r.event_type]?.whatsapp_enabled,
        // null (not undefined) when cleared -- live-verified this
        // distinction matters: the backend's partial-update semantics treat
        // an omitted (undefined) field as "leave the stored value alone",
        // so `undefined` here would make the Clear button a silent no-op
        // against any previously-saved quiet hours.
        quiet_hours_start: quietHoursStart || null,
        quiet_hours_end: quietHoursEnd || null,
      }))
      const { data } = await client.mutate({ mutation: UPDATE_MY_NOTIFICATION_PREFERENCES, variables: { input } })
      if (!data?.updateMyNotificationPreferences?.success)
        throw new Error(data?.updateMyNotificationPreferences?.message ?? 'Failed to save preferences')
      handleSave('Notification preferences')
    } catch (err) {
      setProfileError(err.message)
    } finally {
      setSavingNotifs(false)
    }
  }

  return (
    <Box className="page-enter" sx={{ pb: 4 }}>
      <Helmet>
        <title>Settings — MediBook</title>
      </Helmet>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} sx={{ color: 'text.primary', fontSize: { xs: '1.35rem', sm: '1.5rem' } }}>
          Settings
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Manage your account, notifications, and preferences
        </Typography>
      </Box>

      {/* SUG-SET-010: Per-tab contextual saved message */}
      {saved && (
        <Alert severity="success" sx={{ mb: 2.5, borderRadius: 2.5 }} onClose={() => setSaved(null)}>
          {saved}
        </Alert>
      )}

      <Paper sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none', overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            px: 2,
            borderBottom: '1px solid', borderBottomColor: 'divider',
            bgcolor: 'action.hover',
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, minHeight: 52, fontSize: '0.875rem', gap: 0.75 },
            '& .Mui-selected': { color: 'primary.main' },
            '& .MuiTabs-indicator': { bgcolor: 'primary.main', height: 3, borderRadius: 1.5 },
          }}
        >
          <Tab value={0} icon={<EditRoundedIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Profile" />
          <Tab value={1} icon={<LockRoundedIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Account & Security" />
          <Tab value={2} icon={<NotificationsRoundedIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Notifications" />
          <Tab value={3} icon={<PaletteRoundedIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Appearance" />
          {/* BUG044 -- clinic-level settings only make sense for a caller who
              actually manages clinic settings; hidden entirely (not merely
              disabled) for patient/clinician accounts, per SURF-20. */}
          {canManageClinic && (
            <Tab value={4} icon={<BusinessRoundedIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Clinic" />
          )}
          <Tab value={5} icon={<DevicesRoundedIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Integrations" />
          <Tab value={6} icon={<SecurityRoundedIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Privacy" />
        </Tabs>

        <Box sx={{ p: { xs: 2.5, sm: 4 } }}>
          {/* ── Profile ──────────────────────────────────────────────────── */}
          <TabPanel value={tab} index={0}>
            <Grid container spacing={4}>
              {/* Avatar */}
              <Grid item xs={12} md={3} sx={{ textAlign: { xs: 'left', md: 'center' } }}>
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <Avatar
                    src={avatarSrc}
                    sx={{ width: 110, height: 110, bgcolor: (t) => alpha(t.palette.primary.main, 0.12), color: 'primary.main', fontSize: '2.5rem', fontWeight: 800 }}
                  >
                    {(firstName[0] ?? '') + (lastName[0] ?? '')}
                  </Avatar>
                  {/* SUG-SET-001: real upload — POST /account/avatar */}
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      e.target.value = ''
                      if (!file) return
                      if (file.size > 2 * 1024 * 1024) {
                        setProfileError('File must be under 2 MB')
                        return
                      }
                      handleAvatarUpload(file)
                    }}
                  />
                  <IconButton
                    size="small"
                    disabled={uploadingAvatar}
                    onClick={() => fileRef.current?.click()}
                    aria-label="Change profile photo"
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      bgcolor: 'background.paper',
                      border: '2px solid', borderColor: 'divider',
                      '&:hover': { bgcolor: (t) => alpha(t.palette.primary.main, 0.08) },
                    }}
                  >
                    <CameraAltRoundedIcon fontSize="small" sx={{ color: 'primary.main' }} />
                  </IconButton>
                </Box>
                <Typography variant="caption" display="block" sx={{ mt: 1.5, color: 'text.secondary' }}>
                  {uploadingAvatar ? (
                    'Uploading…'
                  ) : (
                    <>
                      Click to change photo
                      <br />
                      JPG, PNG or GIF · Max 2MB
                    </>
                  )}
                </Typography>
              </Grid>
              {/* Form */}
              <Grid item xs={12} md={9}>
                <Grid container spacing={2.5}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      value={user?.email ?? ''}
                      disabled
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                      helperText="Change email in Account tab"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Date of Birth"
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      InputLabelProps={{ shrink: true }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      select
                      label="Gender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    >
                      {['male', 'female', 'other', 'prefer_not_to_say'].map((g) => (
                        <MenuItem key={g} value={g} sx={{ textTransform: 'capitalize' }}>
                          {g.replace(/_/g, ' ')}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Bio / About"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us a little about yourself…"
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Divider sx={{ width: '100%', ml: 2.5, mt: 1.5, mb: 0.5 }} />
                  <Grid item xs={12}>
                    <Typography
                      variant="subtitle2"
                      fontWeight={800}
                      sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem', mb: 1.5 }}
                    >
                      Address
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Address line 1"
                      value={addressLine1}
                      onChange={(e) => setAddressLine1(e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Address line 2 (optional)"
                      value={addressLine2}
                      onChange={(e) => setAddressLine2(e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="City"
                      value={addressCity}
                      onChange={(e) => setAddressCity(e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="State"
                      value={addressState}
                      onChange={(e) => setAddressState(e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="PIN Code"
                      value={addressPincode}
                      onChange={(e) => setAddressPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      inputProps={{ inputMode: 'numeric' }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  {profileError && (
                    <Grid item xs={12}>
                      <Alert severity="error" onClose={() => setProfileError(null)}>
                        {profileError}
                      </Alert>
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      disabled={savingProfile}
                      startIcon={<SaveRoundedIcon />}
                      onClick={handleProfileSave}
                      sx={{
                        borderRadius: 2.5,
                        textTransform: 'none',
                        fontWeight: 700,
                        px: 3,
                        background: (t) => `linear-gradient(135deg, ${t.palette.primary.light} 0%, ${t.palette.primary.main} 100%)`,
                        '&:hover': { background: (t) => `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${t.palette.primary.dark} 100%)` },
                      }}
                    >
                      {savingProfile ? 'Saving…' : 'Save Changes'}
                    </Button>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </TabPanel>

          {/* ── Account & Security ───────────────────────────────────────── */}
          <TabPanel value={tab} index={1}>
            <Stack spacing={3.5}>
              {/* REQ012/PLAN021 Slice 1 — org requires MFA and this account hasn't enrolled yet */}
              {mfaSetupRequired && !totpEnabled && (
                <Alert severity="warning" icon={<SecurityRoundedIcon />}>
                  Your organization requires two-factor authentication for your account. Please set it up below to continue using all
                  features.
                </Alert>
              )}
              {/* Change password */}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LockRoundedIcon sx={{ fontSize: '1.1rem', color: 'primary.main' }} /> Change Password
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Current Password"
                      type="password"
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="New Password"
                      type="password"
                      helperText="Min 8 characters"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Confirm New Password"
                      type="password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  {/* SUG-SET-002: Password validation — error alert + wired onClick */}
                  {pwError && (
                    <Grid item xs={12}>
                      <Alert severity="error" onClose={() => setPwError(null)}>
                        {pwError}
                      </Alert>
                    </Grid>
                  )}
                  <Grid item xs={12}>
                    <Button
                      variant="outlined"
                      disabled={changingPw}
                      onClick={handlePasswordUpdate}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                    >
                      {changingPw ? 'Updating…' : 'Update Password'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
              <Divider />
              {/* 2FA — PLAN016 Slice C: real TOTP enrollment against startTotpEnrollment/confirmTotpEnrollment/disableTotp */}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SecurityRoundedIcon sx={{ fontSize: '1.1rem', color: 'success.main' }} /> Two-Factor Authentication
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  {totpEnabled
                    ? "Two-factor authentication is enabled. You'll be asked for a code from your authenticator app each time you sign in."
                    : 'Add an extra layer of security to your account with an authenticator app (Google Authenticator, Authy, etc).'}
                </Typography>
                {totpEnabled ? (
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setDisableOpen(true)}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                  >
                    Disable 2FA
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="success"
                    disabled={totpBusy}
                    onClick={handleStartEnroll}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                  >
                    {totpBusy ? 'Starting…' : 'Enable 2FA'}
                  </Button>
                )}
              </Box>
              <Divider />
              {/* Active sessions */}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DevicesRoundedIcon sx={{ fontSize: '1.1rem', color: 'secondary.main' }} /> Active Sessions
                </Typography>
                <Stack spacing={1.5}>
                  {/* SUG-SET-003: real mySessions data; Revoke wired to revokeMySession.
                      No "Current"/location badge — nothing backs that data (see
                      the account module's implementation plan). */}
                  {sessions.map((s) => (
                    <Paper
                      key={s.id}
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2.5,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 1,
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <DevicesRoundedIcon sx={{ color: 'text.disabled' }} />
                        <Box>
                          <Typography variant="body2" fontWeight={700}>
                            {s.device ?? 'Unknown device'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {s.created_at ? `Signed in ${new Date(s.created_at).toLocaleString()}` : 'Sign-in time unknown'}
                          </Typography>
                        </Box>
                      </Stack>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={() => handleRevoke(s.id)}
                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                      >
                        Revoke
                      </Button>
                    </Paper>
                  ))}
                  {sessions.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No active sessions.
                    </Typography>
                  )}
                </Stack>
              </Box>
              <Divider />
              {/* REQ053 (US-SEC-05) — Emergency Access (break-glass) */}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <SecurityRoundedIcon sx={{ fontSize: '1.1rem', color: 'error.main' }} /> Emergency Access
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  Emergency access grants temporary elevated permissions for urgent situations. Every request and use is logged.
                </Typography>
                {breakGlassError && (
                  <Alert severity="error" sx={{ mb: 2 }} onClose={() => setBreakGlassError(null)}>
                    {breakGlassError}
                  </Alert>
                )}
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => setBreakGlassDialogOpen(true)}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, mb: 2 }}
                >
                  Request Emergency Access
                </Button>
                <Stack spacing={1.5}>
                  {breakGlassGrants.map((g) => {
                    const isExpired = !g.revoked_at && new Date(g.expires_at) < new Date()
                    const statusLabel = g.revoked_at ? 'Revoked' : g.is_active ? 'Active' : isExpired ? 'Expired' : 'Inactive'
                    const statusColor = g.is_active ? 'success' : g.revoked_at ? 'default' : 'default'
                    return (
                      <Paper
                        key={g.id}
                        variant="outlined"
                        sx={{
                          p: 2,
                          borderRadius: 2.5,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: 1,
                        }}
                      >
                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                            <Chip
                              size="small"
                              label={statusLabel}
                              color={statusColor}
                              sx={{ fontWeight: 700, height: 20, fontSize: '0.68rem' }}
                            />
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              Expires {new Date(g.expires_at).toLocaleString()}
                            </Typography>
                          </Stack>
                          <Typography variant="body2">{g.reason}</Typography>
                        </Box>
                        {g.is_active && (hasRole('manager') || hasRole('admin') || hasRole('super_admin')) && (
                          <Button
                            size="small"
                            color="error"
                            variant="outlined"
                            onClick={() => handleRevokeBreakGlass(g.id)}
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                          >
                            Revoke now
                          </Button>
                        )}
                      </Paper>
                    )
                  })}
                  {breakGlassGrants.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                      No emergency access grants.
                    </Typography>
                  )}
                </Stack>
              </Box>
              {isPatient && (
                <>
                  <Divider />
                  {/* REQ012/PLAN021 Slice 3 — GDPR Article 20 data portability */}
                  <Box>
                    <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <DownloadRoundedIcon sx={{ fontSize: '1.1rem', color: 'primary.main' }} /> Your Data
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                      Download a copy of your personal data — profile, appointments, and test results — as a JSON file.
                    </Typography>
                    {exportError && (
                      <Alert severity="error" sx={{ mb: 2 }} onClose={() => setExportError(null)}>
                        {exportError}
                      </Alert>
                    )}
                    <Button
                      variant="outlined"
                      startIcon={<DownloadRoundedIcon />}
                      disabled={exportingData}
                      onClick={handleDownloadData}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                    >
                      {exportingData ? 'Preparing…' : 'Download My Data'}
                    </Button>
                  </Box>
                </>
              )}
              <Divider />
              {/* Danger zone */}
              <Box sx={{ p: 2.5, border: '1.5px solid', borderColor: (t) => alpha(t.palette.error.main, 0.3), borderRadius: 2.5, bgcolor: (t) => alpha(t.palette.error.main, 0.08) }}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ color: 'error.main', mb: 0.5 }}>
                  Danger Zone
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  Deactivating your account will immediately revoke all access. This action cannot be undone.
                </Typography>
                {/* SUG-SET-004: Confirm dialog before deactivating */}
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteRoundedIcon />}
                  onClick={() => setDeactivateOpen(true)}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                >
                  Deactivate Account
                </Button>
              </Box>
            </Stack>
          </TabPanel>

          {/* ── Notifications ────────────────────────────────────────────── */}
          <TabPanel value={tab} index={2}>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              Choose how you want to be notified for each event type.
            </Typography>
            <Paper variant="outlined" sx={{ borderRadius: 2.5 }}>
              {/* P2.6: this Paper's own overflow:'hidden' was clipping the
                  "In-App" column outright at narrow widths -- CLAUDE.md's
                  documented case where document.scrollWidth>clientWidth does
                  NOT catch the defect. TableContainer now owns the scroll. */}
              <TableContainer sx={{ borderRadius: 2.5 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow
                      sx={{
                        '& th': {
                          fontWeight: 800,
                          fontSize: '0.70rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.10em',
                          bgcolor: 'action.hover',
                          color: 'text.disabled',
                        },
                      }}
                    >
                      <TableCell sx={{ width: '40%' }}>Event</TableCell>
                      <TableCell align="center">Email</TableCell>
                      <TableCell align="center">SMS</TableCell>
                      {/* REQ025 (US-NOT-01 remainder) */}
                      <TableCell align="center">WhatsApp</TableCell>
                      <TableCell align="center">In-App</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {NOTIF_ROWS.map((row) => (
                      <TableRow key={row.event_type} sx={{ '&:last-child td': { border: 0 } }}>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{row.label}</TableCell>
                        {['email', 'sms', 'whatsapp', 'app'].map((ch) => (
                          <TableCell key={ch} align="center">
                            <Switch
                              size="small"
                              checked={!!notifPrefs[row.event_type]?.[`${ch}_enabled`]}
                              onChange={() => toggleNotif(row.event_type, ch)}
                              color="success"
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>

            {/* REQ025 (US-NOT-04) — per-user quiet hours, applied to every
                event type's external (WhatsApp/SMS) send, not per-row —
                a single account-wide window, matching the requirement's
                own "quiet hours are configured" framing rather than a
                separate window per event. */}
            <Paper variant="outlined" sx={{ borderRadius: 2.5, p: 2.5, mt: 3 }}>
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.5 }}>
                Quiet Hours
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                No WhatsApp/SMS notifications will be sent during this window, except for genuinely time-critical events like an imminent
                appointment reminder.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <TextField
                  label="Start"
                  type="time"
                  size="small"
                  value={quietHoursStart}
                  onChange={(e) => setQuietHoursStart(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: { xs: '100%', sm: 160 } }}
                />
                <TextField
                  label="End"
                  type="time"
                  size="small"
                  value={quietHoursEnd}
                  onChange={(e) => setQuietHoursEnd(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: { xs: '100%', sm: 160 } }}
                />
                <Button
                  size="small"
                  variant="text"
                  color="inherit"
                  onClick={() => {
                    setQuietHoursStart('')
                    setQuietHoursEnd('')
                  }}
                  sx={{ textTransform: 'none' }}
                >
                  Clear
                </Button>
              </Stack>
            </Paper>

            <Button
              variant="contained"
              disabled={savingNotifs}
              startIcon={<SaveRoundedIcon />}
              onClick={handleSaveNotifications}
              sx={{
                mt: 3,
                borderRadius: 2.5,
                textTransform: 'none',
                fontWeight: 700,
                background: (t) => `linear-gradient(135deg, ${t.palette.primary.light} 0%, ${t.palette.primary.main} 100%)`,
                '&:hover': { background: (t) => `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${t.palette.primary.dark} 100%)` },
              }}
            >
              {savingNotifs ? 'Saving…' : 'Save Preferences'}
            </Button>
          </TabPanel>

          {/* ── Appearance ───────────────────────────────────────────────── */}
          <TabPanel value={tab} index={3}>
            <Stack spacing={4} sx={{ maxWidth: 560 }}>
              {appearanceError && (
                <Alert severity="error" sx={{ borderRadius: 2 }} onClose={() => setAppearanceError(null)}>
                  {appearanceError}
                </Alert>
              )}
              {/* Theme */}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 0.5 }}>
                  Theme
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                  Applies immediately across the app — no need to hit Save.
                </Typography>
                <FormControl component="fieldset">
                  <RadioGroup row value={themeMode} onChange={(e) => setThemeMode(e.target.value)}>
                    {[
                      ['light', '☀️ Light'],
                      ['dark', '🌙 Dark'],
                      ['system', '💻 System'],
                    ].map(([v, l]) => (
                      <FormControlLabel
                        key={v}
                        value={v}
                        control={<Radio size="small" />}
                        label={
                          <Typography fontWeight={600} variant="body2">
                            {l}
                          </Typography>
                        }
                        sx={{
                          px: 2,
                          py: 1,
                          border: '1.5px solid',
                          borderColor: themeMode === v ? 'primary.main' : 'divider',
                          borderRadius: 2,
                          mr: 1.5,
                        }}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
              </Box>
              {/* Font size */}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 0.5 }}>
                  Font Size
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
                  Adjust the base text size across the application — applies immediately, no need to hit Save.
                </Typography>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, color: 'text.secondary', minWidth: 50, textAlign: 'center', fontSize: `${12 * fontScale}px` }}
                  >
                    Aa
                  </Typography>
                  <Slider
                    value={FONT_SCALE_PRESETS.indexOf(fontScale) === -1 ? 1 : FONT_SCALE_PRESETS.indexOf(fontScale)}
                    min={0}
                    max={3}
                    step={1}
                    marks={[
                      { value: 0, label: 'SM' },
                      { value: 1, label: 'MD' },
                      { value: 2, label: 'LG' },
                      { value: 3, label: 'XL' },
                    ]}
                    onChange={(_, v) => setFontScale(FONT_SCALE_PRESETS[v])}
                    sx={{ flex: 1 }}
                  />
                </Stack>
              </Box>
              {/* Accent color -- an organization brand identity, not a personal
                  preference; read-only here, set via Settings > Clinic Settings >
                  Branding (manager+). See ThemeContext.jsx's accentColor. */}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 0.5 }}>
                  Accent Color
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
                  Set by your organization's Branding settings, applies to everyone in your clinic.
                </Typography>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      bgcolor: accentColor || 'primary.main',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  />
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                    {accentColor || 'Default'}
                  </Typography>
                  {canManageClinic && (
                    <Button size="small" onClick={() => setTab(4)} sx={{ textTransform: 'none' }}>
                      Change in Branding →
                    </Button>
                  )}
                </Stack>
              </Box>
              {/* Toggles */}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
                  Additional Options
                </Typography>
                <Stack spacing={1}>
                  <FormControlLabel
                    control={<Switch checked={compact} onChange={() => setCompact(!compact)} color="primary" />}
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          Compact Mode
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          Reduces padding and spacing
                        </Typography>
                      </Box>
                    }
                  />
                  <FormControlLabel
                    control={<Switch checked={rtl} onChange={() => setRtl(!rtl)} color="primary" />}
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          RTL Layout
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          For Arabic, Hebrew, and other RTL languages
                        </Typography>
                      </Box>
                    }
                  />
                </Stack>
              </Box>
              <Button
                variant="contained"
                startIcon={<SaveRoundedIcon />}
                onClick={handleSaveAppearance}
                sx={{
                  borderRadius: 2.5,
                  textTransform: 'none',
                  fontWeight: 700,
                  alignSelf: 'flex-start',
                  background: (t) => `linear-gradient(135deg, ${t.palette.primary.light} 0%, ${t.palette.primary.main} 100%)`,
                  '&:hover': { background: (t) => `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${t.palette.primary.dark} 100%)` },
                }}
              >
                Save Appearance
              </Button>
            </Stack>
          </TabPanel>

          {/* ── Clinic Settings ────────────────────────────────────────────── */}
          <TabPanel value={tab} index={4}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>
                  Clinic Information
                </Typography>
              </Grid>
              {/* BUG044 -- not shown at all (not disabled) to a caller who
                  isn't manager/admin/super_admin, matching SURF-20. */}
              {!canManageClinic && (
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    Clinic information is managed by your organisation's admins and managers.
                  </Alert>
                </Grid>
              )}
              {canManageClinic && clinicError && (
                <Grid item xs={12}>
                  <Alert severity="error" sx={{ borderRadius: 2 }} onClose={() => setClinicError(null)}>
                    {clinicError}
                  </Alert>
                </Grid>
              )}
              {canManageClinic && clinicLoaded && !hasClinicToManage && (
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    {hasOrgForBranding
                      ? "No clinic found for your organisation yet — add one from Clinics first."
                      : "Your account isn't associated with an organisation, so there's no clinic to manage here."}
                  </Alert>
                </Grid>
              )}
              {canManageClinic && hasClinicToManage && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Clinic Name"
                      value={clinicForm.name}
                      onChange={setClinicField('name')}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Contact Phone"
                      value={clinicForm.phone}
                      onChange={setClinicField('phone')}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Contact Email"
                      value={clinicForm.email}
                      onChange={setClinicField('email')}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      select
                      label="Timezone"
                      value={clinicForm.timezone}
                      onChange={setClinicField('timezone')}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    >
                      {[
                        'Asia/Kolkata',
                        'Asia/Dubai',
                        'Asia/Karachi',
                        'Europe/London',
                        'Europe/Paris',
                        'Europe/Berlin',
                        'America/New_York',
                        'America/Los_Angeles',
                        'Australia/Sydney',
                      ].map((tz) => (
                        <MenuItem key={tz} value={tz}>
                          {tz}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Address"
                      value={clinicForm.address}
                      onChange={setClinicField('address')}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="City"
                      value={clinicForm.city}
                      onChange={setClinicField('city')}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="PIN Code"
                      value={clinicForm.postcode}
                      onChange={setClinicField('postcode')}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  {/* REQ170 -- prescription-letterhead footer fields. All
                      optional; a clinic that never sets these renders the
                      printout exactly as before this feature. */}
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Website"
                      placeholder="https://yourclinic.com"
                      value={clinicForm.website}
                      onChange={setClinicField('website')}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Alternate Phone (for prescriptions)"
                      value={clinicForm.alternate_phone}
                      onChange={setClinicField('alternate_phone')}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Appointment Note"
                      placeholder="e.g. Sunday by appointment"
                      value={clinicForm.appointment_note}
                      onChange={setClinicField('appointment_note')}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      select
                      label="Letterhead Doctors"
                      helperText="Always shown on this clinic's printed prescriptions, regardless of who issues a given one. Leave empty to show only the issuing clinician (default)."
                      value={clinicForm.letterhead_clinician_ids}
                      onChange={(e) => {
                        const { value } = e.target
                        setClinicForm((prev) => ({ ...prev, letterhead_clinician_ids: typeof value === 'string' ? value.split(',') : value }))
                      }}
                      SelectProps={{
                        multiple: true,
                        renderValue: (selected) =>
                          letterheadClinicians
                            .filter((c) => selected.includes(c.id))
                            .map((c) => c.full_name)
                            .join(', '),
                      }}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    >
                      {letterheadClinicians.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.full_name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      disabled={savingClinic}
                      startIcon={<SaveRoundedIcon />}
                      onClick={handleSaveClinic}
                      sx={{
                        borderRadius: 2.5,
                        textTransform: 'none',
                        fontWeight: 700,
                        background: (t) => `linear-gradient(135deg, ${t.palette.primary.light} 0%, ${t.palette.primary.main} 100%)`,
                        '&:hover': { background: (t) => `linear-gradient(135deg, ${t.palette.primary.main} 0%, ${t.palette.primary.dark} 100%)` },
                      }}
                    >
                      {savingClinic ? 'Saving…' : 'Save Clinic Settings'}
                    </Button>
                  </Grid>
                </>
              )}

              {/* ── Organization Branding (REQ002/PLAN022, real backend) ── */}
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight={800}>
                  Branding
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Your logo and colors appear in the app sidebar and header for everyone signed into your organization.
                </Typography>
              </Grid>
              {brandingError && (
                <Grid item xs={12}>
                  <Alert severity="error" sx={{ borderRadius: 2 }} onClose={() => setBrandingError(null)}>
                    {brandingError}
                  </Alert>
                </Grid>
              )}
              {brandingLoaded && !hasOrgForBranding && (
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    Your account isn't associated with an organization, so branding can't be edited here.
                  </Alert>
                </Grid>
              )}
              {/* REQ170 -- the letterhead subtitle shown under the clinic/
                  org name on the printed prescription (e.g. "ORTHO &
                  GYNAE CARE"). */}
              <Grid item xs={12} sx={{ opacity: hasOrgForBranding ? 1 : 0.5, pointerEvents: hasOrgForBranding ? 'auto' : 'none' }}>
                <TextField
                  fullWidth
                  label="Tagline"
                  placeholder="e.g. ORTHO & GYNAE CARE"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  helperText="Shown under your clinic name on the printed prescription letterhead"
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6} sx={{ opacity: hasOrgForBranding ? 1 : 0.5, pointerEvents: hasOrgForBranding ? 'auto' : 'none' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar variant="rounded" src={logoSrc} sx={{ width: 64, height: 64, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider' }}>
                    <BusinessRoundedIcon sx={{ color: 'primary.main' }} />
                  </Avatar>
                  <Box>
                    <input ref={logoInputRef} type="file" accept="image/png,image/jpeg" hidden onChange={handleLogoSelect} />
                    <Button
                      size="small"
                      variant="outlined"
                      disabled={uploadingLogo}
                      onClick={() => logoInputRef.current?.click()}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                    >
                      {uploadingLogo ? 'Uploading…' : 'Upload logo'}
                    </Button>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>
                      PNG or JPEG, square, at least 256×256px, max 2MB
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
              <Grid item xs={12} sm={3} sx={{ opacity: hasOrgForBranding ? 1 : 0.5, pointerEvents: hasOrgForBranding ? 'auto' : 'none' }}>
                <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 0.5 }}>
                  Primary color
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    style={{ width: 36, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                  />
                  <TextField
                    size="small"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    sx={{ width: 100, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Stack>
              </Grid>
              <Grid item xs={12} sm={3} sx={{ opacity: hasOrgForBranding ? 1 : 0.5, pointerEvents: hasOrgForBranding ? 'auto' : 'none' }}>
                <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 0.5 }}>
                  Secondary color
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    style={{ width: 36, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer' }}
                  />
                  <TextField
                    size="small"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    sx={{ width: 100, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                </Stack>
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  disabled={savingBranding || !hasOrgForBranding}
                  startIcon={<SaveRoundedIcon />}
                  onClick={handleSaveBranding}
                  sx={{
                    borderRadius: 2.5,
                    textTransform: 'none',
                    fontWeight: 700,
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  }}
                >
                  {savingBranding ? 'Saving…' : 'Save Branding'}
                </Button>
              </Grid>
            </Grid>
          </TabPanel>

          {/* ── Integrations (REQ018/REQ030/REQ015) ─────────────────────────── */}
          <TabPanel value={tab} index={5}>
            {integrationsError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setIntegrationsError(null)}>
                {integrationsError}
              </Alert>
            )}
            {revealedSecret && (
              <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setRevealedSecret(null)}>
                <Typography variant="body2" fontWeight={700}>
                  {revealedSecret.kind} — copy this now, it won't be shown again:
                </Typography>
                <Typography
                  component="code"
                  variant="body2"
                  sx={{ display: 'block', mt: 0.5, wordBreak: 'break-all', fontFamily: 'monospace' }}
                >
                  {revealedSecret.value}
                </Typography>
              </Alert>
            )}

            <Stack spacing={4} sx={{ maxWidth: 720 }}>
              {/* Booking Widget */}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 0.5 }}>
                  Booking Widget
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
                  Register the external websites allowed to embed your booking page in an iframe.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Allowed origin(s), comma-separated"
                    placeholder="https://yourclinic.com"
                    value={widgetOrigin}
                    onChange={(e) => setWidgetOrigin(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  <Button
                    variant="contained"
                    disabled={integrationsSubmitting}
                    onClick={submitWidget}
                    sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
                  >
                    Register
                  </Button>
                </Stack>
                <TableContainer sx={{ border: '1px solid #E8EAED', borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Origins</TableCell>
                        <TableCell>Embed slug</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {widgetConfigs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                              No widget configs yet
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                      {widgetConfigs.map((w) => (
                        <TableRow key={w.id}>
                          <TableCell>
                            <Typography variant="body2">{(w.allowed_origins ?? []).join(', ')}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontFamily="monospace">
                              {w.short_link_slug}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {w.is_active ? <Chip size="small" label="Active" color="success" /> : <Chip size="small" label="Inactive" />}
                          </TableCell>
                          <TableCell>
                            {w.is_active && (
                              <Stack direction="row" spacing={1}>
                                <Button size="small" startIcon={<CodeRoundedIcon fontSize="small" />} onClick={() => openEmbedCode(w)}>
                                  Embed Code
                                </Button>
                                <Button size="small" onClick={() => openEditWidget(w)}>
                                  Edit
                                </Button>
                                <Button size="small" color="error" onClick={() => deactivateWidget(w.id)}>
                                  Deactivate
                                </Button>
                              </Stack>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              <Divider />

              {/* Webhooks */}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 0.5 }}>
                  Webhooks
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
                  Receive a signed HTTP POST when appointment or payment events happen — subscribed to "appointment.created" by default.
                </Typography>
                <Stack spacing={1.5} mb={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Endpoint URL"
                    placeholder="https://yourapp.com/webhooks/medibook"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  <Box>
                    <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                      Subscribed events
                    </Typography>
                    <Stack direction="row" flexWrap="wrap" gap={1}>
                      {['appointment.created', 'appointment.confirmed', 'appointment.cancelled', 'payment.succeeded'].map((evt) => (
                        <Chip
                          key={evt}
                          size="small"
                          label={evt}
                          clickable
                          color={webhookEvents.includes(evt) ? 'primary' : 'default'}
                          onClick={() => setWebhookEvents((prev) => (prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt]))}
                        />
                      ))}
                    </Stack>
                  </Box>
                  <Button
                    variant="contained"
                    disabled={integrationsSubmitting}
                    onClick={submitWebhook}
                    sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, alignSelf: 'flex-start' }}
                  >
                    Add Endpoint
                  </Button>
                </Stack>
                <TableContainer sx={{ border: '1px solid #E8EAED', borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>URL</TableCell>
                        <TableCell>Events</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {webhookEndpoints.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4}>
                            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                              No webhook endpoints yet
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                      {webhookEndpoints.map((w) => (
                        <TableRow key={w.id}>
                          <TableCell>
                            <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                              {w.url}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {(w.event_types ?? []).map((e) => (
                              <Chip key={e} size="small" label={e} sx={{ mr: 0.5, mb: 0.5 }} />
                            ))}
                          </TableCell>
                          <TableCell>
                            {w.is_active ? <Chip size="small" label="Active" color="success" /> : <Chip size="small" label="Inactive" />}
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1}>
                              <Button size="small" onClick={() => viewDeliveryLog(w)}>
                                Delivery Log
                              </Button>
                              {w.is_active && (
                                <Button size="small" color="error" onClick={() => deactivateWebhook(w.id)}>
                                  Deactivate
                                </Button>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>

              <Divider />

              {/* API Keys */}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 0.5 }}>
                  API Keys
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
                  Issue a key for a partner integration. The raw key is shown once, at creation — store it securely.
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} mb={2}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Key name"
                    placeholder="Zapier integration"
                    value={apiKeyName}
                    onChange={(e) => setApiKeyName(e.target.value)}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  <Button
                    variant="contained"
                    disabled={integrationsSubmitting}
                    onClick={submitApiKey}
                    sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
                  >
                    Create Key
                  </Button>
                </Stack>
                <TableContainer sx={{ border: '1px solid #E8EAED', borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Prefix</TableCell>
                        <TableCell>Last used</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {apiKeys.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5}>
                            <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                              No API keys yet
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                      {apiKeys.map((k) => (
                        <TableRow key={k.id}>
                          <TableCell>{k.name}</TableCell>
                          <TableCell>
                            <Typography variant="body2" fontFamily="monospace">
                              {k.key_prefix}
                            </Typography>
                          </TableCell>
                          <TableCell>{k.last_used_at ? new Date(k.last_used_at).toLocaleDateString('en-IN') : 'Never'}</TableCell>
                          <TableCell>
                            {k.is_active ? <Chip size="small" label="Active" color="success" /> : <Chip size="small" label="Revoked" />}
                          </TableCell>
                          <TableCell>
                            {k.is_active && (
                              <Button size="small" color="error" onClick={() => revokeApiKey(k.id)}>
                                Revoke
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            </Stack>
          </TabPanel>

          {/* ── Privacy (REQ034) ─────────────────────────────────────────────── */}
          <TabPanel value={tab} index={6}>
            {!privacyLoaded ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={28} />
              </Box>
            ) : !patientId ? (
              <Alert severity="info">
                Privacy and consent settings apply to a linked patient profile — your account isn't linked to one.
              </Alert>
            ) : (
              <Stack spacing={4} sx={{ maxWidth: 560 }}>
                {privacyError && (
                  <Alert severity="error" onClose={() => setPrivacyError(null)}>
                    {privacyError}
                  </Alert>
                )}
                {rightsRequestMsg && <Alert severity="success">{rightsRequestMsg}</Alert>}

                <Box>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>
                    Consent
                  </Typography>
                  <Stack spacing={1}>
                    {[
                      ['treatment', 'Treatment', 'Sharing your records among your care team for treatment purposes'],
                      ['communications', 'Communications', 'Appointment reminders and clinical updates'],
                      ['marketing', 'Marketing', 'Promotional offers and newsletters'],
                      ['record_sharing', 'Record Sharing', 'Sharing your records with other providers on request'],
                    ].map(([purpose, label, desc]) => (
                      <FormControlLabel
                        key={purpose}
                        control={
                          <Switch
                            checked={isConsentGranted(purpose)}
                            onChange={(e) => toggleConsent(purpose, e.target.checked)}
                            color="primary"
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight={700}>
                              {label}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {desc}
                            </Typography>
                          </Box>
                        }
                      />
                    ))}
                  </Stack>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 0.5 }}>
                    Your Data Rights
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>
                    Request a copy of your data, a correction, or erasure. Requests are reviewed by our team within 30 days — clinical
                    records under statutory retention may not be immediately erasable.
                  </Typography>
                  <Stack direction="row" spacing={1.5} flexWrap="wrap">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => requestRights('access')}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                    >
                      Request my data
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => requestRights('correction')}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                    >
                      Request a correction
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      onClick={() => requestRights('erasure')}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                    >
                      Request erasure
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            )}
          </TabPanel>
        </Box>
      </Paper>
      {/* A-9 — edit an existing booking widget's allowed origins without deactivate-and-recreate */}
      <Dialog open={Boolean(editingWidget)} onClose={() => setEditingWidget(null)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Edit Booking Widget</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Embed slug <code>{editingWidget?.short_link_slug}</code> stays the same — only the allowed origins change.
          </Typography>
          <TextField
            fullWidth
            label="Allowed origin(s), comma-separated"
            placeholder="https://yourclinic.com"
            value={editWidgetOrigins}
            onChange={(e) => setEditWidgetOrigins(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingWidget(null)}>Cancel</Button>
          <Button variant="contained" disabled={integrationsSubmitting} onClick={submitEditWidget}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
      {/* REQ105 — embed snippet for a chosen clinician at this widget's config */}
      <Dialog open={Boolean(embedWidget)} onClose={() => setEmbedWidget(null)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Embed Code</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Pick which clinician this embed should book for, then copy the snippet into your site.
          </Typography>
          <TextField
            select
            fullWidth
            label="Clinician"
            value={embedClinicianId}
            onChange={(e) => setEmbedClinicianId(e.target.value)}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          >
            {embedClinicians.length === 0 && (
              <MenuItem value="" disabled>
                No clinicians found
              </MenuItem>
            )}
            {embedClinicians.map((c) => (
              <MenuItem key={c.id} value={c.id}>
                {c.first_name} {c.last_name}
              </MenuItem>
            ))}
          </TextField>
          {embedSnippet && (
            <>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Embed snippet"
                value={embedSnippet}
                InputProps={{ readOnly: true, sx: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
                sx={{ mb: 1 }}
              />
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Button size="small" startIcon={<ContentCopyRoundedIcon fontSize="small" />} onClick={copyEmbedSnippet}>
                  {embedCopied ? 'Copied!' : 'Copy'}
                </Button>
                <Button
                  size="small"
                  component="a"
                  href={`/appointments/book?doctor=${embedClinicianId}&widget=${embedWidget?.short_link_slug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Preview
                </Button>
              </Stack>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmbedWidget(null)}>Close</Button>
        </DialogActions>
      </Dialog>
      {/* A-8 — webhook delivery log */}
      <Dialog open={Boolean(deliveryLogFor)} onClose={() => setDeliveryLogFor(null)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Delivery Log</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2, wordBreak: 'break-all' }}>
            {deliveryLogFor?.url}
          </Typography>
          {deliveryLogLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : deliveryLog.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No deliveries recorded yet.
            </Typography>
          ) : (
            <TableContainer sx={{ border: '1px solid #E8EAED', borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Event</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>HTTP</TableCell>
                    <TableCell>When</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deliveryLog.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.event_type}</TableCell>
                      {/* REQ112: real values are succeeded/failed/exhausted, never
                          'success' — the previous check here never matched anything,
                          so every delivery (including real successes) rendered red. */}
                      <TableCell>
                        <Chip size="small" label={entry.status} color={entry.status === 'succeeded' ? 'success' : 'error'} />
                      </TableCell>
                      <TableCell>{entry.http_status ?? '—'}</TableCell>
                      <TableCell>{new Date(entry.attempted_at).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeliveryLogFor(null)}>Close</Button>
        </DialogActions>
      </Dialog>
      {/* SUG-SET-004: Deactivate Account confirmation dialog */}
      {/* REQ053 (US-SEC-05) — Emergency Access request: self-service, immediately granted */}
      <Dialog
        open={breakGlassDialogOpen}
        onClose={() => {
          setBreakGlassDialogOpen(false)
          setBreakGlassError(null)
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle fontWeight={700} sx={{ color: 'error.main' }}>
          Request Emergency Access
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Describe the urgent situation requiring elevated access. This is granted immediately and logged.
          </Typography>
          {breakGlassError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setBreakGlassError(null)}>
              {breakGlassError}
            </Alert>
          )}
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Reason"
            value={breakGlassReason}
            onChange={(e) => setBreakGlassReason(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setBreakGlassDialogOpen(false)
              setBreakGlassError(null)
            }}
            disabled={requestingBreakGlass}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={requestingBreakGlass || !breakGlassReason.trim()}
            onClick={handleRequestBreakGlass}
          >
            {requestingBreakGlass ? 'Requesting…' : 'Request Access'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deactivateOpen} onClose={() => setDeactivateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700} sx={{ color: 'error.main' }}>
          Deactivate Account?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Deactivating your account will immediately revoke all access and cannot be undone. Are you sure you want to continue?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeactivateOpen(false)} disabled={deactivating}>
            Cancel
          </Button>
          <Button variant="contained" color="error" startIcon={<DeleteRoundedIcon />} disabled={deactivating} onClick={handleDeactivate}>
            {deactivating ? 'Deactivating…' : 'Deactivate'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* PLAN016 Slice C — 2FA enrollment: QR scan → confirm code → show backup codes once */}
      <Dialog open={enrollOpen} onClose={totpBusy ? undefined : closeEnrollDialog} maxWidth="xs" fullWidth>
        {enrollStep === 'qr' ? (
          <>
            <DialogTitle fontWeight={700}>Set up two-factor authentication</DialogTitle>
            <DialogContent>
              <Stack spacing={2} alignItems="center">
                <Typography variant="body2" sx={{ color: 'text.secondary', alignSelf: 'flex-start' }}>
                  Scan this QR code with your authenticator app, then enter the 6-digit code it shows.
                </Typography>
                {qrDataUrl && (
                  <Box
                    component="img"
                    src={qrDataUrl}
                    alt="2FA QR code"
                    sx={{ width: 200, height: 200, border: '1px solid #E8EAED', borderRadius: 2 }}
                  />
                )}
                <Typography variant="caption" sx={{ color: 'text.secondary', wordBreak: 'break-all', textAlign: 'center' }}>
                  Can't scan? Enter this code manually: <strong>{totpSecret}</strong>
                </Typography>
                {totpError && (
                  <Alert severity="error" sx={{ width: '100%' }} onClose={() => setTotpError(null)}>
                    {totpError}
                  </Alert>
                )}
                <TextField
                  fullWidth
                  label="6-digit code"
                  value={confirmCode}
                  onChange={(e) => setConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputProps={{ inputMode: 'numeric', 'aria-label': '6-digit authenticator code' }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={closeEnrollDialog} disabled={totpBusy}>
                Cancel
              </Button>
              <Button variant="contained" disabled={totpBusy || confirmCode.length !== 6} onClick={handleConfirmEnroll}>
                {totpBusy ? 'Verifying…' : 'Verify & Enable'}
              </Button>
            </DialogActions>
          </>
        ) : (
          <>
            <DialogTitle fontWeight={700} sx={{ color: 'success.main' }}>
              2FA is now enabled
            </DialogTitle>
            <DialogContent>
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                Save these backup codes somewhere safe. Each one can be used once to sign in if you lose access to your authenticator app —
                they won't be shown again.
              </Alert>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: 'action.hover' }}>
                <Grid container spacing={1}>
                  {backupCodes.map((c) => (
                    <Grid item xs={6} key={c}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {c}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button variant="contained" onClick={closeEnrollDialog}>
                Done
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* PLAN016 Slice C — disable 2FA requires current password re-entry */}
      <Dialog
        open={disableOpen}
        onClose={() => {
          setDisableOpen(false)
          setDisablePassword('')
          setTotpError(null)
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle fontWeight={700} sx={{ color: 'error.main' }}>
          Disable two-factor authentication?
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Confirm your password to disable 2FA on this account.
            </Typography>
            {totpError && (
              <Alert severity="error" onClose={() => setTotpError(null)}>
                {totpError}
              </Alert>
            )}
            <TextField
              fullWidth
              type="password"
              label="Current Password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setDisableOpen(false)
              setDisablePassword('')
              setTotpError(null)
            }}
            disabled={totpBusy}
          >
            Cancel
          </Button>
          <Button variant="contained" color="error" disabled={totpBusy || !disablePassword} onClick={handleDisableTotp}>
            {totpBusy ? 'Disabling…' : 'Disable 2FA'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
