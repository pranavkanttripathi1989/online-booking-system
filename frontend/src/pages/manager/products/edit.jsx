import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'
import { Helmet } from 'react-helmet-async'
import { useSnackbar } from 'notistack'
import {
  Box,
  Button,
  CircularProgress,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  Paper,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import { UPDATE_PRODUCT_MUTATION } from '../../../graphql/mutations'
import { PRODUCT_DETAIL_QUERY } from '../../../graphql/queries'

// GAP-PRD-003 FIX — mock product records for offline / invalid-ID scenarios
const MOCK_PRODUCT_BY_ID = {
  'prod-1': {
    id: 'prod-1',
    name: 'Vitamin D3 1000IU',
    description: 'High-strength Vitamin D3 supplement',
    price: '12.99',
    stock_quantity: '150',
    sku: 'VIT-D3',
    is_active: true,
  },
  'prod-2': {
    id: 'prod-2',
    name: 'Paracetamol 500mg',
    description: 'Pain relief tablets, pack of 32',
    price: '3.49',
    stock_quantity: '500',
    sku: 'PARA-500',
    is_active: true,
  },
  'prod-3': {
    id: 'prod-3',
    name: 'Blood Glucose Monitor',
    description: 'Digital blood glucose monitoring kit',
    price: '49.99',
    stock_quantity: '30',
    sku: 'BGM-001',
    is_active: true,
  },
  'prod-4': {
    id: 'prod-4',
    name: 'Omega-3 Fish Oil',
    description: 'Premium Omega-3 fatty acids',
    price: '18.50',
    stock_quantity: '200',
    sku: 'OMG-3',
    is_active: true,
  },
  'prod-5': {
    id: 'prod-5',
    name: 'First Aid Kit',
    description: 'Standard first aid kit — 42 items',
    price: '24.99',
    stock_quantity: '25',
    sku: 'FAK-STD',
    is_active: false,
  },
}

export default function EditProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm] = useState(null)

  // DATA-13 — mock (MOCK_PRODUCT_BY_ID below) is a fallback for a genuine
  // query error only, never for a real "no such product" result — that must
  // hit the not-found guard below, not silently edit a fabricated default.
  const { data, loading: fetching, error } = useQuery(PRODUCT_DETAIL_QUERY, {
    variables: { id },
    fetchPolicy: 'cache-first',
  })

  useEffect(() => {
    const p = error ? MOCK_PRODUCT_BY_ID[id] : data?.product
    if (!p) return
    setForm({
      name: p.name ?? '',
      description: p.description ?? '',
      price: p.price?.toString() ?? '',
      stock_quantity: p.stock_quantity?.toString() ?? '',
      sku: p.sku ?? '',
      is_active: p.is_active ?? true,
    })
  }, [data, error, id])

  const [updateProduct, { loading }] = useMutation(UPDATE_PRODUCT_MUTATION, {
    onCompleted: (data) => {
      if (!data?.updateProduct?.success) {
        enqueueSnackbar(data?.updateProduct?.userErrors?.[0]?.message || 'Failed to update product', { variant: 'error' })
        return
      }
      enqueueSnackbar('Product updated', { variant: 'success' })
      navigate('/manager/products')
    },
    onError: (err) => enqueueSnackbar(err.message, { variant: 'error' }),
  })

  if (fetching && !form)
    return (
      <Box>
        <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, mb: 3 }} />
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 3 }} />
      </Box>
    )

  // DATA-13 — an id that resolves to no real product and has no mock entry
  // MUST be a not-found state, never a silently-populated fake default.
  if (!fetching && !form)
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h5" fontWeight={700} mb={1}>
          Product not found
        </Typography>
        <Typography variant="body2" color="text.secondary" mb={2}>
          We couldn't find a product with that ID.
        </Typography>
        <Button variant="contained" onClick={() => navigate('/manager/products')} sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}>
          Back to Products
        </Button>
      </Box>
    )
  if (!form) return null

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSave = () =>
    updateProduct({
      variables: {
        id,
        input: {
          name: form.name,
          description: form.description || undefined,
          // GAP-PRD-001 FIX: clamp price and stock_quantity to >= 0 before sending
          price: form.price ? Math.max(0, parseFloat(form.price)) : undefined,
          stock_quantity: form.stock_quantity ? Math.max(0, parseInt(form.stock_quantity)) : undefined,
          sku: form.sku || undefined,
          is_active: form.is_active,
        },
      },
    })

  const productName = data?.product?.name ?? MOCK_PRODUCT_BY_ID[id]?.name ?? `Product ${id}`

  return (
    <Box className="page-enter">
      <Helmet>
        <title>Edit Product — MediBook</title>
      </Helmet>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={() => navigate('/manager/products')} sx={{ bgcolor: 'action.hover' }} aria-label="Back to products">
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2.5,
              background: (t) => `linear-gradient(135deg, ${alpha(t.palette.warning.main, 0.24)}, ${alpha(t.palette.warning.light, 0.24)})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <EditRoundedIcon sx={{ color: 'warning.main', fontSize: '1.2rem' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              Edit — {productName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Update product details
            </Typography>
          </Box>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            onClick={() => navigate('/manager/products')}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />}
            onClick={handleSave}
            disabled={loading}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, bgcolor: 'secondary.main', '&:hover': { bgcolor: 'secondary.dark' } }}
          >
            {loading ? 'Saving…' : 'Save Changes'}
          </Button>
        </Stack>
      </Box>

      {/* ── Form ───────────────────────────────────────────────────────── */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E8EAED' }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2.5}>
              Product Details
            </Typography>
            <Grid container spacing={2.5}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Product Name *"
                  value={form.name}
                  onChange={set('name')}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={form.description}
                  onChange={set('description')}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                {/* GAP-PRD-001 FIX: min=0 prevents negative price input */}
                <TextField
                  fullWidth
                  label="Price"
                  type="number"
                  value={form.price}
                  onChange={set('price')}
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  inputProps={{ min: 0, step: 0.01 }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                {/* GAP-PRD-001 FIX: min=0 prevents negative stock quantity */}
                <TextField
                  fullWidth
                  label="Stock Qty"
                  type="number"
                  value={form.stock_quantity}
                  onChange={set('stock_quantity')}
                  inputProps={{ min: 0 }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="SKU"
                  value={form.sku}
                  onChange={set('sku')}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid #E8EAED' }}>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>
              Status
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  color="success"
                />
              }
              label={
                <Typography fontWeight={600} color={form.is_active ? 'success.main' : 'text.secondary'}>
                  {form.is_active ? 'Active' : 'Inactive'}
                </Typography>
              }
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}
