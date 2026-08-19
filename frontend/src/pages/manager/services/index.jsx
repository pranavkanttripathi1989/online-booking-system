import { useState, useEffect } from 'react'
import { useApolloClient, gql } from '@apollo/client'
import {
  Alert, Box, Button, Card, CardContent, CardActions, Chip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, FormControlLabel, Grid,
  IconButton, InputAdornment, List, ListItemButton, ListItemText, Paper, Stack,
  Switch, TextField, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SearchIcon from '@mui/icons-material/Search'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog'
import ErrorBoundary from '../../../components/ErrorBoundary'

const BRAND = '#006D77'

// ─── GraphQL — matches the real backend exactly (backend/src/services/,
// backend/src/products/ for categories): SERVICES_QUERY/CREATE_SERVICE_MUTATION/
// UPDATE_SERVICE_MUTATION (frontend/src/graphql/queries.js|mutations.js) are the
// same canonical operations manager/services/create.jsx|edit.jsx|detail.jsx
// already use — reused here rather than reinvented. Category operations mirror
// manager/products/index.jsx's inline gql verbatim (same real mutations, same
// {success, userErrors} wrapper convention). ─────────────────────────────────

const GET_SERVICES_DATA = gql`
  query GetServicesData {
    services {
      id name description duration_minutes price is_active
      category { id name }
      clinicians { id full_name }
    }
    productCategories { id name description is_active }
  }
`
const CREATE_SERVICE  = gql`mutation CreateService($input: ServiceInput!) { createService(input: $input) { id } }`
const UPDATE_SERVICE  = gql`mutation UpdateService($id: ID!, $input: ServiceInput!) { updateService(id: $id, input: $input) { id } }`

const CREATE_CATEGORY = gql`mutation CreateProductCategory($input: CreateProductCategoryInput!) { createProductCategory(input: $input) { success userErrors { message } } }`
const UPDATE_CATEGORY = gql`mutation UpdateProductCategory($id: ID!, $input: UpdateProductCategoryInput!) { updateProductCategory(id: $id, input: $input) { success userErrors { message } } }`
const DELETE_CATEGORY = gql`mutation DeleteProductCategory($id: ID!) { deleteProductCategory(id: $id) { success userErrors { message } } }`

const dfService  = { name: '', description: '', duration_minutes: '', price: '', is_active: true }
const dfCategory = { name: '', description: '' }

// ─── Mock data fallback (visible banner, not silent — Priority 3 point 3) ─────
const MOCK_SERVICES = [
  { id: 'svc-1', name: 'GP Consultation', description: 'Standard GP consultation - 20 minutes', duration_minutes: 20, price: 100, is_active: true, category: null, clinicians: [] },
  { id: 'svc-2', name: 'Blood Test (Full)', description: 'Comprehensive metabolic panel', duration_minutes: 15, price: 75, is_active: true, category: null, clinicians: [] },
]
const MOCK_CATEGORIES = [
  { id: 'cat-1', name: 'Consultations', description: '', is_active: true },
]

function ServiceCatalog() {
  const client = useApolloClient()

  const [loading, setLoading] = useState(true)
  const [services, setServices] = useState([])
  const [categories, setCategories] = useState([])
  const [isMockData, setIsMockData] = useState(false)

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)

  const [showForm, setShowForm] = useState(false)
  const [editService, setEditService] = useState(null)
  const [form, setForm] = useState(dfService)

  const [showCatForm, setShowCatForm] = useState(false)
  const [editCat, setEditCat] = useState(null)
  const [catForm, setCatForm] = useState(dfCategory)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const [formError, setFormError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const { data } = await client.query({ query: GET_SERVICES_DATA, fetchPolicy: 'network-only' })
      setServices(data?.services || [])
      setCategories(data?.productCategories || [])
      setIsMockData(false)
    } catch (err) {
      setServices(MOCK_SERVICES)
      setCategories(MOCK_CATEGORIES)
      setIsMockData(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, []) // eslint-disable-line

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000) }

  // ── Service form ──────────────────────────────────────────────────────────
  const openNewService = () => {
    setEditService(null)
    setForm(dfService)
    setFormError(null)
    setShowForm(true)
  }
  const openEditService = (svc) => {
    setEditService(svc)
    setForm({
      name: svc.name,
      description: svc.description || '',
      duration_minutes: svc.duration_minutes ?? '',
      price: svc.price ?? '',
      is_active: svc.is_active,
    })
    setFormError(null)
    setShowForm(true)
  }

  const handleSaveService = async () => {
    if (!form.name.trim()) { setFormError('Service name is required.'); return }
    setSubmitting(true)
    setFormError(null)
    try {
      const input = {
        name: form.name.trim(),
        description: form.description || undefined,
        duration_minutes: form.duration_minutes === '' ? undefined : Number(form.duration_minutes),
        price: form.price === '' ? undefined : Number(form.price),
        is_active: form.is_active,
      }
      if (editService) {
        await client.mutate({ mutation: UPDATE_SERVICE, variables: { id: editService.id, input } })
      } else {
        await client.mutate({ mutation: CREATE_SERVICE, variables: { input } })
      }
      setShowForm(false)
      showSuccess(editService ? 'Service updated.' : 'Service created.')
      await loadData()
    } catch (err) {
      setFormError(err.message || 'Failed to save service.')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (svc) => {
    try {
      await client.mutate({
        mutation: UPDATE_SERVICE,
        variables: { id: svc.id, input: { name: svc.name, is_active: !svc.is_active } },
      })
      await loadData()
    } catch (err) {
      setFormError(err.message || 'Failed to update service.')
    }
  }

  // ── Category form ─────────────────────────────────────────────────────────
  const openNewCategory = () => { setEditCat(null); setCatForm(dfCategory); setFormError(null); setShowCatForm(true) }
  const openEditCategory = (cat) => { setEditCat(cat); setCatForm({ name: cat.name, description: cat.description || '' }); setFormError(null); setShowCatForm(true) }

  const handleSaveCategory = async () => {
    if (!catForm.name.trim()) { setFormError('Category name is required.'); return }
    setSubmitting(true)
    setFormError(null)
    try {
      const input = { name: catForm.name.trim(), description: catForm.description || undefined }
      const res = editCat
        ? await client.mutate({ mutation: UPDATE_CATEGORY, variables: { id: editCat.id, input } })
        : await client.mutate({ mutation: CREATE_CATEGORY, variables: { input } })
      const result = editCat ? res.data.updateProductCategory : res.data.createProductCategory
      if (!result.success) throw new Error(result.userErrors?.[0]?.message || 'Failed to save category.')
      setShowCatForm(false)
      showSuccess(editCat ? 'Category updated.' : 'Category created.')
      await loadData()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteCategory = (cat) => { setDeleteTarget({ type: 'category', id: cat.id, name: cat.name }); setConfirmOpen(true) }
  const confirmDelete = async () => {
    setConfirmOpen(false)
    if (!deleteTarget) return
    try {
      const res = await client.mutate({ mutation: DELETE_CATEGORY, variables: { id: deleteTarget.id } })
      if (!res.data.deleteProductCategory.success) {
        throw new Error(res.data.deleteProductCategory.userErrors?.[0]?.message || 'Failed to delete category.')
      }
      if (selectedCategoryId === deleteTarget.id) setSelectedCategoryId(null)
      showSuccess('Category deleted.')
      await loadData()
    } catch (err) {
      setFormError(err.message)
    }
    setDeleteTarget(null)
  }

  // ── Derived list ──────────────────────────────────────────────────────────
  let displayServices = services
  if (selectedCategoryId) displayServices = displayServices.filter((s) => s.category?.id === selectedCategoryId)
  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    displayServices = displayServices.filter((s) => s.name.toLowerCase().includes(q))
  }

  if (loading) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>

  return (
    <Box p={{ xs: 2, md: 4 }} maxWidth="xl" mx="auto" display="flex" gap={4} flexDirection={{ xs: 'column', md: 'row' }} alignItems="flex-start">
      {isMockData && (
        <Box sx={{ width: '100%' }}>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            <strong>Demo mode</strong> — Showing sample data. Backend is offline or unreachable.
          </Alert>
        </Box>
      )}
      {successMsg && <Box sx={{ width: '100%' }}><Alert severity="success" sx={{ borderRadius: 2 }}>{successMsg}</Alert></Box>}

      {/* LEFT SIDEBAR: CATEGORIES — real backend CRUD (productCategories);
          services aren't assignable to a category yet (ServiceInput has no
          category_id field), so filtering here only ever matches services
          that already had one set some other way — this is an honest
          reflection of the current real contract, not a mock. */}
      <Box width={{ xs: '100%', md: 260 }} flexShrink={0}>
        <Paper elevation={0} sx={{ p: 2, position: { md: 'sticky' }, top: { md: 80 }, border: '1px solid #E2E8F0', borderRadius: 3 }}>
          <Typography variant="overline" fontWeight={800} color="text.secondary" mb={1.5} display="block" letterSpacing={1}>
            CATEGORIES
          </Typography>

          <List dense disablePadding>
            <ListItemButton
              selected={selectedCategoryId === null}
              onClick={() => setSelectedCategoryId(null)}
              sx={{ borderRadius: 1.5, mb: 0.5, '&.Mui-selected': { bgcolor: '#E0F2F1' } }}
            >
              <ListItemText primary={
                <Typography variant="body2" fontWeight={selectedCategoryId === null ? 700 : 500} color={selectedCategoryId === null ? BRAND : 'text.primary'}>
                  All Services
                </Typography>
              } />
            </ListItemButton>

            {categories.map((cat) => (
              <ListItemButton
                key={cat.id}
                selected={selectedCategoryId === cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                sx={{ borderRadius: 1.5, mb: 0.5, '&.Mui-selected': { bgcolor: '#E0F2F1' } }}
              >
                <ListItemText primary={
                  <Typography variant="body2" fontWeight={selectedCategoryId === cat.id ? 700 : 500} color={selectedCategoryId === cat.id ? BRAND : 'text.primary'}>
                    {cat.name}
                  </Typography>
                } />
                <IconButton size="small" aria-label={`Edit category ${cat.name}`} onClick={(e) => { e.stopPropagation(); openEditCategory(cat) }}>
                  <EditIcon fontSize="inherit" />
                </IconButton>
                <IconButton size="small" aria-label={`Delete category ${cat.name}`} onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat) }}>
                  <DeleteIcon fontSize="inherit" />
                </IconButton>
              </ListItemButton>
            ))}
          </List>

          <Button startIcon={<AddIcon />} fullWidth size="small" variant="outlined" sx={{ mt: 3, borderStyle: 'dashed' }} onClick={openNewCategory}>
            Add Category
          </Button>
        </Paper>
      </Box>

      {/* RIGHT AREA: SERVICES GRID */}
      <Box flexGrow={1} width="100%">
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={3} gap={2}>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              {selectedCategoryId ? categories.find((c) => c.id === selectedCategoryId)?.name || 'Category' : 'All Services'}
            </Typography>
            <Typography variant="body2" color="text.secondary">{displayServices.length} items found</Typography>
          </Box>

          <Stack direction="row" gap={2} width={{ xs: '100%', sm: 'auto' }}>
            <TextField
              size="small"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
              sx={{ bgcolor: 'white', borderRadius: 1 }}
            />
            <Button variant="contained" startIcon={<AddIcon />} onClick={openNewService} sx={{ whiteSpace: 'nowrap', bgcolor: BRAND, '&:hover': { bgcolor: '#005B64' }, borderRadius: 2, fontWeight: 700 }}>
              Add Service
            </Button>
          </Stack>
        </Stack>

        <Grid container spacing={3}>
          {displayServices.length === 0 ? (
            <Grid item xs={12}>
              <Paper elevation={0} sx={{ p: 6, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 3 }}>
                <Typography color="text.secondary">No services found.</Typography>
              </Paper>
            </Grid>
          ) : (
            displayServices.map((svc) => (
              <Grid item xs={12} sm={6} lg={4} xl={3} key={svc.id}>
                <Card elevation={0} sx={{
                  border: '1px solid #E2E8F0', borderRadius: 3, height: '100%',
                  display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 28px rgba(0,109,119,0.12)', borderColor: BRAND },
                }}>
                  <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      {svc.category ? <Chip label={svc.category.name} size="small" sx={{ fontWeight: 600, height: 24 }} /> : <Box />}
                      <Switch
                        checked={svc.is_active}
                        size="small"
                        color="success"
                        onChange={() => toggleActive(svc)}
                        inputProps={{ 'aria-label': 'toggle active status' }}
                      />
                    </Stack>

                    <Typography variant="h6" fontWeight={700} lineHeight={1.3} mt={1} mb={0.5}>{svc.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 40 }}>
                      {svc.description || 'No description provided.'}
                    </Typography>

                    <Stack direction="row" justifyContent="space-between" alignItems="flex-end" mt={2} pt={2} borderTop="1px solid #F1F5F9">
                      <Typography variant="caption" color="text.secondary">
                        {svc.duration_minutes ? `${svc.duration_minutes} min` : 'No duration set'}
                      </Typography>
                      <Typography variant="h5" sx={{ color: BRAND }} fontWeight={800}>
                        ₹{Number(svc.price || 0).toFixed(2)}
                      </Typography>
                    </Stack>
                  </CardContent>

                  <CardActions sx={{ px: 2, pb: 2, pt: 0, justifyContent: 'flex-end' }}>
                    <IconButton size="small" aria-label={`Edit service ${svc.name}`} onClick={() => openEditService(svc)} sx={{ bgcolor: 'action.hover' }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      </Box>

      {/* ADD/EDIT SERVICE DIALOG */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle>{editService ? 'Edit Service' : 'Add New Service'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <Stack spacing={2.5} mt={0.5}>
            <TextField fullWidth label="Service Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <TextField fullWidth multiline rows={3} label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <TextField
              fullWidth label="Duration (minutes)" type="number"
              value={form.duration_minutes}
              onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
            />
            <TextField
              fullWidth label="Price (₹)" type="number"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
            />
            <FormControlLabel
              control={<Switch checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />}
              label="Active (bookable online)"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #E2E8F0', gap: 1 }}>
          <Button onClick={() => setShowForm(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveService} disabled={submitting || !form.name.trim()} sx={{ bgcolor: BRAND, '&:hover': { bgcolor: '#005B64' }, borderRadius: 2, fontWeight: 700 }}>
            {submitting ? 'Saving...' : 'Save Service'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ADD/EDIT CATEGORY DIALOG */}
      <Dialog open={showCatForm} onClose={() => setShowCatForm(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{editCat ? 'Edit Category' : 'Add Category'}</DialogTitle>
        <DialogContent>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
          <TextField
            fullWidth margin="dense" label="Category Name"
            value={catForm.name}
            onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
          />
          <TextField
            fullWidth margin="dense" label="Description" multiline rows={2}
            value={catForm.description}
            onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setShowCatForm(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" disabled={submitting || !catForm.name.trim()} onClick={handleSaveCategory} sx={{ bgcolor: BRAND, '&:hover': { bgcolor: '#005B64' }, borderRadius: 2, fontWeight: 700 }}>
            {editCat ? 'Save Changes' : 'Add Category'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Delete Category"
        message={deleteTarget ? `Delete "${deleteTarget.name}"? This cannot be undone.` : ''}
        onConfirm={confirmDelete}
        onCancel={() => { setConfirmOpen(false); setDeleteTarget(null) }}
      />
    </Box>
  )
}

export { ServiceCatalog }
export default function ServiceCatalogWithBoundary() {
  return <ErrorBoundary><ServiceCatalog /></ErrorBoundary>
}
