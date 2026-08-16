/**
 * Organization Onboarding Wizard — self-serve SaaS tenant signup.
 * See context/backend-implementation-plan.md Phase 3.5 and
 * test-suggestion/organization-onboarding-test-suggestion.md (SUG-ONBOARD-001/002/003).
 *
 * BACKEND SWAP: replace the useMockMutation calls below with real GraphQL mutations
 * (startOnboarding / selectPlan / addFirstClinic / inviteTeam / completeOnboarding)
 * once the OrganizationOnboardingModule exists on the backend.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Container, Paper, Stepper, Step, StepLabel, Typography, TextField, Grid,
  Button, Card, CardContent, Chip, Stack, Alert, RadioGroup, FormControlLabel, Radio,
  List, ListItem, ListItemIcon, ListItemText,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BusinessIcon from '@mui/icons-material/Business';
import { useMockMutation, useMockData } from '../../mocks/useMockData';
import * as MockStore from '../../mocks/store';

const STEPS = ['Organization', 'Choose plan', 'First clinic', 'Done'];

const formatINR = (paise) => paise == null ? 'Custom' : `₹${(paise / 100).toLocaleString('en-IN')}`;

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [org, setOrg] = useState(null);
  const [error, setError] = useState(null);

  const { data: plans } = useMockData((store) => store.getSubscriptionPlans());

  const [orgDetails, setOrgDetails] = useState({ orgName: '', slug: '', contactEmail: '', ownerName: '', ownerPassword: '' });
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [clinicDetails, setClinicDetails] = useState({ name: '', address: '', city: '', state: '', pincode: '', phone: '' });

  const [startOnboarding, { loading: startingOrg }] = useMockMutation(MockStore.startOrganizationOnboarding);
  const [selectPlan, { loading: selectingPlan }]   = useMockMutation(MockStore.selectOnboardingPlan);
  const [addClinic, { loading: addingClinic }]     = useMockMutation(MockStore.addOnboardingFirstClinic);
  const [complete, { loading: completing }]        = useMockMutation(MockStore.completeOrganizationOnboarding);

  const setOrgField = (k) => (e) => setOrgDetails((p) => ({ ...p, [k]: e.target.value }));
  const setClinicField = (k) => (e) => setClinicDetails((p) => ({ ...p, [k]: e.target.value }));

  const handleStep1Submit = async () => {
    setError(null);
    if (!orgDetails.orgName || !orgDetails.contactEmail || !orgDetails.ownerName || !orgDetails.ownerPassword) {
      setError('Please fill in all required fields.');
      return;
    }
    const slug = orgDetails.slug || orgDetails.orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const { data: newOrg } = await startOnboarding({ ...orgDetails, slug });
    setOrg(newOrg);
    setActiveStep(1);
  };

  const handleStep2Submit = async () => {
    setError(null);
    await selectPlan(org.id, selectedPlan);
    setActiveStep(2);
  };

  const handleStep3Submit = async () => {
    setError(null);
    if (!clinicDetails.name || !clinicDetails.city) {
      setError('Clinic name and city are required.');
      return;
    }
    await addClinic(org.id, clinicDetails);
    await complete(org.id);
    setActiveStep(3);
  };

  return (
    <Box sx={{ py: { xs: 4, sm: 6 }, bgcolor: '#F0F7F8', minHeight: '100%' }}>
      <Container maxWidth="sm">
        <Typography variant="h4" fontWeight={800} textAlign="center" sx={{ color: '#202124', mb: 0.5 }}>
          Set up your practice on HealthSync
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 4 }}>
          Start with a 14-day free trial. No card required today.
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {STEPS.map((label) => (
            <Step key={label}><StepLabel>{label}</StepLabel></Step>
          ))}
        </Stepper>

        <Paper sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 3, border: '1px solid #E8EAED' }}>
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

          {activeStep === 0 && (
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={700}>Tell us about your organization</Typography>
              <TextField label="Organization name" required fullWidth value={orgDetails.orgName} onChange={setOrgField('orgName')} placeholder="e.g. Sunrise Clinic" />
              <TextField label="Contact email" type="email" required fullWidth value={orgDetails.contactEmail} onChange={setOrgField('contactEmail')} />
              <Typography variant="subtitle2" fontWeight={700} sx={{ pt: 1 }}>Your admin account</Typography>
              <TextField label="Your name" required fullWidth value={orgDetails.ownerName} onChange={setOrgField('ownerName')} />
              <TextField label="Password" type="password" required fullWidth value={orgDetails.ownerPassword} onChange={setOrgField('ownerPassword')} helperText="You'll be the organization's admin account." />
              <Button variant="contained" size="large" disabled={startingOrg} onClick={handleStep1Submit} sx={{ mt: 1 }}>
                {startingOrg ? 'Creating…' : 'Continue'}
              </Button>
            </Stack>
          )}

          {activeStep === 1 && (
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={700}>Choose your plan</Typography>
              <Typography variant="body2" color="text.secondary">All plans start with a 14-day free trial. You can change plans anytime.</Typography>
              <RadioGroup value={selectedPlan} onChange={(e) => setSelectedPlan(e.target.value)}>
                <Grid container spacing={1.5}>
                  {(plans || []).map((plan) => (
                    <Grid item xs={12} key={plan.id}>
                      <Card
                        variant="outlined"
                        onClick={() => setSelectedPlan(plan.code)}
                        sx={{
                          borderRadius: 2, cursor: 'pointer',
                          borderColor: selectedPlan === plan.code ? '#006D77' : '#E8EAED',
                          borderWidth: selectedPlan === plan.code ? 2 : 1,
                        }}
                      >
                        <CardContent sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                          <FormControlLabel value={plan.code} control={<Radio />} label="" sx={{ mr: 0 }} />
                          <Box sx={{ flex: 1 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography fontWeight={700}>{plan.name}</Typography>
                              <Typography fontWeight={800} sx={{ color: '#006D77' }}>
                                {formatINR(plan.price_monthly)}{plan.price_monthly != null && <Typography component="span" variant="caption" color="text.secondary">/mo</Typography>}
                              </Typography>
                            </Stack>
                            <List dense sx={{ py: 0 }}>
                              {plan.features.slice(0, 3).map((f) => (
                                <ListItem key={f} disableGutters sx={{ py: 0.25 }}>
                                  <ListItemIcon sx={{ minWidth: 26 }}><CheckCircleIcon sx={{ fontSize: 16, color: '#2DC653' }} /></ListItemIcon>
                                  <ListItemText primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }} primary={f} />
                                </ListItem>
                              ))}
                            </List>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </RadioGroup>
              <Button variant="contained" size="large" disabled={selectingPlan} onClick={handleStep2Submit}>
                {selectingPlan ? 'Saving…' : 'Continue'}
              </Button>
            </Stack>
          )}

          {activeStep === 2 && (
            <Stack spacing={2}>
              <Typography variant="h6" fontWeight={700}>Add your first clinic location</Typography>
              <TextField label="Clinic name" required fullWidth value={clinicDetails.name} onChange={setClinicField('name')} />
              <TextField label="Address" fullWidth value={clinicDetails.address} onChange={setClinicField('address')} />
              <Grid container spacing={2}>
                <Grid item xs={6}><TextField label="City" required fullWidth value={clinicDetails.city} onChange={setClinicField('city')} /></Grid>
                <Grid item xs={6}><TextField label="State" fullWidth value={clinicDetails.state} onChange={setClinicField('state')} /></Grid>
                <Grid item xs={6}><TextField label="PIN Code" fullWidth value={clinicDetails.pincode} onChange={setClinicField('pincode')} /></Grid>
                <Grid item xs={6}><TextField label="Phone" fullWidth value={clinicDetails.phone} onChange={setClinicField('phone')} /></Grid>
              </Grid>
              <Button variant="contained" size="large" disabled={addingClinic || completing} onClick={handleStep3Submit}>
                {addingClinic || completing ? 'Finishing up…' : 'Finish setup'}
              </Button>
            </Stack>
          )}

          {activeStep === 3 && (
            <Stack spacing={2} alignItems="center" textAlign="center" sx={{ py: 2 }}>
              <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BusinessIcon sx={{ fontSize: 32, color: '#065F46' }} />
              </Box>
              <Typography variant="h6" fontWeight={700}>You're all set, {orgDetails.ownerName}!</Typography>
              <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" justifyContent="center">
                <Typography variant="body2" color="text.secondary">
                  {org?.name} is live on your {selectedPlan} trial.
                </Typography>
                <Chip size="small" label="14-day trial" />
              </Stack>
              <Button variant="contained" size="large" onClick={() => navigate('/login')} sx={{ mt: 1 }}>
                Go to sign in
              </Button>
            </Stack>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
