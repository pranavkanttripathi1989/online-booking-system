import { useState, useEffect } from 'react'
import { useApolloClient, gql } from '@apollo/client'
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  FormControl, Grid, IconButton, InputAdornment, InputLabel, MenuItem,
  Select, Stack, TextField, Typography, Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog'
import ErrorBoundary from '../../../components/ErrorBoundary'

// ─── GraphQL ─────────────────────────────────────────────────────────────────
// REQ054 (US-CAT-01) — multi-sitting service packages. price/purchase_amount
// are already rupees at this boundary (converted server-side); never
// divide/multiply by 100 here.

const GET_PACKAGES = gql`
  query GetPackages {
    packages {
      id clinic_id name description total_sittings price validity_days is_active
      items { id product_id }
    }
  }
`
const GET_PACKAGE_CLINICS = gql`
  query GetPackageClinics { clinics { id name } }
`
const GET_PACKAGE_PRODUCTS = gql`
  query GetPackageProducts { products { id name clinic_id } }
`
const CREATE_PACKAGE = gql`
  mutation CreatePackage($input: CreatePackageInput!) {
    createPackage(input: $input) { success userErrors { message } pkg { id } }
  }
`
const UPDATE_PACKAGE = gql`
  mutation UpdatePackage($id: ID!, $input: UpdatePackageInput!) {
    updatePackage(id: $id, input: $input) { success userErrors { message } pkg { id } }
  }
`
const DELETE_PACKAGE = gql`
  mutation DeletePackage($id: ID!) {
    deletePackage(id: $id) { success userErrors { message } }
  }
`

const defaultForm = {
  clinicId: '', name: '', description: '', totalSittings: 10, price: 0,
  validityDays: '', productIds: [], isActive: true,
}

