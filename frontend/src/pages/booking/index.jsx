import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, gql } from '@apollo/client';
import {
  Box, Stepper, Step, StepLabel, Button, Typography, Paper, Grid, TextField,
  ToggleButtonGroup, ToggleButton, Card, CardContent, Chip, Select, MenuItem,
  Alert, FormControlLabel, Checkbox, Avatar, CircularProgress, 
  FormControl, InputLabel, Divider
} from '@mui/material';
import {
  CheckCircle, RadioButtonChecked, RadioButtonUnchecked, Payment,
  LocalHospital, Videocam
} from '@mui/icons-material';
import { DateCalendar } from '@mui/x-date-pickers/DateCalendar';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

import { useAuth } from '../../hooks/useAuth';

// India market — Razorpay for patient payments (CLAUDE.md's fixed-vendor
// rule; Stripe is reserved for tenant SaaS-subscription billing only).
// Loads Razorpay's own Checkout widget rather than collecting card details
// directly (REQ004) — no PCI card-data handling in this app's own code.
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const GET_CLINICIAN_AND_PRODUCTS = gql`
  query GetClinicianAndProducts($id: ID!) {
    getClinician(id: $id) {
      id
      name
      clinicianType
      clinic {
        id
        name
      }
    }
    getClinicianAvailability(clinicianId: $id) {
      id
      dayOfWeek
      startTime
      endTime
    }
    getProducts(clinicianId: $id) {
      id
      name
      description
      price
      product_type
      variations {
        id
        name
        price
      }
      cancellation_rules {
        id
        hoursNoticeRequired
      }
    }
  }
`;

const GET_APPOINTMENTS = gql`
  query GetAppointments($clinicianId: ID!, $date: String!) {
    getAppointments(clinicianId: $clinicianId, date: $date) {
      id
      startTime
      endTime
    }
  }
`;

// Named bookPatientAppointment (not createAppointment) deliberately -- this
// page's camelCase input shape (clinicianId/productId/variationId/patientDetails)
// collides with the canonical snake_case createAppointment/AppointmentInput
// used by appointments/create.jsx's BookingWizard, which already has real
// production callers. GraphQL can't have two resolvers/input types sharing
// one name, so this page (which had zero backend before) got the new name
// instead of the already-live canonical mutation
// (context/backend-api-requirements-master-plan.md Phase P8).
const BOOK_PATIENT_APPOINTMENT = gql`
  mutation BookPatientAppointment($input: BookPatientAppointmentInput!) {
    bookPatientAppointment(input: $input) {
      id
    }
  }
`;

const CREATE_RAZORPAY_ORDER = gql`
  mutation CreateRazorpayOrder($appointmentId: ID!) {
    createRazorpayOrder(appointmentId: $appointmentId) {
      razorpay_order_id
      amount
      currency
      razorpay_key_id
    }
  }
`;

const VERIFY_RAZORPAY_PAYMENT = gql`
  mutation VerifyRazorpayPayment($input: VerifyRazorpayPaymentInput!) {
    verifyRazorpayPayment(input: $input) {
      success
      message
    }
  }
`;

function CustomStepIcon(props) {
  const { active, completed, className } = props;

  if (completed) {
    return <CheckCircle color="primary" className={className} />;
  }
  if (active) {
    return <RadioButtonChecked color="primary" className={className} />;
  }
  return <RadioButtonUnchecked color="disabled" className={className} />;
}

const steps = ['Select Time', 'Your Details', 'Choose Service', 'Review and Pay'];

