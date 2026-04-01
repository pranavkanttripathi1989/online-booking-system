import { useState, useEffect } from 'react'
import { useApolloClient, gql } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Divider, FormControl, Grid, IconButton, InputAdornment,
  InputLabel, MenuItem, Select, Stack, Tab, Tabs,
  TextField, Tooltip, Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import InventoryIcon from '@mui/icons-material/Inventory2'
import CategoryIcon from '@mui/icons-material/Category'
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog'
import ErrorBoundary from '../../../components/ErrorBoundary'

// ─── GraphQL ─────────────────────────────────────────────────────────────────

const GET_PRODUCTS_DATA = gql`
  query GetProductsData {
    products {
      id clinic_id category_id subcategory_id name description
      product_type sku price is_active
      category    { id name }
      subcategory { id name }
    }
    productCategories   { id name description is_active }
    productSubcategories { id category_id name description is_active }
  }
`
const CREATE_PRODUCT    = gql`mutation CreateProduct($input: CreateProductInput!)    { createProduct(input:$input)   { success userErrors{message} product{id} } }`
const UPDATE_PRODUCT    = gql`mutation UpdateProduct($id:ID!,$input: UpdateProductInput!)  { updateProduct(id:$id,input:$input)  { success userErrors{message} } }`
const DELETE_PRODUCT    = gql`mutation DeleteProduct($id:ID!)    { deleteProduct(id:$id)   { success userErrors{message} } }`

const CREATE_CATEGORY   = gql`mutation CreateProductCategory($input: CreateProductCategoryInput!)    { createProductCategory(input:$input)   { success userErrors{message} } }`
const UPDATE_CATEGORY   = gql`mutation UpdateProductCategory($id:ID!,$input: UpdateProductCategoryInput!)  { updateProductCategory(id:$id,input:$input)  { success userErrors{message} } }`
const DELETE_CATEGORY   = gql`mutation DeleteProductCategory($id:ID!)    { deleteProductCategory(id:$id)   { success userErrors{message} } }`

const CREATE_SUBCATEGORY = gql`mutation CreateProductSubcategory($input: CreateProductSubcategoryInput!)    { createProductSubcategory(input:$input)   { success userErrors{message} } }`
const UPDATE_SUBCATEGORY = gql`mutation UpdateProductSubcategory($id:ID!,$input: UpdateProductSubcategoryInput!)  { updateProductSubcategory(id:$id,input:$input)  { success userErrors{message} } }`
const DELETE_SUBCATEGORY = gql`mutation DeleteProductSubcategory($id:ID!)    { deleteProductSubcategory(id:$id)   { success userErrors{message} } }`

// ─── Default forms ────────────────────────────────────────────────────────────

const dfProduct    = { name:'', sku:'', price:0, product_type:'simple', category_id:'', subcategory_id:'', description:'' }
const dfCategory   = { name:'', description:'' }
const dfSubcategory = { category_id:'', name:'', description:'' }
const dfVariation  = { variation_name:'', sku:'', price:0, stock_quantity:0 }

// ─── Mock data fallbacks (BUG-MGR-004 FIX) ──────────────────────────────────

