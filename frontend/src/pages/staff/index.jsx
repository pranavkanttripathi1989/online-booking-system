import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, gql } from '@apollo/client'
import { alpha } from '@mui/material'
import {
  Box, Button, Avatar, Typography, Chip, Grid, Card, CardContent,
  Stack, Divider, Paper, Table, TableBody, TableCell, TableHead,
  TableRow, TableContainer, Rating, LinearProgress, Tabs, Tab, TextField, InputAdornment,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  CircularProgress, Alert,
} from '@mui/material'
import { useSnackbar } from 'notistack'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import SearchRoundedIcon from '@mui/icons-material/SearchRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import PersonOffRoundedIcon from '@mui/icons-material/PersonOffRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import WorkRoundedIcon from '@mui/icons-material/WorkRounded'
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded'
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded'
import EmailRoundedIcon from '@mui/icons-material/EmailRounded'
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded'

// backend/src/staff/** was built from scratch specifically against this page's
// (and new.jsx/edit.jsx's) MockStore shape — see staff/entities/staff.entity.ts.
// Never wired up until now; this page ran on mocks/store.js exclusively.
const GET_STAFF = gql`
  query GetStaff {
    staff {
      id name email phone role department status since address notes
    }
  }
`
const DEACTIVATE_STAFF = gql`
  mutation DeactivateStaff($id: ID!) {
    deactivateStaff(id: $id) { id status }
  }
`

function getInitials(name) {
  return name.trim().split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) || '?'
}

const ROLE_COLORS = {
  Receptionist:       '#1A73E8',
  Admin:              '#0F9D58',
  Nurse:              '#9334E6',
  'Lab Technician':   '#FA7B17',
  'IT Administrator': '#009688',
  'Billing Specialist': '#D93025',
  'Security Officer': '#5F6368',
}

const STATUS_MAP = {
  active:   { label: 'Active',   bg: '#E6F4EA', text: '#137333', border: '#CEEAD6' },
  on_leave: { label: 'On Leave', bg: '#FEF7E0', text: '#8A4700', border: '#FDD663' },
  inactive: { label: 'Inactive', bg: '#F8F9FA', text: '#5F6368', border: '#E8EAED' },
}

