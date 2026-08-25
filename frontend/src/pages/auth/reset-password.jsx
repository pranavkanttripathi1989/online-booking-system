import React, { useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import { useMutation, gql } from '@apollo/client';
import {
  Box, Button, TextField, Typography, Alert, CircularProgress,
} from '@mui/material';
import { Helmet } from 'react-helmet-async';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import LockIcon from '@mui/icons-material/Lock';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

// BUG022 — forgot-password.jsx only ever called the first step
// (forgotPassword); this real, already-tested @Public() mutation
// (backend/src/auth/auth.resolver.ts) had no page that ever called it,
// so the reset flow dead-ended at "check your inbox" for every account.
const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword($input: ResetPasswordInput!) {
    resetPassword(input: $input) { success message }
  }
`;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [done, setDone]   = useState(false);
  const [error, setError] = useState(null);
  const [resetPassword, { loading }] = useMutation(RESET_PASSWORD_MUTATION);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 8) { setError('New password must be at least 8 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    try {
      const { data } = await resetPassword({ variables: { input: { token, new_password: newPassword } } });
      if (!data?.resetPassword?.success) {
        setError(data?.resetPassword?.message || 'Failed to reset password.');
        return;
      }
      setDone(true);
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
          Choose a new password to secure your account.
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

          {!token ? (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h3" fontWeight={800} sx={{ mb: 1 }}>This link is invalid</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                This password reset link is missing its token. Request a new one to continue.
              </Typography>
              <Button component={RouterLink} to="/forgot-password" variant="contained" fullWidth size="large" sx={{ py: 1.5, fontWeight: 700 }}>
                Request a new link
              </Button>
            </Box>
          ) : !done ? (
            <>
              <Typography variant="h3" fontWeight={800} sx={{ mb: 0.5 }}>Set a new password</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Choose a strong password you haven't used before.
              </Typography>

              {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

              <Box component="form" onSubmit={handleSubmit} noValidate sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  fullWidth
                  type="password"
                  label="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  InputProps={{ startAdornment: <LockIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} /> }}
                />
                <TextField
                  fullWidth
                  type="password"
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  InputProps={{ startAdornment: <LockIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} /> }}
                />
                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  size="large"
                  disabled={loading || !newPassword || !confirmPassword}
                  sx={{ py: 1.5, fontWeight: 700 }}
                >
                  {loading ? <CircularProgress size={22} color="inherit" /> : 'Reset Password'}
                </Button>
              </Box>
            </>
          ) : (
            <Box sx={{ textAlign: 'center' }}>
              <Box sx={{ width: 72, height: 72, borderRadius: '50%', bgcolor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2.5 }}>
                <CheckCircleIcon sx={{ fontSize: 40, color: '#2DC653' }} />
              </Box>
              <Typography variant="h3" fontWeight={800} sx={{ mb: 1 }}>Password updated</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Your password has been changed. You can now sign in with your new password.
              </Typography>
              <Button component={RouterLink} to="/login" variant="contained" fullWidth size="large" sx={{ py: 1.5, fontWeight: 700 }}>
                Back to Sign In
              </Button>
            </Box>
          )}

          {!done && (
            <Button
              component={RouterLink} to="/login"
              startIcon={<ArrowBackIcon />}
              sx={{ mt: 3, color: 'text.secondary' }}
              size="small"
            >
              Back to Sign In
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}
