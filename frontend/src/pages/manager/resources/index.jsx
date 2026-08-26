import { useState, useEffect, useCallback } from 'react'
import { useApolloClient, gql } from '@apollo/client'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog'
import ErrorBoundary from '../../../components/ErrorBoundary'

// ─── GraphQL ─────────────────────────────────────────────────────────────────
// REQ017 US-CAL-05 — multi-resource intersection booking. `resources` is a
// bare-array query (no pagination contract, unlike roomsPaginated) since a
// clinic's bookable equipment list is expected to stay small.

const GET_RESOURCES = gql`
  query GetResources($clinic_id: ID) {
    resources(clinic_id: $clinic_id) {
      id
      name
      type
      is_bookable
      clinic {
        id
        name
      }
    }
  }
`
const GET_CLINICS = gql`
  query GetResourcesClinics {
    clinics {
      id
      name
    }
  }
`
const CREATE_RESOURCE = gql`
  mutation CreateResource($input: ResourceInput!) {
    createResource(input: $input) {
      id
    }
  }
`
const UPDATE_RESOURCE = gql`
  mutation UpdateResource($id: ID!, $input: ResourceInput!) {
    updateResource(id: $id, input: $input) {
      id
    }
  }
`
const DELETE_RESOURCE = gql`
  mutation DeleteResource($id: ID!) {
    deleteResource(id: $id) {
      success
      userErrors {
        message
      }
    }
  }
`

const TYPE_LABELS = { equipment: 'Equipment', chair: 'Chair', machine: 'Machine', bay: 'Bay' }
const RESOURCE_TYPES = Object.keys(TYPE_LABELS)

const defaultForm = { clinicId: '', name: '', type: 'equipment', isBookable: true }

