import { useState, useEffect } from 'react'
import { useApolloClient, gql } from '@apollo/client'
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress,
  Dialog, DialogContent, DialogTitle, Divider, Grid,
  IconButton, Stack, TextField, Tooltip, Typography,
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import PreviewIcon from '@mui/icons-material/Visibility'
import EmailIcon from '@mui/icons-material/Email'
import CloseIcon from '@mui/icons-material/Close'

const GET_EMAIL_TEMPLATES = gql`
  query GetEmailTemplates {
    emailTemplates {
      id name type subject body variables is_active
    }
  }
`
const UPDATE_TEMPLATE = gql`
  mutation UpdateEmailTemplate($id: ID!, $input: UpdateEmailTemplateInput!) {
    updateEmailTemplate(id: $id, input: $input) {
      success userErrors { message }
      template { id subject body }
    }
  }
`

const TYPE_LABELS = {
  appointment_confirmation: 'Appointment Confirmation',
  appointment_reminder:     'Appointment Reminder',
  appointment_cancellation: 'Appointment Cancellation',
  appointment_rescheduled:  'Appointment Rescheduled',
  password_reset:           'Password Reset',
  welcome:                  'Welcome',
  invoice:                  'Invoice / Receipt',
  cancellation_fee:         'Cancellation Fee',
}

// ─── Mock fallback data ───────────────────────────────────────────────────────
const MOCK_EMAIL_TEMPLATES = [
  { id: 'et1', name: 'Appointment Confirmation', type: 'appointment_confirmation', subject: 'Your appointment is confirmed — {{patient_name}}', body: 'Dear {{patient_name}},\n\nYour appointment with {{clinician_name}} on {{date}} at {{time}} has been confirmed.\n\nLocation: {{clinic_name}}\n\nThank you,\nHealthSync Team', variables: ['patient_name', 'clinician_name', 'date', 'time', 'clinic_name'], is_active: true },
  { id: 'et2', name: 'Appointment Reminder',     type: 'appointment_reminder',     subject: 'Reminder: Your appointment tomorrow — {{patient_name}}', body: 'Dear {{patient_name}},\n\nThis is a reminder that you have an appointment tomorrow with {{clinician_name}} at {{time}}.\n\nThank you,\nHealthSync Team', variables: ['patient_name', 'clinician_name', 'time'], is_active: true },
  { id: 'et3', name: 'Appointment Cancellation', type: 'appointment_cancellation', subject: 'Appointment Cancelled — {{patient_name}}', body: 'Dear {{patient_name}},\n\nYour appointment on {{date}} has been cancelled.\n\nTo reschedule, please visit our website.\n\nHealthSync Team', variables: ['patient_name', 'date'], is_active: true },
  { id: 'et4', name: 'Password Reset',           type: 'password_reset',           subject: 'Reset your HealthSync password', body: 'Hi {{name}},\n\nClick the link below to reset your password:\n{{reset_link}}\n\nThis link expires in 1 hour.\n\nHealthSync Team', variables: ['name', 'reset_link'], is_active: true },
  { id: 'et5', name: 'Welcome Email',            type: 'welcome',                  subject: 'Welcome to HealthSync, {{name}}!', body: 'Dear {{name}},\n\nWelcome to HealthSync. Your account has been created successfully.\n\nLogin at: {{login_url}}\n\nHealthSync Team', variables: ['name', 'login_url'], is_active: true },
]

