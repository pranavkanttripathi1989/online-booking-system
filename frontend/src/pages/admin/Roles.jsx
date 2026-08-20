import { useState, useMemo } from 'react'
import { useQuery, useMutation, gql } from '@apollo/client'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Grid, IconButton, MenuItem,
  Stack, Switch, TextField, Tooltip, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import LockRoundedIcon from '@mui/icons-material/LockRounded'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog'
import ErrorBoundary from '../../components/ErrorBoundary'
import EmptyState from '../../components/shared/EmptyState'
import PermissionMatrix from '../../components/Roles/PermissionMatrix'

// backend/src/users/** — roles/getPermissions/createRole/updateRole/deleteRole
// were built from scratch specifically against this page's MockStore shape
// (see users/entities/user-admin.entity.ts's own comment), never wired up
// until now. AppRoleType already carries permission_ids inline, so no
// separate per-role fetch is needed for grant counts / edit pre-populate.
const GET_ROLES_DATA = gql`
  query GetRolesData {
    roles { id name description is_active is_system permission_ids }
    getPermissions { id action resource description }
  }
`
const CREATE_ROLE = gql`mutation CreateRole($input: AppRoleInput!) { createRole(input: $input) { id } }`
const UPDATE_ROLE = gql`mutation UpdateRole($id: ID!, $input: AppRoleInput!) { updateRole(id: $id, input: $input) { id } }`
const DELETE_ROLE = gql`mutation DeleteRole($id: ID!) { deleteRole(id: $id) }`

// ─── Validation (context/frontend-hard-rules.md §2.1) ─────────────────────────
const roleSchema = z.object({
  name: z.string().trim().min(2, 'Role name must be at least 2 characters'),
  description: z.string().optional(),
  is_active: z.boolean(),
})

