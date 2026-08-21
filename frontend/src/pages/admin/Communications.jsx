import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApolloClient, gql } from '@apollo/client';
import {
  Box, Grid, Typography, Card, CardContent, Stack, Button, Chip, Tab, Tabs,
  TextField, Paper, Switch, FormControlLabel, Select, MenuItem,
  FormControl, InputLabel, Divider, IconButton, Alert, Dialog, DialogTitle,
  DialogContent, CircularProgress,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import SmsIcon from '@mui/icons-material/Sms';
import NotificationsIcon from '@mui/icons-material/Notifications';
import EditIcon from '@mui/icons-material/Edit';
import PreviewIcon from '@mui/icons-material/Preview';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';

// REQ011 — real backend/src/email-templates data (the same module and rows
// admin/EmailTemplates.jsx's full editor uses), replacing a 100% hardcoded
// local array. Every real template is email-only (no SMS-template concept
// exists on this model) -- the mock's fabricated "channel"/"email+sms"
// distinction is dropped rather than carried forward. Full subject/body
// editing stays on the dedicated Email Templates page (avoids maintaining
// two copies of that editor); this tab does real active/inactive toggling
// and a real read-only preview.
const GET_EMAIL_TEMPLATES = gql`
  query GetNotificationEmailTemplates { emailTemplates { id name type subject body variables is_active } }
`;
const UPDATE_EMAIL_TEMPLATE_ACTIVE = gql`
  mutation UpdateEmailTemplateActive($id: ID!, $input: UpdateEmailTemplateInput!) {
    updateEmailTemplate(id: $id, input: $input) { success userErrors { message } template { id is_active } }
  }
`;
const TEMPLATE_TYPE_LABELS = {
  appointment_confirmation: 'Appointment Confirmation',
  appointment_reminder: 'Appointment Reminder',
  appointment_cancellation: 'Appointment Cancellation',
  appointment_rescheduled: 'Appointment Rescheduled',
  password_reset: 'Password Reset',
  welcome: 'Welcome',
  invoice: 'Invoice / Receipt',
  cancellation_fee: 'Cancellation Fee',
};

// REQ006 — Global Settings tab, Email half.
const GET_COMMUNICATION_SETTINGS = gql`
  query GetOrgCommunicationSettings {
    myOrgCommunicationSettings { email_from_name email_from_address email_reply_to email_include_branding }
  }
`;
const UPDATE_COMMUNICATION_SETTINGS = gql`
  mutation UpdateOrgCommunicationSettings($input: UpdateOrgCommunicationSettingsInput!) {
    updateMyOrgCommunicationSettings(input: $input) { success userErrors { message } }
  }
`;

// REQ008/PLAN017 — SMS half: rebuilt as a generic, provider-agnostic OTP/SMS
// configuration (per this session's redirect away from a single fixed
// vendor). notificationProviders is the public catalog of registered
// providers (MSG91, Gupshup, Twilio, AWS SNS) and their own credential
// field shapes; myNotificationProviderConfig/updateMyNotificationProviderConfig
// are org-scoped and never return raw credentials (has_credentials only).
const GET_NOTIFICATION_PROVIDERS = gql`
  query GetNotificationProviders { notificationProviders { id label channel fields { key label type required } } }
`;
const GET_MY_NOTIFICATION_PROVIDER_CONFIG = gql`
  query GetMyNotificationProviderConfig($channel: String!) {
    myNotificationProviderConfig(channel: $channel) { channel provider sender_id has_credentials }
  }
`;
const UPDATE_NOTIFICATION_PROVIDER_CONFIG = gql`
  mutation UpdateMyNotificationProviderConfig($input: UpdateNotificationProviderConfigInput!) {
    updateMyNotificationProviderConfig(input: $input) { success message }
  }
`;

export default function AdminCommunications() {
  const client = useApolloClient();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [previewTemplate, setPreviewTemplate] = useState(null);
  const [tab, setTab] = useState(0);
  const [testEmail, setTestEmail] = useState('');
  const [sent, setSent] = useState(false);

  const loadTemplates = () => {
    setLoadingTemplates(true)
    client.query({ query: GET_EMAIL_TEMPLATES, fetchPolicy: 'network-only' })
      .then(({ data }) => setTemplates(data?.emailTemplates ?? []))
      .catch((err) => setTemplatesError(err.message))
      .finally(() => setLoadingTemplates(false))
  }
  useEffect(() => { loadTemplates() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTemplateActive = async (t) => {
    setTemplatesError(null); setTogglingId(t.id)
    try {
      const { data } = await client.mutate({
        mutation: UPDATE_EMAIL_TEMPLATE_ACTIVE,
        variables: { id: t.id, input: { subject: t.subject, body: t.body, is_active: !t.is_active } },
      })
      if (!data?.updateEmailTemplate?.success) {
        throw new Error(data?.updateEmailTemplate?.userErrors?.[0]?.message ?? 'Failed to update template')
      }
      setTemplates((prev) => prev.map((row) => row.id === t.id ? { ...row, is_active: !row.is_active } : row))
    } catch (err) { setTemplatesError(err.message) }
    finally { setTogglingId(null) }
  }

  const [emailFromName, setEmailFromName] = useState('');
  const [emailFromAddress, setEmailFromAddress] = useState('');
  const [emailReplyTo, setEmailReplyTo] = useState('');
  const [emailIncludeBranding, setEmailIncludeBranding] = useState(true);
  const [emailSettingsError, setEmailSettingsError] = useState(null);
  const [emailSettingsSaved, setEmailSettingsSaved] = useState(false);
  const [savingEmailSettings, setSavingEmailSettings] = useState(false);

  // REQ008/PLAN017 — SMS/OTP provider configuration
  const [smsProviders, setSmsProviders] = useState([]);
  const [smsSelectedProvider, setSmsSelectedProvider] = useState('');
  const [smsSenderId, setSmsSenderId] = useState('');
  const [smsCredentials, setSmsCredentials] = useState({}); // { [fieldKey]: value }
  const [smsHasCredentials, setSmsHasCredentials] = useState(false);
  const [smsError, setSmsError] = useState(null);
  const [smsSaved, setSmsSaved] = useState(false);
  const [savingSms, setSavingSms] = useState(false);
  const [loadingSms, setLoadingSms] = useState(true);

  useEffect(() => {
    client.query({ query: GET_COMMUNICATION_SETTINGS, fetchPolicy: 'network-only' })
      .then(({ data }) => {
        const s = data?.myOrgCommunicationSettings;
        if (!s) return
        setEmailFromName(s.email_from_name ?? '')
        setEmailFromAddress(s.email_from_address ?? '')
        setEmailReplyTo(s.email_reply_to ?? '')
        setEmailIncludeBranding(!!s.email_include_branding)
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

  const handleSaveSmsSettings = async () => {
    setSmsError(null); setSavingSms(true)
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
      setSmsSaved(true); setTimeout(() => setSmsSaved(false), 2500)
    } catch (err) { setSmsError(err.message) }
    finally { setSavingSms(false) }
  }

  const handleSaveEmailSettings = async () => {
    setEmailSettingsError(null); setSavingEmailSettings(true)
    try {
      const { data } = await client.mutate({
        mutation: UPDATE_COMMUNICATION_SETTINGS,
        variables: { input: {
          email_from_name: emailFromName,
          email_from_address: emailFromAddress || null,
          email_reply_to: emailReplyTo || null,
          email_include_branding: emailIncludeBranding,
        } },
      })
      if (!data?.updateMyOrgCommunicationSettings?.success) {
        throw new Error(data?.updateMyOrgCommunicationSettings?.userErrors?.[0]?.message ?? 'Failed to save email settings')
      }
      setEmailSettingsSaved(true); setTimeout(() => setEmailSettingsSaved(false), 2500)
    } catch (err) { setEmailSettingsError(err.message) }
    finally { setSavingEmailSettings(false) }
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h2" fontWeight={700}>Communications</Typography>
          <Typography variant="body2" color="text.secondary">Email templates, SMS notifications &amp; delivery logs</Typography>
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
          {templatesError && <Alert severity="error" onClose={() => setTemplatesError(null)}>{templatesError}</Alert>}
          {loadingTemplates ? (
            <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
          ) : templates.length === 0 ? (
            <Card><CardContent sx={{ textAlign: 'center', py: 4 }}><Typography color="text.secondary">No email templates found.</Typography></CardContent></Card>
          ) : templates.map((t) => (
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
                    <IconButton size="small" onClick={() => setPreviewTemplate(t)}><PreviewIcon fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => navigate('/admin/email-templates')}><EditIcon fontSize="small" /></IconButton>
                    <FormControlLabel
                      control={<Switch checked={t.is_active} disabled={togglingId === t.id} onChange={() => toggleTemplateActive(t)} size="small" />}
                      label={<Typography variant="caption">{t.is_active ? 'Active' : 'Off'}</Typography>}
                      labelPlacement="start"
                      sx={{ mr: 0, ml: 1 }}
                    />
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Read-only preview — full editing lives on the Email Templates page */}
      <Dialog open={!!previewTemplate} onClose={() => setPreviewTemplate(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Preview: {previewTemplate?.name || TEMPLATE_TYPE_LABELS[previewTemplate?.type] || previewTemplate?.type}
          <IconButton size="small" onClick={() => setPreviewTemplate(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" gutterBottom>Subject:</Typography>
          <Box sx={{ p: 1.5, bgcolor: 'grey.100', borderRadius: 1, mb: 2, fontFamily: 'monospace' }}>{previewTemplate?.subject}</Box>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" gutterBottom>Body:</Typography>
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap', overflowX: 'auto', border: '1px solid', borderColor: 'divider', minHeight: 160 }}>
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
                  <Typography variant="h5" fontWeight={700}>Email Settings</Typography>
                </Stack>
                {emailSettingsSaved && <Alert severity="success" sx={{ mb: 2 }}>Email settings saved.</Alert>}
                {emailSettingsError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setEmailSettingsError(null)}>{emailSettingsError}</Alert>}
                <Stack spacing={2}>
                  <TextField fullWidth label="From Name" value={emailFromName} onChange={(e) => setEmailFromName(e.target.value)} size="small" />
                  <TextField fullWidth label="From Email" placeholder="noreply@healthsync.dev" value={emailFromAddress} onChange={(e) => setEmailFromAddress(e.target.value)} size="small" />
                  <TextField fullWidth label="Reply-To" placeholder="support@healthsync.dev" value={emailReplyTo} onChange={(e) => setEmailReplyTo(e.target.value)} size="small" />
                  <FormControlLabel control={<Switch checked={emailIncludeBranding} onChange={(e) => setEmailIncludeBranding(e.target.checked)} />} label="Include clinic branding in emails" />
                  <Button variant="contained" size="small" disabled={savingEmailSettings} onClick={handleSaveEmailSettings}>{savingEmailSettings ? 'Saving…' : 'Save Email Settings'}</Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <SmsIcon sx={{ color: '#006D77' }} />
                  <Typography variant="h5" fontWeight={700}>OTP / SMS Provider</Typography>
                </Stack>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Choose your organization's own SMS provider and enter its credentials — used for OTP login and SMS notifications. Credentials are encrypted at rest and never shown again once saved.
                </Alert>
                {smsSaved && <Alert severity="success" sx={{ mb: 2 }}>SMS provider settings saved.</Alert>}
                {smsError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSmsError(null)}>{smsError}</Alert>}
                <Stack spacing={2}>
                  <FormControl fullWidth size="small" disabled={loadingSms}>
                    <InputLabel>SMS Provider</InputLabel>
                    <Select
                      label="SMS Provider"
                      value={smsSelectedProvider}
                      onChange={(e) => { setSmsSelectedProvider(e.target.value); setSmsCredentials({}) }}
                    >
                      {smsProviders.map((p) => <MenuItem key={p.id} value={p.id}>{p.label}</MenuItem>)}
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
                      <TextField fullWidth size="small" label="SMS Sender Name" value={smsSenderId} onChange={(e) => setSmsSenderId(e.target.value)} />
                    </>
                  )}

                  {smsHasCredentials && (
                    <Chip size="small" label="Credentials configured" sx={{ bgcolor: '#D1FAE5', color: '#065F46', fontWeight: 700, alignSelf: 'flex-start' }} />
                  )}

                  <Button variant="contained" size="small" disabled={savingSms || !smsSelectedProvider} onClick={handleSaveSmsSettings}>
                    {savingSms ? 'Saving…' : 'Save SMS Provider Settings'}
                  </Button>
                </Stack>
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
              <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Send Test Notification</Typography>
              {sent && <Alert severity="success" sx={{ mb: 2 }}>Test message sent successfully!</Alert>}
              <Stack spacing={2}>
                <FormControl fullWidth size="small"><InputLabel>Template</InputLabel>
                  <Select label="Template" defaultValue={1}>
                    {templates.map((t) => <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>)}
                  </Select>
                </FormControl>
                <FormControl fullWidth size="small"><InputLabel>Channel</InputLabel>
                  <Select label="Channel" defaultValue="email">
                    <MenuItem value="email">Email</MenuItem>
                    <MenuItem value="sms">SMS</MenuItem>
                  </Select>
                </FormControl>
                <TextField fullWidth label="Send to (email or phone)" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} size="small" />
                <Button variant="contained" startIcon={<SendIcon />} onClick={() => { setSent(true); setTimeout(() => setSent(false), 4000); }} disabled={!testEmail}>
                  Send Test
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
}
