import { useState, useEffect, useCallback, useRef } from 'react'
import { useApolloClient, gql } from '@apollo/client'
import { alpha, useTheme } from '@mui/material/styles'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import ReplayIcon from '@mui/icons-material/Replay'
import CancelIcon from '@mui/icons-material/Cancel'
import VisibilityIcon from '@mui/icons-material/Visibility'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import { formatDate, formatCurrency } from '../../utils/dateTime'

// REQ178/179/180 — real backend from day one (super_admin-only, platform-
// level tenant subscription billing), same "no mock fallback" convention
// as admin/Plans.jsx. platform_billing.resolver.ts returns flat arrays
// (no paginatorInfo) — matches Plans's own platform-catalog precedent for
// a small-cardinality, super_admin-only dataset, not a per-patient list.

const GET_PROVIDERS = gql`
  query GetPlatformBillingProviders {
    platformBillingProviders {
      id
      label
    }
  }
`
const GET_PLANS_FOR_SUBSCRIBE = gql`
  query GetPlansForPlatformSubscribe {
    plans {
      id
      name
      tier
      is_active
      current_version {
        id
        price
        billing_period
      }
    }
  }
`
const SEARCH_ORGS = gql`
  query SearchOrgsForPlatformBilling($search: OrganizationSearchInput) {
    organizationsPaginated(search: $search) {
      data {
        id
        name
        code
      }
    }
  }
`
const SUBSCRIPTION_FIELDS = `
  id
  client_org { id name }
  plan { id name tier }
  billing_period
  price
  status
  gateway
  mandate_status
  authentication_url
  current_period_start
  current_period_end
  cancel_at_period_end
  cancelled_at
  cancellation_reason
  created_at
`
const GET_SUBSCRIPTIONS = gql`
  query GetPlatformSubscriptions($status: String) {
    platformSubscriptions(status: $status) {
      ${SUBSCRIPTION_FIELDS}
    }
  }
`
const INVOICE_FIELDS = `
  id
  subscription_id
  client_org { id name }
  invoice_number
  amount
  status
  due_date
  paid_at
  gateway
  pre_debit_notice_sent_at
  afa_required
  platform_gstin
  client_org_gstin
  hsn_sac_code
  gst_rate
  cgst_amount
  sgst_amount
  igst_amount
  created_at
`
const GET_INVOICES = gql`
  query GetPlatformInvoices($status: String) {
    platformInvoices(status: $status) {
      ${INVOICE_FIELDS}
    }
  }
`
const GET_TRANSACTIONS = gql`
  query GetPlatformTransactions($status: String) {
    platformTransactions(status: $status) {
      ${INVOICE_FIELDS}
    }
  }
`
const CREATE_SUBSCRIPTION = gql`
  mutation CreatePlatformSubscription($input: CreatePlatformSubscriptionInput!) {
    createPlatformSubscription(input: $input) {
      success
      message
      subscription {
        ${SUBSCRIPTION_FIELDS}
      }
    }
  }
`
const CANCEL_SUBSCRIPTION = gql`
  mutation CancelPlatformSubscription($input: CancelPlatformSubscriptionInput!) {
    cancelPlatformSubscription(input: $input) {
      success
      message
    }
  }
`
const RETRY_INVOICE = gql`
  mutation RetryPlatformInvoice($invoiceId: ID!) {
    retryPlatformInvoice(invoice_id: $invoiceId) {
      success
      message
    }
  }
`

const STATUS_COLOR = {
  trialing: 'info',
  active: 'success',
  past_due: 'warning',
  grace: 'warning',
  suspended: 'error',
  cancelled: 'default',
  non_renewing: 'warning',
  pending: 'default',
  paid: 'success',
  failed: 'error',
  void: 'default',
  refunded: 'info',
}

function StatusChip({ status }) {
  return <Chip size="small" label={status?.replace(/_/g, ' ')} color={STATUS_COLOR[status] || 'default'} sx={{ textTransform: 'capitalize' }} />
}

