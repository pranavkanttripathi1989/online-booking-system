import { useState } from 'react'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import PreviewIcon from '@mui/icons-material/Preview'
import EditIcon from '@mui/icons-material/Edit'

// ─── Template variable colours ────────────────────────────────────────────────
const VAR_COLOUR = {
  '{patient_name}': 'primary',
  '{clinician_name}': 'secondary',
  '{date}': 'success',
  '{time}': 'success',
  '{service}': 'info',
  '{clinic_name}': 'warning',
  '{reference}': 'default',
  '{cancellation_reason}': 'error',
}

// ─── Default templates ────────────────────────────────────────────────────────
const DEFAULT_TEMPLATES = [
  {
    id: 'booking_confirmation',
    label: 'Booking Confirmation',
    description: 'Sent immediately after an appointment is booked.',
    subject: 'Your appointment at {clinic_name} is confirmed',
    body: `Hi {patient_name},\n\nYour appointment has been confirmed.\n\n📅 Date: {date}\n⏰ Time: {time}\n🏥 Clinic: {clinic_name}\n👨‍⚕️ Clinician: {clinician_name}\n💊 Service: {service}\n📋 Reference: {reference}\n\nIf you need to cancel or reschedule, please contact us at least 24 hours in advance.\n\nSee you soon!`,
  },
  {
    id: 'reminder_24h',
    label: '24-Hour Reminder',
    description: 'Sent 24 hours before the appointment.',
    subject: 'Reminder: Your appointment tomorrow at {time}',
    body: `Hi {patient_name},\n\nThis is a friendly reminder about your appointment tomorrow.\n\n📅 Date: {date}\n⏰ Time: {time}\n🏥 Clinic: {clinic_name}\n👨‍⚕️ Clinician: {clinician_name}\n\nPlease arrive 10 minutes early. If you can't make it, please let us know as soon as possible.\n\nSee you tomorrow!`,
  },
  {
    id: 'cancellation',
    label: 'Cancellation Notice',
    description: 'Sent when an appointment is cancelled.',
    subject: 'Your appointment at {clinic_name} has been cancelled',
    body: `Hi {patient_name},\n\nYour appointment scheduled for {date} at {time} has been cancelled.\n\nReason: {cancellation_reason}\n\nPlease contact us to reschedule at your earliest convenience.\n\nSorry for any inconvenience.`,
  },
  {
    id: 'rescheduled',
    label: 'Reschedule Notification',
    description: 'Sent when an appointment is rescheduled.',
    subject: 'Your appointment has been rescheduled',
    body: `Hi {patient_name},\n\nYour appointment has been rescheduled.\n\n📅 New Date: {date}\n⏰ New Time: {time}\n👨‍⚕️ Clinician: {clinician_name}\n📋 Reference: {reference}\n\nIf this time doesn't work for you, please contact us.`,
  },
]

// ─── Highlight template variables ─────────────────────────────────────────────
function HighlightedBody({ text }) {
  const vars = Object.keys(VAR_COLOUR)
  const parts = text.split(/({\w+})/g)
  return (
    <Box component="pre" sx={{ fontFamily: 'inherit', whiteSpace: 'pre-wrap', wordBreak: 'break-word', m: 0, lineHeight: 1.8 }}>
      {parts.map((part, i) =>
        vars.includes(part) ? (
          <Chip
            key={i}
            label={part}
            color={VAR_COLOUR[part] ?? 'default'}
            size="small"
            sx={{ mx: 0.25, height: 20, fontSize: 11, fontFamily: 'monospace', fontWeight: 700, verticalAlign: 'middle' }}
          />
        ) : part
      )}
    </Box>
  )
}

