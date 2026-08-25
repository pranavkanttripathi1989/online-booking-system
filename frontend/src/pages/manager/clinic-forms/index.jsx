import { useState, useEffect, useCallback } from 'react'
import { useApolloClient, gql } from '@apollo/client'
import {
  Alert, Box, Button, Card, CardContent, Checkbox, CircularProgress,
  Dialog, DialogActions, DialogContent, DialogTitle, FormControl,
  FormControlLabel, Grid, IconButton, InputLabel, MenuItem, Select,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import ChecklistIcon from '@mui/icons-material/PlaylistAddCheck'
import DynamicFormIcon from '@mui/icons-material/DynamicForm'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog'
import ErrorBoundary from '../../../components/ErrorBoundary'

// ─── GraphQL ─────────────────────────────────────────────────────────────────
// REQ051/REQ052 (Phase G+3) — per-clinic checklist and intake-field config.
// Page-local gql consts, matching this codebase's own convention for a
// manager-tooling page (see resources/index.jsx, manager/products/index.jsx).

const GET_CLINIC_FORMS_CLINICS = gql`
  query GetClinicFormsClinics { clinics { id name } }
`
const GET_CLINIC_FORMS_PRODUCTS = gql`
  query GetClinicFormsProducts($clinic_id: ID) {
    services(clinic_id: $clinic_id) { id name }
  }
`

const CHECKLIST_ITEMS_QUERY = gql`
  query ChecklistItems($clinic_id: ID, $product_id: ID) {
    checklistItems(clinic_id: $clinic_id, product_id: $product_id) {
      id clinic_id product_id label is_required sort_order
    }
  }
`
const CREATE_CHECKLIST_ITEM = gql`
  mutation CreateChecklistItem($input: CreateChecklistItemInput!) {
    createChecklistItem(input: $input) { success userErrors { message } checklistItem { id } }
  }
`
const UPDATE_CHECKLIST_ITEM = gql`
  mutation UpdateChecklistItem($id: ID!, $input: UpdateChecklistItemInput!) {
    updateChecklistItem(id: $id, input: $input) { success userErrors { message } checklistItem { id } }
  }
`
const DELETE_CHECKLIST_ITEM = gql`
  mutation DeleteChecklistItem($id: ID!) {
    deleteChecklistItem(id: $id) { success userErrors { message } }
  }
`

const INTAKE_FIELD_CONFIGS_QUERY = gql`
  query IntakeFieldConfigs($clinic_id: ID, $product_id: ID) {
    intakeFieldConfigs(clinic_id: $clinic_id, product_id: $product_id) {
      id clinic_id product_id key label field_type is_required sort_order
    }
  }
`
const CREATE_INTAKE_FIELD = gql`
  mutation CreateIntakeFieldConfig($input: CreateIntakeFieldInput!) {
    createIntakeFieldConfig(input: $input) { success userErrors { message } intakeField { id } }
  }
`
const UPDATE_INTAKE_FIELD = gql`
  mutation UpdateIntakeFieldConfig($id: ID!, $input: UpdateIntakeFieldInput!) {
    updateIntakeFieldConfig(id: $id, input: $input) { success userErrors { message } intakeField { id } }
  }
`
const DELETE_INTAKE_FIELD = gql`
  mutation DeleteIntakeFieldConfig($id: ID!) {
    deleteIntakeFieldConfig(id: $id) { success userErrors { message } }
  }
`

const FIELD_TYPE_LABELS = { text: 'Text', textarea: 'Text Area', number: 'Number', boolean: 'Yes / No' }

const dfChecklistItem = { label: '', product_id: '', is_required: true, sort_order: 0 }
const dfIntakeField = { key: '', label: '', product_id: '', field_type: 'text', is_required: false, sort_order: 0 }

// ─── Component ────────────────────────────────────────────────────────────────

function ClinicForms() {
  const client = useApolloClient()

  const [tabIndex, setTabIndex] = useState(0)
  const [clinics, setClinics] = useState([])
  const [clinicId, setClinicId] = useState('')
  const [products, setProducts] = useState([])

  const [checklistItems, setChecklistItems] = useState([])
  const [checklistLoading, setChecklistLoading] = useState(false)
  const [intakeFields, setIntakeFields] = useState([])
  const [intakeLoading, setIntakeLoading] = useState(false)

  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false)
  const [editChecklistItem, setEditChecklistItem] = useState(null)
  const [checklistForm, setChecklistForm] = useState(dfChecklistItem)

  const [intakeDialogOpen, setIntakeDialogOpen] = useState(false)
  const [editIntakeField, setEditIntakeField] = useState(null)
  const [intakeForm, setIntakeForm] = useState(dfIntakeField)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState({ type: '', id: '' })
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000) }

  // Clinic list — loaded once.
  useEffect(() => {
    client.query({ query: GET_CLINIC_FORMS_CLINICS, fetchPolicy: 'network-only' })
      .then(({ data }) => {
        const rows = data?.clinics ?? []
        setClinics(rows)
        if (rows.length && !clinicId) setClinicId(rows[0].id)
      })
      .catch(() => setError('Failed to load clinics.'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadChecklistItems = useCallback(() => {
    if (!clinicId) return
    setChecklistLoading(true)
    client.query({ query: CHECKLIST_ITEMS_QUERY, variables: { clinic_id: clinicId }, fetchPolicy: 'network-only' })
      .then(({ data }) => setChecklistItems(data?.checklistItems ?? []))
      .catch(() => setError('Failed to load checklist items.'))
      .finally(() => setChecklistLoading(false))
  }, [client, clinicId])

  const loadIntakeFields = useCallback(() => {
    if (!clinicId) return
    setIntakeLoading(true)
    client.query({ query: INTAKE_FIELD_CONFIGS_QUERY, variables: { clinic_id: clinicId }, fetchPolicy: 'network-only' })
      .then(({ data }) => setIntakeFields(data?.intakeFieldConfigs ?? []))
      .catch(() => setError('Failed to load intake fields.'))
      .finally(() => setIntakeLoading(false))
  }, [client, clinicId])

  useEffect(() => {
    if (!clinicId) return
    client.query({ query: GET_CLINIC_FORMS_PRODUCTS, variables: { clinic_id: clinicId }, fetchPolicy: 'network-only' })
      .then(({ data }) => setProducts(data?.services ?? []))
      .catch(() => setProducts([]))
    loadChecklistItems()
    loadIntakeFields()
  }, [clinicId, loadChecklistItems, loadIntakeFields, client])

  const productName = (id) => products.find((p) => p.id === id)?.name

  // ── Checklist item CRUD ───────────────────────────────────────────────────
  const openCreateChecklistItem = () => { setEditChecklistItem(null); setChecklistForm(dfChecklistItem); setChecklistDialogOpen(true) }
  const openEditChecklistItem = (item) => {
    setEditChecklistItem(item)
    setChecklistForm({ label: item.label, product_id: item.product_id ?? '', is_required: item.is_required, sort_order: item.sort_order })
    setChecklistDialogOpen(true)
  }
  const closeChecklistDialog = () => { setChecklistDialogOpen(false); setEditChecklistItem(null); setChecklistForm(dfChecklistItem) }

  const submitChecklistItem = async () => {
    setSubmitting(true); setError(null)
    try {
      if (editChecklistItem) {
        const { data } = await client.mutate({
          mutation: UPDATE_CHECKLIST_ITEM,
          variables: { id: editChecklistItem.id, input: { label: checklistForm.label, is_required: checklistForm.is_required, sort_order: Number(checklistForm.sort_order) || 0 } },
        })
        if (!data?.updateChecklistItem?.success) throw new Error(data?.updateChecklistItem?.userErrors?.[0]?.message ?? 'Failed to update checklist item')
        showSuccess('Checklist item updated.')
      } else {
        const { data } = await client.mutate({
          mutation: CREATE_CHECKLIST_ITEM,
          variables: { input: { clinic_id: clinicId, product_id: checklistForm.product_id || undefined, label: checklistForm.label, is_required: checklistForm.is_required, sort_order: Number(checklistForm.sort_order) || 0 } },
        })
        if (!data?.createChecklistItem?.success) throw new Error(data?.createChecklistItem?.userErrors?.[0]?.message ?? 'Failed to create checklist item')
        showSuccess('Checklist item created.')
      }
      closeChecklistDialog()
      loadChecklistItems()
    } catch (err) { setError(err.message) }
    finally { setSubmitting(false) }
  }

  // ── Intake field CRUD ─────────────────────────────────────────────────────
  const openCreateIntakeField = () => { setEditIntakeField(null); setIntakeForm(dfIntakeField); setIntakeDialogOpen(true) }
  const openEditIntakeField = (field) => {
    setEditIntakeField(field)
    setIntakeForm({ key: field.key, label: field.label, product_id: field.product_id ?? '', field_type: field.field_type, is_required: field.is_required, sort_order: field.sort_order })
    setIntakeDialogOpen(true)
  }
  const closeIntakeDialog = () => { setIntakeDialogOpen(false); setEditIntakeField(null); setIntakeForm(dfIntakeField) }

  const submitIntakeField = async () => {
    setSubmitting(true); setError(null)
    try {
      if (editIntakeField) {
        const { data } = await client.mutate({
          mutation: UPDATE_INTAKE_FIELD,
          variables: { id: editIntakeField.id, input: { label: intakeForm.label, field_type: intakeForm.field_type, is_required: intakeForm.is_required, sort_order: Number(intakeForm.sort_order) || 0 } },
        })
        if (!data?.updateIntakeFieldConfig?.success) throw new Error(data?.updateIntakeFieldConfig?.userErrors?.[0]?.message ?? 'Failed to update intake field')
        showSuccess('Intake field updated.')
      } else {
        const { data } = await client.mutate({
          mutation: CREATE_INTAKE_FIELD,
          variables: { input: { clinic_id: clinicId, product_id: intakeForm.product_id || undefined, key: intakeForm.key, label: intakeForm.label, field_type: intakeForm.field_type, is_required: intakeForm.is_required, sort_order: Number(intakeForm.sort_order) || 0 } },
        })
        if (!data?.createIntakeFieldConfig?.success) throw new Error(data?.createIntakeFieldConfig?.userErrors?.[0]?.message ?? 'Failed to create intake field')
        showSuccess('Intake field created.')
      }
      closeIntakeDialog()
      loadIntakeFields()
    } catch (err) { setError(err.message) }
    finally { setSubmitting(false) }
  }

  // ── Delete (shared confirm dialog) ────────────────────────────────────────
  const handleDelete = (type, id) => { setDeleteTarget({ type, id }); setConfirmOpen(true) }
  const confirmDelete = async () => {
    setConfirmOpen(false)
    try {
      const { type, id } = deleteTarget
      if (type === 'checklist') {
        const { data } = await client.mutate({ mutation: DELETE_CHECKLIST_ITEM, variables: { id } })
        if (!data?.deleteChecklistItem?.success) throw new Error(data?.deleteChecklistItem?.userErrors?.[0]?.message ?? 'Failed to delete checklist item')
        showSuccess('Checklist item deleted.')
        loadChecklistItems()
      } else {
        const { data } = await client.mutate({ mutation: DELETE_INTAKE_FIELD, variables: { id } })
        if (!data?.deleteIntakeFieldConfig?.success) throw new Error(data?.deleteIntakeFieldConfig?.userErrors?.[0]?.message ?? 'Failed to delete intake field')
        showSuccess('Intake field deleted.')
        loadIntakeFields()
      }
    } catch (err) { setError(err.message) }
  }

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h5" fontWeight={700}>Clinic Forms</Typography>
        <Typography variant="body2" color="text.secondary">
          Configure the pre-visit checklist and booking intake fields for each clinic.
        </Typography>
      </Box>

      {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      <FormControl size="small" sx={{ minWidth: 260, mb: 3 }}>
        <InputLabel>Clinic</InputLabel>
        <Select label="Clinic" value={clinicId} onChange={(e) => setClinicId(e.target.value)} data-testid="clinic-select">
          {clinics.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </Select>
      </FormControl>

      <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Pre-Visit Checklist" icon={<ChecklistIcon />} iconPosition="start" />
        <Tab label="Intake Form Fields" icon={<DynamicFormIcon />} iconPosition="start" />
      </Tabs>

      {!clinicId && (
        <Alert severity="info">Select a clinic to view or configure its forms.</Alert>
      )}

      {/* ══ CHECKLIST TAB ═══════════════════════════════════════════════════ */}
      {clinicId && tabIndex === 0 && (
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight={700}>Pre-Visit Checklist Items</Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateChecklistItem}>Add Item</Button>
            </Stack>
            {checklistLoading ? (
              <Box display="flex" justifyContent="center" py={4}><CircularProgress size={28} /></Box>
            ) : checklistItems.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={4}>
                No checklist items configured for this clinic yet.
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Label</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Applies To</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Required</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Order</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...checklistItems].sort((a, b) => a.sort_order - b.sort_order).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.label}</TableCell>
                        <TableCell>{item.product_id ? (productName(item.product_id) ?? '—') : 'All services'}</TableCell>
                        <TableCell>{item.is_required ? 'Yes' : 'No'}</TableCell>
                        <TableCell>{item.sort_order}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton size="small" aria-label={`Edit ${item.label}`} onClick={() => openEditChecklistItem(item)}><EditIcon fontSize="small" /></IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" aria-label={`Delete ${item.label}`} onClick={() => handleDelete('checklist', item.id)}><DeleteIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* ══ INTAKE FIELDS TAB ═════════════════════════════════════════════ */}
      {clinicId && tabIndex === 1 && (
        <Card>
          <CardContent>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight={700}>Intake Form Fields</Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateIntakeField}>Add Field</Button>
            </Stack>
            {intakeLoading ? (
              <Box display="flex" justifyContent="center" py={4}><CircularProgress size={28} /></Box>
            ) : intakeFields.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={4}>
                No intake fields configured for this clinic yet.
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Key</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Label</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Applies To</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Required</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {[...intakeFields].sort((a, b) => a.sort_order - b.sort_order).map((field) => (
                      <TableRow key={field.id}>
                        <TableCell><code>{field.key}</code></TableCell>
                        <TableCell>{field.label}</TableCell>
                        <TableCell>{FIELD_TYPE_LABELS[field.field_type] ?? field.field_type}</TableCell>
                        <TableCell>{field.product_id ? (productName(field.product_id) ?? '—') : 'All services'}</TableCell>
                        <TableCell>{field.is_required ? 'Yes' : 'No'}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton size="small" aria-label={`Edit ${field.label}`} onClick={() => openEditIntakeField(field)}><EditIcon fontSize="small" /></IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton size="small" color="error" aria-label={`Delete ${field.label}`} onClick={() => handleDelete('intake', field.id)}><DeleteIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Checklist item dialog ──────────────────────────────────────────── */}
      <Dialog open={checklistDialogOpen} onClose={closeChecklistDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editChecklistItem ? 'Edit Checklist Item' : 'New Checklist Item'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth required size="small" label="Label" value={checklistForm.label}
                onChange={(e) => setChecklistForm((p) => ({ ...p, label: e.target.value }))} />
            </Grid>
            {!editChecklistItem && (
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Applies to (optional)</InputLabel>
                  <Select label="Applies to (optional)" value={checklistForm.product_id}
                    onChange={(e) => setChecklistForm((p) => ({ ...p, product_id: e.target.value }))}>
                    <MenuItem value="">All services</MenuItem>
                    {products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={6}>
              <TextField fullWidth size="small" type="number" label="Sort Order" value={checklistForm.sort_order}
                onChange={(e) => setChecklistForm((p) => ({ ...p, sort_order: e.target.value }))} inputProps={{ min: 0 }} />
            </Grid>
            <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={<Checkbox checked={checklistForm.is_required}
                  onChange={(e) => setChecklistForm((p) => ({ ...p, is_required: e.target.checked }))} />}
                label="Required"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeChecklistDialog}>Cancel</Button>
          <Button variant="contained" disabled={submitting || !checklistForm.label} onClick={submitChecklistItem}>
            {submitting ? 'Saving…' : editChecklistItem ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Intake field dialog ────────────────────────────────────────────── */}
      <Dialog open={intakeDialogOpen} onClose={closeIntakeDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editIntakeField ? 'Edit Intake Field' : 'New Intake Field'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required size="small" label="Key" disabled={Boolean(editIntakeField)}
                helperText={editIntakeField ? 'Key cannot be changed after creation' : 'e.g. allergies'}
                value={intakeForm.key} onChange={(e) => setIntakeForm((p) => ({ ...p, key: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth required size="small" label="Label" placeholder="e.g. List any allergies"
                value={intakeForm.label} onChange={(e) => setIntakeForm((p) => ({ ...p, label: e.target.value }))} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Field Type</InputLabel>
                <Select label="Field Type" value={intakeForm.field_type}
                  onChange={(e) => setIntakeForm((p) => ({ ...p, field_type: e.target.value }))}>
                  {Object.entries(FIELD_TYPE_LABELS).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            {!editIntakeField && (
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Applies to (optional)</InputLabel>
                  <Select label="Applies to (optional)" value={intakeForm.product_id}
                    onChange={(e) => setIntakeForm((p) => ({ ...p, product_id: e.target.value }))}>
                    <MenuItem value="">All services</MenuItem>
                    {products.map((p) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
            )}
            <Grid item xs={6}>
              <TextField fullWidth size="small" type="number" label="Sort Order" value={intakeForm.sort_order}
                onChange={(e) => setIntakeForm((p) => ({ ...p, sort_order: e.target.value }))} inputProps={{ min: 0 }} />
            </Grid>
            <Grid item xs={6} sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={<Checkbox checked={intakeForm.is_required}
                  onChange={(e) => setIntakeForm((p) => ({ ...p, is_required: e.target.checked }))} />}
                label="Required"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeIntakeDialog}>Cancel</Button>
          <Button variant="contained" disabled={submitting || !intakeForm.key || !intakeForm.label} onClick={submitIntakeField}>
            {submitting ? 'Saving…' : editIntakeField ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        isOpen={confirmOpen}
        title={`Delete ${deleteTarget.type === 'checklist' ? 'checklist item' : 'intake field'}`}
        message="This cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </Box>
  )
}

export default function ClinicFormsWithBoundary() {
  return <ErrorBoundary><ClinicForms /></ErrorBoundary>
}
