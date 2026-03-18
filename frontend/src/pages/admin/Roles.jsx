import { useState, useEffect } from 'react'
import { useApolloClient, gql } from '@apollo/client'
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Grid, IconButton, Stack, Switch, TextField, Typography, Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog'

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const GET_ROLES = gql`
  query GetRoles {
    roles { id name description is_active created_at }
  }
`
const CREATE_ROLE = gql`
  mutation CreateRole($input: CreateRoleInput!) {
    createRole(input: $input) { success userErrors { message } role { id } }
  }
`
const UPDATE_ROLE = gql`
  mutation UpdateRole($id: ID!, $input: UpdateRoleInput!) {
    updateRole(id: $id, input: $input) { success userErrors { message } }
  }
`
const DELETE_ROLE = gql`
  mutation DeleteRole($id: ID!) {
    deleteRole(id: $id) { success userErrors { message } }
  }
`

// ─── Component ────────────────────────────────────────────────────────────────

const defaultForm = { name: '', description: '', is_active: true }

// ─── Mock fallback data ───────────────────────────────────────────────────────
const MOCK_ROLES = [
  { id: 'r1', name: 'System Admin',   description: 'Full platform access',          is_active: true,  created_at: '2024-01-01T00:00:00Z' },
  { id: 'r2', name: 'Admin',          description: 'Clinic administration access',  is_active: true,  created_at: '2024-01-01T00:00:00Z' },
  { id: 'r3', name: 'Manager',        description: 'Clinic manager access',         is_active: true,  created_at: '2024-01-01T00:00:00Z' },
  { id: 'r4', name: 'Clinician',      description: 'Clinical staff access',         is_active: true,  created_at: '2024-01-01T00:00:00Z' },
  { id: 'r5', name: 'Receptionist',   description: 'Front-desk staff access',       is_active: true,  created_at: '2024-01-01T00:00:00Z' },
  { id: 'r6', name: 'Patient',        description: 'Patient portal access',         is_active: true,  created_at: '2024-01-01T00:00:00Z' },
]

export default function AdminRoles() {
  const client = useApolloClient()
  const [roles, setRoles]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [editRole, setEditRole]       = useState(null)
  const [form, setForm]               = useState(defaultForm)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deletingId, setDeletingId]   = useState(null)
  const [formError, setFormError]     = useState(null)
  const [successMsg, setSuccessMsg]   = useState(null)
  const [submitting, setSubmitting]   = useState(false)

  const loadRoles = async () => {
    setLoading(true)
    try {
      const { data } = await client.query({ query: GET_ROLES, fetchPolicy: 'network-only' })
      setRoles(data?.roles || [])
    } catch (err) {
      // Backend offline — use mock data so page is usable in dev/demo mode
      setRoles(MOCK_ROLES)
    }
    finally { setLoading(false) }
  }

  useEffect(() => { loadRoles() }, []) // eslint-disable-line

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000) }
  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const resetForm = () => { setForm(defaultForm); setEditRole(null); setShowForm(false); setFormError(null) }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true); setFormError(null)
    try {
      if (editRole) {
        const { data: r } = await client.mutate({ mutation: UPDATE_ROLE, variables: { id: editRole.id, input: form } })
        if (!r?.updateRole?.success) throw new Error(r?.updateRole?.userErrors?.[0]?.message)
        showSuccess('Role updated.')
      } else {
        const { data: r } = await client.mutate({ mutation: CREATE_ROLE, variables: { input: form } })
        if (!r?.createRole?.success) throw new Error(r?.createRole?.userErrors?.[0]?.message)
        showSuccess('Role created.')
      }
      resetForm(); loadRoles()
    } catch (err) { setFormError(err.message) }
    finally { setSubmitting(false) }
  }

  const handleToggleActive = async (role) => {
    try {
      await client.mutate({ mutation: UPDATE_ROLE, variables: { id: role.id, input: { is_active: !role.is_active } } })
      loadRoles()
    } catch (err) { setFormError(err.message) }
  }

  const confirmDelete = async () => {
    setConfirmOpen(false)
    try {
      const { data: r } = await client.mutate({ mutation: DELETE_ROLE, variables: { id: deletingId } })
      if (!r?.deleteRole?.success) throw new Error(r?.deleteRole?.userErrors?.[0]?.message)
      showSuccess('Role deleted.'); loadRoles()
    } catch (err) { setFormError(err.message) }
    setDeletingId(null)
  }

  if (loading) return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Role Management</Typography>
          <Typography variant="body2" color="text.secondary">Define user roles and their access levels</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetForm(); setShowForm(p => !p) }}>Add Role</Button>
      </Stack>

      {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
      {formError   && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setFormError(null)}>{formError}</Alert>}

      {/* Form */}
      {showForm && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={2}>{editRole ? 'Edit Role' : 'New Role'}</Typography>
            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField fullWidth required size="small" label="Role Name"
                    value={form.name} onChange={e => setField('name', e.target.value)} />
                </Grid>
                <Grid item xs={12}>
                  <TextField fullWidth size="small" label="Description" multiline rows={2}
                    value={form.description} onChange={e => setField('description', e.target.value)} />
                </Grid>
                <Grid item xs={12}>
                  <Stack direction="row" spacing={1}>
                    <Button type="submit" variant="contained" disabled={submitting}>{submitting ? 'Saving…' : editRole ? 'Update' : 'Create'}</Button>
                    <Button variant="outlined" onClick={resetForm}>Cancel</Button>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Roles table */}
      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: 'grey.50' }}>
                {['Role Name', 'Description', 'Status', 'Created', 'Actions'].map(h => (
                  <Box key={h} component="th" sx={{ px: 2, py: 1.5, textAlign: 'left', typography: 'caption', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid', borderColor: 'divider' }}>{h}</Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {roles.length === 0 && (
                <Box component="tr">
                  <Box component="td" colSpan={5} sx={{ textAlign: 'center', py: 6 }}>
                    <AdminPanelSettingsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography color="text.secondary">No roles defined yet</Typography>
                  </Box>
                </Box>
              )}
              {roles.map(role => (
                <Box component="tr" key={role.id} sx={{ '&:hover': { bgcolor: 'grey.50' }, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Typography fontWeight={600}>{role.name}</Typography>
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">{role.description || '—'}</Typography>
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Switch size="small" checked={!!role.is_active} onChange={() => handleToggleActive(role)} />
                      <Chip label={role.is_active ? 'Active' : 'Inactive'} size="small" color={role.is_active ? 'success' : 'default'} />
                    </Stack>
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      {role.created_at ? new Date(role.created_at).toLocaleDateString() : '—'}
                    </Typography>
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Edit"><IconButton size="small" onClick={() => { setEditRole(role); setForm({ name: role.name, description: role.description || '', is_active: role.is_active }); setShowForm(true) }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => { setDeletingId(role.id); setConfirmOpen(true) }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </Stack>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Card>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Delete Role"
        message="Delete this role? Users assigned to it may lose access. This cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setDeletingId(null) }}
      />
    </Box>
  )
}
