import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApolloClient, gql } from '@apollo/client'
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Stack,
  Button,
  Chip,
  Tab,
  Tabs,
  TextField,
  Paper,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  LinearProgress,
  useTheme,
} from '@mui/material'
import EmailIcon from '@mui/icons-material/Email'
import SmsIcon from '@mui/icons-material/Sms'
import NotificationsIcon from '@mui/icons-material/Notifications'
import EditIcon from '@mui/icons-material/Edit'
import PreviewIcon from '@mui/icons-material/Preview'
import SendIcon from '@mui/icons-material/Send'
import CloseIcon from '@mui/icons-material/Close'
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'

// REQ011 — real backend/src/email-templates data (the same module and rows
// admin/EmailTemplates.jsx's full editor uses), replacing a 100% hardcoded
// local array. Every real template is email-only (no SMS-template concept
// exists on this model) -- the mock's fabricated "channel"/"email+sms"
// distinction is dropped rather than carried forward. Full subject/body
// editing stays on the dedicated Email Templates page (avoids maintaining
// two copies of that editor); this tab does real active/inactive toggling
// and a real read-only preview.
const GET_EMAIL_TEMPLATES = gql`
  query GetNotificationEmailTemplates {
    emailTemplates {
      id
      name
      type
      subject
      body
      variables
      is_active
    }
  }
`
const UPDATE_EMAIL_TEMPLATE_ACTIVE = gql`
  mutation UpdateEmailTemplateActive($id: ID!, $input: UpdateEmailTemplateInput!) {
    updateEmailTemplate(id: $id, input: $input) {
      success
      userErrors {
        message
      }
      template {
        id
        is_active
      }
    }
  }
`
const TEMPLATE_TYPE_LABELS = {
  appointment_confirmation: 'Appointment Confirmation',
  appointment_reminder: 'Appointment Reminder',
  appointment_cancellation: 'Appointment Cancellation',
  appointment_rescheduled: 'Appointment Rescheduled',
  password_reset: 'Password Reset',
  welcome: 'Welcome',
  invoice: 'Invoice / Receipt',
  cancellation_fee: 'Cancellation Fee',
}

// REQ006 — Global Settings tab, Email half. P1-01/REQ144 added
// whatsapp_monthly_cap_rupees to the same settings row.
const GET_COMMUNICATION_SETTINGS = gql`
  query GetOrgCommunicationSettings {
    myOrgCommunicationSettings {
      email_from_name
      email_from_address
      email_reply_to
      email_include_branding
      whatsapp_monthly_cap_rupees
    }
  }
`
const UPDATE_COMMUNICATION_SETTINGS = gql`
  mutation UpdateOrgCommunicationSettings($input: UpdateOrgCommunicationSettingsInput!) {
    updateMyOrgCommunicationSettings(input: $input) {
      success
      userErrors {
        message
      }
    }
  }
`

// P1-01/REQ144 — current-IST-month WhatsApp conversation spend by Meta
// template category (utility/marketing/authentication). Never caller-
// classified -- the category is resolved server-side per event type.
const GET_WHATSAPP_SPEND = gql`
  query GetWhatsappConversationSpend {
    whatsappConversationSpend {
      periodStart
      periodEnd
      totalCostRupees
      byCategory {
        category
        count
        costRupees
      }
    }
  }
`

// REQ008/PLAN017 — SMS half: rebuilt as a generic, provider-agnostic OTP/SMS
// configuration (per this session's redirect away from a single fixed
// vendor). notificationProviders is the public catalog of registered
// providers (MSG91, Gupshup, Twilio, AWS SNS) and their own credential
// field shapes; myNotificationProviderConfig/updateMyNotificationProviderConfig
// are org-scoped and never return raw credentials (has_credentials only).
const GET_NOTIFICATION_PROVIDERS = gql`
  query GetNotificationProviders {
    notificationProviders {
      id
      label
      channel
      fields {
        key
        label
        type
        required
      }
    }
  }
`
const GET_MY_NOTIFICATION_PROVIDER_CONFIG = gql`
  query GetMyNotificationProviderConfig($channel: String!) {
    myNotificationProviderConfig(channel: $channel) {
      channel
      provider
      sender_id
      has_credentials
    }
  }
`
const UPDATE_NOTIFICATION_PROVIDER_CONFIG = gql`
  mutation UpdateMyNotificationProviderConfig($input: UpdateNotificationProviderConfigInput!) {
    updateMyNotificationProviderConfig(input: $input) {
      success
      message
    }
  }
`

