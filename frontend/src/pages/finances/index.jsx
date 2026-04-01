import { useState, useMemo } from 'react'
import { useTheme, useMediaQuery } from '@mui/material'
import {
  Box, Typography, Card, CardContent, Grid, Chip, Divider,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Tabs, Tab, Button, Paper, Avatar, IconButton, Tooltip, Stack,
  ToggleButton, ToggleButtonGroup, Drawer, MenuItem, TextField,
} from '@mui/material'
import { Helmet } from 'react-helmet-async'
import { useSnackbar } from 'notistack'
import TrendingUpRoundedIcon             from '@mui/icons-material/TrendingUpRounded'
import TrendingDownRoundedIcon           from '@mui/icons-material/TrendingDownRounded'
import AddCardRoundedIcon                from '@mui/icons-material/AddCardRounded'
import ReceiptLongRoundedIcon            from '@mui/icons-material/ReceiptLongRounded'
import AccountBalanceWalletRoundedIcon   from '@mui/icons-material/AccountBalanceWalletRounded'
import CardGiftcardRoundedIcon           from '@mui/icons-material/CardGiftcardRounded'
import FileDownloadRoundedIcon           from '@mui/icons-material/FileDownloadRounded'
import DeleteOutlineRoundedIcon          from '@mui/icons-material/DeleteOutlineRounded'
import BarChartRoundedIcon               from '@mui/icons-material/BarChartRounded'
import CloseRoundedIcon                  from '@mui/icons-material/CloseRounded'
import PrintRoundedIcon                  from '@mui/icons-material/PrintRounded'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip,
  Legend, ResponsiveContainer,
} from 'recharts'

// ─── Mock Data ────────────────────────────────────────────────────────────────
// BUG-AF-005: added 'overdue' status to TRANSACTIONS
const TRANSACTIONS = [
  { id: 'TXN-001', patient: 'John Doe',       service: 'Consultation',   date: '13 Mar 2026', type: 'income',  amount: 120,  method: 'Credit Card',  status: 'paid'    },
  { id: 'TXN-002', patient: 'Sarah Miller',   service: 'Blood Test',     date: '12 Mar 2026', type: 'income',  amount: 85,   method: 'Cash',          status: 'paid'    },
  { id: 'TXN-003', patient: 'Office Supplies', service: 'Operating Cost', date: '12 Mar 2026', type: 'expense', amount: 350, method: 'Bank Transfer', status: 'paid'    },
  { id: 'TXN-004', patient: 'Emily Clark',    service: 'MRI Scan',       date: '11 Mar 2026', type: 'income',  amount: 450,  method: 'Insurance',     status: 'paid'    },
  { id: 'TXN-005', patient: 'Mark Johnson',   service: 'X-Ray',          date: '10 Mar 2026', type: 'income',  amount: 180,  method: 'Credit Card',   status: 'pending' },
  { id: 'TXN-006', patient: 'Equipment Lease', service: 'Monthly Lease', date: '10 Mar 2026', type: 'expense', amount: 1200, method: 'Bank Transfer', status: 'paid'    },
  { id: 'TXN-007', patient: 'James Wilson',   service: 'Physiotherapy',  date: '02 Feb 2026', type: 'income',  amount: 220,  method: 'Cash',          status: 'overdue' },
  { id: 'TXN-008', patient: 'Olivia Brown',   service: 'Follow-Up',      date: '28 Jan 2026', type: 'income',  amount: 95,   method: 'Credit Card',   status: 'overdue' },
  { id: 'TXN-009', patient: 'Ethan Park',     service: 'Lab Test',       date: '15 Mar 2026', type: 'income',  amount: 75,   method: 'Insurance',     status: 'pending' },
]

const CARDS = [
  { last4: '4521', brand: 'Visa',       expiry: '08/27', holder: 'Admin User', isDefault: true  },
  { last4: '7832', brand: 'Mastercard', expiry: '03/26', holder: 'Admin User', isDefault: false },
]