function RolesPageContent() {
  const { data, loading, error, refetch } = useQuery(GET_ROLES_DATA)
  const roles = data?.roles
  const permissions = useMemo(() => data?.getPermissions || [], [data])

  const resources = useMemo(() => [...new Set(permissions.map((p) => p.resource))], [permissions])
  const actions = useMemo(() => [...new Set(permissions.map((p) => p.action))], [permissions])
  const permissionIdFor = useMemo(() => {
    const map = new Map(permissions.map((p) => [`${p.resource}::${p.action}`, p.id]))
    return (resource, action) => map.get(`${resource}::${action}`)
  }, [permissions])

  const [createRoleMutation, { loading: creating }] = useMutation(CREATE_ROLE)
  const [updateRoleMutation, { loading: updating }] = useMutation(UPDATE_ROLE)
  const [deleteRoleMutation] = useMutation(DELETE_ROLE)

  const [showForm, setShowForm] = useState(false)
  const [editRole, setEditRole] = useState(null)
  const [selectedPermissionIds, setSelectedPermissionIds] = useState([])
  const [cloneFromId, setCloneFromId] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [formError, setFormError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(roleSchema),
    defaultValues: { name: '', description: '', is_active: true },
  })

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000) }

  const openCreate = () => {
    setEditRole(null); setSelectedPermissionIds([]); setCloneFromId('')
    reset({ name: '', description: '', is_active: true })
    setFormError(null); setShowForm(true)
  }

  const openEdit = (role) => {
    setEditRole(role)
    setSelectedPermissionIds(role.permission_ids || [])
    setCloneFromId('')
    reset({ name: role.name, description: role.description || '', is_active: role.is_active })
    setFormError(null); setShowForm(true)
  }

  const closeForm = () => { setShowForm(false); setEditRole(null); setFormError(null) }

  const handleCloneFrom = (roleId) => {
    setCloneFromId(roleId)
    if (roleId) setSelectedPermissionIds(roleList.find((r) => r.id === roleId)?.permission_ids || [])
  }

  const togglePermission = (permId) => {
    setSelectedPermissionIds((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    )
  }

  const onSubmit = async (values) => {
    setFormError(null)
    try {
      const input = { ...values, permission_ids: selectedPermissionIds }
      if (editRole) {
        await updateRoleMutation({ variables: { id: editRole.id, input } })
        showSuccess('Role updated.')
      } else {
        await createRoleMutation({ variables: { input } })
        showSuccess('Role created.')
      }
      await refetch()
      closeForm()
    } catch (err) { setFormError(err.message) }
  }

  // System roles reject every updateRole call server-side (not just
  // name/description edits), so the toggle must be disabled for them too —
  // the Switch below is guarded the same way Edit/Delete already are.
  const handleToggleActive = async (role) => {
    try {
      await updateRoleMutation({ variables: { id: role.id, input: { name: role.name, description: role.description, is_active: !role.is_active } } })
      await refetch()
    } catch (err) { setFormError(err.message) }
  }

  const confirmDelete = async () => {
    setConfirmOpen(false)
    try {
      await deleteRoleMutation({ variables: { id: deletingId } })
      await refetch()
      showSuccess('Role deleted.')
    } catch (err) { setFormError(err.message) }
    setDeletingId(null)
  }

  const roleList = roles ?? []
  const submitting = creating || updating
  const noPermissionsSelected = selectedPermissionIds.length === 0

  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1.5} mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Role Management</Typography>
          <Typography variant="body2" color="text.secondary">Define custom roles and their permissions</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          Add Role
        </Button>
      </Stack>

      {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
      {formError && !showForm && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>{formError}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>Failed to load roles: {error.message}</Alert>}

      {loading && !data ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : (
      <>
      {showForm && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={2}>{editRole ? 'Edit Role' : 'New Role'}</Typography>
            {editRole?.is_system && (
              <Alert severity="info" sx={{ mb: 2 }}>
                This is a system role. Name and description can't be changed, but you can review its permissions below.
              </Alert>
            )}
            {formError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>{formError}</Alert>}

            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="name" control={control}
                    render={({ field }) => (
                      <TextField {...field} fullWidth required size="small" label="Role Name"
                        disabled={!!editRole?.is_system}
                        error={!!errors.name} helperText={errors.name?.message} />
                    )}
                  />
                </Grid>
                {!editRole && (
                  <Grid item xs={12} sm={6}>
                    <TextField select fullWidth size="small" label="Clone permissions from…"
                      value={cloneFromId} onChange={(e) => handleCloneFrom(e.target.value)}>
                      <MenuItem value="">Start from scratch</MenuItem>
                      {roleList.map((r) => (
                        <MenuItem key={r.id} value={r.id}>{r.name}</MenuItem>
                      ))}
                    </TextField>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Controller
                    name="description" control={control}
                    render={({ field }) => (
                      <TextField {...field} fullWidth size="small" label="Description" multiline rows={2}
                        disabled={!!editRole?.is_system} />
                    )}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>Permissions</Typography>
                  {noPermissionsSelected && (
                    <Alert severity="warning" sx={{ mb: 1.5 }}>
                      No permissions selected — this role won't be able to do anything until at least one is granted.
                    </Alert>
                  )}
                  <PermissionMatrix
                    resources={resources}
                    actions={actions}
                    permissionIdFor={permissionIdFor}
                    selectedIds={selectedPermissionIds}
                    onToggle={togglePermission}
                    disabled={!!editRole?.is_system}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button type="submit" variant="contained" disabled={submitting}>
                      {submitting ? 'Saving…' : editRole ? 'Update' : 'Create'}
                    </Button>
                    <Button variant="outlined" onClick={closeForm}>Cancel</Button>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      )}

      {roleList.length === 0 ? (
        <EmptyState title="No roles defined yet" subtitle="Create your first role to get started." actionLabel="Add Role" onAction={openCreate} />
      ) : (
        <Grid container spacing={2}>
          {roleList.map((role) => {
            const grantCount = (role.permission_ids || []).length
            return (
              <Grid item xs={12} sm={6} md={4} key={role.id}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                      <Box>
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                          <Typography fontWeight={700}>{role.name}</Typography>
                          {role.is_system && (
                            <Tooltip title="System role — protected from editing/deletion">
                              <LockRoundedIcon sx={{ fontSize: 16, color: 'text.disabled' }} aria-label="System role" />
                            </Tooltip>
                          )}
                        </Stack>
                        <Typography variant="body2" color="text.secondary">{role.description || '—'}</Typography>
                      </Box>
                      <Switch
                        size="small" checked={!!role.is_active} onChange={() => handleToggleActive(role)}
                        disabled={!!role.is_system}
                        inputProps={{ 'aria-label': `${role.is_active ? 'Deactivate' : 'Activate'} ${role.name} role` }}
                      />
                    </Stack>
                    <Chip label={`${grantCount} permission${grantCount === 1 ? '' : 's'}`} size="small" sx={{ mt: 1.5, mb: 1.5 }} />
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title={role.is_system ? 'View permissions' : 'Edit role'}>
                        <IconButton size="small" onClick={() => openEdit(role)} aria-label={`Edit ${role.name} role`}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {!role.is_system && (
                        <Tooltip title="Delete role">
                          <IconButton size="small" color="error" onClick={() => { setDeletingId(role.id); setConfirmOpen(true) }} aria-label={`Delete ${role.name} role`}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Delete Role"
        message="Delete this role? Users assigned to it may lose access. This cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setDeletingId(null) }}
      />
      </>
      )}
    </Box>
  )
}

export default function AdminRoles() {
  return (
    <ErrorBoundary>
      <RolesPageContent />
    </ErrorBoundary>
  )
}
