/**
 * MOCK REVIEWS — 15 records (Section 4, Feature 14)
 * MOCK BILLING / INVOICES — 18+ records (Section 4, Feature 13)
 * MOCK ANALYTICS DATA — dashboard KPIs + charts (Section 4, Feature 11)
 */

// ─── Reviews ─────────────────────────────────────────────────────────────────
export const REVIEWS = [
  { id: 'rev-1',  appointment_id: 'appt-4',  patient_id: 'pt-4',  patient_name: 'George Williams',  clinician_id: 'cln-5', clinician_name: 'Lucy Harrington',    stars: 5, comment: 'Lucy was absolutely fantastic. Very thorough and explained everything about my injury in detail. I feel confident in my recovery programme.', response: null, created_at: '2026-03-15T10:00:00Z' },
  { id: 'rev-2',  appointment_id: 'appt-9',  patient_id: 'pt-9',  patient_name: 'Mei-Lin Zhang',    clinician_id: 'cln-7', clinician_name: 'Dr. Amara Diallo',   stars: 4, comment: 'Good session overall. The wait time was a little long but Amara was very helpful once we got started.', response: "Thank you for your feedback. We're working on reducing wait times.", created_at: '2026-03-11T12:00:00Z' },
  { id: 'rev-3',  appointment_id: 'appt-12', patient_id: 'pt-12', patient_name: 'Hassan Malik',     clinician_id: 'cln-1', clinician_name: 'Dr. Sarah Mitchell', stars: 5, comment: 'Dr. Mitchell explained everything clearly and put me at ease. Quick and professional service.', response: null, created_at: '2026-03-06T09:00:00Z' },
  { id: 'rev-4',  appointment_id: 'appt-14', patient_id: 'pt-14', patient_name: 'Roberto Silva',    clinician_id: 'cln-3', clinician_name: 'Dr. Priya Sharma',  stars: 4, comment: 'Very knowledgeable cardiologist. Felt reassured after the appointment. Only minor issue was parking.', response: null, created_at: '2026-03-05T14:00:00Z' },
  { id: 'rev-5',  appointment_id: 'appt-18', patient_id: 'pt-18', patient_name: "Patrick O'Brien",  clinician_id: 'cln-5', clinician_name: 'Lucy Harrington',    stars: 5, comment: 'Excellent assessment. Lucy identified the issue immediately and outlined a clear treatment plan. Highly recommend.', response: null, created_at: '2026-03-03T11:00:00Z' },
  { id: 'rev-6',  appointment_id: 'appt-20', patient_id: 'pt-1',  patient_name: 'Alice Thompson',   clinician_id: 'cln-1', clinician_name: 'Dr. Sarah Mitchell', stars: 5, comment: 'Always a pleasure to see Dr. Mitchell. She takes the time to listen and never makes you feel rushed.', response: null, created_at: '2025-12-11T10:00:00Z' },
  { id: 'rev-7',  appointment_id: 'appt-21', patient_id: 'pt-20', patient_name: 'William Blackwood',clinician_id: 'cln-3', clinician_name: 'Dr. Priya Sharma',  stars: 3, comment: 'Doctor was professional but felt the appointment was quite rushed. Could have explained the medication changes better.', response: "We're sorry to hear you felt rushed. We'll ensure more time is allocated. Thank you for letting us know.", created_at: '2026-02-19T11:00:00Z' },
  { id: 'rev-8',  appointment_id: 'appt-25', patient_id: 'pt-24', patient_name: 'Finn Jacobsen',    clinician_id: 'cln-5', clinician_name: 'Lucy Harrington',    stars: 5, comment: "Session 4 and my shoulder is dramatically better. Lucy's approach is excellent and the exercises she gives are very manageable.", response: null, created_at: '2026-02-13T10:00:00Z' },
  { id: 'rev-9',  appointment_id: 'appt-30', patient_id: 'pt-28', patient_name: 'Tom Andersson',    clinician_id: 'cln-3', clinician_name: 'Dr. Priya Sharma',  stars: 4, comment: 'Professional and thorough as always. Dr. Sharma takes a holistic view of cardiac health.', response: null, created_at: '2026-02-06T10:00:00Z' },
  { id: 'rev-10', appointment_id: 'appt-33', patient_id: 'pt-6',  patient_name: 'Dmitri Volkov',    clinician_id: 'cln-6', clinician_name: 'Dr. Ben Whitfield', stars: 5, comment: 'Dr. Whitfield has been transformative for my anxiety. CBT with him has given me real tools to manage my condition.', response: null, created_at: '2026-03-04T16:00:00Z' },
  { id: 'rev-11', appointment_id: 'appt-4',  patient_id: 'pt-4',  patient_name: 'George Williams',  clinician_id: 'cln-2', clinician_name: 'Meridian East',     stars: 2, comment: 'The clinic facilities could be improved. Waiting room was crowded.', response: "Thank you for your feedback. We're renovating Q2 2026.", created_at: '2026-03-15T10:30:00Z' },
  { id: 'rev-12', appointment_id: 'appt-9',  patient_id: 'pt-9',  patient_name: 'Mei-Lin Zhang',    clinician_id: 'cln-7', clinician_name: 'Dr. Amara Diallo',   stars: 4, comment: 'Dr. Diallo is clearly passionate about her patients. Very empathetic consultation.', response: null, created_at: '2026-03-11T12:30:00Z' },
  { id: 'rev-13', appointment_id: 'appt-12', patient_id: 'pt-12', patient_name: 'Hassan Malik',     clinician_id: 'cln-1', clinician_name: 'Dr. Sarah Mitchell', stars: 5, comment: 'Outstanding care. 5 stars without hesitation.', response: null, created_at: '2026-03-06T09:30:00Z' },
  { id: 'rev-14', appointment_id: 'appt-18', patient_id: 'pt-18', patient_name: "Patrick O'Brien",  clinician_id: 'cln-5', clinician_name: 'Lucy Harrington',    stars: 5, comment: 'Best physio I\'ve had. Already seeing results after 2 sessions.', response: null, created_at: '2026-03-03T11:30:00Z' },
  { id: 'rev-15', appointment_id: 'appt-14', patient_id: 'pt-14', patient_name: 'Roberto Silva',    clinician_id: 'cln-3', clinician_name: 'Dr. Priya Sharma',  stars: 3, comment: 'Good clinician, but waiting 20 minutes past appointment time was frustrating.', response: 'Apologies for the delay — we had an emergency earlier that day. Your patience is appreciated.', created_at: '2026-03-05T14:30:00Z' },
]

