import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, gql } from '@apollo/client'
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Stack,
  Button,
  Chip,
  Avatar,
  Divider,
  TextField,
  Alert,
  Switch,
  FormControlLabel,
  MenuItem,
  CircularProgress,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import SaveIcon from '@mui/icons-material/Save'
import CancelIcon from '@mui/icons-material/Cancel'
import NotificationsIcon from '@mui/icons-material/Notifications'
import MedicalServicesIcon from '@mui/icons-material/MedicalServices'
import { useAuth } from '../../hooks/useAuth'

// SUG-PTPROF-011: Controlled dropdown options for Gender
const GENDER_OPTIONS = ['Male', 'Female', 'Non-binary', 'Prefer not to say']
// SUG-PTPROF-013: Loose E.164-style phone validator (allows spaces/dashes/parens)
const PHONE_RE = /^\+?[0-9()\- ]{7,20}$/

// This page previously showed the exact same hardcoded "Emma Wilson" profile
// (fake DOB/phone/address/allergies/insurance) to every logged-in patient,
// regardless of who they actually were -- a real fabricated-data bug, not
// just a placeholder. Now backed by the real `patient(id)` query, gated on
// `me.patient.id` (added to AuthUserType/ME_QUERY specifically for this).
const PATIENT_PROFILE_QUERY = gql`
  query PatientProfileSelf($id: ID!) {
    patient(id: $id) {
      id
      first_name
      last_name
      email
      phone
      date_of_birth
      gender
      address
      notes
    }
  }
`
const UPDATE_PATIENT_PROFILE = gql`
  mutation UpdatePatientProfileSelf($id: ID!, $input: PatientInput!) {
    updatePatient(id: $id, input: $input) {
      id
      first_name
      last_name
      email
      phone
      date_of_birth
      gender
      address
      notes
    }
  }
`
// Same real contract settings/index.jsx already uses for account-wide
// notification preferences (REQ008) -- wired here too since this page is a
// separate, patient-specific surface, not a redirect to Settings.
const NOTIF_ROWS = [
  { event_type: 'new_appointment', label: 'New appointment booked' },
  { event_type: 'appointment_reminder', label: 'Appointment reminder (24h)' },
  { event_type: 'appointment_cancelled', label: 'Appointment cancelled' },
  { event_type: 'new_message', label: 'New message received' },
  { event_type: 'payment_received', label: 'Payment received' },
]
const MY_NOTIFICATION_PREFERENCES_QUERY = gql`
  query MyNotificationPreferencesSelf {
    myNotificationPreferences {
      event_type
      email_enabled
      sms_enabled
      app_enabled
    }
  }
`
const UPDATE_MY_NOTIFICATION_PREFERENCES = gql`
  mutation UpdateMyNotificationPreferencesSelf($input: [NotificationPreferenceInput!]!) {
    updateMyNotificationPreferences(input: $input) {
      success
      message
    }
  }
`

const EMPTY_DRAFT = { first_name: '', last_name: '', email: '', phone: '', date_of_birth: '', gender: '', address: '', notes: '' }

