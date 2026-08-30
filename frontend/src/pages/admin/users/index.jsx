import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, gql } from '@apollo/client'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Box,
  Grid,
  Paper,
  Typography,
  Stack,
  Button,
  TextField,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Avatar,
  Chip,
  Switch,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  Checkbox,
  Collapse,
  Tooltip,
  CircularProgress,
  InputAdornment,
  Badge,
  Divider,
} from '@mui/material'
import {
  PersonAdd,
  Edit,
  Block,
  ExpandMore,
  ExpandLess,
  Restore,
  Search,
  VerifiedUser,
  History,
  PeopleAlt,
  Shield,
  CheckCircle,
  SupervisorAccount,
} from '@mui/icons-material'
import { alpha, useTheme } from '@mui/material/styles'
import { DatePicker } from '@mui/x-date-pickers/DatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { useSnackbar } from 'notistack'
import { useAuth } from '../../../hooks/useAuth'

dayjs.extend(relativeTime)

// --- GraphQL (same as before) ---
const GET_ADMIN_DATA = gql`
  query GetAdminData($limit: Int, $offset: Int, $role: String, $search: String) {
    getUsers(limit: $limit, offset: $offset, role: $role, search: $search) {
      id
      email
      firstName
      lastName
      isActive
      lastLoginAt
      profile {
        id
        avatarUrl
      }
      roles {
        id
        name
        code
      }
      clinic {
        id
        name
      }
    }
    # BUG029 — getUsers() itself has no total; this real, filter-matching
    # count (never the current page's own row count) drives "Total Users" /
    # "Active Users" and the pagination total below.
    getUsersStats(role: $role, search: $search) {
      total
      active
    }
    getUserRoles {
      id
      name
      code
      description
    }
    getPermissions {
      id
    }
  }
`
const GET_RBAC_DATA = gql`
  query GetRBACData($roleId: ID!) {
    getPermissions {
      id
      action
      resource
      description
    }
    getRolePermissions(roleId: $roleId) {
      id
      permission {
        id
        action
        resource
      }
    }
  }
`
const GET_AUDIT_LOGS = gql`
  query GetAuditLogs($limit: Int, $offset: Int, $action: String, $resource: String) {
    # BUG029 — real total, matching the same action/resource filters as the
    # list below, so pagination stops at the real last page.
    getAuditLogsCount(action: $action, resource: $resource)
    getAuditLogs(limit: $limit, offset: $offset, action: $action, resource: $resource) {
      id
      action
      resource
      resourceId
      ipAddress
      userAgent
      outcome
      createdAt
      details
      user {
        id
        firstName
        lastName
        email
      }
    }
  }
`
const TOGGLE_USER = gql`
  mutation ToggleUser($id: ID!, $isActive: Boolean!) {
    updateUser(id: $id, input: { isActive: $isActive }) {
      id
      isActive
    }
  }
`
const UPDATE_ROLE_PERMS = gql`
  mutation UpdateRolePermissions($roleId: ID!, $permissionIds: [ID!]!) {
    updateRolePermissions(roleId: $roleId, permissionIds: $permissionIds)
  }
`
// REQ053/Phase G+3 — admin-only impersonation. target_user_id is the same
// shared UserProfiles/Users id every getUsers() row's own `id` already is.
const START_IMPERSONATION = gql`
  mutation StartImpersonation($target_user_id: String!, $reason: String!) {
    startImpersonation(target_user_id: $target_user_id, reason: $reason) {
      success
      userErrors {
        message
      }
    }
  }
`

