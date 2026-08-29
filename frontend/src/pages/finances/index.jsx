import { useState, useMemo, useEffect } from 'react'
import { useApolloClient, gql, useQuery, useMutation } from '@apollo/client'
import { useTheme, useMediaQuery } from '@mui/material'
import { alpha } from '@mui/material/styles'
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableContainer,
  Tabs,
  Tab,
  Button,
  Paper,
  Avatar,
  IconButton,
  Tooltip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Drawer,
  MenuItem,
  TextField,
  Alert,
  Collapse,
  Skeleton,
} from '@mui/material'
import { Helmet } from 'react-helmet-async'
import { useSnackbar } from 'notistack'
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded'
import TrendingDownRoundedIcon from '@mui/icons-material/TrendingDownRounded'
import AddCardRoundedIcon from '@mui/icons-material/AddCardRounded'
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded'
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded'
import FileDownloadRoundedIcon from '@mui/icons-material/FileDownloadRounded'
import BarChartRoundedIcon from '@mui/icons-material/BarChartRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import PrintRoundedIcon from '@mui/icons-material/PrintRounded'
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded'
import PointOfSaleRoundedIcon from '@mui/icons-material/PointOfSaleRounded'
import CheckRoundedIcon from '@mui/icons-material/CheckRounded'
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded'
import KeyboardArrowRightRoundedIcon from '@mui/icons-material/KeyboardArrowRightRounded'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, Legend, ResponsiveContainer } from 'recharts'

// REQ056 (US-BIL-03/US-BIL-04) — page-local gql consts, matching this
// file's own established convention (GET_FINANCE_TRANSACTIONS above is
// already defined inline, not imported from a shared file).
const DISCOUNT_APPROVAL_REQUESTS_QUERY = gql`
  query DiscountApprovalRequests($clinic_id: ID) {
    discountApprovalRequests(clinic_id: $clinic_id) {
      id
      appointment_id
      clinic_id
      discount_amount
      discount_reason
      expected_amount
      status
      created_at
    }
  }
`

const DECIDE_DISCOUNT_APPROVAL_MUTATION = gql`
  mutation DecideDiscountApproval($input: DecideDiscountApprovalInput!) {
    decideDiscountApproval(input: $input) {
      success
      message
      payment_id
    }
  }
`

const CASH_DRAWER_CLOSEOUTS_QUERY = gql`
  query CashDrawerCloseouts($clinic_id: ID) {
    cashDrawerCloseouts(clinic_id: $clinic_id) {
      id
      clinic_id
      business_date
      total_expected
      total_counted
      variance
      closed_by_user_id
      created_at
      breakdown {
        tender_type
        expected
        counted
        variance
      }
    }
  }
`

// Theme-derived tone helper -- see calendar/index.jsx and
// clinician/Calendar.jsx for the same conversion, applied here to two
// page-local (not appointment) status maps.
function toneFor(theme, main, dark) {
  const isDark = theme.palette.mode === 'dark'
  return {
    bg: alpha(main, isDark ? 0.18 : 0.12),
    color: isDark ? main : dark,
    border: alpha(main, isDark ? 0.4 : 0.3),
  }
}

function discountStatusCfgFor(theme, status) {
  const p = theme.palette
  const cfg = {
    pending: { ...toneFor(theme, p.warning.main, p.warning.dark), label: 'Pending' },
    approved: { ...toneFor(theme, p.success.main, p.success.dark), label: 'Approved' },
    rejected: { ...toneFor(theme, p.error.main, p.error.dark), label: 'Rejected' },
  }
  return cfg[status] ?? cfg.pending
}

// ─── REQ004 slice 2 — real GraphQL (backend/src/appointment-payments) ─────────
// Income (real captured/attempted Razorpay payments) only — expense-row
// tracking has no schema anywhere in this project yet (still-open question,
// see context/open-questions.md). Payment Methods (saved cards) is REQ004's
// own explicit exclusion (PCI-scope tokenization, a distinct feature).
const GET_FINANCE_TRANSACTIONS = gql`
  query GetFinanceTransactions($startDate: String!, $endDate: String!) {
    myFinanceTransactions(startDate: $startDate, endDate: $endDate) {
      id
      created_at
      amount
      status
      patient_name
      product_name
      method
    }
    myFinanceSummary(startDate: $startDate, endDate: $endDate) {
      revenue_this_month
      pending_count
      pending_amount
      succeeded_count
      failed_count
      monthly {
        month
        revenue
      }
    }
  }
`

