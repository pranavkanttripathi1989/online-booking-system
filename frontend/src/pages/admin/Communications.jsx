import React, { useState } from 'react';
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

export default function AdminCommunications() {
  const [templates, setTemplates] = useState(EMAIL_TEMPLATES);
  const [tab, setTab] = useState(0);
  const [testEmail, setTestEmail] = useState('');
  const [sent, setSent] = useState(false);

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
                <Stack spacing={2}>
                  <TextField fullWidth label="From Name" defaultValue="HealthSync" size="small" />
                  <TextField fullWidth label="From Email" defaultValue="noreply@healthsync.dev" size="small" />
                  <TextField fullWidth label="Reply-To" defaultValue="support@healthsync.dev" size="small" />
                  <FormControlLabel control={<Switch defaultChecked />} label="Include clinic branding in emails" />
                  <Button variant="contained" size="small">Save Email Settings</Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <SmsIcon sx={{ color: '#006D77' }} />
                  <Typography variant="h5" fontWeight={700}>SMS Settings</Typography>
                </Stack>
                <Stack spacing={2}>
                  <TextField fullWidth label="SMS Sender Name" defaultValue="HealthSync" size="small" />
                  <FormControl fullWidth size="small"><InputLabel>SMS Provider</InputLabel>
                    <Select label="SMS Provider" defaultValue="twilio"><MenuItem value="twilio">Twilio</MenuItem><MenuItem value="vonage">Vonage</MenuItem></Select>
                  </FormControl>
                  <TextField fullWidth label="API Key" type="password" size="small" />
                  <FormControlLabel control={<Switch defaultChecked />} label="Opt-out message in all SMS" />
                  <Button variant="contained" size="small">Save SMS Settings</Button>
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
