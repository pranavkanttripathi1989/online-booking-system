/**
 * MEDIBOOK MOCK STORE
 * =====================
 * In-memory mutable store that simulates backend state.
 * Pages read from here (instead of Apollo queries) and write to here (instead of mutations).
 *
 * BACKEND SWAP:
 *   Remove this file. Replace useMockData() calls with useQuery/useMutation from graphql/queries.js
 *   The data shapes here intentionally mirror the GraphQL fragment shapes.
 */

import { CLINICIANS, CLINICS, ROOMS, SERVICES, ORGANISATIONS, LANGUAGES, CLINICIAN_TYPES, ROOM_TYPES } from './data/seed'
import { PATIENTS } from './data/patients'
import { APPOINTMENTS } from './data/appointments'
import { MESSAGE_THREADS, NOTIFICATIONS } from './data/messages'
import { REVIEWS, INVOICES, PRODUCTS, AVAILABILITY_TEMPLATES, LEAVE_BLOCKS, CLINIC_BLOCKS,
         DASHBOARD_KPIS, VOLUME_BY_DAY, UTILISATION_BY_CLINICIAN, BOOKINGS_BY_SERVICE,
         MONTHLY_REVENUE, REVENUE_BY_CLINICIAN, ROLES_PERMISSIONS, EMAIL_TEMPLATES, POLICIES } from './data/analytics'

// ─── Deep clone helper ────────────────────────────────────────────────────────
const clone = (data) => JSON.parse(JSON.stringify(data))

// ─── In-memory store (mutable) ────────────────────────────────────────────────
let store = {
  appointments:          clone(APPOINTMENTS),
  patients:              clone(PATIENTS),
  clinicians:            clone(CLINICIANS),
  clinics:               clone(CLINICS),
  rooms:                 clone(ROOMS),
  services:              clone(SERVICES),
  products:              clone(PRODUCTS),
  organisations:         clone(ORGANISATIONS),
  languages:             clone(LANGUAGES),
  clinician_types:       clone(CLINICIAN_TYPES),
  room_types:            clone(ROOM_TYPES),
  message_threads:       clone(MESSAGE_THREADS),
  notifications:         clone(NOTIFICATIONS),
  reviews:               clone(REVIEWS),
  invoices:              clone(INVOICES),
  availability_templates:clone(AVAILABILITY_TEMPLATES),
  leave_blocks:          clone(LEAVE_BLOCKS),
  clinic_blocks:         clone(CLINIC_BLOCKS),
  roles_permissions:     clone(ROLES_PERMISSIONS),
  email_templates:       clone(EMAIL_TEMPLATES),
  policies:              clone(POLICIES),
}

// ─── ID counter ───────────────────────────────────────────────────────────────
let _seq = 100
const nextId = (prefix) => `${prefix}-${++_seq}`

// ─── Listeners (for reactivity) ───────────────────────────────────────────────
const listeners = new Set()
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
const notify = () => listeners.forEach(fn => fn())

// ─── Read API ─────────────────────────────────────────────────────────────────
export const getStore = () => store

// ─────────────────────────────────────────────────────────────────────────────
// APPOINTMENTS
// ─────────────────────────────────────────────────────────────────────────────
export function getAppointments({ status, clinicianId, clinicId, patientId, dateFrom, dateTo, search } = {}) {
  let result = store.appointments
  if (status)      result = result.filter(a => a.status === status)
  if (clinicianId) result = result.filter(a => a.clinician?.id === clinicianId)
  if (clinicId)    result = result.filter(a => a.clinic?.id === clinicId)
  if (patientId)   result = result.filter(a => a.patient?.id === patientId)
  if (dateFrom)    result = result.filter(a => a.start_datetime >= dateFrom)
  if (dateTo)      result = result.filter(a => a.start_datetime <= dateTo + 'T23:59:59Z')
  if (search) {
    const q = search.toLowerCase()
    result = result.filter(a =>
      a.patient?.full_name?.toLowerCase().includes(q) ||
      a.clinician?.full_name?.toLowerCase().includes(q) ||
      a.service?.name?.toLowerCase().includes(q)
    )
  }
  return result.sort((a,b) => a.start_datetime.localeCompare(b.start_datetime))
}

