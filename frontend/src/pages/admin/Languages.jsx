import { useState, useEffect } from 'react'
import { useApolloClient, gql } from '@apollo/client'
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import GlobeIcon from '@mui/icons-material/Language'
import StarIcon from '@mui/icons-material/Star'
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog'

const GET_LANGUAGES = gql`
  query GetLanguages {
    languages {
      id
      name
      code
      is_active
      is_default
    }
  }
`
const CREATE_LANG = gql`
  mutation CreateLanguage($input: CreateLanguageInput!) {
    createLanguage(input: $input) {
      success
      userErrors {
        message
      }
    }
  }
`
const UPDATE_LANG = gql`
  mutation UpdateLanguage($id: ID!, $input: UpdateLanguageInput!) {
    updateLanguage(id: $id, input: $input) {
      success
      userErrors {
        message
      }
    }
  }
`
const DELETE_LANG = gql`
  mutation DeleteLanguage($id: ID!) {
    deleteLanguage(id: $id) {
      success
      userErrors {
        message
      }
    }
  }
`

const defaultForm = { name: '', code: '', is_active: true, is_default: false }

// ─── Mock fallback data ───────────────────────────────────────────────────────
const MOCK_LANGUAGES = [
  { id: 'l1', name: 'English', code: 'en', is_active: true, is_default: true },
  { id: 'l2', name: 'Spanish', code: 'es', is_active: true, is_default: false },
  { id: 'l3', name: 'French', code: 'fr', is_active: false, is_default: false },
]

export default function AdminLanguages() {
  const client = useApolloClient()
  const [languages, setLanguages] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [formError, setFormError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await client.query({ query: GET_LANGUAGES, fetchPolicy: 'network-only' })
      setLanguages(data?.languages || [])
    } catch (err) {
      setLanguages(MOCK_LANGUAGES)
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
    setSubmitting(true)
    setFormError(null)
    try {
      if (editItem) {
        const { data: r } = await client.mutate({ mutation: UPDATE_LANG, variables: { id: editItem.id, input: form } })
        if (!r?.updateLanguage?.success) throw new Error(r?.updateLanguage?.userErrors?.[0]?.message)
        showSuccess('Language updated.')
      } else {
        const { data: r } = await client.mutate({ mutation: CREATE_LANG, variables: { input: form } })
        if (!r?.createLanguage?.success) throw new Error(r?.createLanguage?.userErrors?.[0]?.message)
        showSuccess('Language created.')
      }
      reset()
      load()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggle = async (item) => {
    if (item.is_default && item.is_active) return // Cannot deactivate default language
    try {
      await client.mutate({ mutation: UPDATE_LANG, variables: { id: item.id, input: { is_active: !item.is_active } } })
      load()
    } catch (err) {
      setFormError(err.message)
    }
  }

  const canDelete = (item) => !item.is_default

  const confirmDelete = async () => {
    setConfirmOpen(false)
    try {
      const { data: r } = await client.mutate({ mutation: DELETE_LANG, variables: { id: deletingId } })
      if (!r?.deleteLanguage?.success) throw new Error(r?.deleteLanguage?.userErrors?.[0]?.message)
      showSuccess('Language deleted.')
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
            Languages
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure supported languages for the application
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
          Add Language
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
        <Card sx={{ mb: 3, p: 2 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>
            {editItem ? 'Edit Language' : 'New Language'}
          </Typography>
          <Box component="form" onSubmit={handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  size="small"
                  label="Language Name"
                  placeholder="e.g. English"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  size="small"
                  label="Locale Code"
                  placeholder="e.g. en, fr, de"
                  value={form.code}
                  onChange={(e) => setField('code', e.target.value.toLowerCase())}
                />
              </Grid>
              <Grid item xs={12}>
                <Stack direction="row" spacing={3}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Switch size="small" checked={form.is_active} onChange={(e) => setField('is_active', e.target.checked)} />
                    <Typography variant="body2">Active</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Switch size="small" checked={form.is_default} onChange={(e) => setField('is_default', e.target.checked)} />
                    <Typography variant="body2">Set as Default</Typography>
                  </Box>
                </Stack>
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
                {['Language', 'Code', 'Default', 'Status', 'Actions'].map((h) => (
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
              {languages.length === 0 && (
                <Box component="tr">
                  <Box component="td" colSpan={5} sx={{ textAlign: 'center', py: 6 }}>
                    <GlobeIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                    <Typography color="text.secondary">No languages configured</Typography>
                  </Box>
                </Box>
              )}
              {languages.map((item) => (
                <Box
                  component="tr"
                  key={item.id}
                  sx={{ '&:hover': { bgcolor: 'grey.50' }, borderBottom: '1px solid', borderColor: 'divider' }}
                >
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <GlobeIcon fontSize="small" color="action" />
                      <Typography fontWeight={600}>{item.name}</Typography>
                    </Stack>
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Chip label={item.code} size="small" variant="outlined" />
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    {item.is_default && <Chip icon={<StarIcon />} label="Default" size="small" color="warning" />}
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Tooltip title={item.is_default && item.is_active ? 'Cannot deactivate the default language' : ''}>
                      <Stack direction="row" alignItems="center" spacing={1} sx={{ display: 'inline-flex' }}>
                        <Switch
                          size="small"
                          checked={!!item.is_active}
                          onChange={() => handleToggle(item)}
                          disabled={item.is_default && item.is_active}
                        />
                        <Chip label={item.is_active ? 'Active' : 'Inactive'} size="small" color={item.is_active ? 'success' : 'default'} />
                      </Stack>
                    </Tooltip>
                  </Box>
                  <Box component="td" sx={{ px: 2, py: 1.5 }}>
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          aria-label={`Edit ${item.name}`}
                          onClick={() => {
                            setEditItem(item)
                            setForm({ name: item.name, code: item.code, is_active: item.is_active, is_default: item.is_default })
                            setShowForm(true)
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={canDelete(item) ? 'Delete' : 'Cannot delete the default language'}>
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            aria-label={canDelete(item) ? `Delete ${item.name}` : `Cannot delete ${item.name} — it's the default language`}
                            disabled={!canDelete(item)}
                            onClick={() => {
                              setDeletingId(item.id)
                              setConfirmOpen(true)
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
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
        title="Delete Language"
        message="Delete this language? This will remove it from all language selections."
        onConfirm={confirmDelete}
        onCancel={() => {
          setConfirmOpen(false)
          setDeletingId(null)
        }}
      />
    </Box>
  )
}
