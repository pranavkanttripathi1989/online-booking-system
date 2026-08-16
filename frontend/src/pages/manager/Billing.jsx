import React, { useState } from 'react';
import {
  Box, Grid, Typography, Card, CardContent, Stack, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Select, MenuItem, FormControl, InputLabel, TextField,
  Tooltip, Alert, Drawer, Divider, CircularProgress,
} from '@mui/material';
import { StatusChip } from '../../components/shared';
import ConfirmDialog from '../../components/ConfirmDialog/ConfirmDialog';
import ErrorBoundary from '../../components/ErrorBoundary';
import DownloadIcon from '@mui/icons-material/Download';
import ReceiptIcon from '@mui/icons-material/Receipt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefundIcon from '@mui/icons-material/CurrencyExchange';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
// SUG-DT-S7-002: canonical currency formatter (handles null, commas, GBP symbol)
import { formatCurrency } from '../../utils/dateTime';

// ─── Mock data (VITE_USE_MOCK_API=true or backend offline → same effect) ──────
const REVENUE_DATA = [
  { name: 'Sep', clinics: 5200, services: 3100, net: 7420 },
  { name: 'Oct', clinics: 6100, services: 3800, net: 8820 },
  { name: 'Nov', clinics: 5800, services: 3500, net: 8280 },
  { name: 'Dec', clinics: 4900, services: 2900, net: 7000 },
  { name: 'Jan', clinics: 7200, services: 4500, net: 10260 },
  { name: 'Feb', clinics: 7800, services: 5100, net: 11322 },
  { name: 'Mar', clinics: 8100, services: 5400, net: 11880 },
];

const INVOICES_SEED = [
  { id: 'INV-001', patient: 'Emma Wilson',   clinician: 'Dr. Johnson', service: 'Cardiology Consultation', date: '2026-03-20', amount: 85,  status: 'paid',     method: 'Card' },
  { id: 'INV-002', patient: 'James Brown',   clinician: 'Dr. Osei',    service: 'Neurology Assessment',    date: '2026-03-20', amount: 120, status: 'paid',     method: 'Card' },
  { id: 'INV-003', patient: 'Lily Chen',     clinician: 'Dr. Sharma',  service: 'Paediatrics Check-up',    date: '2026-03-19', amount: 75,  status: 'refunded', method: 'Card' },
  { id: 'INV-004', patient: 'Omar Hassan',   clinician: 'Dr. Johnson', service: 'ECG Recording',           date: '2026-03-18', amount: 120, status: 'pending',  method: 'Insurance' },
  { id: 'INV-005', patient: 'Sophie Müller', clinician: 'Dr. Johnson', service: 'Post-op Review',          date: '2026-03-17', amount: 85,  status: 'paid',     method: 'Cash' },
];

const SUMMARY = [
  { label: 'Total Revenue (Mar)',    value: '£11,880', sub: '+12% vs last month', color: '#2DC653' },
  { label: 'Outstanding Invoices',  value: '£2,340',  sub: '8 invoices pending',  color: '#FFB703' },
  { label: 'Refunds This Month',    value: '£450',    sub: '3 refund requests',   color: '#E63946' },
  { label: 'Avg Rev / Appointment', value: '£92.40',  sub: '245 appointments',    color: '#006D77' },
];

const STATUS_COLOR = { paid: 'confirmed', pending: 'scheduled', refunded: 'cancelled' };

const DATE_LABELS = {
  'this-month':    'March 2026',
  'last-month':    'February 2026',
  'last-quarter':  'Q4 2025',
  'ytd':           'Jan – Mar 2026',
};