export function getAppointmentById(id) {
  const appt = store.appointments.find(a => a.id === id) ?? null
  if (!appt) return null
  // Generate realistic status_logs for the detail page timeline (NEW-APPT-006)
  if (!appt.status_logs) {
    const createdAt = appt.created_at ?? new Date(Date.now() - 86400000).toISOString()
    const updatedAt = appt.updated_at ?? new Date(new Date(createdAt).getTime() + 3600000).toISOString()
    const logs = [{ id: `log-${id}-0`, status: 'pending', reason: null, created_at: createdAt, changed_by_user: { name: 'System' } }]
    if (appt.status !== 'pending') {
      logs.push({ id: `log-${id}-1`, status: appt.status, reason: appt.cancellation_reason ?? null, created_at: updatedAt, changed_by_user: { name: 'Admin User' } })
    }
    appt.status_logs = logs
  }
  return appt
}

export function updateAppointmentStatus(id, status, reason = null) {
  const appt = store.appointments.find(a => a.id === id)
  if (!appt) return null
  appt.status = status
  if (reason) appt.cancellation_reason = reason
  appt.updated_at = new Date().toISOString()
  notify()
  return appt
}

export function createAppointment(data) {
  const { patientId, clinicianId, serviceId, clinicId, roomId, startDatetime, endDatetime, notes } = data
  const service   = store.services.find(s => s.id === serviceId)
  const clinician = store.clinicians.find(c => c.id === clinicianId)
  const patient   = store.patients.find(p => p.id === patientId)
  const clinic    = store.clinics.find(c => c.id === clinicId)
  const room      = store.rooms.find(r => r.id === roomId) ?? store.rooms.find(r => r.clinic.id === clinicId)
  const appt = {
    id:                  nextId('appt'),
    start_datetime:      startDatetime,
    end_datetime:        endDatetime || startDatetime,
    duration_minutes:    service?.duration_minutes ?? 15,
    status:              'pending',
    notes:               notes ?? null,
    cancellation_reason: null,
    reminder_sent_at:    null,
    created_at:          new Date().toISOString(),
    updated_at:          new Date().toISOString(),
    patient, clinician, clinic, room, service,
    booked_by_user:      null,
    video_room_id:       service?.is_online ? nextId('room') : null,
  }
  store.appointments.push(appt)
  notify()
  return appt
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENTS
// ─────────────────────────────────────────────────────────────────────────────
export function getPatients({ search } = {}) {
  let result = store.patients
  if (search) {
    const q = search.toLowerCase()
    result = result.filter(p =>
      p.full_name?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.phone?.includes(q)
    )
  }
  return result
}

export function getPatientById(id) {
  return store.patients.find(p => p.id === id) ?? null
}

export function createPatient(data) {
  const patient = {
    id: nextId('pt'),
    first_name: data.first_name, last_name: data.last_name,
    full_name: `${data.first_name} ${data.last_name}`,
    date_of_birth: data.date_of_birth, gender: data.gender,
    phone: data.phone, email: data.email,
    address: data.address ?? null,
    notes: data.notes ?? null,
    registered_at: new Date().toISOString(),
  }
  store.patients.push(patient)
  notify()
  return patient
}

export function updatePatient(id, data) {
  const idx = store.patients.findIndex(p => p.id === id)
  if (idx === -1) return null
  store.patients[idx] = { ...store.patients[idx], ...data }
  if (data.first_name || data.last_name) {
    store.patients[idx].full_name = `${store.patients[idx].first_name} ${store.patients[idx].last_name}`
  }
  notify()
  return store.patients[idx]
}

// ─────────────────────────────────────────────────────────────────────────────
// CLINICIANS
// ─────────────────────────────────────────────────────────────────────────────
export function getClinicians({ search, typeId, clinicId, isActive } = {}) {
  let result = store.clinicians
  if (typeId)   result = result.filter(c => c.clinician_type?.id === typeId)
  if (clinicId) result = result.filter(c => c.clinics?.some(cl => cl.id === clinicId))
  if (isActive !== undefined) result = result.filter(c => c.is_active === isActive)
  if (search) {
    const q = search.toLowerCase()
    result = result.filter(c => c.full_name?.toLowerCase().includes(q))
  }
  return result
}

export function getClinicianById(id) {
  return store.clinicians.find(c => c.id === id) ?? null
}

export function createClinician(data) {
  const type = store.clinician_types.find(t => t.id === data.clinician_type_id)
  const clinics = data.clinic_ids?.map(id => store.clinics.find(c => c.id === id)).filter(Boolean) ?? []
  const clinician = {
    id: nextId('cln'),
    first_name: data.first_name, last_name: data.last_name,
    full_name: `${data.first_name} ${data.last_name}`,
    avatar_url: `https://i.pravatar.cc/150?u=${nextId('av')}`,
    clinician_type: type, clinics,
    languages: data.language_ids?.map(id => store.languages.find(l => l.id === id)).filter(Boolean) ?? [],
    consultation_fee: data.consultation_fee ?? 40,
    gender: data.gender ?? 'M', is_active: true,
    joined_at: new Date().toISOString(),
    avg_rating: null, total_reviews: 0, total_patients: 0, appointments_done: 0,
    bio: data.bio ?? '', services: [],
  }
  store.clinicians.push(clinician)
  notify()
  return clinician
}

export function updateClinician(id, data) {
  const idx = store.clinicians.findIndex(c => c.id === id)
  if (idx === -1) return null
  store.clinicians[idx] = { ...store.clinicians[idx], ...data }
  notify()
  return store.clinicians[idx]
}

// ─────────────────────────────────────────────────────────────────────────────
// CLINICS
// ─────────────────────────────────────────────────────────────────────────────
export function getClinics() { return store.clinics }
export function getClinicById(id) { return store.clinics.find(c => c.id === id) ?? null }

export function createClinic(data) {
  const org = store.organisations.find(o => o.id === data.organisation_id)
  const clinic = {
    id: nextId('cli'), name: data.name,
    organisation: org ?? null, city: data.city,
    address: data.address, postcode: data.postcode ?? '',
    timezone: data.timezone ?? 'Europe/London', phone: data.phone ?? '',
    total_rooms: 0, total_clinicians: 0, total_services: 0,
    appointments_month: 0, revenue_month: 0,
    opening_hours: data.opening_hours ?? {
      monday: { open:'09:00', close:'17:00', closed:false },
      tuesday: { open:'09:00', close:'17:00', closed:false },
      wednesday: { open:'09:00', close:'17:00', closed:false },
      thursday: { open:'09:00', close:'17:00', closed:false },
      friday: { open:'09:00', close:'17:00', closed:false },
      saturday: { open:null, close:null, closed:true },
      sunday: { open:null, close:null, closed:true },
    },
    is_active: true,
  }
  store.clinics.push(clinic)
  notify()
  return clinic
}

export function updateClinic(id, data) {
  const idx = store.clinics.findIndex(c => c.id === id)
  if (idx === -1) return null
  store.clinics[idx] = { ...store.clinics[idx], ...data }
  notify()
  return store.clinics[idx]
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOMS
// ─────────────────────────────────────────────────────────────────────────────
export function getRooms(clinicId) {
  return clinicId ? store.rooms.filter(r => r.clinic?.id === clinicId) : store.rooms
}
export function getRoomById(id) { return store.rooms.find(r => r.id === id) ?? null }

export function createRoom(data) {
  const clinic = store.clinics.find(c => c.id === data.clinic_id)
  const type   = store.room_types.find(t => t.id === data.room_type_id)
  const room   = { id: nextId('rm'), name: data.name, clinic, room_type: type, capacity: data.capacity ?? 2, floor: data.floor ?? 1, is_active: true }
  store.rooms.push(room)
  notify()
  return room
}

export function updateRoom(id, data) {
  const idx = store.rooms.findIndex(r => r.id === id)
  if (idx === -1) return null
  store.rooms[idx] = { ...store.rooms[idx], ...data }
  notify()
  return store.rooms[idx]
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICES
// ─────────────────────────────────────────────────────────────────────────────
export function getServices(clinicId) {
  return clinicId ? store.services.filter(s => s.clinic?.id === clinicId) : store.services
}
export function getServiceById(id) { return store.services.find(s => s.id === id) ?? null }

export function createService(data) {
  const clinic   = store.clinics.find(c => c.id === data.clinic_id)
  const service  = {
    id: nextId('svc'), name: data.name, clinic, duration_minutes: data.duration_minutes,
    price: data.price, is_active: data.is_active ?? true, is_online: data.is_online ?? false,
    description: data.description ?? '', bookings_month: 0, revenue_month: 0,
    max_advance_days: data.max_advance_days ?? 60, assigned_clinicians: [],
  }
  store.services.push(service)
  notify()
  return service
}

export function updateService(id, data) {
  const idx = store.services.findIndex(s => s.id === id)
  if (idx === -1) return null
  store.services[idx] = { ...store.services[idx], ...data }
  notify()
  return store.services[idx]
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGES
// ─────────────────────────────────────────────────────────────────────────────
export function getThreads(userId) {
  return store.message_threads.filter(t =>
    t.participants.some(p => p.id === userId)
  ).sort((a,b) => b.last_activity.localeCompare(a.last_activity))
}

export function getThreadById(id) { return store.message_threads.find(t => t.id === id) ?? null }

export function sendMessage(threadId, fromId, body) {
  const thread = store.message_threads.find(t => t.id === threadId)
  if (!thread) return null
  const from = thread.participants.find(p => p.id === fromId)
  const msg  = {
    id: nextId('msg'), from_id: fromId,
    from_name: from?.name ?? 'Unknown',
    from_role: from?.role ?? 'patient',
    body, sent_at: new Date().toISOString(), read: false,
  }
  thread.messages.push(msg)
  thread.last_message  = body
  thread.last_activity = msg.sent_at
  thread.unread_count  = thread.messages.filter(m => !m.read && m.from_id !== fromId).length
  notify()
  return msg
}

export function createThread(participantIds, initialMessage, fromId) {
  const participants = participantIds.map(pid => {
    const cl = store.clinicians.find(c => c.id === pid)
    const pt = store.patients.find(p => p.id === pid)
    if (cl) return { id: cl.id, name: cl.full_name, role: 'clinician', avatar: cl.avatar_url }
    if (pt) return { id: pt.id, name: pt.full_name, role: 'patient',   avatar: `https://i.pravatar.cc/150?u=${pid}` }
    return { id: pid, name: 'Unknown', role: 'patient', avatar: null }
  })
  const thread = {
    id: nextId('thread'), participants,
    last_message: initialMessage, last_activity: new Date().toISOString(), unread_count: 0,
    messages: [],
  }
  store.message_threads.push(thread)
  sendMessage(thread.id, fromId, initialMessage)
  return thread
}

// BUG-MSG-001 fix: mark all messages in thread as read for the given viewer
export function markThreadAsRead(threadId, viewerId) {
  const thread = store.message_threads.find(t => t.id === threadId)
  if (!thread) return
  thread.messages.forEach(m => {
    if (m.from_id !== viewerId) m.read = true
  })
  thread.unread_count = 0
  notify()
}

// ─────────────────────────────────────────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────────────────────────────────────────
export function getReviews({ clinicianId, stars } = {}) {
  let result = store.reviews
  if (clinicianId) result = result.filter(r => r.clinician_id === clinicianId)
  if (stars)       result = result.filter(r => r.stars === stars)
  return result.sort((a,b) => b.created_at.localeCompare(a.created_at))
}

export function createReview(data) {
  const review  = {
    id: nextId('rev'),
    appointment_id: data.appointment_id, patient_id: data.patient_id,
    patient_name: data.patient_name, clinician_id: data.clinician_id,
    clinician_name: data.clinician_name, stars: data.stars,
    comment: data.comment, response: null, created_at: new Date().toISOString(),
  }
  store.reviews.push(review)
  notify()
  return review
}

export function respondToReview(id, response) {
  const review = store.reviews.find(r => r.id === id)
  if (!review) return null
  review.response = response
  notify()
  return review
}

// SUG-REV-003: Persist deletes to MockStore (consistent with respondToReview)
export function deleteReview(id) {
  store.reviews = store.reviews.filter(r => r.id !== id)
  notify()
}

// ─────────────────────────────────────────────────────────────────────────────
// AVAILABILITY / BLOCKS
// ─────────────────────────────────────────────────────────────────────────────
export function getAvailabilityTemplate(clinicianId) {
  return store.availability_templates.find(t => t.clinician_id === clinicianId) ?? null
}

export function getLeaveBlocks(clinicianId) {
  return store.leave_blocks.filter(l => l.clinician_id === clinicianId)
}

export function createLeaveBlock(data) {
  const block = { id: nextId('lv'), ...data }
  store.leave_blocks.push(block)
  notify()
  return block
}

export function getClinicBlocks(clinicId) {
  return store.clinic_blocks.filter(b => b.clinic_id === clinicId)
}

export function createClinicBlock(data) {
  const block = { id: nextId('blk'), ...data }
  store.clinic_blocks.push(block)
  notify()
  return block
}

export function deleteClinicBlock(id) {
  store.clinic_blocks = store.clinic_blocks.filter(b => b.id !== id)
  notify()
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS / BILLING READS
// ─────────────────────────────────────────────────────────────────────────────
export const getDashboardKpis        = () => DASHBOARD_KPIS
export const getVolumeByDay          = () => VOLUME_BY_DAY
export const getUtilisationData      = () => UTILISATION_BY_CLINICIAN
export const getServiceBreakdown     = () => BOOKINGS_BY_SERVICE
export const getMonthlyRevenue       = () => MONTHLY_REVENUE
export const getRevenueByClinicianData = () => REVENUE_BY_CLINICIAN
export const getInvoices             = () => store.invoices
export const getNotifications        = () => store.notifications
export const getRolesPermissions     = () => store.roles_permissions
export const getEmailTemplates       = () => store.email_templates
export const getPolicies             = () => store.policies
export const getOrganisations        = () => store.organisations
export const getLanguages            = () => store.languages
export const getClinicianTypes       = () => store.clinician_types
export const getRoomTypes            = () => store.room_types
export const getProducts             = (clinicId) => clinicId ? store.products.filter(p => p.clinic_id === clinicId) : store.products

// ─────────────────────────────────────────────────────────────────────────────
// SLOT GENERATOR (Booking Wizard Step 3)
// ─────────────────────────────────────────────────────────────────────────────
export function getAvailableSlots(clinicianId, dateStr, durationMinutes = 15) {
  const template = getAvailabilityTemplate(clinicianId)
  if (!template) return []

  const date   = new Date(dateStr + 'T00:00:00Z')
  const dayName = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][date.getUTCDay()]
  if (!template.days.includes(dayName)) return []

  // Check leave blocks
  const onLeave = getLeaveBlocks(clinicianId).some(lv => lv.start_date <= dateStr && lv.end_date >= dateStr)
  if (onLeave) return []

  // Generate slots
  const [sh, sm] = template.start_time.split(':').map(Number)
  const [eh, em] = template.end_time.split(':').map(Number)
  const [bsh, bsm] = (template.break_start ?? '13:00').split(':').map(Number)
  const [beh, bem] = (template.break_end   ?? '14:00').split(':').map(Number)

  const startMins  = sh * 60 + sm
  const endMins    = eh * 60 + em
  const breakStart = bsh * 60 + bsm
  const breakEnd   = beh * 60 + bem

  // Already booked appointments for this clinician on this date
  const bookedSlots = store.appointments
    .filter(a => a.clinician?.id === clinicianId && a.start_datetime.startsWith(dateStr) && !['cancelled','no_show'].includes(a.status))
    .map(a => {
      const t = new Date(a.start_datetime)
      return t.getUTCHours() * 60 + t.getUTCMinutes()
    })

  const slots = []
  for (let m = startMins; m + durationMinutes <= endMins; m += template.slot_minutes) {
    const inBreak  = m < breakEnd && m + durationMinutes > breakStart
    const isBooked = bookedSlots.some(b => m < b + 15 && m + durationMinutes > b)
    const hh = String(Math.floor(m / 60)).padStart(2,'0')
    const mm = String(m % 60).padStart(2,'0')
    slots.push({ time: `${hh}:${mm}`, is_available: !inBreak && !isBooked })
  }
  return slots
}

// ─────────────────────────────────────────────────────────────────────────────
// CLINICIAN AVAILABILITY MOCK DATA (SUG-CLAVAIL-002 / STEP 8)
// Toggle: VITE_MOCK_MODE=true in .env (already used project-wide)
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_CLINICIAN_AVAILABILITY = [
  { id: 'av-1', clinicianId: 'clin-1', dayOfWeek: '0', startTime: '09:00', endTime: '17:00', recurrenceType: 'weekly',  validFrom: null, validUntil: null, roomId: 'room-1' },
  { id: 'av-2', clinicianId: 'clin-1', dayOfWeek: '1', startTime: '09:00', endTime: '17:00', recurrenceType: 'weekly',  validFrom: null, validUntil: null, roomId: 'room-2' },
  { id: 'av-3', clinicianId: 'clin-1', dayOfWeek: '2', startTime: '09:00', endTime: '13:00', recurrenceType: 'weekly',  validFrom: null, validUntil: null, roomId: 'room-1' },
  { id: 'av-4', clinicianId: 'clin-1', dayOfWeek: '3', startTime: '10:00', endTime: '18:00', recurrenceType: 'weekly',  validFrom: null, validUntil: null, roomId: null     },
  { id: 'av-5', clinicianId: 'clin-1', dayOfWeek: '4', startTime: '09:00', endTime: '15:00', recurrenceType: 'weekly',  validFrom: null, validUntil: null, roomId: 'room-3' },
  // Error scenario: set mockAvailabilityError = true to test error paths
]

const MOCK_LUNCH_BREAKS = [
  { id: 'lunch-1', clinicianId: 'clin-1', dayOfWeek: 'daily', startTime: '12:30', endTime: '13:30' },
]

// In-memory copies (mutable, mimics backend state)
let _clinicianAvailability = [...MOCK_CLINICIAN_AVAILABILITY]
let _lunchBreaks           = [...MOCK_LUNCH_BREAKS]

/**
 * Fetch all availability slots for a clinician.
 * @param {string} clinicianId
 * @param {boolean} [simulateError] – pass true to test error state
 */
export function getClinicianAvailability(clinicianId, simulateError = false) {
  if (simulateError) throw new Error('Mock API error: could not fetch availability')
  return _clinicianAvailability.filter(a => a.clinicianId === clinicianId)
}

/**
 * Create or update a clinician availability slot.
 * @param {{ id?: string, clinicianId: string, dayOfWeek: string, startTime: string, endTime: string, recurrenceType: string, roomId?: string, validFrom?: string, validUntil?: string }} input
 */
export function saveMockAvailability(input) {
  if (input.id) {
    _clinicianAvailability = _clinicianAvailability.map(a =>
      a.id === input.id ? { ...a, ...input } : a
    )
    notify()
    return _clinicianAvailability.find(a => a.id === input.id)
  }
  const newSlot = { id: nextId('av'), ...input }
  _clinicianAvailability.push(newSlot)
  notify()
  return newSlot
}

/**
 * Delete a clinician availability slot by ID.
 * @param {string} id
 */
export function deleteMockAvailability(id) {
  _clinicianAvailability = _clinicianAvailability.filter(a => a.id !== id)
  notify()
  return true
}

/**
 * Fetch lunch breaks for a clinician.
 * @param {string} clinicianId
 */
export function getMockLunchBreaks(clinicianId) {
  return _lunchBreaks.filter(lb => lb.clinicianId === clinicianId)
}

/**
 * Create or update a lunch break.
 * @param {{ id?: string, clinicianId: string, dayOfWeek: string, startTime: string, endTime: string }} input
 */
export function saveMockLunchBreak(input) {
  if (input.id) {
    _lunchBreaks = _lunchBreaks.map(lb =>
      lb.id === input.id ? { ...lb, ...input } : lb
    )
    notify()
    return _lunchBreaks.find(lb => lb.id === input.id)
  }
  const newBreak = { id: nextId('lunch'), ...input }
  _lunchBreaks.push(newBreak)
  notify()
  return newBreak
}

/**
 * Delete a lunch break by ID.
 * @param {string} id
 */
export function deleteMockLunchBreak(id) {
  _lunchBreaks = _lunchBreaks.filter(lb => lb.id !== id)
  notify()
  return true
}