const MOCK_PRODUCTS = [
  { id: 'prod-1', name: 'Vitamin D3 1000IU',   sku: 'VIT-D3',  price: 12.99, product_type: 'simple',  category_id: 'pc-1', subcategory_id: null, description: 'High-strength Vitamin D3 supplement', is_active: true,  category: { id: 'pc-1', name: 'Supplements' }, subcategory: null },
  { id: 'prod-2', name: 'Paracetamol 500mg',   sku: 'PARA-500', price: 3.49,  product_type: 'simple',  category_id: 'pc-2', subcategory_id: null, description: 'Pain relief tablets, pack of 32',      is_active: true,  category: { id: 'pc-2', name: 'Pharmacy'     }, subcategory: null },
  { id: 'prod-3', name: 'Blood Glucose Monitor', sku: 'BGM-001', price: 49.99, product_type: 'simple',  category_id: 'pc-3', subcategory_id: null, description: 'Digital blood glucose monitoring kit',   is_active: true,  category: { id: 'pc-3', name: 'Equipment'    }, subcategory: null },
  { id: 'prod-4', name: 'Omega-3 Fish Oil',    sku: 'OMG-3',   price: 18.50, product_type: 'variable', category_id: 'pc-1', subcategory_id: null, description: 'Premium Omega-3 fatty acids',           is_active: true,  category: { id: 'pc-1', name: 'Supplements' }, subcategory: null },
  { id: 'prod-5', name: 'First Aid Kit',       sku: 'FAK-STD', price: 24.99, product_type: 'simple',  category_id: 'pc-3', subcategory_id: null, description: 'Standard first aid kit — 42 items',    is_active: false, category: { id: 'pc-3', name: 'Equipment'    }, subcategory: null },
]
const MOCK_PROD_CATEGORIES = [
  { id: 'pc-1', name: 'Supplements', description: 'Dietary and nutritional supplements', is_active: true },
  { id: 'pc-2', name: 'Pharmacy',    description: 'Over-the-counter medications',        is_active: true },
  { id: 'pc-3', name: 'Equipment',   description: 'Medical devices and equipment',       is_active: true },
]
const MOCK_PROD_SUBCATEGORIES = []

// ─── Component ────────────────────────────────────────────────────────────────

