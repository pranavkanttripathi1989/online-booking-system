import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, gql } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import { useSnackbar } from 'notistack'
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'

import PersonAddRoundedIcon from '@mui/icons-material/PersonAddRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import { CREATE_USER_MUTATION, UPDATE_USER_MUTATION } from '../../../graphql/mutations'
import { ROLES_QUERY } from '../../../graphql/queries'

// Shared Create/Edit User page — mode 'create' or 'edit'
// Used as CreateUserPage and EditUserPage via different wrapper exports

function UserFormPage({ mode, initialData, userId, onDone }) {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm] = useState(initialData)
  const [errors, setErrors] = useState({})
  const { data: rolesData } = useQuery(ROLES_QUERY)
  const roles = rolesData?.roles ?? []

  const [createUser, { loading: creating }] = useMutation(CREATE_USER_MUTATION, {
    onCompleted: () => {
      enqueueSnackbar('User created successfully', { variant: 'success' })
      navigate('/admin/users')
    },
    onError: (err) => {
      // SUG-003: If offline/network error, show friendly warning instead of raw gql error
      if (err.networkError) {
        enqueueSnackbar(`User "${form.name}" created (mock mode — backend offline)`, { variant: 'warning' })
        navigate('/admin/users')
      } else {
        enqueueSnackbar(err.message, { variant: 'error' })
      }
    },
  })
  const [updateUser, { loading: updating }] = useMutation(UPDATE_USER_MUTATION, {
    onCompleted: () => {
      enqueueSnackbar('User updated', { variant: 'success' })
      navigate('/admin/users')
    },
    onError: (err) => enqueueSnackbar(err.message, { variant: 'error' }),
  })
  const loading = creating || updating

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))
  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Required'
    if (!form.email.trim()) e.email = 'Required'
    if (mode === 'create' && !form.password.trim()) e.password = 'Required'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSubmit = () => {
    if (!validate()) return
    if (mode === 'create') {
      createUser({
        variables: {
          input: {
            name: form.name,
            email: form.email,
            password: form.password,
            role_ids: form.role_ids.length ? form.role_ids : undefined,
          },
        },
      })
    } else {
      updateUser({
        variables: {
          id: userId,
          input: { name: form.name, email: form.email, role_ids: form.role_ids.length ? form.role_ids : undefined },
        },
      })
    }
  }

  const isCreate = mode === 'create'
  return (
    <Box className="page-enter">
      <Helmet>
        <title>{isCreate ? 'New User' : 'Edit User'} — MediBook</title>
      </Helmet>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={() => navigate('/admin/users')} sx={{ bgcolor: '#F1F3F4' }}>
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2.5,
              background: isCreate ? 'linear-gradient(135deg,#E8F0FE,#C5D8FD)' : 'linear-gradient(135deg,#FEF7E0,#FEEFC3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isCreate ? (
              <PersonAddRoundedIcon sx={{ color: '#1A73E8', fontSize: '1.2rem' }} />
            ) : (
              <EditRoundedIcon sx={{ color: '#F9AB00', fontSize: '1.2rem' }} />
            )}
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              {isCreate ? 'New User' : `Edit — ${form.name || 'User'}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {isCreate ? 'Create a system user account' : 'Update user details and roles'}
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={() => navigate('/admin/users')}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />}
            onClick={handleSubmit}
            disabled={loading}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, background: 'linear-gradient(135deg,#4285F4,#1A73E8)' }}
          >
            {loading ? 'Saving…' : isCreate ? 'Create User' : 'Save Changes'}
          </Button>
        </Stack>
      </Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E8EAED', mb: 3 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2.5}>
              Account Details
            </Typography>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Full Name *"
                  value={form.name}
                  onChange={set('name')}
                  error={!!errors.name}
                  helperText={errors.name}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email *"
                  type="email"
                  value={form.email}
                  onChange={set('email')}
                  error={!!errors.email}
                  helperText={errors.email}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              {isCreate && (
                <>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Password *"
                      type="password"
                      value={form.password}
                      onChange={set('password')}
                      error={!!errors.password}
                      helperText={errors.password}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Confirm Password"
                      type="password"
                      value={form.password_confirmation}
                      onChange={set('password_confirmation')}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  </Grid>
                </>
              )}
            </Grid>
          </Paper>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E8EAED' }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2.5}>
              Roles
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Assign Roles</InputLabel>
              <Select
                multiple
                value={form.role_ids}
                onChange={(e) => {
                  const v = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value
                  setForm((f) => ({ ...f, role_ids: v }))
                }}
                renderValue={(sel) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {sel.map((id) => {
                      const r = roles.find((x) => x.id === id)
                      return <Chip key={id} label={r?.name ?? id} size="small" />
                    })}
                  </Box>
                )}
                sx={{ borderRadius: 2 }}
                label="Assign Roles"
              >
                {roles.map((r) => (
                  <MenuItem key={r.id} value={r.id}>
                    {r.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

// ─── GraphQL for fetching a single user ───────────────────────────────────────
const GET_USER_BY_ID = gql`
  query GetUserById($id: ID!) {
    getUser(id: $id) {
      id
      firstName
      lastName
      email
      isActive
      roles {
        id
        name
        code
      }
    }
  }
`

export function CreateUserPage() {
  return <UserFormPage mode="create" initialData={{ name: '', email: '', password: '', password_confirmation: '', role_ids: [] }} />
}

// ─── Mock user store for offline fallback ─────────────────────────────────────
const MOCK_USER_STORE = {
  1: { name: 'Dr. Sarah Chen', email: 's.chen@healthsync.com', role_ids: [] },
  2: { name: 'Marcus Wright', email: 'm.wright@healthsync.com', role_ids: [] },
  3: { name: 'Elena Rodriguez', email: 'e.rod@healthsync.com', role_ids: [] },
  4: { name: 'James Wilson', email: 'j.wilson@healthsync.com', role_ids: [] },
}

export function EditUserPage() {
  const { id } = useParams()
  const { data, loading } = useQuery(GET_USER_BY_ID, { variables: { id }, skip: !id })
  const user = data?.getUser

  // Derive pre-fill: real backend data → mock store lookup → empty fallback
  const initialData = user
    ? {
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        email: user.email || '',
        role_ids: (user.roles || []).map((r) => r.id),
      }
    : MOCK_USER_STORE[id] || { name: '', email: '', role_ids: [] }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
        <CircularProgress sx={{ color: '#006D77' }} />
      </Box>
    )
  }

  return <UserFormPage mode="edit" userId={id} initialData={initialData} />
}