// Role visual config — theme-derived, not a hand-picked hex map (see
// calendar/index.jsx, finances/index.jsx, messages/index.jsx for the same
// conversion).
// Keys must be the real seeded role names (backend/prisma/seed.ts's ROLES:
// admin/super_admin/manager/clinician/staff/patient) — this used to key off
// an older system_admin/clinic_manager/receptionist naming scheme that no
// real account has ever had, so every admin/super_admin/manager/staff user
// fell through to the `default` "Unknown" grey chip here (same dead-name
// class as AppShell.jsx's ROLE_COLORS, which had the identical
// receptionist-vs-staff mismatch).
function roleStyleFor(theme, roleCode) {
  const p = theme.palette
  const dark = theme.palette.mode === 'dark'
  const tone = (main, darkText, label) => ({ bg: alpha(main, dark ? 0.18 : 0.12), color: dark ? main : darkText, label })
  const styles = {
    admin: tone(p.error.main, p.error.dark, 'Admin'),
    super_admin: tone(p.error.main, p.error.dark, 'Super Admin'),
    manager: tone(p.secondary.main, p.secondary.dark, 'Manager'),
    clinician: tone(p.success.main, p.success.dark, 'Clinician'),
    staff: tone(p.info.main, p.info.dark, 'Staff'),
    patient: tone(p.warning.main, p.warning.dark, 'Patient'),
    default: { bg: 'action.hover', color: 'text.secondary', label: 'Unknown' },
  }
  return styles[roleCode] ?? styles.default
}

const ROLE_CODES = ['admin', 'super_admin', 'manager', 'clinician', 'staff', 'patient']

function actionStyleFor(theme, action) {
  const p = theme.palette
  const dark = theme.palette.mode === 'dark'
  const tone = (main, darkText, colorProp) => ({ bg: alpha(main, dark ? 0.18 : 0.12), textColor: dark ? main : darkText, color: colorProp })
  const styles = {
    CREATE: tone(p.success.main, p.success.dark, 'success'),
    UPDATE: tone(p.info.main, p.info.dark, 'info'),
    DELETE: tone(p.error.main, p.error.dark, 'error'),
    READ: { bg: 'action.hover', textColor: 'text.secondary', color: 'default' },
  }
  return styles[action] ?? styles.READ
}

// --- Sub-components ---
function TabPanel({ children, value, index }) {
  return <div hidden={value !== index}>{value === index && <Box sx={{ pt: 3 }}>{children}</Box>}</div>
}

function RoleChip({ roleCode, roleName }) {
  const theme = useTheme()
  const style = roleStyleFor(theme, roleCode)
  return (
    <Chip
      label={roleName || style.label}
      size="small"
      sx={{
        bgcolor: style.bg,
        color: style.color,
        fontWeight: 700,
        fontSize: '0.7rem',
        borderRadius: '6px',
        height: 22,
        border: 'none',
      }}
    />
  )
}

// Stitch-inspired stat card for summary row
function StatCard({ icon, value, label, color }) {
  return (
    <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2.5, flex: 1, minWidth: 150 }}>
      <Stack direction="row" alignItems="center" gap={1.5}>
        <Box sx={{ bgcolor: `${color}18`, p: 1, borderRadius: 2, display: 'flex' }}>
          {React.cloneElement(icon, { sx: { color, fontSize: 22 } })}
        </Box>
        <Box>
          <Typography variant="h5" fontWeight={800} lineHeight={1}>
            {value}
          </Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={500}>
            {label}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  )
}

