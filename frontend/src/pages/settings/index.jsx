import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useApolloClient, gql } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import {
  Box, Button, Typography, Tabs, Tab, Grid, Card, CardContent, Stack, Divider,
  TextField, Avatar, Switch, FormControlLabel, Paper, IconButton,
  Slider, Radio, RadioGroup, FormControl, FormLabel, MenuItem, Alert,
  Tooltip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material'
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
import { useAuth } from '../../context/AuthContext'

function TabPanel({ value, index, children }) {
  return value === index ? <Box>{children}</Box> : null
}

const ACCENT_COLORS = ['#1A73E8', '#0F9D58', '#9334E6', '#D93025', '#F9AB00', '#0891B2', '#5F6368']

// ─── Notification rows — event_type must match backend/src/notification-preferences
// (NOTIFICATION_EVENT_TYPES / DEFAULTS) exactly; label is display-only ─────────
const NOTIF_ROWS = [
  { event_type: 'new_appointment',        label: 'New appointment booked'    },
  { event_type: 'appointment_reminder',   label: 'Appointment reminder (24h)' },
  { event_type: 'appointment_cancelled',  label: 'Appointment cancelled'      },
  { event_type: 'new_message',            label: 'New message received'       },
  { event_type: 'new_review',             label: 'New review posted'          },
  { event_type: 'payment_received',       label: 'Payment received'           },
  { event_type: 'system_announcement',    label: 'System announcements'       },
]

// ─── REQ005 — Profile / Account & Security / Notifications GraphQL ─────────────
const MY_PROFILE_QUERY = gql`
  query MyProfile {
    myProfile {
      id first_name last_name email phone bio date_of_birth gender avatar_url totp_enabled
      address { line1 line2 city state pincode country }
    }
  }
`
const UPDATE_MY_PROFILE = gql`
  mutation UpdateMyProfile($input: UpdateMyProfileInput!) {
    updateMyProfile(input: $input) {
      success
      userErrors { message }
      profile { first_name last_name phone bio date_of_birth gender avatar_url }
    }
  }
`
// PLAN016 Slice C — 2FA (TOTP)
const START_TOTP_ENROLLMENT = gql`
  mutation StartTotpEnrollment { startTotpEnrollment { qr_data_url secret } }
`
const CONFIRM_TOTP_ENROLLMENT = gql`
  mutation ConfirmTotpEnrollment($input: ConfirmTotpEnrollmentInput!) {
    confirmTotpEnrollment(input: $input) { success message backup_codes }
  }
`
const DISABLE_TOTP = gql`
  mutation DisableTotp($input: DisableTotpInput!) { disableTotp(input: $input) { success message } }
`
const CHANGE_MY_PASSWORD = gql`
  mutation ChangeMyPassword($input: ChangeMyPasswordInput!) {
    changeMyPassword(input: $input) { success message }
  }
`
const MY_SESSIONS_QUERY = gql`
  query MySessions { mySessions { id device created_at } }
`
const REVOKE_MY_SESSION = gql`
  mutation RevokeMySession($id: String!) { revokeMySession(id: $id) { success message } }
`
const DEACTIVATE_MY_ACCOUNT = gql`
  mutation DeactivateMyAccount { deactivateMyAccount { success message } }
`
const MY_NOTIFICATION_PREFERENCES_QUERY = gql`
  query MyNotificationPreferences { myNotificationPreferences { event_type email_enabled sms_enabled app_enabled whatsapp_enabled quiet_hours_start quiet_hours_end } }
`
// REQ012/PLAN021 Slice 3 — GDPR Article 20 data portability. Nullable: null
// means either the org hasn't enabled export or this account isn't linked
// to a Patients row yet (both handled with a message, see handleDownloadData).
const MY_DATA_EXPORT_QUERY = gql`
  query MyDataExport { myDataExport }
`
const UPDATE_MY_NOTIFICATION_PREFERENCES = gql`
  mutation UpdateMyNotificationPreferences($input: [NotificationPreferenceInput!]!) {
    updateMyNotificationPreferences(input: $input) { success message }
  }
`
// REQ002/PLAN022 — Clinic tab -> Branding. myOrgBranding has no role gate
// (any authenticated user) and returns null for an org-less caller, so this
// page never needs to pre-guess who has an organisation client-side.
const GET_ORG_BRANDING = gql`
  query MyOrgBranding { myOrgBranding { name logo_url primary_color secondary_color } }
`
const UPDATE_ORG_BRANDING = gql`
  mutation UpdateMyOrgBranding($input: UpdateOrgBrandingInput!) {
    updateMyOrgBranding(input: $input) { success userErrors { message } branding { logo_url primary_color secondary_color } }
  }
`

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth()
  const client = useApolloClient()
  const navigate = useNavigate()
  const location = useLocation()
  // REQ012/PLAN021 Slice 1 — login.jsx redirects here with this state when
  // the org requires MFA and this account hasn't enrolled yet.
  const mfaSetupRequired = !!location.state?.mfaSetupRequired
  const fileRef = useRef(null) // SUG-SET-001: camera icon file upload
  const [tab, setTab] = useState(location.state?.tab ?? 0)
  const [saved, setSaved]     = useState(null) // SUG-SET-010: null|string

  // Profile state — seeded from the real myProfile query (loadAccountTabs
  // below), not a naive user?.name split or a hardcoded placeholder.
  const [firstName, setFirstName]   = useState('')
  const [lastName, setLastName]     = useState('')
  const [phone, setPhone]           = useState('')
  const [bio, setBio]               = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [gender, setGender]         = useState('prefer_not_to_say')
  const [avatarUrl, setAvatarUrl]   = useState(null)
  const [addressLine1, setAddressLine1] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [addressCity, setAddressCity]   = useState('')
  const [addressState, setAddressState] = useState('')
  const [addressPincode, setAddressPincode] = useState('')
  const [profileError, setProfileError] = useState(null)
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // Password state (SUG-SET-002)
  const [currentPw, setCurrentPw]   = useState('')
  const [newPw, setNewPw]           = useState('')
  const [confirmPw, setConfirmPw]   = useState('')
  const [pwError, setPwError]       = useState(null)
  const [changingPw, setChangingPw] = useState(false)

  // Sessions state (SUG-SET-003) — real mySessions data. No `location`/
  // `current` fields: nothing backs them (no geo-IP infra, and the frontend
  // doesn't retain its own refresh_token to identify "this" session), so
  // they're dropped from the UI entirely rather than shown as fake data.
  const [sessions, setSessions] = useState([])

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
      const prefsByType = Object.fromEntries(
        (notifData?.myNotificationPreferences ?? []).map((p) => [p.event_type, p]),
      )
      setNotifPrefs(prefsByType)
      // REQ025 — quiet hours are saved identically on every row; any one
      // row's value represents the account-wide setting.
      const anyRow = (notifData?.myNotificationPreferences ?? [])[0]
      setQuietHoursStart(anyRow?.quiet_hours_start ?? '')
      setQuietHoursEnd(anyRow?.quiet_hours_end ?? '')
    } catch (err) { setProfileError(err.message) }
  }
  useEffect(() => { loadAccountTabs() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Organization branding — REQ002/PLAN022, real backend
  // (org-settings.service.ts's myBranding/updateMyBranding). Real source of
  // truth for "does this account have an org to brand" is the query result
  // itself (null for an org-less caller), not a client-side guess off
  // user.organisation — that field isn't even populated by the real `me`
  // query today, only by MOCK_USERS.
  const [logoUrl, setLogoUrl]                   = useState(null)
  const [primaryColor, setPrimaryColor]         = useState('#006D77')
  const [secondaryColor, setSecondaryColor]     = useState('#007680')
  const [hasOrgForBranding, setHasOrgForBranding] = useState(false)
  const [brandingLoaded, setBrandingLoaded]     = useState(false)
  const [brandingError, setBrandingError]       = useState(null)
  const [savingBranding, setSavingBranding]     = useState(false)
  const [uploadingLogo, setUploadingLogo]       = useState(false)
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
      }
    } catch (err) { setBrandingError(err.message) }
    finally { setBrandingLoaded(true) }
  }
  useEffect(() => { loadBranding() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Same REST-multipart pattern as the avatar upload above — PNG/JPEG only
  // (magic-byte validated server-side; SVG deliberately excluded, see
  // org-branding.controller.ts).
  const handleLogoSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setBrandingError(null); setUploadingLogo(true)
    try {
      const token = localStorage.getItem('medibook_token') || sessionStorage.getItem('medibook_token')
      const apiBase = (import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql').replace(/\/graphql$/, '')
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${apiBase}/org-branding/logo`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.message || 'Failed to upload logo')
      setLogoUrl(body.url)
    } catch (err) { setBrandingError(err.message) }
    finally { setUploadingLogo(false) }
  }

  const handleSaveBranding = async () => {
    setBrandingError(null); setSavingBranding(true)
    try {
      const { data } = await client.mutate({
        mutation: UPDATE_ORG_BRANDING,
        variables: { input: { logo_url: logoUrl, primary_color: primaryColor, secondary_color: secondaryColor } },
      })
      if (!data?.updateMyOrgBranding?.success) {
        throw new Error(data?.updateMyOrgBranding?.userErrors?.[0]?.message ?? 'Failed to save branding')
      }
      handleSave('Branding')
    } catch (err) { setBrandingError(err?.graphQLErrors?.[0]?.message || err.message) }
    finally { setSavingBranding(false) }
  }

  // Appearance state
  const [fontSize, setFontSize]   = useState(2)  // 0=sm, 1=md, 2=lg, 3=xl
  const [accent, setAccent]       = useState('#1565C7')
  const [themeMode, setThemeMode] = useState('light')
  const [compact, setCompact]     = useState(false)
  const [rtl, setRtl]             = useState(false)
  const [language, setLanguage]   = useState('en')

  // SUG-SET-010: Per-tab contextual success messages
  const handleSave = (context = 'Changes') => {
    setSaved(`${context} saved successfully!`)
    setTimeout(() => setSaved(null), 2500)
  }

  const handleProfileSave = async () => {
    setProfileError(null); setSavingProfile(true)
    try {
      // MyAddressInput requires line1/city/state/pincode together — only send
      // an address at all once every required part has actually been filled in,
      // rather than submitting a half-filled object the backend would reject.
      const address = (addressLine1 && addressCity && addressState && addressPincode)
        ? { line1: addressLine1, line2: addressLine2 || null, city: addressCity, state: addressState, pincode: addressPincode, country: 'India' }
        : null
      const { data } = await client.mutate({
        mutation: UPDATE_MY_PROFILE,
        variables: { input: {
          first_name: firstName, last_name: lastName, phone: phone || null,
          bio: bio || null, date_of_birth: dateOfBirth || null, gender, address,
        } },
      })
      if (!data?.updateMyProfile?.success) throw new Error(data?.updateMyProfile?.userErrors?.[0]?.message ?? 'Failed to save profile')
      updateUser({ name: `${firstName} ${lastName}`.trim() })
      handleSave('Profile changes')
    } catch (err) { setProfileError(err?.graphQLErrors?.[0]?.message || err.message) }
    finally { setSavingProfile(false) }
  }

  // REQ005/PLAN016 Slice B — plain REST multipart upload (no GraphQL upload
  // scalar exists in this schema), authenticated manually since the global
  // GqlAuthGuard only covers GraphQL execution context (account.controller.ts).
  const handleAvatarUpload = async (file) => {
    setProfileError(null); setUploadingAvatar(true)
    try {
      const token = localStorage.getItem('medibook_token') || sessionStorage.getItem('medibook_token')
      const apiBase = (import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql').replace(/\/graphql$/, '')
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${apiBase}/account/avatar`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.message || 'Failed to upload photo')
      setAvatarUrl(body.url)
      handleSave('Photo')
    } catch (err) { setProfileError(err.message) }
    finally { setUploadingAvatar(false) }
  }

  const avatarSrc = avatarUrl
    ? (avatarUrl.startsWith('http') ? avatarUrl : `${(import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql').replace(/\/graphql$/, '')}${avatarUrl}`)
    : undefined
  const logoSrc = logoUrl
    ? (logoUrl.startsWith('http') ? logoUrl : `${(import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:4000/graphql').replace(/\/graphql$/, '')}${logoUrl}`)
    : undefined

  // ── 2FA (TOTP) — PLAN016 Slice C ──────────────────────────────────────────
  const handleStartEnroll = async () => {
    setTotpError(null); setTotpBusy(true)
    try {
      const { data } = await client.mutate({ mutation: START_TOTP_ENROLLMENT })
      setQrDataUrl(data.startTotpEnrollment.qr_data_url)
      setTotpSecret(data.startTotpEnrollment.secret)
      setEnrollStep('qr')
      setConfirmCode('')
      setEnrollOpen(true)
    } catch (err) { setProfileError(err?.graphQLErrors?.[0]?.message || err.message) }
    finally { setTotpBusy(false) }
  }

  const handleConfirmEnroll = async () => {
    setTotpError(null); setTotpBusy(true)
    try {
      const { data } = await client.mutate({
        mutation: CONFIRM_TOTP_ENROLLMENT,
        variables: { input: { code: confirmCode } },
      })
      if (!data?.confirmTotpEnrollment?.success) throw new Error(data?.confirmTotpEnrollment?.message ?? 'Incorrect code')
      setBackupCodes(data.confirmTotpEnrollment.backup_codes ?? [])
      setEnrollStep('backup_codes')
      setTotpEnabled(true)
    } catch (err) { setTotpError(err?.graphQLErrors?.[0]?.message || err.message) }
    finally { setTotpBusy(false) }
  }

  const closeEnrollDialog = () => {
    setEnrollOpen(false); setQrDataUrl(null); setTotpSecret(null); setConfirmCode('')
    setBackupCodes([]); setEnrollStep('qr'); setTotpError(null)
  }

  const handleDisableTotp = async () => {
    setTotpError(null); setTotpBusy(true)
    try {
      const { data } = await client.mutate({
        mutation: DISABLE_TOTP,
        variables: { input: { password: disablePassword } },
      })
      if (!data?.disableTotp?.success) throw new Error(data?.disableTotp?.message ?? 'Failed to disable 2FA')
      setTotpEnabled(false)
      setDisableOpen(false); setDisablePassword('')
      handleSave('Two-factor authentication')
    } catch (err) { setTotpError(err?.graphQLErrors?.[0]?.message || err.message) }
    finally { setTotpBusy(false) }
  }

  // SUG-SET-002: Password validation, now against the real changeMyPassword mutation
  const handlePasswordUpdate = async () => {
    setPwError(null)
    if (!currentPw) { setPwError('Please enter your current password.'); return }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return }
    setChangingPw(true)
    try {
      const { data } = await client.mutate({
        mutation: CHANGE_MY_PASSWORD,
        variables: { input: { current_password: currentPw, new_password: newPw } },
      })
      if (!data?.changeMyPassword?.success) throw new Error(data?.changeMyPassword?.message ?? 'Failed to change password')
      setCurrentPw(''); setNewPw(''); setConfirmPw('')
      handleSave('Password')
    } catch (err) { setPwError(err.message) }
    finally { setChangingPw(false) }
  }

  // SUG-SET-003: Revoke session — real revokeMySession mutation
  const handleRevoke = async (id) => {
    try {
      const { data } = await client.mutate({ mutation: REVOKE_MY_SESSION, variables: { id } })
      if (!data?.revokeMySession?.success) throw new Error(data?.revokeMySession?.message ?? 'Failed to revoke session')
      setSessions(prev => prev.filter(s => s.id !== id))
    } catch (err) { setProfileError(err.message) }
  }

  // REQ012/PLAN021 Slice 3 — myDataExport returns null when the org hasn't
  // enabled patient data export OR this account has no linked Patients row
  // (both real, distinct states the backend deliberately collapses into one
  // nullable result, see account.service.ts). Distinguished here only by the
  // one thing the frontend can check itself (role), everything else gets a
  // single honest "not available" message rather than guessing which reason applies.
  const handleDownloadData = async () => {
    setExportError(null); setExportingData(true)
    try {
      const { data } = await client.query({ query: MY_DATA_EXPORT_QUERY, fetchPolicy: 'network-only' })
      if (!data?.myDataExport) {
        throw new Error('Data export isn\'t available for your account right now. Your clinic may not have enabled this feature yet.')
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
    } catch (err) { setExportError(err.message) } finally { setExportingData(false) }
  }

  const handleDeactivate = async () => {
    setDeactivateOpen(false); setDeactivating(true)
    try {
      const { data } = await client.mutate({ mutation: DEACTIVATE_MY_ACCOUNT })
      if (!data?.deactivateMyAccount?.success) throw new Error(data?.deactivateMyAccount?.message ?? 'Failed to deactivate account')
      logout(client)
      navigate('/login')
    } catch (err) { setProfileError(err.message); setDeactivating(false) }
  }

  const toggleNotif = (eventType, channel) => {
    setNotifPrefs(prev => ({
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
      if (!data?.updateMyNotificationPreferences?.success) throw new Error(data?.updateMyNotificationPreferences?.message ?? 'Failed to save preferences')
      handleSave('Notification preferences')
    } catch (err) { setProfileError(err.message) }
    finally { setSavingNotifs(false) }
  }

  return (
    <Box className="page-enter" sx={{ pb: 4 }}>
      <Helmet><title>Settings — MediBook</title></Helmet>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800} sx={{ color: '#202124', fontSize: { xs: '1.35rem', sm: '1.5rem' } }}>Settings</Typography>
        <Typography variant="body2" sx={{ color: '#5F6368' }}>Manage your account, notifications, and preferences</Typography>
      </Box>

      {/* SUG-SET-010: Per-tab contextual saved message */}
      {saved && <Alert severity="success" sx={{ mb: 2.5, borderRadius: 2.5 }} onClose={() => setSaved(null)}>{saved}</Alert>}

      <Paper sx={{ borderRadius: 3, border: '1px solid #E8EAED', boxShadow: 'none', overflow: 'hidden' }}>
        <Tabs
          value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto"
          sx={{ px: 2, borderBottom: '1px solid #E8EAED', bgcolor: '#F8F9FA',
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, minHeight: 52, fontSize: '0.875rem', gap: 0.75 },
            '& .Mui-selected': { color: '#1A73E8' },
            '& .MuiTabs-indicator': { bgcolor: '#1A73E8', height: 3, borderRadius: 1.5 },
          }}
        >
          <Tab icon={<EditRoundedIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Profile" />
          <Tab icon={<LockRoundedIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Account & Security" />
          <Tab icon={<NotificationsRoundedIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Notifications" />
          <Tab icon={<PaletteRoundedIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Appearance" />
          <Tab icon={<BusinessRoundedIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Clinic" />
        </Tabs>

        <Box sx={{ p: { xs: 2.5, sm: 4 } }}>

          {/* ── Profile ──────────────────────────────────────────────────── */}
          <TabPanel value={tab} index={0}>
            <Grid container spacing={4}>
              {/* Avatar */}
              <Grid item xs={12} md={3} sx={{ textAlign: { xs: 'left', md: 'center' } }}>
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <Avatar src={avatarSrc} sx={{ width: 110, height: 110, bgcolor: '#E8F0FE', color: '#1A73E8', fontSize: '2.5rem', fontWeight: 800 }}>
                    {(firstName[0] ?? '') + (lastName[0] ?? '')}
                  </Avatar>
                  {/* SUG-SET-001: real upload — POST /account/avatar */}
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif" style={{ display: 'none' }} onChange={(e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (!file) return
                    if (file.size > 2 * 1024 * 1024) { setProfileError('File must be under 2 MB'); return }
                    handleAvatarUpload(file)
                  }} />
                  <IconButton size="small" disabled={uploadingAvatar} onClick={() => fileRef.current?.click()} aria-label="Change profile photo"
                    sx={{ position: 'absolute', bottom: 0, right: 0, bgcolor: '#fff', border: '2px solid #E8EAED', '&:hover': { bgcolor: '#E8F0FE' } }}>
                    <CameraAltRoundedIcon fontSize="small" sx={{ color: '#1A73E8' }} />
                  </IconButton>
                </Box>
                <Typography variant="caption" display="block" sx={{ mt: 1.5, color: 'text.secondary' }}>
                  {uploadingAvatar ? 'Uploading…' : <>Click to change photo<br />JPG, PNG or GIF · Max 2MB</>}
                </Typography>
              </Grid>
              {/* Form */}
              <Grid item xs={12} md={9}>
                <Grid container spacing={2.5}>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Email" value={user?.email ?? ''} disabled sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} helperText="Change email in Account tab" />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Phone" value={phone} onChange={e => setPhone(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth label="Date of Birth" type="date" value={dateOfBirth} onChange={e => setDateOfBirth(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth select label="Gender" value={gender} onChange={e => setGender(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                      {['male', 'female', 'other', 'prefer_not_to_say'].map(g => <MenuItem key={g} value={g} sx={{ textTransform: 'capitalize' }}>{g.replace(/_/g, ' ')}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField fullWidth multiline rows={3} label="Bio / About" value={bio} onChange={e => setBio(e.target.value)} placeholder="Tell us a little about yourself…" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  </Grid>
                  <Divider sx={{ width: '100%', ml: 2.5, mt: 1.5, mb: 0.5 }} />
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem', mb: 1.5 }}>Address</Typography>
                  </Grid>
                  <Grid item xs={12}><TextField fullWidth label="Address line 1" value={addressLine1} onChange={e => setAddressLine1(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
                  <Grid item xs={12}><TextField fullWidth label="Address line 2 (optional)" value={addressLine2} onChange={e => setAddressLine2(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
                  <Grid item xs={12} sm={4}><TextField fullWidth label="City" value={addressCity} onChange={e => setAddressCity(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
                  <Grid item xs={12} sm={4}><TextField fullWidth label="State" value={addressState} onChange={e => setAddressState(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
                  <Grid item xs={12} sm={4}><TextField fullWidth label="PIN Code" value={addressPincode} onChange={e => setAddressPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputProps={{ inputMode: 'numeric' }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
                  {profileError && <Grid item xs={12}><Alert severity="error" onClose={() => setProfileError(null)}>{profileError}</Alert></Grid>}
                  <Grid item xs={12}>
                    <Button variant="contained" disabled={savingProfile} startIcon={<SaveRoundedIcon />} onClick={handleProfileSave}
                      sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, px: 3,
                        background: 'linear-gradient(135deg, #4285F4 0%, #1A73E8 100%)',
                        '&:hover': { background: 'linear-gradient(135deg, #1A73E8 0%, #1557B0 100%)' },
                      }}>{savingProfile ? 'Saving…' : 'Save Changes'}</Button>
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
                  Your organization requires two-factor authentication for your account. Please set it up below to continue using all features.
                </Alert>
              )}
              {/* Change password */}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}><LockRoundedIcon sx={{ fontSize: '1.1rem', color: 'primary.main' }} /> Change Password</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}><TextField fullWidth label="Current Password" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
                  <Grid item xs={12} sm={6}><TextField fullWidth label="New Password" type="password" helperText="Min 8 characters" value={newPw} onChange={e => setNewPw(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
                  <Grid item xs={12} sm={6}><TextField fullWidth label="Confirm New Password" type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
                  {/* SUG-SET-002: Password validation — error alert + wired onClick */}
                  {pwError && <Grid item xs={12}><Alert severity="error" onClose={() => setPwError(null)}>{pwError}</Alert></Grid>}
                  <Grid item xs={12}><Button variant="outlined" disabled={changingPw} onClick={handlePasswordUpdate} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>{changingPw ? 'Updating…' : 'Update Password'}</Button></Grid>
                </Grid>
              </Box>
              <Divider />
              {/* 2FA — PLAN016 Slice C: real TOTP enrollment against startTotpEnrollment/confirmTotpEnrollment/disableTotp */}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}><SecurityRoundedIcon sx={{ fontSize: '1.1rem', color: '#0F9D58' }} /> Two-Factor Authentication</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  {totpEnabled
                    ? 'Two-factor authentication is enabled. You\'ll be asked for a code from your authenticator app each time you sign in.'
                    : 'Add an extra layer of security to your account with an authenticator app (Google Authenticator, Authy, etc).'}
                </Typography>
                {totpEnabled ? (
                  <Button variant="outlined" color="error" onClick={() => setDisableOpen(true)}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>Disable 2FA</Button>
                ) : (
                  <Button variant="contained" color="success" disabled={totpBusy} onClick={handleStartEnroll}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
                    {totpBusy ? 'Starting…' : 'Enable 2FA'}
                  </Button>
                )}
              </Box>
              <Divider />
              {/* Active sessions */}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}><DevicesRoundedIcon sx={{ fontSize: '1.1rem', color: '#9334E6' }} /> Active Sessions</Typography>
                <Stack spacing={1.5}>
                  {/* SUG-SET-003: real mySessions data; Revoke wired to revokeMySession.
                      No "Current"/location badge — nothing backs that data (see
                      the account module's implementation plan). */}
                  {sessions.map((s) => (
                    <Paper key={s.id} variant="outlined" sx={{ p: 2, borderRadius: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <DevicesRoundedIcon sx={{ color: 'text.disabled' }} />
                        <Box>
                          <Typography variant="body2" fontWeight={700}>{s.device ?? 'Unknown device'}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {s.created_at ? `Signed in ${new Date(s.created_at).toLocaleString()}` : 'Sign-in time unknown'}
                          </Typography>
                        </Box>
                      </Stack>
                      <Button size="small" color="error" variant="outlined" onClick={() => handleRevoke(s.id)} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>Revoke</Button>
                    </Paper>
                  ))}
                  {sessions.length === 0 && <Typography variant="body2" color="text.secondary">No active sessions.</Typography>}
                </Stack>
              </Box>
              {isPatient && (
                <>
                  <Divider />
                  {/* REQ012/PLAN021 Slice 3 — GDPR Article 20 data portability */}
                  <Box>
                    <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}><DownloadRoundedIcon sx={{ fontSize: '1.1rem', color: 'primary.main' }} /> Your Data</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                      Download a copy of your personal data — profile, appointments, and test results — as a JSON file.
                    </Typography>
                    {exportError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setExportError(null)}>{exportError}</Alert>}
                    <Button variant="outlined" startIcon={<DownloadRoundedIcon />} disabled={exportingData} onClick={handleDownloadData}
                      sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
                      {exportingData ? 'Preparing…' : 'Download My Data'}
                    </Button>
                  </Box>
                </>
              )}
              <Divider />
              {/* Danger zone */}
              <Box sx={{ p: 2.5, border: '1.5px solid #F5C6C2', borderRadius: 2.5, bgcolor: '#FCE8E6' }}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#D93025', mb: 0.5 }}>Danger Zone</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>Deactivating your account will immediately revoke all access. This action cannot be undone.</Typography>
                {/* SUG-SET-004: Confirm dialog before deactivating */}
                <Button variant="outlined" color="error" startIcon={<DeleteRoundedIcon />} onClick={() => setDeactivateOpen(true)} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>Deactivate Account</Button>
              </Box>
            </Stack>
          </TabPanel>

          {/* ── Notifications ────────────────────────────────────────────── */}
          <TabPanel value={tab} index={2}>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>Choose how you want to be notified for each event type.</Typography>
            <Paper variant="outlined" sx={{ borderRadius: 2.5 }}>
              {/* P2.6: this Paper's own overflow:'hidden' was clipping the
                  "In-App" column outright at narrow widths -- CLAUDE.md's
                  documented case where document.scrollWidth>clientWidth does
                  NOT catch the defect. TableContainer now owns the scroll. */}
              <TableContainer sx={{ borderRadius: 2.5 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ '& th': { fontWeight: 800, fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.10em', bgcolor: '#F8F9FA', color: '#9AA0A6' } }}>
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
                        {['email', 'sms', 'whatsapp', 'app'].map(ch => (
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
              <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.5 }}>Quiet Hours</Typography>
              <Typography variant="body2" sx={{ color: '#5F6368', mb: 2 }}>
                No WhatsApp/SMS notifications will be sent during this window, except for genuinely time-critical events like an imminent appointment reminder.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                <TextField
                  label="Start" type="time" size="small"
                  value={quietHoursStart}
                  onChange={(e) => setQuietHoursStart(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: { xs: '100%', sm: 160 } }}
                />
                <TextField
                  label="End" type="time" size="small"
                  value={quietHoursEnd}
                  onChange={(e) => setQuietHoursEnd(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={{ width: { xs: '100%', sm: 160 } }}
                />
                <Button
                  size="small" variant="text" color="inherit"
                  onClick={() => { setQuietHoursStart(''); setQuietHoursEnd('') }}
                  sx={{ textTransform: 'none' }}
                >Clear</Button>
              </Stack>
            </Paper>

            <Button variant="contained" disabled={savingNotifs} startIcon={<SaveRoundedIcon />} onClick={handleSaveNotifications}
              sx={{ mt: 3, borderRadius: 2.5, textTransform: 'none', fontWeight: 700,
                background: 'linear-gradient(135deg, #4285F4 0%, #1A73E8 100%)',
                '&:hover': { background: 'linear-gradient(135deg, #1A73E8 0%, #1557B0 100%)' },
              }}>{savingNotifs ? 'Saving…' : 'Save Preferences'}</Button>
          </TabPanel>

          {/* ── Appearance ───────────────────────────────────────────────── */}
          <TabPanel value={tab} index={3}>
            <Stack spacing={4} sx={{ maxWidth: 560 }}>
              {/* Theme */}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>Theme</Typography>
                <FormControl component="fieldset">
                  <RadioGroup row value={themeMode} onChange={(e) => setThemeMode(e.target.value)}>
                    {[['light', '☀️ Light'], ['dark', '🌙 Dark'], ['system', '💻 System']].map(([v, l]) => (
                      <FormControlLabel key={v} value={v} control={<Radio size="small" />} label={<Typography fontWeight={600} variant="body2">{l}</Typography>}
                        sx={{ px: 2, py: 1, border: '1.5px solid', borderColor: themeMode === v ? 'primary.main' : 'divider', borderRadius: 2, mr: 1.5 }}
                      />
                    ))}
                  </RadioGroup>
                </FormControl>
              </Box>
              {/* Font size */}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 0.5 }}>Font Size</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 2 }}>Adjust the base text size across the application</Typography>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', minWidth: 50, textAlign: 'center', fontSize: `${12 + fontSize * 2}px` }}>Aa</Typography>
                  <Slider value={fontSize} min={0} max={3} step={1} marks={[{value:0,label:'SM'},{value:1,label:'MD'},{value:2,label:'LG'},{value:3,label:'XL'}]} onChange={(_, v) => setFontSize(v)} sx={{ flex: 1 }} />
                </Stack>
              </Box>
              {/* Accent color */}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>Accent Color</Typography>
                <Stack direction="row" spacing={1.5} flexWrap="wrap">
                  {ACCENT_COLORS.map((c) => (
                    <Box key={c} onClick={() => setAccent(c)} sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: c, cursor: 'pointer', border: accent === c ? `3px solid ${c}` : '3px solid transparent', outline: accent === c ? `2px solid #fff` : 'none', boxShadow: accent === c ? `0 0 0 3px ${c}55` : 'none', transition: 'all 0.15s' }} />
                  ))}
                </Stack>
              </Box>
              {/* Toggles */}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1.5 }}>Additional Options</Typography>
                <Stack spacing={1}>
                  <FormControlLabel control={<Switch checked={compact} onChange={() => setCompact(!compact)} color="primary" />} label={<Box><Typography variant="body2" fontWeight={700}>Compact Mode</Typography><Typography variant="caption" sx={{ color: 'text.secondary' }}>Reduces padding and spacing</Typography></Box>} />
                  <FormControlLabel control={<Switch checked={rtl} onChange={() => setRtl(!rtl)} color="primary" />} label={<Box><Typography variant="body2" fontWeight={700}>RTL Layout</Typography><Typography variant="caption" sx={{ color: 'text.secondary' }}>For Arabic, Hebrew, and other RTL languages</Typography></Box>} />
                </Stack>
              </Box>
              <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={() => handleSave('Appearance settings')}
                sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, alignSelf: 'flex-start',
                  background: 'linear-gradient(135deg, #4285F4 0%, #1A73E8 100%)',
                  '&:hover': { background: 'linear-gradient(135deg, #1A73E8 0%, #1557B0 100%)' },
                }}>Save Appearance</Button>
            </Stack>
          </TabPanel>

          {/* ── Clinic Settings ────────────────────────────────────────────── */}
          <TabPanel value={tab} index={4}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 2 }}>Clinic Information</Typography>
              </Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Clinic Name" defaultValue="MediCare Clinic" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Contact Phone" defaultValue="+1 555-100-0000" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Contact Email" defaultValue="admin@medicareclinic.com" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth select label="Timezone" defaultValue="IST" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                {['UTC', 'IST', 'EST', 'PST', 'CET', 'GST'].map(tz => <MenuItem key={tz} value={tz}>{tz}</MenuItem>)}
              </TextField></Grid>
              <Grid item xs={12}><TextField fullWidth label="Address" defaultValue="123 Health Avenue, Medical District, MH 400001" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth select label="Currency" defaultValue="USD" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                {['USD', 'EUR', 'GBP', 'INR', 'AED'].map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth label="Default Slot Duration (min)" defaultValue="30" type="number" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
              <Grid item xs={12}>
                <Button variant="contained" startIcon={<SaveRoundedIcon />} onClick={() => handleSave('Clinic settings')}
                  sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700,
                    background: 'linear-gradient(135deg, #4285F4 0%, #1A73E8 100%)',
                    '&:hover': { background: 'linear-gradient(135deg, #1A73E8 0%, #1557B0 100%)' },
                  }}>Save Clinic Settings</Button>
              </Grid>

              {/* ── Organization Branding (REQ002/PLAN022, real backend) ── */}
              <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight={800}>Branding</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Your logo and colors appear in the app sidebar and header for everyone signed into your organization.
                </Typography>
              </Grid>
              {brandingError && (
                <Grid item xs={12}>
                  <Alert severity="error" sx={{ borderRadius: 2 }} onClose={() => setBrandingError(null)}>{brandingError}</Alert>
                </Grid>
              )}
              {brandingLoaded && !hasOrgForBranding && (
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ borderRadius: 2 }}>Your account isn't associated with an organization, so branding can't be edited here.</Alert>
                </Grid>
              )}
              <Grid item xs={12} sm={6} sx={{ opacity: hasOrgForBranding ? 1 : 0.5, pointerEvents: hasOrgForBranding ? 'auto' : 'none' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar variant="rounded" src={logoSrc} sx={{ width: 64, height: 64, bgcolor: '#F0F7F8', border: '1px solid #E8EAED' }}>
                    <BusinessRoundedIcon sx={{ color: '#006D77' }} />
                  </Avatar>
                  <Box>
                    <input ref={logoInputRef} type="file" accept="image/png,image/jpeg" hidden onChange={handleLogoSelect} />
                    <Button size="small" variant="outlined" disabled={uploadingLogo} onClick={() => logoInputRef.current?.click()} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
                      {uploadingLogo ? 'Uploading…' : 'Upload logo'}
                    </Button>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>PNG or JPEG, square, at least 256×256px, max 2MB</Typography>
                  </Box>
                </Stack>
              </Grid>
              <Grid item xs={12} sm={3} sx={{ opacity: hasOrgForBranding ? 1 : 0.5, pointerEvents: hasOrgForBranding ? 'auto' : 'none' }}>
                <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 0.5 }}>Primary color</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} style={{ width: 36, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                  <TextField size="small" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} sx={{ width: 100, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                </Stack>
              </Grid>
              <Grid item xs={12} sm={3} sx={{ opacity: hasOrgForBranding ? 1 : 0.5, pointerEvents: hasOrgForBranding ? 'auto' : 'none' }}>
                <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 0.5 }}>Secondary color</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} style={{ width: 36, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                  <TextField size="small" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} sx={{ width: 100, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                </Stack>
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" disabled={savingBranding || !hasOrgForBranding} startIcon={<SaveRoundedIcon />} onClick={handleSaveBranding}
                  sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700,
                    background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  }}>{savingBranding ? 'Saving…' : 'Save Branding'}</Button>
              </Grid>
            </Grid>
          </TabPanel>

        </Box>
      </Paper>
      {/* SUG-SET-004: Deactivate Account confirmation dialog */}
      <Dialog open={deactivateOpen} onClose={() => setDeactivateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700} sx={{ color: '#D93025' }}>Deactivate Account?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#5F6368' }}>
            Deactivating your account will immediately revoke all access and cannot be undone.
            Are you sure you want to continue?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeactivateOpen(false)} disabled={deactivating}>Cancel</Button>
          <Button variant="contained" color="error" startIcon={<DeleteRoundedIcon />} disabled={deactivating}
            onClick={handleDeactivate}
          >{deactivating ? 'Deactivating…' : 'Deactivate'}</Button>
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
                {qrDataUrl && <Box component="img" src={qrDataUrl} alt="2FA QR code" sx={{ width: 200, height: 200, border: '1px solid #E8EAED', borderRadius: 2 }} />}
                <Typography variant="caption" sx={{ color: 'text.secondary', wordBreak: 'break-all', textAlign: 'center' }}>
                  Can't scan? Enter this code manually: <strong>{totpSecret}</strong>
                </Typography>
                {totpError && <Alert severity="error" sx={{ width: '100%' }} onClose={() => setTotpError(null)}>{totpError}</Alert>}
                <TextField
                  fullWidth label="6-digit code" value={confirmCode}
                  onChange={e => setConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  inputProps={{ inputMode: 'numeric', 'aria-label': '6-digit authenticator code' }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={closeEnrollDialog} disabled={totpBusy}>Cancel</Button>
              <Button variant="contained" disabled={totpBusy || confirmCode.length !== 6} onClick={handleConfirmEnroll}>
                {totpBusy ? 'Verifying…' : 'Verify & Enable'}
              </Button>
            </DialogActions>
          </>
        ) : (
          <>
            <DialogTitle fontWeight={700} sx={{ color: '#0F9D58' }}>2FA is now enabled</DialogTitle>
            <DialogContent>
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                Save these backup codes somewhere safe. Each one can be used once to sign in if you lose access to your authenticator app — they won't be shown again.
              </Alert>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#F8F9FA' }}>
                <Grid container spacing={1}>
                  {backupCodes.map((c) => (
                    <Grid item xs={6} key={c}><Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{c}</Typography></Grid>
                  ))}
                </Grid>
              </Paper>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button variant="contained" onClick={closeEnrollDialog}>Done</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* PLAN016 Slice C — disable 2FA requires current password re-entry */}
      <Dialog open={disableOpen} onClose={() => { setDisableOpen(false); setDisablePassword(''); setTotpError(null) }} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700} sx={{ color: '#D93025' }}>Disable two-factor authentication?</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Confirm your password to disable 2FA on this account.</Typography>
            {totpError && <Alert severity="error" onClose={() => setTotpError(null)}>{totpError}</Alert>}
            <TextField
              fullWidth type="password" label="Current Password" value={disablePassword}
              onChange={e => setDisablePassword(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { setDisableOpen(false); setDisablePassword(''); setTotpError(null) }} disabled={totpBusy}>Cancel</Button>
          <Button variant="contained" color="error" disabled={totpBusy || !disablePassword} onClick={handleDisableTotp}>
            {totpBusy ? 'Disabling…' : 'Disable 2FA'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
