import { useState, useRef } from 'react'
import dayjs from 'dayjs'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useSnackbar } from 'notistack'
import {
  Box, Button, Avatar, Typography, Chip, Tabs, Tab, Grid, Card, CardContent,
  Stack, Divider, IconButton, Tooltip, Paper, Table, TableBody, TableCell,
  TableHead, TableRow, LinearProgress, Badge, Dialog, DialogTitle, DialogContent,
  DialogActions, List, ListItem, ListItemIcon, ListItemText, Switch,
  FormControlLabel, TextField, MenuItem, RadioGroup, Radio, FormControl, FormLabel,
} from '@mui/material'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import GroupRoundedIcon from '@mui/icons-material/GroupRounded'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded'
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded'
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded'
import SendRoundedIcon from '@mui/icons-material/SendRounded'
import CardMembershipRoundedIcon from '@mui/icons-material/CardMembershipRounded'
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
import InsertDriveFileRoundedIcon from '@mui/icons-material/InsertDriveFileRounded'
import CloudUploadRoundedIcon from '@mui/icons-material/CloudUploadRounded'
import ForumRoundedIcon from '@mui/icons-material/ForumRounded'
import MarkEmailReadRoundedIcon from '@mui/icons-material/MarkEmailReadRounded'
import SmsRoundedIcon from '@mui/icons-material/SmsRounded'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'

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

// Communication preferences + related accounts (family linking) —
// requirements/semble-competitive-gap-analysis-requirements.md Phase 1
const DEFAULT_COMM_PREFS = { email: true, sms: true, whatsapp: false }
const RELATIONSHIP_TYPES = ['Parent/Guardian', 'Spouse', 'Child', 'Emergency Contact', 'Other']
const MOCK_RELATED_ACCOUNTS = {
  'pt-3': [{ id: 'rel-1', name: 'Omar Al-Hassan', relationship: 'Emergency Contact', phone: '+1 555-2003' }],
}

// Communication log — a sent-message HISTORY, distinct from the preference
// toggles above (Semble's `patientCommunication`/`patientCommunications` query
// is a separate object from communication preferences). requirements/semble-competitive-gap-analysis-requirements.md Patients table.
const COMM_CHANNELS = ['email', 'sms', 'whatsapp']
const COMM_TYPES = ['Appointment confirmation', 'Reminder', 'Marketing', 'Custom']
const DEFAULT_COMM_LOG = [
  { id: 'comm-1', channel: 'email', type: 'Appointment confirmation', subject: 'Your appointment is confirmed', sent_at: '2026-03-04T09:15:00Z', status: 'Delivered' },
  { id: 'comm-2', channel: 'sms',   type: 'Reminder',                 subject: 'Reminder: appointment tomorrow at 10:00 AM', sent_at: '2026-03-04T18:00:00Z', status: 'Delivered' },
]

// Structured allergy records — requirements/semble-competitive-gap-analysis-requirements.md
// Phase 2 flags this as a distinct clinical-safety record type (Semble's
// createAllergyRecord), not folded into generic free-text notes.
const SEVERITY_LEVELS = ['Mild', 'Moderate', 'Severe']
const SEVERITY_COLOR = { Mild: 'default', Moderate: 'warning', Severe: 'error' }
const ENCOUNTER_TYPES = ['Consultation', 'Follow-up', 'Telehealth', 'Procedure', 'Blood Test', 'Imaging']
// Document folders — a scoped-down version of Semble's PatientDocument folder
// hierarchy (parent-based nesting); flat categories here, not true nesting,
// per the sequencing note in requirements/semble-competitive-gap-analysis-requirements.md.
const DOCUMENT_FOLDERS = ['General', 'Lab Reports', 'Prescriptions', 'Imaging', 'Consent Forms']

// Minimal intake questionnaire — a scoped-down version of Semble's Questionnaire
// (title/sections/questions with styling/conditional logic); this is a single
// fixed section of common intake questions, not a form builder.
// requirements/semble-competitive-gap-analysis-requirements.md Phase 2
// Letters with a review/approval workflow before sharing — Semble's Letter
// object has an explicit reviewStatus gate, not a fire-and-send model.
// requirements/semble-competitive-gap-analysis-requirements.md Phase 3
const LETTER_REVIEW_STATUSES = ['Draft', 'Pending Review', 'Approved']
const LETTER_STATUS_COLOR = { Draft: 'default', 'Pending Review': 'warning', Approved: 'success' }

