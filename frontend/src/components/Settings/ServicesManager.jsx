import { useState } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { useSnackbar } from 'notistack'
import { gql } from '@apollo/client'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'

import { SERVICES_QUERY } from '../../graphql/queries'

// ─── Inline GQL mutations ─────────────────────────────────────────────────────
const CREATE_SERVICE_MUTATION = gql`
  mutation CreateService($input: ServiceInput!) {
    createService(input: $input) {
      id name description duration_minutes price is_active
      category { id name }
    }
  }
`
const UPDATE_SERVICE_MUTATION = gql`
  mutation UpdateService($id: ID!, $input: ServiceInput!) {
    updateService(id: $id, input: $input) {
      id name description duration_minutes price is_active
    }
  }
`
const DELETE_SERVICE_MUTATION = gql`
  mutation DeleteService($id: ID!) { deleteService(id: $id) }`

const TOGGLE_SERVICE_MUTATION = gql`
  mutation ToggleService($id: ID!) {
    toggleServiceActive(id: $id) { id is_active }
  }
`

// ─── Inline service row form ──────────────────────────────────────────────────
function ServiceRow({ service, onSave, onDelete, onToggle }) {
  const [editing, setEditing] = useState(false)
  const [vals, setVals] = useState({ name: service.name, duration_minutes: service.duration_minutes, price: service.price ?? '' })

  const set = (k) => (e) => setVals((v) => ({ ...v, [k]: e.target.value }))

  const handleSave = () => { onSave(service.id, vals); setEditing(false) }

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      alignItems={{ sm: 'center' }}
      sx={{ py: 1, px: 1.5, borderRadius: 1.5, '&:hover': { bgcolor: 'action.hover' }, transition: '0.15s' }}
    >
      {editing ? (
        <>
          <TextField size="small" value={vals.name} onChange={set('name')} label="Name" sx={{ flex: 2 }} />
          <TextField size="small" value={vals.duration_minutes} onChange={set('duration_minutes')} label="Duration (min)" type="number" sx={{ width: 130 }} />
          <TextField size="small" value={vals.price} onChange={set('price')} label="Price (₹)" type="number" sx={{ width: 110 }} />
          <Stack direction="row" spacing={0.5}>
            <IconButton size="small" color="primary" onClick={handleSave}><CheckIcon fontSize="small" /></IconButton>
            <IconButton size="small" onClick={() => setEditing(false)}><CloseIcon fontSize="small" /></IconButton>
          </Stack>
        </>
      ) : (
        <>
          <Typography variant="body2" fontWeight={600} flex={2}>{service.name}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 80 }}>⏱ {service.duration_minutes} min</Typography>
          {service.price && (
            <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60 }}>₹{Number(service.price).toFixed(2)}</Typography>
          )}
          <FormControlLabel
            sx={{ m: 0 }}
            control={
              <Switch
                checked={service.is_active}
                size="small"
                color="success"
                onChange={() => onToggle(service.id)}
              />
            }
            label={<Typography variant="caption" color="text.secondary">{service.is_active ? 'Active' : 'Off'}</Typography>}
          />
          <Stack direction="row" spacing={0.25}>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => setEditing(true)}><EditIcon fontSize="small" /></IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" color="error" onClick={() => onDelete(service.id)}><DeleteIcon fontSize="small" /></IconButton>
            </Tooltip>
          </Stack>
        </>
      )}
    </Stack>
  )
}

// ─── Add Service Row ──────────────────────────────────────────────────────────
function AddServiceRow({ categoryId, onAdd, onCancel }) {
  const [vals, setVals] = useState({ name: '', duration_minutes: 30, price: '' })
  const set = (k) => (e) => setVals((v) => ({ ...v, [k]: e.target.value }))

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} sx={{ py: 1, px: 1.5 }}>
      <TextField size="small" value={vals.name} onChange={set('name')} label="Service name *" autoFocus sx={{ flex: 2 }} />
      <TextField size="small" value={vals.duration_minutes} onChange={set('duration_minutes')} label="Duration (min)" type="number" sx={{ width: 130 }} />
      <TextField size="small" value={vals.price} onChange={set('price')} label="Price (₹)" type="number" sx={{ width: 110 }} />
      <Stack direction="row" spacing={0.5}>
        <IconButton size="small" color="primary" disabled={!vals.name} onClick={() => onAdd({ ...vals, category_id: categoryId })}>
          <CheckIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={onCancel}><CloseIcon fontSize="small" /></IconButton>
      </Stack>
    </Stack>
  )
}