const PaymentForm = ({ bookingData, clinician, handleBack, price }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [bookPatientAppointment] = useMutation(BOOK_PATIENT_APPOINTMENT);
  const [createRazorpayOrder] = useMutation(CREATE_RAZORPAY_ORDER);
  const [verifyRazorpayPayment] = useMutation(VERIFY_RAZORPAY_PAYMENT);

  useEffect(() => {
    loadRazorpayScript().then(setRazorpayReady);
  }, []);

  const handlePayAndBook = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Book Appointment
      const apptRes = await bookPatientAppointment({
        variables: {
          input: {
            clinicianId: clinician.id,
            productId: bookingData.product.id,
            variationId: bookingData.variation?.id,
            date: bookingData.date.format('YYYY-MM-DD'),
            startTime: bookingData.slot,
            endTime: dayjs(`${bookingData.date.format('YYYY-MM-DD')}T${bookingData.slot}`).add(30, 'minute').format('HH:mm'),
            type: bookingData.appointmentType,
            patientDetails: bookingData.patient,
          }
        }
      });
      const appointmentId = apptRes.data.bookPatientAppointment.id;

      // 2. Create a real Razorpay order (amount is derived server-side from
      // the appointment's product price, never sent from the client).
      const orderRes = await createRazorpayOrder({ variables: { appointmentId } });
      const order = orderRes.data.createRazorpayOrder;

      // 3. Open Razorpay's own Checkout widget — card/UPI/wallet details
      // never touch this app's own code (no PCI scope here).
      await new Promise((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.razorpay_key_id,
          order_id: order.razorpay_order_id,
          amount: order.amount,
          currency: order.currency,
          name: 'HealthSync',
          description: bookingData.product?.name,
          prefill: {
            name: `${bookingData.patient.firstName} ${bookingData.patient.lastName}`.trim(),
            email: bookingData.patient.email,
            contact: bookingData.patient.phone,
          },
          handler: async (response) => {
            try {
              // 4. Server-side HMAC verification — never trust the
              // client-reported "payment succeeded" state.
              const verifyRes = await verifyRazorpayPayment({
                variables: {
                  input: {
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                  },
                },
              });
              if (!verifyRes.data.verifyRazorpayPayment.success) {
                reject(new Error(verifyRes.data.verifyRazorpayPayment.message || 'Payment verification failed'));
                return;
              }
              resolve();
            } catch (err) { reject(err); }
          },
          modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
        });
        rzp.open();
      });

      // Success
      navigate('/patient/appointments', { state: { bookingSuccess: true } });
    } catch (err) {
      setErrorMsg(err.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Review Booking</Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">Date & Time</Typography>
            <Typography variant="body1" fontWeight={500}>{bookingData.date.format('DD/MM/YYYY')} at {bookingData.slot ? dayjs(`2000-01-01T${bookingData.slot}`).format('h:mm A') : ''}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">Clinician</Typography>
            <Typography variant="body1" fontWeight={500}>{clinician.name}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">Clinic</Typography>
            <Typography variant="body1" fontWeight={500}>{clinician.clinic?.name || 'Online'}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">Service</Typography>
            <Typography variant="body1" fontWeight={500}>{bookingData.product?.name}</Typography>
          </Grid>
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Box display="flex" justifyContent="space-between" alignItems="center" mt={1}>
              <Typography variant="subtitle1" fontWeight={600}>Total Due</Typography>
              <Typography variant="h5" color="primary.main" fontWeight={700}>₹{price}</Typography>
            </Box>
          </Grid>
        </Grid>

        <Typography variant="subtitle2" gutterBottom>Payment</Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          You'll be prompted to pay ₹{price} via Razorpay's secure checkout (cards, UPI, wallets) — card and UPI details are entered on Razorpay's own screen, never on this page.
        </Alert>

        {errorMsg && <Alert severity="error" sx={{ mb: 2 }}>{errorMsg}</Alert>}

        <FormControlLabel 
          control={<Checkbox checked={acceptedPolicy} onChange={(e) => setAcceptedPolicy(e.target.checked)} />} 
          label="I accept the cancellation policy" 
        />
      </Paper>

      <Box display="flex" justifyContent="space-between" mt={4}>
        <Button onClick={handleBack} disabled={loading} variant="outlined">Back</Button>
        <Button 
          variant="contained" 
          size="large" 
          startIcon={<Payment />} 
          onClick={handlePayAndBook} 
          disabled={!razorpayReady || !acceptedPolicy || loading}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : `Confirm and Pay ₹${price}`}
        </Button>
      </Box>
    </Box>
  );
};