export default function AdminEmailTemplates() {
  const client = useApolloClient()
  const [templates, setTemplates]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [editItem, setEditItem]       = useState(null)
  const [editForm, setEditForm]       = useState({ subject: '', body: '' })
  const [previewItem, setPreviewItem] = useState(null)
  const [formError, setFormError]     = useState(null)
  const [successMsg, setSuccessMsg]   = useState(null)
  const [submitting, setSubmitting]   = useState(false)

  const load = async () => {
    setLoading(true)
    try { const { data } = await client.query({ query: GET_EMAIL_TEMPLATES, fetchPolicy: 'network-only' }); setTemplates(data?.emailTemplates || []) }
    catch (err) { setTemplates(MOCK_EMAIL_TEMPLATES) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, []) // eslint-disable-line

  const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000) }

  const openEdit = (t) => {
    setEditItem(t)
    setEditForm({ subject: t.subject || '', body: t.body || '' })
    setFormError(null)
  }

  const handleSave = async () => {
    setSubmitting(true); setFormError(null)
    try {
      const { data: r } = await client.mutate({ mutation: UPDATE_TEMPLATE, variables: { id: editItem.id, input: editForm } })
      if (!r?.updateEmailTemplate?.success) throw new Error(r?.updateEmailTemplate?.userErrors?.[0]?.message)
      showSuccess('Template saved.'); setEditItem(null); load()
    } catch (err) { setFormError(err.message) }
    finally { setSubmitting(false) }
  }

  if (loading) return <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>

  return (
    <Box>
      <Box mb={3}>
        <Typography variant="h5" fontWeight={700}>Email Templates</Typography>
        <Typography variant="body2" color="text.secondary">Edit system email templates sent to users and clinicians</Typography>
      </Box>

      {successMsg && <Alert severity="success" sx={{ mb: 2 }}>{successMsg}</Alert>}
      {formError   && <Alert severity="error"   sx={{ mb: 2 }} onClose={() => setFormError(null)}>{formError}</Alert>}

      <Stack spacing={2}>
        {templates.length === 0 && (
          <Card><CardContent sx={{ textAlign: 'center', py: 6 }}>
            <EmailIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="text.secondary">No email templates found</Typography>
          </CardContent></Card>
        )}

        {templates.map(t => (
          <Card key={t.id}>
            <CardContent>
              {/* View mode */}
              {editItem?.id !== t.id ? (
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                      <EmailIcon color="primary" fontSize="small" />
                      <Typography fontWeight={700}>{t.name || TYPE_LABELS[t.type] || t.type}</Typography>
                      <Chip label={TYPE_LABELS[t.type] || t.type} size="small" variant="outlined" sx={{ textTransform: 'capitalize' }} />
                      <Chip label={t.is_active ? 'Active' : 'Inactive'} size="small" color={t.is_active ? 'success' : 'default'} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" mb={0.5}>
                      <strong>Subject:</strong> {t.subject}
                    </Typography>
                    {/* Available variables */}
                    {t.variables?.length > 0 && (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" mt={1}>
                        <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', mr: 0.5 }}>Variables:</Typography>
                        {t.variables.map(v => (
                          <Chip key={v} label={`{{${v}}}`} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }} />
                        ))}
                      </Stack>
                    )}
                  </Box>
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="Preview">
                      <IconButton size="small" onClick={() => setPreviewItem(t)}><PreviewIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEdit(t)}><EditIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              ) : (
                // Edit mode (inline)
                <Box>
                  <Typography variant="h6" fontWeight={600} mb={2}>Editing: {t.name || TYPE_LABELS[t.type] || t.type}</Typography>
                  {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField fullWidth required size="small" label="Subject"
                        value={editForm.subject} onChange={e => setEditForm(p => ({ ...p, subject: e.target.value }))} />
                    </Grid>
                    {t.variables?.length > 0 && (
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary">Available variables:</Typography>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" mt={0.5}>
                          {t.variables.map(v => (
                            <Chip key={v} label={`{{${v}}}`} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }} />
                          ))}
                        </Stack>
                      </Grid>
                    )}
                    <Grid item xs={12}>
                      <TextField fullWidth size="small" label="Body (HTML or plain text)" multiline rows={10}
                        value={editForm.body} onChange={e => setEditForm(p => ({ ...p, body: e.target.value }))}
                        inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.8rem' } }} />
                    </Grid>
                    <Grid item xs={12}>
                      <Stack direction="row" spacing={1}>
                        <Button variant="contained" disabled={submitting} onClick={handleSave}>{submitting ? 'Saving…' : 'Save Template'}</Button>
                        <Button variant="outlined" onClick={() => setEditItem(null)}>Cancel</Button>
                      </Stack>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Preview Dialog */}
      <Dialog open={!!previewItem} onClose={() => setPreviewItem(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Preview: {previewItem?.name || previewItem?.type}
          <IconButton size="small" onClick={() => setPreviewItem(null)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" gutterBottom>Subject:</Typography>
          <Box sx={{ p: 1.5, bgcolor: 'grey.100', borderRadius: 1, mb: 2, fontFamily: 'monospace' }}>
            {previewItem?.subject}
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" gutterBottom>Body:</Typography>
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.8rem', whiteSpace: 'pre-wrap', overflowX: 'auto', border: '1px solid', borderColor: 'divider', minHeight: 200 }}>
            {previewItem?.body}
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  )
}