// P1-11 (FR-AI-12, "provider is swappable") — same registry/encrypted-
// credential shape as the SMS block above, one purpose ('transcription')
// today. aiTranscriptionProviders is the public catalog; myAiProviderConfig
// never returns raw credentials (has_credentials only), same convention.
const GET_AI_PROVIDERS = gql`
  query GetAiTranscriptionProviders {
    aiTranscriptionProviders {
      id
      label
      fields {
        key
        label
        type
        required
      }
    }
  }
`
const GET_MY_AI_PROVIDER_CONFIG = gql`
  query GetMyAiProviderConfig {
    myAiProviderConfig {
      provider
      has_credentials
    }
  }
`
const UPDATE_AI_PROVIDER_CONFIG = gql`
  mutation UpdateMyAiProviderConfig($input: UpdateAiProviderConfigInput!) {
    updateMyAiProviderConfig(input: $input) {
      success
      message
    }
  }
`

export default function AdminCommunications() {
  const client = useApolloClient()
  const navigate = useNavigate()
  const theme = useTheme()
  const [templates, setTemplates] = useState([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [templatesError, setTemplatesError] = useState(null)
  const [togglingId, setTogglingId] = useState(null)
  const [previewTemplate, setPreviewTemplate] = useState(null)
  const [tab, setTab] = useState(0)
  const [testEmail, setTestEmail] = useState('')
  const [sent, setSent] = useState(false)

  const loadTemplates = () => {
    setLoadingTemplates(true)
    client
      .query({ query: GET_EMAIL_TEMPLATES, fetchPolicy: 'network-only' })
      .then(({ data }) => setTemplates(data?.emailTemplates ?? []))
      .catch((err) => setTemplatesError(err.message))
      .finally(() => setLoadingTemplates(false))
  }
  useEffect(() => {
    loadTemplates()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTemplateActive = async (t) => {
    setTemplatesError(null)
    setTogglingId(t.id)
    try {
      const { data } = await client.mutate({
        mutation: UPDATE_EMAIL_TEMPLATE_ACTIVE,
        variables: { id: t.id, input: { subject: t.subject, body: t.body, is_active: !t.is_active } },
      })
      if (!data?.updateEmailTemplate?.success) {
        throw new Error(data?.updateEmailTemplate?.userErrors?.[0]?.message ?? 'Failed to update template')
      }
      setTemplates((prev) => prev.map((row) => (row.id === t.id ? { ...row, is_active: !row.is_active } : row)))
    } catch (err) {
      setTemplatesError(err.message)
    } finally {
      setTogglingId(null)
    }
  }

  const [emailFromName, setEmailFromName] = useState('')
  const [emailFromAddress, setEmailFromAddress] = useState('')
  const [emailReplyTo, setEmailReplyTo] = useState('')
  const [emailIncludeBranding, setEmailIncludeBranding] = useState(true)
  const [emailSettingsError, setEmailSettingsError] = useState(null)
  const [emailSettingsSaved, setEmailSettingsSaved] = useState(false)
  const [savingEmailSettings, setSavingEmailSettings] = useState(false)

  // P1-01/REQ144 — WhatsApp conversation spend card
  const [whatsappSpend, setWhatsappSpend] = useState(null)
  const [loadingSpend, setLoadingSpend] = useState(true)
  const [spendError, setSpendError] = useState(null)
  const [capRupees, setCapRupees] = useState('') // '' = no cap configured
  const [savingCap, setSavingCap] = useState(false)
  const [capSaved, setCapSaved] = useState(false)
  const [capError, setCapError] = useState(null)

  const loadSpend = () => {
    setLoadingSpend(true)
    setSpendError(null)
    client
      .query({ query: GET_WHATSAPP_SPEND, fetchPolicy: 'network-only' })
      .then(({ data }) => setWhatsappSpend(data?.whatsappConversationSpend ?? null))
      .catch((err) => setSpendError(err.message))
      .finally(() => setLoadingSpend(false))
  }
  useEffect(() => {
    loadSpend()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // REQ008/PLAN017 — SMS/OTP provider configuration
  const [smsProviders, setSmsProviders] = useState([])
  const [smsSelectedProvider, setSmsSelectedProvider] = useState('')
  const [smsSenderId, setSmsSenderId] = useState('')
  const [smsCredentials, setSmsCredentials] = useState({}) // { [fieldKey]: value }
  const [smsHasCredentials, setSmsHasCredentials] = useState(false)
  const [smsError, setSmsError] = useState(null)
  const [smsSaved, setSmsSaved] = useState(false)
  const [savingSms, setSavingSms] = useState(false)
  const [loadingSms, setLoadingSms] = useState(true)

  useEffect(() => {
    client
      .query({ query: GET_COMMUNICATION_SETTINGS, fetchPolicy: 'network-only' })
      .then(({ data }) => {
        const s = data?.myOrgCommunicationSettings
        if (!s) return
        setEmailFromName(s.email_from_name ?? '')
        setEmailFromAddress(s.email_from_address ?? '')
        setEmailReplyTo(s.email_reply_to ?? '')
        setEmailIncludeBranding(!!s.email_include_branding)
        setCapRupees(s.whatsapp_monthly_cap_rupees != null ? String(s.whatsapp_monthly_cap_rupees) : '')
      })
      .catch((err) => setEmailSettingsError(err.message))
  }, [client])

  useEffect(() => {
    Promise.all([
      client.query({ query: GET_NOTIFICATION_PROVIDERS, fetchPolicy: 'network-only' }),
      client.query({ query: GET_MY_NOTIFICATION_PROVIDER_CONFIG, variables: { channel: 'sms' }, fetchPolicy: 'network-only' }),
    ])
      .then(([{ data: providersData }, { data: configData }]) => {
        setSmsProviders(providersData?.notificationProviders ?? [])
        const cfg = configData?.myNotificationProviderConfig
        if (cfg) {
          setSmsSelectedProvider(cfg.provider ?? '')
          setSmsSenderId(cfg.sender_id ?? '')
          setSmsHasCredentials(!!cfg.has_credentials)
        }
      })
      .catch((err) => setSmsError(err.message))
      .finally(() => setLoadingSms(false))
  }, [client])

  const selectedSmsProvider = smsProviders.find((p) => p.id === smsSelectedProvider)

  // P1-11 — AI transcription provider configuration
  const [aiProviders, setAiProviders] = useState([])
  const [aiSelectedProvider, setAiSelectedProvider] = useState('')
  const [aiCredentials, setAiCredentials] = useState({})
  const [aiHasCredentials, setAiHasCredentials] = useState(false)
  const [aiError, setAiError] = useState(null)
  const [aiSaved, setAiSaved] = useState(false)
  const [savingAi, setSavingAi] = useState(false)
  const [loadingAi, setLoadingAi] = useState(true)

  useEffect(() => {
    Promise.all([
      client.query({ query: GET_AI_PROVIDERS, fetchPolicy: 'network-only' }),
      client.query({ query: GET_MY_AI_PROVIDER_CONFIG, fetchPolicy: 'network-only' }),
    ])
      .then(([{ data: providersData }, { data: configData }]) => {
        setAiProviders(providersData?.aiTranscriptionProviders ?? [])
        const cfg = configData?.myAiProviderConfig
        if (cfg) {
          setAiSelectedProvider(cfg.provider ?? '')
          setAiHasCredentials(!!cfg.has_credentials)
        }
      })
      .catch((err) => setAiError(err.message))
      .finally(() => setLoadingAi(false))
  }, [client])

  const selectedAiProvider = aiProviders.find((p) => p.id === aiSelectedProvider)

  const handleSaveAiSettings = async () => {
    setAiError(null)
    setSavingAi(true)
    try {
      const credentials = Object.entries(aiCredentials)
        .filter(([, v]) => v)
        .map(([key, value]) => ({ key, value }))
      const { data } = await client.mutate({
        mutation: UPDATE_AI_PROVIDER_CONFIG,
        variables: { input: { provider: aiSelectedProvider, credentials } },
      })
      if (!data?.updateMyAiProviderConfig?.success) {
        throw new Error(data?.updateMyAiProviderConfig?.message ?? 'Failed to save AI Scribe provider settings')
      }
      setAiHasCredentials(true)
      setAiCredentials({})
      setAiSaved(true)
      setTimeout(() => setAiSaved(false), 2500)
    } catch (err) {
      setAiError(err.message)
    } finally {
      setSavingAi(false)
    }
  }

  const handleSaveSmsSettings = async () => {
    setSmsError(null)
    setSavingSms(true)
    try {
      const credentials = Object.entries(smsCredentials)
        .filter(([, v]) => v)
        .map(([key, value]) => ({ key, value }))
      const { data } = await client.mutate({
        mutation: UPDATE_NOTIFICATION_PROVIDER_CONFIG,
        variables: { input: { channel: 'sms', provider: smsSelectedProvider, sender_id: smsSenderId || null, credentials } },
      })
      if (!data?.updateMyNotificationProviderConfig?.success) {
        throw new Error(data?.updateMyNotificationProviderConfig?.message ?? 'Failed to save SMS provider settings')
      }
      setSmsHasCredentials(true)
      setSmsCredentials({}) // clear entered secrets from memory once saved
      setSmsSaved(true)
      setTimeout(() => setSmsSaved(false), 2500)
    } catch (err) {
      setSmsError(err.message)
    } finally {
      setSavingSms(false)
    }
  }

  const handleSaveEmailSettings = async () => {
    setEmailSettingsError(null)
    setSavingEmailSettings(true)
    try {
      const { data } = await client.mutate({
        mutation: UPDATE_COMMUNICATION_SETTINGS,
        variables: {
          input: {
            email_from_name: emailFromName,
            email_from_address: emailFromAddress || null,
            email_reply_to: emailReplyTo || null,
            email_include_branding: emailIncludeBranding,
          },
        },
      })
      if (!data?.updateMyOrgCommunicationSettings?.success) {
        throw new Error(data?.updateMyOrgCommunicationSettings?.userErrors?.[0]?.message ?? 'Failed to save email settings')
      }
      setEmailSettingsSaved(true)
      setTimeout(() => setEmailSettingsSaved(false), 2500)
    } catch (err) {
      setEmailSettingsError(err.message)
    } finally {
      setSavingEmailSettings(false)
    }
  }

  // P1-01/REQ144 — a partial update: only whatsapp_monthly_cap_rupees is
  // sent, so the email fields above are left untouched by this codebase's
  // own "undefined = don't touch" convention (never re-sends the email
  // fields, so a stale local email draft here can never clobber a saved
  // value on a cap-only save).
  const handleSaveCap = async () => {
    setCapError(null)
    setSavingCap(true)
    try {
      const trimmed = capRupees.trim()
      const value = trimmed === '' ? null : Number(trimmed)
      if (value !== null && (Number.isNaN(value) || value < 0)) {
        throw new Error('Enter a non-negative amount, or leave blank to remove the cap')
      }
      const { data } = await client.mutate({
        mutation: UPDATE_COMMUNICATION_SETTINGS,
        variables: { input: { whatsapp_monthly_cap_rupees: value } },
      })
      if (!data?.updateMyOrgCommunicationSettings?.success) {
        throw new Error(data?.updateMyOrgCommunicationSettings?.userErrors?.[0]?.message ?? 'Failed to save the WhatsApp spend cap')
      }
      setCapSaved(true)
      setTimeout(() => setCapSaved(false), 2500)
    } catch (err) {
      setCapError(err.message)
    } finally {
      setSavingCap(false)
    }
  }

  const capRupeesNumber = whatsappSpend && capRupees.trim() !== '' && !Number.isNaN(Number(capRupees)) ? Number(capRupees) : null
  const capRemaining = capRupeesNumber != null && whatsappSpend ? capRupeesNumber - whatsappSpend.totalCostRupees : null
  const capUsedFraction = capRupeesNumber ? Math.min(1, (whatsappSpend?.totalCostRupees ?? 0) / capRupeesNumber) : 0

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h2" fontWeight={700}>
            Communications
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Email templates, SMS notifications &amp; delivery logs
          </Typography>
        </Box>
      </Stack>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: '1px solid #D0E8EA' }}>
        <Tab label="Notification Templates" />
        <Tab label="Global Settings" />
        <Tab label="Send Test Message" />
      </Tabs>

      {/* Templates — real backend/src/email-templates data */}
      {tab === 0 && (
        <Stack spacing={2}>
          <Alert severity="info">
            Toggle a template on/off here. To edit the subject or body, use the full editor on the Email Templates page.
          </Alert>
          {templatesError && (
            <Alert severity="error" onClose={() => setTemplatesError(null)}>
              {templatesError}
            </Alert>
          )}
          {loadingTemplates ? (
            <Box display="flex" justifyContent="center" py={6}>
              <CircularProgress />
            </Box>
          ) : templates.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Typography color="text.secondary">No email templates found.</Typography>
              </CardContent>
            </Card>
          ) : (
            templates.map((t) => (
              <Card key={t.id} sx={{ border: '1px solid #D0E8EA', opacity: t.is_active ? 1 : 0.6 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                    <Box flex={1} minWidth={200}>
                      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography fontWeight={700}>{t.name || TEMPLATE_TYPE_LABELS[t.type] || t.type}</Typography>
                        <Chip
                          icon={<EmailIcon sx={{ fontSize: 14 }} />}
                          label="EMAIL"
                          size="small"
                          sx={{ bgcolor: '#DBEAFE', color: '#1E40AF', fontWeight: 700 }}
                        />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Type: <strong>{TEMPLATE_TYPE_LABELS[t.type] || t.type}</strong>
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconButton size="small" onClick={() => setPreviewTemplate(t)}>
                        <PreviewIcon fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => navigate('/admin/email-templates')}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={t.is_active}
                            disabled={togglingId === t.id}
                            onChange={() => toggleTemplateActive(t)}
                            size="small"
                          />
                        }
                        label={<Typography variant="caption">{t.is_active ? 'Active' : 'Off'}</Typography>}
                        labelPlacement="start"
                        sx={{ mr: 0, ml: 1 }}
                      />
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))
          )}
        </Stack>
      )}

      {/* Read-only preview — full editing lives on the Email Templates page */}
      <Dialog open={!!previewTemplate} onClose={() => setPreviewTemplate(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Preview: {previewTemplate?.name || TEMPLATE_TYPE_LABELS[previewTemplate?.type] || previewTemplate?.type}
          <IconButton size="small" onClick={() => setPreviewTemplate(null)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" gutterBottom>
            Subject:
          </Typography>
          <Box sx={{ p: 1.5, bgcolor: 'grey.100', borderRadius: 1, mb: 2, fontFamily: 'monospace' }}>{previewTemplate?.subject}</Box>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" gutterBottom>
            Body:
          </Typography>
          <Box
            sx={{
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              whiteSpace: 'pre-wrap',
              overflowX: 'auto',
              border: '1px solid',
              borderColor: 'divider',
              minHeight: 160,
            }}
          >
            {previewTemplate?.body}
          </Box>
        </DialogContent>
      </Dialog>

      {/* Global Settings */}
      {tab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <EmailIcon sx={{ color: '#006D77' }} />
                  <Typography variant="h5" component="h3" fontWeight={700}>
                    Email Settings
                  </Typography>
                </Stack>
                {emailSettingsSaved && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    Email settings saved.
                  </Alert>
                )}
                {emailSettingsError && (
                  <Alert severity="error" sx={{ mb: 2 }} onClose={() => setEmailSettingsError(null)}>
                    {emailSettingsError}
                  </Alert>
                )}
                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label="From Name"
                    value={emailFromName}
                    onChange={(e) => setEmailFromName(e.target.value)}
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="From Email"
                    placeholder="noreply@healthsync.dev"
                    value={emailFromAddress}
                    onChange={(e) => setEmailFromAddress(e.target.value)}
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="Reply-To"
                    placeholder="support@healthsync.dev"
                    value={emailReplyTo}
                    onChange={(e) => setEmailReplyTo(e.target.value)}
                    size="small"
                  />
                  <FormControlLabel
                    control={<Switch checked={emailIncludeBranding} onChange={(e) => setEmailIncludeBranding(e.target.checked)} />}
                    label="Include clinic branding in emails"
                  />
                  <Button variant="contained" size="small" disabled={savingEmailSettings} onClick={handleSaveEmailSettings}>
                    {savingEmailSettings ? 'Saving…' : 'Save Email Settings'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <SmsIcon sx={{ color: '#006D77' }} />
                  <Typography variant="h5" component="h3" fontWeight={700}>
                    OTP / SMS Provider
                  </Typography>
                </Stack>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Choose your organization's own SMS provider and enter its credentials — used for OTP login and SMS notifications.
                  Credentials are encrypted at rest and never shown again once saved.
                </Alert>
                {smsSaved && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    SMS provider settings saved.
                  </Alert>
                )}
                {smsError && (
                  <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSmsError(null)}>
                    {smsError}
                  </Alert>
                )}
                <Stack spacing={2}>
                  <FormControl fullWidth size="small" disabled={loadingSms}>
                    {/* P1-03 (CI-7, A11Y-12) — an axe-core scan found this
                        Select had no accessible name at all with no value
                        selected yet: `label` alone doesn't reliably wire
                        aria-labelledby without an explicit id/labelId pair. */}
                    <InputLabel id="sms-provider-label">SMS Provider</InputLabel>
                    <Select
                      labelId="sms-provider-label"
                      label="SMS Provider"
                      value={smsSelectedProvider}
                      onChange={(e) => {
                        setSmsSelectedProvider(e.target.value)
                        setSmsCredentials({})
                      }}
                    >
                      {smsProviders.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {selectedSmsProvider && (
                    <>
                      {selectedSmsProvider.fields.map((f) => (
                        <TextField
                          key={f.key}
                          fullWidth
                          size="small"
                          label={f.label + (f.required ? '' : ' (optional)')}
                          type={f.type === 'password' ? 'password' : 'text'}
                          value={smsCredentials[f.key] ?? ''}
                          onChange={(e) => setSmsCredentials((prev) => ({ ...prev, [f.key]: e.target.value }))}
                          placeholder={smsHasCredentials ? '••••••••  (leave blank to keep current)' : ''}
                        />
                      ))}
                      <TextField
                        fullWidth
                        size="small"
                        label="SMS Sender Name"
                        value={smsSenderId}
                        onChange={(e) => setSmsSenderId(e.target.value)}
                      />
                    </>
                  )}

                  {smsHasCredentials && (
                    <Chip
                      size="small"
                      label="Credentials configured"
                      sx={{ bgcolor: '#D1FAE5', color: '#065F46', fontWeight: 700, alignSelf: 'flex-start' }}
                    />
                  )}

                  <Button variant="contained" size="small" disabled={savingSms || !smsSelectedProvider} onClick={handleSaveSmsSettings}>
                    {savingSms ? 'Saving…' : 'Save SMS Provider Settings'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* P1-11 (FR-AI-12) — AI Scribe transcription provider */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <AutoAwesomeIcon sx={{ color: theme.palette.primary.main }} />
                  <Typography variant="h5" component="h3" fontWeight={700}>
                    AI Scribe (Consultation Transcription)
                  </Typography>
                </Stack>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Choose the speech-to-text provider used to draft consultation notes from a recorded conversation. Credentials are
                  encrypted at rest and never shown again once saved. Also requires the AI Scribe feature on your plan.
                </Alert>
                {aiSaved && (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    AI Scribe provider settings saved.
                  </Alert>
                )}
                {aiError && (
                  <Alert severity="error" sx={{ mb: 2 }} onClose={() => setAiError(null)}>
                    {aiError}
                  </Alert>
                )}
                <Stack spacing={2}>
                  <FormControl fullWidth size="small" disabled={loadingAi}>
                    <InputLabel id="ai-provider-label">Transcription Provider</InputLabel>
                    <Select
                      labelId="ai-provider-label"
                      label="Transcription Provider"
                      value={aiSelectedProvider}
                      onChange={(e) => {
                        setAiSelectedProvider(e.target.value)
                        setAiCredentials({})
                      }}
                    >
                      {aiProviders.map((p) => (
                        <MenuItem key={p.id} value={p.id}>
                          {p.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {selectedAiProvider &&
                    selectedAiProvider.fields.map((f) => (
                      <TextField
                        key={f.key}
                        fullWidth
                        size="small"
                        label={f.label + (f.required ? '' : ' (optional)')}
                        type={f.type === 'password' ? 'password' : 'text'}
                        value={aiCredentials[f.key] ?? ''}
                        onChange={(e) => setAiCredentials((prev) => ({ ...prev, [f.key]: e.target.value }))}
                        placeholder={aiHasCredentials ? '••••••••  (leave blank to keep current)' : ''}
                      />
                    ))}

                  {aiHasCredentials && (
                    <Chip
                      size="small"
                      label="Credentials configured"
                      sx={{ bgcolor: '#D1FAE5', color: '#065F46', fontWeight: 700, alignSelf: 'flex-start' }}
                    />
                  )}

                  <Button variant="contained" size="small" disabled={savingAi || !aiSelectedProvider} onClick={handleSaveAiSettings}>
                    {savingAi ? 'Saving…' : 'Save AI Scribe Settings'}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* P1-01/REQ144 — WhatsApp conversation spend + monthly cap */}
          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <MonetizationOnIcon sx={{ color: theme.palette.primary.main }} />
                  <Typography variant="h5" component="h3" fontWeight={700}>
                    WhatsApp Conversation Spend
                  </Typography>
                </Stack>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Meta bills WhatsApp by conversation category — utility/authentication (₹0.115) is 7.5× cheaper than marketing (₹0.863).
                  Category is always assigned by the notification type, never editable here, so a reminder can never be sent at the
                  marketing rate.
                </Alert>
                {spendError && (
                  <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSpendError(null)}>
                    {spendError}
                  </Alert>
                )}

                {loadingSpend ? (
                  <Box display="flex" justifyContent="center" py={4}>
                    <CircularProgress size={28} />
                  </Box>
                ) : !whatsappSpend ? (
                  spendError ? null : (
                    <Typography variant="body2" color="text.secondary">
                      Spend data isn't available right now.
                    </Typography>
                  )
                ) : (
                  <Stack spacing={2}>
                    <Typography variant="caption" color="text.secondary">
                      Billing period: {new Date(whatsappSpend.periodStart).toLocaleDateString('en-IN')} –{' '}
                      {new Date(whatsappSpend.periodEnd).toLocaleDateString('en-IN')} (IST)
                    </Typography>

                    {whatsappSpend.byCategory.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No billable WhatsApp conversations yet this period.
                      </Typography>
                    ) : (
                      <TableContainer sx={{ maxWidth: 480 }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Category</TableCell>
                              <TableCell align="right">Conversations</TableCell>
                              <TableCell align="right">Cost</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {whatsappSpend.byCategory.map((c) => (
                              <TableRow key={c.category}>
                                <TableCell sx={{ textTransform: 'capitalize' }}>{c.category}</TableCell>
                                <TableCell align="right">{c.count}</TableCell>
                                <TableCell align="right">₹{c.costRupees.toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                            <TableRow>
                              <TableCell sx={{ fontWeight: 700 }}>Total</TableCell>
                              <TableCell />
                              <TableCell align="right" sx={{ fontWeight: 700 }}>
                                ₹{whatsappSpend.totalCostRupees.toFixed(2)}
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </TableContainer>
                    )}

                    <Divider />

                    {capSaved && <Alert severity="success">WhatsApp spend cap saved.</Alert>}
                    {capError && (
                      <Alert severity="error" onClose={() => setCapError(null)}>
                        {capError}
                      </Alert>
                    )}

                    <Stack direction="row" spacing={2} alignItems="flex-end" flexWrap="wrap" useFlexGap>
                      <TextField
                        label="Monthly cap (₹, optional)"
                        size="small"
                        value={capRupees}
                        onChange={(e) => setCapRupees(e.target.value)}
                        placeholder="No cap configured"
                        sx={{ maxWidth: 220 }}
                        inputProps={{ inputMode: 'decimal', 'aria-label': 'WhatsApp monthly spend cap in rupees' }}
                      />
                      <Button variant="contained" size="small" disabled={savingCap} onClick={handleSaveCap}>
                        {savingCap ? 'Saving…' : 'Save Cap'}
                      </Button>
                    </Stack>

                    {capRupeesNumber != null && (
                      <Box>
                        <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            ₹{whatsappSpend.totalCostRupees.toFixed(2)} of ₹{capRupeesNumber.toFixed(2)} used this period
                          </Typography>
                          <Typography
                            variant="caption"
                            fontWeight={700}
                            color={capRemaining != null && capRemaining < 0 ? 'error.main' : 'text.secondary'}
                          >
                            {capRemaining != null && capRemaining < 0
                              ? `₹${Math.abs(capRemaining).toFixed(2)} over cap`
                              : `₹${(capRemaining ?? 0).toFixed(2)} remaining`}
                          </Typography>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={capUsedFraction * 100}
                          color={capUsedFraction >= 1 ? 'error' : capUsedFraction >= 0.8 ? 'warning' : 'primary'}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                      </Box>
                    )}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Test Message */}
      {tab === 2 && (
        <Box sx={{ maxWidth: 500 }}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h5" component="h3" fontWeight={700} sx={{ mb: 2 }}>
                Send Test Notification
              </Typography>
              {sent && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Test message sent successfully!
                </Alert>
              )}
              <Stack spacing={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Template</InputLabel>
                  <Select label="Template" defaultValue={1}>
                    {templates.map((t) => (
                      <MenuItem key={t.id} value={t.id}>
                        {t.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small">
                  <InputLabel>Channel</InputLabel>
                  <Select label="Channel" defaultValue="email">
                    <MenuItem value="email">Email</MenuItem>
                    <MenuItem value="sms">SMS</MenuItem>
                  </Select>
                </FormControl>
                <TextField
                  fullWidth
                  label="Send to (email or phone)"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  size="small"
                />
                <Button
                  variant="contained"
                  startIcon={<SendIcon />}
                  onClick={() => {
                    setSent(true)
                    setTimeout(() => setSent(false), 4000)
                  }}
                  disabled={!testEmail}
                >
                  Send Test
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  )
}