// Average ratings (pre-computed for efficiency)
export const CLINICIAN_RATINGS = {
  'cln-1': { avg: 4.8, count: 8 },
  'cln-3': { avg: 3.9, count: 5 },
  'cln-4': { avg: 4.3, count: 3 },
  'cln-5': { avg: 4.9, count: 6 },
  'cln-6': { avg: 4.8, count: 4 },
  'cln-7': { avg: 4.2, count: 3 },
}

// ─── Invoices / Billing ───────────────────────────────────────────────────────
export const INVOICES = [
  { id:'inv-1',  appointment_id:'appt-4',  patient_id:'pt-4',  patient_name:'George Williams',  service_name:'Physiotherapy Session',   base_price:65,  products_total:28, subtotal:93,  vat:18.60, total:111.60, status:'paid',    payment_method:'card',      paid_at:'2026-03-14T00:00:00Z' },
  { id:'inv-2',  appointment_id:'appt-9',  patient_id:'pt-9',  patient_name:'Mei-Lin Zhang',    service_name:'Physiotherapy Session',   base_price:65,  products_total:0,  subtotal:65,  vat:13.00, total:78.00,  status:'paid',    payment_method:'card',      paid_at:'2026-03-10T00:00:00Z' },
  { id:'inv-3',  appointment_id:'appt-12', patient_id:'pt-12', patient_name:'Hassan Malik',     service_name:'Blood Pressure Check',    base_price:20,  products_total:16, subtotal:36,  vat:7.20,  total:43.20,  status:'paid',    payment_method:'card',      paid_at:'2026-03-05T00:00:00Z' },
  { id:'inv-4',  appointment_id:'appt-14', patient_id:'pt-14', patient_name:'Roberto Silva',    service_name:'Cardio Assessment',       base_price:110, products_total:0,  subtotal:110, vat:22.00, total:132.00, status:'paid',    payment_method:'insurance', paid_at:'2026-03-04T00:00:00Z' },
  { id:'inv-5',  appointment_id:'appt-18', patient_id:'pt-18', patient_name:"Patrick O'Brien",  service_name:'Sports Injury Assessment',base_price:90,  products_total:22, subtotal:112, vat:22.40, total:134.40, status:'paid',    payment_method:'card',      paid_at:'2026-03-02T00:00:00Z' },
  { id:'inv-6',  appointment_id:'appt-20', patient_id:'pt-1',  patient_name:'Alice Thompson',   service_name:'Extended GP Consultation',base_price:70,  products_total:12, subtotal:82,  vat:16.40, total:98.40,  status:'paid',    payment_method:'card',      paid_at:'2025-12-10T00:00:00Z' },
  { id:'inv-7',  appointment_id:'appt-21', patient_id:'pt-20', patient_name:'William Blackwood', service_name:'Cardio Assessment',      base_price:110, products_total:0,  subtotal:110, vat:22.00, total:132.00, status:'paid',    payment_method:'insurance', paid_at:'2026-02-18T00:00:00Z' },
  { id:'inv-8',  appointment_id:'appt-25', patient_id:'pt-24', patient_name:'Finn Jacobsen',    service_name:'Physiotherapy Session',   base_price:65,  products_total:28, subtotal:93,  vat:18.60, total:111.60, status:'paid',    payment_method:'card',      paid_at:'2026-02-12T00:00:00Z' },
  { id:'inv-9',  appointment_id:'appt-30', patient_id:'pt-28', patient_name:'Tom Andersson',    service_name:'Cardio Assessment',       base_price:110, products_total:0,  subtotal:110, vat:22.00, total:132.00, status:'paid',    payment_method:'insurance', paid_at:'2026-02-05T00:00:00Z' },
  { id:'inv-10', appointment_id:'appt-33', patient_id:'pt-6',  patient_name:'Dmitri Volkov',    service_name:'CBT Session',             base_price:120, products_total:10, subtotal:130, vat:26.00, total:156.00, status:'paid',    payment_method:'card',      paid_at:'2026-03-03T00:00:00Z' },
  { id:'inv-11', appointment_id:'appt-1',  patient_id:'pt-1',  patient_name:'Alice Thompson',   service_name:'GP Consultation',         base_price:40,  products_total:0,  subtotal:40,  vat:8.00,  total:48.00,  status:'unpaid',  payment_method:null,        paid_at:null },
  { id:'inv-12', appointment_id:'appt-2',  patient_id:'pt-2',  patient_name:'Marcus Chen',      service_name:'Extended GP Consultation',base_price:70,  products_total:0,  subtotal:70,  vat:14.00, total:84.00,  status:'unpaid',  payment_method:null,        paid_at:null },
  { id:'inv-13', appointment_id:'appt-3',  patient_id:'pt-3',  patient_name:'Fatima Al-Hassan', service_name:'Cardio Assessment',       base_price:110, products_total:0,  subtotal:110, vat:22.00, total:132.00, status:'unpaid',  payment_method:null,        paid_at:null },
  { id:'inv-14', appointment_id:'appt-5',  patient_id:'pt-5',  patient_name:'Sophie Turner',    service_name:'Skin Consultation',       base_price:55,  products_total:18, subtotal:73,  vat:14.60, total:87.60,  status:'unpaid',  payment_method:null,        paid_at:null },
  { id:'inv-15', appointment_id:'appt-13', patient_id:'pt-13', patient_name:'Chloe Parker',     service_name:'Acne Treatment',          base_price:80,  products_total:42, subtotal:122, vat:24.40, total:146.40, status:'unpaid',  payment_method:null,        paid_at:null },
  { id:'inv-16', appointment_id:'appt-29', patient_id:'pt-27', patient_name:'Kavya Nair',       service_name:'GP Consultation',         base_price:40,  products_total:0,  subtotal:40,  vat:8.00,  total:48.00,  status:'overdue', payment_method:null,        paid_at:null },
  { id:'inv-17', appointment_id:'appt-35', patient_id:'pt-12', patient_name:'Hassan Malik',     service_name:'Acne Treatment',          base_price:80,  products_total:16, subtotal:96,  vat:19.20, total:115.20, status:'overdue', payment_method:null,        paid_at:null },
  { id:'inv-18', appointment_id:'appt-22', patient_id:'pt-21', patient_name:'Nadia Petrova',    service_name:'CBT Session',             base_price:120, products_total:0,  subtotal:120, vat:24.00, total:144.00, status:'overdue', payment_method:null,        paid_at:null },
]

