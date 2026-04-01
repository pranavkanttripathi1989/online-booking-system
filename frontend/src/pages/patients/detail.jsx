import { useState } from 'react'
import dayjs from 'dayjs'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import {
  Box, Button, Avatar, Typography, Chip, Tabs, Tab, Grid, Card, CardContent,
  Stack, Divider, IconButton, Tooltip, Paper, Table, TableBody, TableCell,
  TableHead, TableRow, LinearProgress, Badge,
} from '@mui/material'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import EditRoundedIcon from '@mui/icons-material/EditRounded'
import MessageRoundedIcon from '@mui/icons-material/MessageRounded'
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded'
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded'
import EmailRoundedIcon from '@mui/icons-material/EmailRounded'
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import MedicalServicesRoundedIcon from '@mui/icons-material/MedicalServicesRounded'
import ScienceRoundedIcon from '@mui/icons-material/ScienceRounded'
import FolderRoundedIcon from '@mui/icons-material/FolderRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded'
import CancelRoundedIcon from '@mui/icons-material/CancelRounded'

// ─── Mock patients (BUG-004 fix: keyed by id so URL param resolves correctly) ─
// Supports both 'pt-1'..'pt-5' (clinician patients list) and '1'..'5' (admin list)
const MOCK_PATIENTS_DETAIL = {
  'pt-1': { id: 'pt-1', full_name: 'Alice Thompson',   email: 'alice.thompson@gmail.com',       phone: '+1 555-1001', date_of_birth: '1985-03-12', gender: 'female', blood_type: 'A+',  allergies: ['None'],         address: '12 Oak Avenue, Boston, MA 02101',            emergency_contact: 'Bob Thompson — +1 555-2001',  primary_clinician: 'Dr. Sarah Mitchell', status: 'active',   total_visits: 6,  last_visit: '2026-03-05', outstanding_balance: 0,   notes: 'Patient has controlled hypertension on medication.' },
  'pt-2': { id: 'pt-2', full_name: 'Marcus Chen',      email: 'marcus.chen@outlook.com',        phone: '+1 555-1002', date_of_birth: '1990-07-25', gender: 'male',   blood_type: 'B+',  allergies: ['Dust'],         address: '45 Pine Street, San Francisco, CA 94101',    emergency_contact: 'Lin Chen — +1 555-2002',      primary_clinician: 'Dr. Sarah Mitchell', status: 'active',   total_visits: 3,  last_visit: '2026-02-18', outstanding_balance: 50,  notes: 'Patient uses inhaler for asthma management.' },
  'pt-3': { id: 'pt-3', full_name: 'Fatima Al-Hassan', email: 'fatima.alhassan@email.com',      phone: '+1 555-1003', date_of_birth: '1978-11-04', gender: 'female', blood_type: 'O+',  allergies: ['Insulin'],      address: '78 Birch Road, Chicago, IL 60601',           emergency_contact: 'Omar Al-Hassan — +1 555-2003', primary_clinician: 'Dr. Sarah Mitchell', status: 'new',      total_visits: 1,  last_visit: '2026-03-01', outstanding_balance: 200, notes: 'Newly diagnosed with Type 2 Diabetes. Lifestyle changes recommended.' },
  'pt-4': { id: 'pt-4', full_name: 'George Williams',  email: 'george.williams@btinternet.com', phone: '+1 555-1004', date_of_birth: '1962-05-18', gender: 'male',   blood_type: 'AB-', allergies: ['Aspirin'],       address: '22 Elm Drive, New York, NY 10001',           emergency_contact: 'Mary Williams — +1 555-2004', primary_clinician: 'Dr. Sarah Mitchell', status: 'active',   total_visits: 8,  last_visit: '2026-01-14', outstanding_balance: 75,  notes: 'On statin therapy for high cholesterol. Regular follow-ups needed.' },
  'pt-5': { id: 'pt-5', full_name: 'Sophie Turner',    email: 'sophie.turner@gmail.com',        phone: '+1 555-1005', date_of_birth: '1995-09-30', gender: 'female', blood_type: 'O-',  allergies: ['None'],         address: '9 Maple Lane, Austin, TX 73301',             emergency_contact: 'James Turner — +1 555-2005',  primary_clinician: 'Dr. Sarah Mitchell', status: 'inactive', total_visits: 2,  last_visit: '2025-12-10', outstanding_balance: 0,   notes: 'Patient has not attended in 3+ months. Outreach recommended.' },
  // Aliases for numeric IDs used by admin patients list (all 15 — BUG-PAT-001 fix)
  '1':  { id: '1',  full_name: 'Alice Johnson',   email: 'alice@email.com',   phone: '+1 555-1001', date_of_birth: '1992-05-12', gender: 'female', blood_type: 'A+',  allergies: ['Penicillin', 'Pollen'],  address: '142 Maple Street, Springfield, IL 62701',  emergency_contact: 'Jane Johnson — +1 555-9876',     primary_clinician: 'Dr. Jane Smith',    status: 'active',   total_visits: 14, last_visit: '2026-02-28', outstanding_balance: 120, notes: 'Patient prefers morning appointments. Has mild anxiety.' },
  '2':  { id: '2',  full_name: 'Bob Smith',        email: 'bob@email.com',     phone: '+1 555-1002', date_of_birth: '1979-11-30', gender: 'male',   blood_type: 'B+',  allergies: [],                         address: '88 River Road, Austin, TX 78701',           emergency_contact: 'Alice Smith — +1 555-8765',       primary_clinician: 'Dr. Carlos Vega',   status: 'active',   total_visits: 7,  last_visit: '2026-01-15', outstanding_balance: 0,   notes: '' },
  '3':  { id: '3',  full_name: 'Carlos Reyes',     email: 'carlos@email.com',  phone: '+1 555-1003', date_of_birth: '1985-03-22', gender: 'male',   blood_type: 'O+',  allergies: ['Dust'],                   address: '55 Oak Lane, Chicago, IL 60601',            emergency_contact: 'Maria Reyes — +1 555-3003',       primary_clinician: 'Dr. Jane Smith',    status: 'active',   total_visits: 5,  last_visit: '2026-01-20', outstanding_balance: 0,   notes: '' },
  '4':  { id: '4',  full_name: 'Diana Prince',     email: 'diana@email.com',   phone: '+1 555-1004', date_of_birth: '1990-07-18', gender: 'female', blood_type: 'AB+', allergies: ['Aspirin'],                address: '12 Queen St, New York, NY 10001',           emergency_contact: 'Steve Prince — +1 555-4004',      primary_clinician: 'Dr. Amara Patel',   status: 'active',   total_visits: 3,  last_visit: '2026-02-10', outstanding_balance: 50,  notes: 'Allergic to aspirin — document carefully.' },
  '5':  { id: '5',  full_name: 'Ethan Hunt',       email: 'ethan@email.com',   phone: '+1 555-1005', date_of_birth: '1987-09-01', gender: 'male',   blood_type: 'O-',  allergies: ['None'],                   address: '7 Mission Road, Los Angeles, CA 90001',     emergency_contact: 'Claire Hunt — +1 555-5005',       primary_clinician: 'Dr. Carlos Vega',   status: 'active',   total_visits: 9,  last_visit: '2026-03-01', outstanding_balance: 0,   notes: '' },
  '6':  { id: '6',  full_name: 'Fiona Green',      email: 'fiona@email.com',   phone: '+1 555-1006', date_of_birth: '1995-01-14', gender: 'female', blood_type: 'A-',  allergies: ['Pollen'],                 address: '14 Elm Drive, Seattle, WA 98101',           emergency_contact: 'Tom Green — +1 555-6006',         primary_clinician: 'Dr. Jane Smith',    status: 'new',      total_visits: 1,  last_visit: '2026-03-10', outstanding_balance: 0,   notes: 'New patient — first visit.' },
  '7':  { id: '7',  full_name: 'George Miller',    email: 'george@email.com',  phone: '+1 555-1007', date_of_birth: '1968-04-09', gender: 'male',   blood_type: 'B-',  allergies: ['Penicillin'],             address: '9 High Street, Boston, MA 02101',           emergency_contact: 'Helen Miller — +1 555-7007',      primary_clinician: 'Dr. Amara Patel',   status: 'active',   total_visits: 22, last_visit: '2026-01-08', outstanding_balance: 200, notes: 'Long-term patient. On statins for cholesterol.' },
  '8':  { id: '8',  full_name: 'Hannah Brown',     email: 'hannah@email.com',  phone: '+1 555-1008', date_of_birth: '2001-12-25', gender: 'female', blood_type: 'O+',  allergies: ['Latex'],                  address: '3 Park Crescent, Miami, FL 33101',          emergency_contact: 'David Brown — +1 555-8008',       primary_clinician: 'Dr. Carlos Vega',   status: 'active',   total_visits: 4,  last_visit: '2026-02-20', outstanding_balance: 0,   notes: '' },
  '9':  { id: '9',  full_name: 'Ivan Petrov',      email: 'ivan@email.com',    phone: '+1 555-1009', date_of_birth: '1983-06-30', gender: 'male',   blood_type: 'AB-', allergies: ['None'],                   address: '21 Pine Ave, Denver, CO 80201',             emergency_contact: 'Olga Petrov — +1 555-9009',       primary_clinician: 'Dr. Jane Smith',    status: 'inactive', total_visits: 6,  last_visit: '2025-11-15', outstanding_balance: 0,   notes: 'No recent visits.' },
  '10': { id: '10', full_name: 'Julia Roberts',    email: 'julia@email.com',   phone: '+1 555-1010', date_of_birth: '1993-02-17', gender: 'female', blood_type: 'A+',  allergies: ['Nuts'],                   address: '67 Cedar Road, Phoenix, AZ 85001',          emergency_contact: 'Mark Roberts — +1 555-1010',      primary_clinician: 'Dr. Amara Patel',   status: 'active',   total_visits: 11, last_visit: '2026-03-05', outstanding_balance: 75,  notes: 'Nut allergy — epipen prescribed.' },
  '11': { id: '11', full_name: 'Kevin Chen',       email: 'kevin@email.com',   phone: '+1 555-1011', date_of_birth: '1977-08-05', gender: 'male',   blood_type: 'B+',  allergies: ['None'],                   address: '34 Birch Blvd, Portland, OR 97201',         emergency_contact: 'Mei Chen — +1 555-1011',          primary_clinician: 'Dr. Carlos Vega',   status: 'active',   total_visits: 8,  last_visit: '2026-02-14', outstanding_balance: 0,   notes: '' },
  '12': { id: '12', full_name: 'Laura Martinez',   email: 'laura@email.com',   phone: '+1 555-1012', date_of_birth: '1998-10-20', gender: 'female', blood_type: 'O+',  allergies: ['Penicillin'],             address: '56 Walnut Way, San Diego, CA 92101',        emergency_contact: 'Jose Martinez — +1 555-1012',     primary_clinician: 'Dr. Jane Smith',    status: 'active',   total_visits: 2,  last_visit: '2026-01-29', outstanding_balance: 0,   notes: '' },
  '13': { id: '13', full_name: 'Michael Wang',     email: 'michael@email.com', phone: '+1 555-1013', date_of_birth: '1972-03-15', gender: 'male',   blood_type: 'A-',  allergies: ['Shellfish'],              address: '88 Sycamore St, Dallas, TX 75201',          emergency_contact: 'Linda Wang — +1 555-1013',        primary_clinician: 'Dr. Amara Patel',   status: 'active',   total_visits: 17, last_visit: '2026-02-05', outstanding_balance: 100, notes: 'Shellfish allergy. Regular checkups for hypertension.' },
  '14': { id: '14', full_name: 'Nina Patel',       email: 'nina@email.com',    phone: '+1 555-1014', date_of_birth: '1989-07-28', gender: 'female', blood_type: 'B+',  allergies: ['None'],                   address: '11 Rosewood Ct, Atlanta, GA 30301',         emergency_contact: 'Raj Patel — +1 555-1014',         primary_clinician: 'Dr. Carlos Vega',   status: 'active',   total_visits: 5,  last_visit: '2026-03-08', outstanding_balance: 0,   notes: '' },
  '15': { id: '15', full_name: 'Oscar Kim',        email: 'oscar@email.com',   phone: '+1 555-1015', date_of_birth: '1994-11-11', gender: 'male',   blood_type: 'O+',  allergies: ['Pollen'],                 address: '77 Magnolia Ave, San Jose, CA 95101',       emergency_contact: 'Sarah Kim — +1 555-1015',         primary_clinician: 'Dr. Jane Smith',    status: 'active',   total_visits: 3,  last_visit: '2026-02-25', outstanding_balance: 0,   notes: '' },
};

