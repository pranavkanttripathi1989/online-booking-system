import React, { useState } from 'react';
import {
  Box, Grid, Typography, Card, CardContent, Stack, Button, Chip, Avatar,
  Divider, TextField, Paper, IconButton, Alert, Switch, FormControlLabel,
} from '@mui/material';
import { PatientAvatar } from '../../components/shared';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import ShieldIcon from '@mui/icons-material/Shield';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';

const INITIAL = {
  firstName: 'Emma',   lastName: 'Wilson',
  email: 'emma.wilson@email.com', phone: '+44 7700 123456',
  dob: '1990-04-12',  gender: 'Female', bloodType: 'A+',
  address: '14 Maple Street, London, W1A 1AA',
  allergies: ['Penicillin', 'Latex'],
  conditions: ['Hypertension', 'Asthma'],
  insurance: { provider: 'Bupa Health', policyNo: 'BP-2026-44812', expires: '2027-01-01' },
  notifications: { email: true, sms: true, reminders: true, newsletter: false },
};

export default function PatientProfile() {
  const [profile, setProfile] = useState(INITIAL);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(INITIAL);
  const [saveOk, setSaveOk]   = useState(false);

  const handleSave = () => {
    setProfile(draft);
    setEditing(false);
    setSaveOk(true);
    setTimeout(() => setSaveOk(false), 3000);
  };

  const field = (label, key, type = 'text') => (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>{label}</Typography>
      {editing
        ? <TextField fullWidth size="small" type={type} value={draft[key] || ''} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />
        : <Typography variant="body2" fontWeight={500}>{profile[key] || '—'}</Typography>
      }
    </Box>
  );

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h2" fontWeight={700}>My Profile</Typography>
        {editing ? (
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<CancelIcon />} onClick={() => { setEditing(false); setDraft(profile); }}>Discard</Button>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave}>Save Changes</Button>
          </Stack>
        ) : (
          <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setEditing(true)}>Edit Profile</Button>
        )}
      </Stack>

      {saveOk && <Alert severity="success" sx={{ mb: 2 }}>Profile updated successfully!</Alert>}

      <Grid container spacing={3}>
        {/* Left — avatar card */}
        <Grid item xs={12} md={3}>
          <Card sx={{ textAlign: 'center', p: 3 }}>
            <Avatar sx={{ width: 80, height: 80, bgcolor: '#006D77', fontSize: '1.8rem', fontWeight: 800, mx: 'auto', mb: 2 }}>
              {profile.firstName[0]}{profile.lastName[0]}
            </Avatar>
            <Typography fontWeight={700}>{profile.firstName} {profile.lastName}</Typography>
            <Typography variant="body2" color="text.secondary">{profile.email}</Typography>
            <Chip label="Patient" sx={{ mt: 1, bgcolor: '#E8F8F9', color: '#006D77', fontWeight: 700 }} />
            <Divider sx={{ my: 2 }} />
            <Stack spacing={0.75} sx={{ textAlign: 'left' }}>
              {[
                { label: 'Blood Type', value: profile.bloodType },
                { label: 'Date of Birth', value: profile.dob },
                { label: 'Gender', value: profile.gender },
              ].map(({ label, value }) => (
                <Box key={label}>
                  <Typography variant="caption" color="text.secondary">{label}</Typography>
                  <Typography variant="body2" fontWeight={600}>{value}</Typography>
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
                <Typography variant="h5" fontWeight={700} sx={{ mb: 2.5 }}>Personal Information</Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>{field('First Name', 'firstName')}</Grid>
                  <Grid item xs={12} sm={6}>{field('Last Name', 'lastName')}</Grid>
                  <Grid item xs={12} sm={6}>{field('Email Address', 'email', 'email')}</Grid>
                  <Grid item xs={12} sm={6}>{field('Phone Number', 'phone', 'tel')}</Grid>
                  <Grid item xs={12} sm={6}>{field('Date of Birth', 'dob', 'date')}</Grid>
                  <Grid item xs={12} sm={6}>{field('Gender', 'gender')}</Grid>
                  <Grid item xs={12}>{field('Home Address', 'address')}</Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Medical Info */}
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
                  <MedicalServicesIcon sx={{ color: '#006D77', fontSize: 20 }} />
                  <Typography variant="h5" fontWeight={700}>Medical Information</Typography>
                </Stack>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Allergies</Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.75}>
                      {profile.allergies.map((a) => <Chip key={a} label={a} size="small" color="error" variant="outlined" />)}
                      {editing && <Chip label="+ Add" size="small" variant="outlined" sx={{ cursor: 'pointer' }} />}
                    </Stack>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Existing Conditions</Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.75}>
                      {profile.conditions.map((c) => <Chip key={c} label={c} size="small" color="warning" variant="outlined" />)}
                      {editing && <Chip label="+ Add" size="small" variant="outlined" sx={{ cursor: 'pointer' }} />}
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Insurance */}
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
                  <ShieldIcon sx={{ color: '#006D77', fontSize: 20 }} />
                  <Typography variant="h5" fontWeight={700}>Insurance</Typography>
                </Stack>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">Provider</Typography>
                    <Typography fontWeight={600}>{profile.insurance.provider}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">Policy Number</Typography>
                    <Typography fontWeight={600}>{profile.insurance.policyNo}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">Expires</Typography>
                    <Typography fontWeight={600}>{profile.insurance.expires}</Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <NotificationsIcon sx={{ color: '#006D77', fontSize: 20 }} />
                  <Typography variant="h5" fontWeight={700}>Notification Preferences</Typography>
                </Stack>
                <Grid container spacing={1}>
                  {[
                    { key: 'email',     label: 'Email notifications' },
                    { key: 'sms',       label: 'SMS reminders' },
                    { key: 'reminders', label: '24h appointment reminders' },
                    { key: 'newsletter',label: 'Health tips newsletter' },
                  ].map(({ key, label }) => (
                    <Grid item xs={12} sm={6} key={key}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={editing ? draft.notifications[key] : profile.notifications[key]}
                            onChange={(e) => setDraft({ ...draft, notifications: { ...draft.notifications, [key]: e.target.checked } })}
                            disabled={!editing}
                          />
                        }
                        label={<Typography variant="body2">{label}</Typography>}
                      />
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