// Patient membership plans — distinct from the tenant's own SubscriptionPlans
// (that's MediBook's SaaS plan; this is the *patient's* recurring plan with
// the clinic, e.g. a monthly wellness membership). A real monetization lever,
// not just parity. requirements/semble-competitive-gap-analysis-requirements.md Phase 4
const MEMBERSHIP_PLANS = [
  { id: 'none', name: 'No membership', price_monthly: 0 },
  { id: 'basic', name: 'Wellness Basic', price_monthly: 49900 }, // paise
  { id: 'premium', name: 'Wellness Premium', price_monthly: 149900 },
]

const INTAKE_QUESTIONS = [
  { id: 'q_conditions', label: 'Do you have any pre-existing medical conditions?', type: 'yesno' },
  { id: 'q_conditions_detail', label: 'If yes, please describe', type: 'text' },
  { id: 'q_medications', label: 'Are you currently taking any medications?', type: 'yesno' },
  { id: 'q_medications_detail', label: 'If yes, please list them', type: 'text' },
  { id: 'q_surgeries', label: 'Have you had any surgeries in the past 5 years?', type: 'yesno' },
  { id: 'q_smoker', label: 'Do you currently smoke?', type: 'yesno' },
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
  const { enqueueSnackbar } = useSnackbar()
  const [tab, setTab] = useState(0)
  const p = MOCK_PATIENTS_DETAIL[id] ?? MOCK_PATIENT_DEFAULT  // BUG-004 fix: look up by URL id

  // SUG-PT-003 / SUG-PAT-013: "View Result" dialog state
  const [viewResult, setViewResult] = useState(null)

  // SUG-PT-004 / SUG-PAT-014: Upload Document — hidden file input + local doc list
  const fileInputRef = useRef(null)
  const [uploadedDocs, setUploadedDocs] = useState([])
  const [uploadFolder, setUploadFolder] = useState(DOCUMENT_FOLDERS[0])
  const [docFolderFilter, setDocFolderFilter] = useState('All')
  const handleFileSelected = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedDocs((prev) => [...prev, { id: `doc-${Date.now()}`, name: file.name, size: file.size, uploadedAt: new Date().toISOString(), folder: uploadFolder }])
      enqueueSnackbar(`"${file.name}" uploaded to ${uploadFolder} (demo mode)`, { variant: 'success' })
    }
    e.target.value = '' // allow re-selecting the same file
  }
  const visibleDocs = docFolderFilter === 'All' ? uploadedDocs : uploadedDocs.filter((d) => d.folder === docFolderFilter)

  // Communication preferences (email/SMS/WhatsApp consent — also a DPDP Act
  // consent-tracking requirement, not just UX; requirements/semble-competitive-gap-analysis-requirements.md Phase 1)
  const [commPrefs, setCommPrefs] = useState(DEFAULT_COMM_PREFS)
  const toggleCommPref = (channel) => setCommPrefs((prev) => ({ ...prev, [channel]: !prev[channel] }))

  // Communication log — sent-message history (Semble patientCommunication(s) parity)
  const [commLog, setCommLog] = useState(DEFAULT_COMM_LOG)
  const [sendMessageOpen, setSendMessageOpen] = useState(false)
  const [newMessage, setNewMessage] = useState({ channel: 'email', type: COMM_TYPES[3], subject: '' })
  const sendCommunication = () => {
    if (!newMessage.subject.trim()) return
    setCommLog((prev) => [
      { id: `comm-${Date.now()}`, ...newMessage, sent_at: new Date().toISOString(), status: 'Sent' },
      ...prev,
    ])
    setNewMessage({ channel: 'email', type: COMM_TYPES[3], subject: '' })
    setSendMessageOpen(false)
    enqueueSnackbar('Message sent (demo mode)', { variant: 'success' })
  }

  // Related accounts (family/guardian linking)
  const [relatedAccounts, setRelatedAccounts] = useState(MOCK_RELATED_ACCOUNTS[id] ?? [])
  const [addRelatedOpen, setAddRelatedOpen] = useState(false)
  const [newRelated, setNewRelated] = useState({ name: '', relationship: RELATIONSHIP_TYPES[0], phone: '' })
  const addRelatedAccount = () => {
    if (!newRelated.name.trim()) return
    setRelatedAccounts((prev) => [...prev, { id: `rel-${Date.now()}`, ...newRelated }])
    setNewRelated({ name: '', relationship: RELATIONSHIP_TYPES[0], phone: '' })
    setAddRelatedOpen(false)
    enqueueSnackbar('Related account added', { variant: 'success' })
  }
  const removeRelatedAccount = (relId) => setRelatedAccounts((prev) => prev.filter((r) => r.id !== relId))

  // Structured allergy records (distinct from generic clinical notes — see
  // requirements/semble-competitive-gap-analysis-requirements.md Phase 2)
  const [allergyRecords, setAllergyRecords] = useState(() =>
    (p.allergies ?? []).filter((a) => a && a.toLowerCase() !== 'none').map((allergen, i) => ({
      id: `allergy-${i}`, allergen, severity: 'Moderate', reaction: '', recorded_at: p.last_visit ?? null,
    }))
  )
  const [addAllergyOpen, setAddAllergyOpen] = useState(false)
  const [newAllergy, setNewAllergy] = useState({ allergen: '', severity: 'Moderate', reaction: '' })
  const addAllergyRecord = () => {
    if (!newAllergy.allergen.trim()) return
    setAllergyRecords((prev) => [...prev, { id: `allergy-${Date.now()}`, ...newAllergy, recorded_at: new Date().toISOString() }])
    setNewAllergy({ allergen: '', severity: 'Moderate', reaction: '' })
    setAddAllergyOpen(false)
    enqueueSnackbar('Allergy record added', { variant: 'success' })
  }
  const removeAllergyRecord = (allergyId) => setAllergyRecords((prev) => prev.filter((a) => a.id !== allergyId))

  // Diagnoses — ongoing-condition tracking, distinct from a single
  // consultation's notes; requirements/semble-competitive-gap-analysis-requirements.md Phase 2
  const [diagnoses, setDiagnoses] = useState([])
  const [addDiagnosisOpen, setAddDiagnosisOpen] = useState(false)
  const [newDiagnosis, setNewDiagnosis] = useState({ condition: '', status: 'Active', diagnosed_date: '' })
  const addDiagnosis = () => {
    if (!newDiagnosis.condition.trim()) return
    setDiagnoses((prev) => [...prev, { id: `dx-${Date.now()}`, ...newDiagnosis, diagnosed_date: newDiagnosis.diagnosed_date || new Date().toISOString() }])
    setNewDiagnosis({ condition: '', status: 'Active', diagnosed_date: '' })
    setAddDiagnosisOpen(false)
    enqueueSnackbar('Diagnosis added', { variant: 'success' })
  }
  const removeDiagnosis = (dxId) => setDiagnoses((prev) => prev.filter((d) => d.id !== dxId))

  // Intake questionnaire — local state only, submitted once
  const [intakeAnswers, setIntakeAnswers] = useState({})
  const [intakeSubmitted, setIntakeSubmitted] = useState(false)
  const [intakeSubmittedAt, setIntakeSubmittedAt] = useState(null)
  const setIntakeAnswer = (qId, value) => setIntakeAnswers((prev) => ({ ...prev, [qId]: value }))
  const submitIntake = () => {
    setIntakeSubmitted(true)
    setIntakeSubmittedAt(new Date().toISOString())
    enqueueSnackbar('Intake questionnaire submitted', { variant: 'success' })
  }
  const resetIntake = () => { setIntakeSubmitted(false); setIntakeAnswers({}) }

  // Letters with review/approval workflow
  const [letters, setLetters] = useState([])
  const [addLetterOpen, setAddLetterOpen] = useState(false)
  const [newLetter, setNewLetter] = useState({ title: '', body: '' })
  const addLetter = () => {
    if (!newLetter.title.trim()) return
    setLetters((prev) => [
      { id: `letter-${Date.now()}`, ...newLetter, review_status: 'Draft', date: new Date().toISOString(), dateShared: null },
      ...prev,
    ])
    setNewLetter({ title: '', body: '' })
    setAddLetterOpen(false)
    enqueueSnackbar('Letter drafted', { variant: 'success' })
  }
  const advanceLetterStatus = (letterId) => {
    setLetters((prev) => prev.map((l) => {
      if (l.id !== letterId) return l
      const idx = LETTER_REVIEW_STATUSES.indexOf(l.review_status)
      return { ...l, review_status: LETTER_REVIEW_STATUSES[Math.min(idx + 1, LETTER_REVIEW_STATUSES.length - 1)] }
    }))
  }
  const shareLetter = (letterId) => {
    setLetters((prev) => prev.map((l) => l.id === letterId ? { ...l, dateShared: new Date().toISOString() } : l))
    enqueueSnackbar('Letter shared with patient', { variant: 'success' })
  }

  // Patient membership
  const [membershipId, setMembershipId] = useState('none')
  const [membershipDialogOpen, setMembershipDialogOpen] = useState(false)
  const membership = MEMBERSHIP_PLANS.find((m) => m.id === membershipId)
  const formatInr = (paise) => `₹${(paise / 100).toLocaleString('en-IN')}`

  // Consultation records — requirements/semble-competitive-gap-analysis-requirements.md
  // Phase 2 (mirrors Semble's Consultation: id/patient/date/encounterType/doctorName/records)
  const [consultations, setConsultations] = useState(MOCK_HISTORY)
  const [addConsultationOpen, setAddConsultationOpen] = useState(false)
  const [newConsultation, setNewConsultation] = useState({ encounter_type: ENCOUNTER_TYPES[0], diagnosis: '', notes: '' })
  const addConsultation = () => {
    if (!newConsultation.diagnosis.trim()) return
    setConsultations((prev) => [
      { date: new Date().toISOString(), clinician: p.primary_clinician, service: newConsultation.encounter_type, diagnosis: newConsultation.diagnosis, notes: newConsultation.notes },
      ...prev,
    ])
    setNewConsultation({ encounter_type: ENCOUNTER_TYPES[0], diagnosis: '', notes: '' })
    setAddConsultationOpen(false)
    enqueueSnackbar('Consultation record added', { variant: 'success' })
  }

  // SUG-PT-006 / SUG-PAT-012: Derive clinician initials instead of hardcoded "JS"
  const clinicianInitials = p.primary_clinician
    ? p.primary_clinician.replace(/^Dr\.?\s*/i, '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '—'

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
                <Chip
                  icon={<CardMembershipRoundedIcon />}
                  label={membership.id === 'none' ? 'No membership' : `${membership.name} · ${formatInr(membership.price_monthly)}/mo`}
                  size="small" variant={membership.id === 'none' ? 'outlined' : 'filled'}
                  color={membership.id === 'none' ? 'default' : 'primary'}
                  onClick={() => setMembershipDialogOpen(true)}
                  sx={{ cursor: 'pointer', fontWeight: 700 }}
                />
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
          <Tab icon={<AssignmentRoundedIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label="Intake Form" />
          <Tab icon={<DescriptionRoundedIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label={`Letters (${letters.length})`} />
          <Tab icon={<ForumRoundedIcon sx={{ fontSize: '1rem' }} />} iconPosition="start" label={`Communication Log (${commLog.length})`} />
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
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1, mb: 0.75 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.68rem' }}>Allergies</Typography>
                  <Button size="small" startIcon={<AddRoundedIcon />} onClick={() => setAddAllergyOpen(true)} sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.72rem', minWidth: 0, py: 0 }}>Add</Button>
                </Stack>
                {allergyRecords.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>No known allergies recorded.</Typography>
                ) : (
                  <Stack spacing={0.75} sx={{ mb: 1 }}>
                    {allergyRecords.map((a) => (
                      <Stack key={a.id} direction="row" alignItems="center" spacing={1} sx={{ bgcolor: a.severity === 'Severe' ? '#FEF2F2' : '#F8FAFC', border: '1px solid', borderColor: a.severity === 'Severe' ? '#FCA5A5' : '#E2E8F0', borderRadius: 2, p: 1 }}>
                        {a.severity === 'Severe' && <WarningAmberRoundedIcon sx={{ color: 'error.main', fontSize: '1rem' }} aria-label="Severe allergy" />}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={700}>{a.allergen}</Typography>
                          {a.reaction && <Typography variant="caption" color="text.secondary">{a.reaction}</Typography>}
                        </Box>
                        <Chip label={a.severity} size="small" color={SEVERITY_COLOR[a.severity]} sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20 }} />
                        <IconButton size="small" onClick={() => removeAllergyRecord(a.id)} aria-label={`Remove ${a.allergen} allergy record`}>
                          <DeleteRoundedIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ))}
                  </Stack>
                )}
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem', mb: 1.5 }}>Contact</Typography>
                <InfoRow label="Phone" value={p.phone} icon={PhoneRoundedIcon} />
                <InfoRow label="Email" value={p.email} icon={EmailRoundedIcon} />
                <InfoRow label="Address" value={p.address} icon={LocationOnRoundedIcon} />
                <InfoRow label="Emergency Contact" value={p.emergency_contact} icon={PersonRoundedIcon} />
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem', mb: 1.5 }}>Communication Preferences</Typography>
                <Stack spacing={0.5}>
                  <FormControlLabel control={<Switch size="small" checked={commPrefs.email} onChange={() => toggleCommPref('email')} />} label={<Typography variant="body2">Email reminders & updates</Typography>} />
                  <FormControlLabel control={<Switch size="small" checked={commPrefs.sms} onChange={() => toggleCommPref('sms')} />} label={<Typography variant="body2">SMS reminders</Typography>} />
                  <FormControlLabel control={<Switch size="small" checked={commPrefs.whatsapp} onChange={() => toggleCommPref('whatsapp')} />} label={<Typography variant="body2">WhatsApp messages</Typography>} />
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem' }}>Related Accounts</Typography>
                  <Button size="small" startIcon={<AddRoundedIcon />} onClick={() => setAddRelatedOpen(true)} sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}>Add</Button>
                </Stack>
                {relatedAccounts.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No related accounts (e.g. parent, guardian, emergency contact) linked yet.</Typography>
                ) : (
                  <Stack spacing={1}>
                    {relatedAccounts.map((rel) => (
                      <Stack key={rel.id} direction="row" alignItems="center" spacing={1.5} sx={{ bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2, p: 1.25 }}>
                        <GroupRoundedIcon sx={{ color: 'text.disabled', fontSize: '1.1rem' }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={700}>{rel.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{rel.relationship}{rel.phone ? ` · ${rel.phone}` : ''}</Typography>
                        </Box>
                        <IconButton size="small" onClick={() => removeRelatedAccount(rel.id)} aria-label={`Remove related account ${rel.name}`}>
                          <DeleteRoundedIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ))}
                  </Stack>
                )}
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem', mb: 1.5 }}>Clinical Notes</Typography>
                <Box sx={{ bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2, p: 2 }}>
                  <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.8 }}>{p.notes}</Typography>
                </Box>
                <Divider sx={{ my: 2 }} />

                {/* Diagnoses — distinct, ongoing-condition tracking, not folded
                    into a single consultation's notes (Semble's WorkingDiagnosis
                    concept); requirements/semble-competitive-gap-analysis-requirements.md Phase 2 */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                  <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem' }}>Diagnoses</Typography>
                  <Button size="small" startIcon={<AddRoundedIcon />} onClick={() => setAddDiagnosisOpen(true)} sx={{ textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}>Add</Button>
                </Stack>
                {diagnoses.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No diagnoses recorded.</Typography>
                ) : (
                  <Stack spacing={1} sx={{ mb: 1 }}>
                    {diagnoses.map((dx) => (
                      <Stack key={dx.id} direction="row" alignItems="center" spacing={1.5} sx={{ bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2, p: 1.25 }}>
                        <MedicalServicesRoundedIcon sx={{ color: 'text.disabled', fontSize: '1.1rem' }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={700}>{dx.condition}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Diagnosed {dx.diagnosed_date ? dayjs(dx.diagnosed_date).format('DD/MM/YYYY') : '—'}
                          </Typography>
                        </Box>
                        <Chip label={dx.status} size="small" color={dx.status === 'Active' ? 'warning' : 'success'} sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20, textTransform: 'capitalize' }} />
                        <IconButton size="small" onClick={() => removeDiagnosis(dx.id)} aria-label={`Remove ${dx.condition} diagnosis`}>
                          <DeleteRoundedIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ))}
                  </Stack>
                )}
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={800} sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.72rem', mb: 1.5 }}>Primary Clinician</Typography>
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Avatar sx={{ width: 40, height: 40, bgcolor: '#0B7B5C', fontSize: '1rem', fontWeight: 700 }}>{clinicianInitials}</Avatar>
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
            <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
              <Button size="small" variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => setAddConsultationOpen(true)} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
                Add Consultation Record
              </Button>
            </Stack>
            <Stack spacing={2}>
              {consultations.map((h, i) => (
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
                        {t.status === 'completed' && (
                          <Button
                            size="small" variant="outlined"
                            onClick={() => setViewResult(t)}
                            sx={{ borderRadius: 1.5, textTransform: 'none', fontWeight: 700, fontSize: '0.75rem' }}
                          >
                            View Result
                          </Button>
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          </TabPanel>

          {/* ── Documents ───────────────────────────────────────────────── */}
          <TabPanel value={tab} index={4}>
            <input
              ref={fileInputRef}
              type="file"
              hidden
              onChange={handleFileSelected}
              data-testid="document-upload-input"
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1.5} sx={{ mb: 2 }}>
              <TextField
                select size="small" label="Filter by folder" value={docFolderFilter}
                onChange={(e) => setDocFolderFilter(e.target.value)}
                sx={{ minWidth: 180 }}
              >
                <MenuItem value="All">All folders</MenuItem>
                {DOCUMENT_FOLDERS.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
              </TextField>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  select size="small" label="Upload to" value={uploadFolder}
                  onChange={(e) => setUploadFolder(e.target.value)}
                  sx={{ minWidth: 160 }}
                >
                  {DOCUMENT_FOLDERS.map((f) => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                </TextField>
                <Button
                  variant="outlined"
                  startIcon={<CloudUploadRoundedIcon />}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, whiteSpace: 'nowrap' }}
                >
                  Upload Document
                </Button>
              </Stack>
            </Stack>

            {visibleDocs.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                <FolderRoundedIcon sx={{ fontSize: '3rem', mb: 1.5, opacity: 0.3 }} />
                <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }}>
                  {docFolderFilter === 'All' ? 'No documents yet' : `No documents in ${docFolderFilter}`}
                </Typography>
                <Typography variant="body2">Upload patient documents, prescriptions, and reports</Typography>
              </Box>
            ) : (
              <List sx={{ border: '1px solid #E2E8F0', borderRadius: 2, p: 0 }}>
                {visibleDocs.map((d, i) => (
                  <ListItem key={d.id} divider={i !== visibleDocs.length - 1}>
                    <ListItemIcon><InsertDriveFileRoundedIcon sx={{ color: 'primary.main' }} /></ListItemIcon>
                    <ListItemText
                      primary={d.name}
                      secondary={`${d.folder ?? 'General'} · ${(d.size / 1024).toFixed(1)} KB · Uploaded ${dayjs(d.uploadedAt).format('DD/MM/YYYY HH:mm')}`}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </TabPanel>

          {/* ── Intake Form ─────────────────────────────────────────────── */}
          <TabPanel value={tab} index={5}>
            {intakeSubmitted ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <CheckCircleRoundedIcon sx={{ fontSize: '3rem', color: 'success.main', mb: 1.5 }} />
                <Typography variant="body1" fontWeight={700} sx={{ mb: 0.5 }}>Intake form submitted</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                  {intakeSubmittedAt ? dayjs(intakeSubmittedAt).format('DD/MM/YYYY HH:mm') : ''}
                </Typography>
                <Button variant="outlined" onClick={resetIntake} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
                  Edit responses
                </Button>
              </Box>
            ) : (
              <Stack spacing={3} sx={{ maxWidth: 520 }}>
                <Typography variant="body2" color="text.secondary">
                  Standard pre-consultation intake questions. Responses are saved to the patient record.
                </Typography>
                {INTAKE_QUESTIONS.map((q) => (
                  <Box key={q.id}>
                    {q.type === 'yesno' ? (
                      <FormControl>
                        <FormLabel sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'text.primary' }}>{q.label}</FormLabel>
                        <RadioGroup row value={intakeAnswers[q.id] ?? ''} onChange={(e) => setIntakeAnswer(q.id, e.target.value)}>
                          <FormControlLabel value="yes" control={<Radio size="small" />} label="Yes" />
                          <FormControlLabel value="no" control={<Radio size="small" />} label="No" />
                        </RadioGroup>
                      </FormControl>
                    ) : (
                      <TextField
                        label={q.label} fullWidth size="small" multiline rows={2}
                        value={intakeAnswers[q.id] ?? ''}
                        onChange={(e) => setIntakeAnswer(q.id, e.target.value)}
                      />
                    )}
                  </Box>
                ))}
                <Button variant="contained" onClick={submitIntake} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, alignSelf: 'flex-start' }}>
                  Submit Intake Form
                </Button>
              </Stack>
            )}
          </TabPanel>

          {/* ── Letters ──────────────────────────────────────────────────── */}
          <TabPanel value={tab} index={6}>
            <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
              <Button size="small" variant="outlined" startIcon={<AddRoundedIcon />} onClick={() => setAddLetterOpen(true)} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
                Draft Letter
              </Button>
            </Stack>
            {letters.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
                <DescriptionRoundedIcon sx={{ fontSize: '3rem', mb: 1.5, opacity: 0.3 }} />
                <Typography variant="body1" fontWeight={600} sx={{ mb: 0.5 }}>No letters yet</Typography>
                <Typography variant="body2">Referral letters and clinical correspondence go through Draft → Pending Review → Approved before they can be shared.</Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {letters.map((l) => (
                  <Card key={l.id} variant="outlined" sx={{ borderRadius: 2, border: '1px solid #E2E8F0' }}>
                    <CardContent>
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
                        <Box>
                          <Typography fontWeight={700}>{l.title}</Typography>
                          <Typography variant="caption" color="text.secondary">{dayjs(l.date).format('DD/MM/YYYY')}</Typography>
                        </Box>
                        <Chip label={l.review_status} size="small" color={LETTER_STATUS_COLOR[l.review_status]} sx={{ fontWeight: 700 }} />
                      </Stack>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1, mb: 1.5, whiteSpace: 'pre-wrap' }}>{l.body || '—'}</Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {l.review_status !== 'Approved' && (
                          <Button size="small" onClick={() => advanceLetterStatus(l.id)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                            Move to {LETTER_REVIEW_STATUSES[LETTER_REVIEW_STATUSES.indexOf(l.review_status) + 1]}
                          </Button>
                        )}
                        {l.review_status === 'Approved' && !l.dateShared && (
                          <Button size="small" variant="contained" startIcon={<SendRoundedIcon />} onClick={() => shareLetter(l.id)} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
                            Share with Patient
                          </Button>
                        )}
                        {l.dateShared && (
                          <Typography variant="caption" color="success.main" fontWeight={700}>
                            Shared {dayjs(l.dateShared).format('DD/MM/YYYY HH:mm')}
                          </Typography>
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            )}
          </TabPanel>

          {/* ── Communication Log — sent-message history, distinct from the
               Communication Preferences settings on the Overview tab; mirrors
               Semble's patientCommunication(s) query. ─────────────────────── */}
          <TabPanel value={tab} index={7}>
            <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
              <Button size="small" variant="outlined" startIcon={<SendRoundedIcon />} onClick={() => setSendMessageOpen(true)} sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}>
                Send Message
              </Button>
            </Stack>
            {commLog.length === 0 ? (
              <Typography variant="body2" color="text.secondary">No messages sent to this patient yet.</Typography>
            ) : (
              <Stack spacing={1.25}>
                {commLog.map((c) => (
                  <Stack key={c.id} direction="row" alignItems="center" spacing={1.5} sx={{ bgcolor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 2, p: 1.5 }}>
                    {c.channel === 'email' && <MarkEmailReadRoundedIcon sx={{ color: '#1565C7' }} />}
                    {c.channel === 'sms' && <SmsRoundedIcon sx={{ color: '#7B3FE4' }} />}
                    {c.channel === 'whatsapp' && <WhatsAppIcon sx={{ color: '#25D366' }} />}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={700} noWrap>{c.subject}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {c.type} · {c.channel.toUpperCase()} · {dayjs(c.sent_at).format('DD/MM/YYYY HH:mm')}
                      </Typography>
                    </Box>
                    <Chip label={c.status} size="small" color={c.status === 'Failed' ? 'error' : c.status === 'Sent' ? 'default' : 'success'} sx={{ fontWeight: 700, fontSize: '0.65rem', height: 20 }} />
                  </Stack>
                ))}
              </Stack>
            )}
          </TabPanel>

        </Box>
      </Paper>

      {/* ── View Result Dialog (SUG-PT-003 / SUG-PAT-013) ────────────────── */}
      <Dialog open={Boolean(viewResult)} onClose={() => setViewResult(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>{viewResult?.name}</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5}>
            <InfoRow label="Status" value={viewResult?.status} icon={CheckCircleRoundedIcon} />
            <InfoRow label="Ordered By" value={viewResult?.ordered_by} icon={PersonRoundedIcon} />
            <InfoRow label="Date" value={viewResult ? dayjs(viewResult.date).format('DD/MM/YYYY') : ''} icon={AccessTimeRoundedIcon} />
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
              Full result document is not yet available in this demo environment.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setViewResult(null)} sx={{ textTransform: 'none', fontWeight: 700 }}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Related Account Dialog ───────────────────────────────────── */}
      <Dialog open={addRelatedOpen} onClose={() => setAddRelatedOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Add Related Account</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={0.5}>
            <TextField
              label="Full Name *" fullWidth size="small" value={newRelated.name}
              onChange={(e) => setNewRelated((prev) => ({ ...prev, name: e.target.value }))}
            />
            <TextField
              select label="Relationship" fullWidth size="small" value={newRelated.relationship}
              onChange={(e) => setNewRelated((prev) => ({ ...prev, relationship: e.target.value }))}
            >
              {RELATIONSHIP_TYPES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
            <TextField
              label="Phone" fullWidth size="small" value={newRelated.phone}
              onChange={(e) => setNewRelated((prev) => ({ ...prev, phone: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddRelatedOpen(false)} sx={{ textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" onClick={addRelatedAccount} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Allergy Record Dialog ────────────────────────────────────── */}
      <Dialog open={addAllergyOpen} onClose={() => setAddAllergyOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Add Allergy Record</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={0.5}>
            <TextField
              label="Allergen *" fullWidth size="small" placeholder="Penicillin, Peanuts, Latex…" value={newAllergy.allergen}
              onChange={(e) => setNewAllergy((prev) => ({ ...prev, allergen: e.target.value }))}
            />
            <TextField
              select label="Severity" fullWidth size="small" value={newAllergy.severity}
              onChange={(e) => setNewAllergy((prev) => ({ ...prev, severity: e.target.value }))}
            >
              {SEVERITY_LEVELS.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <TextField
              label="Reaction" fullWidth size="small" multiline rows={2} placeholder="Rash, anaphylaxis, nausea…" value={newAllergy.reaction}
              onChange={(e) => setNewAllergy((prev) => ({ ...prev, reaction: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddAllergyOpen(false)} sx={{ textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" onClick={addAllergyRecord} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Consultation Record Dialog ───────────────────────────────── */}
      <Dialog open={addConsultationOpen} onClose={() => setAddConsultationOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Add Consultation Record</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={0.5}>
            <TextField
              select label="Encounter Type" fullWidth size="small" value={newConsultation.encounter_type}
              onChange={(e) => setNewConsultation((prev) => ({ ...prev, encounter_type: e.target.value }))}
            >
              {ENCOUNTER_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <TextField
              label="Diagnosis / Summary *" fullWidth size="small" value={newConsultation.diagnosis}
              onChange={(e) => setNewConsultation((prev) => ({ ...prev, diagnosis: e.target.value }))}
            />
            <TextField
              label="Notes" fullWidth size="small" multiline rows={3} value={newConsultation.notes}
              onChange={(e) => setNewConsultation((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddConsultationOpen(false)} sx={{ textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" onClick={addConsultation} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Diagnosis Dialog ─────────────────────────────────────────── */}
      <Dialog open={addDiagnosisOpen} onClose={() => setAddDiagnosisOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Add Diagnosis</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={0.5}>
            <TextField
              label="Condition *" fullWidth size="small" placeholder="Type 2 Diabetes, Hypertension…" value={newDiagnosis.condition}
              onChange={(e) => setNewDiagnosis((prev) => ({ ...prev, condition: e.target.value }))}
            />
            <TextField
              select label="Status" fullWidth size="small" value={newDiagnosis.status}
              onChange={(e) => setNewDiagnosis((prev) => ({ ...prev, status: e.target.value }))}
            >
              {['Active', 'Resolved'].map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </TextField>
            <TextField
              label="Diagnosed date" fullWidth size="small" type="date" InputLabelProps={{ shrink: true }} value={newDiagnosis.diagnosed_date}
              onChange={(e) => setNewDiagnosis((prev) => ({ ...prev, diagnosed_date: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddDiagnosisOpen(false)} sx={{ textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" onClick={addDiagnosis} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* ── Send Message Dialog (Communication Log) ─────────────────────── */}
      <Dialog open={sendMessageOpen} onClose={() => setSendMessageOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Send Message</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={0.5}>
            <TextField
              select label="Channel" fullWidth size="small" value={newMessage.channel}
              onChange={(e) => setNewMessage((prev) => ({ ...prev, channel: e.target.value }))}
            >
              {COMM_CHANNELS.map((c) => <MenuItem key={c} value={c} sx={{ textTransform: 'capitalize' }}>{c}</MenuItem>)}
            </TextField>
            <TextField
              select label="Type" fullWidth size="small" value={newMessage.type}
              onChange={(e) => setNewMessage((prev) => ({ ...prev, type: e.target.value }))}
            >
              {COMM_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <TextField
              label="Subject / message *" fullWidth size="small" multiline rows={3} value={newMessage.subject}
              onChange={(e) => setNewMessage((prev) => ({ ...prev, subject: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setSendMessageOpen(false)} sx={{ textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" startIcon={<SendRoundedIcon />} onClick={sendCommunication} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>Send</Button>
        </DialogActions>
      </Dialog>

      {/* ── Draft Letter Dialog ──────────────────────────────────────────── */}
      <Dialog open={addLetterOpen} onClose={() => setAddLetterOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Draft Letter</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={0.5}>
            <TextField
              label="Title *" fullWidth size="small" placeholder="Referral to Cardiology" value={newLetter.title}
              onChange={(e) => setNewLetter((prev) => ({ ...prev, title: e.target.value }))}
            />
            <TextField
              label="Body" fullWidth size="small" multiline rows={6} value={newLetter.body}
              onChange={(e) => setNewLetter((prev) => ({ ...prev, body: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddLetterOpen(false)} sx={{ textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" onClick={addLetter} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>Save Draft</Button>
        </DialogActions>
      </Dialog>

      {/* ── Membership Dialog ────────────────────────────────────────────── */}
      <Dialog open={membershipDialogOpen} onClose={() => setMembershipDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>Patient Membership</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={1.5} pt={0.5}>
            {MEMBERSHIP_PLANS.map((plan) => (
              <Card
                key={plan.id} variant="outlined"
                onClick={() => setMembershipId(plan.id)}
                sx={{ cursor: 'pointer', borderRadius: 2, borderColor: membershipId === plan.id ? 'primary.main' : 'divider', borderWidth: membershipId === plan.id ? 2 : 1 }}
              >
                <CardContent sx={{ py: '10px !important', px: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography fontWeight={700} variant="body2">{plan.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{plan.price_monthly === 0 ? '' : `${formatInr(plan.price_monthly)}/mo`}</Typography>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={() => { setMembershipDialogOpen(false); enqueueSnackbar('Membership updated', { variant: 'success' }) }} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>Done</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
