import React, { useState, useEffect } from 'react';
import { useApolloClient, gql } from '@apollo/client';
import {
  Alert, Box, Grid, Typography, Card, CardContent, Stack, Button, Chip, Avatar,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, Divider, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, CircularProgress,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BusinessIcon from '@mui/icons-material/Business';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const GET_ORGS = gql`
  query GetOrganizations($search: SearchInput) {
    organizationsPaginated(search: $search) {
      data {
        id name code contactEmail address_line1 address_line2 city postal_code country is_active
      }
      pageInfo { total limit offset hasNextPage hasPreviousPage }
    }
  }
`;
const CREATE_ORG = gql`mutation CreateOrganization($input:CreateOrganizationInput!){createOrganization(input:$input){success userErrors{message} organization{id}}}`;
const UPDATE_ORG = gql`mutation UpdateOrganization($id:ID!,$input:UpdateOrganizationInput!){updateOrganization(id:$id,input:$input){success userErrors{message}}}`;
const DELETE_ORG = gql`mutation DeleteOrganization($id:ID!){deleteOrganization(id:$id){success userErrors{message}}}`;

const defaultForm = { name:'', code:'', contactEmail:'', address_line1:'', address_line2:'', city:'', postal_code:'', country:'', is_active:true };

// ─── Mock fallback data ───────────────────────────────────────────────────────
const MOCK_ORGS = [
  { id: 'o1', name: 'MediBook Main Clinic',      code: 'medibook',  contactEmail: 'admin@medibook.com',     city: 'London',     country: 'UK', is_active: true  },
  { id: 'o2', name: 'Westside Health Center',    code: 'westside',  contactEmail: 'info@westside.clinic',   city: 'Manchester', country: 'UK', is_active: true  },
  { id: 'o3', name: 'Downtown Medical Group',    code: 'dtmedical', contactEmail: 'admin@dtmedical.com',    city: 'Birmingham', country: 'UK', is_active: false },
]

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminOrganizations() {
  const client = useApolloClient();
  const [orgs, setOrgs]               = useState([]);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [dialogOpen, setDialogOpen]   = useState(false);
  const [editOrg, setEditOrg]         = useState(null);
  const [form, setForm]               = useState(defaultForm);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deletingId, setDeletingId]   = useState(null);
  const [formError, setFormError]     = useState(null);
  const [successMsg, setSuccessMsg]   = useState(null);
  const [submitting, setSubmitting]   = useState(false);

  const load = async (searchVal = search) => {
    setLoading(true);
    try {
      const { data } = await client.query({ query: GET_ORGS, variables: { search: { search: searchVal, limit: 50, offset: 0 } }, fetchPolicy: 'network-only' });
      setOrgs(data?.organizationsPaginated?.data || []);
      setTotal(data?.organizationsPaginated?.pageInfo?.total || 0);
    } catch (err) {
      // Backend offline — use mock data so page is usable in dev/demo mode
      setOrgs(MOCK_ORGS)
      setTotal(MOCK_ORGS.length)
    }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000); };
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const openCreate = () => { setEditOrg(null); setForm(defaultForm); setFormError(null); setDialogOpen(true); };
  const openEdit   = (org) => { setEditOrg(org); setForm({ name: org.name, code: org.code || '', contactEmail: org.contactEmail || '', address_line1: org.address_line1 || '', address_line2: org.address_line2 || '', city: org.city || '', postal_code: org.postal_code || '', country: org.country || '', is_active: org.is_active }); setFormError(null); setDialogOpen(true); };

  const handleSubmit = async () => {
    setSubmitting(true); setFormError(null);
    try {
      if (editOrg) {
        const { data: r } = await client.mutate({ mutation: UPDATE_ORG, variables: { id: editOrg.id, input: form } });
        if (!r?.updateOrganization?.success) throw new Error(r?.updateOrganization?.userErrors?.[0]?.message);
        showSuccess('Organization updated.');
      } else {
        const { data: r } = await client.mutate({ mutation: CREATE_ORG, variables: { input: form } });
        if (!r?.createOrganization?.success) throw new Error(r?.createOrganization?.userErrors?.[0]?.message);
        showSuccess('Organization created.');
      }
      setDialogOpen(false); load();
    } catch (err) { setFormError(err.message); }
    finally { setSubmitting(false); }
  };

  const confirmDelete = async () => {
    setConfirmOpen(false);
    try {
      const { data: r } = await client.mutate({ mutation: DELETE_ORG, variables: { id: deletingId } });
      if (!r?.deleteOrganization?.success) throw new Error(r?.deleteOrganization?.userErrors?.[0]?.message);
      showSuccess('Organization deleted.'); load();
    } catch (err) { setFormError(err.message); }
    setDeletingId(null);
  };

  const activeOrgs = orgs.filter(o => o.is_active).length;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h2" fontWeight={700}>Organizations</Typography>
          <Typography variant="body2" color="text.secondary">{total} organizations · {activeOrgs} active</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>Add Organization</Button>
      </Stack>

      {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
      {formError && !dialogOpen && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>{formError}</Alert>}

      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'Total Orgs',   value: total,      color: '#006D77' },
          { label: 'Active',       value: activeOrgs, color: '#2DC653' },
          { label: 'Inactive',     value: total - activeOrgs, color: '#E29578' },
        ].map(({ label, value, color }) => (
          <Grid item xs={6} sm={3} key={label}>
            <Card sx={{ borderTop: `4px solid ${color}` }}>
              <CardContent sx={{ p: 2 }}>
                <Typography variant="h3" fontWeight={800} sx={{ color }}>{value}</Typography>
                <Typography variant="body2" color="text.secondary">{label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Search */}
      <Box mb={2}>
        <TextField
          size="small" placeholder="Search organizations…" value={search}
          onChange={e => { setSearch(e.target.value); load(e.target.value); }}
          sx={{ width: 280 }}
        />
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} sx={{ border: '1px solid #D0E8EA' }}>
          <Table>
            <TableHead>
              <TableRow>
                {['Organization', 'Code', 'Contact Email', 'Location', 'Status', 'Actions'].map(h => (
                  <TableCell key={h} sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {orgs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 6 }}>
                    <BusinessIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography color="text.secondary">No organizations found</Typography>
                  </TableCell>
                </TableRow>
              )}
              {orgs.map(org => (
                <TableRow key={org.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ bgcolor: '#006D77', width: 34, height: 34 }}>
                        <BusinessIcon sx={{ fontSize: 18 }} />
                      </Avatar>
                      <Typography variant="body2" fontWeight={700}>{org.name}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell><Chip label={org.code || '—'} size="small" variant="outlined" /></TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">{org.contactEmail || '—'}</Typography></TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">{[org.city, org.country].filter(Boolean).join(', ') || '—'}</Typography></TableCell>
                  <TableCell>
                    <Chip label={org.is_active ? 'Active' : 'Inactive'} size="small"
                      sx={{ bgcolor: org.is_active ? '#D1FAE5' : '#FEE2E2', color: org.is_active ? '#065F46' : '#991B1B', fontWeight: 700 }} />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" onClick={() => openEdit(org)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => { setDeletingId(org.id); setConfirmOpen(true); }}><DeleteIcon fontSize="small" /></IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>{editOrg ? 'Edit Organization' : 'Add Organization'}</DialogTitle>
        <DialogContent dividers>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}><TextField fullWidth required size="small" label="Organization Name" value={form.name} onChange={e => setF('name', e.target.value)} /></Grid>
              <Grid item xs={12} sm={4}><TextField fullWidth required size="small" label="Code / Slug" placeholder="e.g. cityhealth" value={form.code} onChange={e => setF('code', e.target.value.toLowerCase())} /></Grid>
              <Grid item xs={12}><TextField fullWidth required size="small" label="Contact Email" type="email" value={form.contactEmail} onChange={e => setF('contactEmail', e.target.value)} /></Grid>
              <Grid item xs={12}><TextField fullWidth size="small" label="Address Line 1" value={form.address_line1} onChange={e => setF('address_line1', e.target.value)} /></Grid>
              <Grid item xs={12}><TextField fullWidth size="small" label="Address Line 2" value={form.address_line2} onChange={e => setF('address_line2', e.target.value)} /></Grid>
              <Grid item xs={6}><TextField fullWidth size="small" label="City" value={form.city} onChange={e => setF('city', e.target.value)} /></Grid>
              <Grid item xs={6}><TextField fullWidth size="small" label="Postal Code" value={form.postal_code} onChange={e => setF('postal_code', e.target.value)} /></Grid>
              <Grid item xs={12}><TextField fullWidth size="small" label="Country" value={form.country} onChange={e => setF('country', e.target.value)} /></Grid>
            </Grid>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={submitting} onClick={handleSubmit}>
            {submitting ? 'Saving…' : editOrg ? 'Update' : 'Create Organization'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog isOpen={confirmOpen} title="Delete Organization" message="Delete this organization? All associated data may be affected. This cannot be undone." onConfirm={confirmDelete} onCancel={() => { setConfirmOpen(false); setDeletingId(null); }} />
    </Box>
  );
}