function ManagerResources() {
  const client = useApolloClient()

  const [clinics, setClinics] = useState([])
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingResource, setEditingResource] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [formError, setFormError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const loadResources = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const { data } = await client.query({ query: GET_RESOURCES, fetchPolicy: 'network-only' })
      setResources(data?.resources || [])
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    client
      .query({ query: GET_CLINICS })
      .then(({ data }) => {
        setClinics(data?.clinics || [])
        setForm((prev) => ({ ...prev, clinicId: prev.clinicId || data?.clinics?.[0]?.id || '' }))
      })
      .catch(() => {})
    loadResources()
  }, []) // eslint-disable-line

  const showSuccess = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }
  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const resetForm = () => {
    setForm({ ...defaultForm, clinicId: clinics[0]?.id || '' })
    setEditingResource(null)
    setShowForm(false)
    setFormError(null)
  }

  const handleEdit = (resource) => {
    setEditingResource(resource)
    setForm({
      clinicId: resource.clinic?.id || '',
      name: resource.name || '',
      type: resource.type || 'equipment',
      isBookable: resource.is_bookable,
    })
    setShowForm(true)
    setFormError(null)
  }

  const toResourceInput = (f) => ({
    name: f.name,
    clinic_id: f.clinicId,
    type: f.type,
    is_bookable: f.isBookable,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      if (editingResource) {
        await client.mutate({ mutation: UPDATE_RESOURCE, variables: { id: editingResource.id, input: toResourceInput(form) } })
        showSuccess('Resource updated.')
      } else {
        await client.mutate({ mutation: CREATE_RESOURCE, variables: { input: toResourceInput(form) } })
        showSuccess('Resource created.')
      }
      resetForm()
      loadResources()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = (id) => {
    setDeletingId(id)
    setConfirmOpen(true)
  }
  const confirmDelete = async () => {
    setConfirmOpen(false)
    try {
      const { data: res } = await client.mutate({ mutation: DELETE_RESOURCE, variables: { id: deletingId } })
      if (!res?.deleteResource?.success) {
        setFormError(res?.deleteResource?.userErrors?.[0]?.message || 'Delete failed')
        return
      }
      showSuccess('Resource deleted.')
      loadResources()
    } catch (err) {
      setFormError(err.message)
    }
    setDeletingId(null)
  }

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Resources
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bookable equipment (ECG machines, chairs, bays) an appointment can require alongside a clinician and room
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            resetForm()
            setShowForm((p) => !p)
          }}
        >
          Add Resource
        </Button>
      </Stack>

      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMsg}
        </Alert>
      )}
      {formError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setFormError(null)}>
          {formError}
        </Alert>
      )}

      {showForm && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" fontWeight={600} mb={2}>
              {editingResource ? 'Edit Resource' : 'New Resource'}
            </Typography>
            <Box component="form" onSubmit={handleSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required size="small">
                    <InputLabel>Clinic</InputLabel>
                    <Select label="Clinic" value={form.clinicId} onChange={(e) => setField('clinicId', e.target.value)}>
                      <MenuItem value="">Select clinic</MenuItem>
                      {clinics.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    required
                    size="small"
                    label="Name"
                    placeholder="e.g. ECG Machine"
                    value={form.name}
                    onChange={(e) => setField('name', e.target.value)}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required size="small">
                    <InputLabel>Type</InputLabel>
                    <Select label="Type" value={form.type} onChange={(e) => setField('type', e.target.value)}>
                      {RESOURCE_TYPES.map((t) => (
                        <MenuItem key={t} value={t}>
                          {TYPE_LABELS[t]}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Bookable</InputLabel>
                    <Select
                      label="Bookable"
                      value={form.isBookable ? 'yes' : 'no'}
                      onChange={(e) => setField('isBookable', e.target.value === 'yes')}
                    >
                      <MenuItem value="yes">Yes — can be attached to an appointment</MenuItem>
                      <MenuItem value="no">No — temporarily out of service</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12}>
                  <Stack direction="row" spacing={1}>
                    <Button type="submit" variant="contained" disabled={submitting}>
                      {submitting ? 'Saving…' : editingResource ? 'Update' : 'Create'}
                    </Button>
                    <Button variant="outlined" onClick={resetForm}>
                      Cancel
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            </Box>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : loadError ? (
        <Alert severity="error">Couldn't load resources: {loadError}</Alert>
      ) : (
        <Grid container spacing={2} mt={0.5}>
          {resources.length === 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent sx={{ textAlign: 'center', py: 6 }}>
                  <PrecisionManufacturingIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                  <Typography color="text.secondary">No resources yet. Add the equipment a booking might need.</Typography>
                </CardContent>
              </Card>
            </Grid>
          )}
          {resources.map((resource) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={resource.id}>
              <Card sx={{ height: '100%', '&:hover': { boxShadow: 4 }, transition: 'box-shadow 0.2s' }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                    <Box sx={{ bgcolor: 'info.50', borderRadius: 1, p: 1 }}>
                      <PrecisionManufacturingIcon color="info" />
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Edit">
                        <IconButton size="small" aria-label={`Edit resource ${resource.name}`} onClick={() => handleEdit(resource)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          aria-label={`Delete resource ${resource.name}`}
                          onClick={() => handleDelete(resource.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>

                  <Typography variant="h6" fontWeight={700} noWrap sx={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {resource.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {TYPE_LABELS[resource.type] || resource.type}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {resource.clinic?.name}
                  </Typography>

                  <Box mt={1.5}>
                    <Chip
                      label={resource.is_bookable ? 'Bookable' : 'Out of service'}
                      size="small"
                      color={resource.is_bookable ? 'success' : 'default'}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Delete Resource"
        message="Delete this resource permanently? This cannot be undone."
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmOpen(false)
          setDeletingId(null)
        }}
      />
    </Box>
  )
}

export default function ManagerResourcesWithBoundary() {
  return (
    <ErrorBoundary>
      <ManagerResources />
    </ErrorBoundary>
  )
}