// --- Main Component ---
export default function AdminUsers() {
  const theme = useTheme()
  // BRAND/BRAND_LIGHT kept as the same names the rest of this component
  // already uses throughout -- now resolved from the real theme instead
  // of a hardcoded hex pair, so every existing call site (sx props,
  // template literals, and plain component props alike) picks up dark
  // mode with no other change needed.
  const BRAND = theme.palette.primary.main
  const BRAND_LIGHT = alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.18 : 0.12)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { enqueueSnackbar } = useSnackbar()
  const { user: currentUser, startImpersonating } = useAuth()

  // REQ053/Phase G+3 — impersonation reason-prompt dialog state
  const [impersonateTarget, setImpersonateTarget] = useState(null)
  const [impersonateReason, setImpersonateReason] = useState('')
  // NEW-ADMIN-002: support ?tab=N so sidebar "Audit Log" link (/admin/users?tab=2) opens correct tab
  const [adminTab, setAdminTab] = useState(() => {
    const t = parseInt(searchParams.get('tab') ?? '0', 10)
    return isNaN(t) ? 0 : Math.min(t, 2)
  })

  // Tab 0 state
  const [userSearch, setUserSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [userPage, setUserPage] = useState(0)
  const rowsPerPage = 8
  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)

  // Tab 1 state
  const [selectedRole, setSelectedRole] = useState(null)
  const [localSelections, setLocalSelections] = useState([])

  // Tab 2 state
  const [actionFilter, setActionFilter] = useState('all')
  const [auditPage, setAuditPage] = useState(0)
  const [expandedLogId, setExpandedLogId] = useState(null)

  // Queries
  // REQ121 (F-21) — was cache-first; a user created/deleted elsewhere left
  // this directory stale until a hard refresh.
  const {
    data: adminData,
    loading: adminLoading,
    refetch: refetchAdmin,
  } = useQuery(GET_ADMIN_DATA, {
    variables: {
      limit: rowsPerPage,
      offset: userPage * rowsPerPage,
      role: roleFilter === 'all' ? null : roleFilter,
      search: userSearch || null,
    },
    fetchPolicy: 'cache-and-network',
  })

  const rolesList = adminData?.getUserRoles || []

  React.useEffect(() => {
    if (adminTab === 1 && rolesList.length > 0 && !selectedRole) {
      setSelectedRole(rolesList[0].id)
    }
  }, [adminTab, rolesList, selectedRole])

  const {
    data: rbacData,
    loading: rbacLoading,
    refetch: refetchRbac,
  } = useQuery(GET_RBAC_DATA, {
    variables: { roleId: selectedRole },
    skip: !selectedRole || adminTab !== 1,
  })

  // REQ121 (F-21) — an audit log is exactly the kind of data that should
  // never show a stale cached page while newer entries exist server-side.
  const { data: auditData, loading: auditLoading } = useQuery(GET_AUDIT_LOGS, {
    variables: { limit: rowsPerPage, offset: auditPage * rowsPerPage, action: actionFilter === 'all' ? null : actionFilter },
    fetchPolicy: 'cache-and-network',
    skip: adminTab !== 2,
  })

  const [toggleUserMutation] = useMutation(TOGGLE_USER)
  const [updateRolePermissions] = useMutation(UPDATE_ROLE_PERMS)
  const [startImpersonationMutation, { loading: impersonateLoading }] = useMutation(START_IMPERSONATION)

  const handleConfirmImpersonate = async () => {
    if (!impersonateTarget || !impersonateReason.trim()) return
    try {
      const { data } = await startImpersonationMutation({
        variables: { target_user_id: impersonateTarget.id, reason: impersonateReason.trim() },
      })
      const result = data?.startImpersonation
      if (!result?.success) {
        enqueueSnackbar(result?.userErrors?.[0]?.message ?? 'Failed to start impersonation', { variant: 'error' })
        return
      }
      startImpersonating()
      enqueueSnackbar(`Now viewing as ${impersonateTarget.firstName} ${impersonateTarget.lastName}`, { variant: 'info' })
      setImpersonateTarget(null)
      setImpersonateReason('')
      navigate('/')
    } catch (err) {
      enqueueSnackbar(err?.graphQLErrors?.[0]?.message ?? err.message ?? 'Failed to start impersonation', { variant: 'error' })
    }
  }

  React.useEffect(() => {
    if (rbacData) {
      setLocalSelections((rbacData.getRolePermissions || []).map((rp) => rp.permission.id))
    }
  }, [rbacData])

  const allPermissions = rbacData?.getPermissions || []
  const resourceMap = useMemo(() => {
    const map = {}
    allPermissions.forEach((p) => {
      if (!map[p.resource]) map[p.resource] = []
      map[p.resource].push(p)
    })
    return map
  }, [allPermissions])
  const uniqueResources = Object.keys(resourceMap).sort()

  const users = adminData?.getUsers || []
  const auditLogs = auditData?.getAuditLogs || []

  // FIX-3: Wire search to filter the displayed list
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return users
    const q = userSearch.toLowerCase()
    return users.filter(
      (u) =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.roles?.some((r) => r.name?.toLowerCase().includes(q) || r.code?.toLowerCase().includes(q)),
    )
  }, [users, userSearch])

  const handleToggleUserStatus = async (id, currentStatus) => {
    try {
      await toggleUserMutation({ variables: { id, isActive: !currentStatus } })
      refetchAdmin()
    } catch (err) {
      enqueueSnackbar(err?.graphQLErrors?.[0]?.message ?? err.message ?? 'Failed to update user status', { variant: 'error' })
    }
  }

  const getInitials = (first, last) => `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase()
  // Deterministic per-user colour, still varying across users -- pulled from
  // the real theme (not a fixed hex ramp) so it stays legible in dark mode.
  const getAvatarColor = (str = '') => {
    const colors = [
      theme.palette.primary.main,
      theme.palette.primary.dark,
      theme.palette.info.main,
      theme.palette.success.dark,
      theme.palette.secondary.dark,
      theme.palette.success.main,
    ]
    let hash = 0
    for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0
    return colors[hash % colors.length]
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      {/* PAGE HEADER — Stitch style */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="text.primary">
            User Management & Permissions
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Configure system access, define roles, and monitor security activity logs.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => navigate('/admin/users/new')}
          sx={{ bgcolor: BRAND, '&:hover': { bgcolor: 'primary.dark' }, borderRadius: 2, fontWeight: 700, px: 3 }}
        >
          Add User
        </Button>
      </Stack>

      {/* SUMMARY STATS */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <StatCard icon={<PeopleAlt />} value={adminData?.getUsersStats?.total ?? 0} label="Total Users" color={theme.palette.secondary.main} />
        <StatCard icon={<CheckCircle />} value={adminData?.getUsersStats?.active ?? 0} label="Active Users" color={theme.palette.success.main} />
        <StatCard icon={<Shield />} value={rolesList.length} label="System Roles" color={BRAND} />
        <StatCard icon={<VerifiedUser />} value={adminData?.getPermissions?.length ?? 0} label="Permissions Defined" color={theme.palette.warning.main} />
      </Box>

      {/* TABS — Stitch styled */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, bgcolor: 'action.hover', p: 0.75, borderRadius: 2, width: 'fit-content' }}>
        {[
          { label: 'Users Directory', icon: <PeopleAlt sx={{ fontSize: 16 }} /> },
          { label: 'Permissions Matrix', icon: <VerifiedUser sx={{ fontSize: 16 }} /> },
          { label: 'Audit Logs', icon: <History sx={{ fontSize: 16 }} /> },
        ].map((tab, i) => (
          <Button
            key={i}
            onClick={() => {
              setAdminTab(i)
              // BUG032 -- adminTab was pure local state with no URL sync, so
              // AdminLayout.jsx's own sidebar "Audit Log" (/admin/users?tab=2)
              // quick-nav link could never track a live in-page tab switch --
              // the URL simply never changed. Keep ?tab= in sync so the
              // sidebar highlight (and a shared/bookmarked link) reflects the
              // real open tab.
              setSearchParams(i === 0 ? {} : { tab: String(i) }, { replace: true })
            }}
            startIcon={tab.icon}
            sx={{
              borderRadius: 1.5,
              px: 2.5,
              py: 1,
              fontWeight: 600,
              fontSize: '0.85rem',
              bgcolor: adminTab === i ? 'white' : 'transparent',
              color: adminTab === i ? BRAND : 'text.secondary',
              boxShadow: adminTab === i ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
              '&:hover': { bgcolor: adminTab === i ? 'white' : 'rgba(0,0,0,0.04)' },
            }}
          >
            {tab.label}
          </Button>
        ))}
      </Box>

      {/* ===== TAB 0: USERS ===== */}
      <TabPanel value={adminTab} index={0}>
        {/* Toolbar */}
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} mb={3}>
          <TextField
            size="small"
            placeholder="Search by name or email..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, bgcolor: 'background.paper', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <FormControl size="small" sx={{ minWidth: 170, bgcolor: 'background.paper' }}>
            <InputLabel>Filter by Role</InputLabel>
            <Select value={roleFilter} label="Filter by Role" onChange={(e) => setRoleFilter(e.target.value)} sx={{ borderRadius: 2 }}>
              <MenuItem value="all">All Roles</MenuItem>
              {ROLE_CODES.map((code) => (
                <MenuItem key={code} value={code}>
                  {roleStyleFor(theme, code).label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell
                    sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5, textTransform: 'uppercase' }}
                  >
                    User
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5, textTransform: 'uppercase' }}
                  >
                    Role
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5, textTransform: 'uppercase' }}
                  >
                    Clinic
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5, textTransform: 'uppercase' }}
                  >
                    Status
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5, textTransform: 'uppercase' }}
                  >
                    Last Login
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5, textTransform: 'uppercase' }}
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {adminLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={32} sx={{ color: BRAND }} />
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((u) => {
                    const initials = getInitials(u.firstName, u.lastName)
                    const avatarBg = getAvatarColor(`${u.firstName}${u.lastName}`)
                    return (
                      <TableRow key={u.id} hover sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
                        <TableCell>
                          <Stack direction="row" alignItems="center" gap={2}>
                            <Avatar
                              src={u.profile?.avatarUrl}
                              sx={{ width: 40, height: 40, bgcolor: avatarBg, fontWeight: 700, fontSize: 14 }}
                            >
                              {!u.profile?.avatarUrl && initials}
                            </Avatar>
                            <Box>
                              <Typography variant="subtitle2" fontWeight={700}>
                                {u.firstName} {u.lastName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {u.email}
                              </Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" gap={0.5} flexWrap="wrap">
                            {u.roles.map((r) => (
                              <RoleChip key={r.id} roleCode={r.code} roleName={r.name} />
                            ))}
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{u.clinic?.name || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" alignItems="center" gap={1}>
                            <Switch
                              checked={u.isActive}
                              onChange={() => handleToggleUserStatus(u.id, u.isActive)}
                              color="success"
                              size="small"
                            />
                            <Typography variant="caption" color={u.isActive ? 'success.main' : 'text.disabled'} fontWeight={600}>
                              {u.isActive ? 'Active' : 'Inactive'}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary">
                            {u.lastLoginAt ? dayjs(u.lastLoginAt).fromNow() : 'Never'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit User">
                            <IconButton
                              size="small"
                              onClick={() => navigate(`/admin/users/${u.id}/edit`)}
                              sx={{ color: BRAND, '&:hover': { bgcolor: BRAND_LIGHT } }}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={u.isActive ? 'Deactivate' : 'Reactivate'}>
                            <IconButton
                              size="small"
                              color={u.isActive ? 'error' : 'success'}
                              onClick={() => handleToggleUserStatus(u.id, u.isActive)}
                            >
                              {u.isActive ? <Block fontSize="small" /> : <Restore fontSize="small" />}
                            </IconButton>
                          </Tooltip>
                          {/* REQ053/Phase G+3 — can't impersonate yourself */}
                          {u.id !== currentUser?.id && (
                            <Tooltip title="Impersonate">
                              <IconButton
                                size="small"
                                aria-label={`Impersonate ${u.email}`}
                                onClick={() => setImpersonateTarget(u)}
                                sx={{ color: 'secondary.dark', '&:hover': { bgcolor: (t) => alpha(t.palette.secondary.main, 0.12) } }}
                              >
                                <SupervisorAccount fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderTop: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            {/* BUG029 — real total from getUsersStats, not the current page's
                own filteredUsers.length repeated on both sides. */}
            <Typography variant="caption" color="text.secondary">
              Showing {filteredUsers.length} of {adminData?.getUsersStats?.total ?? 0} users
            </Typography>
            <TablePagination
              component="div"
              count={adminData?.getUsersStats?.total ?? 0}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[8]}
              page={userPage}
              onPageChange={(e, p) => setUserPage(p)}
            />
          </Box>
        </Paper>
      </TabPanel>

      {/* ===== TAB 1: RBAC MATRIX ===== */}
      <TabPanel value={adminTab} index={1}>
        <Box display="flex" gap={3} flexDirection={{ xs: 'column', lg: 'row' }}>
          {/* Role Selector Sidebar */}
          <Box sx={{ width: { xs: '100%', lg: 260 }, flexShrink: 0 }}>
            <Typography variant="overline" fontWeight={700} color="text.secondary" display="block" mb={1.5}>
              Select Role
            </Typography>
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
              {(rolesList.length > 0
                ? rolesList
                : ROLE_CODES.map((code, i) => ({ id: String(i), code, name: roleStyleFor(theme, code).label, description: '' }))
              ).map((role, idx, arr) => {
                const style = roleStyleFor(theme, role.code)
                const isSelected = selectedRole === role.id
                return (
                  <Box key={role.id}>
                    <ListItemButton
                      onClick={() => setSelectedRole(role.id)}
                      sx={{
                        px: 2,
                        py: 1.5,
                        bgcolor: isSelected ? BRAND_LIGHT : 'transparent',
                        borderLeft: isSelected ? `3px solid ${BRAND}` : '3px solid transparent',
                        '&:hover': { bgcolor: isSelected ? BRAND_LIGHT : 'action.hover' },
                      }}
                    >
                      <Box
                        sx={{
                          bgcolor: style.bg,
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 1.5,
                        }}
                      >
                        <Typography variant="caption" fontWeight={800} sx={{ color: style.color }}>
                          {role.name[0]}
                        </Typography>
                      </Box>
                      <ListItemText
                        primary={
                          <Typography variant="subtitle2" fontWeight={isSelected ? 800 : 600} color={isSelected ? BRAND : 'text.primary'}>
                            {role.name}
                          </Typography>
                        }
                      />
                    </ListItemButton>
                    {idx < arr.length - 1 && <Divider />}
                  </Box>
                )
              })}
            </Paper>
          </Box>

          {/* MATRIX TABLE */}
          <Box flexGrow={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography variant="overline" fontWeight={700} color="text.secondary">
                Permissions Matrix
              </Typography>
              <Button
                variant="contained"
                size="small"
                sx={{ bgcolor: BRAND, borderRadius: 2, fontWeight: 700 }}
                onClick={async () => {
                  try {
                    await updateRolePermissions({ variables: { roleId: selectedRole, permissionIds: localSelections } })
                    // WV-5 — no alert()/confirm()/prompt(), ever. DATA-9 —
                    // getRolePermissions defaults to cache-first, so without
                    // this refetch, switching roles and back served the
                    // stale pre-save permissions from Apollo's cache.
                    await refetchRbac()
                    enqueueSnackbar('Permissions saved', { variant: 'success' })
                  } catch (err) {
                    enqueueSnackbar(err?.graphQLErrors?.[0]?.message ?? err.message ?? 'Failed to save permissions', { variant: 'error' })
                  }
                }}
              >
                Save Changes
              </Button>
            </Stack>
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
              <TableContainer sx={{ maxHeight: 520 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          bgcolor: 'action.hover',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          color: 'text.secondary',
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          minWidth: 180,
                        }}
                      >
                        Resource
                      </TableCell>
                      {['CREATE', 'READ', 'UPDATE', 'DELETE'].map((a) => (
                        <TableCell
                          key={a}
                          align="center"
                          sx={{
                            bgcolor: 'action.hover',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            color: 'text.secondary',
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                          }}
                        >
                          {a}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rbacLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                          <CircularProgress size={28} sx={{ color: BRAND }} />
                        </TableCell>
                      </TableRow>
                    ) : uniqueResources.length === 0 ? (
                      // Fallback mock matrix rows
                      ['Appointments', 'Patients', 'Clinicians', 'Clinics', 'Finance', 'Audit Logs', 'Users', 'Permissions'].map((res) => (
                        <TableRow key={res} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {res}
                            </Typography>
                          </TableCell>
                          {['CREATE', 'READ', 'UPDATE', 'DELETE'].map((a) => (
                            <TableCell key={a} align="center">
                              <Checkbox
                                color="primary"
                                defaultChecked={a === 'READ'}
                                sx={{ color: 'text.disabled', '&.Mui-checked': { color: BRAND } }}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      uniqueResources.map((res) => (
                        <TableRow key={res} hover>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600}>
                              {res}
                            </Typography>
                          </TableCell>
                          {['CREATE', 'READ', 'UPDATE', 'DELETE'].map((action) => {
                            const perm = resourceMap[res]?.find((p) => p.action === action)
                            if (!perm)
                              return (
                                <TableCell key={action} align="center">
                                  <Typography variant="caption" color="text.disabled">
                                    —
                                  </Typography>
                                </TableCell>
                              )
                            return (
                              <TableCell key={action} align="center">
                                <Checkbox
                                  checked={localSelections.includes(perm.id)}
                                  onChange={() =>
                                    setLocalSelections((prev) =>
                                      prev.includes(perm.id) ? prev.filter((id) => id !== perm.id) : [...prev, perm.id],
                                    )
                                  }
                                  color="primary"
                                  sx={{ color: 'text.disabled', '&.Mui-checked': { color: BRAND } }}
                                />
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Box>
        </Box>
      </TabPanel>

      {/* ===== TAB 2: AUDIT LOG ===== */}
      <TabPanel value={adminTab} index={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} mb={3}>
          <TextField
            size="small"
            placeholder="Search audit logs..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{ flex: 1, bgcolor: 'background.paper', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <FormControl size="small" sx={{ minWidth: 160, bgcolor: 'white' }}>
            <InputLabel>Action</InputLabel>
            <Select value={actionFilter} label="Action" onChange={(e) => setActionFilter(e.target.value)} sx={{ borderRadius: 2 }}>
              <MenuItem value="all">All Actions</MenuItem>
              <MenuItem value="CREATE">Create</MenuItem>
              <MenuItem value="UPDATE">Update</MenuItem>
              <MenuItem value="DELETE">Delete</MenuItem>
            </Select>
          </FormControl>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="From"
              slotProps={{
                textField: { size: 'small', sx: { width: 140, bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: 2 } } },
              }}
            />
            <DatePicker
              label="To"
              slotProps={{
                textField: { size: 'small', sx: { width: 140, bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: 2 } } },
              }}
            />
          </LocalizationProvider>
        </Stack>

        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: 'action.hover' }}>
                <TableRow>
                  <TableCell sx={{ width: 40 }} />
                  <TableCell
                    sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5 }}
                  >
                    Timestamp
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5 }}
                  >
                    User
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5 }}
                  >
                    Action
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5 }}
                  >
                    Resource
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5 }}
                  >
                    IP Address
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={28} sx={{ color: BRAND }} />
                    </TableCell>
                  </TableRow>
                ) : auditLogs.length === 0 ? (
                  // P3.6: this used to fall back to 3 fabricated rows
                  // ("s.chen@healthsync.com" etc.) on any real empty result --
                  // a filter with no matches, or a genuinely quiet org, showed
                  // fake activity attributed to fake people. getAuditLogs is a
                  // real, fully-wired query now (AuditLogInterceptor writes a
                  // real row per mutation); an empty result means no matching
                  // activity, not "no backend".
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                      No audit log entries match the current filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  auditLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id
                    const actionStyle = actionStyleFor(theme, log.action)
                    return (
                      <React.Fragment key={log.id}>
                        <TableRow hover sx={{ cursor: 'pointer', '& > *': { borderBottom: 'unset' }, '&:hover': { bgcolor: 'action.hover' } }}>
                          <TableCell>
                            <IconButton
                              size="small"
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              sx={{ color: 'text.secondary' }}
                            >
                              {isExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                              {dayjs(log.createdAt).format('DD MMM YYYY, h:mm A')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" alignItems="center" gap={1}>
                              <Avatar
                                sx={{
                                  width: 26,
                                  height: 26,
                                  bgcolor: getAvatarColor(log.user?.email || ''),
                                  fontSize: 11,
                                  fontWeight: 700,
                                }}
                              >
                                {log.user?.email?.[0]?.toUpperCase()}
                              </Avatar>
                              <Typography variant="body2" fontWeight={500}>
                                {log.user?.email || 'System'}
                              </Typography>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" alignItems="center" gap={0.75}>
                              <Chip
                                label={log.action}
                                size="small"
                                sx={{
                                  bgcolor: actionStyle.bg,
                                  color: actionStyle.textColor,
                                  fontWeight: 700,
                                  fontSize: '0.7rem',
                                  height: 22,
                                  borderRadius: '6px',
                                }}
                              />
                              {log.outcome === 'failure' && (
                                <Chip
                                  label="failed"
                                  size="small"
                                  color="error"
                                  variant="outlined"
                                  sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20 }}
                                />
                              )}
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight={600} display="inline">
                              {log.resource}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.75, fontFamily: 'monospace' }}>
                              #{log.resourceId}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                              {log.ipAddress}
                            </Typography>
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                              {/* Deliberate exception (FRONTEND_RULES.md UI-2/§22 precedent, same
                                  category as login.jsx's BrandPanel): a fixed dark code/JSON payload
                                  viewer, independent of the app's own light/dark toggle -- always
                                  dark like a terminal, never a light-mode variant. */}
                              <Box sx={{ mx: 2, mb: 2, bgcolor: '#0D1B2A', borderRadius: 2, p: 2 }}>
                                {log.userAgent && (
                                  <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mb: 1, fontFamily: 'monospace' }}>
                                    {log.userAgent}
                                  </Typography>
                                )}
                                <Typography variant="caption" color="#64748B" fontWeight={700} mb={1} display="block" letterSpacing={1}>
                                  PAYLOAD
                                </Typography>
                                <Box
                                  component="pre"
                                  sx={{
                                    m: 0,
                                    color: '#A7F3D0',
                                    fontSize: 12,
                                    fontFamily: '"Fira Code", monospace',
                                    overflowX: 'auto',
                                    lineHeight: 1.6,
                                  }}
                                >
                                  {JSON.stringify(JSON.parse(log.details || '{}'), null, 2)}
                                </Box>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
          {/* BUG029 — real total from getAuditLogsCount. */}
          <TablePagination
            component="div"
            count={auditData?.getAuditLogsCount ?? 0}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={[8]}
            page={auditPage}
            onPageChange={(e, p) => setAuditPage(p)}
          />
        </Paper>
      </TabPanel>

      {/* ADD/EDIT USER DIALOG */}
      <Dialog
        open={userDialogOpen}
        onClose={() => setUserDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>{editUser?.id ? 'Edit User' : 'Create New User'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2.5} pt={0.5}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="First Name"
                value={editUser?.firstName || ''}
                onChange={(e) => setEditUser({ ...editUser, firstName: e.target.value })}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Last Name"
                value={editUser?.lastName || ''}
                onChange={(e) => setEditUser({ ...editUser, lastName: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={editUser?.email || ''}
                onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
              />
            </Grid>
            {!editUser?.id && (
              <Grid item xs={12}>
                <TextField fullWidth label="Temporary Password" type="password" helperText="User must reset password on first login." />
              </Grid>
            )}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>System Role</InputLabel>
                <Select
                  value={editUser?.roleCodes?.[0] || ''}
                  label="System Role"
                  onChange={(e) => setEditUser({ ...editUser, roleCodes: [e.target.value] })}
                >
                  {ROLE_CODES.map((code) => (
                    <MenuItem key={code} value={code}>
                      <RoleChip roleCode={code} roleName={roleStyleFor(theme, code).label} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setUserDialogOpen(false)} sx={{ color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button variant="contained" sx={{ bgcolor: BRAND, borderRadius: 2, fontWeight: 700 }}>
            Save User
          </Button>
        </DialogActions>
      </Dialog>

      {/* REQ053/Phase G+3 — impersonation reason prompt */}
      <Dialog
        open={!!impersonateTarget}
        onClose={() => setImpersonateTarget(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Impersonate User</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            You are about to view MediBook as{' '}
            <strong>
              {impersonateTarget?.firstName} {impersonateTarget?.lastName}
            </strong>
            . This session is time-boxed and every action you take is logged under your own account.
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={2}
            label="Reason"
            placeholder="e.g. Investigating a support ticket about booking failures"
            value={impersonateReason}
            onChange={(e) => setImpersonateReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setImpersonateTarget(null)} sx={{ color: 'text.secondary' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!impersonateReason.trim() || impersonateLoading}
            onClick={handleConfirmImpersonate}
            sx={{ bgcolor: BRAND, borderRadius: 2, fontWeight: 700 }}
          >
            {impersonateLoading ? 'Starting…' : 'Start Impersonation'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