// ─── Analytics Data ───────────────────────────────────────────────────────────
export const DASHBOARD_KPIS = {
  total_appointments_today:       12,
  total_appointments_today_delta: +3,
  total_appointments_week:        67,
  total_appointments_month:       284,
  total_clinicians:               10,
  total_clinicians_delta:         +1,
  total_patients:                 127,
  total_patients_delta:           +8,
  total_revenue_month:            18450,
  total_revenue_month_pct:        +12.3,
  no_show_rate:                   8.5,
}

// Volume by day — 30 days Mon-Fri peaks
export const VOLUME_BY_DAY = [
  { date: '2026-02-14', confirmed: 9,  cancelled: 1 },
  { date: '2026-02-15', confirmed: 11, cancelled: 0 },
  { date: '2026-02-16', confirmed: 8,  cancelled: 2 },
  { date: '2026-02-17', confirmed: 14, cancelled: 1 },
  { date: '2026-02-18', confirmed: 12, cancelled: 0 },
  { date: '2026-02-19', confirmed: 3,  cancelled: 0 },
  { date: '2026-02-20', confirmed: 1,  cancelled: 0 },
  { date: '2026-02-21', confirmed: 10, cancelled: 2 },
  { date: '2026-02-22', confirmed: 13, cancelled: 1 },
  { date: '2026-02-23', confirmed: 11, cancelled: 0 },
  { date: '2026-02-24', confirmed: 15, cancelled: 2 },
  { date: '2026-02-25', confirmed: 12, cancelled: 1 },
  { date: '2026-02-26', confirmed: 4,  cancelled: 0 },
  { date: '2026-02-27', confirmed: 2,  cancelled: 0 },
  { date: '2026-02-28', confirmed: 11, cancelled: 1 },
  { date: '2026-03-01', confirmed: 9,  cancelled: 0 },
  { date: '2026-03-02', confirmed: 13, cancelled: 2 },
  { date: '2026-03-03', confirmed: 10, cancelled: 1 },
  { date: '2026-03-04', confirmed: 12, cancelled: 0 },
  { date: '2026-03-05', confirmed: 14, cancelled: 1 },
  { date: '2026-03-06', confirmed: 4,  cancelled: 0 },
  { date: '2026-03-07', confirmed: 2,  cancelled: 0 },
  { date: '2026-03-08', confirmed: 11, cancelled: 2 },
  { date: '2026-03-09', confirmed: 12, cancelled: 1 },
  { date: '2026-03-10', confirmed: 10, cancelled: 0 },
  { date: '2026-03-11', confirmed: 13, cancelled: 2 },
  { date: '2026-03-12', confirmed: 9,  cancelled: 1 },
  { date: '2026-03-13', confirmed: 3,  cancelled: 0 },
  { date: '2026-03-14', confirmed: 1,  cancelled: 0 },
  { date: '2026-03-15', confirmed: 12, cancelled: 0 },
]