// FIX NEW-AF-003: Full 7-month revenue data for date range slicing
const ALL_MONTHLY_REVENUE = [
  { month: 'Sep', revenue: 18400, expenses: 7200 },
  { month: 'Oct', revenue: 21200, expenses: 8100 },
  { month: 'Nov', revenue: 19900, expenses: 7800 },
  { month: 'Dec', revenue: 15600, expenses: 6500 },
  { month: 'Jan', revenue: 23100, expenses: 8900 },
  { month: 'Feb', revenue: 25400, expenses: 9400 },
  { month: 'Mar', revenue: 27800, expenses: 10100 },
]

// Date range → months to slice (mirrors analytics page for SUG-AF-008)
const DATE_RANGE_MONTHS = {
  last1month:  1,
  last3months: 3,
  last7months: 7,
  this_year:   7,
}

// Status display config including overdue
const STATUS_CFG = {
  paid:    { bg: '#E6F4EA', color: '#137333', border: '#CEEAD6', accent: '#0F9D58', label: 'Paid'    },
  pending: { bg: '#FEF7E0', color: '#8A4700', border: '#FDD663', accent: '#F9AB00', label: 'Pending' },
  overdue: { bg: '#FCE8E6', color: '#A50E0E', border: '#F5C6C2', accent: '#D93025', label: 'Overdue' },
  refunded:{ bg: '#F3E8FD', color: '#6E2DB8', border: '#D7AEFA', accent: '#9334E6', label: 'Refunded'},
}

