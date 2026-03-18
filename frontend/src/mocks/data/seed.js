/**
 * MEDIBOOK — COMPLETE MOCK SEED DATA
 * ===================================
 * Mirrors exact GraphQL shapes from graphql/queries.js fragments.
 * All data from mockup-data-plan.md, Sections 3 & 4.
 *
 * BACKEND SWAP NOTE:
 *   When real backend is ready, replace import paths from:
 *   '../../mocks/data/seed' → real Apollo queries (already defined in graphql/queries.js)
 *   The data shapes here intentionally match the backend schema exactly.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Section 3.1 — Languages
// ─────────────────────────────────────────────────────────────────────────────
export const LANGUAGES = [
  { id: 'lang-1', code: 'en', name: 'English' },
  { id: 'lang-2', code: 'fr', name: 'French' },
  { id: 'lang-3', code: 'ur', name: 'Urdu' },
  { id: 'lang-4', code: 'zh', name: 'Mandarin' },
  { id: 'lang-5', code: 'pl', name: 'Polish' },
  { id: 'lang-6', code: 'ar', name: 'Arabic' },
  { id: 'lang-7', code: 'hi', name: 'Hindi' },
  { id: 'lang-8', code: 'pt', name: 'Portuguese' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Section 3.2 — Clinician Types
// ─────────────────────────────────────────────────────────────────────────────
export const CLINICIAN_TYPES = [
  { id: 'ct-1', name: 'General Practitioner',  description: 'Primary care and general consultations' },
  { id: 'ct-2', name: 'Cardiologist',           description: 'Heart and cardiovascular system specialist' },
  { id: 'ct-3', name: 'Dermatologist',          description: 'Skin, hair, and nail conditions' },
  { id: 'ct-4', name: 'Physiotherapist',        description: 'Physical rehabilitation and injury therapy' },
  { id: 'ct-5', name: 'Psychiatrist',           description: 'Mental health, psychiatry, and CBT' },
  { id: 'ct-6', name: 'Paediatrician',          description: 'Child health, development, and vaccinations' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Section 3.3 — Room Types
// ─────────────────────────────────────────────────────────────────────────────
export const ROOM_TYPES = [
  { id: 'rt-1', name: 'Consultation', description: 'Standard one-to-one consultation room' },
  { id: 'rt-2', name: 'Procedure',    description: 'Medical procedure and treatment room' },
  { id: 'rt-3', name: 'Therapy',      description: 'Physical or mental therapy suite' },
  { id: 'rt-4', name: 'Paediatric',   description: 'Child-friendly consultation room' },
  { id: 'rt-5', name: 'Waiting',      description: 'Patient waiting area' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Section 3.4 — Organisations
// ─────────────────────────────────────────────────────────────────────────────
export const ORGANISATIONS = [
  { id: 'org-1', name: 'Meridian Health Group', slug: 'meridian',   plan: 'enterprise', active_clinics: 3, created_at: '2023-01-15T00:00:00Z' },
  { id: 'org-2', name: 'CityCore Medical',       slug: 'citycore',   plan: 'pro',        active_clinics: 1, created_at: '2023-06-20T00:00:00Z' },
  { id: 'org-3', name: 'Wellspring Clinic',      slug: 'wellspring', plan: 'starter',    active_clinics: 1, created_at: '2024-02-01T00:00:00Z' },
]

// ─────────────────────────────────────────────────────────────────────────────
// Section 3.5 — Clinics
// ─────────────────────────────────────────────────────────────────────────────
export const CLINICS = [
  {
    id: 'cli-1', name: 'Meridian Central',    organisation: { id: 'org-1', name: 'Meridian Health Group' },
    city: 'London',     address: '14 Harley Street',   postcode: 'W1G 9PH',
    timezone: 'Europe/London', phone: '020 7946 0100',
    total_rooms: 3, total_clinicians: 2, total_services: 3,
    appointments_month: 96, revenue_month: 7840,
    opening_hours: {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '17:00', closed: false },
      saturday: { open: '09:00', close: '13:00', closed: false },
      sunday: { open: null,    close: null,    closed: true },
    },
    is_active: true,
  },
  {
    id: 'cli-2', name: 'Meridian East',       organisation: { id: 'org-1', name: 'Meridian Health Group' },
    city: 'Manchester', address: '88 Mosley Street',   postcode: 'M2 3JF',
    timezone: 'Europe/London', phone: '0161 946 0200',
    total_rooms: 2, total_clinicians: 2, total_services: 2,
    appointments_month: 68, revenue_month: 5120,
    opening_hours: {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '17:00', closed: false },
      saturday: { open: null, close: null, closed: true },
      sunday: { open: null, close: null, closed: true },
    },
    is_active: true,
  },
  {
    id: 'cli-3', name: 'Meridian North',      organisation: { id: 'org-1', name: 'Meridian Health Group' },
    city: 'Edinburgh',  address: '32 Queen Street',    postcode: 'EH2 1JE',
    timezone: 'Europe/London', phone: '0131 946 0300',
    total_rooms: 2, total_clinicians: 3, total_services: 2,
    appointments_month: 52, revenue_month: 4680,
    opening_hours: {
      monday: { open: '09:00', close: '17:00', closed: false },
      tuesday: { open: '09:00', close: '17:00', closed: false },
      wednesday: { open: '09:00', close: '17:00', closed: false },
      thursday: { open: '09:00', close: '17:00', closed: false },
      friday: { open: '09:00', close: '16:00', closed: false },
      saturday: { open: null, close: null, closed: true },
      sunday: { open: null, close: null, closed: true },
    },
    is_active: true,
  },
  {
    id: 'cli-4', name: 'CityCore West End',   organisation: { id: 'org-2', name: 'CityCore Medical' },
    city: 'London',     address: '55 Wimpole Street',  postcode: 'W1G 8YL',
    timezone: 'Europe/London', phone: '020 7946 0400',
    total_rooms: 3, total_clinicians: 2, total_services: 3,
    appointments_month: 68, revenue_month: 7140,
    opening_hours: {
      monday: { open: '09:00', close: '18:00', closed: false },
      tuesday: { open: '09:00', close: '18:00', closed: false },
      wednesday: { open: '09:00', close: '18:00', closed: false },
      thursday: { open: '09:00', close: '18:00', closed: false },
      friday: { open: '09:00', close: '17:00', closed: false },
      saturday: { open: '10:00', close: '14:00', closed: false },
      sunday: { open: null, close: null, closed: true },
    },
    is_active: true,
  },
  {
    id: 'cli-5', name: 'Wellspring Primary',  organisation: { id: 'org-3', name: 'Wellspring Clinic' },
    city: 'Bristol',    address: '7 Park Street',      postcode: 'BS1 5NB',
    timezone: 'Europe/London', phone: '0117 946 0500',
    total_rooms: 2, total_clinicians: 2, total_services: 2,
    appointments_month: 44, revenue_month: 2310,
    opening_hours: {
      monday: { open: '08:30', close: '17:00', closed: false },
      tuesday: { open: '08:30', close: '17:00', closed: false },
      wednesday: { open: '08:30', close: '17:00', closed: false },
      thursday: { open: '08:30', close: '17:00', closed: false },
      friday: { open: '08:30', close: '16:00', closed: false },
      saturday: { open: null, close: null, closed: true },
      sunday: { open: null, close: null, closed: true },
    },
    is_active: true,
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Section 3.6 — Rooms
// ─────────────────────────────────────────────────────────────────────────────
export const ROOMS = [
  { id: 'rm-1',  name: 'Consultation A',      clinic: { id: 'cli-1', name: 'Meridian Central' },    room_type: { id: 'rt-1', name: 'Consultation' }, capacity: 2, floor: 1, is_active: true },
  { id: 'rm-2',  name: 'Consultation B',      clinic: { id: 'cli-1', name: 'Meridian Central' },    room_type: { id: 'rt-1', name: 'Consultation' }, capacity: 2, floor: 1, is_active: true },
  { id: 'rm-3',  name: 'Procedure Room 1',    clinic: { id: 'cli-1', name: 'Meridian Central' },    room_type: { id: 'rt-2', name: 'Procedure' },    capacity: 3, floor: 2, is_active: true },
  { id: 'rm-4',  name: 'Physio Suite',        clinic: { id: 'cli-2', name: 'Meridian East' },       room_type: { id: 'rt-3', name: 'Therapy' },      capacity: 4, floor: 1, is_active: true },
  { id: 'rm-5',  name: 'Consultation A',      clinic: { id: 'cli-2', name: 'Meridian East' },       room_type: { id: 'rt-1', name: 'Consultation' }, capacity: 2, floor: 1, is_active: true },
  { id: 'rm-6',  name: 'Mental Health Suite', clinic: { id: 'cli-3', name: 'Meridian North' },      room_type: { id: 'rt-3', name: 'Therapy' },      capacity: 2, floor: 2, is_active: true },
  { id: 'rm-7',  name: 'Consultation A',      clinic: { id: 'cli-3', name: 'Meridian North' },      room_type: { id: 'rt-1', name: 'Consultation' }, capacity: 2, floor: 1, is_active: true },
  { id: 'rm-8',  name: 'Derma Suite',         clinic: { id: 'cli-4', name: 'CityCore West End' },   room_type: { id: 'rt-2', name: 'Procedure' },    capacity: 2, floor: 1, is_active: true },
  { id: 'rm-9',  name: 'Cardio Suite',        clinic: { id: 'cli-4', name: 'CityCore West End' },   room_type: { id: 'rt-2', name: 'Procedure' },    capacity: 3, floor: 2, is_active: true },
  { id: 'rm-10', name: 'Consultation A',      clinic: { id: 'cli-4', name: 'CityCore West End' },   room_type: { id: 'rt-1', name: 'Consultation' }, capacity: 2, floor: 1, is_active: true },
  { id: 'rm-11', name: 'Main Consultation',   clinic: { id: 'cli-5', name: 'Wellspring Primary' },  room_type: { id: 'rt-1', name: 'Consultation' }, capacity: 2, floor: 1, is_active: true },
  { id: 'rm-12', name: "Children's Room",     clinic: { id: 'cli-5', name: 'Wellspring Primary' },  room_type: { id: 'rt-4', name: 'Paediatric' },   capacity: 4, floor: 1, is_active: true },
]

// ─────────────────────────────────────────────────────────────────────────────
// Section 3.7 — Services
// ─────────────────────────────────────────────────────────────────────────────
export const SERVICES = [
  { id: 'svc-1',  name: 'GP Consultation',            clinic: { id: 'cli-1', name: 'Meridian Central' },   duration_minutes: 15, price: 40,  is_active: true,  is_online: true,  bookings_month: 41, revenue_month: 1640, max_advance_days: 60,
    description: 'Standard 15-minute GP consultation for registered patients. Covers symptom assessment, referrals, and repeat prescriptions.',
    assigned_clinicians: ['cln-1', 'cln-2'] },
  { id: 'svc-2',  name: 'Extended GP Consultation',   clinic: { id: 'cli-1', name: 'Meridian Central' },   duration_minutes: 30, price: 70,  is_active: true,  is_online: true,  bookings_month: 32, revenue_month: 2240, max_advance_days: 60,
    description: 'Extended 30-minute GP consultation for complex or multi-issue presentations.', assigned_clinicians: ['cln-1', 'cln-2'] },
  { id: 'svc-3',  name: 'Blood Pressure Check',       clinic: { id: 'cli-1', name: 'Meridian Central' },   duration_minutes: 10, price: 20,  is_active: true,  is_online: false, bookings_month: 7,  revenue_month: 140,  max_advance_days: 30,
    description: 'Quick blood pressure measurement and review by a nurse or GP.', assigned_clinicians: ['cln-1'] },
  { id: 'svc-4',  name: 'Physiotherapy Session',      clinic: { id: 'cli-2', name: 'Meridian East' },      duration_minutes: 45, price: 65,  is_active: true,  is_online: false, bookings_month: 28, revenue_month: 1820, max_advance_days: 45,
    description: 'One-to-one physiotherapy assessment and treatment session.', assigned_clinicians: ['cln-5', 'cln-7'] },
  { id: 'svc-5',  name: 'Sports Injury Assessment',   clinic: { id: 'cli-2', name: 'Meridian East' },      duration_minutes: 60, price: 90,  is_active: true,  is_online: false, bookings_month: 10, revenue_month: 900,  max_advance_days: 60,
    description: 'Comprehensive sports injury assessment with treatment plan.', assigned_clinicians: ['cln-5'] },
  { id: 'svc-6',  name: 'Psychiatry Initial Consult', clinic: { id: 'cli-3', name: 'Meridian North' },     duration_minutes: 60, price: 150, is_active: true,  is_online: true,  bookings_month: 16, revenue_month: 2400, max_advance_days: 90,
    description: 'Initial psychiatric assessment covering mental health history and treatment planning.', assigned_clinicians: ['cln-6'] },
  { id: 'svc-7',  name: 'CBT Session',                clinic: { id: 'cli-3', name: 'Meridian North' },     duration_minutes: 50, price: 120, is_active: true,  is_online: true,  bookings_month: 22, revenue_month: 2640, max_advance_days: 60,
    description: 'Cognitive Behavioural Therapy session.', assigned_clinicians: ['cln-6', 'cln-9'] },
  { id: 'svc-8',  name: 'Skin Consultation',          clinic: { id: 'cli-4', name: 'CityCore West End' },  duration_minutes: 20, price: 55,  is_active: true,  is_online: true,  bookings_month: 14, revenue_month: 770,  max_advance_days: 60,
    description: 'Dermatology skin assessment and treatment planning.', assigned_clinicians: ['cln-4'] },
  { id: 'svc-9',  name: 'Acne Treatment',             clinic: { id: 'cli-4', name: 'CityCore West End' },  duration_minutes: 30, price: 80,  is_active: true,  is_online: false, bookings_month: 12, revenue_month: 960,  max_advance_days: 60,
    description: 'Targeted acne treatment and medication review.', assigned_clinicians: ['cln-4'] },
  { id: 'svc-10', name: 'Cardio Assessment',          clinic: { id: 'cli-4', name: 'CityCore West End' },  duration_minutes: 40, price: 110, is_active: true,  is_online: false, bookings_month: 18, revenue_month: 1980, max_advance_days: 60,
    description: 'Comprehensive cardiovascular assessment including ECG and risk profiling.', assigned_clinicians: ['cln-3'] },
  { id: 'svc-11', name: 'Child Well-check',           clinic: { id: 'cli-5', name: 'Wellspring Primary' }, duration_minutes: 20, price: 35,  is_active: true,  is_online: false, bookings_month: 9,  revenue_month: 315,  max_advance_days: 90,
    description: 'Routine well-child check including growth assessment and developmental screening.', assigned_clinicians: ['cln-8'] },
  { id: 'svc-12', name: 'Vaccination Appointment',    clinic: { id: 'cli-5', name: 'Wellspring Primary' }, duration_minutes: 10, price: 25,  is_active: true,  is_online: false, bookings_month: 8,  revenue_month: 200,  max_advance_days: 30,
    description: 'Scheduled vaccination administration per NHS or private programme.', assigned_clinicians: ['cln-8'] },
]

// ─────────────────────────────────────────────────────────────────────────────
// Section 3.8 — Clinicians
// ─────────────────────────────────────────────────────────────────────────────
export const CLINICIANS = [
  {
    id: 'cln-1', first_name: 'Sarah', last_name: 'Mitchell', full_name: 'Dr. Sarah Mitchell',
    avatar_url: 'https://i.pravatar.cc/150?img=47',
    clinician_type: { id: 'ct-1', name: 'General Practitioner' },
    clinics: [{ id: 'cli-1', name: 'Meridian Central' }],
    languages: [{ id: 'lang-1', name: 'English' }, { id: 'lang-2', name: 'French' }],
    consultation_fee: 40, gender: 'F', is_active: true,
    joined_at: '2021-03-01T00:00:00Z',
    avg_rating: 4.8, total_reviews: 8, total_patients: 41, appointments_done: 284,
    bio: 'Dr. Sarah Mitchell is a highly experienced General Practitioner with over 12 years in primary care. She specialises in women\'s health and chronic disease management. Dr. Mitchell trained at King\'s College London and is a Fellow of the Royal College of GPs.',
    services: [{ id: 'svc-1', name: 'GP Consultation' }, { id: 'svc-2', name: 'Extended GP Consultation' }, { id: 'svc-3', name: 'Blood Pressure Check' }],
  },
  {
    id: 'cln-2', first_name: 'James', last_name: 'Okafor', full_name: 'Dr. James Okafor',
    avatar_url: 'https://i.pravatar.cc/150?img=12',
    clinician_type: { id: 'ct-1', name: 'General Practitioner' },
    clinics: [{ id: 'cli-1', name: 'Meridian Central' }, { id: 'cli-5', name: 'Wellspring Primary' }],
    languages: [{ id: 'lang-1', name: 'English' }, { id: 'lang-6', name: 'Arabic' }],
    consultation_fee: 40, gender: 'M', is_active: true,
    joined_at: '2021-09-15T00:00:00Z',
    avg_rating: 4.6, total_reviews: 5, total_patients: 28, appointments_done: 198,
    bio: 'Dr. James Okafor is a dedicated General Practitioner with expertise in chronic disease management and preventive care.',
    services: [{ id: 'svc-1', name: 'GP Consultation' }, { id: 'svc-2', name: 'Extended GP Consultation' }],
  },
  {
    id: 'cln-3', first_name: 'Priya', last_name: 'Sharma', full_name: 'Dr. Priya Sharma',
    avatar_url: 'https://i.pravatar.cc/150?img=49',
    clinician_type: { id: 'ct-2', name: 'Cardiologist' },
    clinics: [{ id: 'cli-4', name: 'CityCore West End' }],
    languages: [{ id: 'lang-1', name: 'English' }, { id: 'lang-7', name: 'Hindi' }],
    consultation_fee: 110, gender: 'F', is_active: true,
    joined_at: '2020-07-01T00:00:00Z',
    avg_rating: 3.9, total_reviews: 5, total_patients: 32, appointments_done: 156,
    bio: 'Dr. Priya Sharma is a Consultant Cardiologist with 15 years of experience in interventional cardiology. She has published extensively on hypertension management and runs a specialist heart failure clinic.',
    services: [{ id: 'svc-10', name: 'Cardio Assessment' }],
  },
  {
    id: 'cln-4', first_name: 'Tom', last_name: 'Greaves', full_name: 'Dr. Tom Greaves',
    avatar_url: 'https://i.pravatar.cc/150?img=33',
    clinician_type: { id: 'ct-3', name: 'Dermatologist' },
    clinics: [{ id: 'cli-4', name: 'CityCore West End' }],
    languages: [{ id: 'lang-1', name: 'English' }],
    consultation_fee: 55, gender: 'M', is_active: true,
    joined_at: '2022-02-14T00:00:00Z',
    avg_rating: 4.3, total_reviews: 3, total_patients: 19, appointments_done: 94,
    bio: 'Dr. Tom Greaves is a specialist Dermatologist with expertise in acne, eczema, and skin cancer screening.',
    services: [{ id: 'svc-8', name: 'Skin Consultation' }, { id: 'svc-9', name: 'Acne Treatment' }],
  },
  {
    id: 'cln-5', first_name: 'Lucy', last_name: 'Harrington', full_name: 'Lucy Harrington',
    avatar_url: 'https://i.pravatar.cc/150?img=44',
    clinician_type: { id: 'ct-4', name: 'Physiotherapist' },
    clinics: [{ id: 'cli-2', name: 'Meridian East' }],
    languages: [{ id: 'lang-1', name: 'English' }, { id: 'lang-5', name: 'Polish' }],
    consultation_fee: 65, gender: 'F', is_active: true,
    joined_at: '2021-05-10T00:00:00Z',
    avg_rating: 4.9, total_reviews: 6, total_patients: 25, appointments_done: 148,
    bio: 'Lucy Harrington is an experienced Physiotherapist specialising in sports injuries and musculoskeletal rehabilitation.',
    services: [{ id: 'svc-4', name: 'Physiotherapy Session' }, { id: 'svc-5', name: 'Sports Injury Assessment' }],
  },
  {
    id: 'cln-6', first_name: 'Ben', last_name: 'Whitfield', full_name: 'Dr. Ben Whitfield',
    avatar_url: 'https://i.pravatar.cc/150?img=59',
    clinician_type: { id: 'ct-5', name: 'Psychiatrist' },
    clinics: [{ id: 'cli-3', name: 'Meridian North' }],
    languages: [{ id: 'lang-1', name: 'English' }],
    consultation_fee: 150, gender: 'M', is_active: true,
    joined_at: '2020-11-01T00:00:00Z',
    avg_rating: 4.8, total_reviews: 4, total_patients: 18, appointments_done: 112,
    bio: 'Dr. Ben Whitfield is a Consultant Psychiatrist specialising in mood disorders and anxiety. He is trained in CBT and EMDR, and works with both adolescents and adults across the mental health spectrum.',
    services: [{ id: 'svc-6', name: 'Psychiatry Initial Consult' }, { id: 'svc-7', name: 'CBT Session' }],
  },
  {
    id: 'cln-7', first_name: 'Amara', last_name: 'Diallo', full_name: 'Dr. Amara Diallo',
    avatar_url: 'https://i.pravatar.cc/150?img=41',
    clinician_type: { id: 'ct-1', name: 'General Practitioner' },
    clinics: [{ id: 'cli-2', name: 'Meridian East' }],
    languages: [{ id: 'lang-1', name: 'English' }, { id: 'lang-2', name: 'French' }, { id: 'lang-6', name: 'Arabic' }],
    consultation_fee: 40, gender: 'F', is_active: true,
    joined_at: '2022-08-01T00:00:00Z',
    avg_rating: 4.2, total_reviews: 3, total_patients: 31, appointments_done: 167,
    bio: 'Dr. Amara Diallo is a General Practitioner with a special interest in chronic disease management and patient education.',
    services: [{ id: 'svc-4', name: 'Physiotherapy Session' }],
  },
  {
    id: 'cln-8', first_name: 'Emma', last_name: 'Curtis', full_name: 'Dr. Emma Curtis',
    avatar_url: 'https://i.pravatar.cc/150?img=45',
    clinician_type: { id: 'ct-6', name: 'Paediatrician' },
    clinics: [{ id: 'cli-5', name: 'Wellspring Primary' }],
    languages: [{ id: 'lang-1', name: 'English' }],
    consultation_fee: 45, gender: 'F', is_active: true,
    joined_at: '2023-01-15T00:00:00Z',
    avg_rating: 4.5, total_reviews: 2, total_patients: 16, appointments_done: 72,
    bio: 'Dr. Emma Curtis is a dedicated Paediatrician with expertise in child development and preventive care.',
    services: [{ id: 'svc-11', name: 'Child Well-check' }, { id: 'svc-12', name: 'Vaccination Appointment' }],
  },
  {
    id: 'cln-9', first_name: 'Raj', last_name: 'Patel', full_name: 'Dr. Raj Patel',
    avatar_url: 'https://i.pravatar.cc/150?img=68',
    clinician_type: { id: 'ct-1', name: 'General Practitioner' },
    clinics: [{ id: 'cli-3', name: 'Meridian North' }],
    languages: [{ id: 'lang-1', name: 'English' }, { id: 'lang-7', name: 'Hindi' }, { id: 'lang-3', name: 'Urdu' }],
    consultation_fee: 40, gender: 'M', is_active: true,
    joined_at: '2022-03-01T00:00:00Z',
    avg_rating: 4.1, total_reviews: 2, total_patients: 22, appointments_done: 98,
    bio: 'Dr. Raj Patel is a General Practitioner with special interest in mental health and diabetes management.',
    services: [{ id: 'svc-1', name: 'GP Consultation' }, { id: 'svc-7', name: 'CBT Session' }],
  },
  {
    id: 'cln-10', first_name: 'Helena', last_name: 'Kowalski', full_name: 'Dr. Helena Kowalski',
    avatar_url: 'https://i.pravatar.cc/150?img=43',
    clinician_type: { id: 'ct-5', name: 'Psychiatrist' },
    clinics: [{ id: 'cli-3', name: 'Meridian North' }],
    languages: [{ id: 'lang-1', name: 'English' }, { id: 'lang-5', name: 'Polish' }],
    consultation_fee: 150, gender: 'F', is_active: false,
    joined_at: '2021-11-01T00:00:00Z',
    avg_rating: 4.7, total_reviews: 6, total_patients: 15, appointments_done: 88,
    bio: 'Dr. Helena Kowalski is a Consultant Psychiatrist currently on extended leave.',
    services: [],
  },
]
