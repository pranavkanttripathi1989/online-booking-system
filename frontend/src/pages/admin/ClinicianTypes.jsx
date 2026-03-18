import { useState, useEffect } from 'react'
import { useApolloClient, gql } from '@apollo/client'
import {
  Alert, Box, Button, Card, Chip, CircularProgress,
  Grid, IconButton, Stack, Switch, TextField, Typography, Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import BadgeIcon from '@mui/icons-material/Badge'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog'

const GET_CLINICIAN_TYPES = gql`query GetClinicianTypes { clinicianTypes { id name description is_active } }`
const CREATE_CT = gql`mutation CreateClinicianType($input: CreateClinicianTypeInput!) { createClinicianType(input:$input) { success userErrors{message} } }`
const UPDATE_CT = gql`mutation UpdateClinicianType($id:ID!,$input: UpdateClinicianTypeInput!) { updateClinicianType(id:$id,input:$input) { success userErrors{message} } }`
const DELETE_CT = gql`mutation DeleteClinicianType($id:ID!) { deleteClinicianType(id:$id) { success userErrors{message} } }`

const defaultForm = { name: '', description: '', is_active: true }

// ─── Mock fallback data ───────────────────────────────────────────────────────
const MOCK_CLINICIAN_TYPES = [
  { id: 'ct1', name: 'General Practitioner', description: 'Primary care physician',         is_active: true  },
  { id: 'ct2', name: 'Cardiologist',          description: 'Heart and cardiovascular care',  is_active: true  },
  { id: 'ct3', name: 'Neurologist',           description: 'Brain and nervous system care',  is_active: true  },
  { id: 'ct4', name: 'Physiotherapist',       description: 'Physical rehabilitation care',   is_active: true  },
]

export default function AdminClinicianTypes() {
  const client = useApolloClient()
  const [types, setTypes]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [editItem, setEditItem]       = useState(null)
  const [form, setForm]               = useState(defaultForm)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deletingId, setDeletingId]   = useState(null)
  const [formError, setFormError]     = useState(null)
  const [successMsg, setSuccessMsg]   = useState(null)
  const [submitting, setSubmitting]   = useState(false)

  const load = async () => {
    setLoading(true)
    try { const { data } = await client.query({ query: GET_CLINICIAN_TYPES, fetchPolicy: 'network-only' }); setTypes(data?.clinicianTypes || []) }
    catch (err) { setTypes(MOCK_CLINICIAN_TYPES) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, []) // eslint-disable-line

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000) }
  const setField = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const reset = () => { setForm(defaultForm); setEditItem(null); setShowForm(false); setFormError(null) }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true); setFormError(null)
    try {
      if (editItem) {
        const { data: r } = await client.mutate({ mutation: UPDATE_CT, variables: { id: editItem.id, input: form } })
        if (!r?.updateClinicianType?.success) throw new Error(r?.updateClinicianType?.userErrors?.[0]?.message)
        showSuccess('Clinician type updated.')
      } else {
        const { data: r } = await client.mutate({ mutation: CREATE_CT, variables: { input: form } })
        if (!r?.createClinicianType?.success) throw new Error(r?.createClinicianType?.userErrors?.[0]?.message)
        showSuccess('Clinician type created.')
      }
      reset(); load()
    } catch (err) { setFormError(err.message) }
    finally { setSubmitting(false) }
  }

  const handleToggle = async (item) => {
    try { await client.mutate({ mutation: UPDATE_CT, variables: { id: item.id, input: { is_active: !item.is_active } } }); load() }
    catch (err) { setFormError(err.message) }
  }

  const confirmDelete = async () => {
    setConfirmOpen(false)
    try {
      const { data: r } = await client.mutate({ mutation: DELETE_CT, variables: { id: deletingId } })
      if (!r?.deleteClinicianType?.success) throw new Error(r?.deleteClinicianType?.userErrors?.[0]?.message)
      showSuccess('Deleted.'); load()
    } catch (err) { setFormError(err.message) }
    setDeletingId(null)
  }

  if (loading) return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Clinician Types</Typography>
          <Typography variant="body2" color="text.secondary">Define clinician specialisation types used in rooms and scheduling</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => { reset(); setShowForm(p => !p) }}>Add Type</Button>
      </Stack>

      {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
      {formError   && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setFormError(null)}>{formError}</Alert>}

      {showForm && (
        <Card sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>{editItem ? 'Edit Type' : 'New Clinician Type'}</Typography>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}><TextField fullWidth required size="small" label="Name" value={form.name} onChange={e => setField('name', e.target.value)} /></Grid>
              <Grid item xs={12}><TextField fullWidth size="small" label="Description" multiline rows={2} value={form.description} onChange={e => setField('description', e.target.value)} /></Grid>
              <Grid item xs={12}><Stack direction="row" spacing={1}><Button type="submit" variant="contained" disabled={submitting}>{editItem ? 'Update' : 'Create'}</Button><Button variant="outlined" onClick={reset}>Cancel</Button></Stack></Grid>
            </Grid>
          </Box>
        </Card>
      )}

      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: 'grey.50' }}>
                {['Name', 'Description', 'Status', 'Actions'].map(h => (
                  <Box key={h} component="th" sx={{ px: 2, py: 1.5, textAlign: 'left', typography: 'caption', fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid', borderColor: 'divider' }}>{h}</Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {types.length === 0 && (
                <Box component="tr"><Box component="td" colSpan={4} sx={{ textAlign: 'center', py: 6 }}>
                  <BadgeIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                  <Typography color="text.secondary">No clinician types yet</Typography>
                </Box></Box>
              )}
              {types.map(item => (
                <Box component="tr" key={item.id} sx={{ '&:hover': { bgcolor: 'grey.50' }, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}><Typography fontWeight={600}>{item.name}</Typography></Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}><Typography variant="body2" color="text.secondary">{item.description || '—'}</Typography></Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Switch size="small" checked={!!item.is_active} onChange={() => handleToggle(item)} />
                      <Chip label={item.is_active ? 'Active' : 'Inactive'} size="small" color={item.is_active ? 'success' : 'default'} />
                    </Stack>
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Edit"><IconButton size="small" onClick={() => { setEditItem(item); setForm({ name: item.name, description: item.description || '', is_active: item.is_active }); setShowForm(true) }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Delete"><IconButton size="small" color="error" onClick={() => { setDeletingId(item.id); setConfirmOpen(true) }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                    </Stack>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Card>

      <ConfirmDialog isOpen={confirmOpen} title="Delete Clinician Type" message="Delete this clinician type? This may affect rooms using it." onConfirm={confirmDelete} onCancel={() => { setConfirmOpen(false); setDeletingId(null) }} />
    </Box>
  )
}