export const UTILISATION_BY_CLINICIAN = [
  { clinician: 'Dr. Mitchell',   id: 'cln-1', slots_available: 32, slots_booked: 28, utilisation: 87.5 },
  { clinician: 'Dr. Okafor',    id: 'cln-2', slots_available: 24, slots_booked: 18, utilisation: 75.0 },
  { clinician: 'Dr. Sharma',    id: 'cln-3', slots_available: 16, slots_booked: 14, utilisation: 87.5 },
  { clinician: 'Dr. Greaves',   id: 'cln-4', slots_available: 24, slots_booked: 19, utilisation: 79.2 },
  { clinician: 'L. Harrington', id: 'cln-5', slots_available: 32, slots_booked: 25, utilisation: 78.1 },
  { clinician: 'Dr. Whitfield', id: 'cln-6', slots_available: 16, slots_booked: 12, utilisation: 75.0 },
  { clinician: 'Dr. Diallo',    id: 'cln-7', slots_available: 40, slots_booked: 31, utilisation: 77.5 },
  { clinician: 'Dr. Curtis',    id: 'cln-8', slots_available: 24, slots_booked: 16, utilisation: 66.7 },
  { clinician: 'Dr. Patel',     id: 'cln-9', slots_available: 32, slots_booked: 22, utilisation: 68.8 },
]