function ManagerPackages() {
  const client = useApolloClient()

  const [clinics, setClinics]       = useState([])
  const [products, setProducts]     = useState([])
  const [pkgs, setPkgs]             = useState([])
  const [loading, setLoading]       = useState(true)
  const [loadError, setLoadError]   = useState(null)
  const [showForm, setShowForm]     = useState(false)
  const [editingPkg, setEditingPkg] = useState(null)
  const [form, setForm]             = useState(defaultForm)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [formError, setFormError]   = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const loadPackages = async () => {
    setLoading(true); setLoadError(null)
    try {
      const { data } = await client.query({ query: GET_PACKAGES, fetchPolicy: 'network-only' })
      setPkgs(data?.packages || [])
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    client.query({ query: GET_PACKAGE_CLINICS }).then(({ data }) => {
      setClinics(data?.clinics || [])
      setForm(prev => ({ ...prev, clinicId: prev.clinicId || data?.clinics?.[0]?.id || '' }))
    }).catch(() => {})
    client.query({ query: GET_PACKAGE_PRODUCTS }).then(({ data }) => {
      setProducts(data?.products || [])
    }).catch(() => {})
    loadPackages()
  }, []) // eslint-disable-line

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000) }
  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const resetForm = () => {
    setForm({ ...defaultForm, clinicId: clinics[0]?.id || '' })
    setEditingPkg(null)
    setShowForm(false)
    setFormError(null)
  }

  const handleEdit = (pkg) => {
    setEditingPkg(pkg)
    setForm({
      clinicId: pkg.clinic_id || '',
      name: pkg.name || '',
      description: pkg.description || '',
      totalSittings: pkg.total_sittings,
      price: pkg.price,
      validityDays: pkg.validity_days ?? '',
      productIds: (pkg.items || []).map(i => i.product_id),
      isActive: pkg.is_active,
    })
    setShowForm(true)
    setFormError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true); setFormError(null)
    try {
      if (editingPkg) {
        const input = {
          name: form.name,
          description: form.description || undefined,
          total_sittings: parseInt(form.totalSittings, 10),
          price: parseFloat(form.price),
          validity_days: form.validityDays ? parseInt(form.validityDays, 10) : undefined,
          is_active: form.isActive,
        }
        const { data: r } = await client.mutate({ mutation: UPDATE_PACKAGE, variables: { id: editingPkg.id, input } })
        if (!r?.updatePackage?.success) throw new Error(r?.updatePackage?.userErrors?.[0]?.message || 'Update failed')
        showSuccess('Package updated.')
      } else {
        const input = {
          clinic_id: form.clinicId,
          name: form.name,
          description: form.description || undefined,
          total_sittings: parseInt(form.totalSittings, 10),
          price: parseFloat(form.price),
          validity_days: form.validityDays ? parseInt(form.validityDays, 10) : undefined,
          product_ids: form.productIds,
        }
        const { data: r } = await client.mutate({ mutation: CREATE_PACKAGE, variables: { input } })
        if (!r?.createPackage?.success) throw new Error(r?.createPackage?.userErrors?.[0]?.message || 'Create failed')
        showSuccess('Package created.')
      }
      resetForm(); loadPackages()
    } catch (err) { setFormError(err.message) }
    finally { setSubmitting(false) }
  }

  const handleDelete = (id) => { setDeletingId(id); setConfirmOpen(true) }
  const confirmDelete = async () => {
    setConfirmOpen(false)
    try {
      const { data: r } = await client.mutate({ mutation: DELETE_PACKAGE, variables: { id: deletingId } })
      if (!r?.deletePackage?.success) { setFormError(r?.deletePackage?.userErrors?.[0]?.message || 'Delete failed'); return }
      showSuccess('Package deleted.'); loadPackages()
    } catch (err) { setFormError(err.message) }
    setDeletingId(null)
  }

  // `createProduct`/`createService` never accept a clinic_id (products.resolver.ts,
  // services.resolver.ts) — every real product/service is an org-level master
  // (clinic_id: null), the same convention REQ055's branch-overrides feature
  // already established (a null clinic_id means "available at every branch
  // unless overridden"). Filtering on strict equality left this picker
  // permanently empty against real data; include org masters alongside any
  // genuinely clinic-specific row.
  const productsForClinic = products.filter(p => p.clinic_id === form.clinicId || p.clinic_id === null)
  const productName = (id) => products.find(p => p.id === id)?.name || id

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={1.5}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Service Packages</Typography>
          <Typography variant="body2" color="text.secondary">
            Multi-sitting bundles a patient buys once and redeems across future appointments
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetForm(); setShowForm(p => !p) }}>
          New Package
        </Button>
      </Stack>

      {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
      {formError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>{formError}</Alert>}

      {showForm && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={2}>{editingPkg ? 'Edit Package' : 'New Package'}</Typography>
            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required size="small" disabled={!!editingPkg}>
                    <InputLabel>Clinic</InputLabel>
                    <Select label="Clinic" value={form.clinicId} onChange={e => setField('clinicId', e.target.value)} data-testid="clinic-select">
                      <MenuItem value="">Select clinic</MenuItem>
                      {clinics.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField fullWidth required size="small" label="Package Name"
                    placeholder="e.g. 10-Session Physio"
                    value={form.name} onChange={e => setField('name', e.target.value)} />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField fullWidth required size="small" type="number" label="Total Sittings"
                    inputProps={{ min: 1 }}
                    value={form.totalSittings} onChange={e => setField('totalSittings', e.target.value)} />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField fullWidth required size="small" type="number" label="Price"
                    InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                    inputProps={{ min: 0, step: 0.01 }}
                    value={form.price} onChange={e => setField('price', e.target.value)} />
                </Grid>

                <Grid item xs={12} sm={4}>
                  <TextField fullWidth size="small" type="number" label="Validity (days)"
                    placeholder="90 (default)"
                    inputProps={{ min: 1 }}
                    value={form.validityDays} onChange={e => setField('validityDays', e.target.value)} />
                </Grid>

                {!editingPkg && (
                  <Grid item xs={12}>
                    <FormControl fullWidth required size="small" disabled={!form.clinicId}>
                      <InputLabel>Redeemable against</InputLabel>
                      <Select
                        multiple
                        label="Redeemable against"
                        data-testid="redeemable-against-select"
                        value={form.productIds}
                        onChange={e => setField('productIds', typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value)}
                        renderValue={(selected) => selected.map(productName).join(', ')}
                      >
                        {productsForClinic.length === 0 && (
                          <MenuItem value="" disabled>No services for this clinic yet</MenuItem>
                        )}
                        {productsForClinic.map(p => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <TextField fullWidth size="small" label="Description" multiline rows={2}
                    value={form.description} onChange={e => setField('description', e.target.value)} />
                </Grid>

                {editingPkg && (
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Status</InputLabel>
                      <Select label="Status" value={form.isActive ? 'yes' : 'no'} onChange={e => setField('isActive', e.target.value === 'yes')}>
                        <MenuItem value="yes">Active — patients can purchase it</MenuItem>
                        <MenuItem value="no">Inactive — hidden from new sales</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Stack direction="row" spacing={1}>
                    <Button type="submit" variant="contained" disabled={submitting}>
                      {submitting ? 'Saving…' : editingPkg ? 'Update' : 'Create'}
                    </Button>
                    <Button variant="outlined" onClick={resetForm}>Cancel</Button>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : loadError ? (
        <Alert severity="error">Couldn't load packages: {loadError}</Alert>
      ) : (
        <Grid container spacing={2} mt={0.5}>
          {pkgs.length === 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 6 }}>
                  <CardGiftcardIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">No packages yet. Bundle sittings into a package patients can buy once.</Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
          {pkgs.map(pkg => {
            const clinicName = clinics.find(c => c.id === pkg.clinic_id)?.name
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={pkg.id}>
                <Card sx={{ height: '100%', '&:hover': { boxShadow: 4 }, transition: 'box-shadow 0.2s' }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Box sx={{ bgcolor: 'info.50', borderRadius: 1, p: 1 }}>
                        <CardGiftcardIcon color="info" />
                      </Box>
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Edit">
                          <IconButton size="small" aria-label={`Edit package ${pkg.name}`} onClick={() => handleEdit(pkg)}><EditIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" aria-label={`Delete package ${pkg.name}`} onClick={() => handleDelete(pkg.id)}><DeleteIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>

                    <Typography variant="h6" fontWeight={700} noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{pkg.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{clinicName}</Typography>
                    <Typography variant="h6" color="success.main" mt={1}>₹{Number(pkg.price).toFixed(2)}</Typography>
                    <Typography variant="body2" color="text.secondary">{pkg.total_sittings} sittings · valid {pkg.validity_days} days</Typography>
                    {pkg.description && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mt: 0.5 }}>
                        {pkg.description}
                      </Typography>
                    )}

                    <Box mt={1.5}>
                      <Chip label={pkg.is_active ? 'Active' : 'Inactive'} size="small" color={pkg.is_active ? 'success' : 'default'} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Delete Package"
        message="Delete this package permanently? This cannot be undone. Any already-purchased patient packages are unaffected."
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setDeletingId(null) }}
      />
    </Box>
  )
}

export default function ManagerPackagesWithBoundary() {
  return <ErrorBoundary><ManagerPackages /></ErrorBoundary>
}
