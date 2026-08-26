/**
 * src/mocks/referenceData.js
 * SUG-MGR-006 — Centralised mock reference data for offline/dev mode.
 * Consumed by: Blocks.jsx, Availability.jsx, and any future manager sub-pages.
 */

export const MOCK_CLINICIANS = [
  { id: 'cln-1', firstName: 'Dr. Sarah', lastName: 'Mitchell', isActive: true },
  { id: 'cln-2', firstName: 'Dr. James', lastName: 'Okafor', isActive: true },
  { id: 'cln-3', firstName: 'Dr. Priya', lastName: 'Sharma', isActive: true },
  { id: 'cln-5', firstName: 'Dr. Lucy', lastName: 'Harrington', isActive: true },
  { id: 'cln-6', firstName: 'Dr. Ben', lastName: 'Whitfield', isActive: true },
]

export const MOCK_CLINICS = [
  { id: 'cli-1', name: 'City Heart Clinic' },
  { id: 'cli-2', name: 'Central Medical Centre' },
  { id: 'cli-3', name: 'Family Health Hub' },
  { id: 'cli-4', name: 'CityCore West End' },
  { id: 'cli-5', name: 'Wellspring Primary' },
]

export const MOCK_ROOMS = [
  { id: 'room-1', room_number: '1A', clinic_id: 'cli-1', isActive: true },
  { id: 'room-2', room_number: '2B', clinic_id: 'cli-1', isActive: true },
  { id: 'room-3', room_number: 'Suite A', clinic_id: 'cli-2', isActive: true },
  { id: 'room-4', room_number: '3C', clinic_id: 'cli-3', isActive: true },
]