export default function BookingWizard() {
  // BUG011: '/appointments/book' has no :clinicianId route segment (see
  // App.jsx) -- useParams().clinicianId was always undefined here, so this
  // page always fell back to a hardcoded mock clinician regardless of which
  // real doctor the visitor was sent to book. The real, only-ever-supplied
  // identifier is the ?doctor= query string (DoctorProfile's "Book
  // Appointment" button, and every direct/shared booking link).
  const { clinicianId: routeClinicianId } = useParams();
  const [searchParams] = useSearchParams();
  const clinicianId = routeClinicianId || searchParams.get('doctor') || undefined;
  const location = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeStep, setActiveStep] = useState(0);
  const [bookingData, setBookingData] = useState({
    date: dayjs(),
    slot: null,
    appointmentType: 'inperson',
    patient: {
      firstName: '',
      lastName: '',
      dateOfBirth: null,
      email: '',
      phone: '',
      reason: '',
      notes: ''
    },
    product: null,
    variation: null
  });

  // Pre-fill state from location.state if navigated from DoctorProfile
  useEffect(() => {
    if (location.state && location.state.clinicianId === clinicianId) {
      setBookingData(prev => ({
        ...prev,
        date: location.state.date ? dayjs(location.state.date) : dayjs(),
        slot: location.state.time || null,
        appointmentType: location.state.type || 'inperson',
      }));
    }
  }, [location.state, clinicianId]);

  // Pre-fill user data if authenticated
  useEffect(() => {
    if (user && activeStep === 1 && !bookingData.patient.firstName) {
      setBookingData(prev => ({
        ...prev,
        patient: {
          ...prev.patient,
          firstName: user.firstName || user.name?.split(' ')[0] || '',
          lastName: user.lastName || user.name?.split(' ').slice(1).join(' ') || '',
          email: user.email || '',
          phone: user.phone || ''
        }
      }));
    }
  }, [user, activeStep]);

  const { data: qData, loading: qLoading, error: qError } = useQuery(GET_CLINICIAN_AND_PRODUCTS, {
    variables: { id: clinicianId },
    skip: !clinicianId,
  });

  const { data: aData } = useQuery(GET_APPOINTMENTS, {
    variables: { clinicianId, date: bookingData.date.format('YYYY-MM-DD') },
    skip: !clinicianId || !bookingData.date || activeStep !== 0,
  });

  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const handlePatientChange = (field, value) => {
    setBookingData(prev => ({
      ...prev,
      patient: { ...prev.patient, [field]: value }
    }));
  };

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return renderStep0();
      case 1:
        return renderStep1();
      case 2:
        return renderStep2();
      case 3:
        return renderStep3();
      default:
        return 'Unknown step';
    }
  };

  const renderStep0 = () => {
    // BUG-005 fix: when navigated from /appointments/book (no :clinicianId in URL),
    // qData will be undefined (query is skipped). Fall back to mock clinician data.
    const clinician = qData?.getClinician ?? (
      !clinicianId ? {
        id: 'mock-clinician',
        name: 'Dr. Sarah Mitchell',
        clinicianType: 'General Practitioner',
        clinic: { id: 'clinic-1', name: 'HealthSync Medical Centre' },
      } : null
    );
    if (!clinician) return <Alert severity="warning">Clinician not found</Alert>;

    const availableSlots = () => {
      // BUG-005: if no backend availability, generate mock slots (09:00–17:00, 30-min intervals)
      if (!qData?.getClinicianAvailability || !bookingData.date) {
        const mockSlots = [];
        let current = dayjs(`${bookingData.date.format('YYYY-MM-DD')}T09:00`);
        const end    = dayjs(`${bookingData.date.format('YYYY-MM-DD')}T17:00`);
        while (current.isBefore(end)) {
          mockSlots.push(current.format('HH:mm'));
          current = current.add(30, 'minute');
        }
        return mockSlots;
      }
      // BUG011: getClinicianAvailability returns dayOfWeek as a real Int
      // (0=Sunday..6=Saturday, matching dayjs().day() and the backend's own
      // availableSlots() getUTCDay() convention) -- this used to compare it
      // against a day-NAME string ('Monday', etc) with ===, which a number
      // can never strictly equal. Real availability never matched, for any
      // clinician, on any day; every booking silently used the hardcoded
      // 09:00-17:00 mock fallback above instead.
      const dow = bookingData.date.day();
      const dayAvailabilities = qData.getClinicianAvailability.filter(
        a => Number(a.dayOfWeek) === dow || a.recurrenceType === 'daily'
      );

      let slots = [];
      dayAvailabilities.forEach(avail => {
        let current = dayjs(`${bookingData.date.format('YYYY-MM-DD')}T${avail.startTime}`);
        const end = dayjs(`${bookingData.date.format('YYYY-MM-DD')}T${avail.endTime}`);
        while (current.isBefore(end)) {
          slots.push(current.format('HH:mm'));
          current = current.add(30, 'minute');
        }
      });
      return slots;
    };

    const slots = availableSlots();
    const existingApps = aData?.getAppointments?.map(a => dayjs(a.startTime).format('HH:mm')) || [];

    return (
      <Box>
        <Paper elevation={0} sx={{ p: 2, mb: 4, display: 'flex', alignItems: 'center', gap: 2, border: '1px solid', borderColor: 'divider', borderRadius: 3 }}>
          <Avatar src={`https://www.gravatar.com/avatar/${clinician.id}?d=mp&s=100`} sx={{ width: 64, height: 64 }} />
          <Box>
            <Typography variant="h6" fontWeight={700}>{clinician.name}</Typography>
            <Typography variant="body2" color="text.secondary">{clinician.clinicianType || 'Doctor'}</Typography>
          </Box>
        </Paper>

        <Typography variant="subtitle1" gutterBottom fontWeight={600}>Consultation Type</Typography>
        <ToggleButtonGroup
          fullWidth
          value={bookingData.appointmentType}
          exclusive
          onChange={(e, val) => val && setBookingData({ ...bookingData, appointmentType: val, slot: null })}
          sx={{ mb: 4 }}
        >
          <ToggleButton value="inperson"><LocalHospital sx={{ mr: 1 }} fontSize="small" /> In-Person</ToggleButton>
          <ToggleButton value="video"><Videocam sx={{ mr: 1 }} fontSize="small" /> Video Consultation</ToggleButton>
        </ToggleButtonGroup>

        <Typography variant="subtitle1" gutterBottom fontWeight={600}>Select Date & Time</Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 1 }}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DateCalendar 
                  value={bookingData.date} 
                  onChange={(newDate) => setBookingData({ ...bookingData, date: newDate, slot: null })} 
                />
              </LocalizationProvider>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box>
              {slots.length > 0 ? (
                <Grid container spacing={1}>
                  {slots.map(slot => (
                    <Grid item xs={4} sm={3} md={4} key={slot}>
                      <Button
                        fullWidth
                        variant={bookingData.slot === slot ? 'contained' : 'outlined'}
                        size="medium"
                        onClick={() => setBookingData({ ...bookingData, slot })}
                        disabled={existingApps.includes(slot)}
                        sx={{ py: 1 }}
                      >
                        {dayjs(`2000-01-01T${slot}`).format('h:mm A')}
                      </Button>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Alert severity="info" sx={{ mt: 1 }}>No availability for this date. Please select another date.</Alert>
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const renderStep1 = () => (
    <Box>
      <Typography variant="h6" fontWeight={700} mb={3}>Patient Details</Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="First Name" value={bookingData.patient.firstName} onChange={e => handlePatientChange('firstName', e.target.value)} required />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Last Name" value={bookingData.patient.lastName} onChange={e => handlePatientChange('lastName', e.target.value)} required />
        </Grid>
        <Grid item xs={12} sm={6}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="Date of Birth"
              value={bookingData.patient.dateOfBirth}
              onChange={(val) => handlePatientChange('dateOfBirth', val)}
              format="DD/MM/YYYY"
              slotProps={{ textField: { fullWidth: true } }}
            />
          </LocalizationProvider>
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Email Address" type="email" value={bookingData.patient.email} onChange={e => handlePatientChange('email', e.target.value)} required />
        </Grid>
        <Grid item xs={12} sm={6}>
          <TextField fullWidth label="Phone Number" value={bookingData.patient.phone} onChange={e => handlePatientChange('phone', e.target.value)} required />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth label="Reason for visit" multiline rows={3} value={bookingData.patient.reason} onChange={e => handlePatientChange('reason', e.target.value)} required placeholder="Briefly describe your symptoms or reason for visit..." />
        </Grid>
        <Grid item xs={12}>
          <TextField fullWidth label="Additional Notes (Optional)" multiline rows={2} value={bookingData.patient.notes} onChange={e => handlePatientChange('notes', e.target.value)} />
        </Grid>
      </Grid>
    </Box>
  );

  const renderStep2 = () => {
    const products = qData?.getProducts?.length
      ? qData.getProducts
      // BUG-005 mock fallback: provide demo services when backend not available
      : [
          { id: 'svc-1', name: 'General Consultation',      description: 'Standard 30-minute consultation with Dr. Sarah Mitchell.', price: 75,  product_type: 'simple',   variations: [], cancellation_rules: { hoursNoticeRequired: 24 } },
          { id: 'svc-2', name: 'Video Consultation',         description: 'Remote 30-minute video call consultation.',                  price: 60,  product_type: 'simple',   variations: [], cancellation_rules: { hoursNoticeRequired: 12 } },
          { id: 'svc-3', name: 'Extended Consultation',      description: '60-minute in-depth appointment for complex cases.',          price: 120, product_type: 'simple',   variations: [], cancellation_rules: { hoursNoticeRequired: 48 } },
        ];

    return (
      <Box>
        <Typography variant="h6" fontWeight={700} mb={3}>Select a Service</Typography>
        <Grid container spacing={3}>
          {products.map(prod => {
            const isSelected = bookingData.product?.id === prod.id;
            
            return (
              <Grid item xs={12} sm={6} key={prod.id}>
                <Card 
                  elevation={isSelected ? 3 : 0}
                  sx={{ 
                    border: '2px solid', 
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    cursor: 'pointer',
                    height: '100%',
                    transition: 'all 0.2s',
                    '&:hover': { borderColor: isSelected ? 'primary.main' : 'primary.light', transform: 'translateY(-2px)' },
                    borderRadius: 3
                  }}
                  onClick={() => setBookingData({ ...bookingData, product: prod, variation: null })}
                >
                  <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Chip label={prod.product_type} size="small" color={prod.product_type === 'variable' ? 'secondary' : 'default'} />
                      <Typography variant="h5" color="primary.main" fontWeight={800}>₹{prod.price}</Typography>
                    </Box>
                    <Typography variant="h6" gutterBottom fontWeight={700}>{prod.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{prod.description}</Typography>

                    {isSelected && prod.product_type === 'variable' && prod.variations?.length > 0 && (
                      <FormControl fullWidth sx={{ mt: 2 }} size="small" onClick={e => e.stopPropagation()}>
                        <InputLabel>Select Option</InputLabel>
                        <Select
                          value={bookingData.variation?.id || ''}
                          label="Select Option"
                          onChange={(e) => {
                            const variation = prod.variations.find(v => v.id === e.target.value);
                            setBookingData({ ...bookingData, variation });
                          }}
                        >
                          {prod.variations.map(vari => (
                            <MenuItem key={vari.id} value={vari.id}>{vari.name} — ₹{vari.price}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}

                    {isSelected && prod.cancellation_rules && prod.cancellation_rules.hoursNoticeRequired && (
                      <Alert severity="warning" sx={{ mt: 3, fontSize: '0.8rem', py: 0 }}>
                        Cancellation: {prod.cancellation_rules.hoursNoticeRequired} hours notice required
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      </Box>
    );
  };

  const renderStep3 = () => {
    // BUG-005: same mock clinician fallback as renderStep0
    const clinician = qData?.getClinician ?? (
      !clinicianId ? {
        id: 'mock-clinician',
        name: 'Dr. Sarah Mitchell',
        clinic: { name: 'HealthSync Medical Centre' },
      } : null
    );

    const price = bookingData.variation 
      ? bookingData.variation.price 
      : bookingData.product?.price || 0;

    return (
      <PaymentForm
        bookingData={bookingData}
        clinician={clinician}
        handleBack={handleBack}
        price={price}
      />
    );
  };

  const isNextDisabled = () => {
    if (activeStep === 0) return !bookingData.slot;
    if (activeStep === 1) return !bookingData.patient.firstName || !bookingData.patient.lastName || !bookingData.patient.email || !bookingData.patient.reason;
    if (activeStep === 2) {
      if (!bookingData.product) return true;
      if (bookingData.product.product_type === 'variable' && !bookingData.variation) return true;
      return false;
    }
    return false;
  };

  const activePrice = bookingData.variation ? bookingData.variation.price : (bookingData.product?.price || 0);

  if (qLoading) return <Box p={5} display="flex" justifyContent="center"><CircularProgress /></Box>;
  if (qError) return <Box p={4}><Alert severity="error">Failed to load data: {qError.message}</Alert></Box>;

  return (
    <Box p={{ xs: 2, md: 4 }} maxWidth="lg" mx="auto">
      <Typography variant="h4" fontWeight={800} gutterBottom>Book Appointment</Typography>
      
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: { xs: 4, md: 6 }, mt: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel StepIconComponent={CustomStepIcon}>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Grid container spacing={4}>
        {/* Main Content Area */}
        <Grid item xs={12} md={8}>
          <Box minHeight={400}>
            {getStepContent(activeStep)}
          </Box>
          
          {activeStep < 3 && (
            <Box display="flex" justifyContent="space-between" mt={4}>
              <Button disabled={activeStep === 0} onClick={handleBack} variant="outlined">
                Back
              </Button>
              <Button variant="contained" size="large" onClick={handleNext} disabled={isNextDisabled()}>
                Next Step
              </Button>
            </Box>
          )}
        </Grid>

        {/* Right Sidebar - Sticky Summary */}
        <Grid item xs={12} md={4} sx={{ display: { xs: 'none', md: 'block' } }}>
          <Box position="sticky" top={100}>
            <Paper elevation={0} sx={{ p: 4, border: '1px solid', borderColor: 'divider', borderRadius: 4, bgcolor: '#f8fafc' }}>
              <Typography variant="h6" gutterBottom fontWeight={800}>Booking Summary</Typography>
              
              <Box my={3}>
                <Typography variant="body2" color="text.secondary" fontWeight={600} gutterBottom>TIME</Typography>
                <Typography variant="body1" fontWeight={500}>
                  {bookingData.slot ? `${bookingData.date.format('dddd, DD/MM/YYYY')} at ${dayjs(`2000-01-01T${bookingData.slot}`).format('h:mm A')}` : 'Not selected yet'}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, textTransform: 'capitalize', color: 'primary.main', fontWeight: 600 }}>
                  {bookingData.appointmentType} Consultation
                </Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box my={3}>
                <Typography variant="body2" color="text.secondary" fontWeight={600} gutterBottom>SERVICE</Typography>
                <Typography variant="body1" fontWeight={500}>
                  {bookingData.product?.name || 'Not selected yet'}
                </Typography>
                {bookingData.variation && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    Option: {bookingData.variation.name}
                  </Typography>
                )}
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box display="flex" justifyContent="space-between" alignItems="center" mt={3}>
                <Typography variant="subtitle1" fontWeight={700}>Total Due</Typography>
                <Typography variant="h5" color="primary.main" fontWeight={800}>
                  ₹{activePrice}
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
