import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Paper, Typography, Stack, Button, Card, CardContent, CardActions,
  Chip, Switch, IconButton, TextField, InputAdornment, List, ListItemButton,
  ListItemText, Badge, Collapse, Dialog, DialogTitle, DialogContent, DialogActions,
  Tabs, Tab, RadioGroup, FormControl, FormControlLabel, Radio, Autocomplete, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Alert
} from '@mui/material';
import {
  Search, Add, Edit, Delete, Close, KeyboardArrowDown, KeyboardArrowRight, AddCircleOutline
} from '@mui/icons-material';
import { useAuth } from '../../../hooks/useAuth';
import ConfirmDialog from '../../../components/ConfirmDialog/ConfirmDialog';
import ErrorBoundary from '../../../components/ErrorBoundary';

const BRAND = '#006D77';

// --- Mock data fallbacks (BUG-MGR-003 FIX — module level) ---
const MOCK_SERVICES_DATA = [
  { id: 'svc-1', name: 'GP Consultation',     description: 'Standard GP consultation - 20 minutes', price: 100, sku: 'GPS-001', is_active: true,  product_type: 'simple',   variations: [], cancellation_rules: [] },
  { id: 'svc-2', name: 'Blood Test (Full)',    description: 'Comprehensive metabolic panel',          price: 75,  sku: 'BLD-001', is_active: true,  product_type: 'simple',   variations: [], cancellation_rules: [] },
  { id: 'svc-3', name: 'X-Ray (Single View)', description: 'Diagnostic X-ray, one projection',      price: 120, sku: 'XRY-001', is_active: true,  product_type: 'simple',   variations: [], cancellation_rules: [] },
  { id: 'svc-4', name: 'Physiotherapy',        description: '45-minute physiotherapy session',        price: 85,  sku: 'PHY-001', is_active: true,  product_type: 'variable', variations: [], cancellation_rules: [] },
  { id: 'svc-5', name: 'Dermatology Review',   description: 'Specialist skin consultation',           price: 150, sku: 'DRM-001', is_active: true,  product_type: 'simple',   variations: [], cancellation_rules: [] },
  { id: 'svc-6', name: 'ECG Recording',        description: '12-lead electrocardiogram',             price: 95,  sku: 'ECG-001', is_active: false, product_type: 'simple',   variations: [], cancellation_rules: [] },
];
const MOCK_CATEGORIES_DATA = [
  { id: 'cat-1', name: 'Consultations', products: [{ id: 'svc-1' }], subcategories: [] },
  { id: 'cat-2', name: 'Diagnostics',   products: [{ id: 'svc-2' }, { id: 'svc-3' }, { id: 'svc-6' }], subcategories: [] },
  { id: 'cat-3', name: 'Therapy',       products: [{ id: 'svc-4' }], subcategories: [] },
  { id: 'cat-4', name: 'Specialist',    products: [{ id: 'svc-5' }], subcategories: [] },
];

// --- GraphQL ---

const GET_CATALOG_DATA = gql`
  query GetCatalogData($clinicId: ID!, $categoryId: ID) {
    getProductCategories(clinicId: $clinicId) {
      id
      name
      products {
        id
      }
      subcategories {
        id
        name
      }
    }
    getProducts(clinicId: $clinicId, categoryId: $categoryId) {
      id
      name
      description
      price
      sku
      is_active
      product_type
      cancellation_rules {
        id
        ruleType
        feeType
        feeAmount
        hoursBeforeAppointment
      }
      variations {
        id
        name
        sku
        price
        stockQuantity
      }
    }
    getClinician(id: "me") { # placeholder to get clinicId dynamically if not passed
      clinic {
        id
      }
    }
  }
`;

const SAVE_PRODUCT = gql`
  mutation SaveProduct($input: ProductInput!) {
    saveProduct(input: $input) {
      id
    }
  }
`;
const TOGGLE_PRODUCT = gql`
  mutation ToggleProductStatus($id: ID!, $isActive: Boolean!) {
    updateProduct(id: $id, input: { is_active: $isActive }) {
      id
      is_active
    }
  }
`;
const SAVE_VARIATION = gql`
  mutation SaveVariation($input: VariationInput!) {
    saveProductVariation(input: $input) { id }
  }
`;
const SAVE_RULE = gql`
  mutation SaveRule($input: CancellationRuleInput!) {
    saveProductCancellationRule(input: $input) { id }
  }
`;