// Shared table shell — Hard Rule 5 / RES-3: every <Table> needs an
// overflow-x container so wide rows scroll instead of clipping.
function DataTable({ headers, children, emptyIcon: EmptyIcon, emptyLabel }) {
  const hasRows = Array.isArray(children) ? children.some(Boolean) : !!children
  return (
    <Card>
      <Box sx={{ overflowX: 'auto' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
          <Box component="thead">
            <Box component="tr" sx={{ bgcolor: 'grey.50' }}>
              {headers.map((h) => (
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
          <Box component="tbody">{children}</Box>
        </Box>
        {!hasRows && (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            {EmptyIcon && <EmptyIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />}
            <Typography color="text.secondary">{emptyLabel}</Typography>
          </Box>
        )}
      </Box>
    </Card>
  )
}

function Row({ children }) {
  return (
    <Box component="tr" sx={{ '&:hover': { bgcolor: 'grey.50' }, borderBottom: '1px solid', borderColor: 'divider' }}>
      {children}
    </Box>
  )
}
function Cell({ children, ...props }) {
  return (
    <Box component="td" sx={{ px: 2, py: 1.5 }} {...props}>
      {children}
    </Box>
  )
}

export default function AdminPlatformBilling() {
  const client = useApolloClient()
  const theme = useTheme()
  const [tab, setTab] = useState(0)

  const [subscriptions, setSubscriptions] = useState([])
  const [invoices, setInvoices] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [actionError, setActionError] = useState(null)

  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState('')
  const [txStatusFilter, setTxStatusFilter] = useState('')

  const showSuccess = (msg) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(null), 4000)
  }

  const loadSubscriptions = useCallback(async () => {
    const { data, errors } = await client.query({ query: GET_SUBSCRIPTIONS, fetchPolicy: 'network-only' })
    if (errors?.length) throw new Error(errors[0].message)
    setSubscriptions(data?.platformSubscriptions ?? [])
  }, [client])

  const loadInvoices = useCallback(
    async (status) => {
      const { data, errors } = await client.query({
        query: GET_INVOICES,
        variables: { status: status || undefined },
        fetchPolicy: 'network-only',
      })
      if (errors?.length) throw new Error(errors[0].message)
      setInvoices(data?.platformInvoices ?? [])
    },
    [client],
  )

  const loadTransactions = useCallback(
    async (status) => {
      const { data, errors } = await client.query({
        query: GET_TRANSACTIONS,
        variables: { status: status || undefined },
        fetchPolicy: 'network-only',
      })
      if (errors?.length) throw new Error(errors[0].message)
      setTransactions(data?.platformTransactions ?? [])
    },
    [client],
  )

  const loadAll = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      await Promise.all([loadSubscriptions(), loadInvoices(invoiceStatusFilter), loadTransactions(txStatusFilter)])
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }, [loadSubscriptions, loadInvoices, loadTransactions, invoiceStatusFilter, txStatusFilter])

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadInvoices(invoiceStatusFilter).catch((err) => setActionError(err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceStatusFilter])

  useEffect(() => {
    loadTransactions(txStatusFilter).catch((err) => setActionError(err.message))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [txStatusFilter])

  // ── New Subscription dialog ──────────────────────────────────────────
  const [createOpen, setCreateOpen] = useState(false)
  const [providers, setProviders] = useState([])
  const [plans, setPlans] = useState([])
  const [orgOptions, setOrgOptions] = useState([])
  const [orgSearching, setOrgSearching] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState(null)
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [selectedGateway, setSelectedGateway] = useState('')
  const [createError, setCreateError] = useState(null)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createdAuthUrl, setCreatedAuthUrl] = useState(null)
  const orgSearchTimer = useRef(null)

  const openCreateDialog = async () => {
    setCreateError(null)
    setCreatedAuthUrl(null)
    setSelectedOrg(null)
    setSelectedPlanId('')
    setSelectedGateway('')
    setOrgOptions([])
    setCreateOpen(true)
    try {
      const [{ data: provData, errors: provErrors }, { data: planData, errors: planErrors }] = await Promise.all([
        client.query({ query: GET_PROVIDERS, fetchPolicy: 'network-only' }),
        client.query({ query: GET_PLANS_FOR_SUBSCRIBE, fetchPolicy: 'network-only' }),
      ])
      if (provErrors?.length) throw new Error(provErrors[0].message)
      if (planErrors?.length) throw new Error(planErrors[0].message)
      setProviders(provData?.platformBillingProviders ?? [])
      setPlans((planData?.plans ?? []).filter((p) => p.is_active && p.current_version))
    } catch (err) {
      setCreateError(err.message)
    }
  }

  // FORM-14 — a plain-text search against the org directory rather than a
  // long unfiltered dropdown; debounced so every keystroke doesn't fire a
  // network-only query. `reason` is 'reset' when the input's displayed
  // text changes because an option was just selected (or cleared) rather
  // than typed — searching the full "Name (code)" label against the org
  // directory would find nothing and waste a request, so that case is
  // skipped rather than re-fired.
  const handleOrgSearchInput = (_e, value, reason) => {
    if (orgSearchTimer.current) clearTimeout(orgSearchTimer.current)
    if (reason === 'reset' || reason === 'clear') return
    if (!value || value.length < 2) {
      setOrgOptions([])
      return
    }
    orgSearchTimer.current = setTimeout(async () => {
      setOrgSearching(true)
      try {
        const { data } = await client.query({
          query: SEARCH_ORGS,
          variables: { search: { search: value, limit: 20, offset: 0 } },
          fetchPolicy: 'network-only',
        })
        setOrgOptions(data?.organizationsPaginated?.data ?? [])
      } finally {
        setOrgSearching(false)
      }
    }, 300)
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    if (!selectedOrg || !selectedPlanId || !selectedGateway) {
      setCreateError('Choose a tenant, a plan, and a gateway.')
      return
    }
    setCreateSubmitting(true)
    setCreateError(null)
    try {
      const { data } = await client.mutate({
        mutation: CREATE_SUBSCRIPTION,
        variables: { input: { client_org_id: selectedOrg.id, plan_id: selectedPlanId, gateway: selectedGateway } },
      })
      const result = data?.createPlatformSubscription
      if (!result?.success) throw new Error(result?.message || 'Failed to create subscription')
      if (result.subscription?.authentication_url) {
        setCreatedAuthUrl(result.subscription.authentication_url)
      } else {
        setCreateOpen(false)
        showSuccess(`Subscription created for ${selectedOrg.name}.`)
      }
      await loadSubscriptions()
    } catch (err) {
      setCreateError(err.message)
    } finally {
      setCreateSubmitting(false)
    }
  }

  // ── Subscription detail + typed-confirmation cancel (SURF-16) ───────
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailSub, setDetailSub] = useState(null)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelImmediately, setCancelImmediately] = useState(false)
  const [cancelTypedName, setCancelTypedName] = useState('')
  const [cancelSubmitting, setCancelSubmitting] = useState(false)
  const [cancelError, setCancelError] = useState(null)

  const openDetail = (sub) => {
    setDetailSub(sub)
    setDetailOpen(true)
  }
  const openCancel = () => {
    setCancelReason('')
    setCancelImmediately(false)
    setCancelTypedName('')
    setCancelError(null)
    setCancelOpen(true)
  }
  const cancelNameMatches = cancelTypedName.trim() === detailSub?.client_org?.name
  const handleConfirmCancel = async () => {
    if (!cancelNameMatches || !cancelReason.trim()) return
    setCancelSubmitting(true)
    setCancelError(null)
    try {
      const { data } = await client.mutate({
        mutation: CANCEL_SUBSCRIPTION,
        variables: { input: { subscription_id: detailSub.id, reason: cancelReason.trim(), immediately: cancelImmediately } },
      })
      const result = data?.cancelPlatformSubscription
      if (!result?.success) throw new Error(result?.message || 'Failed to cancel subscription')
      showSuccess(cancelImmediately ? 'Subscription cancelled immediately.' : 'Subscription will cancel at the end of the current period.')
      setCancelOpen(false)
      setDetailOpen(false)
      await loadSubscriptions()
    } catch (err) {
      setCancelError(err.message)
    } finally {
      setCancelSubmitting(false)
    }
  }

  const handleRetryInvoice = async (invoiceId) => {
    setActionError(null)
    try {
      const { data } = await client.mutate({ mutation: RETRY_INVOICE, variables: { invoiceId } })
      const result = data?.retryPlatformInvoice
      if (!result?.success) throw new Error(result?.message || 'Retry failed')
      showSuccess('Retry recorded — the gateway will resolve it on its own next attempt.')
      await Promise.all([loadInvoices(invoiceStatusFilter), loadTransactions(txStatusFilter)])
    } catch (err) {
      setActionError(err.message)
    }
  }

  if (loading)
    return (
      <Box display="flex" justifyContent="center" py={6}>
        <CircularProgress />
      </Box>
    )

  const failedInvoicesCount = invoices.filter((i) => i.status === 'failed').length

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Platform Billing
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Tenant subscriptions, invoicing, and RBI-compliant recurring collection — super_admin only
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog}>
          New Subscription
        </Button>
      </Stack>

      {loadError && (
        <Alert severity="warning" sx={{ mb: 2 }} action={<Button size="small" onClick={loadAll}>Retry</Button>}>
          Failed to load: {loadError}
        </Alert>
      )}
      {successMsg && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {successMsg}
        </Alert>
      )}
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Subscriptions (${subscriptions.length})`} />
        <Tab label="Invoices" />
        <Tab
          label={
            failedInvoicesCount > 0 ? (
              <Stack direction="row" spacing={0.75} alignItems="center">
                <span>Transactions</span>
                <Chip size="small" color="error" label={failedInvoicesCount} sx={{ height: 18, fontSize: 11 }} />
              </Stack>
            ) : (
              'Transactions'
            )
          }
        />
      </Tabs>

      {tab === 0 && (
        <DataTable
          headers={['Tenant', 'Plan', 'Billing', 'Price', 'Status', 'Gateway', 'Current Period', '']}
          emptyIcon={ReceiptLongIcon}
          emptyLabel="No subscriptions yet"
        >
          {subscriptions.map((s) => (
            <Row key={s.id}>
              <Cell>
                <Typography fontWeight={600}>{s.client_org.name}</Typography>
              </Cell>
              <Cell>
                <Typography variant="body2">{s.plan.name}</Typography>
                <Chip size="small" label={s.plan.tier} variant="outlined" sx={{ mt: 0.5 }} />
              </Cell>
              <Cell sx={{ textTransform: 'capitalize' }}>{s.billing_period}</Cell>
              <Cell>{formatCurrency(s.price)}</Cell>
              <Cell>
                <StatusChip status={s.status} />
                {s.cancel_at_period_end && s.status !== 'cancelled' && (
                  <Chip size="small" label="ending" variant="outlined" color="warning" sx={{ ml: 0.5 }} />
                )}
              </Cell>
              <Cell sx={{ textTransform: 'capitalize' }}>{s.gateway}</Cell>
              <Cell>
                <Typography variant="body2">
                  {formatDate(s.current_period_start)} – {formatDate(s.current_period_end)}
                </Typography>
              </Cell>
              <Cell>
                <Tooltip title="View subscription">
                  <Button size="small" startIcon={<VisibilityIcon />} onClick={() => openDetail(s)}>
                    View
                  </Button>
                </Tooltip>
              </Cell>
            </Row>
          ))}
        </DataTable>
      )}

      {tab === 1 && (
        <Box>
          <TextField
            select
            size="small"
            label="Status"
            value={invoiceStatusFilter}
            onChange={(e) => setInvoiceStatusFilter(e.target.value)}
            sx={{ mb: 2, minWidth: 180 }}
          >
            <MenuItem value="">All statuses</MenuItem>
            {['pending', 'paid', 'failed', 'void', 'refunded'].map((s) => (
              <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          <InvoiceTable rows={invoices} onRetry={handleRetryInvoice} theme={theme} />
        </Box>
      )}

      {tab === 2 && (
        <Box>
          <TextField
            select
            size="small"
            label="Status"
            value={txStatusFilter}
            onChange={(e) => setTxStatusFilter(e.target.value)}
            sx={{ mb: 2, minWidth: 180 }}
          >
            <MenuItem value="">All statuses</MenuItem>
            {['pending', 'paid', 'failed', 'void', 'refunded'].map((s) => (
              <MenuItem key={s} value={s} sx={{ textTransform: 'capitalize' }}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          <InvoiceTable rows={transactions} onRetry={handleRetryInvoice} theme={theme} />
        </Box>
      )}

      {/* ── New Subscription ─────────────────────────────────────────── */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>New Subscription</DialogTitle>
        <DialogContent dividers>
          {createError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {createError}
            </Alert>
          )}
          {createdAuthUrl ? (
            <Stack spacing={1.5}>
              <Alert severity="success">Subscription created. The tenant must complete mandate/card setup before billing begins.</Alert>
              <Typography variant="body2" color="text.secondary">
                Setup link (share with the tenant, or they can complete this in their own onboarding email):
              </Typography>
              <TextField fullWidth size="small" value={createdAuthUrl} InputProps={{ readOnly: true }} />
            </Stack>
          ) : (
            <Box component="form" id="create-subscription-form" onSubmit={handleCreateSubmit}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Autocomplete
                    options={orgOptions}
                    getOptionLabel={(o) => `${o.name}${o.code ? ` (${o.code})` : ''}`}
                    isOptionEqualToValue={(o, v) => o.id === v.id}
                    value={selectedOrg}
                    onChange={(_e, v) => setSelectedOrg(v)}
                    onInputChange={handleOrgSearchInput}
                    loading={orgSearching}
                    noOptionsText="Type at least 2 characters to search"
                    renderInput={(params) => (
                      <TextField {...params} label="Tenant organization" required size="small" placeholder="Search by name or code" />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    required
                    size="small"
                    label="Plan"
                    value={selectedPlanId}
                    onChange={(e) => setSelectedPlanId(e.target.value)}
                  >
                    {plans.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.name} — {formatCurrency(p.current_version.price)}/{p.current_version.billing_period === 'annual' ? 'yr' : 'mo'}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    select
                    fullWidth
                    required
                    size="small"
                    label="Payment gateway"
                    value={selectedGateway}
                    onChange={(e) => setSelectedGateway(e.target.value)}
                  >
                    {providers.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.label}
                      </MenuItem>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={12}>
                  <Alert severity="info" variant="outlined">
                    The tenant confirms a UPI AutoPay/eNACH mandate (Razorpay) or enters a card (Stripe) via the setup link generated after
                    submit — billing does not begin until that mandate is confirmed.
                  </Alert>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCreateOpen(false)}>{createdAuthUrl ? 'Close' : 'Cancel'}</Button>
          {!createdAuthUrl && (
            <Button type="submit" form="create-subscription-form" variant="contained" disabled={createSubmitting}>
              {createSubmitting ? 'Creating…' : 'Create Subscription'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ── Subscription detail ──────────────────────────────────────── */}
      <Dialog open={detailOpen} onClose={() => setDetailOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>Subscription — {detailSub?.client_org?.name}</DialogTitle>
        <DialogContent dividers>
          {detailSub && (
            <Stack spacing={1.5}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body1" fontWeight={700}>
                  {detailSub.plan.name} ({detailSub.plan.tier})
                </Typography>
                <StatusChip status={detailSub.status} />
              </Stack>
              <Divider />
              {[
                ['Billing period', <span style={{ textTransform: 'capitalize' }}>{detailSub.billing_period}</span>],
                ['Price', formatCurrency(detailSub.price)],
                ['Gateway', <span style={{ textTransform: 'capitalize' }}>{detailSub.gateway}</span>],
                ['Mandate status', detailSub.mandate_status || '—'],
                ['Current period', `${formatDate(detailSub.current_period_start)} – ${formatDate(detailSub.current_period_end)}`],
              ].map(([label, value]) => (
                <Stack direction="row" justifyContent="space-between" key={label}>
                  <Typography variant="body2" color="text.secondary">
                    {label}
                  </Typography>
                  <Typography variant="body2">{value}</Typography>
                </Stack>
              ))}
              {detailSub.cancel_at_period_end && detailSub.status !== 'cancelled' && (
                <Alert severity="warning" variant="outlined">
                  Ending at period end{detailSub.cancellation_reason ? ` — ${detailSub.cancellation_reason}` : ''}. Entitlements stay active
                  until {formatDate(detailSub.current_period_end)}.
                </Alert>
              )}
              {detailSub.status === 'cancelled' && (
                <Alert severity="info" variant="outlined">
                  Cancelled {formatDate(detailSub.cancelled_at)}
                  {detailSub.cancellation_reason ? ` — ${detailSub.cancellation_reason}` : ''}.
                </Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDetailOpen(false)}>Close</Button>
          {detailSub && !['cancelled'].includes(detailSub.status) && !detailSub.cancel_at_period_end && (
            <Button color="error" startIcon={<CancelIcon />} onClick={openCancel}>
              Cancel Subscription
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ── Cancel — SURF-16 typed confirmation (cross-tenant destructive
           action: type the tenant org name to confirm) ──────────────── */}
      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon color="warning" />
          Cancel Subscription
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            {cancelError && <Alert severity="error">{cancelError}</Alert>}
            <FormControlLabel
              control={<Switch checked={cancelImmediately} onChange={(e) => setCancelImmediately(e.target.checked)} />}
              label={cancelImmediately ? 'Cancel immediately (revokes access now)' : 'Cancel at end of current period (default, graceful)'}
            />
            {cancelImmediately && (
              <Alert severity="error" variant="outlined">
                This revokes {detailSub?.client_org?.name}&rsquo;s access immediately, even though they may have already paid through{' '}
                {formatDate(detailSub?.current_period_end)}.
              </Alert>
            )}
            <TextField
              fullWidth
              required
              multiline
              minRows={2}
              size="small"
              label="Reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              helperText="Recorded on the subscription and shown to the tenant."
            />
            <TextField
              fullWidth
              required
              size="small"
              label={`Type "${detailSub?.client_org?.name}" to confirm`}
              value={cancelTypedName}
              onChange={(e) => setCancelTypedName(e.target.value)}
              error={cancelTypedName.length > 0 && !cancelNameMatches}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCancelOpen(false)}>Back</Button>
          <Button
            variant="contained"
            color="error"
            disabled={!cancelNameMatches || !cancelReason.trim() || cancelSubmitting}
            onClick={handleConfirmCancel}
          >
            {cancelSubmitting ? 'Cancelling…' : 'Confirm Cancellation'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function InvoiceTable({ rows, onRetry, theme }) {
  return (
    <DataTable headers={['Invoice #', 'Tenant', 'Amount', 'Status', 'Due', 'Gateway', 'GST', '']} emptyIcon={ReceiptLongIcon} emptyLabel="No invoices">
      {rows.map((inv) => (
        <Row key={inv.id}>
          <Cell>
            <Typography variant="body2" fontWeight={600}>
              {inv.invoice_number}
            </Typography>
          </Cell>
          <Cell>{inv.client_org.name}</Cell>
          <Cell>{formatCurrency(inv.amount)}</Cell>
          <Cell>
            <StatusChip status={inv.status} />
            {inv.afa_required && (
              <Tooltip title="RBI Additional Factor of Authentication required for this debit (amount above ₹15,000)">
                <Chip size="small" label="AFA" variant="outlined" sx={{ ml: 0.5 }} />
              </Tooltip>
            )}
          </Cell>
          <Cell>{formatDate(inv.due_date)}</Cell>
          <Cell sx={{ textTransform: 'capitalize' }}>{inv.gateway}</Cell>
          <Cell>
            {inv.platform_gstin || inv.client_org_gstin ? (
              <Tooltip
                title={
                  <Box>
                    {inv.platform_gstin && <div>Platform GSTIN: {inv.platform_gstin}</div>}
                    {inv.client_org_gstin && <div>Tenant GSTIN: {inv.client_org_gstin}</div>}
                    {inv.gst_rate != null && <div>Rate: {inv.gst_rate}%</div>}
                  </Box>
                }
              >
                <Chip size="small" label="GST" variant="outlined" sx={{ bgcolor: alpha(theme.palette.info.main, 0.08) }} />
              </Tooltip>
            ) : (
              <Typography variant="body2" color="text.disabled">
                —
              </Typography>
            )}
          </Cell>
          <Cell>
            {inv.status === 'failed' && (
              <Tooltip title="Record a manual retry attempt">
                <Button size="small" startIcon={<ReplayIcon />} onClick={() => onRetry(inv.id)}>
                  Retry
                </Button>
              </Tooltip>
            )}
          </Cell>
        </Row>
      ))}
    </DataTable>
  )
}