export const BOOKINGS_BY_SERVICE = [
  { service: 'GP Consultation',            bookings: 68,  revenue: 2720 },
  { service: 'Extended GP Consultation',   bookings: 32,  revenue: 2240 },
  { service: 'CBT Session',               bookings: 22,  revenue: 2640 },
  { service: 'Cardio Assessment',          bookings: 18,  revenue: 1980 },
  { service: 'Physiotherapy Session',      bookings: 28,  revenue: 1820 },
  { service: 'Psychiatry Initial Consult', bookings: 16,  revenue: 2400 },
  { service: 'Acne Treatment',             bookings: 12,  revenue: 960  },
  { service: 'Skin Consultation',          bookings: 14,  revenue: 770  },
  { service: 'Sports Injury Assessment',   bookings: 10,  revenue: 900  },
  { service: 'Child Well-check',           bookings: 9,   revenue: 315  },
  { service: 'Vaccination Appointment',    bookings: 8,   revenue: 200  },
  { service: 'Blood Pressure Check',       bookings: 7,   revenue: 140  },
]

export const MONTHLY_REVENUE = [
  { month: 'Jan 2026', total: 14200, appointments: 198, avg_per_appt: 71.72, no_show_rate: 12.1 },
  { month: 'Feb 2026', total: 16800, appointments: 234, avg_per_appt: 71.79, no_show_rate: 9.4 },
  { month: 'Mar 2026', total: 18450, appointments: 284, avg_per_appt: 64.97, no_show_rate: 8.5 },
]

export const REVENUE_BY_CLINICIAN = [
  { clinician: 'Dr. Mitchell',   id: 'cln-1', revenue: 4280, appointments: 107 },
  { clinician: 'Dr. Sharma',    id: 'cln-3', revenue: 3520, appointments: 32  },
  { clinician: 'Dr. Whitfield', id: 'cln-6', revenue: 2700, appointments: 18  },
  { clinician: 'Dr. Diallo',    id: 'cln-7', revenue: 1240, appointments: 31  },
  { clinician: 'L. Harrington', id: 'cln-5', revenue: 1625, appointments: 25  },
  { clinician: 'Dr. Greaves',   id: 'cln-4', revenue: 1045, appointments: 19  },
  { clinician: 'Dr. Patel',     id: 'cln-9', revenue: 880,  appointments: 22  },
  { clinician: 'Dr. Curtis',    id: 'cln-8', revenue: 720,  appointments: 16  },
  { clinician: 'Dr. Okafor',    id: 'cln-2', revenue: 720,  appointments: 18  },
]

// ─── Availability Templates ───────────────────────────────────────────────────
export const AVAILABILITY_TEMPLATES = [
  { id: 'avt-1',  clinician_id: 'cln-1',  days: ['monday','tuesday','wednesday','thursday','friday'], start_time: '09:00', end_time: '17:00', break_start: '13:00', break_end: '14:00', slot_minutes: 15 },
  { id: 'avt-2',  clinician_id: 'cln-2',  days: ['monday','wednesday','friday'],                      start_time: '08:30', end_time: '16:30', break_start: '12:30', break_end: '13:30', slot_minutes: 15 },
  { id: 'avt-3',  clinician_id: 'cln-3',  days: ['tuesday','thursday'],                               start_time: '10:00', end_time: '18:00', break_start: '13:00', break_end: '14:00', slot_minutes: 40 },
  { id: 'avt-4',  clinician_id: 'cln-4',  days: ['monday','tuesday','wednesday','thursday'],           start_time: '09:00', end_time: '16:00', break_start: '12:00', break_end: '13:00', slot_minutes: 20 },
  { id: 'avt-5',  clinician_id: 'cln-5',  days: ['monday','tuesday','wednesday','thursday','friday'], start_time: '08:00', end_time: '16:00', break_start: '12:00', break_end: '13:00', slot_minutes: 45 },
  { id: 'avt-6',  clinician_id: 'cln-6',  days: ['monday','tuesday','thursday'],                      start_time: '09:00', end_time: '17:00', break_start: '13:00', break_end: '14:00', slot_minutes: 60 },
  { id: 'avt-7',  clinician_id: 'cln-7',  days: ['monday','tuesday','wednesday','thursday','friday'], start_time: '08:30', end_time: '17:30', break_start: '12:00', break_end: '13:00', slot_minutes: 15 },
  { id: 'avt-8',  clinician_id: 'cln-8',  days: ['monday','tuesday','wednesday','thursday','friday'], start_time: '09:00', end_time: '15:00', break_start: '12:00', break_end: '12:30', slot_minutes: 20 },
  { id: 'avt-9',  clinician_id: 'cln-9',  days: ['tuesday','wednesday','thursday','friday'],          start_time: '10:00', end_time: '18:00', break_start: '13:00', break_end: '14:00', slot_minutes: 15 },
]

