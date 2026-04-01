import React, { useState } from 'react';
import {
  Box, Grid, Typography, Card, CardContent, Stack, Button, Chip, Avatar,
  Divider, TextField, Paper, IconButton, Alert, Switch, FormControlLabel,
  InputAdornment,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import ShieldIcon from '@mui/icons-material/Shield';
import NotificationsIcon from '@mui/icons-material/Notifications';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import { useAuth } from '../../hooks/useAuth';

// SUG-PTPROF-009: PatientAvatar unused import removed

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
  // SUG-PTPROF-004: Use auth context to seed profile name/email where available
  const { user } = useAuth();

  const seedFromAuth = () => {
    if (!user) return INITIAL;
    const [first = '', ...rest] = (user.name || '').split(' ');
    return {
      ...INITIAL,
      firstName: user.firstName || first || INITIAL.firstName,
      lastName: user.lastName || rest.join(' ') || INITIAL.lastName,
      email: user.email || INITIAL.email,
    };
  };

  const SEEDED = seedFromAuth();
  const [profile, setProfile] = useState(SEEDED);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(SEEDED);
  const [saveOk, setSaveOk]   = useState(false);

  // SUG-PTPROF-001/005: Add/delete allergy state
  const [newAllergy, setNewAllergy]               = useState('');
  const [showAllergyInput, setShowAllergyInput]   = useState(false);
  const [newCondition, setNewCondition]           = useState('');
  const [showConditionInput, setShowConditionInput] = useState(false);

  const handleSave = () => {
    setProfile(draft);
    setEditing(false);
    setSaveOk(true);
    setTimeout(() => setSaveOk(false), 3000);
  };

  const handleDiscard = () => {
    setEditing(false);
    setDraft(profile);
    setShowAllergyInput(false);
    setShowConditionInput(false);
    setNewAllergy('');
    setNewCondition('');
  };

  // SUG-PTPROF-001: Add allergy handler
  const handleAddAllergy = () => {
    if (newAllergy.trim()) {
      setDraft({ ...draft, allergies: [...draft.allergies, newAllergy.trim()] });
      setNewAllergy('');
      setShowAllergyInput(false);
    }
  };

  // SUG-PTPROF-001: Add condition handler
  const handleAddCondition = () => {
    if (newCondition.trim()) {
      setDraft({ ...draft, conditions: [...draft.conditions, newCondition.trim()] });
      setNewCondition('');
      setShowConditionInput(false);
    }
  };

  // Personal info field helper
  const field = (label, key, type = 'text') => (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>{label}</Typography>
      {editing
        ? <TextField fullWidth size="small" type={type} value={draft[key] || ''} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} />
        : <Typography variant="body2" fontWeight={500}>{profile[key] || '—'}</Typography>
      }
    </Box>
  );

  // SUG-PTPROF-003: Insurance field helper (editable in edit mode)
  const insuranceField = (label, key) => (
    <Box>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      {editing
        ? <TextField fullWidth size="small" value={draft.insurance[key] || ''} onChange={(e) => setDraft({ ...draft, insurance: { ...draft.insurance, [key]: e.target.value } })} sx={{ mt: 0.5 }} />
        : <Typography fontWeight={600}>{profile.insurance[key]}</Typography>
      }
    </Box>
  );

  // SUG-PTPROF-002: Safe initials with null guard
  const initials = `${profile.firstName?.[0] ?? '?'}${profile.lastName?.[0] ?? ''}`;
  const displayName = (profile.firstName || profile.lastName)
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : 'Unknown Patient';

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h2" fontWeight={700}>My Profile</Typography>
        {editing ? (
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<CancelIcon />} onClick={handleDiscard} aria-label="Discard changes">Discard</Button>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSave} aria-label="Save profile changes">Save Changes</Button>
          </Stack>
        ) : (
          <Button variant="outlined" startIcon={<EditIcon />} onClick={() => setEditing(true)} aria-label="Edit profile">Edit Profile</Button>
        )}
      </Stack>

      {saveOk && <Alert severity="success" sx={{ mb: 2 }}>Profile updated successfully!</Alert>}

      <Grid container spacing={3}>
        {/* Left — avatar card */}
        <Grid item xs={12} md={3}>
          <Card sx={{ textAlign: 'center', p: 3 }}>
            {/* SUG-PTPROF-002: Null-guarded avatar initials */}
            <Avatar sx={{ width: 80, height: 80, bgcolor: '#006D77', fontSize: '1.8rem', fontWeight: 800, mx: 'auto', mb: 2 }}>
              {initials}
            </Avatar>
            <Typography fontWeight={700}>{displayName}</Typography>
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
                  {/* Allergies */}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Allergies</Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.75}>
                      {(editing ? draft.allergies : profile.allergies).map((a) => (
                        <Chip
                          key={a} label={a} size="small" color="error" variant="outlined"
                          /* SUG-PTPROF-005: Delete button in edit mode */
                          onDelete={editing ? () => setDraft({ ...draft, allergies: draft.allergies.filter(x => x !== a) }) : undefined}
                        />
                      ))}
                      {/* SUG-PTPROF-001: Wired "+ Add" for allergies */}
                      {editing && (
                        showAllergyInput ? (
                          <Stack direction="row" gap={0.5} alignItems="center">
                            <TextField
                              size="small" value={newAllergy}
                              onChange={(e) => setNewAllergy(e.target.value)}
                              placeholder="e.g. Peanuts"
                              onKeyDown={(e) => e.key === 'Enter' && handleAddAllergy()}
                              inputProps={{ 'aria-label': 'New allergy name' }}
                              sx={{ width: 130 }}
                            />
                            <IconButton size="small" onClick={handleAddAllergy} aria-label="Confirm add allergy" color="primary">
                              <CheckIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => { setShowAllergyInput(false); setNewAllergy(''); }} aria-label="Cancel add allergy">
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        ) : (
                          <Chip
                            label="+ Add" size="small" variant="outlined"
                            sx={{ cursor: 'pointer' }}
                            onClick={() => setShowAllergyInput(true)}
                            aria-label="Add new allergy"
                          />
                        )
                      )}
                    </Stack>
                  </Grid>

                  {/* Conditions */}
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600 }}>Existing Conditions</Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.75}>
                      {(editing ? draft.conditions : profile.conditions).map((c) => (
                        <Chip
                          key={c} label={c} size="small" color="warning" variant="outlined"
                          /* SUG-PTPROF-005: Delete button for conditions */
                          onDelete={editing ? () => setDraft({ ...draft, conditions: draft.conditions.filter(x => x !== c) }) : undefined}
                        />
                      ))}
                      {editing && (
                        showConditionInput ? (
                          <Stack direction="row" gap={0.5} alignItems="center">
                            <TextField
                              size="small" value={newCondition}
                              onChange={(e) => setNewCondition(e.target.value)}
                              placeholder="e.g. Diabetes"
                              onKeyDown={(e) => e.key === 'Enter' && handleAddCondition()}
                              inputProps={{ 'aria-label': 'New condition name' }}
                              sx={{ width: 130 }}
                            />
                            <IconButton size="small" onClick={handleAddCondition} aria-label="Confirm add condition" color="primary">
                              <CheckIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" onClick={() => { setShowConditionInput(false); setNewCondition(''); }} aria-label="Cancel add condition">
                              <CancelIcon fontSize="small" />
                            </IconButton>
                          </Stack>
                        ) : (
                          <Chip
                            label="+ Add" size="small" variant="outlined"
                            sx={{ cursor: 'pointer' }}
                            onClick={() => setShowConditionInput(true)}
                            aria-label="Add new condition"
                          />
                        )
                      )}
                    </Stack>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Insurance — SUG-PTPROF-003: Now editable */}
            <Card>
              <CardContent sx={{ p: 2.5 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2.5 }}>
                  <ShieldIcon sx={{ color: '#006D77', fontSize: 20 }} />
                  <Typography variant="h5" fontWeight={700}>Insurance</Typography>
                </Stack>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>{insuranceField('Provider', 'provider')}</Grid>
                  <Grid item xs={12} sm={4}>{insuranceField('Policy Number', 'policyNo')}</Grid>
                  <Grid item xs={12} sm={4}>{insuranceField('Expires', 'expires')}</Grid>
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
                            inputProps={{ 'aria-label': label }}
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