// --- Helper Components ---

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} id={`tabpanel-${index}`} {...other}>
      {value === index && <Box sx={{ pt: 3, pb: 2 }}>{children}</Box>}
    </div>
  );
}

function ServiceCatalog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // State
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [expandedCats, setExpandedCats] = useState({});
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog State
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [productTab, setProductTab] = useState(0);
  const [editProduct, setEditProduct] = useState(null);
  
  // Rule Dialog State
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [newRule, setNewRule] = useState({ ruleType: 'cancellation', feeType: 'percentage', feeAmount: '', hoursBeforeAppointment: '' });

  // Variations array state for the table editor
  const [variations, setVariations] = useState([]);

  // BUG-SVC-001 FIX: delete state
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [deletingProductName, setDeletingProductName] = useState('');

  // SUG-SVC-002 / SUG-SVC-005 (older file) — "Add Category" dialog
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [localCategories, setLocalCategories] = useState([]); // categories added offline (no backend mutation available)

  // Assuming manager is linked to a clinic we can get. For now, defaulting to "1".
  const clinicId = user?.clinicId || "1"; 

  // Query
  const { data, loading, error, refetch } = useQuery(GET_CATALOG_DATA, {
    variables: { clinicId, categoryId: selectedCategoryId },
    skip: !clinicId,
  });

  // Mutations
  const [saveProduct, { loading: savingProduct }] = useMutation(SAVE_PRODUCT);
  const [toggleProduct] = useMutation(TOGGLE_PRODUCT);
  const [saveVariation] = useMutation(SAVE_VARIATION);
  const [saveRule] = useMutation(SAVE_RULE);

  const categories = useMemo(() => data?.getProductCategories || [], [data]);
  let products = useMemo(() => data?.getProducts || [], [data]);

  // BUG-MGR-003 FIX: use mock data when error/no data; isMock defined below in render body

  if (searchQuery) {
    products = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())));
  }


  // Handlers
  const handleToggleCat = (id) => {
    setExpandedCats(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const openNewProduct = () => {
    setEditProduct({
      name: '', description: '', product_type: 'simple', sku: '', price: '', 
      is_active: true, category_id: selectedCategoryId || null, subcategory_id: null
    });
    setVariations([{ id: 'mock1', name: '', sku: '', price: '', stockQuantity: '' }]);
    setProductTab(0);
    setProductDialogOpen(true);
  };

  const openEditProduct = (prod) => {
    setEditProduct({ ...prod });
    setVariations(prod.variations?.length > 0 ? [...prod.variations] : [{ id: 'mock1', name: '', sku: '', price: '', stockQuantity: '' }]);
    setProductTab(0);
    setProductDialogOpen(true);
  };

  const handleProductChange = (field, value) => setEditProduct(prev => ({ ...prev, [field]: value }));

  const toggleActive = async (id, currentStatus) => {
    try {
       await toggleProduct({ variables: { id, isActive: !currentStatus } });
       refetch();
    } catch(err) { console.error(err); }
  };

  // BUG-SVC-001 FIX: delete handler using toggleProduct mutation to set active=false
  // (no DELETE_PRODUCT mutation available; marking inactive is the safest operation)
  const handleDeleteProduct = (product) => {
    setDeletingProductId(product.id);
    setDeletingProductName(product.name);
    setConfirmDeleteOpen(true);
  };
  const confirmDeleteProduct = async () => {
    setConfirmDeleteOpen(false);
    try {
      await toggleProduct({ variables: { id: deletingProductId, isActive: false } });
      refetch();
    } catch (err) { console.error(err); }
    setDeletingProductId(null);
    setDeletingProductName('');
  };

  const handleSaveProduct = async () => {
    try {
      const input = {
        clinicId,
        name: editProduct.name,
        description: editProduct.description,
        price: parseFloat(editProduct.price),
        sku: editProduct.sku,
        isActive: editProduct.is_active,
        productType: editProduct.product_type,
        // category/sub mapping would go here
      };

      if (editProduct.id) input.id = editProduct.id;

      const res = await saveProduct({ variables: { input } });
      const newProdId = res.data.saveProduct.id;

      // Handle variations if variable
      if (editProduct.product_type === 'variable' && variations.length > 0) {
        for (const v of variations) {
           if (v.name && v.price !== '') {
             await saveVariation({ variables: { input: { productId: newProdId, name: v.name, sku: v.sku, price: parseFloat(v.price), stockQuantity: parseInt(v.stockQuantity)||null } } });
           }
        }
      }

      refetch();
      setProductDialogOpen(false);
    } catch(err) {
      console.error(err);
      alert("Error saving service.");
    }
  };

  // SUG-SVC-002 / SUG-SVC-005 (older file) — add a category (local only; no CREATE_CATEGORY mutation exists)
  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (!name) return;
    setLocalCategories(prev => [...prev, { id: `local-cat-${Date.now()}`, name, products: [], subcategories: [] }]);
    setNewCategoryName('');
    setCategoryDialogOpen(false);
  };

  // SUG-SVC-006 (older file) — remove a cancellation rule from the local dialog state
  const handleDeleteRule = (ruleId) => {
    setEditProduct(prev => ({
      ...prev,
      cancellation_rules: (prev.cancellation_rules || []).filter(r => r.id !== ruleId),
    }));
  };

  const handleSaveVariantUI = (idx, field, value) => {
    const newVars = [...variations];
    newVars[idx][field] = value;
    setVariations(newVars);
  };

  const addVariantRow = () => {
    setVariations(prev => [...prev, { id: Date.now(), name: '', sku: '', price: '', stockQuantity: '' }]);
  };


  const handleSaveRule = async () => {
    if(!editProduct?.id) return alert("Must save product first before adding rules.");
    try {
      await saveRule({
        variables: {
          input: {
            productId: editProduct.id,
            ruleType: newRule.ruleType,
            feeType: newRule.feeType,
            feeAmount: parseFloat(newRule.feeAmount),
            hoursBeforeAppointment: parseInt(newRule.hoursBeforeAppointment)
          }
        }
      });
      setRuleDialogOpen(false);
      refetch();
      // Update local state temporarily so dialog shows it
      setEditProduct(prev => ({
        ...prev, 
        cancellation_rules: [...(prev.cancellation_rules || []), { ...newRule, id: 'temp' }]
      }));
    } catch (err) { console.error(err); }
  };

  if (loading && !data) return <Box p={4} display="flex" justifyContent="center"><CircularProgress /></Box>;
  // BUG-MGR-003 FIX: use module-level mock data when backend is offline
  const isMock = !!error || (!loading && !data);

  // override derived arrays when backend is offline
  // SUG-SVC-002 — locally-added categories (no CREATE_CATEGORY mutation exists yet) are appended either way
  const displayCategories = [...(isMock ? MOCK_CATEGORIES_DATA : categories), ...localCategories];
  let displayProducts = isMock ? MOCK_SERVICES_DATA : products;
  if (searchQuery) {
    displayProducts = displayProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase())));
  }

  return (
    <Box p={{ xs: 2, md: 4 }} maxWidth="xl" mx="auto" display="flex" gap={4} flexDirection={{ xs: 'column', md: 'row' }} alignItems="flex-start">
      {/* SUG-MGR-009 FIX: offline demo data banner */}
      {isMock && (
        <Box sx={{ width: '100%', mb: -2 }}>
          <Alert severity="info" sx={{ borderRadius: 2, mb: 2 }}>
            <strong>Demo mode</strong> — Showing sample data. Backend is offline or unreachable.
          </Alert>
        </Box>
      )}

      
      {/* LEFT SIDEBAR: CATEGORIES */}
      <Box width={{ xs: '100%', md: 260 }} flexShrink={0}>
        <Paper elevation={0} sx={{ p: 2, position: { md: 'sticky' }, top: { md: 80 }, border: '1px solid #E2E8F0', borderRadius: 3 }}>
          <Typography variant="overline" fontWeight={800} color="text.secondary" mb={1.5} display="block" letterSpacing={1}>CATEGORIES</Typography>
          
          <List dense disablePadding>
            <ListItemButton
              selected={selectedCategoryId === null}
              onClick={() => setSelectedCategoryId(null)}
              sx={{
                borderRadius: 1.5, mb: 0.5,
                borderLeft: selectedCategoryId === null ? `3px solid ${BRAND}` : '3px solid transparent',
                '&.Mui-selected': { bgcolor: '#E0F2F1' },
              }}
            >
              <ListItemText primary={<Typography variant="body2" fontWeight={selectedCategoryId === null ? 700 : 500} color={selectedCategoryId === null ? BRAND : 'text.primary'}>All Services</Typography>} />
            </ListItemButton>

            {displayCategories.map(cat => (
              <Box key={cat.id}>
                <Stack direction="row" alignItems="center">
                  {cat.subcategories?.length > 0 && (
                    <IconButton size="small" onClick={() => handleToggleCat(cat.id)} sx={{ p: 0.5, mr: 0.5 }}>
                      {expandedCats[cat.id] ? <KeyboardArrowDown fontSize="small" /> : <KeyboardArrowRight fontSize="small" />}
                    </IconButton>
                  )}
                  <ListItemButton
                    selected={selectedCategoryId === cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    sx={{
                      borderRadius: 1.5, mb: 0.5, flexGrow: 1,
                      borderLeft: selectedCategoryId === cat.id ? `3px solid ${BRAND}` : '3px solid transparent',
                      '&.Mui-selected': { bgcolor: '#E0F2F1' },
                    }}
                  >
                    <ListItemText primary={<Typography variant="body2" fontWeight={selectedCategoryId === cat.id ? 700 : 500} color={selectedCategoryId === cat.id ? BRAND : 'text.primary'}>{cat.name}</Typography>} />
                    <Badge badgeContent={cat.products?.length || 0} sx={{ '& .MuiBadge-badge': { bgcolor: BRAND, color: 'white', right: -5, top: 10, fontSize: '0.65rem', minWidth: 18, height: 18 } }} />
                  </ListItemButton>
                </Stack>
                
                {cat.subcategories?.length > 0 && (
                  <Collapse in={expandedCats[cat.id]} timeout="auto" unmountOnExit>
                    <List dense disablePadding sx={{ pl: 4 }}>
                      {cat.subcategories.map(sub => (
                        <ListItemButton 
                          key={sub.id}
                          selected={selectedCategoryId === sub.id} 
                          onClick={() => setSelectedCategoryId(sub.id)}
                          sx={{ borderRadius: 1.5, mb: 0.5, '&.Mui-selected': { bgcolor: 'primary.50' } }}
                        >
                          <ListItemText primary={<Typography variant="body2" color="text.secondary">{sub.name}</Typography>} />
                        </ListItemButton>
                      ))}
                    </List>
                  </Collapse>
                )}
              </Box>
            ))}
          </List>

          {/* SUG-SVC-002 / SUG-SVC-005 (older file) — Add Category now opens a dialog */}
          <Button startIcon={<Add />} fullWidth size="small" variant="outlined" sx={{ mt: 3, borderStyle: 'dashed' }} onClick={() => setCategoryDialogOpen(true)}>
            Add Category
          </Button>
        </Paper>
      </Box>


      {/* RIGHT AREA: PRODUCTS GRID */}
      <Box flexGrow={1} width="100%">
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} mb={3} gap={2}>
          <Box>
            <Typography variant="h5" fontWeight={800}>
              {selectedCategoryId ? displayCategories.find(c => c.id === selectedCategoryId)?.name || 'Category' : 'All Services'}
            </Typography>
            <Typography variant="body2" color="text.secondary">{displayProducts.length} items found</Typography>
          </Box>
          
          <Stack direction="row" gap={2} width={{ xs: '100%', sm: 'auto' }}>
            <TextField 
              size="small" 
              placeholder="Search..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
              sx={{ bgcolor: 'white', borderRadius: 1 }}
            />
            <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/manager/services/new')} sx={{ whiteSpace: 'nowrap', bgcolor: BRAND, '&:hover': { bgcolor: '#005B64' }, borderRadius: 2, fontWeight: 700 }}>
              Add Service
            </Button>
          </Stack>
        </Stack>

        <Grid container spacing={3}>
          {displayProducts.length === 0 ? (
            <Grid item xs={12}>
              <Paper elevation={0} sx={{ p: 6, textAlign: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 3 }}>
                <Typography color="text.secondary">No services found in this category.</Typography>
              </Paper>
            </Grid>
          ) : (
            displayProducts.map(product => (
              <Grid item xs={12} sm={6} lg={4} xl={3} key={product.id}>
                <Card 
                  elevation={0}
                  sx={{
                    border: '1px solid #E2E8F0', borderRadius: 3, height: '100%',
                    display: 'flex', flexDirection: 'column', transition: 'all 0.2s ease',
                    '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 12px 28px rgba(0,109,119,0.12)`, borderColor: BRAND }
                  }}
                >
                  <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Chip 
                        label={product.product_type} 
                        color={product.product_type === 'simple' ? 'info' : 'secondary'} 
                        size="small" 
                        sx={{ textTransform: 'capitalize', fontWeight: 600, height: 24 }} 
                      />
                      <Switch 
                        checked={product.is_active} 
                        size="small" 
                        color="success"
                        onChange={() => toggleActive(product.id, product.is_active)}
                        inputProps={{ 'aria-label': 'toggle active status' }}
                      />
                    </Stack>
                    
                    <Typography variant="h6" fontWeight={700} lineHeight={1.3} mt={1} mb={0.5}>{product.name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 40 }}>
                      {product.description || 'No description provided.'}
                    </Typography>

                    <Stack direction="row" justifyContent="space-between" alignItems="flex-end" mt={2} pt={2} borderTop="1px solid #F1F5F9">
                      <Typography variant="caption" sx={{ fontFamily: '"Fira Code", monospace', fontWeight: 600, color: '#94A3B8', letterSpacing: 0.3 }}>
                        {product.sku || 'NO-SKU'}
                      </Typography>
                      <Typography variant="h5" sx={{ color: BRAND }} fontWeight={800}>
                        ₹{parseFloat(product.price || 0).toFixed(2)}
                      </Typography>
                    </Stack>
                  </CardContent>
                  
                  <CardActions sx={{ px: 2, pb: 2, pt: 0, justifyContent: 'flex-end', borderTop: '0px solid', borderColor: 'divider' }}>
                    <IconButton size="small" aria-label={`Edit service ${product.name}`} onClick={() => navigate(`/manager/services/${product.id}/edit`)} sx={{ bgcolor: 'action.hover' }}>
                      <Edit fontSize="small" />
                    </IconButton>
                    {/* BUG-SVC-001 FIX: Delete icon now wired */}
                    <IconButton size="small" color="error" aria-label={`Delete service ${product.name}`} onClick={() => handleDeleteProduct(product)} sx={{ bgcolor: 'error.lighter' }}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))
          )}
        </Grid>
      </Box>

      {/* ADD/EDIT PRODUCT DIALOG */}
      <Dialog 
        open={productDialogOpen} 
        onClose={() => setProductDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h5" fontWeight={800}>{editProduct?.id ? 'Edit Service' : 'Add New Service'}</Typography>
            <IconButton onClick={() => setProductDialogOpen(false)} size="small"><Close /></IconButton>
          </Stack>
        </DialogTitle>
        
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
          <Tabs value={productTab} onChange={(e, val) => setProductTab(val)}>
            <Tab label="Basic Info" sx={{ fontWeight: 600 }} />
            <Tab label="Variations" disabled={editProduct?.product_type !== 'variable'} sx={{ fontWeight: 600 }} />
            <Tab label="Cancellation Rules" disabled={!editProduct?.id} sx={{ fontWeight: 600 }} />
          </Tabs>
        </Box>

        <DialogContent sx={{ p: 3, pt: 1, minHeight: 400 }}>
          
          {/* TAB 0: Basic Info */}
          <TabPanel value={productTab} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField fullWidth label="Service Name" value={editProduct?.name || ''} onChange={e => handleProductChange('name', e.target.value)} required />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth multiline rows={3} label="Description" value={editProduct?.description || ''} onChange={e => handleProductChange('description', e.target.value)} />
              </Grid>
              <Grid item xs={12} sm={6}>
                 <Typography variant="subtitle2" fontWeight={700} mb={1}>Product Type</Typography>
                 <RadioGroup row value={editProduct?.product_type || 'simple'} onChange={e => handleProductChange('product_type', e.target.value)}>
                   <FormControlLabel value="simple" control={<Radio />} label="Simple (One Price)" />
                   <FormControlLabel value="variable" control={<Radio />} label="Variable (Multiple Options)" />
                 </RadioGroup>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>Status</Typography>
                <FormControlLabel control={<Switch checked={editProduct?.is_active ?? true} onChange={e => handleProductChange('is_active', e.target.checked)} />} label="Active (Bookable online)" />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  options={categories}
                  getOptionLabel={(option) => option.name}
                  value={displayCategories.find(c => c.id === editProduct?.category_id) || null}
                  onChange={(e, val) => handleProductChange('category_id', val ? val.id : null)}
                  renderInput={(params) => <TextField {...params} label="Category" />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                 <TextField fullWidth label="SKU / Internal Code" value={editProduct?.sku || ''} onChange={e => handleProductChange('sku', e.target.value)} />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                 <TextField 
                  fullWidth 
                  label="Base Price (₹)" 
                  type="number" 
                  value={editProduct?.price || ''} 
                  onChange={e => handleProductChange('price', e.target.value)} 
                  InputProps={{ startAdornment: <InputAdornment position="start">₹</InputAdornment> }}
                  required={editProduct?.product_type === 'simple'}
                 />
                 {editProduct?.product_type === 'variable' && <Typography variant="caption" color="text.secondary">Base price shown as "From ₹X" if variable.</Typography>}
              </Grid>
            </Grid>
          </TabPanel>

          {/* TAB 1: Variations */}
          <TabPanel value={productTab} index={1}>
            <Typography variant="subtitle2" gutterBottom color="text.secondary">
              Variations allow patients to select different durations or tiers (e.g., 30 Min vs 60 Min).
            </Typography>
            
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', mt: 2 }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: 'action.hover' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Option Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>SKU</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Price (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Stock (Opt)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {variations.map((vari, idx) => (
                    <TableRow key={vari.id}>
                      <TableCell><TextField size="small" placeholder="e.g. 60 Mins" value={vari.name} onChange={e => handleSaveVariantUI(idx, 'name', e.target.value)} /></TableCell>
                      <TableCell><TextField size="small" placeholder="SKU-60" value={vari.sku} onChange={e => handleSaveVariantUI(idx, 'sku', e.target.value)} /></TableCell>
                      <TableCell><TextField size="small" type="number" placeholder="50.00" value={vari.price} onChange={e => handleSaveVariantUI(idx, 'price', e.target.value)} /></TableCell>
                      <TableCell><TextField size="small" type="number" placeholder="∞" value={vari.stockQuantity} onChange={e => handleSaveVariantUI(idx, 'stockQuantity', e.target.value)} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Button startIcon={<AddCircleOutline />} onClick={addVariantRow} sx={{ mt: 2 }}>Add Variation Block</Button>
          </TabPanel>

          {/* TAB 2: Cancellation Rules */}
          <TabPanel value={productTab} index={2}>
            <Stack direction="row" justifyContent="space-between" mb={2}>
              <Typography variant="subtitle2" color="text.secondary">Rules that govern patient app cancellation limits & penalties.</Typography>
              <Button size="small" variant="contained" onClick={() => setRuleDialogOpen(true)}>Add Rule</Button>
            </Stack>
            
            <List sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
              {editProduct?.cancellation_rules?.length > 0 ? editProduct.cancellation_rules.map(rule => (
                <ListItemButton key={rule.id} divider>
                  <ListItemText 
                    primary={<Typography fontWeight={600} textTransform="capitalize">{rule.ruleType} Rule</Typography>} 
                    secondary={`${rule.feeType === 'percentage' ? rule.feeAmount + '%' : '₹'+rule.feeAmount} Fee if modified within ${rule.hoursBeforeAppointment} hours`} 
                  />
                  {/* SUG-SVC-006 (older file) — delete icon now wired */}
                  <IconButton size="small" color="error" aria-label={`Delete ${rule.ruleType} rule`} onClick={() => handleDeleteRule(rule.id)}><Delete fontSize="small" /></IconButton>
                </ListItemButton>
              )) : (
                <Box p={3} textAlign="center"><Typography variant="body2" color="text.secondary">No rules defined. System defaults will apply.</Typography></Box>
              )}
            </List>
          </TabPanel>

        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid #E2E8F0', gap: 1 }}>
          <Button onClick={() => setProductDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveProduct} disabled={savingProduct || (productTab === 0 && !editProduct?.name)} sx={{ bgcolor: BRAND, '&:hover': { bgcolor: '#005B64' }, borderRadius: 2, fontWeight: 700 }}>
            {savingProduct ? 'Saving...' : 'Save Service'}
          </Button>
        </DialogActions>
      </Dialog>


      {/* NEW RULE DIALOG */}
      <Dialog open={ruleDialogOpen} onClose={() => setRuleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Penalty Rule</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} mt={1}>
            <FormControl>
              <Typography variant="subtitle2" mb={1}>Rule Type</Typography>
              <RadioGroup row value={newRule.ruleType} onChange={e => setNewRule({...newRule, ruleType: e.target.value})}>
                <FormControlLabel value="cancellation" control={<Radio size="small"/>} label="Cancellation" />
                <FormControlLabel value="reschedule" control={<Radio size="small"/>} label="Reschedule" />
              </RadioGroup>
            </FormControl>
            <FormControl>
              <Typography variant="subtitle2" mb={1}>Fee Structure</Typography>
              <RadioGroup row value={newRule.feeType} onChange={e => setNewRule({...newRule, feeType: e.target.value})}>
                <FormControlLabel value="fixed" control={<Radio size="small"/>} label="Fixed Amount (₹)" />
                <FormControlLabel value="percentage" control={<Radio size="small"/>} label="Percentage (%)" />
              </RadioGroup>
            </FormControl>
            <TextField 
              label={`Fee ${newRule.feeType === 'percentage' ? '%' : '₹'}`} 
              type="number" 
              value={newRule.feeAmount} 
              onChange={e => setNewRule({...newRule, feeAmount: e.target.value})} 
            />
            <TextField 
              label="Hours Before Appointment Trigger" 
              type="number" 
              helperText="Penalty triggers if action is taken within this many hours of start time"
              value={newRule.hoursBeforeAppointment} 
              onChange={e => setNewRule({...newRule, hoursBeforeAppointment: e.target.value})} 
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setRuleDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveRule} disabled={!newRule.feeAmount || !newRule.hoursBeforeAppointment} sx={{ bgcolor: BRAND, '&:hover': { bgcolor: '#005B64' }, borderRadius: 2, fontWeight: 700 }}>Add Rule</Button>
        </DialogActions>
      </Dialog>

      {/* SUG-SVC-002 / SUG-SVC-005 (older file): Add Category dialog */}
      <Dialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Category</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus fullWidth margin="dense"
            label="Category Name"
            value={newCategoryName}
            onChange={e => setNewCategoryName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddCategory(); }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setCategoryDialogOpen(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>
          <Button variant="contained" disabled={!newCategoryName.trim()} onClick={handleAddCategory} sx={{ bgcolor: BRAND, '&:hover': { bgcolor: '#005B64' }, borderRadius: 2, fontWeight: 700 }}>
            Add Category
          </Button>
        </DialogActions>
      </Dialog>

      {/* BUG-SVC-001 FIX: confirm delete dialog */}
      <ConfirmDialog
        isOpen={confirmDeleteOpen}
        title="Deactivate Service"
        message={`Mark "${deletingProductName}" as inactive? This hides it from bookings but does not permanently delete it.`}
        onConfirm={confirmDeleteProduct}
        onCancel={() => { setConfirmDeleteOpen(false); setDeletingProductId(null); }}
      />

    </Box>
  );
}

// ErrorBoundary wrapper
export { ServiceCatalog };
export default function ServiceCatalogWithBoundary() {
  return <ErrorBoundary><ServiceCatalog /></ErrorBoundary>;
}