export const LEAVE_BLOCKS = [
  { id: 'lv-1', clinician_id: 'cln-1', start_date: '2026-04-14', end_date: '2026-04-18', reason: 'Annual leave',         type: 'leave'    },
  { id: 'lv-2', clinician_id: 'cln-5', start_date: '2026-03-24', end_date: '2026-03-24', reason: 'Sick day',             type: 'sick'     },
  { id: 'lv-3', clinician_id: 'cln-6', start_date: '2026-04-07', end_date: '2026-04-07', reason: 'Conference',           type: 'admin'    },
  { id: 'lv-4', clinician_id: 'cln-3', start_date: '2026-04-21', end_date: '2026-04-22', reason: 'CPD training',         type: 'training' },
  { id: 'lv-5', clinician_id: 'cln-2', start_date: '2026-03-27', end_date: '2026-03-28', reason: 'Personal leave',       type: 'leave'    },
  { id: 'lv-6', clinician_id: 'cln-9', start_date: '2026-04-01', end_date: '2026-04-03', reason: 'Annual leave',         type: 'leave'    },
  { id: 'lv-7', clinician_id: 'cln-7', start_date: '2026-04-24', end_date: '2026-04-24', reason: 'Medical appointment',  type: 'personal' },
  { id: 'lv-8', clinician_id: 'cln-4', start_date: '2026-04-15', end_date: '2026-04-16', reason: 'Annual leave',         type: 'leave'    },
]

export const CLINIC_BLOCKS = [
  { id: 'blk-1', clinic_id: 'cli-1', title: 'Easter Bank Holiday',         start_date: '2026-04-03', end_date: '2026-04-06', type: 'holiday'  },
  { id: 'blk-2', clinic_id: 'cli-1', title: 'Annual Deep Clean',            start_date: '2026-04-15', end_date: '2026-04-15', type: 'admin'    },
  { id: 'blk-3', clinic_id: 'cli-2', title: 'Building Maintenance',         start_date: '2026-03-22', end_date: '2026-03-22', type: 'admin'    },
  { id: 'blk-4', clinic_id: 'cli-3', title: 'Staff Training Day',           start_date: '2026-03-28', end_date: '2026-03-28', type: 'training' },
  { id: 'blk-5', clinic_id: 'cli-4', title: 'Derma Conference (half day)',   start_date: '2026-04-10', end_date: '2026-04-10', type: 'training' },
  { id: 'blk-6', clinic_id: 'cli-5', title: 'Bank Holiday',                 start_date: '2026-04-03', end_date: '2026-04-03', type: 'holiday'  },
  { id: 'blk-7', clinic_id: 'cli-1', title: 'System Upgrade Downtime',      start_date: '2026-04-20', end_date: '2026-04-20', type: 'admin'    },
  { id: 'blk-8', clinic_id: 'cli-2', title: 'Room Refurbishment',           start_date: '2026-04-28', end_date: '2026-04-30', type: 'admin'    },
]

// ─── Products ─────────────────────────────────────────────────────────────────
export const PRODUCTS = [
  { id: 'prod-1',  name: 'SPF 50 Sunscreen',        clinic_id: 'cli-4', category: 'skincare',    price: 18, stock: 150, is_active: true },
  { id: 'prod-2',  name: 'Vitamin D Supplement',    clinic_id: 'cli-1', category: 'supplement',  price: 12, stock: 200, is_active: true },
  { id: 'prod-3',  name: 'Omega-3 Fish Oil',         clinic_id: 'cli-1', category: 'supplement',  price: 15, stock: 180, is_active: true },
  { id: 'prod-4',  name: 'Resistance Band Set',      clinic_id: 'cli-2', category: 'equipment',   price: 22, stock: 60,  is_active: true },
  { id: 'prod-5',  name: 'Foam Roller',              clinic_id: 'cli-2', category: 'equipment',   price: 28, stock: 45,  is_active: true },
  { id: 'prod-6',  name: 'Retinol Night Cream',      clinic_id: 'cli-4', category: 'skincare',    price: 42, stock: 80,  is_active: true },
  { id: 'prod-7',  name: 'Salicylic Acid Cleanser',  clinic_id: 'cli-4', category: 'skincare',    price: 16, stock: 120, is_active: true },
  { id: 'prod-8',  name: 'Peak Flow Meter',          clinic_id: 'cli-1', category: 'equipment',   price: 14, stock: 90,  is_active: true },
  { id: 'prod-9',  name: 'Blood Pressure Cuff',      clinic_id: 'cli-1', category: 'equipment',   price: 35, stock: 40,  is_active: true },
  { id: 'prod-10', name: 'Melatonin 5mg',            clinic_id: 'cli-3', category: 'supplement',  price: 10, stock: 160, is_active: true },
]

