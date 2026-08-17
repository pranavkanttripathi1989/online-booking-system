import React, { useState, useMemo } from 'react';
import { useQuery, gql } from '@apollo/client';
import {
  Box, Grid, Paper, Typography, Stack, ToggleButtonGroup, ToggleButton,
  Select, MenuItem, FormControl, InputLabel, Card, Avatar, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
  Skeleton, Chip, Alert, Collapse
} from '@mui/material';
import {
  EventNote, AttachMoney, PeopleAlt, Speed, Cancel
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { useAuth } from '../../hooks/useAuth';
import StitchKpiCard from '../../components/shared/StitchKpiCard';
import StitchStatusChip from '../../components/shared/StitchStatusChip';
import ErrorBoundary from '../../components/ErrorBoundary';

// --- GraphQL ---

const GET_MANAGER_DASHBOARD_DATA = gql`
  query GetManagerDashboardData($clinicId: ID, $startDate: String!, $endDate: String!) {
    getClinics {
      id
      name
    }
    # These would be complex resolvers on the backend aggregating data
    getAppointmentStats(clinicId: $clinicId, startDate: $startDate, endDate: $endDate) {
      totalAppointments
      revenue
      activePatients
      utilization
      cancellationRate
      
      trends {
        totalAppointments
        revenue
        activePatients
        utilization
        cancellationRate
      }

      timeSeriesData {
        date
        scheduled
        completed
        cancelled
      }

      statusDistribution {
        name
        value
      }

      revenueByClinic {
        name
        revenue
      }

      topClinicians {
        id
        name
        appointments
        revenue
      }
    }
    getTransactionsByDate(startDate: $startDate, endDate: $endDate, limit: 10, offset: 0) {
      id
      createdAt
      amount
      status
      appointment {
        id
        clinician {
          name
        }
        patient {
          id
          firstName
          lastName
        }
        product {
          name
        }
      }
    }
  }
`;

// Stitch brand
const BRAND = '#006D77';

const PIE_COLORS = {
  Scheduled: '#3B82F6',
  Completed: '#10B981',
  Cancelled: '#EF4444',
  'No-Show': '#F59E0B',
};

// --- Mock Data Fallbacks (if Apollo fails/loading without cache) ---
const MOCK_TIME_SERIES = Array.from({ length: 7 }).map((_, i) => ({
  date: dayjs().subtract(6 - i, 'day').format('DD MMM'),
  scheduled: Math.floor(Math.random() * 20) + 10,
  completed: Math.floor(Math.random() * 15) + 5,
  cancelled: Math.floor(Math.random() * 5),
}));

const MOCK_PIE = [
  { name: 'Completed', value: 400 },
  { name: 'Scheduled', value: 300 },
  { name: 'Cancelled', value: 100 },
  { name: 'No-Show', value: 50 },
];

// SUG-DASH-002: mock clinic dropdown options for when getClinics returns [] offline
const MOCK_CLINICS = [
  { id: 'cli-1', name: 'London Central' },
  { id: 'cli-2', name: 'Manchester North' },
  { id: 'cli-3', name: 'Birmingham' },
];

function ManagerDashboardInner() {
  const { user } = useAuth();
  
  // Filters state
  const [dateFilter, setDateFilter] = useState('30d');
  const [customStart, setCustomStart] = useState(dayjs().subtract(30, 'day'));
  const [customEnd, setCustomEnd] = useState(dayjs());
  const [clinicFilter, setClinicFilter] = useState('all');

  // Pagination bounds (mock implementation)
  const [page, setPage] = useState(0);
  const rowsPerPage = 5;

  // Resolve dates based on toggle
  const { startStr, endStr } = useMemo(() => {
    if (dateFilter === 'custom') {
      return { 
        startStr: customStart?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD'), 
        endStr: customEnd?.format('YYYY-MM-DD') || dayjs().format('YYYY-MM-DD') 
      };
    }
    
    const days = dateFilter === '7d' ? 7 : dateFilter === '30d' ? 30 : 90;
    return {
      startStr: dayjs().subtract(days, 'day').format('YYYY-MM-DD'),
      endStr: dayjs().format('YYYY-MM-DD')
    };
  }, [dateFilter, customStart, customEnd]);

  // BUG-DASH-001 FIX — validate custom date range
  const dateRangeError = dateFilter === 'custom' && customStart && customEnd && customStart.isAfter(customEnd)
    ? 'Start date cannot be after End date.'
    : null;

  // Query Data
  const { data, loading, error } = useQuery(GET_MANAGER_DASHBOARD_DATA, {
    variables: { 
      clinicId: clinicFilter === 'all' ? null : clinicFilter,
      startDate: startStr,
      endDate: endStr
    },
    skip: !user || !!dateRangeError // BUG-DASH-001: skip query when dates are inverted
  });

  const handleDateToggle = (e, newFilter) => {
    if (newFilter) {
      setDateFilter(newFilter);
    }
  };

  // Safe data access
  // SUG-DASH-002: fall back to mock clinics so the dropdown isn't empty offline
  const clinics = data?.getClinics?.length ? data.getClinics : MOCK_CLINICS;
  const stats = data?.getAppointmentStats || {
    totalAppointments: 1245, revenue: 145200, activePatients: 840, utilization: 78, cancellationRate: 12,
    trends: { totalAppointments: 12, revenue: 15, activePatients: 5, utilization: 3, cancellationRate: -2 },
    timeSeriesData: MOCK_TIME_SERIES,
    statusDistribution: MOCK_PIE,
    revenueByClinic: [ { name: 'London Central', revenue: 65000 }, { name: 'Manchester North', revenue: 45000 }, { name: 'Birmingham', revenue: 35200 } ],
    topClinicians: [
      { id: '1', name: 'Dr. Sarah Jenkins', appointments: 145, revenue: 21750 },
      { id: '2', name: 'Dr. Michael Chen', appointments: 132, revenue: 19800 },
      { id: '3', name: 'Dr. Emily Blunt', appointments: 110, revenue: 16500 },
    ]
  };
  
  // SUG-DASH-003/SUG-DASH-005 (older file): expanded to 6 rows (incl. a 'failed' one)
  // so pagination "Next Page" and the red "Failed" chip are both browser-testable offline.
  const transactions = data?.getTransactionsByDate || [
    { id: 'TRX_1', createdAt: new Date().toISOString(), amount: 150.00, status: 'succeeded', appointment: { clinician: { name: 'Dr. Sarah Jenkins' }, patient: { id: 1, firstName: 'John', lastName: 'Doe' }, product: { name: 'Initial Consultation' } } },
    { id: 'TRX_2', createdAt: new Date().toISOString(), amount: 85.00, status: 'succeeded', appointment: { clinician: { name: 'Dr. Michael Chen' }, patient: { id: 2, firstName: 'Jane', lastName: 'Smith' }, product: { name: 'Follow-up' } } },
    { id: 'TRX_3', createdAt: new Date().toISOString(), amount: 200.00, status: 'pending', appointment: { clinician: { name: 'Dr. Emily Blunt' }, patient: { id: 3, firstName: 'Robert', lastName: 'Johnson' }, product: { name: 'Specialist Review' } } },
    { id: 'TRX_4', createdAt: new Date().toISOString(), amount: 45.00, status: 'failed', appointment: { clinician: { name: 'Dr. Emily Blunt' }, patient: { id: 4, firstName: 'Alice', lastName: 'Wong' }, product: { name: 'Blood Test' } } },
    { id: 'TRX_5', createdAt: new Date().toISOString(), amount: 95.00, status: 'succeeded', appointment: { clinician: { name: 'Dr. Sarah Jenkins' }, patient: { id: 5, firstName: 'Priya', lastName: 'Patel' }, product: { name: 'Physiotherapy' } } },
    { id: 'TRX_6', createdAt: new Date().toISOString(), amount: 120.00, status: 'succeeded', appointment: { clinician: { name: 'Dr. Michael Chen' }, patient: { id: 6, firstName: 'Tom', lastName: 'Lee' }, product: { name: 'Consultation' } } },
  ];

  return (
    <Box p={{ xs: 2, md: 4 }} maxWidth="xl" mx="auto">
      
      {/* HEADER CONTROLS */}
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} mb={4} gap={3}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Analytics Overview</Typography>
          <Typography variant="body2" color="text.secondary">Comprehensive view of business performance and clinical metrics.</Typography>
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} alignItems="center">
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            {dateFilter === 'custom' && (
              <Stack direction="row" gap={1}>
                <DatePicker label="Start" value={customStart} onChange={setCustomStart} slotProps={{ textField: { size: 'small', sx: { width: 140 } } }} />
                <DatePicker label="End" value={customEnd} onChange={setCustomEnd} slotProps={{ textField: { size: 'small', sx: { width: 140 } } }} />
              </Stack>
            )}
          </LocalizationProvider>

          <ToggleButtonGroup 
            value={dateFilter} 
            exclusive 
            onChange={handleDateToggle} 
            size="small"
            sx={{ bgcolor: 'white' }}
          >
            <ToggleButton value="7d">7D</ToggleButton>
            <ToggleButton value="30d">30D</ToggleButton>
            <ToggleButton value="90d">90D</ToggleButton>
            <ToggleButton value="custom">Custom</ToggleButton>
          </ToggleButtonGroup>

          <FormControl size="small" sx={{ minWidth: 160, bgcolor: 'white' }}>
            <InputLabel>Clinic</InputLabel>
            <Select value={clinicFilter} label="Clinic" onChange={(e) => setClinicFilter(e.target.value)}>
              <MenuItem value="all">All Clinics</MenuItem>
              {clinics.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>
      </Stack>

      {/* BUG-DASH-001 FIX — date range validation alert */}
      <Collapse in={!!dateRangeError}>
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {dateRangeError}
        </Alert>
      </Collapse>

      {/* KPI ROW — Stitch KPI cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 4, overflowX: 'auto', pb: 1 }}>
        <StitchKpiCard title="Total Appointments" value={loading ? '...' : stats.totalAppointments.toLocaleString()} icon={<EventNote />} color="#3B82F6" trend={stats.trends.totalAppointments} />
        <StitchKpiCard title="Gross Revenue" value={loading ? '...' : `₹${stats.revenue.toLocaleString()}`} icon={<AttachMoney />} color="#10B981" trend={stats.trends.revenue} />
        <StitchKpiCard title="Active Patients" value={loading ? '...' : stats.activePatients.toLocaleString()} icon={<PeopleAlt />} color={BRAND} trend={stats.trends.activePatients} />
        <StitchKpiCard title="Clinician Utilization" value={loading ? '...' : `${stats.utilization}%`} icon={<Speed />} color="#7C3AED" trend={stats.trends.utilization} />
        <StitchKpiCard title="Cancellation Rate" value={loading ? '...' : `${stats.cancellationRate}%`} icon={<Cancel />} color="#EF4444" trend={stats.trends.cancellationRate} />
      </Box>

      {/* CHARTS ROW 1 */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={8}>
          <Card elevation={0} sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 3, height: '100%' }}>
            <Typography variant="overline" fontWeight={700} color="text.secondary" letterSpacing={1}>Appointments Over Time</Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={2}>Scheduled vs Completed vs Cancelled</Typography>
            {loading ? <Skeleton variant="rectangular" height={280} sx={{ borderRadius: 2 }} /> : stats.timeSeriesData.length === 0 ? (
              /* SUG-DASH-003 (older file): empty state when filtered data has no rows */
              <Box sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                <Typography>No appointment data for this period.</Typography>
              </Box>
            ) : (
              <Box height={300} mt={1}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.timeSeriesData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="date" tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} dy={10} />
                    <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <RechartsTooltip contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: 16, fontSize: 12 }} />
                    <Line type="monotone" name="Scheduled" dataKey="scheduled" stroke={BRAND} strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2, fill: 'white', stroke: BRAND }} activeDot={{ r: 5 }} />
                    <Line type="monotone" name="Completed" dataKey="completed" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2, fill: 'white', stroke: '#10B981' }} activeDot={{ r: 5 }} />
                    <Line type="monotone" name="Cancelled" dataKey="cancelled" stroke="#EF4444" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2, fill: 'white', stroke: '#EF4444' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Card>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card elevation={0} sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>Status Distribution</Typography>
            {loading ? <Skeleton variant="circular" width={240} height={240} sx={{ mx: 'auto', mt: 4 }} /> : (
              <Box height={320} flexGrow={1}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        return percent > 0.05 ? (
                          <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
                            {`${(percent * 100).toFixed(0)}%`}
                          </text>
                        ) : null;
                      }}
                    >
                      {stats.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.name] || '#CBD5E1'} stroke="none" />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* CHARTS ROW 2 */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 3, height: '100%' }}>
            <Typography variant="overline" fontWeight={700} color="text.secondary" letterSpacing={1}>Revenue by Clinic</Typography>
            <Typography variant="caption" color="text.secondary" display="block" mb={1}>Monthly earnings comparison</Typography>
            {loading ? <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 2 }} /> : (
              <Box height={280} mt={2}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.revenueByClinic} margin={{ top: 10, right: 10, left: -10, bottom: 5 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E0E0E0" />
                    <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(value) => `₹${value/1000}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#374151', fontSize: 13, fontWeight: 500 }} axisLine={false} tickLine={false} width={120} />
                    <RechartsTooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(value) => `₹${value.toLocaleString()}`} />
                    <Bar dataKey="revenue" fill="#006D77" radius={[0, 4, 4, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ p: 3, border: '1px solid #E2E8F0', borderRadius: 3, height: '100%' }}>
            <Typography variant="overline" fontWeight={700} color="text.secondary" letterSpacing={1}>Top Performing Clinicians</Typography>
            {loading ? <Skeleton variant="rectangular" height={250} sx={{ borderRadius: 2 }} /> : stats.topClinicians.length === 0 ? (
              <Typography color="text.secondary" textAlign="center" py={4}>No clinician data available.</Typography>
            ) : (
              <TableContainer sx={{ mt: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.6 }}>Clinician</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.6 }}>Appts</TableCell>
                      <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.6 }}>Revenue</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.topClinicians.map((clinician, idx) => {
                      const rankColors = ['#006D77', '#7C3AED', '#3B82F6'];
                      return (
                        <TableRow key={clinician.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell component="th" scope="row">
                            <Stack direction="row" alignItems="center" gap={1.5}>
                              <Avatar sx={{ width: 28, height: 28, bgcolor: `${rankColors[idx] || '#94A3B8'}20`, color: rankColors[idx] || '#94A3B8', fontSize: 12, fontWeight: 800 }}>
                                {idx + 1}
                              </Avatar>
                              <Typography variant="subtitle2" fontWeight={600}>{clinician.name}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align="right"><Typography variant="body2" fontWeight={500}>{clinician.appointments}</Typography></TableCell>
                          <TableCell align="right"><Typography variant="subtitle2" sx={{ color: BRAND }} fontWeight={700}>₹{clinician.revenue.toLocaleString()}</Typography></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        </Grid>
      </Grid>

      {/* TRANSACTIONS TABLE */}
      <Card elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: 3 }}>
        <Box p={3} borderBottom="1px solid #E2E8F0" display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="overline" fontWeight={700} color="text.secondary" letterSpacing={1}>Recent Transactions</Typography>
          </Box>
        </Box>
        <TableContainer>
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.6 }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.6 }}>Patient</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.6 }}>Clinician</TableCell>
                <TableCell sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.6 }}>Service</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.6 }}>Amount</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, color: 'text.secondary', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: 0.6 }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton /></TableCell><TableCell><Skeleton /></TableCell><TableCell><Skeleton /></TableCell>
                    <TableCell><Skeleton /></TableCell><TableCell><Skeleton /></TableCell><TableCell><Skeleton /></TableCell>
                  </TableRow>
                ))
              ) : transactions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((trx) => (
                <TableRow key={trx.id} hover>
                  <TableCell><Typography variant="body2">{dayjs(trx.createdAt).format('DD MMM YYYY, h:mm A')}</Typography></TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" gap={1.5}>
                      <Avatar src={`https://www.gravatar.com/avatar/${trx.appointment?.patient.id}?d=mp`} sx={{ width: 32, height: 32 }} />
                      <Typography variant="subtitle2" fontWeight={600}>{trx.appointment?.patient.firstName} {trx.appointment?.patient.lastName}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell><Typography variant="body2">{trx.appointment?.clinician.name}</Typography></TableCell>
                  <TableCell><Typography variant="body2" color="text.secondary">{trx.appointment?.product.name}</Typography></TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2" fontWeight={800} sx={{ color: (trx.status === 'succeeded' || trx.status === 'paid') ? BRAND : 'text.primary' }}>
                      ₹{trx.amount.toFixed(2)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <StitchStatusChip
                      label={trx.status === 'succeeded' ? 'Paid' : trx.status === 'failed' ? 'Failed' : trx.status}
                      statusType={trx.status === 'succeeded' ? 'paid' : trx.status}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5]}
          component="div"
          count={transactions.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
        />
      </Card>

    </Box>
  );
}

// SUG-DASH-004: wrap page in ErrorBoundary, consistent with Availability/Blocks/Billing modules
export default function ManagerDashboard() {
  return (
    <ErrorBoundary>
      <ManagerDashboardInner />
    </ErrorBoundary>
  );
}
