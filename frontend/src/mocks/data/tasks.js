/**
 * MOCK TASKS — internal staff follow-ups, mirrors Semble's Task object
 * (subject, taskType, priority, status, dueDate, assignedTo, patient link).
 * requirements/semble-competitive-gap-analysis-requirements.md Phase 3.
 */

export const TASK_TYPES = ['Follow-up call', 'Chase lab result', 'Insurance claim', 'Prescription renewal', 'General']
export const TASK_PRIORITIES = ['Low', 'Medium', 'High']
export const TASK_STATUSES = ['Open', 'In Progress', 'Done']

export const TASKS = [
  {
    id: 'task-1',
    subject: 'Call to confirm blood test results',
    task_type: 'Chase lab result',
    priority: 'High',
    status: 'Open',
    due_date: '2026-08-18',
    assigned_to_name: 'Sarah Manager',
    patient_name: 'Alice Thompson',
    patient_id: 'pt-1',
    created_at: '2026-08-15T09:00:00Z',
  },
  {
    id: 'task-2',
    subject: 'Renew prescription for Metformin',
    task_type: 'Prescription renewal',
    priority: 'Medium',
    status: 'Open',
    due_date: '2026-08-19',
    assigned_to_name: 'Alex Clinician',
    patient_name: 'Marcus Chen',
    patient_id: 'pt-2',
    created_at: '2026-08-16T10:30:00Z',
  },
  {
    id: 'task-3',
    subject: 'Follow up on missed appointment',
    task_type: 'Follow-up call',
    priority: 'Medium',
    status: 'In Progress',
    due_date: '2026-08-17',
    assigned_to_name: 'Jamie Reception',
    patient_name: 'Sophie Turner',
    patient_id: 'pt-5',
    created_at: '2026-08-14T14:00:00Z',
  },
  {
    id: 'task-4',
    subject: 'Submit TPA claim for cardiac assessment',
    task_type: 'Insurance claim',
    priority: 'High',
    status: 'Open',
    due_date: '2026-08-20',
    assigned_to_name: 'Sarah Manager',
    patient_name: 'George Williams',
    patient_id: 'pt-4',
    created_at: '2026-08-16T11:00:00Z',
  },
  {
    id: 'task-5',
    subject: 'Send welcome pack to new patient',
    task_type: 'General',
    priority: 'Low',
    status: 'Done',
    due_date: '2026-08-15',
    assigned_to_name: 'Jamie Reception',
    patient_name: 'Fatima Al-Hassan',
    patient_id: 'pt-3',
    created_at: '2026-08-13T09:00:00Z',
  },
]