// Default fallback for IDs not matched
const MOCK_PATIENT_DEFAULT = {
  id: 'demo', full_name: 'John Michael Doe', email: 'john.doe@email.com',
  phone: '+1 (555) 234-5678', date_of_birth: '1989-04-15',
  gender: 'male', blood_type: 'O+', allergies: ['Penicillin', 'Pollen'],
  address: '142 Maple Street, Springfield, IL 62701, USA',
  emergency_contact: 'Jane Doe — +1 (555) 987-6543',
  primary_clinician: 'Dr. Jane Smith', status: 'active',
  total_visits: 14, last_visit: '2026-02-28', outstanding_balance: 120,
  notes: 'Patient prefers morning appointments. Has mild anxiety — handle with care.',
};



const MOCK_HISTORY = [
  { date: '2026-02-28', clinician: 'Dr. Jane Smith', service: 'Consultation', diagnosis: 'Seasonal allergy flare-up', notes: 'Prescribed antihistamines for 2 weeks.' },
  { date: '2026-01-10', clinician: 'Dr. Carlos Vega', service: 'Blood Test', diagnosis: 'Routine check', notes: 'All values within normal range.' },
  { date: '2025-11-22', clinician: 'Dr. Jane Smith', service: 'Consultation', diagnosis: 'Mild hypertension (Stage 1)', notes: 'Lifestyle changes recommended. Follow-up in 3 months.' },
  { date: '2025-09-05', clinician: 'Dr. Amara Patel', service: 'X-Ray', diagnosis: 'No abnormalities detected', notes: 'Chest X-ray was clear.' },
]

