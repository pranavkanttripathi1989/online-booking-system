import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Alert, Box, Button, Card, CardContent, Chip, Grid, IconButton, MenuItem,
  Stack, TextField, ToggleButton, ToggleButtonGroup, Typography, Dialog,
  DialogTitle, DialogContent, DialogActions,
} from '@mui/material'
import AddRoundedIcon from '@mui/icons-material/AddRounded'
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded'
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded'
import PersonRoundedIcon from '@mui/icons-material/PersonRounded'
import dayjs from 'dayjs'

import ErrorBoundary from '../../components/ErrorBoundary'
import EmptyState from '../../components/shared/EmptyState'
import { useMockData, useMockMutation } from '../../mocks/useMockData'
import * as MockStore from '../../mocks/store'
import { TASK_TYPES, TASK_PRIORITIES, TASK_STATUSES } from '../../mocks/data/tasks'

const PRIORITY_COLOR = { Low: 'default', Medium: 'warning', High: 'error' }
const STATUS_COLOR = { Open: 'default', 'In Progress': 'info', Done: 'success' }

// ─── Validation (context/frontend-hard-rules.md §2.1) ─────────────────────────
const taskSchema = z.object({
  subject: z.string().trim().min(1, 'Required'),
  task_type: z.string().default('General'),
  priority: z.string().default('Medium'),
  due_date: z.string().optional(),
  assigned_to_name: z.string().optional(),
  patient_name: z.string().optional(),
})

function TasksPageContent() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState('All')
  const [createOpen, setCreateOpen] = useState(false)

  const { data: tasks } = useMockData((store) => store.getTasks(statusFilter === 'All' ? {} : { status: statusFilter }))
  const [createTask, { loading: creating }] = useMockMutation(MockStore.createTask)
  const [updateTaskStatus] = useMockMutation(MockStore.updateTaskStatus)
  const [deleteTask] = useMockMutation(MockStore.deleteTask)

  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: { subject: '', task_type: 'General', priority: 'Medium', due_date: '', assigned_to_name: '', patient_name: '' },
  })

  const onSubmit = async (values) => {
    await createTask(values)
    reset()
    setCreateOpen(false)
  }

  const advanceStatus = (task) => {
    const idx = TASK_STATUSES.indexOf(task.status)
    const next = TASK_STATUSES[Math.min(idx + 1, TASK_STATUSES.length - 1)]
    updateTaskStatus(task.id, next)
  }

  const taskList = tasks ?? []
  const isOverdue = (task) => task.due_date && dayjs(task.due_date).isBefore(dayjs(), 'day') && task.status !== 'Done'

  return (
    <Box className="page-enter">
      <Helmet><title>Tasks — MediBook</title></Helmet>

      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1.5} mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Tasks</Typography>
          <Typography variant="body2" color="text.secondary">Internal follow-ups and staff to-dos</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setCreateOpen(true)} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          Add Task
        </Button>
      </Stack>

      <ToggleButtonGroup
        value={statusFilter} exclusive size="small"
        onChange={(_, v) => v && setStatusFilter(v)}
        sx={{ mb: 3, flexWrap: 'wrap' }}
      >
        {['All', ...TASK_STATUSES].map((s) => (
          <ToggleButton key={s} value={s} sx={{ textTransform: 'none', fontWeight: 700, px: 2 }}>{s}</ToggleButton>
        ))}
      </ToggleButtonGroup>

      {taskList.length === 0 ? (
        <EmptyState title="No tasks" subtitle="Nothing matches this filter." />
      ) : (
        <Grid container spacing={2}>
          {taskList.map((task) => (
            <Grid item xs={12} sm={6} md={4} key={task.id}>
              <Card variant="outlined" sx={{ height: '100%', borderColor: isOverdue(task) ? 'error.main' : undefined }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
                    <Typography fontWeight={700} sx={{ flex: 1 }}>{task.subject}</Typography>
                    <IconButton size="small" onClick={() => deleteTask(task.id)} aria-label={`Delete task ${task.subject}`}>
                      <DeleteRoundedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>{task.task_type}</Typography>
                  <Stack direction="row" spacing={0.75} flexWrap="wrap" sx={{ mb: 1.5 }}>
                    <Chip label={task.priority} size="small" color={PRIORITY_COLOR[task.priority]} sx={{ fontWeight: 700 }} />
                    <Chip label={task.status} size="small" color={STATUS_COLOR[task.status]} sx={{ fontWeight: 700 }} />
                    {isOverdue(task) && <Chip label="Overdue" size="small" color="error" sx={{ fontWeight: 700 }} />}
                  </Stack>
                  {task.patient_name && (
                    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.5, cursor: task.patient_id ? 'pointer' : 'default' }} onClick={() => task.patient_id && navigate(`/patients/${task.patient_id}`)}>
                      <PersonRoundedIcon sx={{ fontSize: '0.9rem', color: 'text.disabled' }} />
                      <Typography variant="caption" color="text.secondary">{task.patient_name}</Typography>
                    </Stack>
                  )}
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 1.5 }}>
                    <ScheduleRoundedIcon sx={{ fontSize: '0.9rem', color: 'text.disabled' }} />
                    <Typography variant="caption" color="text.secondary">
                      {task.due_date ? dayjs(task.due_date).format('DD/MM/YYYY') : 'No due date'} · {task.assigned_to_name ?? 'Unassigned'}
                    </Typography>
                  </Stack>
                  {task.status !== 'Done' && (
                    <Button size="small" startIcon={<CheckCircleRoundedIcon />} onClick={() => advanceStatus(task)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                      Mark {task.status === 'Open' ? 'In Progress' : 'Done'}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>New Task</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} pt={0.5}>
            <Controller name="subject" control={control} render={({ field }) => (
              <TextField {...field} label="Subject *" fullWidth size="small" error={!!errors.subject} helperText={errors.subject?.message} />
            )} />
            <Controller name="task_type" control={control} render={({ field }) => (
              <TextField {...field} select label="Type" fullWidth size="small">
                {TASK_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
              </TextField>
            )} />
            <Controller name="priority" control={control} render={({ field }) => (
              <TextField {...field} select label="Priority" fullWidth size="small">
                {TASK_PRIORITIES.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </TextField>
            )} />
            <Controller name="due_date" control={control} render={({ field }) => (
              <TextField {...field} type="date" label="Due date" fullWidth size="small" InputLabelProps={{ shrink: true }} />
            )} />
            <Controller name="assigned_to_name" control={control} render={({ field }) => (
              <TextField {...field} label="Assigned to" fullWidth size="small" />
            )} />
            <Controller name="patient_name" control={control} render={({ field }) => (
              <TextField {...field} label="Related patient (optional)" fullWidth size="small" />
            )} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ textTransform: 'none', fontWeight: 700 }}>Cancel</Button>
          <Button variant="contained" disabled={creating} onClick={handleSubmit(onSubmit)} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}>
            {creating ? 'Saving…' : 'Create Task'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default function TasksPage() {
  return (
    <ErrorBoundary>
      <TasksPageContent />
    </ErrorBoundary>
  )
}
