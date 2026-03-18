import React, { useState } from 'react';
import {
  Box, Grid, Typography, Card, CardContent, Stack, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, Select, MenuItem, FormControl, InputLabel, TextField,
  LinearProgress,
} from '@mui/material';
import { StatusChip } from '../../components/shared';
import DownloadIcon from '@mui/icons-material/Download';
import ReceiptIcon from '@mui/icons-material/Receipt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefundIcon from '@mui/icons-material/CurrencyExchange';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const REVENUE_DATA = [
  { name: 'Sep', clinics: 5200, services: 3100, net: 7420 },
  { name: 'Oct', clinics: 6100, services: 3800, net: 8820 },
  { name: 'Nov', clinics: 5800, services: 3500, net: 8280 },
  { name: 'Dec', clinics: 4900, services: 2900, net: 7000 },
  { name: 'Jan', clinics: 7200, services: 4500, net: 10260 },
  { name: 'Feb', clinics: 7800, services: 5100, net: 11322 },
  { name: 'Mar', clinics: 8100, services: 5400, net: 11880 },
];

const INVOICES = [
  { id: 'INV-001', patient: 'Emma Wilson',  clinician: 'Dr. Johnson', service: 'Cardiology Consultation', date: '2026-03-20', amount: 85,  status: 'paid',    method: 'Card' },
  { id: 'INV-002', patient: 'James Brown',  clinician: 'Dr. Osei',    service: 'Neurology Assessment',    date: '2026-03-20', amount: 120, status: 'paid',    method: 'Card' },
  { id: 'INV-003', patient: 'Lily Chen',    clinician: 'Dr. Sharma',  service: 'Paediatrics Check-up',    date: '2026-03-19', amount: 75,  status: 'refunded', method: 'Card' },
  { id: 'INV-004', patient: 'Omar Hassan',  clinician: 'Dr. Johnson', service: 'ECG Recording',           date: '2026-03-18', amount: 120, status: 'pending',  method: 'Insurance' },
  { id: 'INV-005', patient: 'Sophie Müller',clinician: 'Dr. Johnson', service: 'Post-op Review',          date: '2026-03-17', amount: 85,  status: 'paid',     method: 'Cash' },
];

const SUMMARY = [
  { label: 'Total Revenue (Mar)',   value: '£11,880', sub: '+12% vs last month', color: '#2DC653' },
  { label: 'Outstanding Invoices', value: '£2,340',  sub: '8 invoices pending',  color: '#FFB703' },
  { label: 'Refunds This Month',   value: '£450',    sub: '3 refund requests',   color: '#E63946' },
  { label: 'Avg Rev / Appointment', value: '£92.40', sub: '245 appointments',     color: '#006D77' },
];

const STATUS_COLOR = { paid: 'confirmed', pending: 'scheduled', refunded: 'cancelled' };

export default function ManagerBilling() {
  const [dateFilter, setDateFilter] = useState('this-month');
  const [methodFilter, setMethodFilter] = useState('all');

  const filtered = INVOICES.filter((inv) => methodFilter === 'all' || inv.method === methodFilter);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h2" fontWeight={700}>Billing & Revenue</Typography>
          <Typography variant="body2" color="text.secondary">City Heart Clinic · March 2026</Typography>
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
          <Button startIcon={<DownloadIcon />} variant="outlined">Export</Button>
        </Stack>
      </Stack>

      {/* KPI Row */}
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

      {/* Revenue Chart */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>Revenue Breakdown</Typography>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={REVENUE_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E8F0F2" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `£${v / 1000}k`} />
              <Tooltip formatter={(v) => `£${v.toLocaleString()}`} />
              <Bar dataKey="clinics"  fill="#006D77" radius={[4, 4, 0, 0]} name="Clinic Fees" stackId="a" />
              <Bar dataKey="services" fill="#83C5BE" radius={[4, 4, 0, 0]} name="Service Fees" stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h5" fontWeight={700}>Invoices</Typography>
            <Stack direction="row" spacing={1}>
              <TextField size="small" label="Search invoices" sx={{ width: 200 }} />
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Payment Method</InputLabel>
                <Select value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)} label="Payment Method">
                  {['all', 'Card', 'Cash', 'Insurance'].map((m) => (
                    <MenuItem key={m} value={m}>{m === 'all' ? 'All Methods' : m}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button startIcon={<ReceiptIcon />} variant="outlined" size="small">Generate Invoice</Button>
            </Stack>
          </Stack>

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
                      <Typography variant="body2" fontWeight={700}>£{inv.amount}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={inv.method}
                        size="small"
                        sx={{ bgcolor: '#F0F7F8', color: '#004D55' }}
                      />
                    </TableCell>
                    <TableCell>
                      <StatusChip status={STATUS_COLOR[inv.status] || inv.status} />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small"><VisibilityIcon fontSize="small" /></IconButton>
                        <IconButton size="small"><DownloadIcon fontSize="small" /></IconButton>
                        {inv.status === 'paid' && (
                          <IconButton size="small" color="error"><RefundIcon fontSize="small" /></IconButton>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}