const MOCK_APPOINTMENTS = [
  { id: 'A1', date: '2026-03-18 10:00', clinician: 'Dr. Jane Smith', service: 'Consultation', status: 'confirmed' },
  { id: 'A2', date: '2026-02-28 09:00', clinician: 'Dr. Jane Smith', service: 'Follow-up', status: 'completed' },
  { id: 'A3', date: '2026-01-10 14:00', clinician: 'Dr. Carlos Vega', service: 'Blood Test', status: 'completed' },
  { id: 'A4', date: '2025-12-05 11:00', clinician: 'Dr. Jane Smith', service: 'Consultation', status: 'cancelled' },
]

const MOCK_TESTS = [
  { id: 'T1', name: 'Complete Blood Count', date: '2026-01-10', status: 'completed', ordered_by: 'Dr. Carlos Vega' },
  { id: 'T2', name: 'Blood Glucose', date: '2026-01-10', status: 'completed', ordered_by: 'Dr. Carlos Vega' },
  { id: 'T3', name: 'Chest X-Ray', date: '2025-09-05', status: 'completed', ordered_by: 'Dr. Amara Patel' },
  { id: 'T4', name: 'Allergy Panel', date: '2026-02-28', status: 'pending', ordered_by: 'Dr. Jane Smith' },
]

