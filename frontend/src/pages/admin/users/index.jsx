import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Grid, Paper, Typography, Stack, Button, TextField, Select, MenuItem,
  Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Avatar, Chip, Switch, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, FormControl, InputLabel, List, ListItemButton,
  ListItemText, Checkbox, Collapse, Tooltip, CircularProgress, InputAdornment,
  Badge, Divider
} from '@mui/material';
import {
  PersonAdd, Edit, Block, ExpandMore, ExpandLess, Restore, Search,
  VerifiedUser, History, PeopleAlt, Shield, CheckCircle
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

// --- GraphQL (same as before) ---
const GET_ADMIN_DATA = gql`
  query GetAdminData($limit: Int, $offset: Int, $role: String, $search: String) {
    getUsers(limit: $limit, offset: $offset, role: $role, search: $search) {
      id email firstName lastName isActive lastLoginAt
      profile { id avatarUrl }
      roles { id name code }
      clinic { id name }
    }
    getUserRoles { id name code description }
  }
`;
const GET_RBAC_DATA = gql`
  query GetRBACData($roleId: ID!) {
    getPermissions { id action resource description }
    getRolePermissions(roleId: $roleId) { id permission { id action resource } }
  }
`;
const GET_AUDIT_LOGS = gql`
  query GetAuditLogs($limit: Int, $offset: Int, $action: String, $resource: String) {
    getAuditLogs(limit: $limit, offset: $offset, action: $action, resource: $resource) {
      id action resource resourceId ipAddress createdAt details
      user { id firstName lastName email }
    }
  }
`;
const TOGGLE_USER = gql`
  mutation ToggleUser($id: ID!, $isActive: Boolean!) {
    updateUser(id: $id, input: { isActive: $isActive }) { id isActive }
  }
`;
const UPDATE_ROLE_PERMS = gql`
  mutation UpdateRolePermissions($roleId: ID!, $permissionIds: [ID!]!) {
    updateRolePermissions(roleId: $roleId, permissionIds: $permissionIds)
  }
`;

// --- Design Tokens (from Stitch design) ---
const BRAND = '#006D77';
const BRAND_LIGHT = '#E0F2F1';

// Role visual config — matching Stitch color scheme
const ROLE_STYLES = {
  system_admin:   { bg: '#FEE2E2', color: '#B91C1C', label: 'System Admin' },
  clinic_manager: { bg: '#EDE9FE', color: '#6D28D9', label: 'Clinic Manager' },
  clinician:      { bg: '#D1FAE5', color: '#065F46', label: 'Clinician' },
  receptionist:   { bg: '#DBEAFE', color: '#1E40AF', label: 'Receptionist' },
  patient:        { bg: '#FEF3C7', color: '#92400E', label: 'Patient' },
  default:        { bg: '#F1F5F9', color: '#475569', label: 'Unknown' },
};

const ACTION_STYLES = {
  CREATE: { color: 'success', bg: '#D1FAE5', textColor: '#065F46' },
  UPDATE: { color: 'info',    bg: '#DBEAFE', textColor: '#1E40AF' },
  DELETE: { color: 'error',   bg: '#FEE2E2', textColor: '#B91C1C' },
  READ:   { color: 'default', bg: '#F1F5F9', textColor: '#475569' },
};

// --- Sub-components ---
function TabPanel({ children, value, index }) {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function RoleChip({ roleCode, roleName }) {
  const style = ROLE_STYLES[roleCode] || ROLE_STYLES.default;
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
  );
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
          <Typography variant="h5" fontWeight={800} lineHeight={1}>{value}</Typography>
          <Typography variant="caption" color="text.secondary" fontWeight={500}>{label}</Typography>
        </Box>
      </Stack>
    </Paper>
  );
}

