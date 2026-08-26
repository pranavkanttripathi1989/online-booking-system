/**
 * MOCK PERMISSIONS CATALOG — mirrors backend Permissions{resource, action}
 * (see requirements/semble-competitive-gap-analysis-requirements.md Part 1,
 * context/phase1-frontend-missing-features-implementation-plan.md).
 */

export const PERMISSION_RESOURCES = [
  'appointments',
  'patients',
  'clinicians',
  'clinics',
  'rooms',
  'products',
  'billing',
  'reviews',
  'messages',
  'roles',
  'settings',
  'reports',
]

export const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete', 'export']

export const PERMISSIONS = PERMISSION_RESOURCES.flatMap((resource) =>
  PERMISSION_ACTIONS.map((action) => ({
    id: `perm-${resource}-${action}`,
    resource,
    action,
    name: `${resource}.${action}`,
    description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource.replace('_', ' ')}`,
  })),
)

// ─── Default roles (matches backend seed: admin/super_admin/manager/clinician/staff/patient) ───
export const ROLES = [
  {
    id: 'role-super_admin',
    name: 'super_admin',
    description: 'Full platform access',
    is_active: true,
    is_system: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'role-admin',
    name: 'admin',
    description: 'Clinic administration access',
    is_active: true,
    is_system: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'role-manager',
    name: 'manager',
    description: 'Clinic manager access',
    is_active: true,
    is_system: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'role-clinician',
    name: 'clinician',
    description: 'Clinical staff access',
    is_active: true,
    is_system: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'role-staff',
    name: 'staff',
    description: 'Front-desk staff access',
    is_active: true,
    is_system: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'role-patient',
    name: 'patient',
    description: 'Patient portal access',
    is_active: true,
    is_system: true,
    created_at: '2024-01-01T00:00:00Z',
  },
]

const permId = (resource, action) => `perm-${resource}-${action}`
const allActionsFor = (resource) => PERMISSION_ACTIONS.map((a) => permId(resource, a))

// role_id -> [permission_id, ...] — seeded to roughly match the existing
// ROLES_PERMISSIONS free-text list in mocks/data/analytics.js, translated
// into the resource/action grid.
export const ROLE_PERMISSIONS = {
  'role-super_admin': PERMISSIONS.map((p) => p.id),
  'role-admin': [
    ...allActionsFor('roles'),
    ...allActionsFor('settings'),
    ...allActionsFor('reports'),
    permId('clinicians', 'view'),
    permId('patients', 'view'),
  ],
  'role-manager': [
    ...allActionsFor('clinics'),
    ...allActionsFor('rooms'),
    ...allActionsFor('products'),
    permId('appointments', 'view'),
    permId('appointments', 'edit'),
    permId('billing', 'view'),
    permId('reports', 'view'),
    permId('reviews', 'edit'),
  ],
  'role-clinician': [
    permId('appointments', 'view'),
    permId('appointments', 'edit'),
    permId('patients', 'view'),
    permId('messages', 'view'),
    permId('messages', 'create'),
  ],
  'role-staff': [
    permId('appointments', 'view'),
    permId('appointments', 'create'),
    permId('appointments', 'edit'),
    permId('patients', 'view'),
    permId('patients', 'create'),
  ],
  'role-patient': [
    permId('appointments', 'view'),
    permId('appointments', 'create'),
    permId('messages', 'view'),
    permId('messages', 'create'),
    permId('reviews', 'create'),
  ],
}
