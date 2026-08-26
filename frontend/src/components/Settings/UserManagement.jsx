import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { useSnackbar } from 'notistack'
import { gql } from '@apollo/client'
import {
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { DataGrid } from '@mui/x-data-grid'
import AddIcon from '@mui/icons-material/Add'
import PersonOffIcon from '@mui/icons-material/PersonOff'

// ─── Inline GQL ───────────────────────────────────────────────────────────────
const USERS_QUERY = gql`
  query Users {
    users {
      id
      name
      email
      is_active
      roles {
        name
      }
    }
  }
`

const INVITE_USER_MUTATION = gql`
  mutation InviteUser($input: InviteUserInput!) {
    inviteUser(input: $input) {
      id
      name
      email
    }
  }
`

const UPDATE_USER_ROLE_MUTATION = gql`
  mutation UpdateUserRole($id: ID!, $role: String!) {
    updateUserRole(id: $id, role: $role) {
      id
      roles {
        name
      }
    }
  }
`

const DEACTIVATE_USER_MUTATION = gql`
  mutation DeactivateUser($id: ID!) {
    deactivateUser(id: $id) {
      id
      is_active
    }
  }
`

const ROLES = ['admin', 'receptionist', 'clinician', 'patient']

const ROLE_COLOUR = {
  admin: 'error',
  super_admin: 'error',
  receptionist: 'warning',
  clinician: 'info',
  patient: 'default',
}

// ─── Invite User Dialog ────────────────────────────────────────────────────────
function InviteDialog({ open, onClose }) {
  const { enqueueSnackbar } = useSnackbar()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('clinician')

  const [inviteUser, { loading }] = useMutation(INVITE_USER_MUTATION, {
    refetchQueries: [{ query: USERS_QUERY }],
    onCompleted: () => {
      enqueueSnackbar('Invitation sent!', { variant: 'success' })
      onClose()
    },
    onError: (e) => enqueueSnackbar(e.message, { variant: 'error' }),
  })

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800 }}>Invite User</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} pt={0.5}>
          <TextField label="Email address *" fullWidth size="small" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField select label="Role" fullWidth size="small" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize' }}>
                {r}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!email || loading}
          startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
          onClick={() => inviteUser({ variables: { input: { email, role } } })}
        >
          Send Invitation
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── UserManagement ───────────────────────────────────────────────────────────
export default function UserManagement() {
  const { enqueueSnackbar } = useSnackbar()
  const [inviteOpen, setInviteOpen] = useState(false)

  const { data, loading } = useQuery(USERS_QUERY, { fetchPolicy: 'cache-and-network' })
  const users = data?.users ?? []

  const [updateRole] = useMutation(UPDATE_USER_ROLE_MUTATION, {
    onCompleted: () => enqueueSnackbar('Role updated', { variant: 'success' }),
    onError: (e) => enqueueSnackbar(e.message, { variant: 'error' }),
  })

  const [deactivateUser] = useMutation(DEACTIVATE_USER_MUTATION, {
    onCompleted: () => enqueueSnackbar('User deactivated', { variant: 'info' }),
    onError: (e) => enqueueSnackbar(e.message, { variant: 'error' }),
  })

  const columns = [
    {
      field: 'name',
      headerName: 'User',
      flex: 1,
      minWidth: 180,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 13, fontWeight: 700 }}>{row.name?.[0] ?? '?'}</Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {row.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {row.email}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      field: 'roles',
      headerName: 'Role',
      width: 160,
      renderCell: ({ row }) => {
        const roleName = row.roles?.[0]?.name ?? 'none'
        return (
          <Select
            size="small"
            value={roleName}
            variant="standard"
            disableUnderline
            onChange={(e) => updateRole({ variables: { id: row.id, role: e.target.value } })}
            sx={{ fontSize: 12 }}
            renderValue={(v) => (
              <Chip
                label={v}
                color={ROLE_COLOUR[v] ?? 'default'}
                size="small"
                sx={{ fontWeight: 700, fontSize: 11, height: 22, textTransform: 'capitalize' }}
              />
            )}
          >
            {ROLES.map((r) => (
              <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize', fontSize: 13 }}>
                {r}
              </MenuItem>
            ))}
          </Select>
        )
      },
    },
    {
      field: 'is_active',
      headerName: 'Status',
      width: 100,
      renderCell: ({ row }) => (
        <Chip
          label={row.is_active ? 'Active' : 'Inactive'}
          color={row.is_active ? 'success' : 'default'}
          size="small"
          sx={{ fontWeight: 600, height: 22, fontSize: 11 }}
        />
      ),
    },
    {
      field: 'actions',
      headerName: '',
      width: 60,
      sortable: false,
      renderCell: ({ row }) =>
        row.is_active ? (
          <Tooltip title="Deactivate">
            <IconButton size="small" color="error" onClick={() => deactivateUser({ variables: { id: row.id } })}>
              <PersonOffIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null,
    },
  ]

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-end" mb={3}>
        <Box>
          <Typography variant="h6" fontWeight={800}>
            Users & Roles
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage team members and their access levels.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setInviteOpen(true)} sx={{ borderRadius: 2 }}>
          Invite User
        </Button>
      </Stack>

      <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        <DataGrid
          rows={users}
          columns={columns}
          loading={loading}
          autoHeight
          hideFooter={users.length <= 25}
          disableRowSelectionOnClick
          rowHeight={58}
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': { bgcolor: 'rgba(0,0,0,0.025)', fontWeight: 700, fontSize: 12 },
          }}
        />
      </Paper>

      <InviteDialog open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </Box>
  )
}