export default function ManagerBilling() {
  // ── Filters ────────────────────────────────────────────────────────────────
  const [dateFilter,   setDateFilter]   = useState('this-month');
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');    // SUG-BILL-011
  const [searchQuery,  setSearchQuery]  = useState('');       // SUG-BILL-002

  // ── Invoice state (mutable copy, enables optimistic refund) ────────────────
  const [invoices, setInvoices] = useState(INVOICES_SEED);
  const [successMsg, setSuccessMsg] = useState(null);

  // ── Refund confirm dialog state (SUG-BILL-007) ─────────────────────────────
  const [refundTarget, setRefundTarget] = useState(null);
  // SUG-BILL-017 — loading state while refund "mutation" is in flight
  const [refundingId, setRefundingId] = useState(null);

  // SUG-BILL-004 — invoice detail drawer state
  const [viewTarget, setViewTarget] = useState(null);

  // ── Derived filtered list (SUG-BILL-002 + SUG-BILL-011) ───────────────────
  const filtered = invoices.filter((inv) => {
    const matchMethod = methodFilter === 'all' || inv.method === methodFilter;
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch = !q ||
      inv.patient.toLowerCase().includes(q) ||
      inv.id.toLowerCase().includes(q) ||
      inv.service.toLowerCase().includes(q) ||
      inv.clinician.toLowerCase().includes(q);
    return matchMethod && matchStatus && matchSearch;
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  /** SUG-BILL-006 — CSV export of currently-filtered invoices */
  const handleExport = () => {
    const headers = ['Invoice', 'Patient', 'Clinician', 'Service', 'Date', 'Amount', 'Method', 'Status'];
    const rows = filtered.map(inv =>
      [inv.id, inv.patient, inv.clinician, inv.service, inv.date, formatCurrency(inv.amount), inv.method, inv.status]
    );
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url;
    a.download = `billing-export-${dateFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /** SUG-BILL-007 — Confirm refund: opens dialog */
  const handleRefundClick = (inv) => setRefundTarget(inv);

  /** SUG-BILL-007 + SUG-BILL-017 — Execute refund after confirmation (optimistic update + loading state) */
  const confirmRefund = () => {
    if (!refundTarget) return;
    const target = refundTarget;
    setRefundingId(target.id);
    setRefundTarget(null);
    // Simulate mutation latency so the loading spinner is visible/testable
    setTimeout(() => {
      setInvoices(prev =>
        prev.map(inv => inv.id === target.id ? { ...inv, status: 'refunded' } : inv)
      );
      setRefundingId(null);
      setSuccessMsg(`Refund of ${formatCurrency(target.amount)} issued for ${target.patient}.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    }, 600);
  };

  /** SUG-BILL-004 — open invoice detail drawer */
  const handleViewInvoice = (inv) => setViewTarget(inv);

  /** SUG-BILL-005 — "download" a printable invoice receipt (no PDF lib available; text receipt) */
  const handleDownloadInvoice = (inv) => {
    const lines = [
      `INVOICE ${inv.id}`,
      `Patient:   ${inv.patient}`,
      `Clinician: ${inv.clinician}`,
      `Service:   ${inv.service}`,
      `Date:      ${inv.date}`,
      `Method:    ${inv.method}`,
      `Status:    ${inv.status}`,
      `Amount:    ${formatCurrency(inv.amount)}`,
      '',
      'City Heart Clinic — thank you for your visit.',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${inv.id}-receipt.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ErrorBoundary>
      <Box>

        {/* ── Page Header ──────────────────────────────────────────────────── */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
          <Box>
            <Typography variant="h2" fontWeight={700}>Billing &amp; Revenue</Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="body2" color="text.secondary">City Heart Clinic</Typography>
              {/* SUG-BILL-003 — active period chip */}
              <Chip
                label={DATE_LABELS[dateFilter] ?? dateFilter}
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 600 }}
              />
            </Stack>
          </Box>
          <Stack direction="row" spacing={1.5}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <Select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                <MenuItem value="this-month">This Month</MenuItem>
                <MenuItem value="last-month">Last Month</MenuItem>
                <MenuItem value="last-quarter">Last Quarter</MenuItem>
                <MenuItem value="ytd">Year to Date</MenuItem>
              </Select>
            </FormControl>
            {/* SUG-BILL-006 — wired Export button */}
            <Tooltip title="Export filtered invoices as CSV">
              <Button startIcon={<DownloadIcon />} variant="outlined" onClick={handleExport}>
                Export
              </Button>
            </Tooltip>
          </Stack>
        </Stack>

        {/* ── Success banner ────────────────────────────────────────────────── */}
        {successMsg && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>
            {successMsg}
          </Alert>
        )}

        {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {SUMMARY.map(({ label, value, sub, color }) => (
            <Grid item xs={12} sm={6} md={3} key={label}>
              <Card sx={{ borderTop: `4px solid ${color}` }}>
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{label}</Typography>
                  <Typography variant="h3" fontWeight={800} sx={{ color, mb: 0.25 }}>{value}</Typography>
                  <Typography variant="caption" color="text.secondary">{sub}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* ── Revenue Chart (SUG-BILL-010 — Legend added) ───────────────────── */}
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Revenue Breakdown</Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={REVENUE_DATA} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8F0F2" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `£${v / 1000}k`} />
                <RechartsTooltip formatter={(v) => `£${v.toLocaleString()}`} />
                {/* SUG-BILL-010 — Legend so users know which colour is which */}
                <Legend verticalAlign="top" height={32} />
                <Bar dataKey="clinics"  fill="#006D77" radius={[4, 4, 0, 0]} name="Clinic Fees"   stackId="a" />
                <Bar dataKey="services" fill="#83C5BE" radius={[4, 4, 0, 0]} name="Service Fees"  stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* ── Invoices Table ────────────────────────────────────────────────── */}
        <Card>
          <CardContent sx={{ p: 2.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" gap={1}>
              <Typography variant="h5" fontWeight={700}>
                Invoices
                {filtered.length !== invoices.length && (
                  <Chip label={`${filtered.length} of ${invoices.length}`} size="small" sx={{ ml: 1, fontWeight: 600 }} />
                )}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                {/* SUG-BILL-002 — wired search field */}
                <TextField
                  size="small"
                  label="Search invoices"
                  sx={{ width: 200 }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  inputProps={{ 'aria-label': 'Search invoices by patient, ID or service' }}
                />
                {/* SUG-BILL-011 — Status filter */}
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <InputLabel>Status</InputLabel>
                  <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
                    <MenuItem value="all">All Statuses</MenuItem>
                    <MenuItem value="paid">Paid</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                    <MenuItem value="refunded">Refunded</MenuItem>
                  </Select>
                </FormControl>
                {/* Method filter (existing) */}
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>Payment Method</InputLabel>
                  <Select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} label="Payment Method">
                    {['all', 'Card', 'Cash', 'Insurance'].map((m) => (
                      <MenuItem key={m} value={m}>{m === 'all' ? 'All Methods' : m}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button startIcon={<ReceiptIcon />} variant="outlined" size="small">
                  Generate Invoice
                </Button>
              </Stack>
            </Stack>

            {/* Empty state when all invoices are filtered out */}
            {filtered.length === 0 && (
              <Box textAlign="center" py={5}>
                <ReceiptIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1, display: 'block', mx: 'auto' }} />
                <Typography color="text.secondary">No invoices match your filters.</Typography>
                <Button size="small" sx={{ mt: 1 }} onClick={() => { setSearchQuery(''); setMethodFilter('all'); setStatusFilter('all'); }}>
                  Clear filters
                </Button>
              </Box>
            )}

            {filtered.length > 0 && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Invoice</TableCell>
                      <TableCell>Patient</TableCell>
                      <TableCell>Clinician</TableCell>
                      <TableCell>Service</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Method</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.map((inv) => (
                      <TableRow key={inv.id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700} color="primary">{inv.id}</Typography>
                        </TableCell>
                        <TableCell>{inv.patient}</TableCell>
                        <TableCell>
                          <Typography variant="body2">{inv.clinician}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">{inv.service}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{inv.date}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>{formatCurrency(inv.amount)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={inv.method} size="small" sx={{ bgcolor: '#F0F7F8', color: '#004D55' }} />
                        </TableCell>
                        <TableCell>
                          <StatusChip status={STATUS_COLOR[inv.status] || inv.status} />
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            {/* SUG-BILL-004 — View opens invoice detail drawer */}
                            <Tooltip title="View invoice">
                              <IconButton size="small" aria-label={`View invoice ${inv.id}`} onClick={() => handleViewInvoice(inv)}>
                                <VisibilityIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {/* SUG-BILL-005 — Download invoice receipt */}
                            <Tooltip title="Download invoice">
                              <IconButton size="small" aria-label={`Download invoice ${inv.id}`} onClick={() => handleDownloadInvoice(inv)}>
                                <DownloadIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {/* SUG-BILL-007 — Refund with confirm dialog; SUG-BILL-017 — loading state */}
                            {inv.status === 'paid' && (
                              <Tooltip title="Issue refund">
                                <span>
                                  <IconButton
                                    size="small"
                                    color="error"
                                    aria-label={`Refund invoice ${inv.id}`}
                                    disabled={refundingId === inv.id}
                                    onClick={() => handleRefundClick(inv)}
                                  >
                                    {refundingId === inv.id ? <CircularProgress size={16} color="inherit" /> : <RefundIcon fontSize="small" />}
                                  </IconButton>
                                </span>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>

        {/* ── Refund Confirm Dialog (SUG-BILL-007) ─────────────────────────── */}
        <ConfirmDialog
          isOpen={!!refundTarget}
          title="Issue Refund"
          message={
            refundTarget
              ? `Issue a refund of ${formatCurrency(refundTarget.amount)} for ${refundTarget.patient} (${refundTarget.id})? This action cannot be undone.`
              : ''
          }
          onConfirm={confirmRefund}
          onCancel={() => setRefundTarget(null)}
          confirmLabel="Refund"
          confirmColor="warning"
        />

        {/* ── SUG-BILL-004: Invoice Detail Drawer ──────────────────────────── */}
        <Drawer anchor="right" open={!!viewTarget} onClose={() => setViewTarget(null)}>
          <Box sx={{ width: 360, p: 3 }}>
            {viewTarget && (
              <>
                <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>{viewTarget.id}</Typography>
                <StatusChip status={STATUS_COLOR[viewTarget.status] || viewTarget.status} />
                <Divider sx={{ my: 2 }} />
                <Stack spacing={1.5}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Patient</Typography>
                    <Typography variant="body1" fontWeight={600}>{viewTarget.patient}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Clinician</Typography>
                    <Typography variant="body1">{viewTarget.clinician}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Service</Typography>
                    <Typography variant="body1">{viewTarget.service}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Date</Typography>
                    <Typography variant="body1">{viewTarget.date}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Payment Method</Typography>
                    <Typography variant="body1">{viewTarget.method}</Typography>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="caption" color="text.secondary">Amount</Typography>
                    <Typography variant="h4" fontWeight={800} sx={{ color: '#006D77' }}>{formatCurrency(viewTarget.amount)}</Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
                  <Button fullWidth variant="outlined" startIcon={<DownloadIcon />} onClick={() => handleDownloadInvoice(viewTarget)}>
                    Download
                  </Button>
                  <Button fullWidth variant="contained" onClick={() => setViewTarget(null)}>
                    Close
                  </Button>
                </Stack>
              </>
            )}
          </Box>
        </Drawer>

      </Box>
    </ErrorBoundary>
  );
}