export default function PatientProfile() {
  const { user } = useAuth()
  const patientId = user?.patient?.id

  const { data, loading, error, refetch } = useQuery(PATIENT_PROFILE_QUERY, {
    variables: { id: patientId },
    skip: !patientId,
    fetchPolicy: 'cache-and-network',
  })
  const [updatePatientProfile, { loading: saving }] = useMutation(UPDATE_PATIENT_PROFILE)

  const { data: notifData, loading: notifLoading } = useQuery(MY_NOTIFICATION_PREFERENCES_QUERY, { fetchPolicy: 'cache-and-network' })
  const [updateNotifPrefs, { loading: savingNotifs }] = useMutation(UPDATE_MY_NOTIFICATION_PREFERENCES)
  const [notifPrefs, setNotifPrefs] = useState({})
  const [notifSaveOk, setNotifSaveOk] = useState(false)
  useEffect(() => {
    if (notifData?.myNotificationPreferences) {
      setNotifPrefs(Object.fromEntries(notifData.myNotificationPreferences.map((p) => [p.event_type, p])))
    }
  }, [notifData])
  const toggleNotif = (eventType, channel) => {
    setNotifPrefs((prev) => ({
      ...prev,
      [eventType]: { ...prev[eventType], event_type: eventType, [`${channel}_enabled`]: !prev[eventType]?.[`${channel}_enabled`] },
    }))
  }
  const handleSaveNotifications = async () => {
    const input = NOTIF_ROWS.map((r) => ({
      event_type: r.event_type,
      email_enabled: !!notifPrefs[r.event_type]?.email_enabled,
      sms_enabled: !!notifPrefs[r.event_type]?.sms_enabled,
      app_enabled: !!notifPrefs[r.event_type]?.app_enabled,
    }))
    const { data: res } = await updateNotifPrefs({ variables: { input } })
    if (res?.updateMyNotificationPreferences?.success) {
      setNotifSaveOk(true)
      setTimeout(() => setNotifSaveOk(false), 3000)
    }
  }

  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [saveOk, setSaveOk] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [phoneError, setPhoneError] = useState('')

  // No structured backend exists yet for allergies/conditions (Patients has
  // only a single free-text medical_notes field) -- shown read-only from
  // `notes` rather than as fabricated editable chips attributed to a real
  // person. See requirements REQ020 (clinical-records, draft) and
  // open-questions.md.
  const profile = data?.patient

  useEffect(() => {
    if (profile && !editing) {
      setDraft({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        date_of_birth: profile.date_of_birth ? profile.date_of_birth.slice(0, 10) : '',
        gender: profile.gender || '',
        address: profile.address || '',
        notes: profile.notes || '',
      })
    }
  }, [profile, editing])

  const handleSave = async () => {
    if (draft.phone && !PHONE_RE.test(draft.phone.trim())) {
      setPhoneError('Enter a valid phone number (e.g. +44 7700 123456)')
      return
    }
    setPhoneError('')
    setSaveError('')
    try {
      await updatePatientProfile({ variables: { id: patientId, input: { ...draft } } })
      await refetch()
      setEditing(false)
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 3000)
    } catch (err) {
      setSaveError(err.message || 'Failed to save profile')
    }
  }

  const handleDiscard = () => {
    setEditing(false)
    setPhoneError('')
    setSaveError('')
    if (profile) {
      setDraft({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        date_of_birth: profile.date_of_birth ? profile.date_of_birth.slice(0, 10) : '',
        gender: profile.gender || '',
        address: profile.address || '',
        notes: profile.notes || '',
      })
    }
  }

  const field = (label, key, type = 'text', options = null, err = '') => (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>
        {label}
      </Typography>
      {editing ? (
        options ? (
          <TextField select fullWidth size="small" value={draft[key] || ''} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}>
            {options.map((o) => (
              <MenuItem key={o} value={o}>
                {o}
              </MenuItem>
            ))}
          </TextField>
        ) : (
          <TextField
            fullWidth
            size="small"
            type={type}
            value={draft[key] || ''}
            onChange={(e) => {
              setDraft({ ...draft, [key]: e.target.value })
              if (key === 'phone') setPhoneError('')
            }}
            error={!!err}
            helperText={err || ' '}
            InputLabelProps={type === 'date' ? { shrink: true } : undefined}
          />
        )
      ) : (
        <Typography variant="body2" fontWeight={500}>
          {profile?.[key] || '—'}
        </Typography>
      )}
    </Box>
  )

  if (!patientId) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="info">
          Your account isn't linked to a patient record yet. Contact your clinic to have your account linked before editing your profile.
        </Alert>
      </Box>
    )
  }
  if (loading && !data)
    return (
      <Box sx={{ p: 5, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Box>
    )
  if (error)
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="error">Failed to load your profile: {error.message}</Alert>
      </Box>
    )
  if (!profile)
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">Patient record not found.</Alert>
      </Box>
    )

  const initials = `${profile.first_name?.[0] ?? '?'}${profile.last_name?.[0] ?? ''}`
  const displayName = `${profile.first_name} ${profile.last_name}`.trim() || 'Unknown Patient'

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h2" fontWeight={700}>
          My Profile
        </Typography>
        {editing ? (
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<CancelIcon />} onClick={handleDiscard} disabled={saving} aria-label="Discard changes">
              Discard
            </Button>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              aria-label="Save profile changes"
            >
              Save Changes
            </Button>
          </Stack>
        ) : (
          <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setEditing(true)} aria-label="Edit profile">
            Edit Profile
          </Button>
        )}
      </Stack>

      {saveOk && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Profile updated successfully!
        </Alert>
      )}
      {saveError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {saveError}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Left — avatar card */}
        <Grid item xs={12} md={3}>
          <Card sx={{ textAlign: 'center', p: 3 }}>
            <Avatar sx={{ width: 80, height: 80, bgcolor: '#006D77', fontSize: '1.8rem', fontWeight: 800, mx: 'auto', mb: 2 }}>
              {initials}
            </Avatar>
            <Typography fontWeight={700}>{displayName}</Typography>
            <Typography variant="body2" color="text.secondary">
              {profile.email}
            </Typography>
            <Chip label="Patient" sx={{ mt: 1, bgcolor: '#E8F8F9', color: '#006D77', fontWeight: 700 }} />
            <Divider sx={{ my: 2 }} />
            <Stack spacing={0.75} sx={{ textAlign: 'left' }}>
              {[
                { label: 'Date of Birth', value: profile.date_of_birth ? profile.date_of_birth.slice(0, 10) : '—' },
                { label: 'Gender', value: profile.gender || '—' },
              ].map(({ label, value }) => (
                <Box key={label}>
                  <Typography variant="caption" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {value}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Card>
        </Grid>

        {/* Right — details */}
        <Grid item xs={12} md={9}>
          <Stack spacing={3}>
            {/* Personal Info */}
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Typography variant="h5" fontWeight={700} sx={{ mb: 2.5 }}>
                  Personal Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    {field('First Name', 'first_name')}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    {field('Last Name', 'last_name')}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    {field('Email Address', 'email', 'email')}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    {field('Phone Number', 'phone', 'tel', null, phoneError)}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    {field('Date of Birth', 'date_of_birth', 'date')}
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    {field('Gender', 'gender', 'text', GENDER_OPTIONS)}
                  </Grid>
                  <Grid item xs={12}>
                    {field('Home Address', 'address')}
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Medical Notes — free text only; no structured allergy/condition
                model exists yet (see REQ020, open-questions.md) */}
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
                  <MedicalServicesIcon sx={{ color: '#006D77', fontSize: 20 }} />
                  <Typography variant="h5" fontWeight={700}>
                    Medical Notes
                  </Typography>
                </Stack>
                {editing ? (
                  <TextField
                    fullWidth
                    multiline
                    minRows={3}
                    value={draft.notes}
                    onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                    placeholder="Allergies, ongoing conditions, or anything your clinic should know"
                  />
                ) : (
                  <Typography variant="body2" color={profile.notes ? 'text.primary' : 'text.secondary'}>
                    {profile.notes || 'No medical notes on file.'}
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* Notifications — real myNotificationPreferences (REQ008),
                same contract settings/index.jsx already uses */}
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <NotificationsIcon sx={{ color: '#006D77', fontSize: 20 }} />
                  <Typography variant="h5" fontWeight={700}>
                    Notification Preferences
                  </Typography>
                </Stack>
                {notifSaveOk && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Notification preferences saved!
                  </Alert>
                )}
                {notifLoading && !notifData ? (
                  <CircularProgress size={20} />
                ) : (
                  <>
                    <Stack spacing={1.5}>
                      {NOTIF_ROWS.map((row) => (
                        <Box key={row.event_type}>
                          <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                            {row.label}
                          </Typography>
                          <Stack direction="row" spacing={2}>
                            {['email', 'sms', 'app'].map((ch) => (
                              <FormControlLabel
                                key={ch}
                                control={
                                  <Switch
                                    size="small"
                                    checked={!!notifPrefs[row.event_type]?.[`${ch}_enabled`]}
                                    onChange={() => toggleNotif(row.event_type, ch)}
                                  />
                                }
                                label={<Typography variant="caption">{ch === 'app' ? 'In-App' : ch.toUpperCase()}</Typography>}
                              />
                            ))}
                          </Stack>
                        </Box>
                      ))}
                    </Stack>
                    <Button
                      variant="contained"
                      startIcon={<SaveIcon />}
                      onClick={handleSaveNotifications}
                      disabled={savingNotifs}
                      sx={{ mt: 2.5, textTransform: 'none', fontWeight: 700 }}
                    >
                      {savingNotifs ? 'Saving…' : 'Save Preferences'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  )
}