const STATUS_COLORS = { confirmed: 'success', completed: 'info', cancelled: 'error', pending: 'warning' }
const STATUS_ICONS = { confirmed: CheckCircleRoundedIcon, completed: CheckCircleRoundedIcon, cancelled: CancelRoundedIcon, pending: AccessTimeRoundedIcon }

function InfoRow({ label, value, icon: Icon }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start" sx={{ py: 1 }}>
      {Icon && <Icon sx={{ fontSize: '1rem', color: 'primary.main', mt: 0.3, flexShrink: 0 }} />}
      <Box>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.68rem' }}>{label}</Typography>
        <Typography variant="body2" fontWeight={500} sx={{ color: 'text.primary' }}>{value || '—'}</Typography>
      </Box>
    </Stack>
  )
}

function TabPanel({ value, index, children }) {
  return value === index ? <Box>{children}</Box> : null
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PatientDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const p = MOCK_PATIENTS_DETAIL[id] ?? MOCK_PATIENT_DEFAULT  // BUG-004 fix: look up by URL id

  const age = Math.floor((new Date() - new Date(p.date_of_birth)) / (365.25 * 24 * 3600 * 1000))

  return (
    <Box className="page-enter" sx={{ pb: 4 }}>
      <Helmet><title>{p.full_name} — MediBook</title></Helmet>

      {/* ── Back Button ──────────────────────────────────────────────────── */}
      <Button
        startIcon={<ArrowBackRoundedIcon />}
        onClick={() => navigate('/patients')}
        sx={{ mb: 2, textTransform: 'none', fontWeight: 600, color: 'text.secondary' }}
      >
        Back to Patients
      </Button>

      {/* ── Hero Header ──────────────────────────────────────────────────── */}
      <Card sx={{ borderRadius: 3, mb: 3, border: '1px solid #E2E8F0', boxShadow: 'none' }}>
        <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} sm="auto">
              <Badge
                overlap="circular"
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                badgeContent={<Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: p.status === 'active' ? '#0B7B5C' : '#94A3B8', border: '2px solid #fff' }} />}
              >
                <Avatar sx={{ width: 90, height: 90, bgcolor: 'primary.main', fontSize: '2rem', fontWeight: 800 }}>
                  {p.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </Avatar>
              </Badge>
            </Grid>
            <Grid item xs={12} sm>
              <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" mb={0.5}>
                <Typography variant="h5" fontWeight={800} sx={{ color: '#0D1B2E' }}>{p.full_name}</Typography>
                <Chip label={p.status} color={p.status === 'active' ? 'success' : 'default'} size="small" sx={{ fontWeight: 700, textTransform: 'capitalize' }} />
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
                {age} years · {p.gender} · Blood type: <strong>{p.blood_type}</strong> · ID: #{p.id}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip icon={<CalendarMonthRoundedIcon />} label={`${p.total_visits} Visits`} size="small" variant="outlined" />
                <Chip icon={<AccessTimeRoundedIcon />} label={`Last: ${dayjs(p.last_visit).format('DD/MM/YYYY')}`} size="small" variant="outlined" />
                {p.outstanding_balance > 0 && <Chip label={`$${p.outstanding_balance} Balance`} size="small" color="warning" />}
              </Stack>
            </Grid>
            <Grid item xs={12} sm="auto">
              <Stack direction={{ xs: 'row', sm: 'column' }} spacing={1}>
                <Button variant="contained" startIcon={<CalendarMonthRoundedIcon />} size="small" onClick={() => navigate('/appointments/new')} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}>New Appointment</Button>
                <Button variant="outlined" startIcon={<MessageRoundedIcon />} size="small" onClick={() => navigate('/messages')} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>Message</Button>
                <Button variant="outlined" startIcon={<EditRoundedIcon />} size="small" onClick={() => navigate(`/patients/${id}/edit`)} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>Edit Patient</Button>
              </Stack>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <Paper sx={{ borderRadius: 3, border: '1px solid #E2E8F0', boxShadow: 'none', overflow: 'hidden' }}>
        <Tabs
          value={tab} onChange={(_, v) => setTab(v)}
          sx={{ px: 2, borderBottom: '1px solid #E2E8F0', bgcolor: '#FAFBFC',
            '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, minHeight: 52, fontSize: '0.875rem' },
            '& .Mui-selected': { color: 'primary.main' },
            '& .MuiTabs-indicator': { bgcolor: 'primary.main', height: 3, borderRadius: 1.5 },
          }}
        >
          <Tab icon={<PersonRoundedIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Overview" />
          <Tab icon={<MedicalServicesRoundedIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Medical History" />
          <Tab icon={<CalendarMonthRoundedIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label={`Appointments (${MOCK_APPOINTMENTS.length})`} />
          <Tab icon={<ScienceRoundedIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Test Results" />
          <Tab icon={<FolderRoundedIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Documents" />
        </Tabs>

        <Box sx={{ p: { xs: 2, sm: 3 } }}>

          {/* ── Overview ─────────────────────────────────────────────────── */}
          <TabPanel value={tab} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem', mb: 1.5 }}>Personal Information</Typography>
                <InfoRow label="Date of Birth" value={`${dayjs(p.date_of_birth).format('DD/MM/YYYY')} (${age} years old)`} icon={AccessTimeRoundedIcon} />
                <InfoRow label="Gender" value={p.gender} icon={PersonRoundedIcon} />
                <InfoRow label="Blood Type" value={p.blood_type} icon={MedicalServicesRoundedIcon} />
                <InfoRow label="Allergies" value={p.allergies.join(', ')} icon={ScienceRoundedIcon} />
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem', mb: 1.5 }}>Contact</Typography>
                <InfoRow label="Phone" value={p.phone} icon={PhoneRoundedIcon} />
                <InfoRow label="Email" value={p.email} icon={EmailRoundedIcon} />
                <InfoRow label="Address" value={p.address} icon={LocationOnRoundedIcon} />
                <InfoRow label="Emergency Contact" value={p.emergency_contact} icon={PersonRoundedIcon} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem', mb: 1.5 }}>Clinical Notes</Typography>
                <Box sx={{ bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2, p: 2 }}>
                  <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.8 }}>{p.notes}</Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem', mb: 1.5 }}>Primary Clinician</Typography>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ width: 40, height: 40, bgcolor: '#0B7B5C', fontSize: '1rem', fontWeight: 700 }}>JS</Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={700}>{p.primary_clinician}</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>General Practitioner</Typography>
                  </Box>
                </Stack>
              </Grid>
            </Grid>
          </TabPanel>

          {/* ── Medical History ───────────────────────────────────────────── */}
          <TabPanel value={tab} index={1}>
            <Stack spacing={2}>
              {MOCK_HISTORY.map((h, i) => (
                <Box key={i} sx={{ borderLeft: '3px solid #1565C7', pl: 2.5, py: 0.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                    <Box>
                      <Typography variant="body2" fontWeight={700} sx={{ color: '#0D1B2E' }}>{h.diagnosis}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{h.clinician} · {h.service}</Typography>
                    </Box>
                    <Chip label={dayjs(h.date).format('DD/MM/YYYY')} size="small" variant="outlined" sx={{ fontSize: '0.72rem' }} />
                  </Stack>
                  <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.75, lineHeight: 1.7 }}>{h.notes}</Typography>
                </Box>
              ))}
            </Stack>
          </TabPanel>

          {/* ── Appointments ─────────────────────────────────────────────── */}
          <TabPanel value={tab} index={2}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', bgcolor: '#F8FAFC' } }}>
                  <TableCell>Date & Time</TableCell>
                  <TableCell>Clinician</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {MOCK_APPOINTMENTS.map((a) => {
                  const Icon = STATUS_ICONS[a.status] || CheckCircleRoundedIcon
                  return (
                    <TableRow key={a.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem' }}>{dayjs(a.date).format('DD/MM/YYYY, h:mm A')}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{a.clinician}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{a.service}</TableCell>
                      <TableCell><Chip icon={<Icon sx={{ fontSize: '0.85rem !important' }} />} label={a.status} color={STATUS_COLORS[a.status] || 'default'} size="small" sx={{ fontWeight: 700, textTransform: 'capitalize', fontSize: '0.72rem' }} /></TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TabPanel>

          {/* ── Test Results ────────────────────────────────────────────── */}
          <TabPanel value={tab} index={3}>
            <Stack spacing={2}>
              {MOCK_TESTS.map((t) => (
                <Card key={t.id} variant="outlined" sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
                  <CardContent sx={{ py: '12px !important', px: 2.5 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ScienceRoundedIcon sx={{ color: '#fff', fontSize: '1rem' }} />
                        </Box>
                        <Box>
                          <Typography variant="body2" fontWeight={700}>{t.name}</Typography>
                           <Typography variant="caption" sx={{ color: 'text.secondary' }}>Ordered by {t.ordered_by} · {dayjs(t.date).format('DD/MM/YYYY')}</Typography>
                        </Box>
                      </Stack>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label={t.status} color={STATUS_COLORS[t.status] || 'default'} size="small" sx={{ fontWeight: 700, textTransform: 'capitalize' }} />
                        {t.status === 'completed' && <Button size="small" variant="outlined" sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}>View Result</Button>}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </TabPanel>

          {/* ── Documents ───────────────────────────────────────────────── */}
          <TabPanel value={tab} index={4}>
            <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
              <FolderRoundedIcon sx={{ fontSize: '3rem', mb: 1.5, opacity: 0.3 }} />
              <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }}>No documents yet</Typography>
              <Typography variant="body2">Upload patient documents, prescriptions, and reports</Typography>
              <Button variant="outlined" sx={{ mt: 2.5, borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>Upload Document</Button>
            </Box>
          </TabPanel>

        </Box>
      </Paper>
    </Box>
  )
}