// Date range → how many days back to query (mirrors analytics page's SUG-AF-008 pattern)
const DATE_RANGE_DAYS = {
  last1month: 30,
  last3months: 90,
  last7months: 210,
  this_year: 365,
}

// Real AppointmentPayments statuses only — no 'overdue' (a checkout-time
// capture has no due-date/invoice concept) and no 'refunded' (no refund
// flow built yet — a distinct feature from capture, REQ004's own scope cut).
function paymentStatusCfgFor(theme, status) {
  const p = theme.palette
  const cfg = {
    succeeded: { ...toneFor(theme, p.success.main, p.success.dark), accent: p.success.main, label: 'Succeeded' },
    pending: { ...toneFor(theme, p.warning.main, p.warning.dark), accent: p.warning.main, label: 'Pending' },
    failed: { ...toneFor(theme, p.error.main, p.error.dark), accent: p.error.main, label: 'Failed' },
  }
  return cfg[status] ?? cfg.pending
}

// ─── Balance KPI Card ─────────────────────────────────────────────────────────
function BalanceCard({ icon: Icon, label, value, prefix, color, trend, action }) {
  const theme = useTheme()
  const up = trend >= 0
  return (
    <Card sx={{ borderRadius: 3, height: '100%', border: '1px solid', borderColor: 'divider', boxShadow: 1 }}>
      <CardContent sx={{ p: '20px !important' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: alpha(color, 0.1),
              border: `1.5px solid ${alpha(color, 0.2)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon sx={{ color, fontSize: '1.3rem' }} />
          </Box>
          {trend !== undefined && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.4,
                px: 1,
                py: 0.4,
                borderRadius: 2,
                bgcolor: alpha(up ? theme.palette.success.main : theme.palette.error.main, 0.12),
                border: `1px solid ${alpha(up ? theme.palette.success.main : theme.palette.error.main, 0.3)}`,
              }}
            >
              {up ? (
                <TrendingUpRoundedIcon sx={{ color: 'success.main', fontSize: 13 }} />
              ) : (
                <TrendingDownRoundedIcon sx={{ color: 'error.main', fontSize: 13 }} />
              )}
              <Typography sx={{ color: up ? 'success.main' : 'error.main', fontWeight: 700, fontSize: '0.7rem', lineHeight: 1 }}>
                {Math.abs(trend)}%
              </Typography>
            </Box>
          )}
        </Box>
        <Typography sx={{ color, fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
          {prefix}
          {value.toLocaleString()}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5, fontWeight: 500, fontSize: '0.8rem' }}>
          {label}
        </Typography>
        {action && (
          <Button
            size="small"
            variant="outlined"
            onClick={action.fn}
            sx={{
              mt: 1.5,
              borderRadius: 2,
              fontWeight: 700,
              fontSize: '0.75rem',
              borderColor: color,
              color,
              '&:hover': { bgcolor: `${color}10` },
            }}
          >
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// ─── SUG-AF-007: Invoice Detail Drawer ────────────────────────────────────────
function InvoiceDrawer({ tx, open, onClose }) {
  const theme = useTheme()
  if (!tx) return null
  const sCfg = paymentStatusCfgFor(theme, tx.status)
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100vw', sm: 420 },
          borderRadius: { xs: 0, sm: '16px 0 0 16px' },
          boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
        },
      }}
    >
      {/* Drawer Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2.5, borderBottom: '1px solid', borderBottomColor: 'divider' }}>
        <Box>
          <Typography fontWeight={800} sx={{ color: 'text.primary' }}>
            Receipt Details
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
            {tx.id}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            aria-label="Print receipt"
            size="small"
            onClick={() => window.print()}
            sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: (t) => alpha(t.palette.primary.main, 0.08) } }}
          >
            <PrintRoundedIcon fontSize="small" />
          </IconButton>
          <IconButton
            aria-label="Close drawer"
            size="small"
            onClick={onClose}
            sx={{ color: 'text.secondary', '&:hover': { color: 'error.main', bgcolor: (t) => alpha(t.palette.error.main, 0.08) } }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Patient Info */}
      <Box sx={{ p: 2.5, borderBottom: '1px solid', borderBottomColor: 'divider' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ width: 48, height: 48, bgcolor: (t) => alpha(t.palette.primary.main, 0.12), color: 'primary.main', fontWeight: 700, fontSize: '0.85rem' }}>
            {tx.patient_name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)}
          </Avatar>
          <Box>
            <Typography fontWeight={700} sx={{ color: 'text.primary' }}>
              {tx.patient_name}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {tx.product_name ?? '—'}
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Details Grid */}
      <Box sx={{ p: 2.5 }}>
        {[
          { label: 'Transaction ID', value: tx.id },
          { label: 'Service', value: tx.product_name ?? '—' },
          {
            label: 'Date',
            value: new Date(tx.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
          },
          { label: 'Payment Method', value: tx.method },
        ].map(({ label, value }) => (
          <Box
            key={label}
            sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.25, borderBottom: '1px solid', borderBottomColor: 'divider' }}
          >
            <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              {label}
            </Typography>
            <Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary' }}>
              {value}
            </Typography>
          </Box>
        ))}

        {/* Amount highlight */}
        <Box sx={{ py: 1.75, borderBottom: '1px solid', borderBottomColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            Amount
          </Typography>
          <Typography fontWeight={800} sx={{ fontSize: '1.2rem', color: 'success.dark' }}>
            ₹{tx.amount.toLocaleString()}
          </Typography>
        </Box>

        {/* Status */}
        <Box sx={{ py: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            Status
          </Typography>
          <Chip
            label={sCfg.label}
            size="small"
            sx={{
              bgcolor: sCfg.bg,
              color: sCfg.color,
              border: `1px solid ${sCfg.border}`,
              borderLeft: `3px solid ${sCfg.accent}`,
              fontWeight: 700,
              borderRadius: '8px',
              height: 24,
            }}
          />
        </Box>

        {/* Actions */}
        <Stack spacing={1.5} mt={3}>
          <Tooltip title="PDF receipt generation isn't built yet">
            <span>
              <Button fullWidth variant="contained" disabled sx={{ borderRadius: 2, fontWeight: 700 }}>
                Download Receipt (PDF)
              </Button>
            </span>
          </Tooltip>
          <Button
            fullWidth
            variant="outlined"
            onClick={onClose}
            sx={{ borderRadius: 2, fontWeight: 700, borderColor: 'divider', color: 'text.secondary' }}
          >
            Close
          </Button>
        </Stack>
      </Box>
    </Drawer>
  )
}

// ─── FinancesPage ─────────────────────────────────────────────────────────────
export default function FinancesPage() {
  const { enqueueSnackbar } = useSnackbar()
  const client = useApolloClient()
  const [tab, setTab] = useState(0)
  const [statusFilter, setStatusFilter] = useState('all') // succeeded / pending / failed / all

  // FIX NEW-AF-003 + SUG-AF-008: Date range for Revenue Chart tab (shared via localStorage)
  const [revenueRange, setRevenueRange] = useState(() => {
    try {
      return localStorage.getItem('medibook_dateRange') || 'last7months'
    } catch {
      return 'last7months'
    }
  })

  // SUG-AF-007: Invoice detail drawer state
  const [drawerTx, setDrawerTx] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // REQ056 (US-BIL-03/04) — expanded cash-drawer breakdown row
  const [expandedCloseout, setExpandedCloseout] = useState(null)

  // Real data (backend/src/appointment-payments) — replaces TRANSACTIONS/
  // ALL_MONTHLY_REVENUE. Re-fetched whenever the date range changes since
  // the range drives both the transaction list and the summary's monthly chart.
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState(null)
  const [loadError, setLoadError] = useState(null)

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  const rangeDays = DATE_RANGE_DAYS[revenueRange] ?? 210
  useEffect(() => {
    const endDate = new Date()
    const startDate = new Date(endDate.getTime() - rangeDays * 24 * 60 * 60 * 1000)
    client
      .query({
        query: GET_FINANCE_TRANSACTIONS,
        variables: { startDate: startDate.toISOString(), endDate: endDate.toISOString() },
        fetchPolicy: 'network-only',
      })
      .then(({ data }) => {
        setTransactions(data?.myFinanceTransactions ?? [])
        setSummary(data?.myFinanceSummary ?? null)
      })
      .catch((err) => setLoadError(err.message))
  }, [client, rangeDays])

  // REQ056 (US-BIL-03/04) — org-wide oversight, no clinic_id filter, only
  // fetched once the relevant tab is actually opened.
  const {
    data: discountData,
    loading: discountLoading,
    refetch: refetchDiscountRequests,
  } = useQuery(DISCOUNT_APPROVAL_REQUESTS_QUERY, {
    skip: tab !== 3,
    fetchPolicy: 'network-only',
  })
  const [decideDiscountApproval, { loading: decidingDiscount }] = useMutation(DECIDE_DISCOUNT_APPROVAL_MUTATION, {
    onCompleted: (d) => {
      if (!d?.decideDiscountApproval?.success) {
        enqueueSnackbar(d?.decideDiscountApproval?.message ?? 'Failed to decide discount request', { variant: 'error' })
        return
      }
      enqueueSnackbar('Discount request updated', { variant: 'success' })
      refetchDiscountRequests()
    },
    onError: (err) =>
      enqueueSnackbar(err?.graphQLErrors?.[0]?.message || err.message || 'Failed to decide discount request', { variant: 'error' }),
  })

  const { data: closeoutData, loading: closeoutLoading } = useQuery(CASH_DRAWER_CLOSEOUTS_QUERY, {
    skip: tab !== 4,
    fetchPolicy: 'network-only',
  })

  // Only a status filter now — no income/expense type filter (income only, see above)
  const filtered = useMemo(() => {
    if (statusFilter === 'all') return transactions
    return transactions.filter((t) => t.status === statusFilter)
  }, [transactions, statusFilter])

  // No "Total Expenses"/"Net Profit" here — no expense tracking exists yet
  // (context/open-questions.md), and showing a profit figure equal to gross
  // revenue would misleadingly imply a real profit calculation happened.
  const totalRevenue = summary?.monthly.reduce((s, r) => s + r.revenue, 0) ?? 0

  const handleRevenueRangeChange = (newRange) => {
    setRevenueRange(newRange)
    // SUG-AF-008: persist so Analytics page can read it
    try {
      localStorage.setItem('medibook_dateRange', newRange)
    } catch {
      /* ignore */
    }
  }

  const handleExport = () => {
    try {
      const rows = [
        ['ID', 'Patient', 'Service', 'Date', 'Amount', 'Method', 'Status'],
        ...filtered.map((t) => [t.id, t.patient_name, t.product_name ?? '', t.created_at, t.amount, t.method, t.status]),
      ]
      const csv = rows.map((r) => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `finances_report_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      enqueueSnackbar(`Report downloaded (${filtered.length} transactions)`, { variant: 'success' })
    } catch {
      enqueueSnackbar('Export failed — please try again.', { variant: 'error' })
    }
  }

  const openDrawer = (tx) => {
    setDrawerTx(tx)
    setDrawerOpen(true)
  }

  return (
    <Box className="page-enter" sx={{ pb: 4 }}>
      <Helmet>
        <title>Finances — MediBook</title>
      </Helmet>

      {/* SUG-AF-007: Invoice drawer */}
      <InvoiceDrawer tx={drawerTx} open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 1.5, sm: 0 },
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ color: 'text.primary' }}>
            Finances
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Real patient payments, captured via Razorpay
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<FileDownloadRoundedIcon />}
          onClick={handleExport}
          aria-label="Export transactions as CSV"
          sx={{
            borderRadius: 2,
            fontWeight: 700,
            background: (t) => `linear-gradient(135deg, ${t.palette.primary.light} 0%, ${t.palette.primary.main} 100%)`,
            width: { xs: '100%', sm: 'auto' },
            '&:hover': { boxShadow: (t) => `0 4px 14px ${alpha(t.palette.primary.main, 0.35)}` },
          }}
        >
          Export Report
        </Button>
      </Box>

      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLoadError(null)}>
          {loadError}
        </Alert>
      )}

      {/* KPI Cards — all real, computed from AppointmentPayments. No "Active
          Balance"/"Bonus Credits" (a patient wallet/credit-balance concept
          REQ004 explicitly scoped out — no schema, no memberships to back it). */}
      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <BalanceCard
            icon={TrendingUpRoundedIcon}
            label="Revenue This Month"
            value={summary?.revenue_this_month ?? 0}
            prefix="₹"
            color={theme.palette.success.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <BalanceCard
            icon={AccountBalanceWalletRoundedIcon}
            label={`Pending (${summary?.pending_count ?? 0})`}
            value={summary?.pending_amount ?? 0}
            prefix="₹"
            color={theme.palette.warning.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <BalanceCard
            icon={ReceiptLongRoundedIcon}
            label="Succeeded Payments"
            value={summary?.succeeded_count ?? 0}
            prefix=""
            color={theme.palette.primary.main}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <BalanceCard
            icon={TrendingDownRoundedIcon}
            label="Failed Payments"
            value={summary?.failed_count ?? 0}
            prefix=""
            color={theme.palette.error.main}
          />
        </Grid>
      </Grid>

      {/* Main content tabs */}
      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons={isMobile ? 'auto' : false}
          aria-label="Finances sections"
          sx={{
            px: 2,
            borderBottom: '1px solid', borderBottomColor: 'divider',
            '& .MuiTab-root': { color: 'text.secondary', fontWeight: 600 },
            '& .MuiTab-root.Mui-selected': { color: 'primary.main', fontWeight: 700 },
            '& .MuiTabs-indicator': { bgcolor: 'primary.main', height: 3, borderRadius: '3px 3px 0 0' },
          }}
        >
          <Tab
            label="Payment History"
            icon={<ReceiptLongRoundedIcon sx={{ fontSize: '1rem' }} />}
            iconPosition="start"
            sx={{ minHeight: 52, fontSize: '0.875rem', fontWeight: 600, gap: 0.5 }}
          />
          <Tab
            label="Revenue Chart"
            icon={<BarChartRoundedIcon sx={{ fontSize: '1rem' }} />}
            iconPosition="start"
            sx={{ minHeight: 52, fontSize: '0.875rem', fontWeight: 600, gap: 0.5 }}
          />
          <Tab
            label="Payment Methods"
            icon={<AddCardRoundedIcon sx={{ fontSize: '1rem' }} />}
            iconPosition="start"
            sx={{ minHeight: 52, fontSize: '0.875rem', fontWeight: 600, gap: 0.5 }}
          />
          {/* REQ056 (US-BIL-03/04) */}
          <Tab
            label="Discount Approvals"
            icon={<LocalOfferRoundedIcon sx={{ fontSize: '1rem' }} />}
            iconPosition="start"
            sx={{ minHeight: 52, fontSize: '0.875rem', fontWeight: 600, gap: 0.5 }}
          />
          <Tab
            label="Cash Drawer"
            icon={<PointOfSaleRoundedIcon sx={{ fontSize: '1rem' }} />}
            iconPosition="start"
            sx={{ minHeight: 52, fontSize: '0.875rem', fontWeight: 600, gap: 0.5 }}
          />
        </Tabs>

        {/* Tab 0: Payment History */}
        {tab === 0 && (
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {/* Real patient payments only — expense tracking isn't built yet
                (context/open-questions.md), so there's no income/expense
                type filter here anymore, just the real payment statuses. */}
            <Alert severity="info" sx={{ mb: 2 }}>
              Showing real patient payments only. Clinic expense tracking isn't built yet.
            </Alert>

            <Stack direction="row" spacing={1} mb={2.5} flexWrap="wrap" alignItems="center">
              <Typography variant="caption" fontWeight={700} sx={{ color: 'text.secondary', mr: 0.5 }}>
                Status:
              </Typography>
              <ToggleButtonGroup
                value={statusFilter}
                exclusive
                onChange={(_, v) => {
                  if (v) setStatusFilter(v)
                }}
                size="small"
                aria-label="Filter by status"
                sx={{
                  '& .MuiToggleButton-root': {
                    borderRadius: '8px !important',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    px: 1.5,
                    py: 0.5,
                    textTransform: 'capitalize',
                    border: '1.5px solid #E8EAED',
                  },
                }}
              >
                <ToggleButton value="all" sx={{ '&.Mui-selected': { bgcolor: (t) => alpha(t.palette.primary.main, 0.12), color: 'primary.main', borderColor: 'primary.main' } }}>
                  All
                </ToggleButton>
                <ToggleButton value="succeeded" sx={{ '&.Mui-selected': { bgcolor: (t) => alpha(t.palette.success.main, 0.12), color: 'success.dark', borderColor: 'success.main' } }}>
                  Succeeded
                </ToggleButton>
                <ToggleButton value="pending" sx={{ '&.Mui-selected': { bgcolor: (t) => alpha(t.palette.warning.main, 0.12), color: 'warning.dark', borderColor: 'warning.main' } }}>
                  Pending
                </ToggleButton>
                <ToggleButton value="failed" sx={{ '&.Mui-selected': { bgcolor: (t) => alpha(t.palette.error.main, 0.12), color: 'error.dark', borderColor: 'error.main' } }}>
                  Failed
                </ToggleButton>
              </ToggleButtonGroup>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
              </Typography>
            </Stack>

            {/* Transactions Table */}
            <TableContainer sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    {['#', 'Patient / Description', 'Service', 'Date', 'Amount', 'Method', 'Status', ''].map((h) => (
                      <TableCell key={h}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                        No transactions matching the selected filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((tx) => {
                      const sCfg = paymentStatusCfgFor(theme, tx.status)
                      return (
                        <TableRow key={tx.id} sx={{ '&:hover': { bgcolor: 'action.hover' }, transition: 'background 0.15s' }}>
                          <TableCell>
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, fontFamily: 'monospace' }}>
                              {tx.id.slice(0, 8)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar
                                sx={{ width: 30, height: 30, bgcolor: (t) => alpha(t.palette.primary.main, 0.12), color: 'primary.main', fontSize: '0.65rem', fontWeight: 700 }}
                              >
                                {tx.patient_name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .slice(0, 2)}
                              </Avatar>
                              <Typography variant="body2" fontWeight={600} sx={{ color: 'text.primary' }}>
                                {tx.patient_name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                              {tx.product_name ?? '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                              {new Date(tx.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography fontWeight={800} sx={{ color: 'success.dark', fontSize: '0.9rem' }}>
                              ₹{tx.amount.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={tx.method}
                              size="small"
                              sx={{ bgcolor: 'action.hover', color: 'text.secondary', fontWeight: 600, borderRadius: 8 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={sCfg.label}
                              size="small"
                              sx={{
                                bgcolor: sCfg.bg,
                                color: sCfg.color,
                                border: `1px solid ${sCfg.border}`,
                                borderLeft: `3px solid ${sCfg.accent}`,
                                fontWeight: 700,
                                borderRadius: '8px',
                                height: 24,
                                textTransform: 'capitalize',
                              }}
                            />
                          </TableCell>
                          {/* SUG-AF-007: Opens invoice detail drawer */}
                          <TableCell>
                            <Tooltip title="View Receipt">
                              <IconButton
                                size="small"
                                aria-label={`View receipt for ${tx.id}`}
                                onClick={() => openDrawer(tx)}
                                sx={{ color: 'text.disabled', '&:hover': { color: 'primary.main', bgcolor: (t) => alpha(t.palette.primary.main, 0.08) } }}
                              >
                                <ReceiptLongRoundedIcon sx={{ fontSize: '0.95rem' }} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Tab 1: Revenue Chart — SUG-AF-005 + FIX NEW-AF-003 + SUG-AF-008 */}
        {tab === 1 && (
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {/* FIX NEW-AF-003: Date range selector on Revenue Chart tab */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                mb: 2.5,
                flexDirection: { xs: 'column', sm: 'row' },
                gap: 1.5,
              }}
            >
              <Box>
                <Typography fontWeight={800} sx={{ color: 'text.primary', mb: 0.5 }}>
                  Monthly Revenue
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Real captured Razorpay payments, by month
                </Typography>
              </Box>
              <TextField
                select
                size="small"
                value={revenueRange}
                onChange={(e) => handleRevenueRangeChange(e.target.value)}
                inputProps={{ 'aria-label': 'Revenue chart date range' }}
                sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: 2 }, flexShrink: 0 }}
              >
                {[
                  ['last1month', 'Last 1 Month'],
                  ['last3months', 'Last 3 Months'],
                  ['last7months', 'Last 7 Months'],
                  ['this_year', 'This Year'],
                ].map(([v, l]) => (
                  <MenuItem key={v} value={v}>
                    {l}
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            {/* Summary row — updates with date range. No "Total Expenses"/
                "Net Profit" — no expense tracking exists yet (see the info
                banner on the Payment History tab). */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
              <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', flex: 1 }}>
                <Typography variant="body2" fontWeight={600} sx={{ color: 'text.secondary', mb: 0.5 }}>
                  Total Revenue (selected range)
                </Typography>
                <Typography variant="h5" fontWeight={800} sx={{ color: 'success.main' }}>
                  ₹{totalRevenue.toLocaleString()}
                </Typography>
              </Paper>
            </Stack>

            {summary?.monthly.length === 0 ? (
              <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>No succeeded payments in this range yet.</Box>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={summary?.monthly ?? []} margin={{ top: 4, right: 8, left: -10, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: theme.palette.text.disabled }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: theme.palette.text.disabled }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <ReTooltip
                    formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                    contentStyle={{ borderRadius: 8, border: `1px solid ${theme.palette.divider}`, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', background: theme.palette.background.paper, color: theme.palette.text.primary }}
                  />
                  <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12, fontWeight: 700 }} />
                  <Bar dataKey="revenue" fill={theme.palette.primary.main} radius={[6, 6, 0, 0]} name="Revenue" />
                </BarChart>
              </ResponsiveContainer>
            )}

            <Divider sx={{ my: 3 }} />
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              This is real captured payment revenue, distinct from the appointment-value "revenue" shown on the{' '}
              <a href="/analytics" style={{ color: theme.palette.primary.main, fontWeight: 700 }}>
                Analytics page
              </a>{' '}
              (billable value of completed appointments, whether or not payment was ever collected).
            </Typography>
          </Box>
        )}

        {/* Tab 2: Payment Methods — REQ004's own explicit scope cut. Saved-card
            tokenization is a distinct, higher-compliance (PCI scope) feature
            from the base Razorpay capture flow this session built; not
            silently left looking functional (Hard Rule 8). */}
        {tab === 2 && (
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Alert severity="info">
              Saved payment methods aren't built yet — MediBook uses Razorpay's own Checkout for every payment, which doesn't require or
              store a card on file. Card tokenization for repeat/saved payments is a separate, PCI-scoped feature.
            </Alert>
          </Box>
        )}

        {/* Tab 3: Discount Approvals — REQ056 (US-BIL-03) */}
        {tab === 3 && (
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography fontWeight={800} sx={{ color: 'text.primary', mb: 0.5 }}>
              Discount Approvals
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
              A counter-payment discount above the org's configured threshold is queued here until a manager decides it.
            </Typography>
            {discountLoading ? (
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            ) : (
              <TableContainer sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'auto' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      {['Appointment', 'Discount', 'Reason', 'Expected Amount', 'Status', 'Requested At', ''].map((h) => (
                        <TableCell key={h}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(discountData?.discountApprovalRequests ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                          No discount requests yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      discountData.discountApprovalRequests.map((req) => {
                        const sCfg = discountStatusCfgFor(theme, req.status)
                        return (
                          <TableRow key={req.id} sx={{ '&:hover': { bgcolor: 'action.hover' }, transition: 'background 0.15s' }}>
                            <TableCell>
                              <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, fontFamily: 'monospace' }}>
                                {req.appointment_id.slice(0, 8)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography fontWeight={800} sx={{ color: 'success.dark', fontSize: '0.9rem' }}>
                                ₹{req.discount_amount.toLocaleString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                {req.discount_reason}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                ₹{req.expected_amount.toLocaleString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={sCfg.label}
                                size="small"
                                sx={{
                                  bgcolor: sCfg.bg,
                                  color: sCfg.color,
                                  border: `1px solid ${sCfg.border}`,
                                  fontWeight: 700,
                                  borderRadius: '8px',
                                  height: 24,
                                }}
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                                {new Date(req.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {req.status === 'pending' && (
                                <Stack direction="row" spacing={0.5}>
                                  <Tooltip title="Approve">
                                    <span>
                                      <IconButton
                                        size="small"
                                        aria-label="Approve"
                                        disabled={decidingDiscount}
                                        onClick={() =>
                                          decideDiscountApproval({ variables: { input: { request_id: req.id, decision: 'approve' } } })
                                        }
                                        sx={{ color: 'success.main', '&:hover': { bgcolor: (t) => alpha(t.palette.success.main, 0.12) } }}
                                      >
                                        <CheckRoundedIcon fontSize="small" />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                  <Tooltip title="Reject">
                                    <span>
                                      <IconButton
                                        size="small"
                                        aria-label="Reject"
                                        disabled={decidingDiscount}
                                        onClick={() =>
                                          decideDiscountApproval({ variables: { input: { request_id: req.id, decision: 'reject' } } })
                                        }
                                        sx={{ color: 'error.main', '&:hover': { bgcolor: (t) => alpha(t.palette.error.main, 0.12) } }}
                                      >
                                        <CloseRoundedIcon fontSize="small" />
                                      </IconButton>
                                    </span>
                                  </Tooltip>
                                </Stack>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}

        {/* Tab 4: Cash Drawer — REQ056 (US-BIL-04, scoped subset) */}
        {tab === 4 && (
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography fontWeight={800} sx={{ color: 'text.primary', mb: 0.5 }}>
              Cash Drawer Closeouts
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
              Expected totals are computed server-side from real succeeded payments; only the counted (physical) totals come from staff.
            </Typography>
            {closeoutLoading ? (
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            ) : (
              <TableContainer sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', overflow: 'auto' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      {['', 'Business Date', 'Total Expected', 'Total Counted', 'Variance', 'Closed At'].map((h) => (
                        <TableCell key={h}>{h}</TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(closeoutData?.cashDrawerCloseouts ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                          No cash drawer closeouts recorded yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      closeoutData.cashDrawerCloseouts.map((c) => {
                        const isExpanded = expandedCloseout === c.id
                        const reconciled = Math.abs(c.variance) <= 0.005
                        return (
                          <>
                            <TableRow key={c.id} sx={{ '&:hover': { bgcolor: 'action.hover' }, transition: 'background 0.15s' }}>
                              <TableCell>
                                <IconButton size="small" onClick={() => setExpandedCloseout(isExpanded ? null : c.id)}>
                                  {isExpanded ? (
                                    <KeyboardArrowDownRoundedIcon fontSize="small" />
                                  ) : (
                                    <KeyboardArrowRightRoundedIcon fontSize="small" />
                                  )}
                                </IconButton>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                  {new Date(c.business_date).toLocaleDateString('en-IN', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary' }}>
                                  ₹{c.total_expected.toLocaleString()}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={700} sx={{ color: 'text.primary' }}>
                                  ₹{c.total_counted.toLocaleString()}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" fontWeight={800} sx={{ color: reconciled ? 'success.dark' : 'error.dark' }}>
                                  {c.variance > 0 ? '+' : ''}₹{c.variance.toLocaleString()}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                                  {new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </Typography>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell colSpan={6} sx={{ p: 0, border: isExpanded ? undefined : 'none' }}>
                                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                  <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow>
                                          {['Tender Type', 'Expected', 'Counted', 'Variance'].map((h) => (
                                            <TableCell key={h}>{h}</TableCell>
                                          ))}
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {c.breakdown.map((b) => (
                                          <TableRow key={b.tender_type}>
                                            <TableCell sx={{ textTransform: 'capitalize' }}>{b.tender_type}</TableCell>
                                            <TableCell>₹{b.expected.toLocaleString()}</TableCell>
                                            <TableCell>₹{b.counted.toLocaleString()}</TableCell>
                                            <TableCell
                                              sx={{ color: Math.abs(b.variance) > 0.005 ? 'error.dark' : 'success.dark', fontWeight: 700 }}
                                            >
                                              {b.variance > 0 ? '+' : ''}₹{b.variance.toLocaleString()}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          </>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </Card>
    </Box>
  )
}