// ─── ServicesManager ──────────────────────────────────────────────────────────
export default function ServicesManager() {
  const { enqueueSnackbar } = useSnackbar()
  const [addingCategory, setAddingCategory] = useState(null)

  const { data, loading, refetch } = useQuery(SERVICES_QUERY, { fetchPolicy: 'cache-and-network' })
  const services = data?.services ?? []

  // Group by category
  const grouped = services.reduce((acc, s) => {
    const catName = s.category?.name ?? 'Uncategorised'
    const catId = s.category?.id ?? 'uncategorised'
    if (!acc[catId]) acc[catId] = { name: catName, id: catId, services: [] }
    acc[catId].services.push(s)
    return acc
  }, {})

  const [createService] = useMutation(CREATE_SERVICE_MUTATION, {
    onCompleted: () => { enqueueSnackbar('Service created', { variant: 'success' }); refetch() },
    onError: (e) => enqueueSnackbar(e.message, { variant: 'error' }),
  })
  const [updateService] = useMutation(UPDATE_SERVICE_MUTATION, {
    onCompleted: () => enqueueSnackbar('Service updated', { variant: 'success' }),
    onError: (e) => enqueueSnackbar(e.message, { variant: 'error' }),
  })
  const [deleteService] = useMutation(DELETE_SERVICE_MUTATION, {
    onCompleted: () => { enqueueSnackbar('Service deleted', { variant: 'info' }); refetch() },
    onError: (e) => enqueueSnackbar(e.message, { variant: 'error' }),
  })
  const [toggleService] = useMutation(TOGGLE_SERVICE_MUTATION, {
    onCompleted: () => enqueueSnackbar('Service toggled', { variant: 'info' }),
    onError: (e) => enqueueSnackbar(e.message, { variant: 'error' }),
  })

  const handleAdd = (categoryId, values) => {
    createService({ variables: { input: {
      name: values.name,
      duration_minutes: Number(values.duration_minutes),
      price: values.price ? parseFloat(values.price) : undefined,
      category_id: categoryId !== 'uncategorised' ? categoryId : undefined,
      is_active: true,
    } } })
    setAddingCategory(null)
  }

  const handleSave = (id, values) => {
    updateService({ variables: { id, input: {
      name: values.name,
      duration_minutes: Number(values.duration_minutes),
      price: values.price ? parseFloat(values.price) : undefined,
    } } })
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={800} mb={0.5}>Services & Categories</Typography>
      <Typography variant="body2" color="text.secondary" mb={3}>
        Manage the services your clinic offers, grouped by category.
      </Typography>

      {loading ? (
        <Stack spacing={1.5}>{[...Array(3)].map((_,i) => <Skeleton key={i} variant="rounded" height={56} sx={{borderRadius:2}} />)}</Stack>
      ) : Object.keys(grouped).length === 0 ? (
        <Typography color="text.secondary" textAlign="center" py={6}>No services found. Add your first service below.</Typography>
      ) : (
        <Stack spacing={1.5}>
          {Object.values(grouped).map((cat) => (
            <Accordion
              key={cat.id}
              defaultExpanded
              elevation={0}
              sx={{ border:'1px solid', borderColor:'divider', borderRadius:'10px !important', '&:before':{ display:'none' }, overflow:'hidden' }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2.5, bgcolor: 'rgba(0,0,0,0.018)' }}>
                <Stack direction="row" alignItems="center" spacing={1.5} flex={1}>
                  <Typography variant="subtitle2" fontWeight={700}>{cat.name}</Typography>
                  <Chip label={cat.services.length} size="small" sx={{ height: 20, fontSize: 11 }} />
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <Divider />
                {cat.services.map((s, idx) => (
                  <Box key={s.id}>
                    <ServiceRow
                      service={s}
                      onSave={handleSave}
                      onDelete={(id) => deleteService({ variables: { id } })}
                      onToggle={(id) => toggleService({ variables: { id } })}
                    />
                    {idx < cat.services.length - 1 && <Divider sx={{ mx: 1.5 }} />}
                  </Box>
                ))}
                {addingCategory === cat.id ? (
                  <>
                    <Divider sx={{ mx: 1.5 }} />
                    <AddServiceRow
                      categoryId={cat.id}
                      onAdd={(v) => handleAdd(cat.id, v)}
                      onCancel={() => setAddingCategory(null)}
                    />
                  </>
                ) : (
                  <Box px={1.5} py={1}>
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setAddingCategory(cat.id)}>
                      Add to {cat.name}
                    </Button>
                  </Box>
                )}
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      )}
    </Box>
  )
}