// ─── Balance KPI Card ─────────────────────────────────────────────────────────
function BalanceCard({ icon: Icon, label, value, prefix, color, trend, action }) {
  const up = trend >= 0
  return (
    <Card sx={{ borderRadius: 3, height: '100%', border: '1px solid #E8EAED', boxShadow: '0 1px 2px rgba(32,33,36,0.08)' }}>
      <CardContent sx={{ p: '20px !important' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2, bgcolor: `${color}1A`, border: `1.5px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon sx={{ color, fontSize: '1.3rem' }} />
          </Box>
          {trend !== undefined && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, px: 1, py: 0.4, borderRadius: 2, bgcolor: up ? '#E6F4EA' : '#FCE8E6', border: `1px solid ${up ? '#CEEAD6' : '#F5C6C2'}` }}>
              {up ? <TrendingUpRoundedIcon sx={{ color: '#137333', fontSize: 13 }} /> : <TrendingDownRoundedIcon sx={{ color: '#A50E0E', fontSize: 13 }} />}
              <Typography sx={{ color: up ? '#137333' : '#A50E0E', fontWeight: 700, fontSize: '0.7rem', lineHeight: 1 }}>{Math.abs(trend)}%</Typography>
            </Box>
          )}
        </Box>
        <Typography sx={{ color, fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.3px', lineHeight: 1.1 }}>{prefix}{value.toLocaleString()}</Typography>
        <Typography variant="body2" sx={{ color: '#5F6368', mt: 0.5, fontWeight: 500, fontSize: '0.8rem' }}>{label}</Typography>
        {action && (
          <Button size="small" variant="outlined" onClick={action.fn} sx={{ mt: 1.5, borderRadius: 2, fontWeight: 700, fontSize: '0.75rem', borderColor: color, color, '&:hover': { bgcolor: `${color}10` } }}>
            {action.label}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// ─── SUG-AF-007: Invoice Detail Drawer ────────────────────────────────────────
function InvoiceDrawer({ tx, open, onClose }) {
  if (!tx) return null
  const sCfg = STATUS_CFG[tx.status] ?? STATUS_CFG.pending
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2.5, borderBottom: '1px solid #E8EAED' }}>
        <Box>
          <Typography fontWeight={800} sx={{ color: '#202124' }}>Receipt Details</Typography>
          <Typography variant="caption" sx={{ color: '#5F6368', fontFamily: 'monospace' }}>{tx.id}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            aria-label="Print receipt"
            size="small"
            onClick={() => window.print()}
            sx={{ color: '#5F6368', '&:hover': { color: '#1565C7', bgcolor: '#EEF4FF' } }}
          >
            <PrintRoundedIcon fontSize="small" />
          </IconButton>
          <IconButton
            aria-label="Close drawer"
            size="small"
            onClick={onClose}
            sx={{ color: '#5F6368', '&:hover': { color: '#D93025', bgcolor: '#FCE8E6' } }}
          >
            <CloseRoundedIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      {/* Patient Info */}
      <Box sx={{ p: 2.5, borderBottom: '1px solid #F1F3F4' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar sx={{ width: 48, height: 48, bgcolor: '#EEF4FF', color: '#1565C7', fontWeight: 700, fontSize: '0.85rem' }}>
            {tx.patient.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </Avatar>
          <Box>
            <Typography fontWeight={700} sx={{ color: '#0D1B2E' }}>{tx.patient}</Typography>
            <Typography variant="caption" sx={{ color: '#7A96AE' }}>{tx.service}</Typography>
          </Box>
        </Stack>
      </Box>

      {/* Details Grid */}
      <Box sx={{ p: 2.5 }}>
        {[
          { label: 'Transaction ID', value: tx.id },
          { label: 'Service', value: tx.service },
          { label: 'Date', value: tx.date },
          { label: 'Payment Method', value: tx.method },
          { label: 'Type', value: tx.type.charAt(0).toUpperCase() + tx.type.slice(1) },
        ].map(({ label, value }) => (
          <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 1.25, borderBottom: '1px solid #F1F3F4' }}>
            <Typography variant="body2" sx={{ color: '#5F6368', fontWeight: 600 }}>{label}</Typography>
            <Typography variant="body2" fontWeight={700} sx={{ color: '#0D1B2E' }}>{value}</Typography>
          </Box>
        ))}

        {/* Amount highlight */}
        <Box sx={{ py: 1.75, borderBottom: '1px solid #F1F3F4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: '#5F6368', fontWeight: 600 }}>Amount</Typography>
          <Typography fontWeight={800} sx={{ fontSize: '1.2rem', color: tx.type === 'income' ? '#0B7B5C' : '#E53535' }}>
            {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
          </Typography>
        </Box>

        {/* Status */}
        <Box sx={{ py: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" sx={{ color: '#5F6368', fontWeight: 600 }}>Status</Typography>
          <Chip
            label={sCfg.label}
            size="small"
            sx={{
              bgcolor: sCfg.bg, color: sCfg.color,
              border: `1px solid ${sCfg.border}`,
              borderLeft: `3px solid ${sCfg.accent}`,
              fontWeight: 700, borderRadius: '8px', height: 24,
            }}
          />
        </Box>

        {/* Overdue notice */}
        {tx.status === 'overdue' && (
          <Paper elevation={0} sx={{ mt: 2, p: 2, borderRadius: 2, bgcolor: '#FCE8E6', border: '1px solid #F5C6C2' }}>
            <Typography variant="caption" fontWeight={700} sx={{ color: '#A50E0E', display: 'block', mb: 0.5 }}>⚠️ Overdue Payment</Typography>
            <Typography variant="caption" sx={{ color: '#D93025' }}>
              This payment is past due. Please follow up with the patient to resolve outstanding balance.
            </Typography>
          </Paper>
        )}

        {/* Actions */}
        <Stack spacing={1.5} mt={3}>
          <Button
            fullWidth variant="contained"
            onClick={() => {}}
            sx={{ borderRadius: 2, fontWeight: 700, background: 'linear-gradient(135deg, #4285F4 0%, #1A73E8 100%)', '&:hover': { boxShadow: '0 4px 14px rgba(26,115,232,0.35)' } }}
          >
            Download Receipt (PDF)
          </Button>
          <Button
            fullWidth variant="outlined"
            onClick={onClose}
            sx={{ borderRadius: 2, fontWeight: 700, borderColor: '#DADCE0', color: '#5F6368' }}
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
  const [tab, setTab]           = useState(0)
  const [txFilter, setTxFilter] = useState('all')        // income / expense / all
  const [statusFilter, setStatusFilter] = useState('all') // paid / pending / overdue / all

  // FIX NEW-AF-003 + SUG-AF-008: Date range for Revenue Chart tab (shared via localStorage)
  const [revenueRange, setRevenueRange] = useState(() => {
    try { return localStorage.getItem('medibook_dateRange') || 'last7months' } catch { return 'last7months' }
  })

  // SUG-AF-007: Invoice detail drawer state
  const [drawerTx, setDrawerTx] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const theme    = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))

  // Apply both filters: type filter AND status filter
  const filtered = useMemo(() => {
    let result = TRANSACTIONS
    if (txFilter !== 'all')     result = result.filter(t => t.type   === txFilter)
    if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter)
    return result
  }, [txFilter, statusFilter])

  // FIX NEW-AF-003: Revenue chart data sliced by selected range
  const revenueMonthCount = DATE_RANGE_MONTHS[revenueRange] ?? 7
  const MONTHLY_REVENUE   = ALL_MONTHLY_REVENUE.slice(-revenueMonthCount)
  const totalRevenue  = MONTHLY_REVENUE.reduce((s, r) => s + r.revenue, 0)
  const totalExpenses = MONTHLY_REVENUE.reduce((s, r) => s + r.expenses, 0)
  const netProfit     = totalRevenue - totalExpenses

  const handleRevenueRangeChange = (newRange) => {
    setRevenueRange(newRange)
    // SUG-AF-008: persist so Analytics page can read it
    try { localStorage.setItem('medibook_dateRange', newRange) } catch { /* ignore */ }
  }

  const handleExport = () => {
    try {
      const rows = [
        ['ID', 'Patient', 'Service', 'Date', 'Type', 'Amount', 'Method', 'Status'],
        ...filtered.map(t => [t.id, t.patient, t.service, t.date, t.type, t.amount, t.method, t.status]),
      ]
      const csv  = rows.map(r => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `finances_report_${new Date().toISOString().slice(0,10)}.csv`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
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
      <Helmet><title>Finances — MediBook</title></Helmet>

      {/* SUG-AF-007: Invoice drawer */}
      <InvoiceDrawer tx={drawerTx} open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: { xs: 1.5, sm: 0 } }}>
        <Box>
          <Typography variant="h4" fontWeight={800} sx={{ color: '#202124' }}>Finances</Typography>
          <Typography variant="body2" sx={{ color: '#5F6368' }}>Revenue, expenses, and payment management</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<FileDownloadRoundedIcon />}
          onClick={handleExport}
          aria-label="Export transactions as CSV"
          sx={{ borderRadius: 2, fontWeight: 700, background: 'linear-gradient(135deg, #4285F4 0%, #1A73E8 100%)', width: { xs: '100%', sm: 'auto' }, '&:hover': { boxShadow: '0 4px 14px rgba(26,115,232,0.35)' } }}
        >
          Export Report
        </Button>
      </Box>

      {/* Balance Cards */}
      <Grid container spacing={2.5} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <BalanceCard icon={AccountBalanceWalletRoundedIcon} label="Active Balance" value={12480} prefix="$" color="#1A73E8" trend={8.4} action={{ label: '+ Refill Balance', fn: () => {} }} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <BalanceCard icon={CardGiftcardRoundedIcon} label="Bonus Credits" value={320} prefix="$" color="#9334E6" trend={2.1} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <BalanceCard icon={TrendingUpRoundedIcon} label="Revenue This Month" value={8750} prefix="$" color="#0F9D58" trend={12.3} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <BalanceCard icon={TrendingDownRoundedIcon} label="Total Expenses" value={1550} prefix="$" color="#D93025" trend={-5.0} />
        </Grid>
      </Grid>

      {/* Main content tabs */}
      <Card sx={{ borderRadius: 3, border: '1px solid #E8EAED', boxShadow: 'none' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant={isMobile ? 'scrollable' : 'standard'}
          scrollButtons={isMobile ? 'auto' : false}
          aria-label="Finances sections"
          sx={{
            px: 2, borderBottom: '1px solid #E8EAED',
            '& .MuiTab-root': { color: '#5F6368', fontWeight: 600 },
            '& .MuiTab-root.Mui-selected': { color: '#1A73E8', fontWeight: 700 },
            '& .MuiTabs-indicator': { bgcolor: '#1A73E8', height: 3, borderRadius: '3px 3px 0 0' },
          }}
        >
          <Tab label="Payment History"   icon={<ReceiptLongRoundedIcon  sx={{ fontSize: '1rem' }} />} iconPosition="start" sx={{ minHeight: 52, fontSize: '0.875rem', fontWeight: 600, gap: 0.5 }} />
          <Tab label="Revenue Chart"     icon={<BarChartRoundedIcon     sx={{ fontSize: '1rem' }} />} iconPosition="start" sx={{ minHeight: 52, fontSize: '0.875rem', fontWeight: 600, gap: 0.5 }} />
          <Tab label="Payment Methods"   icon={<AddCardRoundedIcon      sx={{ fontSize: '1rem' }} />} iconPosition="start" sx={{ minHeight: 52, fontSize: '0.875rem', fontWeight: 600, gap: 0.5 }} />
        </Tabs>

        {/* Tab 0: Payment History */}
        {tab === 0 && (
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {/* Type filter pills */}
            <Stack direction="row" spacing={1} mb={1.5} flexWrap="wrap">
              {['all', 'income', 'expense'].map((f) => (
                <Chip key={f}
                  label={f === 'all' ? 'All Types' : f.charAt(0).toUpperCase() + f.slice(1)}
                  onClick={() => setTxFilter(f)}
                  aria-pressed={txFilter === f}
                  sx={{
                    fontWeight: 700, borderRadius: '8px', cursor: 'pointer', textTransform: 'capitalize', flexShrink: 0,
                    bgcolor: txFilter === f ? (f === 'expense' ? '#FCE8E6' : '#E8F0FE') : '#F8F9FA',
                    color:   txFilter === f ? (f === 'expense' ? '#A50E0E' : '#1A73E8') : '#5F6368',
                    border: `1.5px solid ${txFilter === f ? (f === 'expense' ? '#F5C6C2' : '#AECBFA') : '#E8EAED'}`,
                    '&:hover': { bgcolor: txFilter === f ? undefined : '#F1F3F4' },
                  }}
                />
              ))}
            </Stack>

            {/* SUG-AF-004: Status filter — Paid / Pending / Overdue */}
            <Stack direction="row" spacing={1} mb={2.5} flexWrap="wrap" alignItems="center">
              <Typography variant="caption" fontWeight={700} sx={{ color: 'text.secondary', mr: 0.5 }}>Status:</Typography>
              <ToggleButtonGroup
                value={statusFilter}
                exclusive
                onChange={(_, v) => { if (v) setStatusFilter(v) }}
                size="small"
                aria-label="Filter by status"
                sx={{ '& .MuiToggleButton-root': { borderRadius: '8px !important', fontWeight: 700, fontSize: '0.75rem', px: 1.5, py: 0.5, textTransform: 'capitalize', border: '1.5px solid #E8EAED' } }}
              >
                <ToggleButton value="all"     sx={{ '&.Mui-selected': { bgcolor: '#E8F0FE', color: '#1A73E8', borderColor: '#AECBFA' } }}>All</ToggleButton>
                <ToggleButton value="paid"    sx={{ '&.Mui-selected': { bgcolor: '#E6F4EA', color: '#137333', borderColor: '#CEEAD6' } }}>Paid</ToggleButton>
                <ToggleButton value="pending" sx={{ '&.Mui-selected': { bgcolor: '#FEF7E0', color: '#8A4700', borderColor: '#FDD663' } }}>Pending</ToggleButton>
                <ToggleButton value="overdue" sx={{ '&.Mui-selected': { bgcolor: '#FCE8E6', color: '#A50E0E', borderColor: '#F5C6C2' } }}>Overdue</ToggleButton>
              </ToggleButtonGroup>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
              </Typography>
            </Stack>

            {/* Transactions Table */}
            <TableContainer sx={{ borderRadius: 2, border: '1px solid #E2E8F0', overflow: 'auto' }}>
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
                  ) : filtered.map((tx) => {
                    const sCfg = STATUS_CFG[tx.status] ?? STATUS_CFG.pending
                    return (
                      <TableRow key={tx.id} sx={{ '&:hover': { bgcolor: '#F8FAFC' }, transition: 'background 0.15s' }}>
                        <TableCell><Typography variant="caption" sx={{ color: '#B8C6D4', fontWeight: 600, fontFamily: 'monospace' }}>{tx.id}</Typography></TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Avatar sx={{ width: 30, height: 30, bgcolor: '#EEF4FF', color: '#1565C7', fontSize: '0.65rem', fontWeight: 700 }}>
                              {tx.patient.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                            </Avatar>
                            <Typography variant="body2" fontWeight={600} sx={{ color: '#0D1B2E' }}>{tx.patient}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell><Typography variant="body2" sx={{ color: '#3D5A72' }}>{tx.service}</Typography></TableCell>
                        <TableCell><Typography variant="body2" sx={{ color: '#7A96AE' }}>{tx.date}</Typography></TableCell>
                        <TableCell>
                          <Typography fontWeight={800} sx={{ color: tx.type === 'income' ? '#0B7B5C' : '#E53535', fontSize: '0.9rem' }}>
                            {tx.type === 'income' ? '+' : '-'}${tx.amount.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell><Chip label={tx.method} size="small" sx={{ bgcolor: '#F5F7FA', color: '#3D5A72', fontWeight: 600, borderRadius: 8 }} /></TableCell>
                        <TableCell>
                          <Chip
                            label={sCfg.label}
                            size="small"
                            sx={{
                              bgcolor: sCfg.bg,
                              color: sCfg.color,
                              border: `1px solid ${sCfg.border}`,
                              borderLeft: `3px solid ${sCfg.accent}`,
                              fontWeight: 700, borderRadius: '8px', height: 24, textTransform: 'capitalize',
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
                              sx={{ color: '#B8C6D4', '&:hover': { color: '#1565C7', bgcolor: '#EEF4FF' } }}
                            >
                              <ReceiptLongRoundedIcon sx={{ fontSize: '0.95rem' }} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Tab 1: Revenue Chart — SUG-AF-005 + FIX NEW-AF-003 + SUG-AF-008 */}
        {tab === 1 && (
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {/* FIX NEW-AF-003: Date range selector on Revenue Chart tab */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2.5, flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5 }}>
              <Box>
                <Typography fontWeight={800} sx={{ color: '#202124', mb: 0.5 }}>Monthly Revenue vs Expenses</Typography>
                <Typography variant="body2" sx={{ color: '#5F6368' }}>Financial overview — Revenue, expenses, and net profit</Typography>
              </Box>
              <TextField
                select size="small"
                value={revenueRange}
                onChange={(e) => handleRevenueRangeChange(e.target.value)}
                inputProps={{ 'aria-label': 'Revenue chart date range' }}
                sx={{ minWidth: 160, '& .MuiOutlinedInput-root': { borderRadius: 2 }, flexShrink: 0 }}
              >
                {[
                  ['last1month',  'Last 1 Month'],
                  ['last3months', 'Last 3 Months'],
                  ['last7months', 'Last 7 Months'],
                  ['this_year',   'This Year'],
                ].map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
              </TextField>
            </Box>

            {/* Summary row — FIX NEW-AF-003: updates with date range */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3}>
              {[
                { label: 'Total Revenue', value: `$${totalRevenue.toLocaleString()}`, color: '#1A73E8' },
                { label: 'Total Expenses', value: `$${totalExpenses.toLocaleString()}`, color: '#D93025' },
                { label: 'Net Profit', value: `$${netProfit.toLocaleString()}`, color: '#0F9D58' },
              ].map(({ label, value, color }) => (
                <Paper key={label} elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #E8EAED', flex: 1 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ color: '#5F6368', mb: 0.5 }}>{label}</Typography>
                  <Typography variant="h5" fontWeight={800} sx={{ color }}>{value}</Typography>
                </Paper>
              ))}
            </Stack>

            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={MONTHLY_REVENUE} margin={{ top: 4, right: 8, left: -10, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#7A96AE' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#7A96AE' }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <ReTooltip
                  formatter={(value, name) => [`$${value.toLocaleString()}`, name]}
                  contentStyle={{ borderRadius: 8, border: '1px solid #E8EAED', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                />
                <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12, fontWeight: 700 }} />
                <Bar dataKey="revenue"  fill="#1A73E8" radius={[6,6,0,0]} name="Revenue" />
                <Bar dataKey="expenses" fill="#D93025" radius={[6,6,0,0]} name="Expenses" fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>

            <Divider sx={{ my: 3 }} />
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              Net profit = Revenue − Expenses. For full analytics including patient growth, visit the{' '}
              <a href="/analytics" style={{ color: '#1A73E8', fontWeight: 700 }}>Analytics page</a>.
            </Typography>
          </Box>
        )}

        {/* Tab 2: Payment Methods */}
        {tab === 2 && (
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
              <Typography fontWeight={700} sx={{ color: '#0D1B2E' }}>Saved Payment Methods</Typography>
              <Button variant="outlined" startIcon={<AddCardRoundedIcon />} sx={{ borderRadius: 2, fontWeight: 700, fontSize: '0.82rem' }}>
                Add Card
              </Button>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {CARDS.map((card) => (
                <Paper key={card.last4} elevation={0} sx={{ p: 2.5, borderRadius: 3, border: card.isDefault ? '2px solid #1A73E8' : '1px solid #E8EAED', display: 'flex', alignItems: 'center', gap: 2.5, bgcolor: card.isDefault ? '#E8F0FE' : '#fff', transition: 'all 0.15s' }}>
                  <Box sx={{ width: 48, height: 32, bgcolor: '#0D1B2E', borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography sx={{ color: '#fff', fontSize: '0.65rem', fontWeight: 800 }}>{card.brand.toUpperCase()}</Typography>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography fontWeight={700} sx={{ color: '#0D1B2E', fontSize: '0.9rem', letterSpacing: '0.05em' }}>•••• •••• •••• {card.last4}</Typography>
                      {card.isDefault && <Chip label="Default" size="small" sx={{ bgcolor: '#1565C7', color: '#fff', height: 18, fontSize: '0.6rem', fontWeight: 700 }} />}
                    </Box>
                    <Typography variant="caption" sx={{ color: '#7A96AE' }}>Expires {card.expiry} · {card.holder}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {!card.isDefault && (
                      <Button size="small" sx={{ borderRadius: 2, fontWeight: 700, fontSize: '0.75rem', color: '#1565C7', bgcolor: '#EEF4FF', '&:hover': { bgcolor: '#C5D8FA' } }}>Set Default</Button>
                    )}
                    <IconButton size="small" aria-label={`Delete card ending in ${card.last4}`} sx={{ color: '#B8C6D4', '&:hover': { color: '#E53535', bgcolor: '#FEF0F0' } }}>
                      <DeleteOutlineRoundedIcon sx={{ fontSize: '1.1rem' }} />
                    </IconButton>
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        )}
      </Card>
    </Box>
  )
}