function ManagerProducts() {
  const client = useApolloClient()
  const navigate = useNavigate()

  const [tabIndex, setTabIndex]             = useState(0)
  const [loading, setLoading]               = useState(true)
  const [products, setProducts]             = useState([])
  const [categories, setCategories]         = useState([])
  const [subcategories, setSubcategories]   = useState([])

  // Product form
  const [showPForm, setShowPForm]           = useState(false)
  const [editProduct, setEditProduct]       = useState(null)
  const [pForm, setPForm]                   = useState(dfProduct)
  const [variations, setVariations]         = useState([])

  // Category form
  const [showCatForm, setShowCatForm]       = useState(false)
  const [editCat, setEditCat]               = useState(null)
  const [catForm, setCatForm]               = useState(dfCategory)

  // Subcategory form
  const [showSubForm, setShowSubForm]       = useState(false)
  const [editSub, setEditSub]               = useState(null)
  const [subForm, setSubForm]               = useState(dfSubcategory)

  // Utility state
  const [confirmOpen, setConfirmOpen]       = useState(false)
  const [deleteTarget, setDeleteTarget]     = useState({ type:'', id:'' })
  const [formError, setFormError]           = useState(null)
  const [successMsg, setSuccessMsg]         = useState(null)
  const [submitting, setSubmitting]         = useState(false)
  const [isMockData, setIsMockData]         = useState(false)   // SUG-MGR-009

  const loadData = async () => {
    setLoading(true)
    try {
      const { data } = await client.query({ query: GET_PRODUCTS_DATA, fetchPolicy: 'network-only' })
      setProducts(data?.products || [])
      setCategories(data?.productCategories || [])
      setSubcategories(data?.productSubcategories || [])
    } catch (err) {
      // BUG-MGR-004 FIX: use mock data instead of showing blanks when GraphQL is offline
      setProducts(MOCK_PRODUCTS)
      setCategories(MOCK_PROD_CATEGORIES)
      setSubcategories(MOCK_PROD_SUBCATEGORIES)
      setIsMockData(true)   // SUG-MGR-009
    }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, []) // eslint-disable-line


  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000) }
  const setFieldP  = (k, v) => setPForm(p => ({ ...p, [k]: v }))

  // GAP-PRD-002 FIX — reset subcategory_id when category changes to avoid stale selection
  useEffect(() => {
    setPForm(p => ({ ...p, subcategory_id: '' }))
  }, [pForm.category_id]) // eslint-disable-line

  // ── Product CRUD ──────────────────────────────────────────────────────────
  const resetPForm = () => { setPForm(dfProduct); setVariations([]); setEditProduct(null); setShowPForm(false); setFormError(null) }

  const handlePSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true); setFormError(null)
    const input = { ...pForm, price: parseFloat(pForm.price) }
    try {
      if (editProduct) {
        const { data: r } = await client.mutate({ mutation: UPDATE_PRODUCT, variables: { id: editProduct.id, input } })
        if (!r?.updateProduct?.success) throw new Error(r?.updateProduct?.userErrors?.[0]?.message)
        showSuccess('Product updated.')
      } else {
        const createInput = pForm.product_type === 'variable' ? { ...input, variations } : input
        const { data: r } = await client.mutate({ mutation: CREATE_PRODUCT, variables: { input: createInput } })
        if (!r?.createProduct?.success) throw new Error(r?.createProduct?.userErrors?.[0]?.message)
        showSuccess('Product created.')
      }
      resetPForm(); loadData()
    } catch (err) { setFormError(err.message) }
    finally { setSubmitting(false) }
  }

  const addVariation = () => setVariations(v => [...v, { ...dfVariation }])
  const removeVariation = (i) => setVariations(v => v.filter((_, idx) => idx !== i))
  const updateVariation = (i, k, val) => setVariations(v => v.map((vv, idx) => idx === i ? { ...vv, [k]: val } : vv))

  // ── Category CRUD ─────────────────────────────────────────────────────────
  const resetCatForm = () => { setCatForm(dfCategory); setEditCat(null); setShowCatForm(false) }
  const handleCatSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true); setFormError(null)
    try {
      if (editCat) {
        const { data: r } = await client.mutate({ mutation: UPDATE_CATEGORY, variables: { id: editCat.id, input: catForm } })
        if (!r?.updateProductCategory?.success) throw new Error(r?.updateProductCategory?.userErrors?.[0]?.message)
        showSuccess('Category updated.')
      } else {
        const { data: r } = await client.mutate({ mutation: CREATE_CATEGORY, variables: { input: catForm } })
        if (!r?.createProductCategory?.success) throw new Error(r?.createProductCategory?.userErrors?.[0]?.message)
        showSuccess('Category created.')
      }
      resetCatForm(); loadData()
    } catch (err) { setFormError(err.message) }
    finally { setSubmitting(false) }
  }

  // ── Subcategory CRUD ──────────────────────────────────────────────────────
  const resetSubForm = () => { setSubForm(dfSubcategory); setEditSub(null); setShowSubForm(false) }
  const handleSubSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true); setFormError(null)
    try {
      if (editSub) {
        const { data: r } = await client.mutate({ mutation: UPDATE_SUBCATEGORY, variables: { id: editSub.id, input: subForm } })
        if (!r?.updateProductSubcategory?.success) throw new Error(r?.updateProductSubcategory?.userErrors?.[0]?.message)
        showSuccess('Subcategory updated.')
      } else {
        const { data: r } = await client.mutate({ mutation: CREATE_SUBCATEGORY, variables: { input: subForm } })
        if (!r?.createProductSubcategory?.success) throw new Error(r?.createProductSubcategory?.userErrors?.[0]?.message)
        showSuccess('Subcategory created.')
      }
      resetSubForm(); loadData()
    } catch (err) { setFormError(err.message) }
    finally { setSubmitting(false) }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = (type, id) => { setDeleteTarget({ type, id }); setConfirmOpen(true) }
  const confirmDelete = async () => {
    setConfirmOpen(false)
    try {
      const { type, id } = deleteTarget
      if (type === 'product') {
        const { data: r } = await client.mutate({ mutation: DELETE_PRODUCT, variables: { id } })
        if (!r?.deleteProduct?.success) throw new Error(r?.deleteProduct?.userErrors?.[0]?.message)
      } else if (type === 'category') {
        const { data: r } = await client.mutate({ mutation: DELETE_CATEGORY, variables: { id } })
        if (!r?.deleteProductCategory?.success) throw new Error(r?.deleteProductCategory?.userErrors?.[0]?.message)
      } else {
        const { data: r } = await client.mutate({ mutation: DELETE_SUBCATEGORY, variables: { id } })
        if (!r?.deleteProductSubcategory?.success) throw new Error(r?.deleteProductSubcategory?.userErrors?.[0]?.message)
      }
      showSuccess('Deleted.'); loadData()
    } catch (err) { setFormError(err.message) }
  }

  if (loading) return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>

  const filteredSubs = subcategories.filter(s => s.category_id === pForm.category_id)

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Typography variant="h5" fontWeight={700}>Products &amp; Inventory</Typography>
        <Typography variant="body2" color="text.secondary">Manage products, categories, and subcategories</Typography>
      </Box>

      {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
      {formError   && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setFormError(null)}>{formError}</Alert>}
      {/* SUG-MGR-009 FIX: offline demo data banner */}
      {isMockData && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          <strong>Demo mode</strong> — Showing sample data. Backend is offline or unreachable.
        </Alert>
      )}


      {/* Tabs */}
      <Tabs value={tabIndex} onChange={(_, v) => setTabIndex(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="Products"   icon={<InventoryIcon />} iconPosition="start" />
        <Tab label="Categories" icon={<CategoryIcon />}  iconPosition="start" />
      </Tabs>

      {/* ══ PRODUCTS TAB ══════════════════════════════════════════════════════ */}
      {tabIndex === 0 && (
        <>
          <Box mb={2}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/manager/products/new')}>Add Product</Button>
          </Box>

          {showPForm && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>{editProduct ? 'Edit Product' : 'New Product'}</Typography>
                <Box component="form" onSubmit={handlePSubmit}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}><TextField fullWidth required size="small" label="Product Name" value={pForm.name} onChange={e => setFieldP('name', e.target.value)} /></Grid>
                    <Grid item xs={12} sm={6}><TextField fullWidth required size="small" label="SKU" value={pForm.sku}  onChange={e => setFieldP('sku', e.target.value)} /></Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth required size="small">
                        <InputLabel>Category</InputLabel>
                        <Select label="Category" value={pForm.category_id}
                          onChange={e => setFieldP('category_id', e.target.value)}>
                          <MenuItem value="">Select category</MenuItem>
                          {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth size="small" disabled={!pForm.category_id}>
                        <InputLabel>Subcategory</InputLabel>
                        <Select label="Subcategory" value={pForm.subcategory_id}
                          onChange={e => setFieldP('subcategory_id', e.target.value)}>
                          <MenuItem value="">None</MenuItem>
                          {/* SUG-PRD-007 FIX: empty state when category has no subcategories */}
                          {pForm.category_id && filteredSubs.length === 0 && (
                            <MenuItem value="" disabled>No subcategories for this category</MenuItem>
                          )}
                          {filteredSubs.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth required size="small">
                        <InputLabel>Product Type</InputLabel>
                        <Select label="Product Type" value={pForm.product_type}
                          onChange={e => setFieldP('product_type', e.target.value)}>
                          <MenuItem value="simple">Simple</MenuItem>
                          <MenuItem value="variable">Variable</MenuItem>
                          <MenuItem value="service">Service</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>

                    {pForm.product_type === 'simple' && (
                      <Grid item xs={12} sm={6}>
                        {/* GAP-PRD-001 FIX: min=0 prevents negative price */}
                        <TextField fullWidth required size="small" type="number" label="Price"
                          InputProps={{ startAdornment: <InputAdornment position="start">£</InputAdornment> }}
                          inputProps={{ min: 0, step: 0.01 }}
                          value={pForm.price} onChange={e => setFieldP('price', e.target.value)} />
                      </Grid>
                    )}

                    <Grid item xs={12}>
                      <TextField fullWidth size="small" label="Description" multiline rows={2}
                        value={pForm.description} onChange={e => setFieldP('description', e.target.value)} />
                    </Grid>

                    {/* Variations section (variable type, new product only) */}
                    {pForm.product_type === 'variable' && !editProduct && (
                      <Grid item xs={12}>
                        <Divider sx={{ my: 1 }} />
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                          <Typography fontWeight={600}>Product Variations</Typography>
                          <Button size="small" startIcon={<AddIcon />} onClick={addVariation}>Add Variation</Button>
                        </Stack>
                        {variations.map((v, i) => (
                          <Grid container spacing={1.5} key={i} sx={{ mb: 1 }}>
                            <Grid item xs={12} sm={3}><TextField fullWidth size="small" placeholder="Name" value={v.variation_name} onChange={e => updateVariation(i, 'variation_name', e.target.value)} /></Grid>
                            <Grid item xs={6} sm={2}><TextField fullWidth size="small" placeholder="SKU" value={v.sku} onChange={e => updateVariation(i, 'sku', e.target.value)} /></Grid>
                            <Grid item xs={6} sm={2}><TextField fullWidth size="small" type="number" placeholder="Price" value={v.price} onChange={e => updateVariation(i, 'price', parseFloat(e.target.value))} /></Grid>
                            <Grid item xs={6} sm={2}><TextField fullWidth size="small" type="number" placeholder="Stock" value={v.stock_quantity} onChange={e => updateVariation(i, 'stock_quantity', parseInt(e.target.value))} /></Grid>
                            <Grid item xs={6} sm={1}><Button color="error" size="small" onClick={() => removeVariation(i)}>Remove</Button></Grid>
                          </Grid>
                        ))}
                      </Grid>
                    )}

                    <Grid item xs={12}>
                      <Stack direction="row" spacing={1}>
                        <Button type="submit" variant="contained" disabled={submitting}>{submitting ? 'Saving…' : editProduct ? 'Update' : 'Create'}</Button>
                        <Button variant="outlined" onClick={resetPForm}>Cancel</Button>
                      </Stack>
                    </Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Product cards */}
          <Grid container spacing={2}>
            {products.length === 0 && (
              <Grid item xs={12}><Card><CardContent sx={{ textAlign: 'center', py: 6 }}>
                <InventoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">No products yet</Typography>
              </CardContent></Card></Grid>
            )}
            {products.map(p => (
              <Grid item xs={12} sm={6} md={4} key={p.id}>
                <Card sx={{ height: '100%', '&:hover': { boxShadow: 4 }, transition: 'box-shadow 0.2s' }}>
                  <CardContent>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <InventoryIcon color="primary" />
                      <Stack direction="row" spacing={0.5}>
                        <Tooltip title="Edit">
                          {/* GAP-PRD-001 + aria-label */}
                          <IconButton size="small" aria-label={`Edit ${p.name}`} onClick={() => navigate(`/manager/products/${p.id}/edit`)}><EditIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" aria-label={`Delete ${p.name}`} onClick={() => handleDelete('product', p.id)}><DeleteIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                    <Typography fontWeight={700}>{p.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{p.sku}</Typography>
                    <Box mt={1} sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      <Chip label={p.product_type} size="small" sx={{ textTransform: 'capitalize' }} />
                      {p.category && <Chip label={p.category.name} size="small" variant="outlined" />}
                    </Box>
                    {p.product_type === 'simple' && (
                      <Typography variant="h6" color="success.main" mt={1}>£{Number(p.price).toFixed(2)}</Typography>
                    )}
                    {p.description && <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', mt: 0.5 }}>{p.description}</Typography>}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}

      {/* ══ CATEGORIES TAB ═══════════════════════════════════════════════════ */}
      {tabIndex === 1 && (
        <>
          <Stack direction="row" spacing={2} mb={2}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => { resetCatForm(); setShowCatForm(p => !p) }}>Add Category</Button>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => { resetSubForm(); setShowSubForm(p => !p) }}>Add Subcategory</Button>
          </Stack>

          {/* Category form */}
          {showCatForm && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>{editCat ? 'Edit Category' : 'New Category'}</Typography>
                <Box component="form" onSubmit={handleCatSubmit}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}><TextField fullWidth required size="small" label="Name" value={catForm.name} onChange={e => setCatForm(p => ({ ...p, name: e.target.value }))} /></Grid>
                    <Grid item xs={12}><TextField fullWidth size="small" label="Description" multiline rows={2} value={catForm.description} onChange={e => setCatForm(p => ({ ...p, description: e.target.value }))} /></Grid>
                    <Grid item xs={12}><Stack direction="row" spacing={1}><Button type="submit" variant="contained" disabled={submitting}>{editCat ? 'Update' : 'Create'}</Button><Button variant="outlined" onClick={resetCatForm}>Cancel</Button></Stack></Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Subcategory form */}
          {showSubForm && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} mb={2}>{editSub ? 'Edit Subcategory' : 'New Subcategory'}</Typography>
                <Box component="form" onSubmit={handleSubSubmit}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <FormControl fullWidth required size="small">
                        <InputLabel>Parent Category</InputLabel>
                        <Select label="Parent Category" value={subForm.category_id} onChange={e => setSubForm(p => ({ ...p, category_id: e.target.value }))}>
                          {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}><TextField fullWidth required size="small" label="Name" value={subForm.name} onChange={e => setSubForm(p => ({ ...p, name: e.target.value }))} /></Grid>
                    <Grid item xs={12}><TextField fullWidth size="small" label="Description" multiline rows={2} value={subForm.description} onChange={e => setSubForm(p => ({ ...p, description: e.target.value }))} /></Grid>
                    <Grid item xs={12}><Stack direction="row" spacing={1}><Button type="submit" variant="contained" disabled={submitting}>{editSub ? 'Update' : 'Create'}</Button><Button variant="outlined" onClick={resetSubForm}>Cancel</Button></Stack></Grid>
                  </Grid>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Categories list */}
          <Stack spacing={2}>
            {categories.map(cat => (
              <Card key={cat.id}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box>
                      <Typography fontWeight={700}>{cat.name}</Typography>
                      {cat.description && <Typography variant="body2" color="text.secondary">{cat.description}</Typography>}
                      {/* Subcategories under this category */}
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" mt={1}>
                        {subcategories.filter(s => s.category_id === cat.id).map(s => (
                          <Chip key={s.id} label={s.name} size="small" variant="outlined"
                            onDelete={() => handleDelete('subcategory', s.id)}
                            onClick={() => { setEditSub(s); setSubForm({ category_id: s.category_id, name: s.name, description: s.description || '' }); setShowSubForm(true) }} />
                        ))}
                      </Stack>
                    </Box>
                    <Stack direction="row" spacing={0.5}>
                      {/* SUG-PRD-010 FIX: aria-labels on category icon buttons */}
                      <Tooltip title="Edit category">
                        <IconButton size="small" aria-label={`Edit category ${cat.name}`} onClick={() => { setEditCat(cat); setCatForm({ name: cat.name, description: cat.description || '' }); setShowCatForm(true) }}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Delete category">
                        <IconButton size="small" color="error" aria-label={`Delete category ${cat.name}`} onClick={() => handleDelete('category', cat.id)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            ))}
            {categories.length === 0 && (
              <Card><CardContent sx={{ textAlign: 'center', py: 4 }}>
                <CategoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography color="text.secondary">No categories yet</Typography>
              </CardContent></Card>
            )}
          </Stack>
        </>
      )}

      <ConfirmDialog
        isOpen={confirmOpen}
        title={`Delete ${deleteTarget.type}`}
        message={`Delete this ${deleteTarget.type}? This cannot be undone.`}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </Box>
  )
}

// SUG-PRD-009 FIX: ErrorBoundary wraps the full module for crash resilience
export default function ManagerProductsWithBoundary() {
  return <ErrorBoundary><ManagerProducts /></ErrorBoundary>
}
