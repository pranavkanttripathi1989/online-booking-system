import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client'
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
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded'
import SaveRoundedIcon from '@mui/icons-material/SaveRounded'
import { CREATE_PRODUCT_MUTATION } from '../../../graphql/mutations'

export default function CreateProductPage() {
  const navigate = useNavigate()
  const { enqueueSnackbar } = useSnackbar()
  const [form, setForm] = useState({ name: '', description: '', price: '', stock_quantity: '', sku: '', is_active: true })
  const [errors, setErrors] = useState({})

  const [createProduct, { loading }] = useMutation(CREATE_PRODUCT_MUTATION, {
    onCompleted: (data) => {
      if (!data?.createProduct?.success) {
        enqueueSnackbar(data?.createProduct?.userErrors?.[0]?.message || 'Failed to create product', { variant: 'error' })
        return
      }
      enqueueSnackbar('Product created', { variant: 'success' })
      navigate('/manager/products')
    },
    onError: (err) => enqueueSnackbar(err.message, { variant: 'error' }),
  })

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }))
  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Required'
    // SUG-PRD-006 FIX: reject negative price
    if (form.price !== '' && parseFloat(form.price) < 0) e.price = 'Price cannot be negative'
    if (form.stock_quantity !== '' && parseInt(form.stock_quantity) < 0) e.stock_quantity = 'Stock cannot be negative'
    setErrors(e)
    return !Object.keys(e).length
  }

  return (
    <Box className="page-enter">
      <Helmet>
        <title>New Product — MediBook</title>
      </Helmet>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3, flexWrap: 'wrap' }}>
        <IconButton onClick={() => navigate('/manager/products')} sx={{ bgcolor: '#F1F3F4' }} aria-label="Back to products">
          <ArrowBackRoundedIcon />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2.5,
              background: 'linear-gradient(135deg,#F3E8FD,#E1BBFA)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Inventory2RoundedIcon sx={{ color: '#8430CE', fontSize: '1.2rem' }} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              New Product
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add a product to the catalogue
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
            onClick={() => {
              if (validate())
                createProduct({
                  variables: {
                    input: {
                      name: form.name,
                      description: form.description || undefined,
                      price: form.price ? parseFloat(form.price) : undefined,
                      stock_quantity: form.stock_quantity ? parseInt(form.stock_quantity) : undefined,
                      sku: form.sku || undefined,
                      is_active: form.is_active,
                    },
                  },
                })
            }}
            disabled={loading}
            sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 700, bgcolor: '#8430CE', '&:hover': { bgcolor: '#6A27A8' } }}
          >
            {loading ? 'Saving…' : 'Save Product'}
          </Button>
        </Stack>
      </Box>
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
                  error={!!errors.name}
                  helperText={errors.name}
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
              {/* SUG-PRD-006 FIX: min=0 + error display on Price and Stock */}
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Price"
                  type="number"
                  value={form.price}
                  onChange={set('price')}
                  error={!!errors.price}
                  helperText={errors.price}
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  inputProps={{ min: 0, step: 0.01 }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  label="Stock Qty"
                  type="number"
                  value={form.stock_quantity}
                  onChange={set('stock_quantity')}
                  error={!!errors.stock_quantity}
                  helperText={errors.stock_quantity}
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
