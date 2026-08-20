import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApolloClient, gql } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import {
  Box, Button, Typography, Tabs, Tab, Grid, Card, CardContent, Stack, Divider,
  TextField, Avatar, Switch, FormControlLabel, Paper, IconButton,
  Slider, Radio, RadioGroup, FormControl, FormLabel, MenuItem, Alert,
  Tooltip, Table, TableBody, TableCell, TableHead, TableRow,
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
import { useAuth } from '../../context/AuthContext'
import { useMockData, useMockMutation } from '../../mocks/useMockData'
import * as MockStore from '../../mocks/store'

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
  query MyProfile { myProfile { id first_name last_name email phone } }
`
const UPDATE_MY_PROFILE = gql`
  mutation UpdateMyProfile($input: UpdateMyProfileInput!) {
    updateMyProfile(input: $input) { success userErrors { message } profile { first_name last_name phone } }
  }
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
  query MyNotificationPreferences { myNotificationPreferences { event_type email_enabled sms_enabled app_enabled } }
`
const UPDATE_MY_NOTIFICATION_PREFERENCES = gql`
  mutation UpdateMyNotificationPreferences($input: [NotificationPreferenceInput!]!) {
    updateMyNotificationPreferences(input: $input) { success message }
  }
`

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, updateUser, logout } = useAuth()
  const client = useApolloClient()
  const navigate = useNavigate()
  const fileRef = useRef(null) // SUG-SET-001: camera icon file upload
  const [tab, setTab] = useState(0)
  const [saved, setSaved]     = useState(null) // SUG-SET-010: null|string

  // Profile state — seeded from the real myProfile query (loadAccountTabs
  // below), not a naive user?.name split or a hardcoded placeholder.
  const [firstName, setFirstName]   = useState('')
  const [lastName, setLastName]     = useState('')
  const [phone, setPhone]           = useState('')
  const [bio, setBio]               = useState('')
  const [profileError, setProfileError] = useState(null)
  const [savingProfile, setSavingProfile] = useState(false)

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

  // 2FA controlled state (SUG-SET-008) — still local-only; see
  // context/open-questions.md (REQ005 open question: real requirement or defer?)
  const [twoFa, setTwoFa] = useState(false)

  // Deactivate confirm dialog state (SUG-SET-004)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

  // Notifications state — real myNotificationPreferences data, keyed by
  // event_type (see loadAccountTabs below); NOTIF_ROWS supplies only the
  // static label/order.
  const [notifPrefs, setNotifPrefs] = useState({})
  const [savingNotifs, setSavingNotifs] = useState(false)

  const loadAccountTabs = async () => {
    try {
      const [{ data: profileData }, { data: sessionsData }, { data: notifData }] = await Promise.all([
        client.query({ query: MY_PROFILE_QUERY, fetchPolicy: 'network-only' }),
        client.query({ query: MY_SESSIONS_QUERY, fetchPolicy: 'network-only' }),
        client.query({ query: MY_NOTIFICATION_PREFERENCES_QUERY, fetchPolicy: 'network-only' }),
      ])
      if (profileData?.myProfile) {
        setFirstName(profileData.myProfile.first_name ?? '')
        setLastName(profileData.myProfile.last_name ?? '')
        setPhone(profileData.myProfile.phone ?? '')
      }
      setSessions(sessionsData?.mySessions ?? [])
      const prefsByType = Object.fromEntries(
        (notifData?.myNotificationPreferences ?? []).map((p) => [p.event_type, p]),
      )
      setNotifPrefs(prefsByType)
    } catch (err) { setProfileError(err.message) }
  }
  useEffect(() => { loadAccountTabs() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Organization branding state (logo + color scheme — requirements/organization-branding-and-management-requirements.md)
  // NOTE: must never fall back to a hardcoded real org id here — a user with no
  // organisation (e.g. platform admin, patient) would otherwise silently read/write
  // another tenant's real branding data (found in test-cases/14-settings/test-cases.md).
  const orgId = user?.organisation?.id ?? null
  const { data: branding } = useMockData((store) => orgId ? store.getOrganizationBranding(orgId) : null)
  const [logoPreview, setLogoPreview]           = useState(null)
  const [primaryColor, setPrimaryColor]         = useState(branding?.primary_color ?? '#006D77')
  const [secondaryColor, setSecondaryColor]     = useState(branding?.secondary_color ?? '#00858F')
  const logoInputRef = useRef(null)
  const [saveBranding, { loading: savingBranding }] = useMockMutation(MockStore.updateOrganizationBranding)

  useEffect(() => {
    if (branding) {
      setPrimaryColor(branding.primary_color ?? '#006D77')
      setSecondaryColor(branding.secondary_color ?? '#00858F')
      setLogoPreview(branding.logo_url ?? null)
    }
  }, [branding])

  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setLogoPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleSaveBranding = async () => {
    if (!orgId) return
    await saveBranding(orgId, { logo_url: logoPreview, primary_color: primaryColor, secondary_color: secondaryColor })
    handleSave('Branding')
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
      const { data } = await client.mutate({
        mutation: UPDATE_MY_PROFILE,
        variables: { input: { first_name: firstName, last_name: lastName, phone: phone || null } },
      })
      if (!data?.updateMyProfile?.success) throw new Error(data?.updateMyProfile?.userErrors?.[0]?.message ?? 'Failed to save profile')
      updateUser({ name: `${firstName} ${lastName}`.trim() })
      handleSave('Profile changes')
    } catch (err) { setProfileError(err.message) }
    finally { setSavingProfile(false) }
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
      const input = NOTIF_ROWS.map((r) => ({
        event_type: r.event_type,
        email_enabled: !!notifPrefs[r.event_type]?.email_enabled,
        sms_enabled: !!notifPrefs[r.event_type]?.sms_enabled,
        app_enabled: !!notifPrefs[r.event_type]?.app_enabled,
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
                  <Avatar sx={{ width: 110, height: 110, bgcolor: '#E8F0FE', color: '#1A73E8', fontSize: '2.5rem', fontWeight: 800 }}>
                    {(firstName[0] ?? '') + (lastName[0] ?? '')}
                  </Avatar>
                  {/* SUG-SET-001: Wire camera icon to hidden file input */}
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif" style={{ display: 'none' }} onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (file.size > 2 * 1024 * 1024) { alert('File must be under 2 MB'); return }
                    const url = URL.createObjectURL(file)
                    // Optimistic preview would set avatarUrl state here
                    handleSave('Photo')
                  }} />
                  <IconButton size="small" onClick={() => fileRef.current?.click()} aria-label="Change profile photo"
                    sx={{ position: 'absolute', bottom: 0, right: 0, bgcolor: '#fff', border: '2px solid #E8EAED', '&:hover': { bgcolor: '#E8F0FE' } }}>
                    <CameraAltRoundedIcon fontSize="small" sx={{ color: '#1A73E8' }} />
                  </IconButton>
                </Box>
                <Typography variant="caption" display="block" sx={{ mt: 1.5, color: 'text.secondary' }}>Click to change photo<br />JPG, PNG or GIF · Max 2MB</Typography>
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
                    <TextField fullWidth label="Date of Birth" type="date" InputLabelProps={{ shrink: true }} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField fullWidth select label="Gender" defaultValue="prefer_not_to_say" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
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
                  <Grid item xs={12}><TextField fullWidth label="Street Address" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
                  <Grid item xs={12} sm={4}><TextField fullWidth label="City" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
                  <Grid item xs={12} sm={4}><TextField fullWidth label="State / Province" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
                  <Grid item xs={12} sm={4}><TextField fullWidth label="ZIP / Postal Code" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} /></Grid>
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
              {/* 2FA */}
              <Box>
                <Typography variant="subtitle1" fontWeight={800} sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}><SecurityRoundedIcon sx={{ fontSize: '1.1rem', color: '#0F9D58' }} /> Two-Factor Authentication</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>Add an extra layer of security to your account by enabling 2FA.</Typography>
                {/* SUG-SET-008: 2FA controlled state */}
                <FormControlLabel control={<Switch color="success" checked={twoFa} onChange={(e) => setTwoFa(e.target.checked)} />} label={<Typography fontWeight={600}>Enable 2FA (TOTP)</Typography>} />
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
            <Paper variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 800, fontSize: '0.70rem', textTransform: 'uppercase', letterSpacing: '0.10em', bgcolor: '#F8F9FA', color: '#9AA0A6' } }}>
                    <TableCell sx={{ width: '50%' }}>Event</TableCell>
                    <TableCell align="center">Email</TableCell>
                    <TableCell align="center">SMS</TableCell>
                    <TableCell align="center">In-App</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {NOTIF_ROWS.map((row) => (
                    <TableRow key={row.event_type} sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>{row.label}</TableCell>
                      {['email', 'sms', 'app'].map(ch => (
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

              {/* ── Organization Branding — see requirements/organization-branding-and-management-requirements.md ── */}
              <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle1" fontWeight={800}>Branding</Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Your logo and colors appear on the patient booking page, confirmation emails, and invoices.
                </Typography>
              </Grid>
              {!orgId && (
                <Grid item xs={12}>
                  <Alert severity="info" sx={{ borderRadius: 2 }}>Your account isn't associated with an organization, so branding can't be edited here.</Alert>
                </Grid>
              )}
              <Grid item xs={12} sm={6} sx={{ opacity: orgId ? 1 : 0.5, pointerEvents: orgId ? 'auto' : 'none' }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar variant="rounded" src={logoPreview} sx={{ width: 64, height: 64, bgcolor: '#F0F7F8', border: '1px solid #E8EAED' }}>
                    <BusinessRoundedIcon sx={{ color: '#006D77' }} />
                  </Avatar>
                  <Box>
                    <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml" hidden onChange={handleLogoSelect} />
                    <Button size="small" variant="outlined" onClick={() => logoInputRef.current?.click()} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
                      Upload logo
                    </Button>
                    <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}>SVG or PNG, square, at least 256×256px</Typography>
                  </Box>
                </Stack>
              </Grid>
              <Grid item xs={12} sm={3} sx={{ opacity: orgId ? 1 : 0.5, pointerEvents: orgId ? 'auto' : 'none' }}>
                <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 0.5 }}>Primary color</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} style={{ width: 36, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                  <TextField size="small" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} sx={{ width: 100, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                </Stack>
              </Grid>
              <Grid item xs={12} sm={3} sx={{ opacity: orgId ? 1 : 0.5, pointerEvents: orgId ? 'auto' : 'none' }}>
                <Typography variant="caption" fontWeight={700} sx={{ display: 'block', mb: 0.5 }}>Secondary color</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <input type="color" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} style={{ width: 36, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer' }} />
                  <TextField size="small" value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} sx={{ width: 100, '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
                </Stack>
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" disabled={savingBranding || !orgId} startIcon={<SaveRoundedIcon />} onClick={handleSaveBranding}
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
    </Box>
  )
}
