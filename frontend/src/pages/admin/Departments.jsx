import { useState, useEffect } from 'react'
import { useApolloClient, gql } from '@apollo/client'
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
  Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CategoryIcon from '@mui/icons-material/Category'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog'
import { CLINICS_QUERY } from '../../graphql/queries'

// REQ014 (US-ORG-03). No mock fallback — this is a wholly new domain with
// a real backend from day one (CLAUDE.md's "no page ships rendering data
// it didn't fetch" — a mock layer here would have nothing genuine to fall
// back FROM). Follows admin/RoomTypes.jsx's exact shape (a simple, single-
// file lookup-table CRUD page), the closer structural fit versus the
// richer, mock-fallback-laden manager/clinics/ pattern.
const GET_DEPARTMENTS = gql`
  query GetDepartments {
    departments {
      id
      name
      clinic {
        id
        name
      }
    }
  }
`
const CREATE_DEPARTMENT = gql`
  mutation CreateDepartment($input: DepartmentInput!) {
    createDepartment(input: $input) {
      id
      name
      clinic {
        id
        name
      }
    }
  }
`
const UPDATE_DEPARTMENT = gql`
  mutation UpdateDepartment($id: ID!, $input: DepartmentInput!) {
    updateDepartment(id: $id, input: $input) {
      id
      name
      clinic {
        id
        name
      }
    }
  }
`
const DELETE_DEPARTMENT = gql`
  mutation DeleteDepartment($id: ID!) {
    deleteDepartment(id: $id) {
      success
      userErrors {
        message
      }
    }
  }
`

const defaultForm = { name: '', clinic_id: '' }

export default function AdminDepartments() {
  const client = useApolloClient()
  const [departments, setDepartments] = useState([])
  const [clinics, setClinics] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [formError, setFormError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [loadError, setLoadError] = useState(null)

  const load = async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const [{ data: deptData }, { data: clinicData }] = await Promise.all([
        client.query({ query: GET_DEPARTMENTS, fetchPolicy: 'network-only' }),
        client.query({ query: CLINICS_QUERY, fetchPolicy: 'network-only' }),
      ])
      setDepartments(deptData?.departments ?? [])
      setClinics(clinicData?.clinics ?? [])
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, []) // eslint-disable-line

  const showSuccess = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 3000)
  }
  const setField = (k, v) => setForm((p) => ({ ...p, [k]: v }))
  const reset = () => {
    setForm(defaultForm)
    setEditItem(null)
    setShowForm(false)
    setFormError(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.clinic_id) {
      setFormError('Clinic is required')
      return
    }
    setSubmitting(true)
    setFormError(null)
    try {
      if (editItem) {
        await client.mutate({ mutation: UPDATE_DEPARTMENT, variables: { id: editItem.id, input: form } })
        showSuccess('Department updated.')
      } else {
        await client.mutate({ mutation: CREATE_DEPARTMENT, variables: { input: form } })
        showSuccess('Department created.')
      }
      reset()
      load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const confirmDelete = async () => {
    setConfirmOpen(false)
    try {
      const { data: r } = await client.mutate({ mutation: DELETE_DEPARTMENT, variables: { id: deletingId } })
      if (!r?.deleteDepartment?.success) throw new Error(r?.deleteDepartment?.userErrors?.[0]?.message)
      showSuccess('Deleted.')
      load()
    } catch (err) {
      setFormError(err.message)
    }
    setDeletingId(null)
  }

  if (loading)
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    )

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Departments
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Specialty groupings (Cardiology, Dental, Physio) for clinicians and services
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            reset()
            setShowForm((p) => !p)
          }}
        >
          Add Department
        </Button>
      </Stack>

      {loadError && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button size="small" onClick={load}>
              Retry
            </Button>
          }
        >
          Failed to load: {loadError}
        </Alert>
      )}
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
        <Card sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>
            {editItem ? 'Edit Department' : 'New Department'}
          </Typography>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  size="small"
                  label="Name"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  select
                  fullWidth
                  required
                  size="small"
                  label="Clinic"
                  value={form.clinic_id}
                  onChange={(e) => setField('clinic_id', e.target.value)}
                >
                  {clinics.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <Stack direction="row" spacing={1}>
                  <Button type="submit" variant="contained" disabled={submitting}>
                    {editItem ? 'Update' : 'Create'}
                  </Button>
                  <Button variant="outlined" onClick={reset}>
                    Cancel
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </Card>
      )}

      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <Box component="thead">
              <Box component="tr" sx={{ bgcolor: 'grey.50' }}>
                {['Name', 'Clinic', 'Actions'].map((h) => (
                  <Box
                    key={h}
                    component="th"
                    sx={{
                      px: 2,
                      py: 1.5,
                      textAlign: 'left',
                      typography: 'caption',
                      fontWeight: 700,
                      color: 'text.secondary',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {h}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {departments.length === 0 && (
                <Box component="tr">
                  <Box component="td" colSpan={3} sx={{ textAlign: 'center', py: 6 }}>
                    <CategoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography color="text.secondary">No departments yet</Typography>
                  </Box>
                </Box>
              )}
              {departments.map((item) => (
                <Box
                  component="tr"
                  key={item.id}
                  sx={{ '&:hover': { bgcolor: 'grey.50' }, borderBottom: '1px solid', borderColor: 'divider' }}
                >
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Typography fontWeight={600}>{item.name}</Typography>
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      {item.clinic?.name ?? '—'}
                    </Typography>
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          aria-label={`Edit ${item.name}`}
                          onClick={() => {
                            setEditItem(item)
                            setForm({ name: item.name, clinic_id: item.clinic?.id ?? '' })
                            setShowForm(true)
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          aria-label={`Delete ${item.name}`}
                          onClick={() => {
                            setDeletingId(item.id)
                            setConfirmOpen(true)
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </Card>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Delete Department"
        message="Delete this department? Clinicians and services assigned to it will keep their other data but lose this grouping."
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmOpen(false)
          setDeletingId(null)
        }}
      />
    </Box>
  )
}
