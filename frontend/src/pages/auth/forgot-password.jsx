import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useMutation, gql } from '@apollo/client';
import {
  Box, Button, TextField, Typography, Alert, CircularProgress,
} from '@mui/material';
import { Helmet } from 'react-helmet-async';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import EmailIcon from '@mui/icons-material/Email';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// Real @Public() mutation (backend/src/auth/auth.resolver.ts) -- this page
// previously just await'd a 1200ms setTimeout and always showed "sent",
// never calling it. Deliberately generic success regardless of whether the
// email exists (see the resolver's own comment) -- the UI must not leak
// account existence either, so a real failure is only ever a genuine
// network/server error, not "email not found".
const FORGOT_PASSWORD_MUTATION = gql`
  mutation ForgotPassword($input: ForgotPasswordInput!) {
    forgotPassword(input: $input) { success message }
  }
`;

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState(null);
  const [forgotPassword, { loading }] = useMutation(FORGOT_PASSWORD_MUTATION);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await forgotPassword({ variables: { input: { email } } });
      setSent(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex' }}>
      <Helmet>
        <title>Reset Password — HealthSync</title>
      </Helmet>

      {/* Left brand panel */}
      <Box sx={{
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
        width: '50%', background: 'linear-gradient(160deg, #003B42 0%, #006D77 55%, #0A9396 100%)',
        px: 6, py: 8, textAlign: 'center',
      }}>
        <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
          <MedicalServicesIcon sx={{ color: '#83C5BE', fontSize: 32 }} />
        </Box>
        <Typography sx={{ color: '#fff', fontWeight: 800, fontSize: '1.5rem', mb: 1 }}>HealthSync</Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.95rem', maxWidth: 300 }}>
          Secure account recovery. We'll send a reset link to your registered email address.
        </Typography>
      </Box>

      {/* Right form panel */}
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', px: { xs: 2, sm: 4, md: 6 }, py: 6, bgcolor: '#F0F7F8' }}>
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          {/* Mobile logo */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, mb: 3, alignItems: 'center', gap: 1 }}>
            <MedicalServicesIcon sx={{ color: '#006D77', fontSize: '1.6rem' }} />
            <Typography variant="h5" fontWeight={800} sx={{ color: '#006D77' }}>HealthSync</Typography>
          </Box>

          {!sent ? (
            <>
              <Typography variant="h3" fontWeight={800} sx={{ mb: 0.5 }}>Reset your password</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Enter your email and we'll send you a secure reset link.
              </Typography>

              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

              <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  type="email"
                  label="Email Address"
                  placeholder="you@clinic.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  InputProps={{ startAdornment: <EmailIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} /> }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={loading || !email}
                  sx={{ py: 1.5, fontWeight: 700 }}
                >
                  {loading ? <CircularProgress size={22} color="inherit" /> : 'Send Reset Link'}
                </Button>
              </Box>
            </>
          ) : (
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
                <CheckCircleIcon sx={{ fontSize: 40, color: '#2DC653' }} />
              </Box>
              <Typography variant="h3" fontWeight={800} sx={{ mb: 1 }}>Check your inbox</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                We've sent a password reset link to
              </Typography>
              <Typography variant="body2" fontWeight={700} sx={{ mb: 3 }}>{email}</Typography>
              <Typography variant="caption" color="text.secondary">
                Didn't receive it? Check your spam folder or{' '}
                <Box
                  component="span"
                  onClick={() => setSent(false)}
                  sx={{ color: '#006D77', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  try again
                </Box>
                .
              </Typography>
            </Box>
          )}

          <Button
            component={RouterLink} to="/login"
            startIcon={<ArrowBackIcon />}
            sx={{ mt: 3, color: 'text.secondary' }}
            size="small"
          >
            Back to Sign In
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
