import React, { useState, useEffect } from 'react';
import { useApolloClient, gql } from '@apollo/client';
import {
  Box, Grid, Typography, Card, CardContent, Stack, Button, Chip, Tab, Tabs,
  TextField, Paper, Switch, FormControlLabel, Select, MenuItem,
  FormControl, InputLabel, Divider, IconButton, Alert,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import SmsIcon from '@mui/icons-material/Sms';
import NotificationsIcon from '@mui/icons-material/Notifications';
import EditIcon from '@mui/icons-material/Edit';
import PreviewIcon from '@mui/icons-material/Preview';
import SendIcon from '@mui/icons-material/Send';

const EMAIL_TEMPLATES = [
  { id: 1, name: 'Appointment Confirmation', trigger: 'On booking', channel: 'email', active: true },
  { id: 2, name: '24-Hour Reminder',         trigger: '24h before', channel: 'email+sms', active: true },
  { id: 3, name: 'Appointment Cancellation', trigger: 'On cancel',  channel: 'email', active: true },
  { id: 4, name: 'Payment Receipt',          trigger: 'On payment', channel: 'email', active: true },
  { id: 5, name: 'Follow-up Survey',         trigger: '24h after',  channel: 'email', active: false },
  { id: 6, name: 'Video Call Reminder',      trigger: '15min before',channel: 'sms',  active: true },
];

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
  const [templates, setTemplates] = useState(EMAIL_TEMPLATES);
  const [tab, setTab] = useState(0);
  const [testEmail, setTestEmail] = useState('');
  const [sent, setSent] = useState(false);

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

  const toggle = (id) => setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, active: !t.active } : t));

  const CHANNEL_ICON = { email: <EmailIcon sx={{ fontSize: 16 }} />, sms: <SmsIcon sx={{ fontSize: 16 }} />, 'email+sms': null };

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

      {/* Templates */}
      {tab === 0 && (
        <Stack spacing={2}>
          <Alert severity="info">Templates are sent automatically based on triggers. Toggle to enable/disable each notification.</Alert>
          {templates.map((t) => (
            <Card key={t.id} sx={{ border: '1px solid #D0E8EA', opacity: t.active ? 1 : 0.6 }}>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box flex={1}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.5 }}>
                      <Typography fontWeight={700}>{t.name}</Typography>
                      {t.channel.split('+').map((ch) => (
                        <Chip
                          key={ch}
                          icon={ch === 'email' ? <EmailIcon sx={{ fontSize: 14 }} /> : <SmsIcon sx={{ fontSize: 14 }} />}
                          label={ch.toUpperCase()}
                          size="small"
                          sx={{ bgcolor: ch === 'email' ? '#DBEAFE' : '#D1FAE5', color: ch === 'email' ? '#1E40AF' : '#065F46', fontWeight: 700 }}
                        />
                      ))}
                    </Stack>
                    <Typography variant="body2" color="text.secondary">Trigger: <strong>{t.trigger}</strong></Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <IconButton size="small"><PreviewIcon fontSize="small" /></IconButton>
                    <IconButton size="small"><EditIcon fontSize="small" /></IconButton>
                    <FormControlLabel
                      control={<Switch checked={t.active} onChange={() => toggle(t.id)} size="small" />}
                      label={<Typography variant="caption">{t.active ? 'Active' : 'Off'}</Typography>}
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