// ─── Preview Dialog ────────────────────────────────────────────────────────────
function PreviewDialog({ open, onClose, template }) {
  if (!template) return null
  // Fill in sample values
  const sample = {
    '{patient_name}': 'Jane Smith',
    '{clinician_name}': 'Dr. Rajiv Patel',
    '{date}': 'Friday, 14 March 2026',
    '{time}': '10:30 AM',
    '{service}': 'General Consultation',
    '{clinic_name}': 'MediBook London',
    '{reference}': 'APT-2026-00142',
    '{cancellation_reason}': 'Clinician unavailable',
  }
  const fill = (str) => Object.entries(sample).reduce((s, [k, v]) => s.replaceAll(k, v), str)

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ fontWeight: 800 }}>📧 Email Preview — {template.label}</DialogTitle>
      <DialogContent dividers>
        <Paper elevation={0} sx={{ p: 2, mb: 2, bgcolor: 'grey.50', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={700}>SUBJECT</Typography>
          <Typography variant="body2" fontWeight={600} mt={0.25}>{fill(template.subject)}</Typography>
        </Paper>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>
          {fill(template.body)}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  )
}

// ─── NotificationTemplates ────────────────────────────────────────────────────
export default function NotificationTemplates() {
  const [templates, setTemplates] = useState(DEFAULT_TEMPLATES)
  const [editingId, setEditingId] = useState(null)
  const [editValues, setEditValues] = useState({})
  const [previewTemplate, setPreviewTemplate] = useState(null)

  const handleEdit = (t) => {
    setEditingId(t.id)
    setEditValues({ subject: t.subject, body: t.body })
  }

  const handleSave = (id) => {
    setTemplates((prev) => prev.map((t) => t.id === id ? { ...t, ...editValues } : t))
    setEditingId(null)
  }

  return (
    <Box>
      <Typography variant="h6" fontWeight={800} mb={0.5}>Notification Templates</Typography>
      <Typography variant="body2" color="text.secondary" mb={1}>
        Customise the emails sent to patients. Use{' '}
        {Object.keys(VAR_COLOUR).slice(0, 4).map((v) => (
          <Chip key={v} label={v} size="small" color={VAR_COLOUR[v]} sx={{ mx: 0.25, height: 18, fontSize: 10, fontWeight: 700 }} />
        ))} and more as dynamic variables.
      </Typography>

      <Stack spacing={1.5} mt={2}>
        {templates.map((t) => (
          <Accordion
            key={t.id}
            elevation={0}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '10px !important', '&:before': { display: 'none' }, overflow: 'hidden' }}
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2.5 }}>
              <Box flex={1}>
                <Typography variant="subtitle2" fontWeight={700}>{t.label}</Typography>
                <Typography variant="caption" color="text.secondary">{t.description}</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
              <Divider sx={{ mb: 2 }} />
              {editingId === t.id ? (
                <Stack spacing={2}>
                  <TextField
                    label="Email Subject"
                    fullWidth
                    value={editValues.subject}
                    onChange={(e) => setEditValues((v) => ({ ...v, subject: e.target.value }))}
                  />
                  <TextField
                    label="Email Body"
                    fullWidth
                    multiline
                    rows={10}
                    value={editValues.body}
                    onChange={(e) => setEditValues((v) => ({ ...v, body: e.target.value }))}
                    sx={{ fontFamily: 'monospace' }}
                  />
                  <Stack direction="row" spacing={1}>
                    <Button variant="contained" size="small" onClick={() => handleSave(t.id)}>Save</Button>
                    <Button size="small" onClick={() => setEditingId(null)}>Cancel</Button>
                  </Stack>
                </Stack>
              ) : (
                <Stack spacing={1.5}>
                  <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>SUBJECT</Typography>
                    <HighlightedBody text={t.subject} />
                  </Paper>
                  <Paper elevation={0} sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1.5, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} display="block" mb={0.5}>BODY</Typography>
                    <HighlightedBody text={t.body} />
                  </Paper>
                  <Stack direction="row" spacing={1} mt={0.5}>
                    <Button size="small" startIcon={<EditIcon />} onClick={() => handleEdit(t)}>Edit</Button>
                    <Button size="small" startIcon={<PreviewIcon />} onClick={() => setPreviewTemplate(t)}>Preview Email</Button>
                  </Stack>
                </Stack>
              )}
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>

      <PreviewDialog
        open={!!previewTemplate}
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
      />
    </Box>
  )
}