// --- Main Component ---
export default function AdminUsers() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // NEW-ADMIN-002: support ?tab=N so sidebar "Audit Log" link (/admin/users?tab=2) opens correct tab
  const [adminTab, setAdminTab] = useState(() => {
    const t = parseInt(searchParams.get('tab') ?? '0', 10);
    return isNaN(t) ? 0 : Math.min(t, 2);
  });

  // Tab 0 state
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [userPage, setUserPage] = useState(0);
  const rowsPerPage = 8;
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);

  // Tab 1 state
  const [selectedRole, setSelectedRole] = useState(null);
  const [localSelections, setLocalSelections] = useState([]);

  // Tab 2 state
  const [actionFilter, setActionFilter] = useState('all');
  const [auditPage, setAuditPage] = useState(0);
  const [expandedLogId, setExpandedLogId] = useState(null);

  // Queries
  const { data: adminData, loading: adminLoading, refetch: refetchAdmin } = useQuery(GET_ADMIN_DATA, {
    variables: { limit: rowsPerPage, offset: userPage * rowsPerPage, role: roleFilter === 'all' ? null : roleFilter, search: userSearch || null }
  });

  const rolesList = adminData?.getUserRoles || [];

  React.useEffect(() => {
    if (adminTab === 1 && rolesList.length > 0 && !selectedRole) {
      setSelectedRole(rolesList[0].id);
    }
  }, [adminTab, rolesList, selectedRole]);

  const { data: rbacData, loading: rbacLoading } = useQuery(GET_RBAC_DATA, {
    variables: { roleId: selectedRole },
    skip: !selectedRole || adminTab !== 1
  });

  const { data: auditData, loading: auditLoading } = useQuery(GET_AUDIT_LOGS, {
    variables: { limit: rowsPerPage, offset: auditPage * rowsPerPage, action: actionFilter === 'all' ? null : actionFilter },
    skip: adminTab !== 2
  });

  const [toggleUserMutation] = useMutation(TOGGLE_USER);
  const [updateRolePermissions] = useMutation(UPDATE_ROLE_PERMS);

  React.useEffect(() => {
    if (rbacData) {
      setLocalSelections((rbacData.getRolePermissions || []).map(rp => rp.permission.id));
    }
  }, [rbacData]);

  const allPermissions = rbacData?.getPermissions || [];
  const resourceMap = useMemo(() => {
    const map = {};
    allPermissions.forEach(p => {
      if (!map[p.resource]) map[p.resource] = [];
      map[p.resource].push(p);
    });
    return map;
  }, [allPermissions]);
  const uniqueResources = Object.keys(resourceMap).sort();

  const users = adminData?.getUsers || [];
  const auditLogs = auditData?.getAuditLogs || [];

  // Mock fallback data for visual demo
  const mockUsers = [
    { id: '1', firstName: 'Dr. Sarah', lastName: 'Chen', email: 's.chen@healthsync.com', isActive: true, lastLoginAt: new Date(Date.now() - 300000).toISOString(), roles: [{ id: 1, name: 'Clinician', code: 'clinician' }], clinic: { name: 'London Central' }, profile: {} },
    { id: '2', firstName: 'Marcus', lastName: 'Wright', email: 'm.wright@healthsync.com', isActive: true, lastLoginAt: new Date(Date.now() - 1800000).toISOString(), roles: [{ id: 2, name: 'Receptionist', code: 'receptionist' }], clinic: { name: 'Manchester North' }, profile: {} },
    { id: '3', firstName: 'Elena', lastName: 'Rodriguez', email: 'e.rod@healthsync.com', isActive: false, lastLoginAt: new Date(Date.now() - 86400000).toISOString(), roles: [{ id: 3, name: 'Clinic Manager', code: 'clinic_manager' }], clinic: { name: 'Birmingham HQ' }, profile: {} },
    { id: '4', firstName: 'James', lastName: 'Wilson', email: 'j.wilson@healthsync.com', isActive: true, lastLoginAt: new Date(Date.now() - 3600000).toISOString(), roles: [{ id: 4, name: 'System Admin', code: 'system_admin' }], clinic: null, profile: {} },
  ];

  const displayedUsers = users.length > 0 ? users : mockUsers;

  // FIX-3: Wire search to filter the displayed list
  const filteredUsers = useMemo(() => {
    if (!userSearch.trim()) return displayedUsers;
    const q = userSearch.toLowerCase();
    return displayedUsers.filter(u =>
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.roles?.some(r => r.name?.toLowerCase().includes(q) || r.code?.toLowerCase().includes(q))
    );
  }, [displayedUsers, userSearch]);

  const handleToggleUserStatus = async (id, currentStatus) => {
    try {
      await toggleUserMutation({ variables: { id, isActive: !currentStatus } });
      refetchAdmin();
    } catch (err) { console.error(err); }
  };

  const getInitials = (first, last) => `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();
  const getAvatarColor = (str = '') => {
    const colors = ['#006D77', '#0E9F9F', '#14B8A6', '#0D9488', '#1CBFBF', '#047857'];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
    return colors[hash % colors.length];
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto' }}>

      {/* PAGE HEADER — Stitch style */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="text.primary">User Management & Permissions</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>Configure system access, define roles, and monitor security activity logs.</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<PersonAdd />}
          onClick={() => navigate('/admin/users/new')}
          sx={{ bgcolor: BRAND, '&:hover': { bgcolor: '#005B64' }, borderRadius: 2, fontWeight: 700, px: 3 }}
        >
          Add User
        </Button>
      </Stack>

      {/* SUMMARY STATS */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, flexWrap: 'wrap' }}>
        <StatCard icon={<PeopleAlt />} value={displayedUsers.length} label="Total Users" color="#6366F1" />
        <StatCard icon={<CheckCircle />} value={displayedUsers.filter(u => u.isActive).length} label="Active Users" color="#10B981" />
        <StatCard icon={<Shield />} value={rolesList.length || 5} label="System Roles" color={BRAND} />
        <StatCard icon={<VerifiedUser />} value="24" label="Permissions Defined" color="#F59E0B" />
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
            onClick={() => setAdminTab(i)}
            startIcon={tab.icon}
            sx={{
              borderRadius: 1.5, px: 2.5, py: 1, fontWeight: 600, fontSize: '0.85rem',
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
            onChange={e => setUserSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment> }}
            sx={{ flex: 1, bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <FormControl size="small" sx={{ minWidth: 170, bgcolor: 'white' }}>
            <InputLabel>Filter by Role</InputLabel>
            <Select value={roleFilter} label="Filter by Role" onChange={e => setRoleFilter(e.target.value)} sx={{ borderRadius: 2 }}>
              <MenuItem value="all">All Roles</MenuItem>
              {Object.entries(ROLE_STYLES).filter(([k]) => k !== 'default').map(([code, s]) => (
                <MenuItem key={code} value={code}>{s.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5, textTransform: 'uppercase' }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5, textTransform: 'uppercase' }}>Role</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5, textTransform: 'uppercase' }}>Clinic</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5, textTransform: 'uppercase' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5, textTransform: 'uppercase' }}>Last Login</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', letterSpacing: 0.5, textTransform: 'uppercase' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {adminLoading ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}><CircularProgress size={32} sx={{ color: BRAND }} /></TableCell></TableRow>
                ) : filteredUsers.map(u => {
                  const initials = getInitials(u.firstName, u.lastName);
                  const avatarBg = getAvatarColor(`${u.firstName}${u.lastName}`);
                  return (
                    <TableRow key={u.id} hover sx={{ '&:hover': { bgcolor: '#F8FAFC' } }}>
                      <TableCell>
                        <Stack direction="row" alignItems="center" gap={2}>
                          <Avatar src={u.profile?.avatarUrl} sx={{ width: 40, height: 40, bgcolor: avatarBg, fontWeight: 700, fontSize: 14 }}>
                            {!u.profile?.avatarUrl && initials}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" fontWeight={700}>{u.firstName} {u.lastName}</Typography>
                            <Typography variant="caption" color="text.secondary">{u.email}</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" gap={0.5} flexWrap="wrap">
                          {u.roles.map(r => <RoleChip key={r.id} roleCode={r.code} roleName={r.name} />)}
                        </Stack>
                      </TableCell>
                      <TableCell><Typography variant="body2">{u.clinic?.name || '—'}</Typography></TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" gap={1}>
                          <Switch checked={u.isActive} onChange={() => handleToggleUserStatus(u.id, u.isActive)} color="success" size="small" />
                          <Typography variant="caption" color={u.isActive ? 'success.main' : 'text.disabled'} fontWeight={600}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary">{u.lastLoginAt ? dayjs(u.lastLoginAt).fromNow() : 'Never'}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit User">
                          <IconButton size="small" onClick={() => navigate(`/admin/users/${u.id}/edit`)} sx={{ color: BRAND, '&:hover': { bgcolor: BRAND_LIGHT } }}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={u.isActive ? 'Deactivate' : 'Reactivate'}>
                          <IconButton size="small" color={u.isActive ? 'error' : 'success'} onClick={() => handleToggleUserStatus(u.id, u.isActive)}>
                            {u.isActive ? <Block fontSize="small" /> : <Restore fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {/* FIX-4: Derive totalCount from local filtered array */}
            <Typography variant="caption" color="text.secondary">Showing {filteredUsers.length} of {filteredUsers.length} users</Typography>
            <TablePagination component="div" count={-1} rowsPerPage={rowsPerPage} rowsPerPageOptions={[8]} page={userPage} onPageChange={(e, p) => setUserPage(p)} />
          </Box>
        </Paper>
      </TabPanel>

      {/* ===== TAB 1: RBAC MATRIX ===== */}
      <TabPanel value={adminTab} index={1}>
        <Box display="flex" gap={3} flexDirection={{ xs: 'column', lg: 'row' }}>

          {/* Role Selector Sidebar */}
          <Box sx={{ width: { xs: '100%', lg: 260 }, flexShrink: 0 }}>
            <Typography variant="overline" fontWeight={700} color="text.secondary" display="block" mb={1.5}>Select Role</Typography>
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
              {(rolesList.length > 0 ? rolesList : Object.entries(ROLE_STYLES).filter(([k]) => k !== 'default').map(([code, s], i) => ({ id: String(i), code, name: s.label, description: '' }))).map((role, idx, arr) => {
                const style = ROLE_STYLES[role.code] || ROLE_STYLES.default;
                const isSelected = selectedRole === role.id;
                return (
                  <Box key={role.id}>
                    <ListItemButton
                      onClick={() => setSelectedRole(role.id)}
                      sx={{
                        px: 2, py: 1.5,
                        bgcolor: isSelected ? BRAND_LIGHT : 'transparent',
                        borderLeft: isSelected ? `3px solid ${BRAND}` : '3px solid transparent',
                        '&:hover': { bgcolor: isSelected ? BRAND_LIGHT : '#F8FAFC' }
                      }}
                    >
                      <Box sx={{ bgcolor: style.bg, width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5 }}>
                        <Typography variant="caption" fontWeight={800} sx={{ color: style.color }}>{role.name[0]}</Typography>
                      </Box>
                      <ListItemText
                        primary={<Typography variant="subtitle2" fontWeight={isSelected ? 800 : 600} color={isSelected ? BRAND : 'text.primary'}>{role.name}</Typography>}
                      />
                    </ListItemButton>
                    {idx < arr.length - 1 && <Divider />}
                  </Box>
                );
              })}
            </Paper>
          </Box>

          {/* MATRIX TABLE */}
          <Box flexGrow={1}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography variant="overline" fontWeight={700} color="text.secondary">Permissions Matrix</Typography>
              <Button variant="contained" size="small" sx={{ bgcolor: BRAND, borderRadius: 2, fontWeight: 700 }}
                onClick={async () => {
                  try { await updateRolePermissions({ variables: { roleId: selectedRole, permissionIds: localSelections } }); alert("Saved!"); }
                  catch (err) { console.error(err); }
                }}>Save Changes</Button>
            </Stack>
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
              <TableContainer sx={{ maxHeight: 520 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ bgcolor: '#F8FAFC', fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, minWidth: 180 }}>Resource</TableCell>
                      {['CREATE', 'READ', 'UPDATE', 'DELETE'].map(a => (
                        <TableCell key={a} align="center" sx={{ bgcolor: '#F8FAFC', fontWeight: 700, fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>{a}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rbacLoading ? (
                      <TableRow><TableCell colSpan={5} align="center" sx={{ py: 6 }}><CircularProgress size={28} sx={{ color: BRAND }} /></TableCell></TableRow>
                    ) : uniqueResources.length === 0 ? (
                      // Fallback mock matrix rows
                      ['Appointments', 'Patients', 'Clinicians', 'Clinics', 'Finance', 'Audit Logs', 'Users', 'Permissions'].map(res => (
                        <TableRow key={res} hover>
                          <TableCell><Typography variant="body2" fontWeight={600}>{res}</Typography></TableCell>
                          {['CREATE', 'READ', 'UPDATE', 'DELETE'].map(a => (
                            <TableCell key={a} align="center">
                              <Checkbox color="primary" defaultChecked={a === 'READ'} sx={{ color: '#CBD5E1', '&.Mui-checked': { color: BRAND } }} />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : uniqueResources.map(res => (
                      <TableRow key={res} hover>
                        <TableCell><Typography variant="body2" fontWeight={600}>{res}</Typography></TableCell>
                        {['CREATE', 'READ', 'UPDATE', 'DELETE'].map(action => {
                          const perm = resourceMap[res]?.find(p => p.action === action);
                          if (!perm) return <TableCell key={action} align="center"><Typography variant="caption" color="text.disabled">—</Typography></TableCell>;
                          return (
                            <TableCell key={action} align="center">
                              <Checkbox
                                checked={localSelections.includes(perm.id)}
                                onChange={() => setLocalSelections(prev => prev.includes(perm.id) ? prev.filter(id => id !== perm.id) : [...prev, perm.id])}
                                color="primary"
                                sx={{ color: '#CBD5E1', '&.Mui-checked': { color: BRAND } }}
                              />
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
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
          <TextField size="small" placeholder="Search audit logs..." InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" sx={{ color: 'text.secondary' }} /></InputAdornment> }} sx={{ flex: 1, bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
          <FormControl size="small" sx={{ minWidth: 160, bgcolor: 'white' }}>
            <InputLabel>Action</InputLabel>
            <Select value={actionFilter} label="Action" onChange={e => setActionFilter(e.target.value)} sx={{ borderRadius: 2 }}>
              <MenuItem value="all">All Actions</MenuItem>
              <MenuItem value="CREATE">Create</MenuItem>
              <MenuItem value="UPDATE">Update</MenuItem>
              <MenuItem value="DELETE">Delete</MenuItem>
            </Select>
          </FormControl>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker label="From" slotProps={{ textField: { size: 'small', sx: { width: 140, bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: 2 } } } }} />
            <DatePicker label="To" slotProps={{ textField: { size: 'small', sx: { width: 140, bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: 2 } } } }} />
          </LocalizationProvider>
        </Stack>

        <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, overflow: 'hidden' }}>
          <TableContainer>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ width: 40 }} />
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Timestamp</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>User</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Action</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>Resource</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.5 }}>IP Address</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditLoading ? (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6 }}><CircularProgress size={28} sx={{ color: BRAND }} /></TableCell></TableRow>
                ) : (auditLogs.length > 0 ? auditLogs : [
                  { id: '1', createdAt: new Date().toISOString(), action: 'UPDATE', resource: 'User', resourceId: '42', ipAddress: '192.168.1.1', details: '{"field":"role","from":"clinician","to":"clinic_manager"}', user: { email: 's.chen@healthsync.com', id: '1' } },
                  { id: '2', createdAt: new Date(Date.now() - 300000).toISOString(), action: 'CREATE', resource: 'Appointment', resourceId: '195', ipAddress: '10.0.0.5', details: '{"patientId":"84","clinicianId":"12"}', user: { email: 'm.wright@healthsync.com', id: '2' } },
                  { id: '3', createdAt: new Date(Date.now() - 600000).toISOString(), action: 'DELETE', resource: 'Availability', resourceId: '88', ipAddress: '172.16.0.3', details: '{"slotId":"88","reason":"Manually removed"}', user: { email: 'admin@healthsync.com', id: '4' } },
                ]).map(log => {
                  const isExpanded = expandedLogId === log.id;
                  const actionStyle = ACTION_STYLES[log.action] || ACTION_STYLES.READ;
                  return (
                    <React.Fragment key={log.id}>
                      <TableRow hover sx={{ cursor: 'pointer', '& > *': { borderBottom: 'unset' }, '&:hover': { bgcolor: '#F8FAFC' } }}>
                        <TableCell>
                          <IconButton size="small" onClick={() => setExpandedLogId(isExpanded ? null : log.id)} sx={{ color: 'text.secondary' }}>
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
                            <Avatar sx={{ width: 26, height: 26, bgcolor: getAvatarColor(log.user?.email || ''), fontSize: 11, fontWeight: 700 }}>
                              {log.user?.email?.[0]?.toUpperCase()}
                            </Avatar>
                            <Typography variant="body2" fontWeight={500}>{log.user?.email || 'System'}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Chip label={log.action} size="small" sx={{ bgcolor: actionStyle.bg, color: actionStyle.textColor, fontWeight: 700, fontSize: '0.7rem', height: 22, borderRadius: '6px' }} />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600} display="inline">{log.resource}</Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 0.75, fontFamily: 'monospace' }}>#{log.resourceId}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>{log.ipAddress}</Typography>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell colSpan={6} sx={{ p: 0, border: 0 }}>
                          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                            <Box sx={{ mx: 2, mb: 2, bgcolor: '#0D1B2A', borderRadius: 2, p: 2 }}>
                              <Typography variant="caption" color="#64748B" fontWeight={700} mb={1} display="block" letterSpacing={1}>PAYLOAD</Typography>
                              <Box component="pre" sx={{ m: 0, color: '#A7F3D0', fontSize: 12, fontFamily: '"Fira Code", monospace', overflowX: 'auto', lineHeight: 1.6 }}>
                                {JSON.stringify(JSON.parse(log.details || '{}'), null, 2)}
                              </Box>
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination component="div" count={-1} rowsPerPage={rowsPerPage} rowsPerPageOptions={[8]} page={auditPage} onPageChange={(e, p) => setAuditPage(p)} />
        </Paper>
      </TabPanel>

      {/* ADD/EDIT USER DIALOG */}
      <Dialog open={userDialogOpen} onClose={() => setUserDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>{editUser?.id ? 'Edit User' : 'Create New User'}</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2.5} pt={0.5}>
            <Grid item xs={6}><TextField fullWidth label="First Name" value={editUser?.firstName || ''} onChange={e => setEditUser({ ...editUser, firstName: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="Last Name" value={editUser?.lastName || ''} onChange={e => setEditUser({ ...editUser, lastName: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="Email Address" type="email" value={editUser?.email || ''} onChange={e => setEditUser({ ...editUser, email: e.target.value })} /></Grid>
            {!editUser?.id && (
              <Grid item xs={12}><TextField fullWidth label="Temporary Password" type="password" helperText="User must reset password on first login." /></Grid>
            )}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>System Role</InputLabel>
                <Select value={editUser?.roleCodes?.[0] || ''} label="System Role" onChange={e => setEditUser({ ...editUser, roleCodes: [e.target.value] })}>
                  {Object.entries(ROLE_STYLES).filter(([k]) => k !== 'default').map(([code, s]) => (
                    <MenuItem key={code} value={code}><RoleChip roleCode={code} roleName={s.label} /></MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setUserDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" sx={{ bgcolor: BRAND, borderRadius: 2, fontWeight: 700 }}>Save User</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