// ─── Admin reference data ─────────────────────────────────────────────────────
export const ROLES_PERMISSIONS = [
  { role: 'super_admin', permissions: ['all'] },
  { role: 'admin',       permissions: ['manage_users', 'manage_orgs', 'manage_roles', 'manage_clinician_types', 'manage_room_types', 'manage_languages', 'manage_email_templates', 'manage_policies', 'view_all'] },
  { role: 'manager',     permissions: ['manage_clinics', 'manage_rooms', 'manage_services', 'manage_products', 'manage_availability_blocks', 'view_analytics', 'view_finances', 'respond_reviews'] },
  { role: 'clinician',   permissions: ['view_own_calendar', 'manage_own_availability', 'view_own_patients', 'message_patients', 'complete_appointments'] },
  { role: 'staff',       permissions: ['manage_appointments', 'create_patients', 'run_booking_wizard', 'view_schedule'] },
  { role: 'patient',     permissions: ['book_appointments', 'view_own_appointments', 'message_clinicians', 'leave_reviews', 'update_profile'] },
]

export const EMAIL_TEMPLATES = [
  { id: 'et-1', type: 'appointment_confirmed',  subject: 'Your appointment has been confirmed',     body: '<p>Dear {{patient_name}}, your appointment with {{clinician_name}} on {{date}} at {{time}} is confirmed.</p>' },
  { id: 'et-2', type: 'appointment_reminder',   subject: 'Reminder: Your appointment tomorrow at {{time}}', body: '<p>Dear {{patient_name}}, this is a reminder of your appointment tomorrow at {{time}} with {{clinician_name}}.</p>' },
  { id: 'et-3', type: 'appointment_cancelled',  subject: 'Your appointment has been cancelled',    body: '<p>Dear {{patient_name}}, your appointment on {{date}} has been cancelled.</p>' },
  { id: 'et-4', type: 'appointment_rescheduled',subject: 'Your appointment has been rescheduled',  body: '<p>Dear {{patient_name}}, your appointment has been rescheduled to {{new_date}} at {{new_time}}.</p>' },
  { id: 'et-5', type: 'welcome',               subject: 'Welcome to MediBook',                      body: '<p>Welcome to MediBook, {{name}}! Your account is now active.</p>' },
  { id: 'et-6', type: 'password_reset',         subject: 'Reset your MediBook password',            body: '<p>Click <a href="{{reset_link}}">here</a> to reset your password. This link expires in 1 hour.</p>' },
]

export const POLICIES = [
  { id: 'pol-1', name: 'Cancellation Policy',     content: 'Appointments cancelled within 24 hours of the scheduled time may be subject to a cancellation fee equal to 50% of the service price.',   updated_at: '2025-01-15T00:00:00Z' },
  { id: 'pol-2', name: 'No-Show Policy',          content: 'Patients who do not attend without prior cancellation will be recorded as a no-show. Two consecutive no-shows may result in a booking restriction.', updated_at: '2025-01-15T00:00:00Z' },
  { id: 'pol-3', name: 'Data Retention Policy',   content: 'Patient records are retained for a minimum of 8 years in accordance with NHS and ICO guidelines.',                                           updated_at: '2025-03-01T00:00:00Z' },
  { id: 'pol-4', name: 'Video Consultation Terms',content: 'Video consultations are conducted via our secure platform. Recordings are not made. Both parties must be in a private location.',              updated_at: '2025-06-01T00:00:00Z' },
]