export default function StaffPage() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('All')
  const [tab, setTab] = useState(0)
  const [deactivateTarget, setDeactivateTarget] = useState(null) // SUG-STAFF-005

  // REQ121 (F-21) — was cache-first (the global default), leaving this list
  // stale after e.g. a deactivation on a different tab/device until a hard
  // refresh.
  const { data, loading, error, refetch } = useQuery(GET_STAFF, { fetchPolicy: 'cache-and-network' })
  const [deactivateStaffMutation] = useMutation(DEACTIVATE_STAFF)
  const staffList = data?.staff || []

  const departments = ['All', ...new Set(staffList.map(s => s.department))]

  const filtered = staffList.filter(s => {
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) || s.role.toLowerCase().includes(search.toLowerCase()) || s.department.toLowerCase().includes(search.toLowerCase())
    const matchDept = departmentFilter === 'All' || s.department === departmentFilter
    const matchStatus = tab === 0 || (tab === 1 && s.status === 'active') || (tab === 2 && s.status !== 'active')
    return matchSearch && matchDept && matchStatus
  })

  const activeCount = staffList.filter(s => s.status === 'active').length

  return (
    <Box className="page-enter" sx={{ pb: 4 }}>
      <Helmet><title>Staff — MediBook</title></Helmet>

      {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>Failed to load staff: {error.message}</Alert>}

      {loading && !data ? (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      ) : (
      <>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ color: '#0D1B2E' }}>Staff Management</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>{activeCount} active · {staffList.length} total staff members</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />}
          onClick={() => navigate('/staff/new')}
          sx={{
          borderRadius: 2.5, textTransform: 'none', fontWeight: 700,
          background: 'linear-gradient(135deg, #00858F 0%, #006D77 100%)',
          boxShadow: '0 4px 14px rgba(0,109,119,0.30)',
          width: { xs: '100%', sm: 'auto' },
          '&:hover': { boxShadow: '0 6px 20px rgba(0,109,119,0.45)', transform: 'translateY(-1px)' },
          transition: 'all 0.2s ease',
        }}>Add Staff Member</Button>
      </Box>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {[
          { label: 'Total Staff', value: staffList.length, icon: PersonRoundedIcon, color: '#1565C7' },
          { label: 'Active', value: staffList.filter(s => s.status === 'active').length, icon: CheckCircleRoundedIcon, color: '#0B7B5C' },
          { label: 'On Leave', value: staffList.filter(s => s.status === 'on_leave').length, icon: PersonOffRoundedIcon, color: '#D97706' },
          { label: 'Departments', value: new Set(staffList.map(s => s.department)).size, icon: WorkRoundedIcon, color: '#7C3AED' },
        ].map((kpi) => (
          <Grid item xs={6} md={3} key={kpi.label}>
            <Card sx={{ borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
              <CardContent sx={{ p: '16px !important' }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h4" fontWeight={800} sx={{ color: kpi.color }}>{kpi.value}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>{kpi.label}</Typography>
                  </Box>
                  <Box sx={{ width: 44, height: 44, borderRadius: 2.5, bgcolor: `${kpi.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <kpi.icon sx={{ color: kpi.color, fontSize: '1.3rem' }} />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      <Paper sx={{ border: '1px solid #E2E8F0', borderRadius: 3, boxShadow: 'none', mb: 3 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #E2E8F0', display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            size="small" placeholder="Search staff…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" sx={{ color: 'text.disabled' }} /></InputAdornment> }}
            sx={{ flex: 1, minWidth: 220, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
              <Box sx={{ display: 'flex', overflowX: 'auto', gap: 0.75, pb: 0.5, '&::-webkit-scrollbar': { display: 'none' } }}>
            {departments.map(d => (
              <Chip key={d} label={d} onClick={() => setDepartmentFilter(d)} size="small"
                sx={{
                  flexShrink: 0, fontWeight: 700, cursor: 'pointer', borderRadius: '8px',
                  bgcolor: departmentFilter === d ? 'rgba(0,109,119,0.10)' : '#F8F9FA',
                  color: departmentFilter === d ? '#006D77' : '#5F6368',
                  border: `1.5px solid ${departmentFilter === d ? 'rgba(0,109,119,0.40)' : '#E8EAED'}`,
                  '&:hover': { bgcolor: departmentFilter === d ? 'rgba(0,109,119,0.12)' : '#F1F3F4' },
                }}
              />
            ))}
          </Box>
        </Box>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, minHeight: 44, fontSize: '0.85rem', color: '#5F6368' }, '& .MuiTab-root.Mui-selected': { color: '#006D77' }, '& .MuiTabs-indicator': { bgcolor: '#006D77', height: 3, borderRadius: '3px 3px 0 0' } }}>
          <Tab label={`All (${staffList.length})`} />
          <Tab label={`Active (${staffList.filter(s => s.status === 'active').length})`} />
          <Tab label={`Others (${staffList.filter(s => s.status !== 'active').length})`} />
        </Tabs>

        {/* ── Table ─────────────────────────────────────────────────────── */}
        <TableContainer>
        <Table>
          <TableHead>
            <TableRow sx={{ '& th': { fontWeight: 700, color: 'text.secondary', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', bgcolor: '#F8FAFC', py: 1.2 } }}>
              <TableCell>Staff Member</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Department</TableCell>
              <TableCell>Phone</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((s) => {
              const roleColor = ROLE_COLORS[s.role] || '#64748B'
              const status = STATUS_MAP[s.status] || { label: s.status, color: 'default' }
              return (
                <TableRow key={s.id} hover
                  onClick={() => navigate(`/staff/edit/${s.id}`)}
                  sx={{ '&:last-child td': { border: 0 }, cursor: 'pointer' }}>
                  <TableCell>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ width: 36, height: 36, bgcolor: alpha(roleColor, 0.15), color: roleColor, fontSize: '0.875rem', fontWeight: 700 }}>{getInitials(s.name)}</Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>{s.name}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Since {s.since}</Typography>
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip label={s.role} size="small" sx={{ bgcolor: `${roleColor}18`, color: roleColor, fontWeight: 700, fontSize: '0.72rem', borderRadius: 1.5 }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{s.department}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{s.phone}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{s.email}</TableCell>
                  <TableCell>
                    <Chip label={STATUS_MAP[s.status]?.label ?? s.status} size="small" sx={{
                      bgcolor: STATUS_MAP[s.status]?.bg ?? '#F8F9FA',
                      color: STATUS_MAP[s.status]?.text ?? '#5F6368',
                      border: `1px solid ${STATUS_MAP[s.status]?.border ?? '#E8EAED'}`,
                      fontWeight: 700, fontSize: '0.72rem', borderRadius: '8px', height: 24,
                    }} />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Edit staff member">
                        <IconButton size="small"
                          onClick={(e) => { e.stopPropagation(); navigate(`/staff/edit/${s.id}`) }}
                          sx={{ color: '#006D77', '&:hover': { bgcolor: 'rgba(0,109,119,0.10)' } }}>
                          <EditRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Deactivate">
                        <IconButton size="small"
                          onClick={(e) => { e.stopPropagation(); setDeactivateTarget(s) }}
                          sx={{ color: 'error.main', '&:hover': { bgcolor: 'rgba(211,48,37,0.08)' } }}>
                          <PersonOffRoundedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              )
            })}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>No staff members found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        </TableContainer>
      </Paper>

      {/* SUG-STAFF-005: Deactivate confirmation dialog */}
      <Dialog open={!!deactivateTarget} onClose={() => setDeactivateTarget(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>Deactivate Staff Member</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Deactivate <strong>{deactivateTarget?.name}</strong>? They will lose system access immediately. You can reactivate them from the edit page.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 2.5, pb: 2, gap: 1 }}>
          <Button onClick={() => setDeactivateTarget(null)} variant="outlined"
            sx={{ borderRadius: 2, borderColor: '#E2E8F0', color: '#5F6368', '&:hover': { borderColor: '#CBD5E1' }, textTransform: 'none', fontWeight: 700 }}>
            Cancel
          </Button>
          <Button variant="contained" color="error"
            onClick={async () => {
              await deactivateStaffMutation({ variables: { id: deactivateTarget?.id } })
              await refetch()
              enqueueSnackbar(`${deactivateTarget?.name} has been deactivated`, { variant: 'warning' })
              setDeactivateTarget(null)
            }}
            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
            Yes, Deactivate
          </Button>
        </DialogActions>
      </Dialog>
      </>
      )}
    </Box>
  )
}
